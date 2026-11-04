import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import AdmZip from 'adm-zip';
import server from '@lumieducation/h5p-server';
import ExportModule from '@lumieducation/h5p-html-exporter';
const HtmlExporter=ExportModule.default||ExportModule;
export const uuid=s=>{const h=crypto.createHash('sha256').update(s).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`};
export const html=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const decode=b=>JSON.parse(b.toString('utf8'));
const zip=new AdmZip('vendor/h5p-libraries.zip');
const libs=new Map(zip.getEntries().filter(e=>e.entryName.endsWith('/library.json')).map(e=>{const m=decode(e.getData());return[`${m.machineName} ${m.majorVersion}.${m.minorVersion}`,{...m,dir:e.entryName.split('/')[0]}]}));
function defaults(fields,provided={}){
 const out={...provided};
 for(const f of fields){
  if(out[f.name]===undefined&&f.default!==undefined)out[f.name]=structuredClone(f.default);
  if(f.type==='group'&&(out[f.name]!==undefined||!f.optional)&&!Array.isArray(out[f.name])&&(out[f.name]===undefined||typeof out[f.name]==='object'))out[f.name]=defaults(f.fields,out[f.name]);
 }
 return out;
}
export function params(library,provided){const m=libs.get(library);return defaults(decode(zip.readFile(`${m.dir}/semantics.json`)),provided)}
const action=(lib,p,id,title)=>({library:lib,params:p,subContentId:uuid(id),metadata:{title,license:'CC BY',licenseVersion:'4.0',authors:[{name:'Dr Woon Kai Lin',role:'Author'}],contentType:libs.get(lib).title}});
export function createContent(lesson,{localMediaUrl,practice=false}={}){
 const q=lesson.question;
 const multi=params('H5P.MultiChoice 1.16',{
  question:`<p>${html(q.prompt)}</p>`,
  answers:q.answers.map(a=>({text:`<div>${html(a.text)}</div>`,correct:a.correct,tipsAndFeedback:{tip:'',chosenFeedback:a.feedback,notChosenFeedback:''}})),
  overallFeedback:[{from:0,to:100,feedback:''}],
  behaviour:{enableRetry:true,enableSolutionsButton:true,enableCheckButton:true,type:'single',singlePoint:true,randomAnswers:true,showSolutionsRequiresInput:true,confirmCheckDialog:false,confirmRetryDialog:false,autoCheck:false,passPercentage:100,showScorePoints:true}
 });
 if(practice)return {mainLibrary:'H5P.MultiChoice',content:multi};
 const summary=params('H5P.Summary 1.10',{
  intro:'Choose the sound scientific conclusion in each pair.',
  summaries:[{summary:[q.answers.find(a=>a.correct).text,q.answers.find(a=>!a.correct).text],tip:'Separate what was observed from what was inferred.',subContentId:uuid(`${lesson.id}-s1`)},{summary:['Preserve inputs, versions, assumptions and outputs so another scientist can check the claim.','A successful software run makes independent scientific checks unnecessary.'],tip:'Reproducibility requires more than a success message.',subContentId:uuid(`${lesson.id}-s2`)}],
  overallFeedback:[{from:0,to:100,feedback:'Use the laboratory to test a claim independently and state the limits of your model.'}]
 });
 const content=params('H5P.InteractiveVideo 1.27',{interactiveVideo:{
  video:{files:[{path:localMediaUrl||`https://www.youtube.com/watch?v=${lesson.youtubeId}`,mime:localMediaUrl?'video/mp4':'video/YouTube',copyright:{title:lesson.title,author:'Dr Woon Kai Lin',license:'U',source:`https://youtu.be/${lesson.youtubeId}`}}],startScreenOptions:{title:lesson.title,hideStartTitle:false,shortStartDescription:lesson.outcome},textTracks:{videoTrack:[]}},
  assets:{interactions:[{x:5,y:6,width:90,height:82,duration:{from:q.time,to:q.time+.8},pause:true,displayType:'poster',buttonOnMobile:false,label:`${q.id}: Check your reasoning`,libraryTitle:'Multiple Choice',action:action('H5P.MultiChoice 1.16',multi,q.id,q.prompt),adaptivity:{correct:{seekTo:q.time+1.5,allowOptOut:false,message:'Continue when you are ready.',seekLabel:'Continue with video'},wrong:{seekTo:q.review,allowOptOut:true,message:'Revisit the explanation, then use Return to checkpoint to try again.',seekLabel:'Review the explanation'},requireCompletion:false}}],bookmarks:lesson.chapters.map(c=>({time:c.time,label:c.label})),endscreens:[{time:lesson.frames/30-.1,label:'Review and submit'}]},
  summary:{task:action('H5P.Summary 1.10',summary,`${lesson.id}-summary`,'Scientific conclusions'),displayAt:3}},
  override:{autoplay:false,loop:false,showBookmarksmenuOnLoad:false,showRewind10:true,deactivateSound:false,preventSkippingMode:'none'},
  l10n:{endcardSubmitButton:'Review session results',endcardInformation:'You have answered @answered questions. Review your session results below.',endcardSubmitMessage:'Results reviewed for this session.'}
 });
 return {mainLibrary:'H5P.InteractiveVideo',content};
}
function dependencies(main,content){
 const set=new Map();
 function add(id){if(set.has(id))return;let m=libs.get(id);if(!m)throw new Error(`Missing ${id}`);set.set(id,m);for(const d of m.preloadedDependencies||[])add(`${d.machineName} ${d.majorVersion}.${d.minorVersion}`)}
 add(main==='H5P.MultiChoice'?'H5P.MultiChoice 1.16':'H5P.InteractiveVideo 1.27');
 function scan(o){if(o&&typeof o==='object'){if(typeof o.library==='string')add(o.library);for(const v of Object.values(o))scan(v)}}scan(content);
 return [...set.values()].map(m=>({machineName:m.machineName,majorVersion:m.majorVersion,minorVersion:m.minorVersion}));
}
export async function setupExporter(){
 const libdir='.local/build/libraries',core='.local/build/core';
 await fs.mkdir(libdir,{recursive:true});await fs.mkdir(core,{recursive:true});
 zip.extractAllTo(libdir,true);new AdmZip('vendor/h5p-core.zip').extractAllTo(core,true);
 const libraryStorage=new server.fsImplementations.FileLibraryStorage(libdir);
 const contentStorage=new server.fsImplementations.FileContentStorage('.local/build/content');
 const config=new server.H5PConfig(undefined,{coreApiVersion:{major:1,minor:28},h5pVersion:'1.28.0'});
 const template=(integration,scripts,styles,id)=>`<!doctype html><html lang="en" class="h5p-iframe"><head><meta charset="utf-8"><script>var H5PIntegration=${JSON.stringify({...integration,baseUrl:'.',url:'.',ajax:{setFinished:'',contentUserData:''},saveFreq:false,libraryUrl:''}).replaceAll('<','\\u003c')};${scripts.replaceAll(/<\/script/gi,'<\\/script')}</script><style>${styles}</style></head><body><div class="h5p-content lag" data-content-id="${id}"></div></body></html>`;
 return {contentStorage,exporter:new HtmlExporter(libraryStorage,contentStorage,config,core,'.local/build/editor',template)};
}
export async function writeActivity(lesson,context,{localMediaUrl,practice=false,prefix='dist'}={}){
 const {mainLibrary,content}=createContent(lesson,{localMediaUrl,practice});
 const dep=dependencies(mainLibrary,content);
 const metadata={title:`${lesson.order}. ${lesson.title}${practice?' — independent practice':''}`,language:'en',mainLibrary,embedTypes:['div','iframe'],license:'CC BY',licenseVersion:'4.0',authors:[{name:'Dr Woon Kai Lin',role:'Author'}],defaultLanguage:'en',preloadedDependencies:dep};
 const id=`lesson-${lesson.id}${practice?'-practice':''}`;
 await context.contentStorage.addContent(metadata,content,{id:'author',type:'local',name:'Dr Woon Kai Lin',email:''},id);
 const native=new AdmZip();
 native.addFile('h5p.json',Buffer.from(JSON.stringify(metadata)));
 native.addFile('content/content.json',Buffer.from(JSON.stringify(content)));
 // All editor dependencies are included, so the package remains editable on an import host.
 if(!localMediaUrl)for(const e of zip.getEntries())if(!e.isDirectory)native.addFile(e.entryName,e.getData());
 await fs.mkdir(`${prefix}/downloads`,{recursive:true});await fs.mkdir(`${prefix}/exports`,{recursive:true});
 if(!localMediaUrl)native.writeZip(`${prefix}/downloads/${id}.h5p`);
 let bundled=await context.exporter.createSingleBundle(id,{id:'author',type:'local',name:'Dr Woon Kai Lin',email:''},{language:'en',showFrame:false,showEmbedButton:false,showLicenseButton:false});
 const bridge=practice?'':await fs.readFile('web/player-bridge.js','utf8');
 const controls=practice?'':`<nav class="export-controls" aria-label="Video chapters">${lesson.chapters.map(c=>`<button type="button" data-seek="${c.time}">${html(c.label)}</button>`).join('')}<button type="button" data-seek="${lesson.question.time-2}">Return to checkpoint</button><button type="button" data-seek="${lesson.frames/30-5}">Final summary</button><button type="button" data-reset>Reset lesson</button></nav>`;
 bundled=bundled.replace('<head>',`<head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' rx='9' fill='%23123543'/%3E%3Ccircle cx='20' cy='12' r='4' fill='%2391d9ca'/%3E%3Ccircle cx='12' cy='28' r='4' fill='%2391d9ca'/%3E%3Ccircle cx='28' cy='28' r='4' fill='%2391d9ca'/%3E%3C/svg%3E"><title>${html(metadata.title)}</title>`);
 const replaceLast=(text,needle,replacement)=>{const at=text.lastIndexOf(needle);if(at<0)throw new Error(`Missing ${needle}`);return text.slice(0,at)+replacement+text.slice(at+needle.length)};
 bundled=replaceLast(bundled,'<body>',`<body><header class="export-header"><h1>${html(metadata.title)}</h1><p>${html(lesson.outcome)}</p></header>${controls}<p role="status" id="player-status">${practice?'Independent practice':'Loading the interactive player…'}</p>`);
 bundled=replaceLast(bundled,'</body>',`<footer class="export-footer">${practice?'Practice is available without video.':'<a href="https://youtu.be/'+lesson.youtubeId+'" target="_blank" rel="noopener">Open the original on YouTube</a>'} · Formative practice. Static HTML has no account-linked grade persistence.</footer><style>body{margin:0;background:#fff;color:#172d3a;font-family:system-ui,sans-serif}.export-header,.export-footer,.export-controls,#player-status{padding:8px 16px}.export-header h1{font-size:1.2rem;margin:4px 0}.export-header p{font-size:.95rem;margin:4px 0}.export-controls{display:flex;gap:6px;flex-wrap:wrap}button[data-seek],button[data-reset]{padding:9px;border:1px solid #396272;border-radius:5px;background:#f0f6f8;color:#173844;cursor:pointer}#player-status{font-size:.85rem;margin:0}.export-footer{font-size:.8rem}.embedded .export-header,.embedded .export-controls,.embedded .export-footer,.embedded #player-status{display:none}.h5p-content{max-width:1200px;margin:auto}.h5p-dialog{max-width:100%}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important}}</style><script>const LESSON=${JSON.stringify({id:lesson.id,youtubeId:lesson.youtubeId,duration:lesson.frames/30,questionTime:lesson.question.time,localPreview:!!localMediaUrl})};${bridge}</script></body>`);
 const licenseText=await fs.readFile('LICENSE','utf8');
 const notices=await fs.readFile('THIRD_PARTY_NOTICES.md','utf8');
 bundled=replaceLast(bundled,'</footer>',`<details><summary>Software licenses and source</summary><pre style="white-space:pre-wrap;text-align:left;font-size:11px">${html(notices+'\n\n'+licenseText)}</pre></details></footer>`);
 await fs.writeFile(`${prefix}/exports/${id}.html`,bundled);
 return {id,metadata,content,bytes:Buffer.byteLength(bundled)};
}
