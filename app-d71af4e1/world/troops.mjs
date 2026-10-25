import {meleePose,meleePlan,meleeInkPaths} from './melee-motion.mjs';
// C427-BEGIN
import spearSpriteFrames from '../../assets/troop-art/sprite-a/spear-frames.json' with {type:'json'};
import swordSpriteFrames from '../../assets/troop-art/sprite-a/sword-frames.json' with {type:'json'};
import cavalrySpriteFrames from '../../assets/troop-art/sprite-a/cavalry-frames.json' with {type:'json'};
import bowSpriteFrames from '../../assets/troop-art/sprite-a/bow-frames.json' with {type:'json'};
const spriteTestFrames={spear:spearSpriteFrames,militia:swordSpriteFrames,cavalry:cavalrySpriteFrames,bow:bowSpriteFrames};
export const spriteTestManifest=kind=>spriteTestFrames[kind]??null;
// C427: A-only presentation experiment. Assets decode only behind ?sprite=a.
export const spriteTestMode=(search=globalThis.location?.search??'')=>new URLSearchParams(search).get('sprite')==='a'?'a':null;
export function spriteTestPose(u,options,index=0){
 const time=options.time??0,age=(u.feelHit?.elapsed??options.hitAge??Infinity)+(options.elapsed??0);
 const lost=Number.isFinite(u.prevCount)&&u.prevCount>u.count;
 const dead=options.dead??(lost&&Number.isFinite(age)&&age>=0&&age<450&&index<Math.ceil((u.prevCount-u.count)/u.maxCount*9));
 if(options.reduced)return {frame:0,phase:0,action:'idle'};
 if(dead)return {frame:7+Math.min(1,Math.floor(age/225)),phase:Math.min(1,age/450),action:'fall'};
 if(u.attack?.melee465){const p=meleePose(u.attack.elapsed+(options.elapsed??0),index,options.rank??(index<Math.ceil(figureCount(u.count,u.maxCount,options.occlude)/2)?0:1),meleePlan(u.attack.melee465),{defending:u.attack.defending,reduced:options.reduced});return {frame:4+p.weaponFrame,phase:p.stroke,action:'attack'};}
 if(u.attack&&(!u.attack.ranged||options.kind==='bow')){const t=(u.attack.elapsed??0)+(options.elapsed??0),contact=u.attack.feel?u.attack.contact:360;
  return {frame:t<contact-100?4:t<contact+100?5:6,phase:Math.max(0,1-Math.abs(t-contact)/240),action:'attack'};}
 return {frame:options.moving?Math.floor((time+index*47)/140)%4:0,phase:Math.sin((time+index*47)/560*Math.PI*2),action:options.moving?'walk':'idle'};
}
const assetListeners486=new Set();
const assetReady486=()=>{for(const wake of assetListeners486)wake();};
const c427TintCache=new Map();
export function tintSpritePixels(a,color){
 const target=color.slice(1).match(/../g).map(v=>parseInt(v,16));
 for(let i=0;i<a.length;i+=4){const r=a[i],g=a[i+1],b=a[i+2],hi=Math.max(r,g,b),lo=Math.min(r,g,b);if(a[i+3]&&r>g*1.35&&r>b*1.35&&(hi-lo)/Math.max(hi,1)>.35)for(let j=0;j<3;j++)a[i+j]=Math.floor(hi*target[j]/255);}
 return a;
}
export function spriteTestSource(src,faction){
 const color=FACTION[lodFaction(faction)]?.color;if(!color)return src;
 const key=src+color;if(c427TintCache.has(key))return c427TintCache.get(key).src;
 // A red mask is source data, never a faction-colored loading fallback.
 const entry={src:null};c427TintCache.set(key,entry);const image=new Image();image.onerror=()=>{};image.onload=()=>{
  const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);
  const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);tintSpritePixels(pixels.data,color);
  ctx.putImageData(pixels,0,0);const tinted=new Image(),url=canvas.toDataURL('image/png');
  // Publish only after the recolored image also decodes. RAF may run between
  // source load, canvas tint and decoded output; all pending states stay null.
  tinted.onload=()=>{entry.src=url;assetReady486();};tinted.onerror=()=>{};tinted.src=url;
 };image.src=src;return null;
}
function syncSpriteTest(sprite,mode,u,options,p,height){
 const pose=spriteTestPose(u,{...options,dead:p.dead,rank:p.melee465?.front?0:1},p.index),doc=sprite.ownerDocument,ns='http://www.w3.org/2000/svg';
 if(sprite.dataset.spriteMode!==mode){sprite.replaceChildren();sprite.dataset.spriteMode=mode;const node=doc.createElementNS(ns,'image');node.dataset.part='frame';sprite.append(node);}
 const manifest=spriteTestManifest(options.kind),frame=pose.action==='idle'?manifest.idle:manifest.frames[pose.frame],k=height/manifest.referenceHeight,node=sprite.firstChild;
 if(node.c427Height!==height||node.c452Manifest!==manifest){node.c427Height=height;node.c452Manifest=manifest;node.setAttribute('x',String(-frame.foot[0]*k));node.setAttribute('y',String(-frame.foot[1]*k));node.setAttribute('width',String(manifest.width*k));node.setAttribute('height',String(manifest.height*k));}
 const src=spriteTestSource('/assets/troop-art/sprite-a/'+frame.file,u.factionId);
 if(src&&node.c427Source!==src){node.setAttribute('href',src);node.c427Source=src;}
 node.style.visibility=src?'':'hidden';
 sprite.dataset.tintReady=String(!!src);sprite.dataset.frameFile=frame.file;sprite.dataset.faction=u.factionId;
 sprite.dataset.action=pose.action;sprite.dataset.frame=String(pose.frame);
}
// C427-END
import soldierScale from '../../assets/troop-art/soldiers/scale.json' with {type:'json'};
import occlusionRegions from '../../assets/ui-v3/map/v16/occlude/regions.json' with {type:'json'};
import {fxPreferences} from './hud-ink.mjs';
// C155: presentation only. Public map units in, pixels out; no engine/state mutation.
import {parentTroop} from '../../src/campaign-special-troops.mjs';
const TYPES = {BT01:'militia', BT02:'spear', BT03:'bow', BT04:'cavalry', engineer:'militia', mystic:'bow'};
// Shared presentation palette; ruler identities follow faction-design-index v0.7a.
export const FACTION = Object.freeze({"F01": {"name": "조조", "glyph": "曹", "color": "#b8433c"}, "F02": {"name": "유비", "glyph": "劉", "color": "#4f8f73"}, "F03": {"name": "손권", "glyph": "孫", "color": "#33709f"}, "F04": {"name": "원소", "glyph": "袁", "color": "#917848"}, "F05": {"name": "여포", "glyph": "呂", "color": "#8c6590"}, "F06": {"name": "마등", "glyph": "馬", "color": "#a37856"}, "F07": {"name": "동탁", "glyph": "董", "color": "#676851"}, "F08": {"name": "유장", "glyph": "劉", "color": "#658c88"}, "F09": {"name": "장로", "glyph": "張", "color": "#777ba1"}, "F10": {"name": "맹획", "glyph": "孟", "color": "#9a6854"}, "F11": {"name": "공손찬", "glyph": "公", "color": "#a4a294"}, "F12": {"name": "원술", "glyph": "袁", "color": "#a18c59"}});
export const factionFilter = id => {const i=Object.keys(FACTION).indexOf(id);return i<3?'none':`sepia(.65) hue-rotate(${(i-3)*37}deg) saturate(.65)`;};
const TONES = Object.fromEntries(Object.keys(FACTION).map((id,i)=>[id,['red','green','blue'][i]??'grey']));
const ROOT = '/assets/ui-v3/units-ink/';
export const lodDetail = (zoom, near = zoom >= 2) => near ? zoom > 1.95 : zoom >= 2.05;
export const lodFaction = id => ['F01','F02','F03'].includes(id) ? id : 'neutral';
// C245 R2: artwork proportions from the delivered PNGs, no gameplay values.
const LOD_ASPECT={militia:1215/1173,spear:1175/1224,bow:1154/1056,cavalry:1174/1089};
export function lodNearLayout({size=30,tileWidth=Math.sqrt(3)*size,screenScale=1,kind='militia'}={}) {
  const width=tileWidth*1.5/screenScale,height=width/(LOD_ASPECT[kind]??LOD_ASPECT.militia);
  const bannerHeight=height*.72,bannerScale=bannerHeight/62;
  const faceDiameter=Math.max(26/screenScale,bannerHeight*.18);
  return {width,height,bannerHeight,bannerScale,faceDiameter,bannerX:width*.30,bannerY:12-height-bannerHeight*.20,
    sealRadius:Math.max(11,11/screenScale),sealFont:Math.max(14,14/screenScale)};
}
export function syncLodMarker(marker,{size=30,tileWidth,screenScale=1,scaleX=1,scaleY=1,kind,near=true,left=false}={}) {
  if(!marker)return;
  const layout=lodNearLayout({size,tileWidth,screenScale,kind});
  // The legacy controller still writes its fixed-width SVG transform. A scoped
  // style uses the parent projection instead, so zoom grows the art, not the tag.
  marker.style.setProperty('transform',`scale(${screenScale/scaleX},${screenScale/scaleY})`);
  const set=(selector,values)=>{const n=marker.querySelector(selector);if(n)for(const [key,value] of Object.entries(values))n.setAttribute(key,String(value));};
  set('.lod-soldiers',{transform:`scale(${left?-1:1} 1)`});
  set('.lod-soldier-art',{x:-layout.width/2,y:12-layout.height,width:layout.width,height:layout.height});
  set('.lod-shadow',{rx:layout.width*.45});
  set('.lod-banner',{transform:`translate(${layout.bannerX} ${layout.bannerY}) scale(${layout.bannerScale})`});
  set('.lod-banner-face',{transform:`translate(11.2 23) scale(${layout.faceDiameter/32/layout.bannerScale})`});
  set('.lod-banner-hole',{r:layout.faceDiameter/2/layout.bannerScale});
  set('.lod-selected',{rx:near?layout.width/2+3:36});
  set('.lod-seal',{r:layout.sealRadius});
  const glyph=marker.querySelector('.lod-glyph');if(glyph)glyph.style.fontSize=`${layout.sealFont}px`;
  return layout;
}
// Only attack/hit events cause a lunge/shake; ordinary movement uses sampleTroop.
export function sampleLodTroop(u, anchor, tile, elapsed=0, width=76, hitAge=Infinity) {
  if(u.attack?.melee465||u.attack?.feel||u.feelHit)return sampleTroop(u,anchor,tile,elapsed);
  const s=sampleTroop({...u,attack:null},anchor,tile,elapsed);
  const target=u.attack&&tile(u.attack.targetTileId),age=(u.attack?.elapsed??0)+elapsed;
  if(target&&age>=0&&age<120&&!u.attack.ranged){
    const dx=target.x-s.pos.x,dy=target.y-s.pos.y,d=Math.hypot(dx,dy)||1;
    const push=Math.sin(age/120*Math.PI)*width*.12;
    s.pos={x:s.pos.x+dx/d*push,y:s.pos.y+dy/d*push};s.angle=Math.atan2(dy,dx);
  }
  if(hitAge>=0&&hitAge<150)s.pos.x+=Math.sin(hitAge/150*Math.PI*4)*2;
  return s;
}
const FOOT_Y = 16; // Below the tile center, clear of the portrait/count above it.
export const SOLDIER_H = 20; // C170: fewer readable people, same adopted sprite sheets.
const SPREAD = 1.4; // 10-14 v4: 지도 속 대열(C160)처럼 병사 사이를 한 사람 너비쯤 띄운다 — 겹치면 검은 덩어리(닷토리 21판)
const sheets = new Map();
// C255 lives here so the existing server module allowlist needs no change.
// C415 r2: C376 is default; ink and legacy are explicit comparison modes.
export const inkTroopsEnabled = (search=globalThis.location?.search??'') => new URLSearchParams(search).get('troops')==='ink';
export const mapFiguresEnabled = (search=globalThis.location?.search??'') => !['v1','old'].includes(new URLSearchParams(search).get('troops'));
export const figuresEnabled = (search=globalThis.location?.search??'',prefs=fxPreferences.value) => mapFiguresEnabled(search)||new URLSearchParams(search).get('figures')==='v1'||prefs.figures==='v1';
export const occlusionEnabled = (search=globalThis.location?.search??'') => new URLSearchParams(search).get('occlude')!=='0';
export const figureCount = (count,maxCount,occlude=false) => count>0&&maxCount>0?Math.max(1,Math.min(occlude?9:7,Math.ceil(count/maxCount*(occlude?9:7)))):0;
// Shared map-image projection; never consult terrain knowledge or engine state.
export function occlusionPieces(painting){
  if(!painting?.src?.endsWith('/map/v16/world.webp'))return [];
  return occlusionRegions.regions.map(r=>({...r,x:painting.x+r.x/occlusionRegions.width*painting.width,y:painting.y+r.y/occlusionRegions.height*painting.height,width:r.width/occlusionRegions.width*painting.width,height:r.height/occlusionRegions.height*painting.height,bottom:painting.y+r.bottom/occlusionRegions.height*painting.height}));
}
export const occludedBy = (foot,piece) => {
  if(foot.x<piece.x||foot.x>piece.x+piece.width)return false;
  const i=Math.min((piece.edge?.length??1)-1,Math.floor((foot.x-piece.x)/piece.width*(piece.edge?.length??1)));
  return foot.y<(piece.edge?piece.y+piece.edge[i]*piece.height:piece.bottom);
};
let occlusionSequence=0;
function syncOcclusion(el,p,matrix,pieces,width,height){
  const ns='http://www.w3.org/2000/svg',doc=el.ownerDocument;
  if(!el.c411Cover){
    const cover=doc.createElementNS(ns,'g'),id=`c411-person-${++occlusionSequence}`;
    cover.setAttribute('class','c411-occluder');
    cover.innerHTML=`<defs><clipPath id="${id}" clipPathUnits="userSpaceOnUse"><rect/></clipPath></defs><g clip-path="url(#${id})"><g/></g>`;
    el.append(cover);el.c411Cover=cover;
  }
  const m=matrix,det=m.a*m.d-m.b*m.c;if(!det)return;
  const foot={x:m.a*p.x+m.c*p.y+m.e,y:m.b*p.x+m.d*p.y+m.f};
  // Invert the complete paint projection, then the person's local translation.
  // The extracted source pixels are painted ABOVE this soldier. Clip to its
  // footprint so another soldier already in front cannot be covered by this copy.
  const inverse=`matrix(${m.d/det} ${-m.b/det} ${-m.c/det} ${m.a/det} ${(m.c*m.f-m.d*m.e)/det-p.x} ${(m.b*m.e-m.a*m.f)/det-p.y})`;
  const active=pieces.filter(r=>occludedBy(foot,r)&&r.y<=foot.y+height*Math.abs(m.d)&&r.y+r.height>=foot.y-height*Math.abs(m.d));
  // Walking changes only the projection; retain decoded images and DOM while
  // the same pieces overlap. Rebuilding every idle bob made large groves costly.
  const paint=el.c411Cover.lastChild.firstChild;
  if(paint.getAttribute('transform')!==inverse)paint.setAttribute('transform',inverse);
  const key=JSON.stringify([active.map(r=>r.id),width,height]);
  if(el.c411Key===key)return;el.c411Key=key;
  const rect=el.c411Cover.querySelector('rect');
  for(const [k,v] of Object.entries({x:-width*.6,y:-height*1.1,width:width*1.2,height:height*1.2}))rect.setAttribute(k,String(v));
  paint.replaceChildren();
  for(const r of active){const image=doc.createElementNS(ns,'image');for(const [k,v] of Object.entries({class:'w-art',href:`/assets/ui-v3/map/v16/occlude/${r.id}.png`,x:r.x,y:r.y,width:r.width,height:r.height,preserveAspectRatio:'none'}))image.setAttribute(k,String(v));paint.append(image);}
}
export const figureAsset = (kind,faction) => `/assets/troop-art/soldiers/${kind==='militia'?'sword':kind}-1-${lodFaction(faction)}.webp`;
export const inkFigureAsset = (kind,faction,pose=1) => `/assets/ui-kit/own/paper/c408/${kind==='militia'?'sword':kind}-${pose}-${FACTION[faction]?faction:'neutral'}.webp`;
export const inkWalkPose = (time,index=0,moving=false,reduced=false) => moving&&!reduced?1+Math.floor((time+index*47)/170)%3:1;
// C409: z=2.3 infantry SVG bounds ~24-28px, beside ~15px map doors.
export const inkFigureHeight = (kind,width) => width*(kind==='spear'||kind==='cavalry'?.145:.115);
const figureImages=new Map();
const figureBake={count:0,totalMs:0,maxMs:0};
// C381: bake once per asset, never filter each person on every SVG frame.
export function bakeFigure(image){
  const started=performance.now();
  const canvas=document.createElement('canvas');
  canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
  const ctx=canvas.getContext('2d');
  if(!ctx?.createLinearGradient||!canvas.toDataURL)return image.src;
  ctx.filter='saturate(.72) sepia(.16) brightness(1.02) contrast(1.02)';
  ctx.drawImage(image,0,0);
  const src=canvas.toDataURL('image/png'),ms=performance.now()-started;
  figureBake.count++;figureBake.totalMs+=ms;figureBake.maxMs=Math.max(figureBake.maxMs,ms);
  return src;
}
export const figureHeight = (kind,width) => width*.24*(soldierScale.scale[`${kind==='militia'?'sword':kind}-1`]??1);
function figureImage(kind,faction,pose=1){
  const ink=inkTroopsEnabled(),src=ink?inkFigureAsset(kind,faction,pose):figureAsset(kind,faction);
  if(!figureImages.has(src)){const item={ready:false,failed:false,image:new Image(),src};figureImages.set(src,item);item.image.onload=()=>{if(!ink)item.src=bakeFigure(item.image);item.ready=true;assetReady486();};item.image.onerror=()=>{item.failed=true;assetReady486();};item.image.src=src;}
  return figureImages.get(src);
}
const figureSlot=(i,n,width,ink=false,occlude=false)=>{if(occlude){const cols=Math.ceil(n/3),row=Math.floor(i/cols),col=i%cols,columns=Math.min(cols,n-row*cols);return {x:(col-(columns-1)/2)*width*.28,y:12-row*.18*width,front:row===0};}const front=Math.ceil(n/2),row=i<front?0:1,col=row?i-front:i,cols=row?n-front:front;
  return {x:((col-(cols-1)/2)*(ink?.27:.22)+(Math.sin(i*19)*(ink?.025:.018)))*width,y:12+(.22-row*(ink?.18:.14)-(ink?.022:.012)*Math.cos(i*11))*width,front:!row};};
