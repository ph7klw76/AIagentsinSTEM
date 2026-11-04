// Stage only final media and actual native/Lumi exports; never publishes media.
import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import AdmZip from 'adm-zip';
const root=process.cwd(),out=path.resolve(root,'../AIagentsinSTEM-delivery');
const cfg=JSON.parse(await fs.readFile('course.config.json','utf8'));
const digest=async file=>{const h=createHash('sha256');for await(const b of createReadStream(file))h.update(b);return h.digest('hex')};
const csv=s=>'"'+String(s).replaceAll('"','""')+'"';
const files=[],reports=[];
await fs.mkdir(out,{recursive:true});
for(const l of cfg.lessons){
 const source=path.join(root,'.local/upload-kit',`lesson-${l.id}`),target=path.join(out,`lesson-${l.id}`);
 await fs.mkdir(target,{recursive:true});
 const q=l.question,rows=[['id','seconds','review_seconds','question','answer','correct','specific_feedback'],...q.answers.map(a=>[q.id,q.time,q.review,q.prompt,a.text,a.correct,a.feedback])];
 await fs.writeFile(path.join(source,'youtube-quiz.csv'),rows.map(r=>r.map(csv).join(',')).join('\r\n')+'\r\n');
 const report=JSON.parse(await fs.readFile(path.join(source,'media-report.json'),'utf8'));reports.push(report);
 for(const name of [`AIagentsSTEM_${l.id}_1080p30_v03.mp4`,`AIagentsSTEM_${l.id}_narration_48k24.wav`,`AIagentsSTEM_${l.id}.srt`,`AIagentsSTEM_${l.id}.vtt`,'thumbnail.jpg','chapters.ffmeta','youtube-description.txt','youtube-quiz.csv','media-report.json',...['opening','review','checkpoint','closing'].map(s=>`${s}-v03.jpg`)]){
  const from=path.join(source,name),to=path.join(target,name);
  if(/\.(mp4|wav)$/.test(name)){try{await fs.link(from,to)}catch(e){if(e.code!=='EEXIST')await fs.copyFile(from,to)}}else await fs.copyFile(from,to);
  const hash=await digest(to);if(name.endsWith('.mp4')&&hash!==report.sha256||name.endsWith('.wav')&&hash!==report.wavSha256)throw Error('Final master hash mismatch');
  files.push({path:path.relative(out,to).replaceAll('\\','/'),bytes:(await fs.stat(to)).size,sha256:hash});
 }
 console.log('STAGED',l.id);
}
const bundle=new AdmZip();
for(const [dir,label]of [['dist/downloads','native-h5p'],['dist/exports','lumi-html']]){await fs.mkdir(path.join(out,label),{recursive:true});for(const name of await fs.readdir(dir)){bundle.addLocalFile(path.join(dir,name),label);const to=path.join(out,label,name);await fs.copyFile(path.join(dir,name),to);files.push({path:`${label}/${name}`,bytes:(await fs.stat(to)).size,sha256:await digest(to)})}}
for(const name of ['LICENSE','THIRD_PARTY_NOTICES.md','README.md','vendor/provenance.json','course.config.json'])bundle.addLocalFile(name,'source-and-licenses');
bundle.writeZip(path.join(out,'native-h5p-and-lumi-exports.zip'));
files.push({path:'native-h5p-and-lumi-exports.zip',bytes:(await fs.stat(path.join(out,'native-h5p-and-lumi-exports.zip'))).size,sha256:await digest(path.join(out,'native-h5p-and-lumi-exports.zip'))});
await fs.writeFile(path.join(out,'delivery-manifest.json'),JSON.stringify({timestamp:new Date().toISOString(),revision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),activeEdition:cfg.activeEdition,newYoutubeUploads:'not performed; original supplied IDs retained',files},null,2)+'\n');
await fs.writeFile('evidence/media-metadata.json',JSON.stringify({timestamp:new Date().toISOString(),context:'actual final local v03 editions; no upload',results:reports},null,2)+'\n');
await fs.writeFile(path.join(out,'START-HERE.md'),'# AI agents in STEM delivery\n\nEach lesson folder contains the verified final v03 MP4, 48 kHz/24-bit WAV, captions, thumbnail, chapter markers, YouTube description and all quiz answers/feedback. Earlier packaging attempts are excluded.\n\nThe ZIP contains 20 genuine native .h5p packages and 20 Lumi HTML exports, editable central configuration, library provenance and licenses. Import with H5P core API 1.28 or newer compatible software. Serve YouTube HTML over HTTP(S). No authenticated LMS reporting was tested.\n\nOpen DELIVERY_REPORT.md for final checks and publication URLs when complete.\n\nFor optional new YouTube editions: Studio → Create → Upload videos; select each lesson’s exact *_1080p30_v03.mp4, install its matching description/thumbnail/captions after ASR-gap listening review, and retain the actual new URLs. Existing YouTube IDs cannot be overwritten with a new binary. Send the ten new URLs in lesson order for source verification and activation. The current course uses the ten explicitly supplied original IDs. No new upload has been performed.\n');
console.log('DELIVERY',out);
