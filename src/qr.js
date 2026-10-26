import QRCode from 'qrcode';

export const escapeXML = (s) => String(s).replace(/[<>&"']/g, (c) => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]));
export function payload(config) {
  if (config.kind !== 'wifi') return config.value.trim();
  const esc = (s) => s.replace(/[\\;,:\"]/g, '\\$&');
  return `WIFI:T:${config.security};S:${esc(config.ssid)};P:${config.security === 'nopass' ? '' : esc(config.password)};;`;
}
export function makeQR(value) {
  if (!value) return null;
  return QRCode.create(value, { errorCorrectionLevel: 'H' }).modules;
}
export function isMarkCell(x, y, size, hasMark) {
  if (!hasMark) return false;
  const half = Math.max(2, Math.floor(size * .09));
  const c = Math.floor(size / 2);
  return Math.abs(x - c) <= half && Math.abs(y - c) <= half;
}
export function qrSVG(matrix, config, { includeMark = true, pixels = 1024 } = {}) {
  if (!matrix) return '';
  const size = matrix.size;
  const mark = includeMark && (config.emoji || config.logo);
  let cells = '';
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    if (!matrix.get(y,x) || isMarkCell(x,y,size,mark)) continue;
    const finder = (x < 7 && y < 7) || (x >= size - 7 && y < 7) || (x < 7 && y >= size - 7);
    if (config.dots === 'round' && !finder) cells += `<circle cx="${x+4.5}" cy="${y+4.5}" r=".49"/>`;
    else cells += `<rect x="${x+4}" y="${y+4}" width="1" height="1"${config.dots === 'soft' && !finder ? ' rx=".23"' : ' shape-rendering="crispEdges"'}/>`;
  }
  const n = size+8, mid=n/2;
  let artwork='';
  if (mark) {
    const extent=Math.max(2,Math.floor(size*.09))*2-1;
    if (config.logo) artwork=`<image href="${escapeXML(config.logo)}" x="${mid-extent/2}" y="${mid-extent/2}" width="${extent}" height="${extent}" preserveAspectRatio="xMidYMid meet"/>`;
    else artwork=`<text x="${mid}" y="${mid}" dominant-baseline="central" text-anchor="middle" font-family="Arial, sans-serif" font-size="${extent}">${escapeXML(config.emoji)}</text>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${pixels}" height="${pixels}" viewBox="0 0 ${n} ${n}"><rect width="${n}" height="${n}" fill="${config.base}"/><g fill="${config.ink}">${cells}</g>${artwork}</svg>`;
}
export function contrast(a,b) {
  const lum=(hex)=>{
    const rgb=hex.replace('#','').match(/.{2}/g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
    return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
  };
  const x=lum(a), y=lum(b);
  return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
}
