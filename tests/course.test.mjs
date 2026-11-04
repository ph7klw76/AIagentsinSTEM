import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import vm from 'node:vm';
import AdmZip from 'adm-zip';
import {createContent} from '../scripts/h5p.mjs';
const c=JSON.parse(fs.readFileSync('course.config.json','utf8'));
test('all ten supplied source IDs retain the explicit lesson order',()=>{
 assert.deepEqual(c.lessons.map(l=>l.youtubeId),['vpvanBLwJX8','ajpn28cfWvQ','05wxHQrqpoo','XoXujuXajZM','M6E1RQA_uJc','w8YkeB9KeHc','37sAYWVOSOU','uNGvR8jHTDc','OCIPs5DRukI','k-cVIztvjDE']);
 assert.deepEqual(c.lessons.map(l=>l.order),['1','2','3','4','5','5.1','6','6.1','7','8']);
 assert.equal(new Set(c.lessons.map(l=>l.id)).size,10);assert.equal(c.basePath,'/AIagentsinSTEM/');
});
test('assessment and review times are in bounds, with one correct answer and specific distractor feedback',()=>{
 for(const l of c.lessons){const q=l.question;assert.equal(q.answers.filter(a=>a.correct).length,1);assert.ok(q.review>=0&&q.review<q.time&&q.time<l.frames/30-5);assert.ok(q.answers.every(a=>a.feedback.length>45));assert.equal(l.chapters[0].time,0);assert.ok(l.chapters.every((ch,i)=>ch.time>=0&&ch.time<l.frames/30&&(i===0||ch.time>l.chapters[i-1].time)));}
});
test('Summary uses the actual 1.10 runtime representation and feedback list',()=>{
 for(const l of c.lessons){const {content}=createContent(l);const s=content.interactiveVideo.summary.task.params;assert.equal(s.summaries.length,2);assert.ok(s.summaries.every(x=>typeof x.tip==='string'&&x.summary.length===2));assert.ok(Array.isArray(s.overallFeedback));assert.ok(Array.isArray(content.interactiveVideo.assets.interactions[0].action.params.overallFeedback));assert.equal(content.interactiveVideo.assets.interactions[0].pause,true);}
});
test('upstream archives match pinned checksums and the official YouTube adapter uses getIframe()',()=>{
 const p=JSON.parse(fs.readFileSync('vendor/provenance.json'));for(const a of p.archives)assert.equal(crypto.createHash('sha256').update(fs.readFileSync(a.path)).digest('hex'),a.sha256);
 const z=new AdmZip('vendor/h5p-libraries.zip');const lib=JSON.parse(z.readAsText('H5P.Video-1.6/library.json'));assert.equal(lib.patchVersion,81);assert.equal(lib.coreApi.minorVersion,28);const adapter=z.readAsText('H5P.Video-1.6/scripts/youtube.js');assert.ok(adapter.includes('getIframe()'));assert.ok(!adapter.includes('player.g.style'));
});
test('native ZIP exports contain real content and the full licensed library dependency closure',()=>{
 for(const l of c.lessons)for(const practice of [false,true]){
  const file=`dist/downloads/lesson-${l.id}${practice?'-practice':''}.h5p`;const z=new AdmZip(file);const meta=JSON.parse(z.readAsText('h5p.json'));const params=JSON.parse(z.readAsText('content/content.json'));assert.equal(meta.language,'en');assert.equal(meta.mainLibrary,practice?'H5P.MultiChoice':'H5P.InteractiveVideo');
  const libs=new Map(z.getEntries().filter(e=>e.entryName.endsWith('/library.json')).map(e=>{const m=JSON.parse(e.getData());const dir=`${m.machineName}-${m.majorVersion}.${m.minorVersion}`;assert.ok(m.license||z.readAsText(`${dir}/UPSTREAM_LICENSE.txt`).includes('(The MIT License)'),`Missing license evidence: ${dir}`);return[dir,m]}));
  for(const m of libs.values())for(const d of [...m.preloadedDependencies||[],...m.editorDependencies||[],...m.dynamicDependencies||[]])assert.ok(libs.has(`${d.machineName}-${d.majorVersion}.${d.minorVersion}`),`${file} missing ${d.machineName}`);
  if(!practice)assert.equal(params.interactiveVideo.video.files[0].path,`https://www.youtube.com/watch?v=${l.youtubeId}`);
  assert.deepEqual(params,createContent(l,{practice}).content,`${file} must match the current central configuration`);
 }
});
test('all Lumi HTML scripts parse and remain outside the player script string',()=>{
 for(const l of c.lessons)for(const suffix of ['','-practice']){
  const s=fs.readFileSync(`dist/exports/lesson-${l.id}${suffix}.html`,'utf8');const scripts=[...s.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];assert.equal(scripts.length,2);for(const m of scripts)new vm.Script(m[1]);assert.equal((s.match(/<header class="export-header">/g)||[]).length,1);assert.ok(s.lastIndexOf('<header class="export-header">')>s.indexOf('</script>'));
 }
});
test('captions are acoustic, ordered, nonoverlapping and bounded by each actual chapter',()=>{
 for(const l of c.lessons){const cues=JSON.parse(fs.readFileSync(`content/captions/lesson-${l.id}.json`));let end=0;assert.ok(cues.length>30);for(const cue of cues){assert.ok(cue.start>=end-.001);assert.ok(cue.end>cue.start&&cue.end<=l.frames/30+.001);assert.ok(cue.text.trim());end=cue.end}assert.ok(fs.readFileSync(`content/captions/lesson-${l.id}.vtt`,'utf8').startsWith('WEBVTT'));}
});
test('browser lab embeds the same canonical Python model',()=>{
 const n=JSON.parse(fs.readFileSync('content/lab/stem-evidence.ipynb'));const model=fs.readFileSync('content/lab/scientific_model.py','utf8');assert.equal(n.cells[1].source.join(''),model);assert.equal(n.cells.filter(x=>x.cell_type==='code').length,5);assert.ok(n.cells.some(x=>x.source.join('').includes('LAB_COMPLETE')));
});
