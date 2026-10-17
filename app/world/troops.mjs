import {fxPreferences} from './hud-ink.mjs';
// C155: presentation only. Public map units in, pixels out; no engine/state mutation.
import {parentTroop} from '../../src/campaign-special-troops.mjs';
const TYPES = {BT01:'militia', BT02:'spear', BT03:'bow', BT04:'cavalry', engineer:'militia', mystic:'bow'};
const TONES = {F01:'red', F02:'green', F03:'blue'};
const ROOT = '/assets/ui-v3/units-ink/';
const FOOT_Y = 16; // Below the tile center, clear of the portrait/count above it.
export const SOLDIER_H = 20; // C170: fewer readable people, same adopted sprite sheets.
const SPREAD = 1.4; // 10-14 v4: 지도 속 대열(C160)처럼 병사 사이를 한 사람 너비쯤 띄운다 — 겹치면 검은 덩어리(닷토리 21판)
const sheets = new Map();
export const troopKind = u => TYPES[u.troop] ?? parentTroop(u.troop);
export const troopSpriteKind = u => u.special ?? u.troop;
// C194: sheet pixels (96px high); equipment is one machine with two crew.
export const SPECIAL_SPRITE_METRICS = Object.freeze({
  engineer:Object.freeze({width:133,head:19,height:20,cap:7}),
  phalanx:Object.freeze({width:149,head:27,height:20,cap:7,spread:1.0}),
  horseArcher:Object.freeze({width:130,head:18,height:20,cap:5}),
  hubao:Object.freeze({width:137,head:19,height:20,cap:5}),
  catapult:Object.freeze({width:125,head:29,height:28,cap:1}),
  qingzhou:Object.freeze({width:158,head:24,height:20,cap:7,spread:1.15}),
  baiyi:Object.freeze({width:94,head:12,height:20,cap:7}),
  wudang:Object.freeze({width:101,head:10,height:20,cap:7}),
  jiefan:Object.freeze({width:184,head:30,height:20,cap:7}),
  danyang:Object.freeze({width:155,head:10,height:20,cap:7}),
});
export function troopSheetName(u,tone,asset) {
  const special=`sheet-${troopSpriteKind(u)}-${tone}.png`,kind=troopKind(u);
  if(asset(`units-ink/${special}`))return special;
  const parent=`sheet-${kind}-${tone}.png`;
  return asset(`units-ink/${parent}`)?parent:`sheet-${kind}.png`;
}
const spriteMetrics = (u,kind=troopSpriteKind(u)) => SPECIAL_SPRITE_METRICS[kind];
export const soldierCount = count => Number.isFinite(count) && count > 0 ? Math.max(6, Math.min(36, Math.ceil(count / 10))) : 0;
export const bearerCount = count => count ? Math.min(3, Math.ceil(count / 12)) : 0;

