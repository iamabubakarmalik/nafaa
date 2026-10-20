const fontkit = require('/Users/abubakarmalik/Projects/nafaa/node_modules/.pnpm/fontkit@2.0.4/node_modules/fontkit');
const files = process.argv.slice(2);
let out = '', y = 0;
for (const f of files) {
  let font = fontkit.openSync(f);
  if (font.fonts) { console.error(f, font.fonts.map(x=>x.postscriptName)); font = font.fonts[0]; }
  const run = font.layout('نفع', { script: 'arab', direction: 'rtl' });
  const s = 160 / font.unitsPerEm; let x = 0, d = '';
  run.glyphs.forEach((g, i) => { const p = run.positions[i]; d += g.path.scale(s, -s).translate(x + p.xOffset*s, -p.yOffset*s).toSVG(); x += p.xAdvance * s; });
  y += 260; out += `<path transform="translate(40 ${y-60})" d="${d}"/>`;
}
require('fs').writeFileSync('../ar.svg', `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="${y+40}" style="background:#fff">${out}</svg>`);
