import fs from 'node:fs/promises';import path from 'node:path';import {createHash}from'node:crypto';import{execFileSync}from'node:child_process';
const [label,folder='test-results',destination='evidence']=process.argv.slice(2);if(!/^[a-z0-9-]+$/.test(label||''))throw Error('Provide a report label');
const results=[];
for(const entry of await fs.readdir(folder,{withFileTypes:true}))if(entry.isDirectory())for(const name of ['evidence.json','startup-only.json','pyodide.json','chapter-queue.json','practice.json']){
 const p=path.join(folder,entry.name,name);try{results.push({test:entry.name,...JSON.parse(await fs.readFile(p,'utf8'))})}catch(e){if(e.code!=='ENOENT')throw e}
}
const paths=['course.config.json','web/app.js','web/player-bridge.js','tests/learning-path.mjs',...(await fs.readdir('dist/exports')).map(f=>`dist/exports/${f}`)];const artifacts=[];
for(const p of paths)artifacts.push({path:p,sha256:createHash('sha256').update(await fs.readFile(p)).digest('hex')});
const out={timestamp:new Date().toISOString(),revision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),artifactIdentity:'Export hashes identify the exact tested local build; CI/public build identities are recorded separately.',results,artifacts,counts:{executed:results.length,passed:results.filter(r=>r.status==='pass'||r.scope?.startsWith('startup-only')).length,failed:results.filter(r=>r.status==='fail').length}};
await fs.mkdir(destination,{recursive:true});await fs.writeFile(path.join(destination,`browser-${label}.json`),JSON.stringify(out,null,2)+'\n');console.log(out.counts);