// C165: one footprint for the canvas, portrait anchor and camera (map coordinates).
export function troopLayout(u, inCity=false, sample=null) {
  const kind=sample?.kind??troopKind(u),metric=spriteMetrics(u,sample?.spriteKind??troopSpriteKind(u)),height=metric?.height??SOLDIER_H;
  const n=Math.min(metric?.cap??(inCity?4:kind==='cavalry'?5:7),inCity?4:7,soldierCount(u.count));
  const points=formationPoints(kind,n,sample?.wedge??0), live=sample&&sample.progress>=0&&sample.progress<1;
  const cs=Math.cos(sample?.angle??0),sn=Math.sin(sample?.angle??0),squeeze=inCity?.7:1,spread=metric?.spread??SPREAD;
  const positions=points.map((p,i)=>{
    const tussle=sample?.melee?Math.sin(sample.meleeTime/95+i*2.1)*(p.x>=0?4:1.5):0;
    return live?{x:((p.x+tussle)*cs-p.y*sn)*spread,y:((p.x+tussle)*sn+p.y*cs)*.62*spread+FOOT_Y}:{x:p.y*squeeze*spread,y:p.x*.5*squeeze*spread+FOOT_Y};
  });
  const top=Math.min(FOOT_Y,...positions.map(p=>p.y))-height+height*8/96;
  // Existing 96px sheets: helmet rows, excluding raised spear/flag tips.
  const headTop=top+height*(metric?.head??({militia:19,spear:27,bow:18,cavalry:23}[kind]??19))/96;
  const halfWidth=height*(metric?.width??({militia:93,spear:160,bow:101,cavalry:177}[kind]??112))/96/2;
  return {points,positions,n,height,headTop,bounds:{left:Math.min(0,...positions.map(p=>p.x))-halfWidth,right:Math.max(0,...positions.map(p=>p.x))+halfWidth,top,bottom:Math.max(FOOT_Y,...positions.map(p=>p.y))+3}};
}
export const troopPlateY = (top,scale=1) => top-2.4-28.6*scale;
export function syncTroopNode(node,s,layout) {
  // The SVG counter and the canvas receive this one sample in the same frame.
  for(const animation of node.getAnimations?.()??[])animation.cancel();
  node.setAttribute('transform',`translate(${s.pos.x} ${s.pos.y})`);
  const plate=node.querySelector('.plate-top'),scale=Number(/scale\(([^)]+)\)/.exec(plate?.querySelector('.c153-label-art')?.getAttribute('transform')??'')?.[1]??1);
  if(plate)plate.setAttribute('transform',`translate(0 ${troopPlateY(layout.headTop,scale)})`);
  node.dataset.troopHead=String(layout.headTop);
  for(const [key,value] of Object.entries(layout.bounds))node.dataset['troop'+key[0].toUpperCase()+key.slice(1)]=String(value);
}
// getScreenCTM alone loses CSS perspective. Measure a tiny local SVG basis instead.
export function troopScreenMatrix(node,pos,fallback){
  const markers=['origin','x','y'].map(key=>node.querySelector(`[data-troop-project="${key}"]`)?.getBoundingClientRect());
  if(markers.some(r=>!r?.width))return fallback;
  const [o,x,y]=markers.map(r=>({x:r.left+r.width/2,y:r.top+r.height/2}));
  const a=x.x-o.x,b=x.y-o.y,c=y.x-o.x,d=y.y-o.y;
  return {a,b,c,d,e:o.x-a*pos.x-c*pos.y,f:o.y-b*pos.x-d*pos.y};
}

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
  // The same displaced ground position is used by the plate, soldiers and ring.
  const rawTile=tile,offset=id=>u.displayOffsets?.[id]??{x:0,y:0};
  tile=id=>{const p=rawTile(id),o=offset(id);return p?{x:p.x+o.x,y:p.y+o.y}:p;};
  const base=offset(u.tileId);anchor={x:anchor.x+base.x,y:anchor.y+base.y};
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
        if(a.melee){
          const age=a.elapsed+elapsed,contact=360,release=1480;
          const push=age<contact?Math.sin(age/contact*Math.PI/2):age<release?1+Math.sin((age-contact)/100)*.035:Math.cos(clamp((age-release)/(a.duration-release))*Math.PI/2);
          pos=mix(anchor,target,Math.max(0,push)*(a.defending?.14:reach));
        }else{
          const t=progress<.69?Math.sin(progress/.69*Math.PI/2):Math.cos((progress-.69)/.31*Math.PI/2);
          pos=mix(anchor,target,Math.max(0,t)*reach);
        }
        moving=true;
      }
    }
  }
  const angle=Math.atan2(dir.y,dir.x), live=progress>=0&&progress<1;
  const melee=live&&a.melee&&(a.elapsed+elapsed)>=360&&(a.elapsed+elapsed)<1480;
  return {pos,angle,moving,progress,kind,melee,meleeTime:a?.elapsed+elapsed,wedge:live&&kind==='cavalry'&&a.charge?(melee?.8:Math.sin(progress*Math.PI)):0};
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
// 10-14 Claude: 레퍼런스판 병사는 몸이 지도에서 가장 밝은 것이 되어 소금처럼 튄다 — 불러올 때 한 번 지도 종이색으로 곱한다(알파 · 먹 결 그대로)
function paperTone(img) {
  const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const x=c.getContext('2d');
  x.drawImage(img,0,0);x.globalCompositeOperation='multiply';x.fillStyle='rgb(214,198,164)';x.fillRect(0,0,c.width,c.height);
  x.globalCompositeOperation='destination-in';x.drawImage(img,0,0);return c;
}
// 10-14 v4: 병사 캔버스는 지도 밖 층이라 지도 그림의 색 보정(hud-ink.css .w-art)이 안 걸린다 — 세력색 병사 · 깃발병 그림에 같은 보정을 불러올 때 한 번 굽는다.
// v4 그림은 병종마다 칸 너비가 달라(찌르기 창 · 말) 칸 너비를 '그림 너비 / 9' 로 읽는다(옛 그림도 9칸이라 그대로 맞다).
const TONED = /^(sheet|bearer)-[a-z]+-(red|green|blue|grey)\.png$/;
function mapTone(img){const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const x=c.getContext('2d');x.filter='saturate(.65) brightness(.91) contrast(1.08)';x.drawImage(img,0,0);return c;}
function loadSheet(name, columns, width, height, asset) {
  const src=troopAssetPath(name,asset);
  if(sheets.has(src))return sheets.get(src);
  const item={name,image:null,columns,width,height,ready:false,placeholder:false}; sheets.set(src,item);
  const load = (fallback) => {
    const img=new Image(); img.onload=()=>{if(name.startsWith('sheet-'))item.width=img.naturalWidth/9;item.image=TONED.test(name)?mapTone(img):fallback&&!name.startsWith('fx-')?outlinedPlaceholder(img):/^sheet-[a-z]+\.png$/.test(name)?paperTone(img):img;if(name.startsWith('bearer-'))item.width=img.naturalWidth/3;item.columns=Math.floor(img.naturalWidth/item.width);item.height=img.naturalHeight;item.ready=item.columns>=Math.min(columns,8);item.placeholder=fallback;};
    img.onerror=()=>{if(!fallback)load(true);}; img.src=fallback?ROOT+'placeholder/'+name:src;
  }; load(src===ROOT+'placeholder/'+name); return item;
}

