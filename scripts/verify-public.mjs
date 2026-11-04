// Verify the deployed revision and distinguishing served bytes, not HTTP status alone.
import fs from'node:fs/promises';import path from'node:path';import assert from'node:assert/strict';import{createHash}from'node:crypto';import AdmZip from'adm-zip';import{createContent}from'./h5p.mjs';
const [expectedRevision,origin='https://ph7klw76.github.io']=process.argv.slice(2);
if(!/^[a-f0-9]{40}$/.test(expectedRevision||''))throw Error('Provide the confirmed deployed commit SHA');
const cfg=JSON.parse(await fs.readFile('course.config.json','utf8')),base=new URL(cfg.basePath,origin),hash=b=>createHash('sha256').update(b).digest('hex');
const report={timestamp:new Date().toISOString(),expectedRevision,baseUrl:base.href,context:'actual public GitHub Pages resources',status:'running',checks:[],limitations:['Resource verification is separate from the real public streaming and browser-kernel tests.']};
const get=async relative=>{const url=new URL(relative,base);url.searchParams.set('verify',expectedRevision);const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw Error(`HTTP ${r.status}: ${url.href}`);return{url:url.href,bytes:Buffer.from(await r.arrayBuffer()),type:r.headers.get('content-type')}};
try{
 const manifest=JSON.parse((await get('build-manifest.json')).bytes);assert.equal(manifest.revision,expectedRevision);assert.equal(manifest.basePath,cfg.basePath);assert.equal(manifest.edition,cfg.activeEdition);report.servedRevision=manifest.revision;
 const selected=manifest.artifacts.filter(a=>/^(?:index\.html|app\.js|style\.css|favicon\.svg|course\.config\.json|exports\/|downloads\/|captions\/.*\.(?:srt|vtt)$|lab\/stem-evidence\.ipynb|lite\/lab\/index\.html|lite\/api\/contents\/all\.json|lite\/files\/stem-evidence\.ipynb)$/.test(a.path)||a.path.startsWith('exports/')||a.path.startsWith('downloads/'));
 assert.ok(selected.length>=65,'Missing expected public resource families');
 let cursor=0;
 await Promise.all(Array.from({length:4},async()=>{while(cursor<selected.length){const item=selected[cursor++],r=await get(item.path);assert.equal(hash(r.bytes),item.sha256,`Served hash mismatch ${item.path}`);
  if(['index.html','app.js','style.css','favicon.svg','course.config.json'].includes(item.path)){const source=await fs.readFile(item.path==='course.config.json'?item.path:`web/${item.path}`);assert.equal(hash(Buffer.from(source.toString().replaceAll('\r\n','\n'))),hash(r.bytes),`Source mismatch ${item.path}`)}
  if(item.path==='course.config.json')assert.deepEqual(JSON.parse(r.bytes),cfg);
  if(item.path==='lab/stem-evidence.ipynb'||item.path==='lite/files/stem-evidence.ipynb')assert.deepEqual(JSON.parse(r.bytes),JSON.parse(await fs.readFile('content/lab/stem-evidence.ipynb','utf8')));
  const match=/downloads\/lesson-([0-9a-z]+)(-practice)?\.h5p$/.exec(item.path);if(match){const lesson=cfg.lessons.find(l=>l.id===match[1]),native=new AdmZip(r.bytes),content=JSON.parse(native.readAsText('content/content.json')),expected=createContent(lesson,{practice:!!match[2]});assert.equal(JSON.parse(native.readAsText('h5p.json')).mainLibrary,expected.mainLibrary);assert.deepEqual(content,expected.content)}
  if(item.path==='lite/lab/index.html')assert.ok(r.bytes.toString().includes(`${cfg.basePath}favicon.svg`));
  report.checks.push({path:item.path,url:r.url,status:'pass',bytes:r.bytes.length,sha256:hash(r.bytes),contentType:r.type});
 }}));
 report.checks.sort((a,b)=>a.path.localeCompare(b.path));report.status='pass';console.log('PUBLIC_RESOURCE_PASS',report.checks.length,expectedRevision);
}catch(e){report.status='fail';report.error=String(e);throw e}finally{const target=path.resolve('../AIagentsinSTEM-delivery/verification');await fs.mkdir(target,{recursive:true});await fs.writeFile(path.join(target,'public-resources.json'),JSON.stringify(report,null,2)+'\n')}
