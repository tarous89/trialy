"""Bounded, offline OOXML reading. Never executes macros, formulas or external links."""
import json, sys, zipfile, posixpath, resource
import xml.etree.ElementTree as ET
resource.setrlimit(resource.RLIMIT_AS, (128 * 1024 * 1024, 128 * 1024 * 1024))
resource.setrlimit(resource.RLIMIT_CPU, (45, 45))
R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
S = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
P = 'http://schemas.openxmlformats.org/presentationml/2006/main'
A = 'http://schemas.openxmlformats.org/drawingml/2006/main'
with zipfile.ZipFile(sys.argv[1]) as archive:
    entries = archive.infolist()
    if len(entries) > 5000 or sum(e.file_size for e in entries) > 50 * 1024 * 1024:
        raise ValueError('office_expansion_limit')
    def xml(name):
        info = archive.getinfo(name)
        if info.file_size > 8 * 1024 * 1024:
            raise ValueError('office_part_limit')
        raw = archive.read(info)
        # UTF-16 markup is valid XML; rejecting nulls keeps this guard encoding-independent.
        if b'\x00' in raw or b'<!DOCTYPE' in raw.upper() or b'<!ENTITY' in raw.upper():
            raise ValueError('office_xml_unsupported')
        return ET.fromstring(raw)
    def targets(base, root):
        result = {}
        for entry in root:
            if entry.get('TargetMode') == 'External':
                continue
            target = entry.get('Target', '')
            path = posixpath.normpath(posixpath.join(base, target)) if not target.startswith('/') else target.lstrip('/')
            if path.startswith(base + '/'):
                result[entry.get('Id')] = path
        return result
    sections, tables = [], []
    if sys.argv[2] == 'xlsx':
        shared = []
        if 'xl/sharedStrings.xml' in archive.namelist():
            shared = [''.join(t.text or '' for t in item.iter('{%s}t' % S)) for item in xml('xl/sharedStrings.xml')]
        relationships = targets('xl', xml('xl/_rels/workbook.xml.rels'))
        sheets = xml('xl/workbook.xml').findall('.//{%s}sheet' % S)
        for sheet in sheets[:50]:
            path = relationships.get(sheet.get('{%s}id' % R))
            if not path:
                continue
            lines, rows, count = ['Sheet: ' + sheet.get('name', '') + ' (raw values; cached formula results, no recalculation)'], {}, 0
            for cell in xml(path).iter('{%s}c' % S):
                if count >= 5000:
                    break
                count += 1
                kind = cell.get('t')
                value = cell.findtext('{%s}v' % S, '')
                if kind == 's':
                    index = int(value)
                    if index < 0 or index >= len(shared):
                        raise ValueError('invalid_shared_string')
                    value = shared[index]
                elif kind == 'inlineStr':
                    value = ''.join(t.text or '' for t in cell.iter('{%s}t' % S))
                elif kind == 'b':
                    value = 'true' if value == '1' else 'false'
                address = cell.get('r', '')
                lines.append(address + ': ' + value[:2000])
                letters = ''.join(c for c in address if 'A' <= c <= 'Z')
                digits = ''.join(c for c in address if c.isdigit())
                if not letters or not digits:
                    continue
                col = 0
                for c in letters[:4]:
                    col = col * 26 + ord(c) - 64
                row = int(digits[:8])
                if 1 <= row <= 50 and 1 <= col <= 30:
                    rows.setdefault(row, {})[col] = value[:500]
            text = '\n'.join(lines)[:200000]
            sections.append({'text': text})
            if rows and len(tables) < 10:
                width = max(max(cells) for cells in rows.values())
                tables.append({'rows': [[rows.get(r, {}).get(c, '') for c in range(1, width + 1)] for r in range(1, max(rows) + 1)]})
    else:
        relationships = targets('ppt', xml('ppt/_rels/presentation.xml.rels'))
        slides = xml('ppt/presentation.xml').findall('.//{%s}sldId' % P)
        for page, slide in enumerate(slides[:200], 1):
            path = relationships.get(slide.get('{%s}id' % R))
            if not path:
                continue
            # Use presentation order, not ZIP/file numbering. Images, notes and charts omitted.
            parts = [(t.text or '')[:2000] for t in xml(path).iter('{%s}t' % A)]
            sections.append({'page': page, 'text': '\n'.join(parts)[:200000]})
    total, bounded = 0, []
    for section in sections:
        left = 2 * 1024 * 1024 - total
        if left <= 0:
            break
        section['text'] = section['text'][:left]
        total += len(section['text'])
        bounded.append(section)
    print(json.dumps({'text': '\n\n'.join(s['text'] for s in bounded), 'sections': bounded,
                      'method': 'ooxml-' + sys.argv[2], 'partial': True, 'tables': tables,
                      'tableStatus': 'partial' if tables else 'unavailable'}, ensure_ascii=False))
