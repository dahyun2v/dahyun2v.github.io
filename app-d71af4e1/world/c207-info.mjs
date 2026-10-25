import glossary from '../../data/glossary-v0.1.json' with {type:'json'};
import situations from '../../data/situation-lines-v0.1.json' with {type:'json'};
import {previewAttackThreat} from '../../src/campaign-combat.mjs';
import {campaignMovementWorld} from '../../src/campaign-city-footprint.mjs';
import {supplyLink,supplyEnabled} from '../../src/campaign-supply.mjs';
import {visibleControlZones} from '../../src/campaign-orders.mjs';
import {boardNeighbors,tileId} from '../../src/map-primitives.mjs';
import {edgeTicks} from '../../src/movement.mjs';
import {C12} from '../../src/campaign-abilities.mjs';
import {TICKS_PER_TURN} from '../../src/first3.mjs';
import {parentTroop} from '../../src/campaign-special-troops.mjs';
import {troopToCampaign} from '../../src/campaign-adapters.mjs';
import {C182} from '../../src/campaign-rule-registry.mjs';
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const stratagemEntries=[{term:'계략',lines:['성에 있는 장수의 주 행동','보이는 범위 안의 적에게 실행','재사용 대기가 끝나면 다시 사용']},{term:'유언비어',lines:['적 성에 헛소문을 퍼뜨린다','식량·생산 산출 감소, 예비병 자동 충원 멈춤','표시된 차례가 지나면 끝남']},{term:'이간',lines:['적 부대 장수와 주군을 이간한다','사기 동요가 표시된 차례 동안 지속','이미 동요·패주인 부대는 그대로']},{term:'보급 교란',lines:['적 부대의 보급을 끊는다','휴대 군량 감소','안전한 보급권에서 보충']}];
const entries=[...glossary.entries,...stratagemEntries];
export const GLOSSARY=glossary;
export const STRATAGEM_GLOSSARY=stratagemEntries;
export const SITUATIONS=situations;
export const TILE_HOVER_MS=400;
const terrainNames={plain:'평지',forest:'숲',hill:'언덕',mountain:'산',water:'물'};
// Query the combat formula itself: terrain defense has no exported rule table.
// A private, own-officer probe avoids reading any foreign army or changing RNG.
function terrainMultipliers(s,terrain,river=false){
 const o=Object.values(s.officers).find(o=>o.allegianceFactionId===s.playerFactionId);if(!o)return null;
 const other=Object.keys(s.factions).find(f=>f!==s.playerFactionId),make=(id,factionId,at)=>({armyId:id,commanderId:o.officerId,factionId,tileId:at,troopType:'militia',troopCount:100,maxTroopCount:100,morale:'STEADY',formation:'ORDERED',facing:0,movedTiles:0,effectStates:[]});
 const a=make('C207-A',s.playerFactionId,'0,0'),b=make('C207-B',other,'1,0');
 const probe={...s,armies:{[a.armyId]:a,[b.armyId]:b},cities:{},relations:{},c43Disabled:true,c31Disabled:true,c31:null,campaignTerminalWorld:null,tiles:{'0,0':{tileId:'0,0',q:0,r:0,terrainType:'plain'},'1,0':{tileId:'1,0',q:1,r:0,terrainType:terrain}},mapRules:{...s.mapRules,roads:[],riverEdges:river?['0,0|1,0']:[],blockedEdges:[],crossings:{}}};
 return previewAttackThreat(probe,a.armyId,b.armyId).multipliers;
}
export const terrainDefense=(s,terrain)=>terrainMultipliers(s,terrain)?.terrain??null;
// UI-only comparison: ask the combat query on a private own-officer probe.
// No foreign officer, live army, RNG, or campaign object is changed.
export function troopMatchupBrief(s,officerId){
 const officer=s.officers[officerId];if(!officer)return '';
 const type=parentTroop(officer.troopType),names={militia:'도',spear:'창',bow:'궁',cavalry:'기'};
 if(!names[type])return '';
 const other=Object.keys(s.factions).find(f=>f!==s.playerFactionId);
 const army=(id,factionId,at,troopType)=>({armyId:id,commanderId:officerId,factionId,tileId:at,troopType,troopCount:100,maxTroopCount:100,morale:'STEADY',formation:'ORDERED',facing:id==='C270-A'?0:3,movedTiles:0,effectStates:[]});
 const values=Object.keys(names).filter(t=>t!==type).map(t=>{
  const a=army('C270-A',s.playerFactionId,'0,0',type),b=army('C270-B',other,'1,0',t);
  const probe={...s,armies:{[a.armyId]:a,[b.armyId]:b},cities:{},relations:{},c43Disabled:true,c31Disabled:true,c31:null,campaignTerminalWorld:null,tiles:{'0,0':{tileId:'0,0',q:0,r:0,terrainType:'plain'},'1,0':{tileId:'1,0',q:1,r:0,terrainType:'plain'}},mapRules:{...s.mapRules,roads:[],riverEdges:[],blockedEdges:[],crossings:{}}};
  return {name:names[t],value:previewAttackThreat(probe,a.armyId,b.armyId).multipliers.matchup};
 }).filter(x=>Number.isFinite(x.value)&&x.value!==1).sort((a,b)=>b.value-a.value);
 return `${names[type]} · 정면 상성 ${values.map(x=>`${x.name}에 ×${x.value}`).join(' / ')||'보정 없음'}`;
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
 const lines=[`방어 ×${terrainDefense(s,terrain)}`];
 const picked=v.ownArmies?.[selected],kind=picked&&troopToCampaign(parentTroop(picked.troopType)),factor=C182.terrainAttack[kind]?.[terrain];
 const edge=picked&&[picked.tileId,id].sort().join('|');
 if(edge&&s.mapRules.riverEdges.includes(edge)&&s.mapRules.crossings?.[edge]!=='bridge')lines[0]+=` · 강 건너 공격 ×${terrainMultipliers(s,terrain,true)?.river}`;
 if(factor)lines[0]+=` · ${kind==='BT04'?'기병':'궁병'} 공격 ×${factor}`;

 if(a){
  const world=campaignMovementWorld(p,a.armyId),costs=boardNeighbors(t,v.tiles).filter(n=>v.knowledge.tiles[tileId(n)]&&v.knowledge.tiles[tileId(n)]!=='UNEXPLORED').map(n=>edgeTicks(world,world.armies[a.armyId],tileId(n),id)).filter(n=>n!==null);
  lines.unshift(costs.length?`이동 비용 ${Math.ceil(Math.min(...costs)/TICKS_PER_TURN)}차례 · 1칸${v.weather?.active?.kind==='RAIN'&&terrain==='plain'?' (장마 +1)':''}`:'이동 · 통과 불가');
  if(supplyEnabled(p)){const link=supplyLink(p,a,id);lines.push(`보급권 ${link.state==='SAFE'?'안':'밖'} · 관측한 길 기준`);}
  if(visibleControlZones(p,a.armyId).includes(id))lines.push('통제 구역 · 관측한 적');
 }else lines.push('이동 비용 · 부대를 고르면 표시','보급권 · 부대를 고르면 표시');
 if(Object.entries(s.mapRules.crossings??{}).some(([edge,kind])=>kind==='ford'&&edge.split('|').includes(id)))lines.push(v.weather?.active?.kind==='RAIN'?'장마 · 여울 막힘':'여울 · 건널목');
 const fire=known==='VISIBLE'&&v.fire?.tiles?.find(f=>f.tileId===id);if(fire)lines.push(`불 · ${fire.turnsLeft}차례 남음`);
 if(v.fire?.burnedForest?.includes(id))lines.push('불탄 숲');
 for(const x of Object.values({...v.ownCities,...v.knowledge.cities,...v.ownArmies,...v.knowledge.observedArmies}))if(x.tileId===id&&x.stratagemText)lines.push(x.stratagemText);
 lines.push(`시야 · ${known==='VISIBLE'?'보임':'가림 · 기억한 지형'}`);
 const influence=Object.values(v.ownCities).flatMap(c=>c.influence?.tiles??[]).find(t=>t.tileId===id);
 if(influence)lines.push([influence.yield.food?`식량 +${influence.yield.food}`:'',influence.yield.production?`생산 +${influence.yield.production}`:''].filter(Boolean).join(' · '));
 const road=(v.knownEdges?.roads??s.mapRules.roads??[]).some(e=>e.split('|').includes(id));
 const river=(v.knownEdges?.riverEdges??s.mapRules.riverEdges??[]).some(e=>e.split('|').includes(id));
 return {title:[terrainNames[terrain]??'지형 미확인',road?'길':'',river?'강가':''].filter(Boolean).join(' · '),lines:lines.filter(Boolean).length>5?[...lines.filter(Boolean).slice(0,4),lines.filter(Boolean).slice(4).join(' · ')]:lines.filter(Boolean),tileId:id};
}
export function tileHtml(info){return `<b>${esc(info.title)}</b>${info.lines.map(l=>`<p>${esc(l)}</p>`).join('')}`;}
const tokens={side:()=>Math.round(C12.side*100),rear:()=>Math.round(C12.rear*100),disordered:()=>Math.round(C12.disordered*100),broken:()=>Math.round(C12.broken*100),fireTurns:()=>C182.fire.turns,fireDamage:()=>C182.fire.damageRatio*100};
export const glossaryText=s=>String(s).replace(/\{(\w+)\}/g,(_,key)=>String(tokens[key]?.()??'')).replace('전열 손상 완화','전열이 무너지는 것을 완화');
export function glossaryHtml(entry){return `<b>${esc(entry.term)}</b>${entry.lines.map((line,i)=>`<p><small>${['무엇','효과','푸는 법'][i]}</small> ${esc(glossaryText(line))}</p>`).join('')}`;}
export function rulesGlossaryHtml(){return entries.map(e=>`<dt>${esc(e.term)}</dt><dd>${e.lines.map(glossaryText).map(esc).join(' · ')}</dd>`).join('');}
// Text-node replacement never touches attributes, forms, SVG or existing links.
export function decorateTerms(root,entries=[...glossary.entries,...stratagemEntries]){
 const doc=root.ownerDocument,byTerm=new Map(entries.flatMap(e=>[e.term,...(e.aliases??[])].map(t=>[t,e.term]))),words=[...byTerm.keys()].sort((a,b)=>b.length-a.length);
 const re=new RegExp(words.map(w=>w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'g'),walker=doc.createTreeWalker(root,4),nodes=[];
 while(walker.nextNode()){const n=walker.currentNode;if(n.parentElement?.closest('script,style,textarea,input,select,option,svg,a,[contenteditable],.c207-term,[data-no-glossary]'))continue;if(re.test(n.textContent))nodes.push(n);re.lastIndex=0;}
 for(const n of nodes){const fragment=doc.createDocumentFragment();let at=0;for(const m of n.textContent.matchAll(re)){fragment.append(doc.createTextNode(n.textContent.slice(at,m.index)));const span=doc.createElement('span');span.className='c207-term';span.dataset.term=byTerm.get(m[0]);span.tabIndex=0;span.textContent=m[0];span.setAttribute('aria-haspopup','true');fragment.append(span);at=m.index+m[0].length;}fragment.append(doc.createTextNode(n.textContent.slice(at)));n.replaceWith(fragment);}
}
export function mountGlossary(doc=globalThis.document){
 // Terrain information shares the tooltip styling, but has no glossary depth.
 // Only our two glossary panels are parents in the nested-definition stack.
 const tips=[0,1].map(depth=>{const el=doc.createElement('aside');el.className='c207-glossary';el.dataset.depth=String(depth);el.setAttribute('role','tooltip');el.hidden=true;doc.body.append(el);return el;}),closeTimers=[];
 function hide(depth=0){for(let i=depth;i<2;i++){clearTimeout(closeTimers[i]);tips[i].hidden=true;}}
 function position(el,anchor){const r=anchor.getBoundingClientRect(),b=el.getBoundingClientRect();let left=r.right+8,top=r.top;if(left+b.width>innerWidth-12)left=r.left-b.width-8;el.style.left=`${Math.max(8,Math.min(left,innerWidth-b.width-8))}px`;el.style.top=`${Math.max(8,Math.min(top,innerHeight-b.height-8))}px`;}
 function show(term){const parent=term.closest('.c207-glossary[data-depth]'),depth=parent?Number(parent.dataset.depth)+1:0;if(depth>1)return;const entry=entries.find(e=>e.term===term.dataset.term);if(!entry)return;hide(depth);if(depth)clearTimeout(closeTimers[0]);const tip=tips[depth];tip.innerHTML=glossaryHtml(entry);decorateTerms(tip,glossary.entries.filter(e=>e.term!==entry.term));tip.hidden=false;position(tip,parent??term);}
 doc.addEventListener('pointerover',e=>{const term=e.target.closest?.('.c207-term');if(term&&!term.contains(e.relatedTarget))show(term);const tip=e.target.closest?.('.c207-glossary[data-depth]');if(tip)for(let i=0;i<=Number(tip.dataset.depth);i++)clearTimeout(closeTimers[i]);});
 doc.addEventListener('pointerout',e=>{const tip=e.target.closest?.('.c207-glossary[data-depth]'),term=e.target.closest?.('.c207-term');if(!tip&&!term)return;const depth=tip?Number(tip.dataset.depth):0;closeTimers[depth]=setTimeout(()=>hide(depth),350);});
 doc.addEventListener('focusin',e=>{if(e.target.matches?.('.c207-term'))show(e.target);});
 doc.addEventListener('focusout',e=>{if(!e.target.matches?.('.c207-term'))return;if(e.relatedTarget?.closest?.('.c207-glossary'))return;closeTimers[0]=setTimeout(()=>hide(),350);});
 doc.addEventListener('keydown',e=>{if(e.key==='Escape')hide();});
 globalThis.addEventListener?.('resize',()=>hide());
 let queued=false;const refresh=()=>{if(queued)return;queued=true;queueMicrotask(()=>{observer.disconnect();decorateTerms(doc.body);observer.observe(doc.body,{childList:true,subtree:true,characterData:true});queued=false;});};
 const observer=new MutationObserver(records=>{if(records.some(r=>!r.target.parentElement?.closest('.c207-glossary')))refresh();});
 decorateTerms(doc.body);observer.observe(doc.body,{childList:true,subtree:true,characterData:true});
 return {hide};
}
// Pending events and used IDs come only from the public engine ledger.
// Selecting is reversible; acknowledge only after the caller has displayed a line.
export function createSituationTracker(data=situations){
 let queue=[],active=null,factionId=null,turn=null,ledger={seenEvents:[],usedLineIds:[]};
 const advance=()=>{active=queue.shift()??null;return active;};
 return {update(v){
  if(factionId!==v.factionId){queue=[];active=null;}
  factionId=v.factionId;
  ledger=v.situationBarks??{seenEvents:[],usedLineIds:[]};
  const events=(v.situationEvents??[]).filter(e=>e.factionId===factionId&&!ledger.seenEvents.includes(e.id));
  if(active&&(turn!==v.turn||!active.displayed&&!events.some(e=>e.id===active.eventId)))active=null;
  turn=v.turn;queue=[];
  for(const e of events){
   if(active?.eventId===e.id||queue.some(x=>x.eventId===e.id))continue;
   const lines=data.lines[factionId]?.[e.type]??[];
   const index=lines.findIndex((_,i)=>{const id=`${factionId}:${e.type}:${i}`;return !ledger.usedLineIds.includes(id)&&active?.lineId!==id&&!queue.some(x=>x.lineId===id);});
   if(index>=0)queue.push({event:e.type,eventId:e.id,lineId:`${factionId}:${e.type}:${index}`,line:lines[index],speakerId:data.speakers[factionId],turn:v.turn,displayed:false});
  }
  if(!active)advance();return active;
 },displayed(send){
  if(!active||active.displayed)return;
  send({type:'MARK_SITUATION_LINE',eventId:active.eventId,lineId:active.lineId});
  active.displayed=true;
 },advance,get pending(){return queue.length;}};
}
