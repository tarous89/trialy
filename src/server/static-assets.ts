import express,{type ErrorRequestHandler,type Express} from 'express';
import {join,resolve} from 'node:path';

/** Only Vite's public fingerprinted assets bypass sessions. Never mount private files here. */
export function addPublicAssets(app:Express,root=resolve('dist/web')){
 const assetError:ErrorRequestHandler=(error,_req,res,next)=>{
  if(error.status>=400&&error.status<500){res.set('Cache-Control','no-store').status(error.status).type('text').send('Asset unavailable');return;}
  next(error);
 };
 app.use('/assets',express.static(join(root,'assets'),{immutable:true,maxAge:'1y',fallthrough:false,index:false,redirect:false,dotfiles:'deny'}),assetError);
}

/** Unhashed public files and every SPA entry point must revalidate after a deployment. */
export function addWebFallback(app:Express,root=resolve('dist/web')){
 const htmlHeaders={'Cache-Control':'no-cache'};
 app.use(express.static(root,{setHeaders:(res,path)=>{if(path.endsWith('.html'))res.setHeader('Cache-Control','no-cache');}}));
 app.get('/{*path}',(req,res)=>{
  if(req.path.startsWith('/api/')||req.path.startsWith('/auth/')){res.status(404).json({error:'not_found'});return;}
  res.sendFile('index.html',{root,headers:htmlHeaders});
 });
}
