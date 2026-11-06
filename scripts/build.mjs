import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {setupExporter,writeActivity} from './h5p.mjs';
const c=JSON.parse(await fs.readFile('course.config.json','utf8'));
const preview=process.argv.includes('--local-preview');
const output=preview?'.local/preview':'dist';
await fs.mkdir(output,{recursive:true});
const context=await setupExporter();
for(const lesson of c.lessons){
 await writeActivity(lesson,context,{prefix:output,localMediaUrl:preview?`http://127.0.0.1:4173/__local_media/${lesson.id}.mp4`:undefined});
 if(!preview)await writeActivity(lesson,context,{prefix:output,practice:true});
 console.log('Exported',lesson.id);
}
for(const name of ['index.html','style.css','app.js','favicon.svg'])await fs.copyFile(`web/${name}`,`${output}/${name}`);
await fs.cp('web/workshop-09',`${output}/workshop-09`,{recursive:true});
await fs.copyFile('course.config.json',`${output}/course.config.json`);
if(!preview){
 await fs.mkdir('dist/captions',{recursive:true});await fs.mkdir('dist/lab',{recursive:true});await fs.mkdir('dist/evidence',{recursive:true});
 for(const f of await fs.readdir('content/captions'))await fs.copyFile(`content/captions/${f}`,`dist/captions/${f}`);
 await fs.copyFile('content/lab/stem-evidence.ipynb','dist/lab/stem-evidence.ipynb');
 await fs.copyFile('vendor/provenance.json','dist/evidence/library-provenance.json');
 let sha;try{sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()}catch{sha='uncommitted'}
 const files=await fs.readdir('dist/exports');const artifacts=[];
 for(const path of ['course.config.json',...files.map(f=>`exports/${f}`),...(await fs.readdir('dist/downloads')).map(f=>`downloads/${f}`)])artifacts.push({path,sha256:crypto.createHash('sha256').update(await fs.readFile(`dist/${path}`)).digest('hex')});
 await fs.writeFile('dist/build-manifest.json',JSON.stringify({revision:sha,createdAt:new Date().toISOString(),basePath:c.basePath,edition:c.activeEdition,artifacts},null,2)+'\n');
 await fs.writeFile('dist/.nojekyll','');
}
