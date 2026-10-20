const sharp=require('/Users/abubakarmalik/Projects/nafaa/node_modules/.pnpm/sharp@0.34.5/node_modules/sharp');
const fs=require('fs'),path=require('path');
const OUT=process.argv[2], dest=process.argv[3];
const ids=fs.readdirSync(OUT).filter(d=>/^(\d\d|[AB]\d)-/.test(d)).sort();
(async()=>{
 const rowH=300, W=2300; const comps=[];
 for(const [i,id] of ids.entries()){
  const y=i*rowH;
  const ic=fs.readFileSync(path.join(OUT,id,'icon.svg'));
  const big=await sharp(ic,{density:72}).resize(240,240).png().toBuffer();
  comps.push({input:big,left:20,top:y+30});
  let x=280; for(const s of [48,32,24,16]){ const b=await sharp(ic,{density:300}).resize(s,s).png().toBuffer(); comps.push({input:b,left:x,top:y+130}); x+=s+20;}
  const hz=await sharp(fs.readFileSync(path.join(OUT,id,'logo-horizontal.svg')),{density:150}).resize({height:110}).png().toBuffer();
  comps.push({input:hz,left:470,top:y+20});
  const dk=await sharp(fs.readFileSync(path.join(OUT,id,'logo-dark.svg')),{density:150}).resize({height:110}).png().toBuffer();
  comps.push({input:{create:{width:800,height:150,channels:4,background:'#0b1210'}},left:470,top:y+145});
  comps.push({input:dk,left:490,top:y+165});
  const mo=await sharp(fs.readFileSync(path.join(OUT,id,'mono.svg')),{density:150}).resize({height:110}).png().toBuffer();
  comps.push({input:mo,left:1300,top:y+20});
  const hzs=await sharp(fs.readFileSync(path.join(OUT,id,'logo-horizontal.svg')),{density:150}).resize({height:32}).png().toBuffer();
  comps.push({input:hzs,left:1300,top:y+180});
 }
 await sharp({create:{width:W,height:rowH*ids.length,channels:4,background:'#ffffff'}}).composite(comps).png().toFile(dest);
})();
