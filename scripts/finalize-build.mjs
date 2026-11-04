import fs from'node:fs/promises';import path from'node:path';import crypto from'node:crypto';import{execFileSync}from'node:child_process';
const c=JSON.parse(await fs.readFile('course.config.json','utf8')),files=[];
async function walk(dir){for(const e of await fs.readdir(dir,{withFileTypes:true})){const f=path.join(dir,e.name);if(e.isDirectory())await walk(f);else if(f!=='dist/build-manifest.json'){const b=await fs.readFile(f);files.push({path:path.relative('dist',f).replaceAll('\\','/'),bytes:b.length,sha256:crypto.createHash('sha256').update(b).digest('hex')})}}}
await walk('dist');files.sort((a,b)=>a.path.localeCompare(b.path));
await fs.writeFile('dist/build-manifest.json',JSON.stringify({revision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),createdAt:new Date().toISOString(),basePath:c.basePath,edition:c.activeEdition,artifacts:files},null,2)+'\n');console.log('Finalized',files.length,'served resources');
