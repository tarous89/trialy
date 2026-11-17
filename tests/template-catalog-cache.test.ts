import {test} from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import {PGlite} from '@electric-sql/pglite';
import {readFile,readdir} from 'node:fs/promises';
import type {Database,Connection} from '../src/db/database.js';
import {AppTemplates} from '../src/workspace/app-templates.js';
import {syncTemplateCatalog} from '../src/workspace/template-catalog.js';
import {WorkspaceFoundation} from '../src/workspace/service.js';
import {addAppApi} from '../src/server/apps.js';
import {templateMediaUrl} from '../src/shared/template-gallery.js';
test('catalog payloads load once per process; approval is still read on every call',async()=>{
 const pg=new PGlite(),seen:string[]=[];
 try{
  for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
  const db:Database={query:(q,v)=>{seen.push(q);return pg.query(q,v) as any;},transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:async()=>{}};
  await syncTemplateCatalog(db);const catalog=new AppTemplates(undefined,db,'platform');
  const payloadReads=()=>seen.filter(q=>/\bpayload\b/.test(q)&&q.startsWith('SELECT')).length;
  seen.length=0;const first=await catalog.list({limit:50});assert.ok(first.total>0);assert.equal(payloadReads(),1);
  seen.length=0;const again=await catalog.list({limit:50});assert.deepEqual(again,first);
  const one=first.templates[0],read=await catalog.read({templateId:one.id});assert.equal(read.digest,one.digest);
  // Later calls read approval only, never the payloads again; another catalog object shares them.
  assert.deepEqual(await new AppTemplates(undefined,db).read({templateId:one.id,version:one.version}),read);
  assert.equal(payloadReads(),0);assert.ok(seen.every(q=>q.includes("status='approved'")));
  // Shared entries cannot be changed by a caller.
  assert.throws(()=>{(read.tags as string[]).push('changed');},TypeError);
  // Withdrawing a version takes effect on the next call.
  await pg.query("UPDATE app_template_catalog SET status='draft' WHERE template_id=$1",[one.id]);
  assert.equal((await catalog.list({limit:50})).templates.some(t=>t.id===one.id),false);
  await assert.rejects(catalog.read({templateId:one.id}),/Template unavailable/);
  await assert.rejects(catalog.identity({templateId:one.id,version:one.version}),/Template unavailable/);
  // Approving it again serves the held payload without another load.
  seen.length=0;await pg.query("UPDATE app_template_catalog SET status='approved' WHERE template_id=$1 AND version=$2",[one.id,one.version]);
  assert.deepEqual(await catalog.read({templateId:one.id,version:one.version}),read);assert.equal(payloadReads(),0);
  // The gallery names the exact version; only that request may be kept by the browser.
  const app=express();app.use(express.json());addAppApi(app,new WorkspaceFoundation(db));
  const exact=await request(app).get(templateMediaUrl(one.id,one.version,'screenshot',one.digest));
  assert.equal(exact.status,200);assert.equal(exact.headers['cache-control'],'private, max-age=604800');assert.match(exact.headers['content-type'],/jpeg/);
  const plain=await request(app).get(templateMediaUrl(one.id,one.version,'screenshot'));
  assert.equal(plain.headers['cache-control'],'private, no-cache');
  const wrong=await request(app).get(templateMediaUrl(one.id,one.version,'screenshot','0'.repeat(64)));
  assert.equal(wrong.headers['cache-control'],'private, no-cache');
  assert.equal(templateMediaUrl(one.id,one.version,'preview',one.digest).includes('?'),false);
  await pg.query("UPDATE app_template_catalog SET status='draft' WHERE template_id=$1",[one.id]);
  assert.notEqual((await request(app).get(templateMediaUrl(one.id,one.version,'screenshot',one.digest))).status,200);
 }finally{await pg.close();}
});
