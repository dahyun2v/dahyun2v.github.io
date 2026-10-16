// C177: presentation only. Fire lifetime/rules remain in the campaign engine.
import {fireReadout} from './hud-ink.mjs';
export const FX_ROOT='/assets/ui-v3/dots-1016/';
export const FX_SHEETS=Object.freeze({
 flame:{path:'fire/B1-flame.png',frames:8,w:256,h:256},
 ignite:{path:'fire/B2-ignite.png',frames:6,w:256,h:256},
 smoke:{path:'fire/B3-smoke.png',frames:6,w:192,h:320},
 scorch:{path:'fire/B4-scorched-ground.png',frames:1,w:384,h:256},
 wave:{path:'fx/E1-shockwave.png',frames:6,w:256,h:256},
 splash:{path:'fx/E2-ink-splash.png',frames:6,w:256,h:256},
 dust:{path:'fx/E3-charge-dust.png',frames:4,w:384,h:128},
});
const NS='http://www.w3.org/2000/svg';
const hash=id=>[...id].reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,0);
export const spriteFrame=(age,frames,{loop=false,reduced=false,offset=0}={})=>reduced?frames-1:loop?Math.floor(Math.max(0,age)/110+offset)%frames:Math.min(frames-1,Math.floor(Math.max(0,age)/90));

