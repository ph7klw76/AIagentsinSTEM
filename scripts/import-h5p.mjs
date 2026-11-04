// Import the generated archives through Lumi's real package validator/importer.
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import H from '@lumieducation/h5p-server';
const root=`.local/import-test-${Date.now()}`;await fs.mkdir(root,{recursive:true});
const config=new H.H5PConfig(undefined,{coreApiVersion:{major:1,minor:28},h5pVersion:'1.28.0',maxTotalSize:200000000,maxFileSize:50000000});
const editor=new H.H5PEditor(new H.fsImplementations.InMemoryStorage(),config,new H.fsImplementations.FileLibraryStorage(`${root}/libraries`),new H.fsImplementations.FileContentStorage(`${root}/content`),new H.fsImplementations.DirectoryTemporaryFileStorage(`${root}/temp`));
const results=[];
for(const filename of (await fs.readdir('dist/downloads')).filter(f=>f.endsWith('.h5p'))){
 const bytes=await fs.readFile(`dist/downloads/${filename}`);
 const result=await editor.uploadPackage(bytes,{id:'author',type:'local',name:'Course author',email:''});
 if(!result.metadata?.mainLibrary||!result.parameters)throw new Error(`Import did not return content: ${filename}`);
 results.push({filename,sha256:createHash('sha256').update(bytes).digest('hex'),mainLibrary:result.metadata.mainLibrary,title:result.metadata.title,installedLibraries:result.installedLibraries.length,status:'pass'});console.log('IMPORTED',filename);
}
await fs.mkdir('evidence',{recursive:true});await fs.writeFile('evidence/native-import.json',JSON.stringify({timestamp:new Date().toISOString(),revision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),engine:'@lumieducation/h5p-server 10.0.4',coreApi:'1.28',context:'isolated filesystem H5P host; no LMS authentication or grade reporting',results},null,2)+'\n');
