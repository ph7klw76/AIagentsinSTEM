import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(process.env.SITE_ROOT||'dist');const base='/AIagentsinSTEM/';
const types={'.html':'text/html; charset=utf-8','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.woff':'font/woff','.woff2':'font/woff2','.wasm':'application/wasm','.whl':'application/zip','.h5p':'application/zip','.vtt':'text/vtt','.srt':'text/plain','.ipynb':'application/json','.mp4':'video/mp4'};
const cfg=JSON.parse(await fsp.readFile('course.config.json','utf8'));
const audit=JSON.parse(await fsp.readFile('.local/media-audit/sources.json','utf8').catch(()=>'[]'));
const server=http.createServer(async(req,res)=>{
 try{
  let p=decodeURIComponent(new URL(req.url,'http://local').pathname),f;
  if(p.startsWith('/__local_media/')&&process.env.LOCAL_MEDIA==='1'){
   const id=p.split('/').pop().replace('.mp4','');const i=cfg.lessons.findIndex(l=>l.id===id);if(i<0)throw new Error('Unknown media');const finished=path.resolve(`.local/upload-kit/lesson-${id}/AIagentsSTEM_${id}_1080p30_v03.mp4`);if(!fs.existsSync(finished))throw new Error('Finished local edition not available');f=finished;
  }else if(p.startsWith('/__preview/')&&process.env.LOCAL_MEDIA==='1'){
   const preview=path.resolve('.local/preview');f=path.resolve(preview,p.slice('/__preview/'.length)||'index.html');if(!f.startsWith(preview+path.sep)&&f!==preview)throw new Error('Invalid preview path');
  }else{
   if(p==='/'){res.writeHead(302,{Location:base});res.end();return}
   if(!p.startsWith(base)){res.writeHead(404);res.end('Repository prefix required');return}
   f=path.resolve(root,p.slice(base.length)||'index.html');if(!f.startsWith(root+path.sep))throw new Error('Invalid path');
  }
  let stat=await fsp.stat(f);if(stat.isDirectory()){f=path.join(f,'index.html');stat=await fsp.stat(f)}
  const headers={'Content-Type':types[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store','Accept-Ranges':'bytes'};
  const range=req.headers.range;
  if(range){const m=/^bytes=(\d+)-(\d*)$/.exec(range);if(!m){res.writeHead(416);res.end();return}const start=Number(m[1]),end=m[2]?Math.min(Number(m[2]),stat.size-1):stat.size-1;if(start>end){res.writeHead(416);res.end();return}res.writeHead(206,{...headers,'Content-Range':`bytes ${start}-${end}/${stat.size}`,'Content-Length':end-start+1});if(req.method==='HEAD')res.end();else fs.createReadStream(f,{start,end}).pipe(res)}
  else{res.writeHead(200,{...headers,'Content-Length':stat.size});if(req.method==='HEAD')res.end();else fs.createReadStream(f).pipe(res)}
 }catch(e){res.writeHead(404,{'Content-Type':'text/plain'});res.end('Resource not found')}
});
server.listen(Number(process.env.PORT||4173),'127.0.0.1',()=>console.log(`Course: http://127.0.0.1:${process.env.PORT||4173}${base}`));
for(const s of ['SIGINT','SIGTERM'])process.on(s,()=>server.close(()=>process.exit(0)));
