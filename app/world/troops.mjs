// C155: presentation only. Public map units in, pixels out; no engine/state mutation.
const TYPES = {BT01:'militia', BT02:'spear', BT03:'bow', BT04:'cavalry', engineer:'militia', mystic:'bow'};
const TONES = {F01:'red', F02:'green', F03:'blue'};
const ROOT = '/assets/ui-v3/units-ink/';
const FOOT_Y = 16; // Below the tile center, clear of the portrait/count above it.
const SOLDIER_H = 11.5; // 10-14 Claude: 닷토리 진짜 그림(지도와 같은 붓) — 시작 확대 2.1 에서 화면 키 약 16px
const sheets = new Map();
export const troopKind = u => TYPES[u.troop] ?? u.troop;
export const soldierCount = count => Number.isFinite(count) && count > 0 ? Math.max(6, Math.min(36, Math.ceil(count / 10))) : 0;
export const bearerCount = count => count ? Math.min(3, Math.ceil(count / 12)) : 0;

// Local coordinates: x = front/back, y = left/right. All footprints fit one hex.
export function formationPoints(kind, count, wedge = 0) {
  return Array.from({length:count}, (_, i) => {
    let x, y;
    if (kind === 'bow' || kind === 'cavalry') {
      const cols = Math.ceil(count / 2), row = Math.floor(i / cols), col = i % cols;
      x = (row - .5) * 10; y = (col - (cols - 1) / 2) * Math.min(7.2, 58 / Math.max(1, cols - 1)); // 10-14 Claude: 진짜 그림에서 한 덩어리로 뭉쳐 보여 간격을 넓힘
    } else {
      const cols = Math.ceil(Math.sqrt(count)), rows = Math.ceil(count / cols);
      x = (Math.floor(i / cols) - (rows - 1) / 2) * 7.4; y = (i % cols - (cols - 1) / 2) * 7.4;
      if (kind === 'militia') { x += Math.sin(i * 7.3) * 2.2; y += Math.cos(i * 3.7) * 2.2; }
    }
    if (kind === 'cavalry' && wedge) {
      const rank = Math.ceil((Math.sqrt(8 * (i + 1) + 1) - 3) / 2), first = rank * (rank + 1) / 2;
      x = x * (1 - wedge) + (14 - rank * 5) * wedge;
      y = y * (1 - wedge) + ((i - first - rank / 2) * 6) * wedge;
    }
    return {x, y};
  });
}
const mix = (a, b, t) => ({x:a.x + (b.x-a.x)*t, y:a.y + (b.y-a.y)*t});
const clamp = v => Math.max(0, Math.min(1, v));
const facingVector = f => { const d = [[1,0],[.5,-.537],[-.5,-.537],[-1,0],[-.5,.537],[.5,.537]][((f ?? 0)%6+6)%6]; return {x:d[0],y:d[1]}; };
export function sampleTroop(u, anchor, tile, elapsed = 0) {
  const kind = troopKind(u), a = u.attack, m = u.motion;
  let pos = {...anchor}, dir = facingVector(u.facing), moving = false, progress = -1;
  if (u.faceTileId) { const p=tile(u.faceTileId); if(p) dir={x:p.x-anchor.x,y:p.y-anchor.y}; }
  if (m && m.path.length > 1) {
    const e = m.elapsed + elapsed, hold = m.hold ?? 0, t=clamp((e-hold)/Math.max(1,m.duration-hold));
    const n=t*(m.path.length-1), i=Math.min(m.path.length-2,Math.floor(n));
    const p=tile(m.path[i]), q=tile(m.path[i+1]);
    if(p&&q){pos=mix(p,q,n-i);dir={x:q.x-p.x,y:q.y-p.y};moving=e>=hold&&e<m.duration;}
  }
  if (a) {
    progress=(a.elapsed+elapsed)/a.duration;
    const target=tile(a.targetTileId);
    if(target&&progress>=0&&progress<1){
      dir={x:target.x-anchor.x,y:target.y-anchor.y};
      if(!a.ranged){
        // Charge reaches the enemy center, thus penetrates over half its footprint.
        const reach=kind==='cavalry'&&a.charge?1.06:Math.max(0,(Math.hypot(dir.x,dir.y)-17)/Math.max(1,Math.hypot(dir.x,dir.y)));
        const t=progress<.69?Math.sin(progress/.69*Math.PI/2):Math.cos((progress-.69)/.31*Math.PI/2);
        pos=mix(anchor,target,Math.max(0,t)*reach);moving=true;
      }
    }
  }
  const angle=Math.atan2(dir.y,dir.x), live=progress>=0&&progress<1;
  return {pos,angle,moving,progress,kind,wedge:live&&kind==='cavalry'&&a.charge?Math.sin(progress*Math.PI):0};
}

