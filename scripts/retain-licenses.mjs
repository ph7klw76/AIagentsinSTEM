import fs from 'node:fs/promises';import crypto from 'node:crypto';import AdmZip from 'adm-zip';
const z=new AdmZip('vendor/h5p-libraries.zip'),p=JSON.parse(await fs.readFile('vendor/provenance.json','utf8'));
const repositories={'H5P.AdvancedText':'h5p-advanced-text','H5P.Audio':'h5p-audio','H5P.DragNBar':'h5p-drag-n-bar','H5P.DragNDrop':'h5p-drag-n-drop','H5P.DragNResize':'h5p-drag-n-resize','H5P.FontIcons':'h5p-font-icons','H5P.Image':'h5p-image','H5P.JoubelUI':'h5p-joubel-ui','H5P.Link':'h5p-link','H5P.Nil':'h5p-nil','H5P.Table':'h5p-table','H5P.Text':'h5p-text','H5PEditor.ColorSelector':'h5p-editor-color-selector','H5PEditor.DragQuestion':'h5p-editor-drag-question','H5PEditor.Duration':'h5p-editor-duration','H5PEditor.RadioGroup':'h5p-editor-radio-group','H5PEditor.Timecode':'h5p-editor-timecode','H5PEditor.UrlField':'h5p-editor-url-field','H5PEditor.Wizard':'h5p-editor-wizard'};
p.licenseProvenance=[];
for(const [machine,repo]of Object.entries(repositories)){
 const url=`https://api.github.com/repos/h5p/${repo}/readme`;const r=await fetch(url);const d=await r.json();
 if(!r.ok)throw Error(`${repo}: ${r.status} ${d.message}`);
 const text=Buffer.from(d.content,'base64');const lib=p.libraries.find(l=>l.machineName===machine);const dir=`${machine}-${lib.version.split('.').slice(0,2).join('.')}`;
 const spdx=text.toString().includes('(The MIT License)')&&text.toString().includes('Permission is hereby granted, free of charge')?'MIT':null;
 if(!text.length||!spdx)throw Error(`Unresolved license ${repo}`);
 z.addFile(`${dir}/UPSTREAM_LICENSE.txt`,text);
 lib.license=spdx;
 p.licenseProvenance.push({machineName:machine,source:url,htmlUrl:d.html_url,license:spdx,sourceBlobSha:d.sha,sha256:crypto.createHash('sha256').update(text).digest('hex'),includedPath:`${dir}/UPSTREAM_LICENSE.txt`,retrievedAt:new Date().toISOString()});
 console.log(machine,spdx);
}
z.writeZip('vendor/h5p-libraries.zip');
p.archives.find(a=>a.path==='vendor/h5p-libraries.zip').sha256=crypto.createHash('sha256').update(await fs.readFile('vendor/h5p-libraries.zip')).digest('hex');
p.files=z.getEntries().filter(e=>!e.isDirectory).map(e=>({path:e.entryName,sha256:crypto.createHash('sha256').update(e.getData()).digest('hex')}));
await fs.writeFile('vendor/provenance.json',JSON.stringify(p,null,2)+'\n');
