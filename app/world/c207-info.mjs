import glossary from '../../data/glossary-v0.1.json' with {type:'json'};
import situations from '../../data/situation-lines-v0.1.json' with {type:'json'};
import {previewAttackThreat} from '../../src/campaign-combat.mjs';
import {campaignMovementWorld} from '../../src/campaign-city-footprint.mjs';
import {supplyLink,supplyEnabled} from '../../src/campaign-supply.mjs';
import {visibleControlZones} from '../../src/campaign-orders.mjs';
import {boardNeighbors,tileId} from '../../src/map-primitives.mjs';
import {edgeTicks} from '../../src/movement.mjs';
import {C12} from '../../src/campaign-abilities.mjs';
import {C182} from '../../src/campaign-rule-registry.mjs';
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
export const GLOSSARY=glossary;
export const SITUATIONS=situations;
export const TILE_HOVER_MS=400;
const terrainNames={plain:'평지',forest:'숲',hill:'언덕',mountain:'산',water:'물'};
// Query the combat formula itself: terrain defense has no exported rule table.
// A private, own-officer probe avoids reading any foreign army or changing RNG.
export function terrainDefense(s,terrain){
 const o=Object.values(s.officers).find(o=>o.allegianceFactionId===s.playerFactionId);if(!o)return null;
 const other=Object.keys(s.factions).find(f=>f!==s.playerFactionId),make=(id,factionId,at)=>({armyId:id,commanderId:o.officerId,factionId,tileId:at,troopType:'militia',troopCount:100,maxTroopCount:100,morale:'STEADY',formation:'ORDERED',facing:0,movedTiles:0,effectStates:[]});
 const a=make('C207-A',s.playerFactionId,'0,0'),b=make('C207-B',other,'1,0');
 const probe={...s,armies:{[a.armyId]:a,[b.armyId]:b},cities:{},relations:{},c43Disabled:true,c31Disabled:true,c31:null,campaignTerminalWorld:null,tiles:{'0,0':{tileId:'0,0',q:0,r:0,terrainType:'plain'},'1,0':{tileId:'1,0',q:1,r:0,terrainType:terrain}},mapRules:{...s.mapRules,roads:[],riverEdges:[],blockedEdges:[],crossings:{}}};
 return previewAttackThreat(probe,a.armyId,b.armyId).multipliers.terrain;
}
// Only visible foreign entities enter supply routing and control-zone queries.
export function publicTileState(s,v){
 const armies=Object.fromEntries(Object.entries(s.armies).filter(([id,a])=>a.factionId===v.factionId||v.knowledge.tiles[a.tileId]==='VISIBLE'&&v.knowledge.observedArmies[id]));
 const cities=Object.fromEntries(Object.entries(s.cities).filter(([id,c])=>c.ownerFactionId===v.factionId||v.knowledge.tiles[c.tileId]==='VISIBLE'&&v.knowledge.cities[id]));
 const tiles=Object.fromEntries(Object.entries(v.tiles).filter(([,t])=>t.terrainType));
 return {...s,tiles,armies,cities,supply:s.supply?{...s.supply,hubs:(s.supply.hubs??[]).filter(h=>h.factionId===v.factionId||v.knowledge.tiles[h.tileId]==='VISIBLE')}:undefined};
}
export function tileReadout(s,v,id,selected=null){
 const known=v.knowledge.tiles[id],t=v.tiles[id];if(!t)return null;
 const units=Object.values({...v.knowledge.observedArmies,...v.ownArmies}).filter(a=>a.factionId===v.factionId||v.knowledge.tiles[a.tileId]==='VISIBLE');
 const cities=Object.values({...v.knowledge.cities,...v.ownCities});
 if(units.some(a=>a.tileId===id)||cities.some(c=>[c.tileId,...(c.footprint?.gates??[]),...(c.footprint?.walls??[])].includes(id)))return null;
 // Unexplored tiles expose no dynamic state or guessed numerical information.
 if(!known||known==='UNEXPLORED')return {title:'아직 살펴보지 않은 칸',lines:['시야 · 가림'],tileId:id};
 const p=publicTileState(s,v);let a=p.armies[selected]??Object.values(p.armies).find(a=>a.factionId===v.factionId);const terrain=t.terrainType;
 const standard=!a;
 if(!a){const o=Object.values(v.officers).find(o=>o.allegianceFactionId===v.factionId);if(o){a={armyId:'C207-MOVE',commanderId:o.officerId,factionId:v.factionId,tileId:id,troopType:'militia',troopCount:100,morale:'STEADY',formation:'ORDERED',effectStates:[]};p.armies={...p.armies,[a.armyId]:a};}}
 const lines=[`방어 ×${terrainDefense(s,terrain)}`,`시야 · ${known==='VISIBLE'?'보임':'가림 · 기억한 지형'}`];
 if(a){
  const world=campaignMovementWorld(p,a.armyId),costs=boardNeighbors(t,v.tiles).filter(n=>v.knowledge.tiles[tileId(n)]&&v.knowledge.tiles[tileId(n)]!=='UNEXPLORED').map(n=>edgeTicks(world,world.armies[a.armyId],tileId(n),id)).filter(n=>n!==null);
  lines.push(costs.length?`이동 비용 ${Math.min(...costs)}${Math.max(...costs)!==Math.min(...costs)?`~${Math.max(...costs)}`:''}틱 · ${standard?'보병':selected?'선택 부대':'아군 첫 부대'} 기준`:'이동 · 통과 불가');
  if(supplyEnabled(p)){const link=supplyLink(p,a,id);lines.push(`보급권 ${link.state==='SAFE'?'안':'밖'} · 관측한 길 기준`);}
  if(visibleControlZones(p,a.armyId).includes(id))lines.push('통제 구역 · 관측한 적');
 }else lines.push('이동 비용 · 부대를 고르면 표시','보급권 · 부대를 고르면 표시');
 if(Object.entries(s.mapRules.crossings??{}).some(([edge,kind])=>kind==='ford'&&edge.split('|').includes(id)))lines.push('여울 · 건널목');
 const fire=known==='VISIBLE'&&v.fire?.tiles?.find(f=>f.tileId===id);if(fire)lines.push(`불 · ${fire.turnsLeft}차례 남음`);
 if(v.fire?.burnedForest?.includes(id))lines.push('불탄 숲');
 return {title:terrainNames[terrain]??'지형 미확인',lines,tileId:id};
}
export function tileHtml(info){return `<b>${esc(info.title)}</b>${info.lines.map(l=>`<p>${esc(l)}</p>`).join('')}`;}
const tokens={side:()=>Math.round(C12.side*100),rear:()=>Math.round(C12.rear*100),disordered:()=>Math.round(C12.disordered*100),broken:()=>Math.round(C12.broken*100),fireTurns:()=>C182.fire.turns,fireDamage:()=>C182.fire.damageRatio*100};
export const glossaryText=s=>String(s).replace(/\{(\w+)\}/g,(_,key)=>String(tokens[key]?.()??''));
export function glossaryHtml(entry){return `<b>${esc(entry.term)}</b>${entry.lines.map((line,i)=>`<p><small>${['무엇','효과','푸는 법'][i]}</small> ${esc(glossaryText(line))}</p>`).join('')}`;}
export function rulesGlossaryHtml(){return glossary.entries.map(e=>`<dt>${esc(e.term)}</dt><dd>${e.lines.map(glossaryText).map(esc).join(' · ')}</dd>`).join('');}
// Text-node replacement never touches attributes, forms, SVG or existing links.
export function decorateTerms(root,entries=glossary.entries){
 const doc=root.ownerDocument,byTerm=new Map(entries.flatMap(e=>[e.term,...(e.aliases??[])].map(t=>[t,e.term]))),words=[...byTerm.keys()].sort((a,b)=>b.length-a.length);
 const re=new RegExp(words.map(w=>w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'g'),walker=doc.createTreeWalker(root,4),nodes=[];
 while(walker.nextNode()){const n=walker.currentNode;if(n.parentElement?.closest('script,style,textarea,input,svg,a,[contenteditable],.c207-term,[data-no-glossary]'))continue;if(re.test(n.textContent))nodes.push(n);re.lastIndex=0;}
 for(const n of nodes){const fragment=doc.createDocumentFragment();let at=0;for(const m of n.textContent.matchAll(re)){fragment.append(doc.createTextNode(n.textContent.slice(at,m.index)));const span=doc.createElement('span');span.className='c207-term';span.dataset.term=byTerm.get(m[0]);span.tabIndex=0;span.textContent=m[0];span.setAttribute('aria-haspopup','true');fragment.append(span);at=m.index+m[0].length;}fragment.append(doc.createTextNode(n.textContent.slice(at)));n.replaceWith(fragment);}
}
export function mountGlossary(doc=globalThis.document){
 const tips=[0,1].map(depth=>{const el=doc.createElement('aside');el.className='c207-glossary';el.dataset.depth=String(depth);el.setAttribute('role','tooltip');el.hidden=true;doc.body.append(el);return el;}),closeTimers=[];
 function hide(depth=0){for(let i=depth;i<2;i++){clearTimeout(closeTimers[i]);tips[i].hidden=true;}}
 function position(el,anchor){const r=anchor.getBoundingClientRect(),b=el.getBoundingClientRect();let left=r.right+8,top=r.top;if(left+b.width>innerWidth-12)left=r.left-b.width-8;el.style.left=`${Math.max(8,Math.min(left,innerWidth-b.width-8))}px`;el.style.top=`${Math.max(8,Math.min(top,innerHeight-b.height-8))}px`;}
 function show(term){const parent=term.closest('.c207-glossary'),depth=parent?Number(parent.dataset.depth)+1:0;if(depth>1)return;const entry=glossary.entries.find(e=>e.term===term.dataset.term);if(!entry)return;hide(depth);if(depth)clearTimeout(closeTimers[0]);const tip=tips[depth];tip.innerHTML=glossaryHtml(entry);decorateTerms(tip,glossary.entries.filter(e=>e.term!==entry.term));tip.hidden=false;position(tip,parent??term);}
 doc.addEventListener('pointerover',e=>{const term=e.target.closest?.('.c207-term');if(term&&!term.contains(e.relatedTarget))show(term);const tip=e.target.closest?.('.c207-glossary');if(tip)for(let i=0;i<=Number(tip.dataset.depth);i++)clearTimeout(closeTimers[i]);});
 doc.addEventListener('pointerout',e=>{const tip=e.target.closest?.('.c207-glossary'),term=e.target.closest?.('.c207-term');if(!tip&&!term)return;const depth=tip?Number(tip.dataset.depth):0;closeTimers[depth]=setTimeout(()=>hide(depth),350);});
 doc.addEventListener('focusin',e=>{if(e.target.matches?.('.c207-term'))show(e.target);});
 doc.addEventListener('focusout',e=>{if(!e.target.matches?.('.c207-term'))return;if(e.relatedTarget?.closest?.('.c207-glossary'))return;closeTimers[0]=setTimeout(()=>hide(),350);});
 doc.addEventListener('keydown',e=>{if(e.key==='Escape')hide();});
 globalThis.addEventListener?.('resize',()=>hide());
 let queued=false;const refresh=()=>{if(queued)return;queued=true;queueMicrotask(()=>{observer.disconnect();decorateTerms(doc.body);observer.observe(doc.body,{childList:true,subtree:true,characterData:true});queued=false;});};
 const observer=new MutationObserver(records=>{if(records.some(r=>!r.target.parentElement?.closest('.c207-glossary')))refresh();});
 decorateTerms(doc.body);observer.observe(doc.body,{childList:true,subtree:true,characterData:true});
 return {hide};
}
export function situationEvents(before,after){
 if(!before||before.factionId!==after.factionId)return [];
 const events=[],mine=v=>Object.keys(v.ownCities??{}),old=mine(before),now=mine(after);
 if(now.some(id=>!old.includes(id)))events.push('FIRST_CAPTURE');
 if(old.some(id=>!now.includes(id)))events.push('FIRST_CITY_LOST');
 if(old.length>1&&now.length===1)events.push('LAST_CITY');
 // A vanished unit may have garrisoned. Require an explicit total-loss result.
 if((after.combatFeedback??[]).some(e=>e.turn===after.turn&&(e.targetLosses??[]).some(r=>before.ownArmies?.[r.targetId]&&r.loss>=before.ownArmies[r.targetId].troopCount&&(!after.ownArmies?.[r.targetId]||after.ownArmies[r.targetId].troopCount===0))))events.push('ARMY_DESTROYED');
 if(before.c31&&!before.c31.resolved&&['CAPTURED','ELIMINATED','ROUTED'].includes(after.c31?.resolved))events.push('CRISIS_DEFEATED');
 const allies=v=>(v.diplomacy?.factions??[]).filter(f=>f.state==='ALLIANCE').map(f=>f.factionId);
 if(allies(after).some(id=>!allies(before).includes(id)))events.push('ALLIANCE_FORMED');
 return events;
}
// Session ledger only until the owner accepts the save contract listed in RESULT.
export function createSituationTracker(data=situations){
 let before=null,queue=[],active=null;const usedEvents=new Set(),usedLines=new Set();
 const advance=()=>{if(queue.length){active=queue.shift();usedEvents.add(active.event);usedLines.add(active.line);}return active;};
 return {update(v){
  if(active&&v.turn!==active.turn)active=null;queue=queue.filter(x=>x.turn===v.turn);
  for(const event of situationEvents(before,v)){if(usedEvents.has(event)||queue.some(x=>x.event===event))continue;const lines=data.lines[v.factionId]?.[event]??[],line=lines.find(l=>!usedLines.has(l)&&!queue.some(x=>x.line===l));if(line)queue.push({event,line,speakerId:data.speakers[v.factionId],turn:v.turn});}
  before=v;if(!active)advance();return active;
 },advance,get pending(){return queue.length;},get used(){return {events:[...usedEvents],lines:[...usedLines]};}};
}