export function spriteFrame({moving=false, progress=-1, hit=false}, time, index=0) {
  if(hit) return 7;
  if(progress>=.18&&progress<.72) return progress<.4?5:6;
  if(moving) return 2+Math.floor(time/125+index*.41)%3;
  return Math.floor(time/700+index*.618)%2;
}

export const troopAssetPath = (name, asset) => asset(`units-ink/${name}`) ?? ROOT+'placeholder/'+name;
// A faint cached edge helps only temporary silhouettes; adopted art is untouched.
function outlinedPlaceholder(img) {
  const canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;
  const ctx=canvas.getContext('2d');
  for(const [x,y] of [[-2,0],[2,0],[0,-2],[0,2]])ctx.drawImage(img,x,y);
  ctx.globalCompositeOperation='source-in';ctx.fillStyle='rgba(238,228,204,.26)';ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.globalCompositeOperation='source-over';ctx.drawImage(img,0,0);return canvas;
}
function loadSheet(name, columns, width, height, asset) {
  const src=troopAssetPath(name,asset);
  if(sheets.has(src))return sheets.get(src);
  const item={image:null,columns,width,height,ready:false,placeholder:false}; sheets.set(src,item);
  const load = (fallback) => {
    const img=new Image(); img.onload=()=>{item.image=fallback&&!name.startsWith('fx-')?outlinedPlaceholder(img):img;if(name.startsWith('bearer-'))item.width=img.naturalWidth/3;item.columns=Math.floor(img.naturalWidth/item.width);item.height=img.naturalHeight;item.ready=item.columns>=Math.min(columns,8);item.placeholder=fallback;};
    img.onerror=()=>{if(!fallback)load(true);}; img.src=fallback?ROOT+'placeholder/'+name:src;
  }; load(src===ROOT+'placeholder/'+name); return item;
}

export const TROOP_LABEL_PARTS = '.w-unit .plate-top .frame,.w-unit .plate-top .count text,.w-cityplate .name,.w-cityplate .seal>image,.w-cityplate .seal>circle,.w-cityplate .seal>text,.w-cityplate .crest,.w-site>.name';
// Never use the enclosing plate/group box: the pole and invisible children enlarge it.
export function troopLabelBoxes(svg, style = node => getComputedStyle(node)) {
  return [...svg.querySelectorAll(TROOP_LABEL_PARTS)].flatMap(node=>{
    const css=style(node), b=node.getBoundingClientRect();
    return css.display==='none'||css.visibility==='hidden'||Number(css.opacity)===0||!b.width||!b.height?[]:[b];
  });
}
// Draw upright people, rotate only their positions. Art faces right; left is mirrored.
function sprite(ctx, sheet, frame, x, y, height, left, alpha=1, fallen=false) {
  if(!sheet?.ready)return;
  const f=Math.min(frame,sheet.columns-1), w=height*sheet.width/sheet.height;
  ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);ctx.scale(left?-1:1,1);
  if(fallen&&sheet.columns<9)ctx.rotate(Math.PI/2);
  ctx.drawImage(sheet.image,f*sheet.width,0,sheet.width,sheet.height,-w/2,-height+height*8/sheet.height,w,height);ctx.restore();
}

