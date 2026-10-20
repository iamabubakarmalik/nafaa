const fontkit = require('/Users/abubakarmalik/Projects/nafaa/node_modules/.pnpm/fontkit@2.0.4/node_modules/fontkit');
const DIR='/Users/abubakarmalik/Projects/nafaa/node_modules/.pnpm/@fontsource+inter@5.3.0/node_modules/@fontsource/inter/files/';
const [,,text,weight,size,track]=process.argv;
const f=fontkit.openSync(DIR+`inter-latin-${weight}-normal.woff`);
const s=+size/f.unitsPerEm; const run=f.layout(text);
let x=0, parts=[];
const r=v=>Math.round(v*10)/10;
run.glyphs.forEach((g,i)=>{
  const p=g.path.scale(s,-s).translate(x,0);
  parts.push(p.toSVG().replace(/-?\d+\.\d+/g,m=>String(r(+m))));
  x+=run.positions[i].xAdvance*s + (i<run.glyphs.length-1?+track*+size:0);
});
console.log(JSON.stringify({d:parts.join(''),width:r(x),cap:r(f.capHeight*s),xh:r(f.xHeight*s),asc:r(f.ascent*s)}));
