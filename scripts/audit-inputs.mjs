import fs from 'node:fs/promises';
import path from 'node:path';
const ids = ['vpvanBLwJX8','ajpn28cfWvQ','05wxHQrqpoo','XoXujuXajZM','M6E1RQA_uJc','w8YkeB9KeHc','37sAYWVOSOU','uNGvR8jHTDc','OCIPs5DRukI','k-cVIztvjDE'];
await fs.mkdir('.local/upstream',{recursive:true});
const videos = await Promise.all(ids.map(async (id,i) => {
 const url=`https://www.youtube.com/watch?v=${id}`;
 const oembed=await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`).then(r=>r.json());
 const html=await fetch(url).then(r=>r.text());
 await fs.writeFile(`.local/upstream/youtube-${id}.html`,html);
 const raw=html.match(/var ytInitialPlayerResponse\s*=\s*(\{.+?\});/s)?.[1];
 let player; try{player=JSON.parse(raw)}catch{}
 return {order:['1','2','3','4','5','5.1','6','6.1','7','8'][i], id,url,oembed,videoDetails:player?.videoDetails,playabilityStatus:player?.playabilityStatus,captions:player?.captions?.playerCaptionsTracklistRenderer?.captionTracks, fetchedAt:new Date().toISOString()};
}));
await fs.writeFile('.local/youtube-metadata.json',JSON.stringify(videos,null,2));
console.log(JSON.stringify(videos.map(v=>({order:v.order,id:v.id,title:v.oembed.title,details:v.videoDetails,status:v.playabilityStatus?.status,captions:v.captions})),null,2));
const bundle=await fetch('https://api.h5p.org/v1/content-types/H5P.InteractiveVideo');
if(!bundle.ok)throw new Error(`Hub ${bundle.status}`);
await fs.writeFile('.local/upstream/interactive-video.h5p',Buffer.from(await bundle.arrayBuffer()));
const urls={videoLibrary:'https://raw.githubusercontent.com/h5p/h5p-video/master/library.json',videoTree:'https://api.github.com/repos/h5p/h5p-video/git/trees/master?recursive=1',coreTree:'https://api.github.com/repos/h5p/h5p-php-library/git/trees/master?recursive=1'};
for(const [name,url]of Object.entries(urls)){
 const response=await fetch(url);const data=await response.text();await fs.writeFile(`.local/upstream/${name}.json`,data);console.log(name,response.status,data.slice(0,2200));
}
