import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import AdmZip from 'adm-zip';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const get=async url=>{const r=await fetch(url);if(!r.ok)throw new Error(`${url}: ${r.status}`);return Buffer.from(await r.arrayBuffer())};
await fs.mkdir('vendor',{recursive:true});
const hub=await fs.readFile('.local/upstream/interactive-video.h5p');
const zip=new AdmZip(hub);
// Replace the complete official H5P.Video library, preserving upstream metadata.
const video=JSON.parse(await fs.readFile('.local/upstream/videoTree.json','utf8'));
const files=video.tree.filter(t=>t.type==='blob'&&!t.path.startsWith('.')&&!['crowdin.yml','README.md'].includes(t.path));
for(const e of zip.getEntries())if(e.entryName.startsWith('H5P.Video-1.6/'))zip.deleteFile(e.entryName);
for(const f of files)zip.addFile(`H5P.Video-1.6/${f.path}`,await get(`https://raw.githubusercontent.com/h5p/h5p-video/${video.sha}/${f.path}`));
// Hub demonstration content is not redistributed: only reusable licensed libraries.
for(const e of zip.getEntries())if(e.entryName==='h5p.json'||e.entryName.startsWith('content/'))zip.deleteFile(e.entryName);
zip.writeZip('vendor/h5p-libraries.zip');
const core=JSON.parse(await fs.readFile('.local/upstream/coreTree.json','utf8'));
const coreZip=new AdmZip();
const coreFiles=core.tree.filter(t=>t.type==='blob'&&(['js/','styles/','fonts/','images/'].some(p=>t.path.startsWith(p))||t.path==='LICENSE.txt'||t.path==='h5p.classes.php'));
await Promise.all(coreFiles.map(async f=>coreZip.addFile(f.path,await get(`https://raw.githubusercontent.com/h5p/h5p-php-library/${core.sha}/${f.path}`))));
coreZip.writeZip('vendor/h5p-core.zip');
const libraries=zip.getEntries().filter(e=>e.entryName.endsWith('/library.json')).map(e=>JSON.parse(e.getData()));
const record={retrievedAt:new Date().toISOString(),hub:{url:'https://api.h5p.org/v1/content-types/H5P.InteractiveVideo',sha256:hash(hub)},video:{repository:'https://github.com/h5p/h5p-video',revision:video.sha,version:'1.6.81',coreApi:'1.28',adapter:'scripts/youtube.js; official getIframe() API'},core:{repository:'https://github.com/h5p/h5p-php-library',revision:core.sha,license:'GPL-3.0'},archives:await Promise.all(['h5p-libraries.zip','h5p-core.zip'].map(async name=>({path:`vendor/${name}`,sha256:hash(await fs.readFile(`vendor/${name}`))}))),libraries:libraries.map(l=>({machineName:l.machineName,version:`${l.majorVersion}.${l.minorVersion}.${l.patchVersion}`,license:l.license,author:l.author,coreApi:l.coreApi})),files:zip.getEntries().filter(e=>!e.isDirectory).map(e=>({path:e.entryName,sha256:hash(e.getData())}))};
await fs.writeFile('vendor/provenance.json',JSON.stringify(record,null,2)+'\n');
console.log('Prepared',libraries.length,'licensed H5P libraries; core',core.sha,'video',video.sha);