export function createTroopLayer({clock=()=>performance.now(),asset=()=>null}={}) {
  const canvas=document.createElement('canvas');canvas.className='w-troops-canvas';canvas.setAttribute('aria-hidden','true');
  const ctx=canvas.getContext('2d'), casualties=new Map(), deathKeys=new Map(), hits=new Map();
  let units=[], root=null, mounted=0, raf=0, last=0, drawMs=0, stopped=false;
  const reduce=()=>globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const foot=Object.fromEntries(['militia','spear','bow','cavalry'].map(k=>[k,loadSheet(`sheet-${k}.png`,9,k==='cavalry'?112:64,96,asset)]));
  const bearers={};for(const k of ['foot','horse'])for(const tone of ['red','green','blue','grey'])bearers[`${k}-${tone}`]=loadSheet(`bearer-${k}-${tone}.png`,3,k==='horse'?112:64,128,asset);
  const effects={arrow:loadSheet('fx-arrow.png',1,40,8,asset),dust:loadSheet('fx-dust.png',1,96,40,asset),clash:loadSheet('fx-clash.png',1,96,96,asset)};
  let tiles=new Map();
  function sync(nextRoot, model) {
    root=nextRoot;mounted=clock();
    const svg=root.querySelector('svg');
    tiles=new Map([...svg.querySelectorAll('.w-hits [data-tile]')].map(n=>{const b=n.getBBox();return [n.dataset.tile,{x:b.x+b.width/2,y:b.y+b.height/2}];}));
    const nodes=new Map([...svg.querySelectorAll('.w-unit')].map(n=>[n.dataset.unit,n]));
    units=model.units.flatMap(u=>{const node=nodes.get(u.id);if(!node?.hasAttribute('data-troop-anchor'))return [];return [{u:{...u},anchor:{x:Number(node.dataset.x),y:Number(node.dataset.y)}}];});
    for(const {u,anchor} of units){
      const count=soldierCount(u.count), old=soldierCount(u.prevCount), key=`${u.prevCount}:${u.count}`;
      if(u.prevCount>u.count&&hits.get(u.id)?.key!==key)hits.set(u.id,{key,start:mounted});
      if(old>count&&deathKeys.get(u.id)!==key){deathKeys.set(u.id,key);casualties.set(u.id,{u:{...u},anchor,from:old,to:count,start:mounted});}
      if(!u.prevCount){deathKeys.delete(u.id);hits.delete(u.id);}
    }
    // A frame has no access to canonical armies: hidden/removed units disappear immediately.
    const visible=new Set(units.map(x=>x.u.id));for(const cache of [casualties,deathKeys,hits])for(const id of cache.keys())if(!visible.has(id))cache.delete(id);
    if(!canvas.isConnected)document.body.append(canvas);
    if(!stopped){cancelAnimationFrame(raf);raf=0;draw(clock());}
  }
  function draw(now) {
    const cpuStart=performance.now();
    now=clock();
    raf=0;if(stopped)return;
    // Idle animation needs only 8 fps; retain a 60 fps camera/frame loop for scrolling.
    const svg=root?.querySelector('svg'), viewport=root?.closest('.viewport');
    if(!svg?.isConnected||!viewport||document.hidden){canvas.hidden=true;raf=requestAnimationFrame(draw);return;}
    const r=viewport.getBoundingClientRect(), matrix=svg.getScreenCTM();if(!matrix){raf=requestAnimationFrame(draw);return;}
    canvas.hidden=false;
    const dpr=Math.min(2,devicePixelRatio||1), w=Math.round(r.width*dpr),h=Math.round(r.height*dpr);
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
    for(const [key,value] of Object.entries({left:`${r.left}px`,top:`${r.top}px`,width:`${r.width}px`,height:`${r.height}px`}))if(canvas.style[key]!==value)canvas.style[key]=value;
    ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,w,h);
    ctx.setTransform(dpr*matrix.a,dpr*matrix.b,dpr*matrix.c,dpr*matrix.d,dpr*(matrix.e-r.left),dpr*(matrix.f-r.top));
    const elapsed=reduce()?1e6:now-mounted, time=reduce()?0:now;
    const ordered=units.map(row=>({...row,s:sampleTroop(row.u,row.anchor,id=>tiles.get(id),elapsed)})).sort((a,b)=>a.s.pos.y-b.s.pos.y);
    for(const {u,anchor,s} of ordered){
      const screen={x:matrix.a*s.pos.x+matrix.c*s.pos.y+matrix.e-r.left,y:matrix.b*s.pos.x+matrix.d*s.pos.y+matrix.f-r.top};
      if(screen.x< -100||screen.x>r.width+100||screen.y< -100||screen.y>r.height+100)continue;
      const n=soldierCount(u.count), points=formationPoints(s.kind,n,s.wedge), cs=Math.cos(s.angle),sn=Math.sin(s.angle);
      const hit=Number.isFinite(u.prevCount)&&u.prevCount>u.count&&now-(hits.get(u.id)?.start??0)<250;
      const posed=points.map((p,i)=>({x:s.pos.x+p.x*cs-p.y*sn,y:s.pos.y+(p.x*sn+p.y*cs)*.62+FOOT_Y,i})).sort((a,b)=>a.y-b.y);
      for(const p of posed){
        const front=points[p.i].x>0, frame=spriteFrame({moving:s.moving,progress:front||s.kind==='bow'?s.progress:-1,hit},time,p.i);
        const sway=reduce()?0:Math.sin(time/430+p.i*2.7)*.18;
        sprite(ctx,foot[s.kind],frame,p.x+(hit?-cs*1.4:0),p.y+sway,SOLDIER_H,cs<0,1);
      }
      const nb=bearerCount(n);for(let i=0;i<nb;i++)sprite(ctx,bearers[`${s.kind==='cavalry'?'horse':'foot'}-${TONES[u.factionId]??'grey'}`],s.moving?1+Math.floor(time/160+i)%2:0,s.pos.x-14+i*11,s.pos.y+FOOT_Y+9,SOLDIER_H*1.33,cs<0,1);
      if(s.moving&&Math.floor(time/180)%4===0){const fx=effects.dust;if(fx.ready){ctx.save();ctx.globalAlpha=.24;ctx.drawImage(fx.image,s.pos.x-18,s.pos.y+FOOT_Y+3,28,8);ctx.restore();}}
      const target=u.attack&&tiles.get(u.attack.targetTileId), p=s.progress;
      if(target&&p>.32&&p<.91){
        if(u.attack.ranged){for(let i=0;i<7;i++){
          const t=clamp((p-.32-i*.008)/.32), start={x:anchor.x,y:anchor.y+FOOT_Y-6+i*.7}, end={x:target.x+(i-3)*2,y:target.y+FOOT_Y};
          const at=mix(start,end,t), arc=18*Math.sin(t*Math.PI);ctx.save();ctx.translate(at.x,at.y-arc);ctx.rotate(Math.atan2(end.y-start.y-18*Math.PI*Math.cos(t*Math.PI),end.x-start.x));
          if(effects.arrow.ready)ctx.drawImage(effects.arrow.image,-5,-1,10,2);ctx.restore();
        }}
        if(p>.64&&effects.clash.ready){ctx.save();ctx.globalAlpha=(1-p)*.7;ctx.drawImage(effects.clash.image,target.x-10,target.y+FOOT_Y-12,20,20);ctx.restore();}
      }
    }
    for(const [id,death] of casualties){const age=now-death.start;if(age>850||reduce()){casualties.delete(id);continue;}
      const s=sampleTroop(death.u,death.anchor,id=>tiles.get(id),0), cs=Math.cos(s.angle),sn=Math.sin(s.angle), points=formationPoints(s.kind,death.from);
      for(let i=death.to;i<death.from;i++){const p=points[i];sprite(ctx,foot[s.kind],8,s.pos.x+p.x*cs-p.y*sn,s.pos.y+(p.x*sn+p.y*cs)*.62+FOOT_Y+age/180,SOLDIER_H,cs<0,(1-age/850)*.85,true);}
    }
    // Erase label rectangles after drawing, keeping the original SVG labels intact.
    // clearRect is much cheaper than a complex clipping path on every soldier.
    ctx.setTransform(dpr,0,0,dpr,0,0);
    for(const b of troopLabelBoxes(svg))ctx.clearRect(b.left-r.left-1,b.top-r.top-1,b.width+2,b.height+2);
    last=now;drawMs=performance.now()-cpuStart;raf=requestAnimationFrame(draw);
  }
  return {sync,dispose(){stopped=true;cancelAnimationFrame(raf);canvas.remove();units=[];casualties.clear();},get stats(){return {units:units.length,soldiers:units.reduce((n,x)=>n+soldierCount(x.u.count),0),lastFrame:last,drawMs,assets:[...sheets].map(([name,s])=>({name,ready:s.ready,placeholder:s.placeholder}))};}};
}