// Pure pose sampler: public counts and the existing contact clock are the only inputs.
export function sampleFigures(u,{kind=troopKind(u),width=100,time=0,elapsed=0,hitAge=Infinity,reduced=false,left=false,angle=0,recoilAngle=left?0:Math.PI,moving=false,ink=false,occlude=false}={}){
  const n=figureCount(u.count,u.maxCount,occlude),old=figureCount(u.prevCount,u.maxCount,occlude),lost=Math.max(0,old-n);
  let age=u.feelHit?u.feelHit.elapsed+elapsed:hitAge;
  // C423: hold only painted poses, never the contact/count/cleanup clocks.
  const freeze=reduced?0:Math.min(Math.max(0,age),u.feelHit?.hitstopMs??0);
  if(Number.isFinite(age)){age-=freeze;time-=freeze;}
  const impacted=age>=0&&Number.isFinite(age),falling=impacted&&age<450?lost:0,base=impacted?Math.max(n,old):n;
  const a=u.attack,T=a?.feel?a.contact:360,rawAttackAge=(a?.elapsed??0)+elapsed;
  const attackAge=rawAttackAge-(reduced?0:Math.min(Math.max(0,rawAttackAge-T),a?.hitstopMs??0));
  if(!impacted&&!reduced)time-=rawAttackAge-attackAge;
  const rout=!!u.feelHit?.rout||u.morale==='ROUTING',routAge=u.feelHit?.rout?age:elapsed;
  return Array.from({length:n+falling},(_,index)=>{
    const dead=index<falling,i=dead?index:index-falling+((impacted&&age<200)?lost:0),slot=figureSlot(i,dead?base:impacted&&age<200?base:n,width,ink,occlude);
    const fresh=figureSlot(index-falling,n,width,ink,occlude),fill=impacted?clamp(age/200):0;
    let x=slot.x,y=slot.y,rotation=0,opacity=1,flip=left;
    if(!dead&&impacted&&age<200){x+=(fresh.x-x)*fill;y+=(fresh.y-y)*fill;}
    const horse=kind==='cavalry',delay=(index*37)%81;
    if(!reduced){
      y+=Math.sin((time-delay)/(moving?(horse?300:420):(horse?900:1400))*Math.PI*2+index*2.4)*(moving?(horse?3:2):(horse?2:1));
      if(moving&&u.motion){const m=u.motion,travel=Math.max(1,m.duration-(m.hold??0)),age=m.elapsed+elapsed-(m.hold??0),lag=Math.min(delay,Math.max(0,age),Math.max(0,m.duration-m.elapsed-elapsed))*width/1.5*Math.max(1,m.path.length-1)/travel;x-=Math.cos(angle)*lag;y-=Math.sin(angle)*lag;}
      if(a&&!a.ranged&&!a.melee465){const rear=!slot.front,start=T-(horse?190:140)+(rear?70:0),arrival=T+(rear?70:0),reach=width/1.5*(horse?.18:.10)*(rear?.6:1);
        const p=attackAge<arrival?clamp((attackAge-start)/Math.max(1,arrival-start))**2:1-clamp((attackAge-arrival)/250);
        x+=Math.cos(angle)*reach*p;y+=Math.sin(angle)*reach*p;
      }
      if(impacted&&slot.front){const kick=width/1.5*.06*(u.feelHit?.halfRecoil?.5:1)*(1-clamp(age/250));x+=Math.cos(recoilAngle)*kick;y+=Math.sin(recoilAngle)*kick;}
      if(rout&&routAge>=0){const p=u.formation==='BROKEN'?clamp(routAge/600):Math.sin(clamp(routAge/600)*Math.PI);flip=!left;x+=(left?1:-1)*width*.45*p;y+=Math.sin(index*3)*width*.3*p;}
    }
    let melee465=null;
    if(a?.melee465&&!dead){const cols=Math.ceil(n/2),rank=Math.floor(i/cols),col=i%cols,pose=meleePose(rawAttackAge,i,rank,meleePlan(a.melee465),{defending:a.defending,reduced});
      const along=(rank===0?.06:-.18)+pose.reach,across=(col-(Math.min(cols,n-rank*cols)-1)/2)*.21;
      x=width*(Math.cos(angle)*along-Math.sin(angle)*across);y=12+width*(Math.sin(angle)*along+Math.cos(angle)*across);rotation+=pose.rotation;melee465=pose;
    }
    const collapse=rout&&(u.heavyLoss||u.formation==='BROKEN')&&index<Math.min(2,n)&&routAge>=0;
    if(dead||collapse){const p=clamp((dead?age:routAge)/450);opacity=1-p;if(!reduced){rotation=(left?-70:70)*p;y+=6*p;}}
    return {index,x,y,rotation,opacity,left:flip,dead,front:slot.front,melee465,scale:.92+(Math.sin(index*17)+1)*.065};
  }).sort((a,b)=>a.y-b.y);
}
const inkLayers=new WeakMap();
export function syncFigures(marker,u,options){
  const art=marker?.querySelector('.lod-soldier-art'),group=marker?.querySelector('.lod-soldiers');
  if(!art||!group)return false;
  const ink=inkTroopsEnabled(),shared=mapFiguresEnabled(),spriteMode=options.enabled&&spriteTestManifest(options.kind)&&!ink?spriteTestMode():null;
  let layer=shared?inkLayers.get(marker):group.querySelector?.('.c255-figures');
  if(shared&&layer&&!layer.isConnected)layer=null;
  const enabled=options.enabled&&(u.maxCount>0),image=enabled?figureImage(options.kind,u.factionId):null;
  const shadow=marker.querySelector('.lod-shadow');
  if(!image?.ready){art.style.opacity='';if(shadow)shadow.style.opacity='';if(layer){layer.style.display='none';layer.querySelectorAll?.('[data-melee-gesture]').forEach(n=>n.remove());}return false;}
  if(shadow)shadow.style.opacity='0';
  if(art.style.opacity!=='0')art.style.opacity='0';
  if(group.getAttribute?.('transform')!=='scale(1 1)')group.setAttribute('transform','scale(1 1)');
  const doc=marker.ownerDocument,ns='http://www.w3.org/2000/svg';
  if(!layer){layer=doc.createElementNS(ns,'g');layer.setAttribute('class','c255-figures');group.append(layer);if(shared)inkLayers.set(marker,layer);}
  // Move only paint below the common cover. Original public plates/hit targets stay in place.
  const svg=marker.ownerSVGElement,scene=svg?.querySelector('.c408-people');
  if(shared&&scene&&options.paintMatrix){
    const matrix=options.paintMatrix;
    layer.setAttribute('transform',`matrix(${matrix.a} ${matrix.b} ${matrix.c} ${matrix.d} ${matrix.e} ${matrix.f})`);
    if(layer.parentNode!==scene)scene.append(layer);
    layer.dataset.unit=u.id;
  }
  if(layer.style.display!=='')layer.style.display='';
  const occlude=shared&&occlusionEnabled(),pieces=occlude?(scene?(scene.c415Pieces??=JSON.parse(scene.getAttribute('data-occlusion')??'[]')):[]):[];
  const poses=sampleFigures(u,{...options,ink,occlude}),height=(ink?inkFigureHeight:figureHeight)(options.kind,options.width)*(occlude?1.45:1),w=height*image.image.naturalWidth/image.image.naturalHeight;
  while(layer.children.length<poses.length){const el=doc.createElementNS(ns,'g'),ground=doc.createElementNS(ns,'ellipse'),sprite=doc.createElementNS(ns,spriteMode?'g':'image');
    ground.setAttribute('cx','2');ground.setAttribute('cy','0');ground.setAttribute('fill','#30291f');ground.setAttribute('opacity','.18');
    el.append(ground);el.append(sprite);el.style.transformOrigin='0px 0px';layer.append(el);}
  while(layer.children.length>poses.length)layer.lastChild.remove();
  poses.forEach((p,i)=>{const el=layer.children[i],ground=el.children[0],sprite=el.children[1];
    if(spriteMode)syncSpriteTest(sprite,spriteMode,u,options,p,height);
    let gesture=el.querySelector('[data-melee-gesture]');
    if(p.melee465?.active&&!options.reduced){
      if(!gesture){gesture=doc.createElementNS(ns,'g');gesture.setAttribute('data-melee-gesture','');gesture.setAttribute('pointer-events','none');for(const key of ['dust','arm','weapon','trail','edge','sparks']){const path=doc.createElementNS(ns,'path');path.setAttribute('data-part',key);gesture.append(path);}el.append(gesture);}
      gesture.setAttribute('transform',`scale(${p.left?-1:1} 1)`);
      const paths=meleeInkPaths(p.melee465,height,options.kind);
      for(const path of gesture.children){const key=path.getAttribute('data-part');path.setAttribute('d',paths[key]);path.setAttribute('fill',key==='dust'?'#dac08a':'none');path.setAttribute('stroke',({arm:'#273c32',weapon:'#ece2c8',trail:'#fff4d8',edge:'#d7bc7d',sparks:'#fff4d8'})[key]??'none');path.setAttribute('stroke-width',String((key==='arm'?3:key==='edge'?1:1.5)*height/50));path.setAttribute('opacity',key==='dust'?'.35':key==='edge'?'.45':'.85');path.setAttribute('stroke-linecap','round');}
    }else gesture?.remove();
    const walk=ink?figureImage(options.kind,u.factionId,inkWalkPose(options.time,p.index,options.moving,options.reduced)):image;
    const source=walk.ready?walk.src:image.src;
    if(!spriteMode&&(el.figureSource!==source||el.figureWidth!==w||el.figureHeight!==height)){
      ground.setAttribute('rx',String(w*.38));ground.setAttribute('ry',String(height*.035));
      sprite.setAttribute('href',source);sprite.setAttribute('x',String(-w/2));sprite.setAttribute('y',String(-height));sprite.setAttribute('width',String(w));sprite.setAttribute('height',String(height));
      el.figureSource=source;el.figureWidth=w;el.figureHeight=height;
    }
    if(occlude&&options.paintMatrix&&pieces.length)syncOcclusion(el,p,options.paintMatrix,pieces,w,height);
    else if(el.c411Cover){el.c411Cover.remove();el.c411Cover=null;el.c411Key=null;}
    // Ground contact keeps map orientation when a person turns or falls.
    el.style.transform=`translate(${p.x}px,${p.y}px)`;
    const transform=`translateY(${(p.melee465?.bodyY??0)*height/50}px) rotate(${p.rotation*(p.left?-1:1)}deg) scale(${p.scale*(p.left?-1:1)},${p.scale})`,opacity=String(p.opacity),filter=p.dead&&!spriteMode?'brightness(0)':'';
    if(sprite.style.transform!==transform){sprite.style.transform=transform;sprite.style.transformOrigin='0px 0px';}
    if(el.style.opacity!==opacity)el.style.opacity=opacity;
    if(ink){
      // Map shadows lean right/down. Keep that direction independent of facing.
      ground.setAttribute('cx',String(height*.16));ground.setAttribute('cy',String(height*.045));
      ground.setAttribute('fill','#47473b');ground.setAttribute('opacity','.10');
      ground.setAttribute('transform','rotate(12)');ground.setAttribute('rx',String(w*.42));
      sprite.setAttribute('filter','url(#c409-ink)');
    }
    if(shared&&!ink)ground.setAttribute('opacity','0');
    if(sprite.style.filter!==filter)sprite.style.filter=filter;});
  return true;
}
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
    const tussle=sample?.melee465?meleePose(sample.meleeTime,i,p.x>=0?0:1,meleePlan(sample.melee465),{defending:sample.defending,reduced:sample.melee465.reduced}).reach*45:sample?.melee?Math.sin(sample.meleeTime/95+i*2.1)*(p.x>=0?4:1.5):0;
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
// C252: offsets are visual only; both LOD markers and canvas soldiers use this clock.
export function feelOffset(age,{contact=180,reach=10,stop=25,reduced=false,recoil=false}={}){
  if(age<0)return 0;
  const gain=reduced?.5:1;
  if(recoil)return gain*(age<stop?reach:reach*Math.max(0,1-(age-stop)/100));
  if(age<45)return -3*gain*age/45;
  if(age<contact)return gain*(-3+(reach+3)*(age-45)/(contact-45));
  if(age<contact+stop)return gain*reach;
  return gain*reach*Math.max(0,1-(age-contact-stop)/110);
}
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
      if(a.melee465){moving=false;}else if(a.feel){
        const age=a.elapsed+elapsed,d=Math.hypot(dir.x,dir.y)||1;
        const push=feelOffset(age,{contact:a.contact,reach:a.ranged?2:a.brake?9:a.charge?16:10,stop:a.reduced?0:a.hitstopMs??(a.charge?38:25),reduced:a.reduced});
        pos={x:anchor.x+dir.x/d*push,y:anchor.y+dir.y/d*push};moving=age<a.contact;
      }else if(!a.ranged){
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
  if(u.feelHit){const h=u.feelHit,p=tile(h.from),age=h.elapsed+elapsed;
    if(p){const dx=anchor.x-p.x,dy=anchor.y-p.y,d=Math.hypot(dx,dy)||1,push=feelOffset(age,{reach:h.counter?4:h.charge?12:5,stop:h.reduced?0:h.hitstopMs??(h.charge?38:25),reduced:h.halfRecoil??h.reduced,recoil:true});pos={x:pos.x+dx/d*push,y:pos.y+dy/d*push};}
  }
  const angle=Math.atan2(dir.y,dir.x), live=progress>=0&&progress<1;
  const melee=live&&a.melee&&(a.elapsed+elapsed)>=360&&(a.elapsed+elapsed)<1480;
  return {pos,angle,moving,progress,kind,melee,meleeTime:a?.elapsed+elapsed,melee465:a?.melee465,defending:a?.defending,wedge:live&&kind==='cavalry'&&a.charge?(melee?.8:Math.sin(progress*Math.PI)):0};
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
    const img=new Image(); img.onload=()=>{if(name.startsWith('sheet-'))item.width=img.naturalWidth/9;item.image=TONED.test(name)?mapTone(img):fallback&&!name.startsWith('fx-')?outlinedPlaceholder(img):/^sheet-[a-z]+\.png$/.test(name)?paperTone(img):img;if(name.startsWith('bearer-'))item.width=img.naturalWidth/3;item.columns=Math.floor(img.naturalWidth/item.width);item.height=img.naturalHeight;item.ready=item.columns>=Math.min(columns,8);item.placeholder=fallback;assetReady486();};
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
  let geometry486=null,labelBoxes486=null,viewport486=null,svg486=null,paintMode486=null;
  const projection486=new Map(),tileWidths486=new Map();
  const wake486=()=>{if(!stopped&&root&&!raf)raf=requestAnimationFrame(draw);};
  assetListeners486.add(wake486);
  const invalidate486=()=>{geometry486=null;labelBoxes486=null;projection486.clear();tileWidths486.clear();wake486();};
  const visibility486=()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;}else invalidate486();};
  document.addEventListener?.('visibilitychange',visibility486);
  const resize486=typeof ResizeObserver==='function'?new ResizeObserver(invalidate486):null;
  const mutation486=typeof MutationObserver==='function'?new MutationObserver(records=>{
    if(records.some(r=>[svg486,root,viewport486].includes(r.target)))invalidate486();
    else if(records.some(r=>r.target.matches?.('.w-cityplate,.w-unit>.plate-top,.c153-label-art,.c289-city,.c291-marker,.c291-memory,text'))){labelBoxes486=null;wake486();}
  }):null;
  globalThis.addEventListener?.('resize',invalidate486);
  const figureFrames=[];let figureUnits=0,figureSoldiers=0,previousFrame=0;
  const figureImpacts=new Map();
  const figureGhosts=new Map();
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
  let tiles=new Map(), tileNodes=new Map(), freezeUntil=0, frozenTime=0, pausedTime=0;
  const animationTime=now=>now<freezeUntil?frozenTime:now-pausedTime;
  function sync(nextRoot, model) {
    const previousUnits=units;
    root=nextRoot;mounted=animationTime(clock());
    const svg=root.querySelector('svg');
    const port=root.closest('.viewport');
    if(port!==viewport486){viewport486?.removeEventListener?.('scroll',invalidate486);resize486?.disconnect();viewport486=port;port?.addEventListener?.('scroll',invalidate486,{passive:true});if(port)resize486?.observe(port);}
    if(svg!==svg486){mutation486?.disconnect();svg486=svg;mutation486?.observe(port??svg,{subtree:true,attributes:true,attributeFilter:['style','transform','class']});}
    invalidate486();
    tiles=new Map([...svg.querySelectorAll('.w-hits [data-tile]')].map(n=>{const b=n.getBBox();return [n.dataset.tile,{x:b.x+b.width/2,y:b.y+b.height/2}];}));
    tileNodes=new Map([...svg.querySelectorAll('.w-hits [data-tile]')].map(n=>[n.dataset.tile,n]));
    const nodes=new Map([...svg.querySelectorAll('.w-unit')].map(n=>[n.dataset.unit,n]));
    units=model.units.filter(u=>!u.remembered).flatMap(u=>{const node=nodes.get(u.id);if(!node?.hasAttribute('data-troop-anchor'))return [];return [{u:{...u,displayOffsets:JSON.parse(node.dataset.displayOffsets??'{}')},node,inCity:!!node.querySelector('.plate-top.in-city'),anchor:{x:Number(node.dataset.x),y:Number(node.dataset.y)}}];});
    // C252 may remove a killed unit at T+330. Keep only its already public,
    // painted people until T+450; never retain labels, commands or hidden tiles.
    const visibleTiles=new Set((model.tiles??[]).filter(t=>t.vis==='VISIBLE').map(t=>t.id));
    for(const row of previousUnits)if(figuresEnabled()&&row.u.count===0&&row.figureOptions&&!nodes.has(row.u.id)&&visibleTiles.has(row.u.tileId)&&!figureGhosts.has(row.u.id)){
      const oldMarker=row.node.querySelector('.lod-marker'),group=oldMarker?.querySelector('.lod-soldiers'),doc=svg.ownerDocument;
      if(group&&doc){const outer=doc.createElementNS('http://www.w3.org/2000/svg','g'),inner=doc.createElementNS('http://www.w3.org/2000/svg','g');
        const paint=mapFiguresEnabled()?inkLayers.get(oldMarker):null;
        if(paint){group.append(paint);inkLayers.set(inner,paint);}
        outer.setAttribute('class','c255-death');outer.setAttribute('transform',row.node.getAttribute('transform'));outer.style.pointerEvents='none';inner.style.transform=oldMarker.style.transform;inner.append(group);outer.append(inner);
        figureGhosts.set(row.u.id,{outer,marker:inner,u:row.u,options:row.figureOptions,start:last});
      }
    }
    for(const [id,g] of figureGhosts)if(!visibleTiles.has(g.u.tileId)||nodes.has(id)){inkLayers.get(g.marker)?.remove();g.outer.remove();figureGhosts.delete(id);}else svg.append(g.outer);
    if(figuresEnabled())for(const row of units){
      const h=figureImpacts.get(row.u.id),age=h?mounted-h.start:Infinity;
      if(age>=600){figureImpacts.delete(row.u.id);continue;}
      if(!Number.isFinite(row.u.prevCount)&&h&&row.u.count===h.count)Object.assign(row.u,{prevCount:h.prevCount,heavyLoss:h.heavyLoss,feelHit:{...h.feelHit,elapsed:age}});
    }
    for(const {u,anchor} of units){
      const count=soldierCount(u.count), old=soldierCount(u.prevCount), key=`${u.prevCount}:${u.count}`;
      if(u.prevCount>u.count&&hits.get(u.id)?.key!==key)hits.set(u.id,{key,start:clock()});
      if(old>count&&deathKeys.get(u.id)!==key){deathKeys.set(u.id,key);casualties.set(u.id,{u:{...u},anchor,from:old,to:count,start:mounted});}
      if(!u.prevCount){deathKeys.delete(u.id);hits.delete(u.id);}
    }
    // A frame has no access to canonical armies: hidden/removed units disappear immediately.
    const visible=new Set(units.map(x=>x.u.id));for(const cache of [casualties,deathKeys,hits,figureImpacts])for(const id of cache.keys())if(!visible.has(id))cache.delete(id);
    for(const paint of svg.querySelectorAll('.c408-people > [data-unit]'))if(!visible.has(paint.dataset.unit)&&!figureGhosts.has(paint.dataset.unit))paint.remove();
    if(!canvas.isConnected)document.body.append(canvas);
    if(!stopped){cancelAnimationFrame(raf);raf=0;draw(clock());}
  }
  function tileWidth486(id){
    if(!tileWidths486.has(id))tileWidths486.set(id,tileNodes.get(id)?.getBoundingClientRect?.().width);
    return tileWidths486.get(id);
  }
  function project486(row,matrix){
    const {u,node,s}=row,old=projection486.get(u.id);
    // Perspective depends on position. Only travelling/recoiling units need a new basis.
    if(!old||old.x!==s.pos.x||old.y!==s.pos.y){
      if(old)labelBoxes486=null;
      const local=troopScreenMatrix(node,s.pos,matrix);
      projection486.set(u.id,{x:s.pos.x,y:s.pos.y,local});return local;
    }
    return old.local;
  }
  function draw(now) {
    const cpuStart=performance.now();
    const frameNow=clock();
    now=animationTime(clock());
    raf=0;if(stopped)return;
    // Camera, resize, assets and contacts wake this layer; only live actions keep it running.
    const svg=root?.querySelector('svg'), viewport=root?.closest('.viewport');
    if(!svg?.isConnected||!viewport||document.hidden){canvas.hidden=true;return;}
    const mode486=[figuresEnabled(),svg.classList?.contains('lod-close'),globalThis.location?.search,devicePixelRatio].join('|');
    if(mode486!==paintMode486){paintMode486=mode486;invalidate486();}
    const elapsed486=now-mounted,active486=units.some(({u})=>u.motion&&elapsed486+(u.motion.elapsed??0)<u.motion.duration||u.attack&&elapsed486+(u.attack.elapsed??0)<u.attack.duration||u.feelHit&&elapsed486+(u.feelHit.elapsed??0)<600)||casualties.size||figureGhosts.size;
    if(svg.dataset?.defaultTroops==='true'){
      const zoom=Number.parseFloat(svg.style.width)/svg.viewBox.baseVal.width;
      svg.classList.toggle('lod-close',lodDetail(zoom,svg.classList.contains('lod-close')));
      // The old controller may wrap labels while zooming. Their artwork now
      // uses the shared foot and screen-sized marker projection instead.
      for(const marker of svg.querySelectorAll('.lod-marker')){
        const wrapper=marker.parentElement;
        if(wrapper?.classList.contains('c153-label-art')&&wrapper.getAttribute('transform')!=='scale(1)')wrapper.setAttribute('transform','scale(1)');
        const plate=marker.closest('.plate-top');
        if(plate&&plate.getAttribute('transform')!=='translate(0 0)')plate.setAttribute('transform','translate(0 0)');
      }
    }
    geometry486??={r:viewport.getBoundingClientRect(),matrix:svg.getScreenCTM()};
    if(!resize486)geometry486.matrix=svg.getScreenCTM();
    const {r,matrix}=geometry486;if(!matrix){geometry486=null;raf=requestAnimationFrame(draw);return;}
    canvas.hidden=!!svg.classList?.contains('units-lod')||(document.documentElement?.dataset.ui==='kit'&&svg.classList?.contains('c291-far-map'));
    canvas.classList?.toggle('lod-hidden',canvas.hidden);
    const dpr=Math.min(2,devicePixelRatio||1), w=Math.round(r.width*dpr),h=Math.round(r.height*dpr);
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
    for(const [key,value] of Object.entries({left:`${r.left}px`,top:`${r.top}px`,width:`${r.width}px`,height:`${r.height}px`}))if(canvas.style[key]!==value)canvas.style[key]=value;
    ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,w,h);
    ctx.setTransform(dpr*matrix.a,dpr*matrix.b,dpr*matrix.c,dpr*matrix.d,dpr*(matrix.e-r.left),dpr*(matrix.f-r.top));
    const hasFeel=units.some(row=>row.u.attack?.feel||row.u.feelHit);
    const elapsed=reduce()&&!hasFeel&&!figuresEnabled()?1e6:now-mounted, time=reduce()?0:now;
    const ordered=units.map(row=>({...row,s:sampleTroop(row.u,row.anchor,id=>tiles.get(id),elapsed)})).sort((a,b)=>a.s.pos.y-b.s.pos.y);
    // Batch geometry reads before SVG writes; one layout flush, not one per unit.
    const paintMatrices=new Map(),screenGeometry=new Map();
    if(svg.classList?.contains('units-lod'))for(const row of ordered){
      screenGeometry.set(row.u.id,{local:project486(row,matrix),tileWidth:tileWidth486(row.u.tileId)});
    }
    if(mapFiguresEnabled()&&svg.querySelector('.c408-people')){
      const inverse=matrix.inverse();
      for(const row of ordered){const group=row.node.querySelector('.lod-soldiers'),ctm=group?.getScreenCTM();
        if(ctm){const m=inverse.multiply(ctm),old=row.node.transform.baseVal.consolidate()?.matrix;
          m.e+=row.s.pos.x-(old?.e??row.s.pos.x);m.f+=row.s.pos.y-(old?.f??row.s.pos.y);paintMatrices.set(row.u.id,m);}}
    }
    figureUnits=0;figureSoldiers=0;
    for(const row of ordered){const {u,node,anchor,s,inCity}=row;
      if(!!svg.classList?.contains('units-lod')){
        const geometry=screenGeometry.get(u.id),local=geometry.local,scaleX=Math.hypot(local.a,local.b)||1,scaleY=Math.hypot(local.c,local.d)||1;
        const size=Number(svg.dataset?.size)||30,screenScale=(globalThis.innerHeight||1080)/1080;
        const tileWidth=geometry.tileWidth||Math.sqrt(3)*size*scaleX;
        const width=tileWidth*1.5/scaleX;
        const age=clock()-(hits.get(u.id)?.start??-Infinity);
        const marker=node.querySelector('.lod-marker'),screen={x:matrix.a*s.pos.x+matrix.c*s.pos.y+matrix.e,y:matrix.b*s.pos.x+matrix.d*s.pos.y+matrix.f};
        const onScreen=screen.x>=r.left-100&&screen.x<=r.left+r.width+100&&screen.y>=r.top-100&&screen.y<=r.top+r.height+100;
        const enabled=figuresEnabled()&&u.maxCount>0&&!!svg.classList.contains('lod-close')&&onScreen;
        const ready=enabled&&figureImage(s.kind,u.factionId).ready;
        const pose=ready?sampleTroop({...u,attack:null,feelHit:null},anchor,id=>tiles.get(id),elapsed):sampleLodTroop(u,anchor,id=>tiles.get(id),elapsed,width,reduce()?Infinity:age);
        node.setAttribute('transform',`translate(${pose.pos.x} ${pose.pos.y})`);
        const layout=syncLodMarker(marker,{size,tileWidth,screenScale,scaleX,scaleY,kind:s.kind,near:!!svg.classList.contains('lod-close'),left:Math.cos(s.angle)<0});
        const from=tiles.get(u.feelHit?.from??u.impactFrom),recoilAngle=from?Math.atan2(anchor.y-from.y,anchor.x-from.x):s.angle+Math.PI;
        const options={enabled,kind:s.kind,width:layout?.width??width,time,elapsed,hitAge:age,reduced:reduce(),left:Math.cos(s.angle)<0,angle:s.angle,recoilAngle,moving:pose.moving,paintMatrix:paintMatrices.get(u.id)};
        if(syncFigures(marker,u,options)){
          const source=units.find(x=>x.u.id===u.id);if(source)source.figureOptions=options;
          figureUnits++;figureSoldiers+=figureCount(u.count,u.maxCount,mapFiguresEnabled()&&occlusionEnabled());
          // Reuse C177's ink hoof dust; the SVG people retain their own contact motion.
          if(!reduce()&&u.attack&&!u.attack.ranged){const a=u.attack,t=a.elapsed+elapsed,T=a.feel?a.contact:360;
            if(t>=T-190&&t<T)chargeDust(ctx,{...s,moving:true},{reduced:false,active:true});}
        }
        continue;
      }
      // Portrait and soldiers share the same sampled motion, including long routes.
      const sheet=footFor(u,TONES[u.factionId]??'grey'),spriteKind=sheet?.name===`sheet-${troopSpriteKind(u)}-${TONES[u.factionId]??'grey'}.png`?troopSpriteKind(u):s.kind;
      const layout=troopLayout(u,inCity,{...s,spriteKind});
      syncTroopNode(node,s,layout);
      const local=project486(row,matrix);
      ctx.setTransform(dpr*local.a,dpr*local.b,dpr*local.c,dpr*local.d,dpr*(local.e-r.left),dpr*(local.f-r.top));
      const screen={x:matrix.a*s.pos.x+matrix.c*s.pos.y+matrix.e-r.left,y:matrix.b*s.pos.x+matrix.d*s.pos.y+matrix.f-r.top};
      if(screen.x< -100||screen.x>r.width+100||screen.y< -100||screen.y>r.height+100)continue;
      // C170: cavalry 5, infantry 7, city 4; represented troop strength is unchanged.
      const {points,positions,n,height}=layout, cs=Math.cos(s.angle);
      // 10-14 Claude: 평소(가만히 · 이동)엔 화면 기준 반듯한 대열 — 옆줄 = 가로, 앞뒤 = 세로(지도를 눕혀 보는 각도라 앞뒤를 줄임). 공격 중에만 대상 쪽으로 돈다
      const place=p=>{const q=positions[points.indexOf(p)];return {x:s.pos.x+q.x,y:s.pos.y+q.y};};
      if(!u.attack?.feel||u.attack.charge)chargeDust(ctx,s,{reduced:!!reduce(),active:!!u.attack||!!u.motion}); // C177: adopted E3 tail follows this same motion/direction.
      // 발밑 먹 그늘 — 무리가 땅에 서 있게
      {const xs=points.map(p=>place(p)),minx=Math.min(...xs.map(q=>q.x)),maxx=Math.max(...xs.map(q=>q.x)),miny=Math.min(...xs.map(q=>q.y)),maxy=Math.max(...xs.map(q=>q.y));
       const cx=(minx+maxx)/2,cy=(miny+maxy)/2+1.5,rx=(maxx-minx)/2+7,ry=(maxy-miny)/2+4;
       if(rx>0&&ry>0){ctx.save();ctx.translate(cx,cy);ctx.scale(1,ry/rx);const g=ctx.createRadialGradient(0,0,0,0,0,rx);g.addColorStop(0,'rgba(28,22,16,.18)');g.addColorStop(.7,'rgba(28,22,16,.08)');g.addColorStop(1,'rgba(28,22,16,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,rx,0,Math.PI*2);ctx.fill();ctx.restore();}}
      const hit=!reduce()&&Number.isFinite(u.prevCount)&&u.prevCount>u.count&&clock()-(hits.get(u.id)?.start??0)<250,hitAge=clock()-(hits.get(u.id)?.start??0),source=tiles.get(u.impactFrom),dx=anchor.x-(source?.x??anchor.x-1),dy=anchor.y-(source?.y??anchor.y),dist=Math.hypot(matrix.a*dx+matrix.c*dy,matrix.b*dx+matrix.d*dy)||1,kick=hit&&!u.feelHit?5*Math.sin(Math.min(1,hitAge/250)*Math.PI):0;
      const contactAge=u.feelHit?u.feelHit.elapsed+elapsed:u.attack?.feel?u.attack.elapsed+elapsed-u.attack.contact:Infinity;
      const stop=reduce()?0:u.feelHit?.charge||u.attack?.charge?38:25,localTime=contactAge>=0&&contactAge<stop?time-contactAge:time;
      const posed=points.map((p,i)=>({...place(p),i})).sort((a,b)=>a.y-b.y);
      for(const p of posed){
        const front=points[p.i].x>0, pose465=u.attack?.melee465&&meleePose(s.meleeTime,p.i,front?0:1,meleePlan(u.attack.melee465),{defending:u.attack.defending,reduced:reduce()}), frame=pose465?(4+pose465.weaponFrame):s.melee&&front?5+Math.floor((s.meleeTime+p.i*105)/160)%2:spriteFrame({moving:s.moving,progress:front||s.kind==='bow'?s.progress:-1,hit},localTime,p.i);
        const scatter=u.feelHit?.rout?Math.sin(p.i*3)*Math.min(8,Math.max(0,contactAge)/18):0;
        const sway=reduce()?0:Math.sin(localTime/430+p.i*2.7)*.18;
        ctx.save();ctx.filter=factionFilter(u.factionId);if(hit&&hitAge<120&&!u.feelHit)ctx.filter='brightness(0) invert(1) sepia(.4)';
        sprite(ctx,sheet,frame,p.x+dx/dist*kick+scatter,p.y+sway+dy/dist*kick,height,cs<0,1);ctx.restore();
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
      if(target&&!u.attack.feel&&p>.32&&p<.91){
        if(u.attack.ranged){for(let i=0;i<7;i++){
          const t=clamp((p-.32-i*.008)/.32), start={x:anchor.x,y:anchor.y+FOOT_Y-6+i*.7}, end={x:target.x+(i-3)*2,y:target.y+FOOT_Y};
          const at=mix(start,end,t), arc=18*Math.sin(t*Math.PI);ctx.save();ctx.translate(at.x,at.y-arc);ctx.rotate(Math.atan2(end.y-start.y-18*Math.PI*Math.cos(t*Math.PI),end.x-start.x));
          if(effects.arrow.ready)ctx.drawImage(effects.arrow.image,-5,-1,10,2);ctx.restore();
        }}
        if(p>.64&&effects.clash.ready){ctx.save();ctx.globalAlpha=(1-p)*.7;ctx.drawImage(effects.clash.image,target.x-10,target.y+FOOT_Y-12,20,20);ctx.restore();}
      }
    }
    for(const [id,g] of figureGhosts){const elapsed=g.options.elapsed+now-g.start,age=g.u.feelHit?g.u.feelHit.elapsed+elapsed:g.options.hitAge+now-g.start;
      if(age>=450||!figuresEnabled()){inkLayers.get(g.marker)?.remove();g.outer.remove();figureGhosts.delete(id);continue;}
      g.outer.style.opacity=svg.classList.contains('lod-close')?'1':'0';
      syncFigures(g.marker,g.u,{...g.options,elapsed,hitAge:age,time,reduced:reduce()});
    }
    if(mapFiguresEnabled()){
      const scene=svg.querySelector('.c408-people');let cursor=scene?.firstElementChild;
      if(scene)for(const row of ordered){const paint=inkLayers.get(row.node.querySelector('.lod-marker'));
        if(paint?.parentNode===scene){if(paint!==cursor)scene.insertBefore(paint,cursor);cursor=paint.nextElementSibling;}}
    }
    if(figureUnits){canvas.hidden=false;canvas.classList?.toggle('lod-hidden',false);}
    ctx.setTransform(dpr*matrix.a,dpr*matrix.b,dpr*matrix.c,dpr*matrix.d,dpr*(matrix.e-r.left),dpr*(matrix.f-r.top));
    for(const [id,death] of casualties){const age=now-death.start;if(!!svg.classList?.contains('units-lod')||age>850||reduce()){casualties.delete(id);continue;}
      // 쓰러지는 병사도 살아 있는 대열과 같은 수 · 간격 · 반듯한 배치로(10-14 R3)
      const s=sampleTroop(death.u,death.anchor,id=>tiles.get(id),0),sheet=footFor(death.u,TONES[death.u.factionId]??'grey');
      const metric=spriteMetrics(death.u,sheet?.name===`sheet-${troopSpriteKind(death.u)}-${TONES[death.u.factionId]??'grey'}.png`?troopSpriteKind(death.u):s.kind),cap=metric?.cap??(s.kind==='cavalry'?5:7), from=Math.min(cap,death.from), to=Math.min(cap,death.to), points=formationPoints(s.kind,from);
      for(let i=to;i<from;i++){const p=points[i],spread=metric?.spread??SPREAD;sprite(ctx,sheet,8,s.pos.x+p.y*spread,s.pos.y+p.x*.5*spread+FOOT_Y+age/180,metric?.height??SOLDIER_H,Math.cos(s.angle)<0,(1-age/850)*.85,true);}
    }
    // Erase label rectangles after drawing, keeping the original SVG labels intact.
    // clearRect is much cheaper than a complex clipping path on every soldier.
    ctx.setTransform(dpr,0,0,dpr,0,0);
    if(!labelBoxes486)labelBoxes486=troopLabelBoxes(svg);
    for(const b of labelBoxes486)ctx.clearRect(b.left-r.left-1,b.top-r.top-1,b.width+2,b.height+2);
    if(figureUnits&&previousFrame){figureFrames.push(frameNow-previousFrame);if(figureFrames.length>600)figureFrames.shift();}previousFrame=figureUnits?frameNow:0;
    // Discard our own SVG writes so the observer cannot keep an idle loop alive.
    mutation486?.takeRecords?.();
    last=now;drawMs=performance.now()-cpuStart;
    if(active486)raf=requestAnimationFrame(draw);
  }
  return {sync,
    meleeContact465(id,effect){wake486();const row=units.find(r=>r.u.id===id);if(row){Object.assign(row.u,effect,{count:effect.postCount});hits.set(id,{key:`${effect.prevCount}:${effect.postCount}`,start:clock()});}},
    feelPose(id,attack){wake486();const row=units.find(r=>r.u.id===id);if(row)row.u.attack={...attack,elapsed:mounted-animationTime(clock())+clock()-attack.start};},
    feelContact(id,effect){wake486();const row=units.find(r=>r.u.id===id);if(!row)return;
      Object.assign(row.u,effect,{count:effect.postCount,feelHit:{...effect.feelHit,elapsed:mounted-animationTime(clock())}});
      if(figuresEnabled())figureImpacts.set(id,{...row.u,start:animationTime(clock())});
      if(effect.motion)row.u.motion={...effect.motion,elapsed:effect.motion.elapsed+mounted-animationTime(clock())};
      hits.set(id,{key:`${effect.prevCount}:${effect.postCount}`,start:clock()});
    },
    setChargeDust(fn){chargeDust=fn;},freeze(ms){if(reduce())return;const now=clock();frozenTime=animationTime(now);const end=Math.max(freezeUntil,now+ms),added=now<freezeUntil?end-freezeUntil:end-now;pausedTime+=added;freezeUntil=end;},dispose(){stopped=true;assetListeners486.delete(wake486);document.removeEventListener?.('visibilitychange',visibility486);cancelAnimationFrame(raf);viewport486?.removeEventListener?.('scroll',invalidate486);globalThis.removeEventListener?.('resize',invalidate486);resize486?.disconnect();mutation486?.disconnect();canvas.remove();root?.querySelector('svg')?.querySelectorAll('.c408-people > g').forEach(n=>n.remove());units=[];casualties.clear();figureImpacts.clear();for(const g of figureGhosts.values())g.outer.remove();figureGhosts.clear();},get stats(){const sorted=[...figureFrames].sort((a,b)=>a-b);return {units:units.length,soldiers:units.reduce((n,x)=>n+soldierCount(x.u.count),0),figures:{units:figureUnits,soldiers:figureSoldiers,bake:{...figureBake},frames:sorted.length,p95:sorted.length?sorted[Math.ceil(sorted.length*.95)-1]:null},lastFrame:last,drawMs,assets:[...sheets].map(([name,s])=>({name,ready:s.ready,placeholder:s.placeholder}))};}};
}
