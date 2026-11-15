// Pub Terminus Paris 9:16 (1080 × 1920, 30 i/s) : page HTML animée image par image, puis MP4 (ffmpeg).
const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path'); const { execSync } = require('child_process');
const S = path.dirname(__filename); const ROOT = '/home/user/Baraparfum'; const SHOTS = path.join(S, '..', 'pub');
const f64 = (p) => fs.readFileSync(path.join(ROOT, 'assets/fonts', p)).toString('base64');
const img = (n) => 'data:image/png;base64,' + fs.readFileSync(path.join(SHOTS, n + '.png')).toString('base64');
const FPS = 30, DUR = 20;
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:D;src:url(data:font/ttf;base64,${f64('BricolageGrotesque-ExtraBold.ttf')})}
@font-face{font-family:B;src:url(data:font/ttf;base64,${f64('Figtree-ExtraBold.ttf')})}
*{box-sizing:border-box;margin:0}
body{width:1080px;height:1920px;overflow:hidden;background:#15123D}
#s{position:absolute;inset:0;overflow:hidden;background:#15123D}
.bricks{position:absolute;inset:-60px;background-image:
 linear-gradient(transparent 0 0);}
.abs{position:absolute}
.word{font-family:D;color:#fff;letter-spacing:-3px;position:absolute;left:0;right:0;text-align:center;will-change:transform,opacity}
.hl{color:#FFC229}
.tile{position:absolute;width:104px;height:104px;border-radius:24px;display:flex;align-items:center;justify-content:center;font-family:D;font-size:62px;color:#fff;box-shadow:0 10px 0 rgba(0,0,0,.35)}
.phone{position:absolute;width:620px;height:1342px;border-radius:86px;background:#0A0820;border:14px solid #fff;box-shadow:0 28px 0 rgba(0,0,0,.35);overflow:hidden}
.phone img{width:100%;height:100%;object-fit:cover;display:block}
.chip{position:absolute;font-family:B;font-size:46px;padding:22px 40px;border-radius:999px;border:6px solid #15123D;box-shadow:0 10px 0 #15123D;white-space:nowrap}
.plaque{position:absolute;left:50%;transform:translateX(-50%);background:#15123D;border:6px solid #fff;border-radius:22px;color:#fff;font-family:B;letter-spacing:10px;font-size:44px;padding:18px 40px;white-space:nowrap}
.bar{position:absolute;left:-200px;width:1500px;height:420px}
.car{position:absolute;background:#fff;border:8px solid #15123D;border-radius:40px;overflow:hidden}
</style></head><body><div id="s"></div>
<script>
const SH = ${JSON.stringify({ home: img('home'), grille: img('grille'), defi: img('defi'), pendu: img('pendu'), arret: img('arret') })};
const C = {blue:'#2B3FD6',tomato:'#FF5A36',sun:'#FFC229',mint:'#14B88A',pink:'#F2458C',violet:'#7B4AE2',ink:'#15123D',white:'#fff'};
const s = document.getElementById('s');
const clamp = (x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const prog = (t,a,b)=>clamp((t-a)/(b-a));
const eo = (x)=>1-Math.pow(1-x,3);
const eio = (x)=>x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;
const back = (x)=>{const c1=1.7,c3=c1+1;return 1+c3*Math.pow(x-1,3)+c1*Math.pow(x-1,2)};
function bricks(color, brick, off=0){ // mur de briques arrondies en quinconce
  let h=''; const w=124,hh=48,gx=14,gy=16; let row=0;
  for(let y=-hh;y<1920+hh;y+=hh+gy,row++){ const sh=(row%2)*((w+gx)/2) - off%(w+gx);
    for(let x=-w*2+sh;x<1080+w;x+=w+gx) h+='<div class="abs" style="left:'+x+'px;top:'+y+'px;width:'+w+'px;height:'+hh+'px;border-radius:20px;background:'+brick+'"></div>'; }
  return '<div class="abs" style="inset:0;background:'+color+'">'+h+'</div>';
}
const BG = {ink:['#15123D','#1E1A50'],blue:['#2B3FD6','#3146DB'],violet:['#7B4AE2','#7446DA'],tomato:['#FF5A36','#FF6845'],mint:['#14B88A','#1BC093']};
function word(text,top,size,t0,t,extra=''){ const p=prog(t,t0,t0+.45); if(p<=0) return '';
  const sc=.6+.4*back(p); return '<div class="word" style="top:'+top+'px;font-size:'+size+'px;opacity:'+clamp(p*2)+';transform:translateY('+((1-eo(p))*60)+'px) scale('+sc+')'+extra+'">'+text+'</div>'; }
function train(x,y,h){ const w=h*2.3; let o='';
  for(let i=0;i<3;i++){ const left=x+i*(w+18);
    o+='<div class="car" style="left:'+left+'px;top:'+y+'px;width:'+w+'px;height:'+h+'px;'+(i===0?'border-top-left-radius:'+h*.45+'px;':'')+'">'
     +'<div class="abs" style="left:'+(i===0?h*.42:h*.22)+'px;top:'+h*.24+'px;display:flex;gap:'+h*.12+'px">'
     +'<div style="width:'+h*.3+'px;height:'+h*.28+'px;border-radius:10px;background:#15123D"></div>'
     +'<div style="display:flex;gap:4px"><div style="width:'+h*.2+'px;height:'+h*.6+'px;border-radius:6px;background:#2B3FD6"></div><div style="width:'+h*.2+'px;height:'+h*.6+'px;border-radius:6px;background:#2B3FD6"></div></div>'
     +'<div style="width:'+h*.3+'px;height:'+h*.28+'px;border-radius:10px;background:#15123D"></div></div>'
     +'<div class="abs" style="left:0;right:0;bottom:'+h*.1+'px;height:'+h*.08+'px;background:#FF5A36"></div>'
     +(i===0?'<div class="abs" style="left:14px;top:'+h*.56+'px;width:'+h*.13+'px;height:'+h*.13+'px;border-radius:50%;background:#FFC229"></div>':'')
     +(i===1?'<div class="abs" style="top:8px;left:50%;transform:translateX(-50%);background:#15123D;color:#FFC229;font-family:B;font-size:'+h*.1+'px;letter-spacing:4px;padding:2px 12px;border-radius:6px">TERMINUS · PARIS</div>':'')
     +'</div>'; }
  for(let k=0;k<3;k++) o+='<div class="abs" style="left:'+(x+3*(w+18)+20)+'px;top:'+(y+h*(.25+k*.22))+'px;width:'+(160+k*60)+'px;height:12px;border-radius:6px;background:rgba(255,255,255,.55)"></div>';
  return o; }
const LOGO=[['T',C.blue,'#fff'],['E',C.tomato,'#fff'],['R',C.sun,C.ink],['M',C.mint,'#fff'],['I',C.pink,'#fff'],['N',C.violet,'#fff'],['U',C.tomato,'#fff'],['S',C.blue,'#fff']];
const TILT=[-4,3,-3,4,-4,3,-3,4];
function logo(t,t0,cy,scale=1){ let o=''; const tw=104*scale, gap=14*scale, total=8*tw+7*gap, x0=(1080-total)/2;
  LOGO.forEach(([l,bg,fg],i)=>{ const p=prog(t,t0+i*.07,t0+i*.07+.5); if(p<=0) return;
    const y=cy-tw/2-(1-eo(p))*300; o+='<div class="tile" style="left:'+(x0+i*(tw+gap))+'px;top:'+y+'px;width:'+tw+'px;height:'+tw+'px;font-size:'+62*scale+'px;border-radius:'+24*scale+'px;background:'+bg+';color:'+fg+';opacity:'+clamp(p*3)+';transform:rotate('+TILT[i]*back(p)+'deg) scale('+(.7+.3*back(p))+')">'+l+'</div>'; });
  const pp=prog(t,t0+.7,t0+1.1); if(pp>0) o+='<div class="word" style="top:'+(cy+tw/2+24*scale)+'px;font-family:B;font-size:'+40*scale+'px;letter-spacing:'+28*scale+'px;color:#FFC229;opacity:'+pp+'">PARIS</div>';
  return o; }
const GAMES=[['grille','La Grille','9 stations à placer','blue'],['defi','Le Défi','Deux critères croisés','violet'],['pendu','Le Pendu','Lettre par lettre','ink'],['arret','Prochain arrêt','Devine la ligne','tomato']];
function render(t){ let o='';
  // Scène 1 (0–2,6 s) : accroche
  if(t<2.6){ o+=bricks(BG.ink[0],BG.ink[1],t*20);
    o+=word('Tu prends',560,150,0.15,t)+word('le <span class="hl">métro</span>',730,170,0.55,t)+word('tous les jours ?',920,130,0.95,t);
    const out=prog(t,2.2,2.6); if(out>0) o+='<div class="abs" style="inset:0;background:'+C.blue+';transform:translateY('+(1-eio(out))*1920+'px)"></div>'; }
  // Scène 2 (2,6–4,7 s) : « vraiment ? » + rame
  else if(t<4.7){ o+=bricks(BG.blue[0],BG.blue[1],t*20);
    const tx=1080+60-eio(prog(t,2.7,4.1))*(1080+3*(460+18)+600); o+=train(tx,1180,200);
    o+=word('Mais tu le connais',620,104,2.7,t)+word('<span class="hl">vraiment ?</span>',780,190,3.1,t);
    const out=prog(t,4.35,4.7); if(out>0) o+='<div class="abs" style="inset:0;background:'+C.ink+';clip-path:circle('+eio(out)*1400+'px at 540px 960px)"></div>'; }
  // Scène 3 (4,7–6,6 s) : logo
  else if(t<6.6){ o+=bricks(BG.ink[0],BG.ink[1],t*20);
    const z=1+.04*prog(t,4.7,6.6); o+='<div class="abs" style="inset:0;transform:scale('+z+')">'+logo(t,4.8,860,1)+'</div>';
    const p=prog(t,5.6,6.0); if(p>0) o+='<div class="word" style="top:1120px;font-family:B;font-size:56px;letter-spacing:0;color:#fff;opacity:'+p+';transform:translateY('+(1-eo(p))*30+'px)">Le jeu quotidien du métro parisien</div>';
    const out=prog(t,6.3,6.6); if(out>0) o+='<div class="abs" style="inset:0;background:'+C.blue+';transform:translateX('+(1-eio(out))*1080+'px)"></div>'; }
  // Scène 4 (6,6–14,6 s) : les 4 jeux
  else if(t<14.6){ const k=Math.min(3,Math.floor((t-6.6)/2)); const t0=6.6+k*2; const [id,title,sub,col]=GAMES[k];
    o+=bricks(BG[col][0],BG[col][1],t*20);
    const pin=prog(t,t0,t0+.55), pout=prog(t,t0+1.7,t0+2);
    const px=(1080-620)/2 + (1-back(pin))*900 - eio(pout)*1100, rot=(1-eo(pin))*8 - eio(pout)*8;
    o+='<div class="phone" style="left:'+px+'px;top:520px;transform:rotate('+rot+'deg)"><img src="'+SH[id]+'"></div>';
    const tp=prog(t,t0+.1,t0+.5); const fg=col==='tomato'?C.ink:'#fff';
    o+='<div class="word" style="top:250px;font-size:118px;color:'+fg+';opacity:'+(tp*(1-pout))+';transform:translateY('+((1-eo(tp))*-50)+'px)">'+title+'</div>';
    o+='<div class="word" style="top:400px;font-family:B;font-size:54px;letter-spacing:0;color:'+(col==='tomato'?C.ink:C.sun)+';opacity:'+(tp*(1-pout))+'">'+sub+'</div>';
    
    if(k===3){ const out=prog(t,14.3,14.6); if(out>0) o+='<div class="abs" style="inset:0;background:'+C.ink+';transform:translateY('+(1-eio(out))*-1920+'px)"></div>'; } }
  // Scène 5 (14,6–17,2 s) : chaque jour, entre amis
  else if(t<17.2){ o+=bricks(BG.ink[0],BG.ink[1],t*20);
    o+=word('<span class="hl">4 jeux</span>',520,190,14.7,t)+word('chaque jour',720,130,15.0,t)+word('à minuit',870,130,15.25,t);
    const chips=[['Classement du jour',C.sun,C.ink,1130,-3],['Défie tes amis',C.mint,'#fff',1290,2],['Badges à gagner',C.pink,'#fff',1450,-2]];
    chips.forEach(([txt,bg,fg,top,r],i)=>{ const p=prog(t,15.6+i*.25,16.1+i*.25); if(p<=0) return;
      o+='<div class="chip" style="left:50%;top:'+top+'px;background:'+bg+';color:'+fg+';opacity:'+clamp(p*2)+';transform:translateX(-50%) rotate('+r+'deg) scale('+(.5+.5*back(p))+')">'+txt+'</div>'; });
    const out=prog(t,16.9,17.2); if(out>0) o+='<div class="abs" style="inset:0;background:'+C.blue+';clip-path:circle('+eio(out)*1400+'px at 540px 960px)"></div>'; }
  // Scène 6 (17,2–20 s) : fin
  else { o+=bricks(BG.blue[0],BG.blue[1],t*20);
    o+='<div class="abs" style="left:60px;right:60px;top:600px;height:330px;border-radius:44px;background:#15123D;border:8px solid #fff;opacity:'+prog(t,17.2,17.5)+'"></div>';
    o+=logo(t,17.3,740,1);
    const p=prog(t,18.1,18.5); if(p>0){ o+='<div class="word" style="top:1060px;font-size:96px;opacity:'+p+'">Joue gratuitement</div>';
      o+='<div class="plaque" style="top:1230px;opacity:'+p+';transform:translateX(-50%) scale('+(.8+.2*back(p))+')">TERMINUSPARIS.FR</div>'; }
    const q=prog(t,18.8,19.2); if(q>0) o+='<div class="word" style="top:1420px;font-family:B;font-size:30px;letter-spacing:0;color:rgba(255,255,255,.75);opacity:'+q+'">Jeu non officiel, sans lien avec la RATP ni Île-de-France Mobilités.</div>'; }
  s.innerHTML=o; }
window.render=render; render(0);
</script></body></html>`;
fs.writeFileSync(path.join(S, 'ad.html'), html);
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.goto('file://' + path.join(S, 'ad.html')); await p.waitForTimeout(800);
  const frames = path.join(S, 'frames'); fs.rmSync(frames, { recursive: true, force: true }); fs.mkdirSync(frames);
  const only = process.argv[2]; // aperçu : liste d'instants « 1,3.5,… »
  const times = only ? only.split(',').map(Number) : Array.from({ length: FPS * DUR }, (_, i) => i / FPS);
  for (let i = 0; i < times.length; i++) {
    await p.evaluate((t) => window.render(t), times[i]);
    await p.screenshot({ path: path.join(frames, String(i).padStart(4, '0') + '.jpg'), type: 'jpeg', quality: 92 });
  }
  await b.close();
  if (!only) execSync(`ffmpeg -v error -y -framerate ${FPS} -i ${frames}/%04d.jpg -c:v libx264 -pix_fmt yuv420p -crf 18 -movflags +faststart ${path.join(S, 'terminus-pub-tiktok.mp4')}`);
})();