export const TROOP_LABEL_PARTS = '.w-unit .unit-counter-bg,.w-unit .unit-portrait,.w-unit .unit-specs,.w-unit .unit-status-mark,.w-unit .plate-top .frame,.w-unit .plate-top .count text,.w-cityplate .name,.w-cityplate .seal>image,.w-cityplate .seal>circle,.w-cityplate .seal>text,.w-cityplate .crest,.w-site>.name';
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

export function createTroopLayer({clock=()=>performance.now(),asset=()=>null,chargeDust=()=>{}}={}) {
  const canvas=document.createElement('canvas');canvas.className='w-troops-canvas';canvas.setAttribute('aria-hidden','true');
  const ctx=canvas.getContext('2d'), casualties=new Map(), deathKeys=new Map(), hits=new Map();
  let units=[], root=null, mounted=0, raf=0, last=0, drawMs=0, stopped=false;
  const reduce=()=>fxPreferences.reduced();
  const foot=Object.fromEntries(['militia','spear','bow','cavalry'].map(k=>[k,loadSheet(`sheet-${k}.png`,9,k==='cavalry'?112:64,96,asset)]));
  // 10-14 R3(관우 기병 돌격 시안): 옷이 세력색인 시트 sheet-<병종>-<red|green|blue|grey>.png — 에셋 목록에 있으면 그것, 없으면 위의 색 없는 시트
  const toned={};const footFor=(u,tone)=>{
    const k=troopKind(u),name=troopSheetName(u,tone,asset),parentName=troopSheetName({troop:k},tone,asset);
    const get=name=>toned[name]??(toned[name]=loadSheet(name,9,k==='cavalry'?112:64,96,asset));
    const parent=parentName===`sheet-${k}.png`?foot[k]:get(parentName),chosen=name===parentName?parent:get(name);
    // Missing HTTP asset or an in-flight special image keeps its parent visible.
    return chosen?.ready?chosen:parent?.ready?parent:foot[k];
  };
  const bearers={};for(const k of ['foot','horse'])for(const tone of ['red','green','blue','grey'])bearers[`${k}-${tone}`]=loadSheet(`bearer-${k}-${tone}.png`,3,k==='horse'?112:64,128,asset);
  const effects={arrow:loadSheet('fx-arrow.png',1,40,8,asset),dust:loadSheet('fx-dust.png',1,96,40,asset),clash:loadSheet('fx-clash.png',1,96,96,asset)};
  let tiles=new Map(), freezeUntil=0, frozenTime=0, pausedTime=0;
  const animationTime=now=>now<freezeUntil?frozenTime:now-pausedTime;
  function sync(nextRoot, model) {
    root=nextRoot;mounted=animationTime(clock());
    const svg=root.querySelector('svg');
    tiles=new Map([...svg.querySelectorAll('.w-hits [data-tile]')].map(n=>{const b=n.getBBox();return [n.dataset.tile,{x:b.x+b.width/2,y:b.y+b.height/2}];}));
    const nodes=new Map([...svg.querySelectorAll('.w-unit')].map(n=>[n.dataset.unit,n]));
    units=model.units.flatMap(u=>{const node=nodes.get(u.id);if(!node?.hasAttribute('data-troop-anchor'))return [];return [{u:{...u,displayOffsets:JSON.parse(node.dataset.displayOffsets??'{}')},node,inCity:!!node.querySelector('.plate-top.in-city'),anchor:{x:Number(node.dataset.x),y:Number(node.dataset.y)}}];});
    for(const {u,anchor} of units){
      const count=soldierCount(u.count), old=soldierCount(u.prevCount), key=`${u.prevCount}:${u.count}`;
      if(u.prevCount>u.count&&hits.get(u.id)?.key!==key)hits.set(u.id,{key,start:clock()});
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
    now=animationTime(clock());
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
    for(const {u,node,anchor,s,inCity} of ordered){
      // Portrait and soldiers share the same sampled motion, including long routes.
      const sheet=footFor(u,TONES[u.factionId]??'grey'),spriteKind=sheet?.name===`sheet-${troopSpriteKind(u)}-${TONES[u.factionId]??'grey'}.png`?troopSpriteKind(u):s.kind;
      const layout=troopLayout(u,inCity,{...s,spriteKind});
      syncTroopNode(node,s,layout);
      const local=troopScreenMatrix(node,s.pos,matrix);
      ctx.setTransform(dpr*local.a,dpr*local.b,dpr*local.c,dpr*local.d,dpr*(local.e-r.left),dpr*(local.f-r.top));
      const screen={x:matrix.a*s.pos.x+matrix.c*s.pos.y+matrix.e-r.left,y:matrix.b*s.pos.x+matrix.d*s.pos.y+matrix.f-r.top};
      if(screen.x< -100||screen.x>r.width+100||screen.y< -100||screen.y>r.height+100)continue;
      // C170: cavalry 5, infantry 7, city 4; represented troop strength is unchanged.
      const {points,positions,n,height}=layout, cs=Math.cos(s.angle);
      // 10-14 Claude: 평소(가만히 · 이동)엔 화면 기준 반듯한 대열 — 옆줄 = 가로, 앞뒤 = 세로(지도를 눕혀 보는 각도라 앞뒤를 줄임). 공격 중에만 대상 쪽으로 돈다
      const place=p=>{const q=positions[points.indexOf(p)];return {x:s.pos.x+q.x,y:s.pos.y+q.y};};
      chargeDust(ctx,s,{reduced:!!reduce(),active:!!u.attack||!!u.motion}); // C177: adopted E3 tail follows this same motion/direction.
      // 발밑 먹 그늘 — 무리가 땅에 서 있게
      {const xs=points.map(p=>place(p)),minx=Math.min(...xs.map(q=>q.x)),maxx=Math.max(...xs.map(q=>q.x)),miny=Math.min(...xs.map(q=>q.y)),maxy=Math.max(...xs.map(q=>q.y));
       const cx=(minx+maxx)/2,cy=(miny+maxy)/2+1.5,rx=(maxx-minx)/2+7,ry=(maxy-miny)/2+4;
       if(rx>0&&ry>0){ctx.save();ctx.translate(cx,cy);ctx.scale(1,ry/rx);const g=ctx.createRadialGradient(0,0,0,0,0,rx);g.addColorStop(0,'rgba(28,22,16,.18)');g.addColorStop(.7,'rgba(28,22,16,.08)');g.addColorStop(1,'rgba(28,22,16,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,rx,0,Math.PI*2);ctx.fill();ctx.restore();}}
      const hit=!reduce()&&Number.isFinite(u.prevCount)&&u.prevCount>u.count&&clock()-(hits.get(u.id)?.start??0)<250,hitAge=clock()-(hits.get(u.id)?.start??0),source=tiles.get(u.impactFrom),dx=anchor.x-(source?.x??anchor.x-1),dy=anchor.y-(source?.y??anchor.y),dist=Math.hypot(matrix.a*dx+matrix.c*dy,matrix.b*dx+matrix.d*dy)||1,kick=hit?5*Math.sin(Math.min(1,hitAge/250)*Math.PI):0;
      const posed=points.map((p,i)=>({...place(p),i})).sort((a,b)=>a.y-b.y);
      for(const p of posed){
        const front=points[p.i].x>0, frame=s.melee&&front?5+Math.floor((s.meleeTime+p.i*105)/160)%2:spriteFrame({moving:s.moving,progress:front||s.kind==='bow'?s.progress:-1,hit},time,p.i);
        const sway=reduce()?0:Math.sin(time/430+p.i*2.7)*.18;
        ctx.save();if(hit&&hitAge<120)ctx.filter='brightness(0) invert(1) sepia(.4)';
        sprite(ctx,sheet,frame,p.x+dx/dist*kick,p.y+sway+dy/dist*kick,height,cs<0,1);ctx.restore();
      }
      const nb=1;for(let i=0;i<nb;i++)sprite(ctx,bearers[`${s.kind==='cavalry'?'horse':'foot'}-${TONES[u.factionId]??'grey'}`],s.moving?1+Math.floor(time/160+i)%2:0,s.pos.x-14+i*11,s.pos.y+FOOT_Y+9,SOLDIER_H*1.15,cs<0,1);
      // Canvas is above the baked wall art and SVG rings: retain a visible front arc.
      if(u.active){ctx.save();ctx.strokeStyle='#ead7a6';ctx.lineWidth=1.2;ctx.beginPath();ctx.ellipse(s.pos.x,s.pos.y+12,25,10,0,0,Math.PI);ctx.stroke();ctx.restore();}
      if(s.moving&&Math.floor(time/180)%4===0){const fx=effects.dust;if(fx.ready){ctx.save();ctx.globalAlpha=.24;ctx.drawImage(fx.image,s.pos.x-18,s.pos.y+FOOT_Y+3,28,8);ctx.restore();}}
      const target=u.attack&&tiles.get(u.attack.targetTileId), p=s.progress;
      if(s.melee&&target){
        const at=mix(s.pos,target,.25),phase=Math.floor(s.meleeTime/110)%5;
        if(effects.dust.ready){ctx.save();ctx.globalAlpha=.22;ctx.drawImage(effects.dust.image,at.x-23+phase*2,at.y+FOOT_Y-3,42,15);ctx.restore();}
        ctx.save();ctx.fillStyle='#171b1c';ctx.globalAlpha=.55;
        for(let i=0;i<4;i++){ctx.beginPath();ctx.arc(at.x+Math.sin(time/75+i*3)*14,at.y+FOOT_Y-4+Math.cos(time/90+i)*7,1+(i%2),0,Math.PI*2);ctx.fill();}ctx.restore();
      }
      if(target&&p>.32&&p<.91){
        if(u.attack.ranged){for(let i=0;i<7;i++){
          const t=clamp((p-.32-i*.008)/.32), start={x:anchor.x,y:anchor.y+FOOT_Y-6+i*.7}, end={x:target.x+(i-3)*2,y:target.y+FOOT_Y};
          const at=mix(start,end,t), arc=18*Math.sin(t*Math.PI);ctx.save();ctx.translate(at.x,at.y-arc);ctx.rotate(Math.atan2(end.y-start.y-18*Math.PI*Math.cos(t*Math.PI),end.x-start.x));
          if(effects.arrow.ready)ctx.drawImage(effects.arrow.image,-5,-1,10,2);ctx.restore();
        }}
        if(p>.64&&effects.clash.ready){ctx.save();ctx.globalAlpha=(1-p)*.7;ctx.drawImage(effects.clash.image,target.x-10,target.y+FOOT_Y-12,20,20);ctx.restore();}
      }
    }
    ctx.setTransform(dpr*matrix.a,dpr*matrix.b,dpr*matrix.c,dpr*matrix.d,dpr*(matrix.e-r.left),dpr*(matrix.f-r.top));
    for(const [id,death] of casualties){const age=now-death.start;if(age>850||reduce()){casualties.delete(id);continue;}
      // 쓰러지는 병사도 살아 있는 대열과 같은 수 · 간격 · 반듯한 배치로(10-14 R3)
      const s=sampleTroop(death.u,death.anchor,id=>tiles.get(id),0),sheet=footFor(death.u,TONES[death.u.factionId]??'grey');
      const metric=spriteMetrics(death.u,sheet?.name===`sheet-${troopSpriteKind(death.u)}-${TONES[death.u.factionId]??'grey'}.png`?troopSpriteKind(death.u):s.kind),cap=metric?.cap??(s.kind==='cavalry'?5:7), from=Math.min(cap,death.from), to=Math.min(cap,death.to), points=formationPoints(s.kind,from);
      for(let i=to;i<from;i++){const p=points[i],spread=metric?.spread??SPREAD;sprite(ctx,sheet,8,s.pos.x+p.y*spread,s.pos.y+p.x*.5*spread+FOOT_Y+age/180,metric?.height??SOLDIER_H,Math.cos(s.angle)<0,(1-age/850)*.85,true);}
    }
    // Erase label rectangles after drawing, keeping the original SVG labels intact.
    // clearRect is much cheaper than a complex clipping path on every soldier.
    ctx.setTransform(dpr,0,0,dpr,0,0);
    for(const b of troopLabelBoxes(svg))ctx.clearRect(b.left-r.left-1,b.top-r.top-1,b.width+2,b.height+2);
    last=now;drawMs=performance.now()-cpuStart;raf=requestAnimationFrame(draw);
  }
  return {sync,setChargeDust(fn){chargeDust=fn;},freeze(ms){if(reduce())return;const now=clock();frozenTime=animationTime(now);const end=Math.max(freezeUntil,now+ms),added=now<freezeUntil?end-freezeUntil:end-now;pausedTime+=added;freezeUntil=end;},dispose(){stopped=true;cancelAnimationFrame(raf);canvas.remove();units=[];casualties.clear();},get stats(){return {units:units.length,soldiers:units.reduce((n,x)=>n+soldierCount(x.u.count),0),lastFrame:last,drawMs,assets:[...sheets].map(([name,s])=>({name,ready:s.ready,placeholder:s.placeholder}))};}};
}
