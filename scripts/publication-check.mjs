import fs from 'node:fs';import path from 'node:path';import {execFileSync}from'node:child_process';
const rules=JSON.parse(fs.readFileSync('publication-allowlist.json'));
const files=execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);const failures=[];
for(const f of files){if(!rules.files.includes(f)&&!rules.directories.some(d=>f.startsWith(d)))failures.push(`Not allowlisted: ${f}`);if(rules.forbiddenExtensions.includes(path.extname(f).toLowerCase()))failures.push(`Forbidden media/private artifact: ${f}`);if(fs.statSync(f).size>rules.maxFileBytes)failures.push(`Oversized: ${f}`);if(/(?:node_modules|__pycache__|\.local|\.venv|models|speaker-centroid)(?:\/|\.)/.test(f))failures.push(`Cache/private path: ${f}`)}
if(failures.length)throw new Error(failures.join('\n'));
console.log(`Publication allowlist passed for ${files.length} tracked files. Media and personal inference assets remain local.`);