// The canonical fire records are read only here; unseen fires never reach the UI.
export function visibleFireTiles(state,knowledge=state?.knowledge?.tiles??state?.knowledge?.[state?.playerFactionId]?.tiles??{}){
 const ids=new Set(),turn=state?.turn??0;
 for(const f of state?.fire?.tiles??[])if(knowledge[f.tileId]==='VISIBLE')ids.add(f.tileId);
 for(const f of state?.c182?.fires??[])if(f.until>=turn&&knowledge[f.tileId]==='VISIBLE')ids.add(f.tileId);
 for(const f of state?.c27?.fires??[])if(f.until>=turn)for(const id of f.tiles??[])if(knowledge[id]==='VISIBLE')ids.add(id);
 for(const f of state?.c32?.fires??[])if(f.until>=turn&&knowledge[f.tileId]==='VISIBLE')ids.add(f.tileId);
 return [...ids];
}
// Memory is local to this renderer and is never serialized into a save.
export function createFireMemory({scorchTurns=3}={}){
 let turn=-1;const burning=new Map(),scorched=new Map();
 return {
  update(ids,nextTurn,known={}){
   if(nextTurn<turn){burning.clear();scorched.clear();}turn=nextTurn;
   const live=new Map(ids.map(id=>[id,true]));
   for(const [id,until] of burning)if(!live.has(id)&&known[id]==='VISIBLE'){
    // Leaving vision is not evidence that a fire went out.
    scorched.set(id,Math.min(until,nextTurn-1)+scorchTurns);
    burning.delete(id);
   }
   for(const [id,until] of scorched)if(until<nextTurn)scorched.delete(id);
   return {fires:ids,scorches:[...scorched.keys()].filter(id=>known[id]==='VISIBLE'&&!live.has(id))};
  },
  remember(records){for(const {id,until} of records)burning.set(id,until);},
  clear(){turn=-1;burning.clear();scorched.clear();},
 };
}
function fireRecords(s,knowledge){
 if(s.fire)return fireReadout(s).fires.filter(f=>knowledge[f.id]==='VISIBLE');
 const rows=[];for(const f of s?.c27?.fires??[])for(const id of f.tiles??[])if(knowledge[id]==='VISIBLE')rows.push({id,until:f.until});
 for(const f of s?.c32?.fires??[])if(knowledge[f.tileId]==='VISIBLE')rows.push({id:f.tileId,until:f.until});
 // Multiple sources may overlap; remember the last expiry, not array order.
 const byId=new Map();for(const r of rows)if(r.until>=(s?.turn??0))byId.set(r.id,Math.max(byId.get(r.id)??0,r.until));
 return [...byId].map(([id,until])=>({id,until}));
}
export function withinViewport(point,matrix,rect,radius=70){
 const x=matrix.a*point.x+matrix.c*point.y+matrix.e,y=matrix.b*point.x+matrix.d*point.y+matrix.f;
 const pad=radius*Math.max(Math.hypot(matrix.a,matrix.b),Math.hypot(matrix.c,matrix.d));
 return x+pad>=rect.left&&x-pad<=rect.right&&y+pad>=rect.top&&y-pad<=rect.bottom;
}
export function tacticTiles(before,after,c){
 const known=after.knowledge?.[after.playerFactionId]?.tiles??{},from=before.armies?.[c.attackerId]?.tileId;
 const target=before.armies?.[c.targetId]?.tileId??before.cities?.[c.targetId]?.tileId??(before.tiles?.[c.targetId]?c.targetId:from);
 const old=new Set(visibleFireTiles(before)),fresh=visibleFireTiles(after).filter(id=>!old.has(id));
 const renewed=[...(after.c27?.fires??[]).slice(before.c27?.fires?.length??0).flatMap(f=>f.tiles??[]),...(after.c32?.fires??[]).slice(before.c32?.fires?.length??0).map(f=>f.tileId)];
 const igniting=[...new Set([...fresh,...renewed,...(c.fire&&target?[target]:[])])].filter(id=>known[id]==='VISIBLE');
 const changed=(c.units??[]).map(u=>before.armies?.[u.unitId]?.tileId);
 return {from,to:target,fresh,igniting,targets:[...new Set([target,...changed,...igniting])].filter(id=>id&&known[id]==='VISIBLE')};
}
export function shakeFrames({reduced=false,big=false}={}){
 if(reduced)return [];const k=big?8:4;
 return [{translate:'0px 0px'},{translate:`${k}px ${-k/2}px`},{translate:`${-k*.7}px ${k/2}px`},{translate:'0px 0px'}];
}
// Camera driver is supplied by world.js so this module never owns game selection.
export function createTacticCamera({get,set,reduced=()=>false,clock=()=>performance.now(),raf=fn=>requestAnimationFrame(fn),cancel=id=>cancelAnimationFrame(id)}){
 let saved=null,frame=0,generation=0;
 const stop=()=>{generation++;if(frame)cancel(frame);frame=0;};
 function tween(to,done){stop();const seq=generation,from=get(),start=clock();
  const tick=()=>{if(seq!==generation)return;const p=Math.min(1,(clock()-start)/300),k=1-(1-p)**3;
   set(Object.fromEntries(['zoom','left','top'].map(key=>[key,from[key]+(to[key]-from[key])*k])));
   if(p<1)frame=raf(tick);else{frame=0;done?.();}
  };tick();
 }
 return {
  begin({alreadyVisible=true,pan={x:0,y:0},anchor={x:0,y:0}}={},done=()=>{}){
   if(saved){stop();set(saved);saved=null;}
   if(reduced()){done();return;}saved={...get()};const z=saved.zoom*1.15;
   tween({zoom:z,left:(saved.left+anchor.x)*1.15-anchor.x+(alreadyVisible?0:pan.x),top:(saved.top+anchor.y)*1.15-anchor.y+(alreadyVisible?0:pan.y)},done);
  },
  finish(){if(!saved)return;const original=saved;saved=null;if(reduced()){stop();set(original);}else tween(original);},
  reset(){stop();if(saved)set(saved);saved=null;},
 };
}
function svgNode(doc,name,attrs={}){const n=doc.createElementNS(NS,name);for(const [key,value] of Object.entries(attrs))n.setAttribute(key,String(value));return n;}
function sprite(doc,key,width,height,frame,attrs={}){
 const s=FX_SHEETS[key],n=svgNode(doc,'svg',{width,height,style:`width:${width}px;height:${height}px`,viewBox:`${frame*s.w} 0 ${s.w} ${s.h}`,overflow:'hidden',...attrs});
 n.append(svgNode(doc,'image',{href:FX_ROOT+s.path,width:s.w*s.frames,height:s.h}));return n;
}
export function createInkFx({root=null,viewport=null,sfx=()=>null,reduced=()=>!!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches,camera=null,clock=()=>performance.now(),raf=fn=>requestAnimationFrame(fn),cancel=id=>cancelAnimationFrame(id),doc=globalThis.document}={}){
 const memory=createFireMemory(),ignitions=new Map(),held=new Set();let fires=[],scorches=[],fireTurns=new Map(),impacts=[],svg=null,layout=null,frame=0,last=-Infinity,stopped=false,burnLoop=false;
 const center=id=>{const [q,r]=id.split(',').map(Number);return {x:layout.ox+layout.size*Math.sqrt(3)*(q+r/2),y:layout.oy+layout.size*1.5*r*.62};};
 const cameraFx=camera?createTacticCamera({...camera,reduced,clock,raf,cancel}):null;
 let prepared=null;
 function loop(on){const audio=sfx();if(on){audio?.startLoop?.('fire-burn',{gain:.3});burnLoop=true;}else if(burnLoop){audio?.stopLoop?.('fire-burn');burnLoop=false;}}
 const onVisibility=()=>{if(doc.hidden)loop(false);};doc.addEventListener?.('visibilitychange',onVisibility);
 function clearLayers(){for(const selector of ['.w-fire-ground','.w-fire-layer','.w-ink-fx'])svg?.querySelector(selector)?.replaceChildren();}
 function paint(now=clock()){
  if(stopped)return;frame=raf(paint);
  if(now-last<100)return;last=now;
  if(!svg?.isConnected||!layout||doc.hidden){loop(false);return;}
  const matrix=svg.getScreenCTM(),rect=viewport.getBoundingClientRect();if(!matrix||!rect.width||!rect.height){loop(false);return;}
  clearLayers();const ground=svg.querySelector('.w-fire-ground'),flame=svg.querySelector('.w-fire-layer'),fx=svg.querySelector('.w-ink-fx');if(!ground||!flame||!fx)return;
  const visible=id=>withinViewport(center(id),matrix,rect,layout.size*2.6),size=layout.size*1.6;
  let audible=false;
  for(const id of scorches){if(!visible(id))continue;const p=center(id);ground.append(svgNode(doc,'ellipse',{cx:p.x,cy:p.y,rx:size*.55,ry:size*.28,fill:'#151916',opacity:.66,'data-burned-forest':id}));ground.append(sprite(doc,'scorch',size,size*2/3,0,{x:p.x-size/2,y:p.y-size/4,'data-scorch':id}));}
  for(const entry of ignitions.values())if(entry.start===null)entry.start=now+entry.delay;
  for(const e of impacts)if(e.start===null)e.start=now;
  for(const id of fires){if(held.has(id)||!visible(id))continue;const p=center(id),start=ignitions.get(id)?.start,age=start===undefined?Infinity:now-start;if(age<0)continue;audible=true;
   const key=age<540?'ignite':'flame',index=spriteFrame(Number.isFinite(age)?age:now,FX_SHEETS[key].frames,{loop:key==='flame',reduced:reduced(),offset:hash(id)%8});
   flame.append(sprite(doc,key,size,size,index,{x:p.x-size/2,y:p.y-size*.88,'data-fire':id,'data-fx-kind':key}));
   if(fireTurns.has(id)){const label=svgNode(doc,'text',{x:p.x,y:p.y+size*.34,class:'c206-fire-turns','text-anchor':'middle','data-fire-turns':id});label.textContent=`${fireTurns.get(id)}차례`;flame.append(label);}
   if(age>=300)flame.append(sprite(doc,'smoke',size*.85,size*1.42,spriteFrame(now,6,{loop:true,reduced:reduced(),offset:hash(id)%6}),{x:p.x-size*.4,y:p.y-size*2,opacity:.36,'data-smoke':id}));
  }
  loop(audible);
  impacts=impacts.filter(e=>now-e.start<650);
  for(const e of impacts){if(!visible(e.tile))continue;const p=center(e.tile),age=now-e.start,w=size*(e.big?2.1:1.65);
   for(const key of ['wave','splash']){const d=w*(key==='splash'?.72:1);fx.append(sprite(doc,key,d,d,spriteFrame(age,6,{reduced:reduced()}),{x:p.x-d/2,y:p.y-d*.65,'data-tactic-impact':e.tile,opacity:(key==='splash'?.75:.9)*(reduced()?1:Math.min(1,(650-age)/140))}));}
  }
 }
 return {
  sync(state,knowledge){svg=root.querySelector('svg');if(!svg)return;layout={size:Number(svg.dataset.size),ox:Number(svg.dataset.ox),oy:Number(svg.dataset.oy)};
   const rows=fireRecords(state,knowledge),out=memory.update(rows.map(r=>r.id),state.turn,knowledge);memory.remember(rows);fires=out.fires;fireTurns=new Map(rows.filter(r=>r.turnsLeft!==undefined).map(r=>[r.id,r.turnsLeft]));scorches=[...new Set([...out.scorches,...fireReadout(state).scorches])].filter(id=>knowledge[id]&&knowledge[id]!=='UNEXPLORED');
   const live=new Set(fires);for(const id of ignitions.keys())if(!live.has(id))ignitions.delete(id);
   last=-Infinity;if(!frame)paint();
  },
  prepareTactic(before,after,c,done){
   prepared=tacticTiles(before,after,c);for(const id of prepared.fresh)held.add(id);
   const a=prepared.from&&root.querySelector(`.w-hits [data-tile="${prepared.from}"]`)?.getBoundingClientRect(),b=prepared.to&&root.querySelector(`.w-hits [data-tile="${prepared.to}"]`)?.getBoundingClientRect(),r=viewport.getBoundingClientRect();
   const visible=n=>n&&n.left>=r.left+50&&n.right<=r.right-50&&n.top>=r.top+70&&n.bottom<=r.bottom-160;
   const x=a&&b?(a.left+a.right+b.left+b.right)/4:(b?.left??r.left+r.width/2),y=a&&b?(a.top+a.bottom+b.top+b.bottom)/4:(b?.top??r.top+r.height/2);
   cameraFx?.begin({alreadyVisible:!!visible(a)&&!!visible(b),pan:{x:x-r.left-r.width/2,y:y-r.top-r.height*.5},anchor:{x:r.width/2,y:r.height/2}},done);
   if(!cameraFx)done();
  },
  impactTactic(before,after,c){const info=prepared??tacticTiles(before,after,c),big=info.targets.length>1||(c.enemyLoss??0)>=100;
   // Start on the first paint after world.js rebuilds the map. A slow render must
   // not consume the entire 540ms ignition/650ms shockwave before it is visible.
   for(const [i,id] of info.igniting.entries()){held.delete(id);ignitions.set(id,{start:null,delay:reduced()?0:i*120});}
   for(const tile of info.targets)impacts.push({tile,start:null,big});
   sfx()?.play?.('tactic');if(c.fire||info.igniting.length)sfx()?.play?.('fire-ignite');
   const frames=shakeFrames({reduced:reduced(),big});if(frames.length)root.animate?.(frames,{duration:big?220:120,easing:'ease-out'});
   prepared=null;last=-Infinity;
  },
  // Restore before world.js selects/follows the next unit; two concurrent camera
  // tweens would otherwise fight over scroll/zoom at the handoff.
  finishCamera(){cameraFx?.reset();},
  reset(){memory.clear();ignitions.clear();held.clear();prepared=null;fires=[];scorches=[];impacts=[];cameraFx?.reset();clearLayers();loop(false);},
  dispose(){stopped=true;cancel(frame);cameraFx?.reset();loop(false);clearLayers();doc.removeEventListener?.('visibilitychange',onVisibility);},
  get stats(){return {fires:fires.length,scorches:scorches.length,impacts:impacts.length,burnLoop};},
 };
}
// Draw under the horses with the troop renderer's existing motion and matrix.
let dustImage=null;
export function drawChargeDust(ctx,s,{reduced=false,width=70,active=false}={}){
 if(s.kind!=='cavalry'||(!(reduced&&active)&&!s.moving&&!(s.progress>0&&s.progress<.95)))return false;
 if(!dustImage){dustImage=new Image();dustImage.src=FX_ROOT+FX_SHEETS.dust.path;}
 if(!dustImage.complete||!dustImage.naturalWidth)return false;
 const frame=spriteFrame(s.progress<0?performance.now():s.progress*540,4,{loop:s.moving,reduced});
 ctx.save();ctx.translate(s.pos.x,s.pos.y+14);ctx.rotate(s.angle);ctx.globalAlpha=.75;
 ctx.drawImage(dustImage,frame*384,0,384,128,-width,-width/6,width,width/3);ctx.restore();return true;
}
