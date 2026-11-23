import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// L1.5 (as L3.6 for the widget): the website never selects another language for validation messages, so zod's
// translations (about 260 KB) stay out. English is imported by zod directly and is kept; z.locales is empty in the browser.
const withoutZodTranslations={name:'without-zod-translations',enforce:'pre' as const,
 resolveId(source:string,importer?:string){return source==='../locales/index.js'&&importer&&/[\\/]zod[\\/]v4[\\/](?:classic|core|mini)[\\/]/.test(importer)?'\0zod-locales':undefined;},
 load(id:string){return id==='\0zod-locales'?'export {}':undefined;}};
export default defineConfig({ plugins: [withoutZodTranslations, react()], build: { outDir: 'dist/web' }, server: { proxy: { '/api': 'http://127.0.0.1:3000', '/auth': 'http://127.0.0.1:3000' } } });
