import {parentTroop} from './campaign-special-troops.mjs';
import learning from '../data/domestic-v3-learning-cards.json' with {type:'json'};
import aiRules from '../data/domestic-v3-ai-rules.json' with {type:'json'};
import {createRng} from './rng.mjs';
import trial from '../data/domestic-v3-trial.json' with {type:'json'};
import resources from '../data/domestic-v3-resources.json' with {type:'json'};
import {hexDistance} from './map-primitives.mjs';
import crises from '../data/domestic-v3-crises.json' with {type:'json'};
import weatherRules from '../data/run-modifiers-v0.1.json' with {type:'json'};

export const DOMESTIC_V3=trial;
export const domesticV3Enabled=s=>s.trialRules?.domesticV3===true;
export const DOMESTIC_RESOURCES=resources;
export const DOMESTIC_CRISES=crises;
const crisisRule=id=>crises.crises.find(c=>c.id===id);
const seedHash=text=>{let h=2166136261;for(const ch of text)h=Math.imul(h^ch.charCodeAt(0),16777619)>>>0;return h;};
// Separate campaign-seeded stream: crisis placement must not consume combat RNG.
export function initializeDomesticCrises(s){
 if(!domesticV3Enabled(s)||s.domesticCrises||!s.mapId||!cities(s).length)return;
 const rng=createRng(seedHash(`${s.campaignSeed}:domestic-crises:${s.previousCampaignSeed??''}`));
 const draw=()=>rng.next(),pick=rows=>rows[Math.floor(draw()*rows.length)];
 const pool=[...crises.crises],windows=crises.framework.windows.slice(0,draw()<.5?crises.framework.perRun.max:crises.framework.perRun.min);
 // At initial economy construction the runtime has not initialized weather yet.
 // Read its immutable schedule algorithm, without initializing or changing that state.
 const weather=s.runModifiers?.weather??(s.trialRules?.runModifiers===false?[]:weatherRules.weather.windows.map(([a,b],i)=>({startTurn:a+seedHash(`${s.campaignSeed}::weather-turn:${i}`)%(b-a+1)})));
 let hasGood=false;
 s.domesticCrises=windows.map(([a,b],i)=>{
  const drawn=pick(pool),def=i===windows.length-1&&!hasGood?pool.find(c=>c.good):drawn;hasGood||=def.good;pool.splice(pool.indexOf(def),1);let turn=a+Math.floor(draw()*(b-a+1));
  while(weather.some(w=>w.startTurn===turn))turn++;
  const season=['봄','여름','가을','겨울'][Math.floor((turn-1)/3)%4];
  const weights=cities(s).map(c=>{
   const tile=s.tiles[c.tileId],terrain=tile?v3Terrain(s,tile):'plain';
   const battles=(s.combatLog??[]).filter(x=>s.turn-x.turn<=3&&[x.tileId,x.cityId&&s.cities[x.cityId]?.tileId].some(id=>s.tiles[id]&&hexDistance(tile,s.tiles[id])<=6)).length;
   return {c,weight:(def.weightBy.terrain?.[terrain]??1)*(def.weightBy.season?.includes(season)?2:1)+(def.weightBy.recentBattles??0)*battles+(def.weightBy.besiegedRecently??0)*(c.besieged?1:0)+(def.weightBy.people?c.people/trial.taxPeople:0)};
  });
  let n=draw()*weights.reduce((n,x)=>n+x.weight,0);const center=(weights.find(x=>(n-=x.weight)<0)??weights.at(-1)).c;
  return {id:def.id,turn,area:{cityId:center.cityId,tileId:center.tileId,radius:6},strength:pick([.5,.5,1,1,1.5]),warned:false};
 });
}
export function crisisCities(s,x){return cities(s).filter(c=>s.tiles[c.tileId]&&s.tiles[x.area.tileId??s.cities[x.area.cityId]?.tileId]&&hexDistance(s.tiles[c.tileId],s.tiles[x.area.tileId??s.cities[x.area.cityId]?.tileId])<=(x.area.radius??6));}
const responseFor=(s,x,c)=>crisisRule(x.id).responses.find(r=>r.id===x.responses?.[c.ownerFactionId]?.choiceId);
const responseEffects=(s,x,c)=>responseFor(s,x,c)?.effects??[];
const crisisActive=(s,x)=>s.turn>=x.turn&&s.turn<x.turn+crisisRule(x.id).durationTurns;
const crisisAffected=(s,x,c)=>{const center=s.tiles[x.area.tileId??s.cities[x.area.cityId]?.tileId];return !!center&&!!s.tiles[c.tileId]&&hexDistance(center,s.tiles[c.tileId])<=(x.area.radius??6)||(x.spreadCityIds??[]).includes(c.cityId);};
export function crisisDamageFactor(s,c,x){
 const def=crisisRule(x.id);if(def.good)return 1;
 if(v3ResourceEffects(s,c,'CRISIS_IMMUNE').some(e=>!e.crisis||e.crisis.includes(def.kind)))return 0;
 let factor=1;
 const modifiers=[...v3ResourceEffects(s,c,'CRISIS_DAMAGE_MOD').filter(e=>!e.crisis||e.crisis.includes(def.kind)),...responseEffects(s,x,c).filter(e=>e.kind==='CRISIS_DAMAGE_MOD')];
 for(const e of modifiers)factor*=Math.max(0,1+e.value/100);
 const traits=crisisServices.modifiers?.(s,c)??{};
 factor*=Math.max(0,1+(traits.EVENT_DAMAGE_MOD??0)/100);
 if((c.domesticCharacters??[]).some(k=>['taicang','太倉','태창'].includes(k))&&['drought','locust'].includes(def.kind))factor*=.5;
 if((c.domesticCharacters??[]).some(k=>['herb','약초'].includes(k))&&def.kind==='plague')factor*=.5;
 return factor;
}
export function crisisEffects(s,c,kind){
 if(!domesticV3Enabled(s))return [];
 const result=[];
 for(const x of s.domesticCrises??[]){
  const def=crisisRule(x.id);if(!def||s.turn<x.turn)continue;
  const responses=responseEffects(s,x,c),effects=[...def.effects,...responses].filter(e=>e.kind===kind&&s.turn<x.turn+(e.after?def.durationTurns:0)+(e.turns??def.durationTurns));
  if(!effects.length||!crisisAffected(s,x,c))continue;
  const factor=crisisDamageFactor(s,c,x);
  for(const e of effects){
   if(e.kind!==kind||responses.some(r=>r.kind==='CANCEL'&&r.value===e.kind)||!def.good&&factor===0)continue;
   const start=x.turn+(e.after?def.durationTurns:0),duration=e.turns??def.durationTurns;
   if(s.turn<start||s.turn>=start+duration)continue;
   result.push({...e,crisisId:x.id,strength:x.strength,damageFactor:factor,...(typeof e.value==='number'?{value:e.kind.endsWith('_MULT')?1+(e.value-1)*(e.scaleByStrength?x.strength:1)*(e.value<1?factor:1):e.value*(e.scaleByStrength?x.strength:1)*factor}:{})});
  }
  // Booleans above use their declared duration just like numeric effects.
 }
 return result;
}
export const crisisFactor=(s,c,kind)=>crisisEffects(s,c,kind).reduce((n,e)=>n*e.value,1);
export const crisisGrainPrice=s=>!domesticV3Enabled(s)?1:(s.domesticCrises??[]).filter(x=>crisisActive(s,x)).flatMap(x=>crisisRule(x.id).effects.filter(e=>e.kind==='GRAIN_BUY_PRICE_MULT')).reduce((n,e)=>n*e.value,1);
function crisisBuyCap(s,id){return (s.domesticCrises??[]).some(x=>s.turn<x.turn&&s.turn>=x.turn-crises.framework.warnTurns&&x.responses?.[id]?.choiceId==='stockpile')?2:1;}
export function grainTurns(s,id){
 const own=cities(s).filter(c=>c.ownerFactionId===id),income=own.reduce((n,c)=>n+(crisisServices.income?.(s,c)??domesticV3Base(s,c).food),0);
 const need=own.reduce((n,c)=>n+domesticV3FoodNeed(s,c),0)+Object.values(s.armies??{}).filter(a=>a.factionId===id&&fieldActive(s,a)).reduce((n,a)=>n+a.troopCount*trial.foodPerTroop,0);
 return need>income?(s.factions[id]?.granary??0)/(need-income):Infinity;
}
export function crisisView(s){
 if(!domesticV3Enabled(s))return [];
 const beacon=cities(s).some(c=>(c.domesticCharacters??[]).some(k=>['beacon','봉수대'].includes(k)));
 return (s.domesticCrises??[]).filter(x=>s.turn>=x.turn-crises.framework.warnTurns-(beacon?1:0)&&s.turn<x.turn+crisisRule(x.id).durationTurns).map(x=>{
  const def=crisisRule(x.id);return {...structuredClone(x),name:def.name,text:def.text.replaceAll('{area}',s.cities[x.area.cityId]?.name??x.area.cityId),durationTurns:def.durationTurns,choices:structuredClone(def.responses)};
 });
}
export function chooseCrisisResponse(s,factionId,crisisId,choiceId){
 const x=s.domesticCrises?.find(x=>x.id===crisisId),def=crisisRule(crisisId),choice=def?.responses.find(r=>r.id===choiceId);
 if(!domesticV3Enabled(s)||!s.factions[factionId]||!x||!choice||!crisisView(s).some(v=>v.id===crisisId)||s.turn>x.turn||x.responses?.[factionId])throw new Error('INVALID_CRISIS_RESPONSE');
 const own=crisisCities(s,x).filter(c=>c.ownerFactionId===factionId),f=s.factions[factionId],cost=own.reduce((n,c)=>n+(choice.costValue?.perCity??0)+(choice.costValue?.perPeople10k??0)*c.people/trial.taxPeople,0);
 if(choice.cost==='금'&&f.treasury<cost||choice.cost==='곡식'&&f.granary<cost)throw new Error('CRISIS_RESPONSE_COST');
 if(choice.cost==='금')f.treasury-=cost;if(choice.cost==='곡식')f.granary-=cost;
 if(choice.cost==='생산'&&cost)for(const c of own){const spent=choice.costValue.perCity??0,paid=Math.min(c.productionProgress??0,spent);c.productionProgress=(c.productionProgress??0)-paid;c.crisisProductionDebt=(c.crisisProductionDebt??0)+spent-paid;if(c.currentProduction)c.jobProgress[c.currentProduction.key??c.currentProduction.kind]=c.productionProgress;}
 (x.responses??={})[factionId]={choiceId,turn:s.turn};
 return s;
}
function crisisAiChoice(s,id,x){
 const own=crisisCities(s,x).filter(c=>c.ownerFactionId===id),front=own.some(c=>c.besieged||Object.values(s.armies??{}).some(a=>a.factionId!==id&&fieldActive(s,a)&&hexDistance(s.tiles[a.tileId],s.tiles[c.tileId])<=6));
 switch(crisisRule(x.id).kind){
  case 'drought':return grainTurns(s,id)>5?'relief':s.factions[id].treasury>=3000?'stockpile':'none';
  case 'locust':return own.length>=2?'burn':'none';
  case 'plague':return front?'physicians':'quarantine';
  case 'flood':return front?'dike':'none';
  case 'harvest':return Object.values(s.armies??{}).some(a=>a.factionId===id&&fieldActive(s,a))?'store':'grow';
 }
}
const defaultResponse=def=>def.responses.find(c=>c.id==='none'||c.id==='store').id;
export function startDomesticCrises(s,{autoPlayer=false}={}){
 if(!domesticV3Enabled(s))return s;initializeDomesticCrises(s);
 for(const notice of crisisView(s)){
  const x=s.domesticCrises.find(x=>x.id===notice.id),def=crisisRule(x.id);
  if(!x.warned){x.warned=true;crisisLog(s,x,'WARNING');}
  for(const id of Object.keys(s.factions).sort()){
   if(x.responses?.[id]||id===s.playerFactionId&&!autoPlayer&&s.turn<x.turn)continue;
   if(s.turn>x.turn){(x.responses??={})[id]={choiceId:defaultResponse(def),turn:s.turn};continue;}
   const choice=id===s.playerFactionId&&!autoPlayer?defaultResponse(def):crisisAiChoice(s,id,x);
   try{chooseCrisisResponse(s,id,x.id,choice);}catch(e){if(e.message!=='CRISIS_RESPONSE_COST')throw e;chooseCrisisResponse(s,id,x.id,defaultResponse(def));}
  }
 }
 return s;
}
function crisisLog(s,x,phase){(s.administrationLog??=[]).push({turn:s.turn,type:`DOMESTIC_CRISIS_${phase}`,crisisId:x.id,text:`${crisisRule(x.id).name} · ${phase==='WARNING'?'예고':phase==='START'?'시작':'끝'}`});}
export function settleDomesticCrises(s){
 if(!domesticV3Enabled(s)||s.domesticCrisesSettledTurn===s.turn)return;
 startDomesticCrises(s,{autoPlayer:!!s.autoPlayer});s.domesticCrisesSettledTurn=s.turn;
 for(const x of s.domesticCrises??[]){
  const def=crisisRule(x.id);
  if(s.turn>=x.turn&&!x.started){x.started=true;crisisLog(s,x,'START');}
  if(s.turn>=x.turn+def.durationTurns&&!x.ended){x.ended=true;crisisLog(s,x,'END');
   for(const [id,r] of Object.entries(x.responses??{}))if(!['none','store'].includes(r.choiceId)&&crisisCities(s,x).some(c=>c.ownerFactionId===id)){
    const f=s.factions[id],e=learning.eureka.find(e=>e.id==='EU-CRISIS-READY');if(e&&!f.eurekaDone.includes(e.id)){f.science=(f.science??0)+e.science;f.eurekaDone.push(e.id);}
   }
  }
  if(!crisisActive(s,x))continue;
  // A single deterministic spread roll, never a fresh roll on loading or preview.
  if(def.spread&&!x.spreadChecked){x.spreadChecked=true;x.spreadCityIds=[];const inside=crisisCities(s,x);
   for(const c of inside){if(responseEffects(s,x,c).some(e=>e.kind==='SPREAD_BLOCK')||(c.domesticCharacters??[]).some(k=>['yaopu','약포'].includes(k))||crisisDamageFactor(s,c,x)===0)continue;
    const target=cities(s).filter(t=>!inside.includes(t)&&hexDistance(s.tiles[c.tileId],s.tiles[t.tileId])<=12&&(def.kind!=='plague'||crisisServices.route?.(s,c,t))).sort((a,b)=>hexDistance(s.tiles[c.tileId],s.tiles[a.tileId])-hexDistance(s.tiles[c.tileId],s.tiles[b.tileId]))[0];
    if(target&&seedHash(`${s.campaignSeed}:${x.id}:${c.cityId}:spread`)/4294967296<def.spread.chance){x.spreadCityIds.push(target.cityId);break;}
   }
  }
 }
 for(const c of cities(s).filter(c=>c.ownerFactionId)){
  for(const e of crisisEffects(s,c,'AREA_PEOPLE_LOSS_PER_TURN'))c.people=Math.max(0,c.people-Math.floor(c.people*e.value));syncPeople(c);
  for(const e of crisisEffects(s,c,'AREA_SECURITY_CAUSE')){const x=s.domesticCrises.find(x=>x.id===e.crisisId);if(!responseEffects(s,x,c).some(r=>r.kind==='REMOVE_SECURITY_CAUSE'&&r.value===e.value))(c.securityCauseEvents??=[]).push({label:e.value});}
 }
}
let crisisServices={};
export function configureDomesticCrises(services){crisisServices=services;}
export function emergencyOrder(s,cityId,orderId){
 if(!domesticV3Enabled(s))throw new Error('DOMESTIC_V3_DISABLED');const c=s.cities[cityId],order=crises.emergency.orders.find(o=>o.id===orderId);
 if(!c?.ownerFactionId||!order)throw new Error('INVALID_EMERGENCY_ORDER');
 if(orderId==='EM-DRAFT')return crisisServices.draft(s,c,c.ownerFactionId);
 if(orderId==='EM-TAXFREE')return exemptTax(s,cityId);
 if((c.emergencyReserveTurn??-100)+order.cooldownTurns>s.turn)throw new Error('EMERGENCY_COOLDOWN');
 for(const e of order.effects){if(e.kind==='GRANT_GRAIN_FROM_CITY')s.factions[c.ownerFactionId].granary+=Math.floor(c.people/trial.taxPeople*e.perPeople10k);if(e.kind==='SECURITY_STEP')c.securityLevel=Math.min(2,(c.securityLevel??0)+e.value);if(e.kind==='CITY_GROWTH_STOP')c.growthStopUntil=s.turn+e.turns-1;}
 c.emergencyReserveTurn=s.turn;return s;
}
const resourceById=new Map(resources.list.map(r=>[r.id,r]));
export function initializeV3Resources(s){
 if(!domesticV3Enabled(s)||s.domesticResources)return;
 s.domesticResources={};if(!s.rng||!s.mapId)return; // Placement belongs to campaign maps, not standalone rule states.
 const rng=createRng();rng.restore(s.rng.value);
 const draw=()=>{const n=rng.next();s.rng.value=rng.state();s.rng.draws++;return n;};
 const pick=(pool,weight)=>{let n=draw()*pool.reduce((sum,x)=>sum+weight(x),0);return pool.find(x=>(n-=weight(x))<0)??pool.at(-1);};
 const forbidden=new Set(cities(s).flatMap(c=>castleTiles(c)));
 const tiles=Object.values(s.tiles).sort((a,b)=>a.tileId.localeCompare(b.tileId,'en'));
 for(const c of cities(s)){
  if(draw()>=resources.rules.randomPerCity)continue;
  const near=tiles.filter(t=>!forbidden.has(t.tileId)&&!s.domesticResources[t.tileId]&&hexDistance(s.tiles[c.tileId],t)>=trial.territory.resourceDistance[0]&&hexDistance(s.tiles[c.tileId],t)<=trial.territory.resourceDistance[1]); // 10-25 TUNING #5: 2~4 → 2~3
  // This eight-city map has no historical fixed sites, including iron and horses.
  const pool=resources.list.filter(r=>(r.random||['iron_mine','horse_range'].includes(r.id))&&near.some(t=>r.terrain.includes(v3Terrain(s,t))));
  if(!pool.length)continue;
  const classes=[...new Set(pool.map(r=>r.class))],category=pick(classes,k=>resources.rules.randomClassWeight[k]);
  const r=pick(pool.filter(r=>r.class===category),r=>r.randomWeight??1),tile=pick(near.filter(t=>r.terrain.includes(v3Terrain(s,t))),()=>1);
  const quality=pick(Object.keys(resources.rules.quality).filter(k=>typeof resources.rules.quality[k]==='object'),k=>resources.rules.quality[k].weight);
  s.domesticResources[tile.tileId]={id:r.id,quality};
 }
}
function resourceEntry(s,c,tileId){
 const placed=s.domesticResources?.[tileId],r=resourceById.get(placed?.id);if(!r)return null;
 const improved=!!r.improved&&(c.facilities??[]).some(f=>f.tileId===tileId&&f.kind===r.improved.by&&!f.damaged&&!f.disabled);
 const mult=resources.rules.quality[placed.quality]?.mult??1;
 return {tileId,id:r.id,name:r.name,class:r.class,quality:placed.quality,improved,blocked:blocked(s,c,tileId),text:improved?r.improved.text:r.text,
  effects:(improved?r.improved.effect:r.effect).map(e=>({...e,...(typeof e.value==='number'?{value:e.value*mult}:{})})),opens:[...(r.opens??[])]};
}
export function resourceView(s,cityId){
 const c=s.cities[cityId];if(!domesticV3Enabled(s)||!c)return {resources:[],visibleResources:[],luxuryCounts:{}};
 const inside=new Set(c.territory??[]),owned=[],visible=[];
 for(const id of Object.keys(s.domesticResources??{}).sort()){
  const row=resourceEntry(s,c,id);if(!row)continue;
  if(inside.has(id))owned.push(row);
  else if([...inside].some(t=>s.tiles[t]&&hexDistance(s.tiles[t],s.tiles[id])<=2))visible.push(row);
 }
 const luxuryCounts={};for(const city of cities(s).filter(x=>x.ownerFactionId===c.ownerFactionId))for(const id of city.territory??[]){const r=resourceById.get(s.domesticResources?.[id]?.id);if(r?.class==='luxury')luxuryCounts[r.id]=(luxuryCounts[r.id]??0)+1;}
 return {resources:owned,visibleResources:visible,luxuryCounts};
}
export function v3ResourceEffects(s,c,kind,ctx={}){
 if(!domesticV3Enabled(s))return [];
 return (c.territory??[]).flatMap(id=>{const r=resourceEntry(s,c,id);return !r||r.blocked?[]:r.effects.filter(e=>e.kind===kind&&(!ctx.tileId||ctx.tileId===id)&&(!e.arms||e.arms===ctx.arms)&&(!e.facility||e.facility===ctx.facility)&&!((e.kind==='PRESTIGE_PER_TURN'||e.resource==='prestige')&&(s.factions[c.ownerFactionId]?.luxuryPauses??[]).some(p=>p.resource===r.id&&p.until>=s.turn))).map(e=>({...e,tileId:id,resourceId:r.id}));});
}
export const v3ResourceModifier=(s,c,kind,ctx={})=>v3ResourceEffects(s,c,kind,ctx).reduce((n,e)=>n+(typeof e.value==='number'?e.value:0),0);
export function v3ImprovementTiles(s,c,kind,candidates){
 const rule=resources.improvements.find(r=>r.id===kind);if(!rule)return candidates;
 const matching=candidates.filter(id=>rule.on.includes(s.domesticResources?.[id]?.id));
 return rule.existing?[...matching,...candidates.filter(id=>!matching.includes(id))]:matching;
}
export function v3ResourcePrestige(s,c){
 return v3ResourceEffects(s,c,'PRESTIGE_PER_TURN').reduce((n,e)=>{
  if((s.factions[c.ownerFactionId]?.luxuryPauses??[]).some(p=>p.resource===e.resourceId&&p.until>=s.turn))return n;
  const first=cities(s).filter(x=>x.ownerFactionId===c.ownerFactionId).flatMap(x=>v3ResourceEffects(s,x,'PRESTIGE_PER_TURN').filter(other=>other.resourceId===e.resourceId).map(other=>({cityId:x.cityId,tileId:other.tileId})))[0];
  return n+(first?.cityId===c.cityId&&first.tileId===e.tileId?e.value:0);
 },0);
}
const armKinds=['spear','blade','bow','horse'];
export const v3HasResource=(value,key)=>Array.isArray(value)?value.includes(key):!!value?.[key];
export function v3ArmKind(type){
 const base=typeof type==='object'?(type.parentBaseTroopId??type.baseTroopId??type.troopType):type;
 return {BT01:'blade',BT02:'spear',BT03:'bow',BT04:'horse',militia:'blade',blade:'blade',spear:'spear',bow:'bow',cavalry:'horse',horse:'horse'}[parentTroop(base)]??'blade';
}
const fieldActive=(s,a)=>a.hp>0&&a.troopCount>0&&(!s.terminal||s.terminal.armiesById[a.armyId]?.disposition==='ACTIVE');
const personnelFaction=(s,l)=>s.economy?.lotFaction?.[l.lotId]??s.armies?.[l.originFormationId]?.factionId??s.cities[l.nodeId]?.ownerFactionId;
function armWeights(s,id){
 const weights=Object.fromEntries(armKinds.map(k=>[k,0]));
 for(const o of Object.values(s.officers??{}))if(o.allegianceFactionId===id&&o.lifeState==='ALIVE'&&o.captivityState==='FREE')weights[v3ArmKind(o.troopType)]++;
 if(!Object.values(weights).some(Boolean))weights.blade=1;
 return weights;
}
export function initializeV3Armory(s){
 if(!domesticV3Enabled(s))return;
 for(const [id,f] of Object.entries(s.factions))if(!f.armory){
  const troops=(s.personnel?.lots??[]).filter(l=>personnelFaction(s,l)===id).reduce((n,l)=>n+l.count,0)+Object.values(s.armies??{}).filter(a=>a.factionId===id&&fieldActive(s,a)).reduce((n,a)=>n+a.troopCount,0);
  const total=troops*trial.arms.displayScale,weights=armWeights(s,id),sum=Object.values(weights).reduce((n,x)=>n+x,0);
  f.armory=Object.fromEntries(armKinds.map(k=>[k,Math.floor(total*weights[k]/sum)]));
  f.armory[armKinds.find(k=>weights[k]>0)]+=total-Object.values(f.armory).reduce((n,x)=>n+x,0);
  // 플레이 점검 03 #8: every living general also starts with one sortie's worth of his own kind (10-25 tuning).
  for(const k of armKinds)f.armory[k]+=weights[k]*(trial.arms.startPerOfficer??0);
 }
}
export function v3ArmsPerTroop(s,id,type){
 const horses=learningModifier(s,id,'HORSES_PER_CAVALRY');
 return trial.arms.displayScale*(v3ArmKind(type)==='horse'&&horses>0?horses:1);
}
export function v3ArmCapacity(s,id,type){initializeV3Armory(s);return Math.floor((s.factions[id].armory[v3ArmKind(type)]??0)/v3ArmsPerTroop(s,id,type));}
export function transferV3Arms(s,id,type,count,direction){
 initializeV3Armory(s);const store=s.factions[id].armory,key=v3ArmKind(type),amount=count*v3ArmsPerTroop(s,id,type);
 if(direction<0&&store[key]+1e-9<amount)throw new Error('INSUFFICIENT_ARMS');
 store[key]=Math.max(0,store[key]+direction*amount);
}
export function v3ArmsChoice(s,id){
 initializeV3Armory(s);const weights=armWeights(s,id),store=s.factions[id].armory;
 return ['spear','blade','bow'].filter(k=>weights[k]>0).sort((a,b)=>store[a]/weights[a]-store[b]/weights[b])[0]??'blade';
}
export function buyHorses(s,id,gold){
 if(!domesticV3Enabled(s))throw new Error('DOMESTIC_V3_DISABLED');
 if(!s.factions[id]||!Number.isFinite(gold)||gold<=0)throw new Error('INVALID_HORSE_PURCHASE');
 initializeDomesticV3(s);initializeV3Armory(s);const f=s.factions[id],rule=trial.horses;
 const limit=cities(s).filter(c=>c.ownerFactionId===id).reduce((n,c)=>n+activeFacilities(s,c).filter(x=>x.kind==='market').length,0)*rule.marketLimit;
 const ledger=f.horsePurchases?.turn===s.turn?f.horsePurchases:{turn:s.turn,count:0,bought:0};
 const price=rule.goldPerHorse*(1+ledger.count*rule.repeatIncrease),bought=Math.floor(Math.min(limit-ledger.bought,Math.min(gold,f.treasury)/price));
 const spent=Math.max(0,bought)*price;
 if(bought>0){f.treasury-=spent;f.armory.horse+=bought;ledger.count++;ledger.bought+=bought;f.horsePurchases=ledger;}
 return {bought:Math.max(0,bought),spent,remaining:Math.max(0,limit-ledger.bought)};
}
export function settleV3Pastures(s){
 initializeV3Armory(s);
 for(const c of cities(s).filter(c=>c.ownerFactionId)){
  if(c.horsePastureSettledTurn===s.turn)continue;c.horsePastureSettledTurn=s.turn;
  s.factions[c.ownerFactionId].armory.horse+=v3ResourceModifier(s,c,'HORSES_PER_TURN');
  const marked=(c.territory??[]).filter(id=>v3HasResource(s.tiles[id]?.specialResources,'horsePasture')||s.tiles[id]?.specialResource==='horsePasture');
  const sites=marked.length?marked:v3HasResource(c.specialResources,'horsePasture')?[null]:[];
  for(const id of sites){if(id&&blocked(s,c,id))continue;const improved=activeFacilities(s,c).some(f=>['pasture','horsePasture'].includes(f.kind)&&(id===null||f.tileId===id));s.factions[c.ownerFactionId].armory.horse+=improved?trial.horses.improvedYield:trial.horses.pastureYield;}
 }
}
export function v3GoldUpkeep(s,id,{cityId=null,troops=null}={}){
 const rule=trial.goldUpkeep;
 let count=(s.personnel?.lots??[]).filter(l=>personnelFaction(s,l)===id).reduce((n,l)=>n+l.count,0);
 count+=Object.values(s.armies??{}).filter(a=>a.factionId===id&&fieldActive(s,a)).reduce((n,a)=>n+a.troopCount,0);
 count+=(s.personnel?.transports??[]).filter(t=>t.status==='IN_TRANSIT'&&personnelFaction(s,(s.personnel.lots??[]).find(l=>l.lotId===t.sourceLotId)??{})===id).reduce((n,t)=>n+t.count,0);
 // Target troops use the population/display unit; ledger troops use internal tens.
 const troopGold=(count*trial.arms.displayScale+(cityId&&troops!==null?troops-v3CityTroops(s,s.cities[cityId])*trial.arms.displayScale:0))*rule.perThousandTroops/1000;
 const officerGold=Object.values(s.officers??{}).filter(o=>o.allegianceFactionId===id&&o.lifeState==='ALIVE'&&o.captivityState==='FREE').reduce((n,o)=>n+rule.officer*(Object.values(s.armies??{}).some(a=>a.commanderId===o.officerId&&a.factionId===id&&fieldActive(s,a))?rule.deployedFactor:1),0);
 const specialistGold=cities(s).filter(c=>c.ownerFactionId===id).reduce((n,c)=>n+Object.values(c.domesticSpecialists??{}).reduce((a,b)=>a+b,0)*rule.specialist,0);
 return {troops:troopGold,officers:officerGold,specialists:specialistGold,total:troopGold+officerGold+specialistGold};
}
export function settleV3GoldUpkeep(s){
 for(const [id,f] of Object.entries(s.factions)){
  if(f.goldUpkeep?.turn===s.turn)continue;
  const cost=v3GoldUpkeep(s,id),paid=Math.min(Math.max(0,f.treasury),cost.total);f.treasury-=paid;
  f.unpaidTurns=paid+1e-9<cost.total?(f.unpaidTurns??0)+1:0;
  f.goldUpkeep={...cost,turn:s.turn,paid,unpaid:cost.total-paid};f.unpaidMoralePenalty=f.unpaidTurns?trial.goldUpkeep.moralePenalty:0;
  if(f.unpaidTurns>trial.goldUpkeep.desertAfter)for(const l of s.personnel.lots??[])if(personnelFaction(s,l)===id&&l.kind!=='WOUNDED'&&s.cities[l.nodeId]?.ownerFactionId===id){const loss=Math.floor(l.count*trial.goldUpkeep.desertRate);l.count-=loss;s.personnel.initialPersonnel-=loss;}
 }
}
const cities=s=>Object.values(s.cities).sort((a,b)=>a.cityId.localeCompare(b.cityId,'en'));
export const syncPeople=c=>c.population=Math.max(1,Math.floor(c.people/trial.populationUnit));
const normal=(s,c)=>(s.occupations?.[c.cityId]?.state??(c.occupationState==='TEMPORARY_OCCUPATION'?'OCCUPIED':'NORMAL'))==='NORMAL';
let riverTerrainIndex=null;
export function v3Terrain(s,t){
 if(t.terrainType!=='plain')return t.terrainType;
 const edges=s.mapRules?.riverEdges??[],signature=JSON.stringify(edges);
 // Content key observes same-length edits as well as cloned map rules.
 if(riverTerrainIndex?.signature!==signature)riverTerrainIndex={signature,tiles:new Set(edges.flatMap(e=>e.split('|')))};
 return riverTerrainIndex.tiles.has(t.tileId)?'riverside':t.terrainType;
}
const blocked=(s,c,id)=>Object.values(s.armies??{}).some(a=>a.tileId===id&&a.factionId!==c.ownerFactionId&&a.troopCount>0&&a.hp>0&&(!s.campaignTerminalWorld||s.campaignTerminalWorld.armiesById[a.armyId]?.disposition==='ACTIVE'));
export function v3Tile(s,c,id){
 const terrain=v3Terrain(s,s.tiles[id]),base=trial.terrain[terrain]??{},value={food:0,production:0,gold:0,capacity:0,...base};
 for(const f of c.facilities??[])if(f.tileId===id&&!f.damaged&&!(terrain==='riverside'&&crisisEffects(s,c,'AREA_RIVER_FACILITY_STOP').length))for(const [k,n] of Object.entries(trial.facility[f.kind]??{}))value[k]+=n;
 for(const e of v3ResourceEffects(s,c,'TILE_YIELD_ADD',{tileId:id}))value[resourceName(e.resource)==='prod'?'production':resourceName(e.resource)]+=e.value;
 for(const k of ['food','production','gold'])value[k]*=1+learningModifier(s,c.ownerFactionId,'TILE_OUTPUT_MOD',{terrain,resource:k})/100;
 value.capacity*=1+learningModifier(s,c.ownerFactionId,'TILE_POP_CAP_MOD')/100;
 if(terrain==='riverside')value.food*=crisisFactor(s,c,'AREA_RIVER_TILE_GRAIN_MULT');
 for(const e of crisisEffects(s,c,'AREA_TILE_GRAIN_ZERO')){
  const x=s.domesticCrises.find(x=>x.id===e.crisisId),share=Math.min(1,e.share*e.strength*e.damageFactor*crisisFactor(s,c,'AREA_TILE_GRAIN_SHARE_MULT'));
  const ordered=[...(c.territory??[])].sort((a,b)=>seedHash(`${x.id}:${a}`)-seedHash(`${x.id}:${b}`));if(ordered.slice(0,Math.ceil(ordered.length*share)).includes(id))value.food=0;
 }
 if(blocked(s,c,id))for(const k of ['food','production','gold'])value[k]=0;
 return {tileId:id,terrain,baseYield:{...base},yield:value,blocked:blocked(s,c,id),worked:true,effectiveYield:{...value}};
}
const castleTiles=c=>[c.tileId,...(c.footprint?.gates??[]),...(c.footprint?.walls??[])];
const byScore=(s,c)=>(a,b)=>tileScore(s,c,b)-tileScore(s,c,a)||a.tileId.localeCompare(b.tileId,'en');
function tileScore(s,c,t){const v=v3Tile(s,c,t.tileId).yield;return v.capacity+v.food+v.production*trial.territory.productionWeight+(s.domesticResources?.[t.tileId]?trial.territory.resourceWeight??0:0);} // 10-25 TUNING #5: borders reach for visible resources first (문명 border growth)
function adjacentCandidates(s,c){const near=[...castleTiles(c),...(c.territory??[])].filter(id=>s.tiles[id]);return eligibleTiles(s,c).filter(t=>near.some(id=>hexDistance(s.tiles[id],t)===1));}
function eligibleTiles(s,c){
 const forbidden=new Set(cities(s).flatMap(x=>[x.tileId,...(x.footprint?.gates??[]),...(x.footprint?.walls??[]),...(x.territory??[])]));
 return Object.values(s.tiles).filter(t=>!forbidden.has(t.tileId)&&hexDistance(s.tiles[c.tileId],t)<=trial.territory.maxRadius);
}
export function initializeDomesticV3(s){
 if(!domesticV3Enabled(s))return s;
 initializeV3Resources(s);
 for(const f of Object.values(s.factions)){f.granary??=trial.start.granary;f.treasury??=trial.start.treasury;f.domesticStandards??=[];f.domesticPolicyDefault??='balanced';f.occupationPolicyDefault??='pacify';}
 for(const c of cities(s)){c.people??=c.kind==='minor'?trial.start.minorPeople:trial.start.majorPeople;syncPeople(c);c.territory??=[];}
 // C470 r2: the castle itself occupies distance 1 (gates and walls), so the first ring is just outside it.
 for(const c of cities(s))if(!c.domesticV3Initialized){const n=trial.territory.startTiles[c.kind==='minor'?'minor':'major'];c.territory=adjacentCandidates(s,c).filter(t=>t.terrainType!=='water').sort(byScore(s,c)).slice(0,n).map(t=>t.tileId);c.domesticV3Initialized=true;}
 for(const c of cities(s)){c.domesticV3Turn=s.turn;initializeV3City(c);snapshotV3Security(c);}
 initializeLearning(s);
 initializeDomesticCrises(s);
 // The runtime adds starting reserve lots and assigns troop types after its first economy initialization.
 if(s.c169aVersion===1||!s.mapId)initializeV3Armory(s);
 return s;
}
export function domesticV3Influence(s,c){
 const tiles=(c.territory??[]).filter(id=>s.tiles[id]).map(id=>v3Tile(s,c,id));
 return {radius:trial.territory.maxRadius,workers:c.people,workedTiles:tiles.length,tiles,food:tiles.reduce((n,t)=>n+t.yield.food,0),production:(trial.centerProduction[c.kind]??trial.centerProduction.major)+tiles.reduce((n,t)=>n+t.yield.production,0),gold:tiles.reduce((n,t)=>n+t.yield.gold,0),capacity:trial.centerCapacity+tiles.reduce((n,t)=>n+t.yield.capacity,0)};
}
export const v3SecurityFactor=c=>trial.security.workFactors[c.securityLevel??0]??0;
export function domesticV3Base(s,c){
 const land=domesticV3Influence(s,c),share=(c.people??(c.kind==='minor'?trial.start.minorPeople:trial.start.majorPeople))/trial.taxPeople,work=v3SecurityFactor(c),tax=c.taxExemptTurn===s.turn?0:work;
 const food=(share*trial.tax.food*tax+land.food)*crisisFactor(s,c,'AREA_GRAIN_YIELD_MULT');
 return {food,gold:share*trial.tax.gold*tax*(1+learningModifier(s,c.ownerFactionId,'PEOPLE_YIELD_MOD',{resource:'gold'})/100)+land.gold,production:(share*trial.tax.production*work+land.production)*crisisFactor(s,c,'AREA_PRODUCTION_MULT'),science:share*trial.tax.science*work,prestige:0};
}
export function domesticV3Rates(s,c,{commit=false,modify=raw=>({raw})}={}){
 const result=modify(domesticV3Base(s,c)),raw=result.raw,rounded={};
 const debt=Math.min(raw.production??0,c.crisisProductionDebt??0);raw.production-=debt;if(commit&&debt)c.crisisProductionDebt-=debt;
 for(const [k,n] of Object.entries(raw)){const value=n+(c.outputCarry?.[k]??0);rounded[k]=Math.floor(value+1e-9);if(commit)(c.outputCarry??={})[k]=Math.max(0,value-rounded[k]);}
 return {bonus:0,specialistCauses:[],...result,...rounded,capacity:domesticV3Influence(s,c).capacity,workBonus:0,people:c.people,territory:[...(c.territory??[])],granary:s.factions[c.ownerFactionId]?.granary??0,treasury:s.factions[c.ownerFactionId]?.treasury??0,units:trial.units};
}
export function domesticV3FoodNeed(s,c){return v3CityTroops(s,c)*trial.foodPerTroop*(1+(learningModifier(s,c.ownerFactionId,'GARRISON_UPKEEP_MOD')+v3ResourceModifier(s,c,'GARRISON_UPKEEP_MOD'))/100)*((c.domesticCharacters??[]).includes('fort')?1-trial.fortFoodReduction:1);}
export function takeGrain(s,factionId,wanted){const f=s.factions[factionId],amount=Math.min(Math.max(0,f.granary),Math.max(0,wanted));f.granary-=amount;return amount;}
// Wanted growth before the grain limit; policy may be any key of policyGrowth (preview uses this).
export function v3GrowthTarget(s,c,policy=v3Policy(s,c)){
 if(c.growthStopUntil>=s.turn)return 0;
 const capacity=domesticV3Influence(s,c).capacity;
 return !normal(s,c)||c.besieged?0:Math.min(Math.max(0,capacity-c.people),Math.floor(c.people*trial.growthRate*(1+learningModifier(s,c.ownerFactionId,'POPULATION_GROWTH_MOD')/100)*trial.policyGrowth[policy]*v3SecurityFactor(c)*crisisFactor(s,c,'AREA_GROWTH_MULT')));
}
export function growPeople(s,c){
 if(c.growthStopUntil>=s.turn)return 0;
 const target=v3GrowthTarget(s,c);
 const grain=c.supplyIsolated?(c.siegeStock??0):s.factions[c.ownerFactionId].granary;const gain=Math.min(target,Math.floor(grain/trial.growthFood));if(c.supplyIsolated)c.siegeStock-=gain*trial.growthFood;else takeGrain(s,c.ownerFactionId,gain*trial.growthFood);c.people+=gain;syncPeople(c);return gain;
}
export function expansionCandidates(s,c){return adjacentCandidates(s,c);}
export function expandTerritory(s,c){
 if(c.people<domesticV3Influence(s,c).capacity*(trial.territory.expandAt+learningModifier(s,c.ownerFactionId,'TERRITORY_GROW_AT_ADD')))return null; // card values are relative (content room 10-24)
 const tile=expansionCandidates(s,c).sort(byScore(s,c))[0];if(tile)c.territory.push(tile.tileId);return tile?.tileId??null;
}
export function settleDomesticV3(s,hooks){
 initializeDomesticV3(s);if(s.economy.lastSettledTurn===s.turn)return s;
 hooks.prepare?.();
 settleDomesticCrises(s);
 for(const c of cities(s).filter(c=>c.ownerFactionId)){settleV3Security(s,c);}
 migrateV3People(s,hooks.route);
 for(const c of cities(s).filter(c=>c.ownerFactionId))settleV3Standards(s,c);
 for(const c of cities(s).filter(c=>c.ownerFactionId))hooks.start?.(c);
 s.economy.reinforcements=[];
 const entries=cities(s).filter(c=>c.ownerFactionId!==null).map(c=>{const rates=hooks.rates(c,true);for(const x of s.domesticCrises??[])if(crisisActive(s,x)&&crisisAffected(s,x,c)){const sell=responseEffects(s,x,c).find(e=>e.kind==='SELL_SURPLUS_FOR_GOLD');if(sell){const surplus=Math.max(0,rates.food-rates.food/crisisFactor(s,c,'AREA_GRAIN_YIELD_MULT')),sold=surplus*sell.share;rates.food-=sold;rates.gold+=sold*sell.rate;}}c.supplyIsolated=hooks.isolated?.(c)??!!c.besieged;if(c.supplyIsolated)c.siegeStock=(c.siegeStock??0)+rates.food;else s.factions[c.ownerFactionId].granary+=rates.food;s.factions[c.ownerFactionId].treasury+=rates.gold;return {c,rates};});
 settleV3GoldUpkeep(s);settleV3Pastures(s);
 // Every city's military upkeep, then field upkeep, has priority over growth.
 for(const e of entries){e.need=domesticV3FoodNeed(s,e.c);e.consumed=settleV3CityStock(s,e.c,e.need);e.paid=e.consumed>=e.need;}
 hooks.supply();
 for(const {c,rates,need,consumed,paid} of entries){
  const isNormal=normal(s,c),security=c.securityLevel??0;
  c.economyCauses=[{resource:'food',label:'사람·땅 산출',amount:rates.food},{resource:'gold',label:'금 세금',amount:rates.gold},{resource:'food',label:'군량',amount:-consumed}];
  if(!paid)c.economyCauses.push({resource:'food',label:'유지비 미지급',amount:0,unpaid:need-consumed});
  c.production=isNormal?rates.production:0;
  if(isNormal){hooks.recruit(c,paid,security);hooks.recover(c,paid);hooks.replenish(c);hooks.production(c,rates,paid);const f=s.factions[c.ownerFactionId];f.science=(f.science??0)+rates.science;f.prestige=(f.prestige??0)+rates.prestige;}
  const gain=growPeople(s,c);c.economyCauses.push({resource:'food',label:'성장 소비',amount:-gain*trial.growthFood});expandTerritory(s,c);
  recordV3Milestones(s,c,rates);
  if(normal(s,c)&&!c.besieged)c.durability=Math.min(c.durabilityMax??c.durability,c.durability+v3ResourceModifier(s,c,'WALL_REPAIR_ADD'));
  hooks.finish(c,paid,security);
 }
 hooks.research();s.economy.lastSettledTurn=s.turn;return s;
}
export function buyGrain(s,factionId,gold){
 if(!domesticV3Enabled(s))throw new Error('DOMESTIC_V3_DISABLED');initializeDomesticV3(s);
 if(!Number.isFinite(gold)||gold<=0||!s.factions[factionId])throw new Error('INVALID_GRAIN_PURCHASE');
 const f=s.factions[factionId],rule=trial.grainPurchase;
 const markets=cities(s).filter(c=>c.ownerFactionId===factionId).reduce((n,c)=>n+(c.facilities??[]).filter(x=>x.kind==='market'&&!x.damaged&&!blocked(s,c,x.tileId)).length,0);
 const limit=(rule.limit+markets*rule.marketLimit)*(1+learningModifier(s,factionId,'GRAIN_BUY_CAP_MOD')/100)*crisisBuyCap(s,factionId),ledger=f.grainPurchases?.turn===s.turn?f.grainPurchases:{turn:s.turn,count:0,bought:0};
 const price=(1+ledger.count*rule.repeatIncrease)/rule.grainPerGold*crisisGrainPrice(s),quantity=Math.floor(Math.min(Math.max(0,limit-ledger.bought),Math.min(gold,f.treasury)/price)),spent=quantity*price;
 if(quantity){f.treasury-=spent;f.granary+=quantity;ledger.count++;ledger.bought+=quantity;f.grainPurchases=ledger;}
 return {bought:quantity,spent,remaining:Math.max(0,limit-ledger.bought)};
}
export function buyTile(s,cityId,tileId){
 if(!domesticV3Enabled(s))throw new Error('DOMESTIC_V3_DISABLED');initializeDomesticV3(s);const c=s.cities[cityId];
 if(!c||!c.ownerFactionId||!expansionCandidates(s,c).some(t=>t.tileId===tileId))throw new Error('INVALID_TERRITORY_PURCHASE');
 const price=trial.tilePurchase.price*trial.tilePurchase.repeatFactor**(c.tilesBought??0)*(1+learningModifier(s,c.ownerFactionId,'TILE_BUY_COST_MOD')/100),f=s.factions[c.ownerFactionId];if(f.treasury<price)throw new Error('INSUFFICIENT_GOLD');
 f.treasury-=price;c.territory.push(tileId);c.tilesBought=(c.tilesBought??0)+1;return {tileId,spent:price};
}
// Job cost/completion stay in the existing economy owner; no runtime command.
let productionServices;
export function configureDomesticV3Production(services){productionServices=services;}
export function hurryProduction(s,cityId){
 if(!domesticV3Enabled(s))throw new Error('DOMESTIC_V3_DISABLED');initializeDomesticV3(s);const c=s.cities[cityId];
 if(!c?.ownerFactionId||!c.currentProduction||!normal(s,c))throw new Error('NO_CURRENT_PRODUCTION');
 const job=c.currentProduction,left=Math.max(0,productionServices.cost(s,c,job.kind)-(c.jobProgress[job.key]??0));
 const price=left*trial.hurry.goldPerProduction*trial.hurry.repeatFactor**(c.productionHurries??0)*(1+learningModifier(s,c.ownerFactionId,'HURRY_COST_MOD')/100),f=s.factions[c.ownerFactionId];if(f.treasury<price)throw new Error('INSUFFICIENT_GOLD');
 f.treasury-=price;c.productionHurries=(c.productionHurries??0)+1;c.jobProgress[job.key]=(c.jobProgress[job.key]??0)+left;c.productionProgress=c.jobProgress[job.key];
 const production=c.production;c.production=0;try{productionServices.complete(s,c,productionServices.rates(s,c),true);}finally{c.production=production;}
 return {spent:price,production:left,completed:c.currentProduction!==job};
}
export function idleProductionGold(s,c){const amount=c.production*trial.idleGold;s.factions[c.ownerFactionId].treasury+=amount;return amount;}
export function settleDomesticV3Supply(s,{armies,link,starvation}){
 for(const a of armies){const route=link(a),need=a.troopCount*trial.foodPerTroop;a.supplyFood=Math.min(a.supplyFood,need*(v3CarryTurns(s,a.factionId)+(a.eventCarryTurns??0)));
  const stored=takeGrain(s,a.factionId,route.state==='SAFE'?need:route.state==='DISRUPTED'?need/2:0),carried=Math.min(a.supplyFood,need-stored);a.supplyFood-=carried;a.supplyState=route.state;a.supplyStarving=stored+carried+1e-6<need;
  a.domesticV3Supply={need,stored,carried};if(route.state==='CUT'&&!s.supply.cutArmies.includes(a.armyId))s.supply.cutArmies.push(a.armyId);
  if(a.supplyStarving){if(!s.supply.starvingArmies.includes(a.armyId))s.supply.starvingArmies.push(a.armyId);starvation(a);}
 }s.supply.lastSettledTurn=s.turn;
}

// Logical v3 names. Keep the barracks storage tag so the locked special-troop
// owner continues to recognize exactly the same sortie/replacement basis.
export const v3FacilityKind=f=>f.kind==='barracks'?'trainingGround':f.kind;
export function v3Grade(c){const index=Math.max(0,trial.grades.findLastIndex(g=>(c.people??(c.kind==='minor'?trial.start.minorPeople:trial.start.majorPeople))>=g.minimum*(1+(c.learningGradeThresholdMod??0)/100)));return trial.grades[Math.max(0,index-((c.gradePenaltyUntil??-1)>(c.domesticV3Turn??0)?1:0))];}
export function v3WallFactor(c){return v3Grade(c).wall*(1+((c.domesticCharacters??[]).includes('fort')?trial.characterRate:0));}
export function initializeV3City(c){
 c.grade=v3Grade(c).id;c.domesticSeats??={};c.domesticSeatLocks??={};
 c.domesticSpecialists??=Object.fromEntries(['agronomist','official','artisan','military','scholar'].map(k=>[k,0]));
 c.domesticTraining??={};c.facilityAges??={};c.domesticCharacters??=[];
 c.domesticHistory??={grain:0,gold:0,troops:0,learning:0,fort:0,settlements:0};
}
export function v3Policy(s,c){
 const policy=c.domesticPolicyOverride??c.domesticPolicy??s.factions[c.ownerFactionId]?.domesticPolicyDefault??'balanced';
 if(policy!=='delegated')return Object.hasOwn(trial.policyGrowth,policy)?policy:'balanced';
 return v3DelegatedPolicy(s,c);
}
export function v3DelegatedPolicy(s,c){
 const origin=s.tiles[c.tileId],enemy=x=>x.ownerFactionId&&x.ownerFactionId!==c.ownerFactionId;
 const danger=Object.values(s.cities).some(x=>enemy(x)&&hexDistance(origin,s.tiles[x.tileId])<=trial.delegatedRadius)||Object.values(s.armies??{}).some(a=>a.factionId!==c.ownerFactionId&&a.hp>0&&a.troopCount>0&&s.tiles[a.tileId]&&hexDistance(origin,s.tiles[a.tileId])<=trial.delegatedRadius);
 return danger?'military':'agriculture';
}
export function v3Present(s,c,id){const o=s.officers?.[id];return !!o&&o.lifeState==='ALIVE'&&o.captivityState==='FREE'&&o.allegianceFactionId===c.ownerFactionId&&o.travelState==='STATIONARY'&&o.locationRef?.kind==='CITY'&&o.locationRef.id===c.cityId&&!o.injury;}
const activeFacilities=(s,c)=>(c.facilities??[]).filter(f=>!f.damaged&&!f.disabled&&!blocked(s,c,f.tileId)&&!(s.tiles[f.tileId]&&v3Terrain(s,s.tiles[f.tileId])==='riverside'&&crisisEffects(s,c,'AREA_RIVER_FACILITY_STOP').length));
export function v3SeatKinds(c){return ['office',...new Set((c.facilities??[]).map(v3FacilityKind))];}
function seatStat(s,c,kind){const o=s.officers?.[kind==='office'?(c.governorId??c.absentGovernorId):c.domesticSeats?.[kind]],meta=trial.seats[kind];return o?.baseStats?.[kind==='tavern'&&o.baseStats?.charisma!==undefined?'charisma':meta?.stat]??0;}
export function v3Seats(s,c){return v3SeatKinds(c).map(kind=>{
 const meta=trial.seats[kind]??{},officerId=(kind==='office'?(c.governorId??c.absentGovernorId):c.domesticSeats?.[kind])??null;
 const active=(kind==='office'||activeFacilities(s,c).some(f=>v3FacilityKind(f)===kind))&&v3Present(s,c,officerId);
 return {kind,...meta,officerId,active,statValue:seatStat(s,c,kind),bonus:active?Math.max(0,seatStat(s,c,kind)-trial.officerBoost.offset)/trial.officerBoost.divisor:0,locked:!!c.domesticSeatLocks?.[kind]};
});}
// The terminal-world projection must be rebuilt after a governor appears (registered by campaign-occupation; avoids an import cycle).
let terminalSync=null;export const configureDomesticV3TerminalSync=f=>{terminalSync=f;};
export function autoFillV3Seats(s){let governed=false;
 const used=new Set(Object.values(s.cities).flatMap(c=>[c.governorId,c.absentGovernorId,...Object.values(c.domesticSeats??{})]).filter(Boolean));
 for(const c of cities(s)){initializeV3City(c);if(!c.ownerFactionId||c.autoDepartments===false)continue;
  for(const kind of v3SeatKinds(c)){
   if(!trial.seats[kind]||c.domesticSeatLocks[kind])continue;
   if(kind==='office'?(c.governorId||c.absentGovernorId||(c.occupationState??'NORMAL')!=='NORMAL'):c.domesticSeats[kind])continue; // occupied cities get no governor until normalized
   const stat=trial.seats[kind].stat;
   const officers=Object.values(s.officers??{}).filter(o=>!used.has(o.officerId)&&v3Present(s,c,o.officerId));
   const value=o=>o.baseStats?.[kind==='tavern'&&o.baseStats?.charisma!==undefined?'charisma':stat]??0;
   officers.sort((a,b)=>value(b)-value(a)||a.officerId.localeCompare(b.officerId));
   if(officers[0]){const id=officers[0].officerId;if(kind==='office'){c.governorId=id;governed=true;const t=s.terminal;if(t?.citiesById?.[c.cityId]){t.citiesById[c.cityId].governorId=id;if(t.officersById?.[id])t.officersById[id].assignment={kind:'CITY',id:c.cityId};}}else c.domesticSeats[kind]=id;used.add(id);} // keep the terminal record in step (as finishDomesticGovernor does)
  }
 }
 if(governed&&s.terminal)terminalSync?.(s);return governed;
}
export function v3Output(s,c,raw){
 const boosts={};for(const seat of v3Seats(s,c))if(seat.resource)boosts[seat.resource]=(boosts[seat.resource]??0)+seat.bonus;
 for(const [kind,resource] of [['agronomist','food'],['official','gold'],['artisan','production'],['military','recruit'],['scholar','science']])boosts[resource]=(boosts[resource]??0)+(c.domesticSpecialists?.[kind]??0)*trial.specialists.rate;
 for(const [kind,resource] of [['grain','food'],['gold','gold'],['troops','recruit'],['learning','science']])if(c.domesticCharacters?.includes(kind))boosts[resource]=(boosts[resource]??0)+trial.characterRate;
 for(const key of Object.keys(raw))raw[key]*=1+(boosts[key]??0);
 raw.science*=1+learningModifier(s,c.ownerFactionId,'FACTION_SCIENCE_MOD')/100;
 if(raw.prestige!==undefined)raw.prestige*=1+learningModifier(s,c.ownerFactionId,'PRESTIGE_GAIN_MOD')/100;
 return boosts;
}
export function settleV3Specialists(s,c){
 initializeV3City(c);if(s.factions[c.ownerFactionId]?.unpaidTurns>0)return;let total=Object.values(c.domesticSpecialists).reduce((n,x)=>n+x,0);
 const cap=Math.floor(c.people/trial.specialists.peoplePerSlot);
 for(const seat of v3Seats(s,c)){
  if(!seat.specialist)continue;
  if(seat.kind!=='office'&&!activeFacilities(s,c).some(f=>v3FacilityKind(f)===seat.kind))continue;
  // An occupied but absent seat pauses training; a vacant facility trains slowly.
  if(seat.officerId&&!seat.active)continue;
  const basePeriod=seat.active?(seat.statValue>=trial.specialists.fastStat?trial.specialists.fastPeriod:trial.specialists.period):trial.specialists.passivePeriod;
  const period=Math.max(seat.active&&seat.statValue>=trial.specialists.fastStat?2:1,basePeriod+learningModifier(s,c.ownerFactionId,'SPECIALIST_PERIOD_ADD'));
  c.domesticTraining[seat.kind]=(c.domesticTraining[seat.kind]??0)+1;
  if(c.domesticTraining[seat.kind]>=period){c.domesticTraining[seat.kind]=0;if((c.domesticSpecialists[seat.specialist]??0)<cap){c.domesticSpecialists[seat.specialist]=(c.domesticSpecialists[seat.specialist]??0)+1;total++;}} // 10-25 사용자: 상한은 시설(전문인력 종류)마다
 }
}
export function settleV3Standards(s,c){
 initializeV3City(c);const f=s.factions[c.ownerFactionId];f.domesticStandards??=[];
 for(const kind of new Set(activeFacilities(s,c).map(v3FacilityKind))){
  c.facilityAges[kind]=(c.facilityAges[kind]??0)+1;
  const specialist=trial.seats[kind]?.specialist;
  if((specialist?(c.domesticSpecialists[specialist]??0)>0:c.facilityAges[kind]>=trial.standardPeriod)&&!f.domesticStandards.includes(kind))f.domesticStandards.push(kind);
 }
}
export function v3StandardOrder(s,c){
 const policy=v3Policy(s,c),order=policy==='balanced'&&s.factions[c.ownerFactionId].granary<domesticV3FoodNeed(s,c)?['farm','granary','market']:trial.policyOrder[policy];
 return [...new Set([...order,...s.factions[c.ownerFactionId].domesticStandards])].filter(k=>s.factions[c.ownerFactionId].domesticStandards.includes(k)&&(['mine','ranch'].includes(k)||(k==='farm'&&(c.territory??[]).some(id=>s.domesticResources?.[id]?.id==='fertile'&&!(c.facilities??[]).some(f=>f.tileId===id)))||!(c.facilities??[]).some(f=>v3FacilityKind(f)===k)));
}
export function v3CityTroops(s,c){return (s.personnel?.lots??[]).filter(l=>l.nodeId===c.cityId).reduce((n,l)=>n+l.count,0);}
export function v3RecruitView(s,c){
 const target=trial.recruitTargets[s.factions[c.ownerFactionId]?.recruitTarget]??trial.policyRecruitTargets[v3Policy(s,c)],troops=v3CityTroops(s,c);
 return {target,nextGoldUpkeep:v3GoldUpkeep(s,c.ownerFactionId,{cityId:c.cityId,troops:Math.floor(c.people*target)}).total,ratio:c.people>0?troops/c.people:troops?Infinity:0,nextFood:Math.floor(c.people*target)*trial.foodPerTroop*(1+(learningModifier(s,c.ownerFactionId,'GARRISON_UPKEEP_MOD')+v3ResourceModifier(s,c,'GARRISON_UPKEEP_MOD'))/100)*((c.domesticCharacters??[]).includes('fort')?1-trial.fortFoodReduction:1)};
}
export function recordV3Milestones(s,c,rates){
 initializeV3City(c);const h=c.domesticHistory;h.grain+=rates.food;h.gold+=rates.gold;h.troops+=c.domesticRecruited??0;h.learning+=rates.science;h.settlements++;const defenders=v3CityTroops(s,c)+Object.values(s.armies??{}).filter(a=>a.factionId===c.ownerFactionId&&a.hp>0&&castleTiles(c).includes(a.tileId)).reduce((n,a)=>n+a.troopCount,0);h.fort+=(defenders-h.fort)/h.settlements;
 const grade=v3Grade(c);c.grade=grade.id;
 const ranked=['grain','gold','troops','learning','fort'].sort((a,b)=>h[b]-h[a]);
 while(c.domesticCharacters.length<grade.institutionSlots){const pick=ranked.find(k=>!c.domesticCharacters.includes(k));c.domesticCharacters.push(pick);}
}
export function v3DomesticView(s,c){const grade=v3Grade(c);return {securityName:trial.security.names[c.securityLevel??0],siegeStock:c.siegeStock??0,supplyIsolated:!!c.supplyIsolated,siegeDefenseFactor:c.siegeDefenseFactor??1,grade:grade.id,gradeName:grade.name,institutionSlots:grade.institutionSlots,seats:v3Seats(s,c),domesticSpecialists:{...c.domesticSpecialists},domesticStandards:[...(s.factions[c.ownerFactionId]?.domesticStandards??[])],domesticCharacters:[...(c.domesticCharacters??[])],domesticHistory:{...c.domesticHistory},domesticPolicy:v3Policy(s,c),recruitment:v3RecruitView(s,c),v3Facilities:(c.facilities??[]).map(f=>({...f,kind:v3FacilityKind(f)}))};}

// Snapshot actual damage, rather than treating an old damaged building as a new cause forever.
function snapshotV3Security(c){c.v3SecuritySnapshot??={durability:c.durability??0,damaged:(c.facilities??[]).filter(f=>f.damaged).map(f=>f.tileId+':'+f.kind)};}
export function exemptTax(s,cityId){
 if(!domesticV3Enabled(s))throw new Error('DOMESTIC_V3_DISABLED');const c=s.cities[cityId];if(!c?.ownerFactionId)throw new Error('INVALID_TAX_CITY');
 c.taxExemptTurn=s.turn;c.taxExemptRecoveryPending=true;return s;
}
export function settleV3Security(s,c){
 if(c.securitySettledTurn===s.turn)return;snapshotV3Security(c);
 const previous=c.v3SecuritySnapshot,damaged=(c.facilities??[]).filter(f=>f.damaged).map(f=>f.tileId+':'+f.kind),causes=[];
 if(c.besieged)causes.push('포위');
 if(c.plunderTurn===s.turn||c.plunderTurn===s.turn-1)causes.push('수탈');
 if(c.emergencyConscriptionTurn===s.turn)causes.push('긴급 징병');
 if((c.durability??0)<previous.durability||damaged.some(id=>!previous.damaged.includes(id))||c.facilityDamageTurn===s.turn||c.wallDamageTurn===s.turn)causes.push('시설·성벽 피해');
 for(const event of c.securityCauseEvents??[])causes.push(typeof event==='string'?event:event.label??event.kind??'사건');c.securityCauseEvents=[];
 const recovery=(v3CityTroops(s,c)*trial.security.garrisonDisplayScale>=c.people*trial.security.recoveryGarrisonRatio?2:1)+learningModifier(s,c.ownerFactionId,'SECURITY_RECOVERY_STEP')+v3ResourceModifier(s,c,'CITY_SECURITY_RECOVERY_STEP');
 c.securityLevel=Math.max(0,Math.min(2,(c.securityLevel??0)+(c.taxExemptRecoveryPending?-1:causes.length?1:-recovery)));
 c.taxExemptRecoveryPending=false;c.securityCauses=causes;c.securitySettledTurn=s.turn;c.domesticV3Turn=s.turn;
 c.chaosTurns=c.securityLevel===2?(c.chaosTurns??0)+1:0;c.v3SecuritySnapshot={durability:c.durability??0,damaged};
}
export function migrateV3People(s,route){
 const eligible=cities(s).filter(c=>c.ownerFactionId),moves=[];
 for(const c of eligible){if((c.chaosTurns??0)<=trial.security.migrationAfter)continue;
 const amount=Math.floor(c.people*trial.security.migrationRate),targets=eligible.filter(x=>x!==c&&x.ownerFactionId===c.ownerFactionId&&route?.(c,x)&&x.people<domesticV3Influence(s,x).capacity).sort((a,b)=>hexDistance(s.tiles[c.tileId],s.tiles[a.tileId])-hexDistance(s.tiles[c.tileId],s.tiles[b.tileId])||a.cityId.localeCompare(b.cityId));
 moves.push({c,amount,target:targets[0]});}
 for(const {c,amount,target} of moves){c.people-=amount;syncPeople(c);if(target){target.people+=Math.min(amount,Math.max(0,domesticV3Influence(s,target).capacity-target.people));syncPeople(target);}}
}
export function settleV3CityStock(s,c,need=domesticV3FoodNeed(s,c)){
 const granaries=(c.facilities??[]).filter(f=>f.kind==='granary'&&!f.damaged&&!blocked(s,c,f.tileId)).length;
 c.siegeStockMax=need*(trial.siege.turns+granaries*trial.siege.granaryTurns+learningModifier(s,c.ownerFactionId,'SIEGE_RESERVE_TURNS_ADD'));c.siegeStock??=0;
 let consumed;
 if(c.supplyIsolated){consumed=Math.min(c.siegeStock,need);c.siegeStock-=consumed;}
 else {consumed=takeGrain(s,c.ownerFactionId,need);c.siegeStock+=takeGrain(s,c.ownerFactionId,Math.max(0,c.siegeStockMax-c.siegeStock));}
 const empty=c.supplyIsolated&&consumed<need;c.siegeDefenseFactor=empty?trial.siege.defenseFactor:1;
 if(empty){let dispersed=0;for(const lot of s.personnel.lots.filter(l=>l.nodeId===c.cityId)){const loss=Math.floor(lot.count*trial.siege.attrition);lot.count-=loss;dispersed+=loss;}s.personnel.initialPersonnel-=dispersed;c.siegeDispersed=(c.siegeDispersed??0)+dispersed;}
 return consumed;
}
// Card values keep their data units: percent points, additive amounts, or an
// absolute replacement (carry turns, growth threshold). No legacy state writes.
const learningById=new Map(learning.cards.map(c=>[c.id,c]));
const troopFamilies={BT01:'blade',BT02:'spear',BT03:'bow',BT04:'cavalry',militia:'blade',spear:'spear',bow:'bow',cavalry:'cavalry',phalanx:'spear',horseArcher:'cavalry'};
const resourceName=k=>k==='grain'?'food':String(k??'').toLowerCase();
function matchesLearning(effect,ctx){
 if(effect.resource&&resourceName(effect.resource)!==resourceName(ctx.resource))return false;
 return !effect.condition||effect.condition.split('&').every(part=>{
  const [key,values]=part.split(':');
  if(key==='TROOP')return values.split('|').includes(ctx.baseTroopId??ctx.troopType??ctx.troop);
  if(key==='TERRAIN')return values.split('|').includes(String(ctx.terrain??'').toUpperCase());
  return ctx[key]===true||ctx.conditions?.includes(key)||key==='RANGED_HIT'&&ctx.rangedHit===true||key==='ON_WALL'&&ctx.onWall===true;
 });
}
// ctx: baseTroopId (BTxx or CATAPULT/ENGINEER), rangedHit, onWall,
// terrain, resource (food/grain/gold), specialTroop (authored display name).
export function learningModifier(s,factionId,kind,ctx={}){
 if(!domesticV3Enabled(s))return 0;
 return (s.factions[factionId]?.learningCards??[]).reduce((sum,id)=>{
  const e=learningById.get(id)?.effect;
  if(!e||e.kind!==kind||!matchesLearning(e,ctx))return sum;
  return sum+(typeof e.value==='number'?e.value:ctx.specialTroop===e.value?1:0);
 },0);
}
export const v3CarryTurns=(s,id)=>trial.carryTurns+learningModifier(s,id,'CARRIED_FOOD_TURNS_ADD');
function initializeLearning(s){
 for(const [id,f] of Object.entries(s.factions)){
  f.learningCards??=[];f.learningQueue??=[];f.learningThresholds??=[];f.learningRetired??=[];f.eurekaDone??=[];
  f.learningSnapshot??={cities:cities(s).filter(c=>c.ownerFactionId===id).map(c=>c.cityId),sequence:s.battleSequence??0,grades:Object.fromEntries(cities(s).filter(c=>c.ownerFactionId===id).map(c=>[c.cityId,trial.grades.findIndex(g=>g.id===v3Grade(c).id)]))};
 }
 for(const c of cities(s)){c.learningGradeThresholdMod=learningModifier(s,c.ownerFactionId,'GRADE_THRESHOLD_MOD');c.grade=v3Grade(c).id;}
}
function troopUsage(s,id){
 const totals={};for(const a of Object.values(s.armies??{}))if(a.factionId===id&&a.hp>0&&a.troopCount>0){const family=troopFamilies[a.troopType];if(family)totals[family]=(totals[family]??0)+a.troopCount;}
 return Object.keys(totals).sort((a,b)=>totals[b]-totals[a]||a.localeCompare(b)).slice(0,2);
}
function drawLearning(s,id,threshold,turn){
 const f=s.factions[id],used=troopUsage(s,id),offered=[];
 const inventor=cities(s).some(c=>c.ownerFactionId===id&&productionServices?.inventor?.(s,c));
 const retired=new Set((learning.retired??[]).map(c=>typeof c==='string'?c:c.id).filter(Boolean));
 const candidates=learning.cards.filter(c=>!c.retired&&!retired.has(c.id)&&!f.learningCards.includes(c.id)&&!f.learningRetired.includes(c.id)&&(c.requires??[]).every(r=>f.learningCards.includes(r)));
 for(const slot of learning.draw.slots.slice(0,learning.draw.cards)){
  const pool=candidates.filter(c=>slot.colors.includes(c.color)&&!offered.includes(c.id));if(!pool.length)continue;
  const weight=c=>(used.includes(c.family)?2:1)*(inventor&&c.tags?.includes('공성')?2:1);
  const rng=createRng();rng.restore(s.rng.value);let roll=rng.next()*pool.reduce((n,c)=>n+weight(c),0);s.rng.value=rng.state();s.rng.draws++;
  offered.push((pool.find(c=>(roll-=weight(c))<0)??pool.at(-1)).id);
 }
 return {threshold,cards:offered,turn};
}
function activateLearningQueue(s,id){
 const f=s.factions[id];if(!f.learningChoice&&f.learningQueue.length){const next=f.learningQueue.shift();f.learningChoice=drawLearning(s,id,next.threshold,next.turn);}
}
export function pickLearningCard(s,factionId,cardId){
 if(!domesticV3Enabled(s))throw new Error('DOMESTIC_V3_DISABLED');
 const f=s.factions[factionId],choice=f?.learningChoice;
 if(!choice?.cards.includes(cardId)||f.learningCards.includes(cardId))throw new Error('INVALID_LEARNING_CARD');
 const card=learningById.get(cardId);f.learningCards.push(cardId);
 for(const id of choice.cards)if(id!==cardId&&learningById.get(id)?.family==='once')f.learningRetired.push(id);
 const e=card.effect;
 if(e.kind==='GRANT_GRAIN')f.granary+=e.value;
 if(e.kind==='GRANT_GOLD')f.treasury+=e.value;
 if(e.kind==='GRANT_PEOPLE'){
  const c=cities(s).filter(c=>c.ownerFactionId===factionId).sort((a,b)=>a.people-b.people||a.cityId.localeCompare(b.cityId))[0];
  if(c){c.people+=Math.min(e.value,Math.max(0,domesticV3Influence(s,c).capacity-c.people));syncPeople(c);}
 }
 f.learningChoice=null;initializeLearning(s);productionServices?.syncResearch?.(s);activateLearningQueue(s,factionId);return s;
}
function aiLearningCard(s,id){
 const f=s.factions[id],used=troopUsage(s,id),owned=cities(s).filter(c=>c.ownerFactionId===id),scores=aiRules.learningCard?.score;
 if(!scores)return f.learningChoice.cards[0];
 // The authored rules use named score rows rather than executable expressions.
 const scoreValue=prefix=>Object.entries(scores).find(([k])=>k.startsWith(prefix))?.[1]??0;
 const grainNeed=owned.reduce((n,c)=>n+domesticV3FoodNeed(s,c)+c.people*trial.growthRate*trial.policyGrowth[v3Policy(s,c)]*trial.growthFood,0);
 const grainLow=f.granary<grainNeed*4;
 // Payroll is not present in this checkout. Do not invent a wage for seats.
 // The upkeepTurns score row stays inactive until the payroll owner supplies it.
 const goldLow=false;
 const inventor=owned.some(c=>productionServices?.inventor?.(s,c));
 const score=card=>{
  let n=used.includes(card.family)?scoreValue('실제'):0;
  if(grainLow&&card.family==='farm'||goldLow&&card.family==='coin')n+=scoreValue('모자란');
  if((card.requires??[]).length)n+=scoreValue('같은');
  if(card.family==='once'&&(grainLow&&card.effect.kind==='GRANT_GRAIN'||goldLow&&card.effect.kind==='GRANT_GOLD'))n+=scoreValue('시기');
  if(inventor&&card.tags?.includes('공성'))n+=scoreValue('발명가');return n;
 };
 return [...f.learningChoice.cards].sort((a,b)=>score(learningById.get(b))-score(learningById.get(a)))[0];
}
function settleLearningEureka(s,id){
 const f=s.factions[id],before=f.learningSnapshot,own=cities(s).filter(c=>c.ownerFactionId===id);
 const won=(s.combatLog??[]).some(log=>{
  if(log.sequence<=before.sequence)return false;
  const winner=log.winnerFactionId??(log.enemyLoss>log.allyLoss?s.armies?.[log.attackerId]?.factionId:log.allyLoss>log.enemyLoss?s.armies?.[log.targetId]?.factionId:null);
  return winner===id;
 });
 const conditions={
  'EU-FIRST-WIN':won,
  'EU-FIRST-CAPTURE':own.some(c=>!before.cities.includes(c.cityId)),
  'EU-FIRST-CAPTIVE':Object.values(s.terminal?.prisonersById??{}).some(p=>p.captorFactionId===id)||Object.values(s.officers??{}).some(o=>o.captivityState==='PRISONER'&&o.captorFactionId===id),
  'EU-FIRST-GRADUATE':(f.domesticStandards??[]).length>0,
  'EU-FIRST-GRADE':own.some(c=>before.grades?.[c.cityId]!==undefined&&trial.grades.findIndex(g=>g.id===v3Grade(c).id)>before.grades[c.cityId])
 };
 for(const e of learning.eureka)if(conditions[e.id]&&!f.eurekaDone.includes(e.id)){f.science=(f.science??0)+e.science;f.eurekaDone.push(e.id);}
 f.learningSnapshot={cities:own.map(c=>c.cityId),sequence:s.battleSequence??0,grades:Object.fromEntries(cities(s).filter(c=>c.ownerFactionId===id).map(c=>[c.cityId,trial.grades.findIndex(g=>g.id===v3Grade(c).id)]))};
}
export function settleLearning(s){
 if(!domesticV3Enabled(s))return s;initializeLearning(s);
 for(const id of Object.keys(s.factions).sort()){
  const f=s.factions[id];settleLearningEureka(s,id);
  for(const threshold of learning.thresholds)if((f.science??0)>=threshold&&!f.learningThresholds.includes(threshold)){f.learningThresholds.push(threshold);f.learningQueue.push({threshold,turn:s.turn});}
  activateLearningQueue(s,id);
  while(f.learningChoice){
   if(!f.learningChoice.cards.length){f.learningChoice=null;activateLearningQueue(s,id);continue;}
   const auto=id!==s.playerFactionId||s.autoPlayer;
   if(!auto&&f.learningChoice.turn>=s.turn)break;
   pickLearningCard(s,id,auto?aiLearningCard(s,id):f.learningChoice.cards[0]);
  }
 }
 return s;
}
export function learningView(s,factionId){
 const f=s.factions[factionId];return {science:f?.science??0,nextThreshold:learning.thresholds.find(t=>!(f?.learningThresholds??[]).includes(t))??null,learningChoice:f?.learningChoice?structuredClone(f.learningChoice):null,learningQueue:structuredClone(f?.learningQueue??[]),learningCards:[...(f?.learningCards??[])],eurekaDone:[...(f?.eurekaDone??[])]};
}

// Commands are applied to the runtime's private clone. Only successful choices
// enter history; service callbacks keep runtime/occupation ownership outside here.
export function applyDomesticV3Command(s,command,services={}){
 if(!domesticV3Enabled(s))throw new Error('INVALID_DOMESTIC_V3');
 const {type,cityId}=command,id=command.factionId??s.playerFactionId,f=s.factions[id],c=s.cities[cityId];
 if(!f||id!==s.playerFactionId)throw new Error('INVALID_DOMESTIC_V3_FACTION');
 if(['DV3_BUY_TILE','DV3_HURRY','DV3_SEAT','DV3_POLICY_CITY','DV3_TAX_EXEMPT','DV3_OCCUPATION_OVERRIDE','DV3_CHARACTER','DV3_EMERGENCY'].includes(type)&&c?.ownerFactionId!==id)throw new Error('INVALID_DOMESTIC_V3_CITY');
 const policy=p=>p==='delegated'||Object.hasOwn(trial.policyGrowth,p);
 const method=m=>['pacify','military','plunder'].includes(m);
 switch(type){
 case 'DV3_BUY_GRAIN':if(!Number.isFinite(command.gold)||command.gold<=0||grainBuyView(s,id).remaining<=0||Math.min(command.gold,f.treasury)<grainBuyView(s,id).price)throw new Error('INVALID_GRAIN_PURCHASE');buyGrain(s,id,command.gold);break;
 case 'DV3_BUY_TILE':buyTile(s,cityId,command.tileId);break;
 case 'DV3_HURRY':if(!hurryProduction(s,cityId).completed)throw new Error('DOMESTIC_V3_PRODUCTION_BLOCKED');break;
 case 'DV3_SEAT':{
  const {seat,officerId}=command;
  if(!trial.seats[seat]||!v3SeatKinds(c).includes(seat)||officerId!==null&&!v3Present(s,c,officerId))throw new Error('INVALID_DOMESTIC_V3_SEAT');
  if(officerId!==null&&cities(s).some(x=>[x.governorId,x.absentGovernorId,...Object.values(x.domesticSeats??{})].includes(officerId)&&!(x===c&&(seat==='office'?c.governorId===officerId:c.domesticSeats[seat]===officerId))))throw new Error('DOMESTIC_V3_OFFICER_ASSIGNED');
  if(officerId===null){delete c.domesticSeatLocks[seat];break;}
  if(seat==='office')services.governor(s,{cityId,officerId});else c.domesticSeats[seat]=officerId;
  c.domesticSeatLocks[seat]=true;break;
 }
 case 'DV3_POLICY_DEFAULT':if(!policy(command.policy))throw new Error('INVALID_DOMESTIC_V3_POLICY');f.domesticPolicyDefault=command.policy;break;
 case 'DV3_POLICY_CITY':if(command.policy!==null&&!policy(command.policy))throw new Error('INVALID_DOMESTIC_V3_POLICY');delete c.domesticPolicy;if(command.policy===null)delete c.domesticPolicyOverride;else c.domesticPolicyOverride=command.policy;break;
 case 'DV3_RECRUIT_TARGET':if(command.level!==null&&!Object.hasOwn(trial.recruitTargets,command.level))throw new Error('INVALID_DOMESTIC_V3_RECRUIT_TARGET');if(command.level===null)delete f.recruitTarget;else f.recruitTarget=command.level;break;
 case 'DV3_LEARNING_PICK':pickLearningCard(s,id,command.cardId);break;
 // UI-SPEC-V3 (10-24): horses (C479), emergency orders and crisis responses (C476) reach the player as commands.
 case 'DV3_BUY_HORSES':{if(!Number.isFinite(command.gold)||command.gold<=0)throw new Error('INVALID_HORSE_PURCHASE');if(!buyHorses(s,id,command.gold).bought)throw new Error('INVALID_HORSE_PURCHASE');break;}
 case 'DV3_EMERGENCY':emergencyOrder(s,cityId,command.orderId);break;
 case 'DV3_CRISIS_RESPONSE':chooseCrisisResponse(s,id,command.crisisId,command.choiceId);break;
 case 'DV3_TAX_EXEMPT':exemptTax(s,cityId);break;
 case 'DV3_OCCUPATION_DEFAULT':if(!method(command.method))throw new Error('INVALID_DOMESTIC_V3_OCCUPATION');f.occupationPolicyDefault=command.method;break;
 case 'DV3_OCCUPATION_OVERRIDE':if(!method(command.method))throw new Error('INVALID_DOMESTIC_V3_OCCUPATION');services.occupation(s,cityId,command.method);break;
 case 'DV3_CHARACTER':{
  if(![1,2].includes(command.slot)||!v3CharacterCandidates(s,c)[command.slot-1]?.includes(command.kind))throw new Error('INVALID_DOMESTIC_V3_CHARACTER');
  c.domesticCharacters[command.slot-1]=command.kind;break;
 }
 default:throw new Error('INVALID_DOMESTIC_V3_COMMAND');
 }
 if(['DV3_CHARACTER','DV3_OCCUPATION_OVERRIDE'].includes(type)){initializeLearning(s);productionServices.syncResearch?.(s);}
 s.history.push({type,turn:s.turn,factionId:id,command:structuredClone(command)});return s;
}
export function v3CharacterCandidates(s,c){
 const ranked=['grain','gold','troops','learning','fort'].filter(k=>(c.domesticHistory?.[k]??0)>0).sort((a,b)=>c.domesticHistory[b]-c.domesticHistory[a]);
 return Array.from({length:v3Grade(c).institutionSlots},(_,i)=>ranked.filter(k=>!(c.domesticCharacters??[]).some((v,j)=>j!==i&&v===k)).slice(0,2));
}
export function grainBuyView(s,id){
 const copy=structuredClone(s),f=copy.factions[id],rule=trial.grainPurchase,ledger=f.grainPurchases?.turn===s.turn?f.grainPurchases:{count:0};
 const price=(1+ledger.count*rule.repeatIncrease)/rule.grainPerGold*crisisGrainPrice(s);
 const remaining=buyGrain(copy,id,Number.MIN_VALUE).remaining;
 return {remaining,price,units:{remaining:trial.units.food,price:'금/석'}};
}
export function v3HurryCost(s,c){
 if(!c.currentProduction||!normal(s,c))return null;
 const left=Math.max(0,productionServices.cost(s,c,c.currentProduction.kind)-(c.jobProgress[c.currentProduction.key]??0));
 return left*trial.hurry.goldPerProduction*trial.hurry.repeatFactor**(c.productionHurries??0)*(1+learningModifier(s,c.ownerFactionId,'HURRY_COST_MOD')/100);
}
function v3OutputBreakdown(s,c,rates){
 const base=domesticV3Base(s,c),land=domesticV3Influence(s,c),seats=v3Seats(s,c);
 const specialistResource={agronomist:'food',official:'gold',artisan:'production',military:'recruit',scholar:'science'};
 const characterResource={grain:'food',gold:'gold',troops:'recruit',learning:'science'};
 return Object.keys(base).map(resource=>{
  const seatRows=seats.filter(x=>x.resource===resource).map(x=>({seat:x.kind,bonus:x.bonus,amount:base[resource]*x.bonus}));
  const specialists=Object.entries(c.domesticSpecialists).filter(([kind])=>specialistResource[kind]===resource).map(([kind,count])=>({kind,count,bonus:count*trial.specialists.rate,amount:base[resource]*count*trial.specialists.rate}));
  const characters=c.domesticCharacters.filter(kind=>characterResource[kind]===resource).map(kind=>({kind,bonus:trial.characterRate,amount:base[resource]*trial.characterRate}));
  const subtotal=base[resource]+[...seatRows,...specialists,...characters].reduce((n,x)=>n+x.amount,0);
  return {resource,unit:trial.units[resource]??null,people:base[resource]-(land[resource]??0),land:land[resource]??0,seats:seatRows,specialists,characters,securityFactor:v3SecurityFactor(c),otherAndRounding:rates[resource]-subtotal,total:rates[resource]};
 });
}
// 플레이 점검 03 ② · ⑤(10-25): what each policy would change next turn, so 농업 = 성장 우선 is visible before choosing.
// growthGrain = 석 the wanted growth eats from the granary (growthFood each); recruitTarget follows a faction-wide override if set.
export function v3PolicyPreview(s,c){
 const f=s.factions[c.ownerFactionId],row=(p,shown=p)=>{const growth=v3GrowthTarget(s,c,p);return {policy:shown,growth,growthGrain:growth*trial.growthFood,recruitTarget:trial.recruitTargets[f?.recruitTarget]??trial.policyRecruitTargets[p],buildOrder:[...trial.policyOrder[p]]};};
 const out=Object.fromEntries(Object.keys(trial.policyGrowth).map(p=>[p,row(p)]));
 const d=v3DelegatedPolicy(s,c);out.delegated={...row(d,'delegated'),resolvesTo:d};
 return out;
}
export function attachDomesticV3View(s,result,id,{settle}={}){
 if(!domesticV3Enabled(s))return result;
 // Run the real settlement on an isolated snapshot, including stock reserves,
 // field upkeep and growth. This is an estimate with the present world held still.
 const forecast=structuredClone(s);forecast.turn++;forecast.turnNumber=forecast.turn;forecast.globalTick+=200;forecast.currentDate+=10;
 settle(forecast);
 const f=s.factions[id],next=forecast.factions[id];
 // 플레이 점검 03: the first settlement tops up city siege stocks once; show that as a one-time draw, not as the per-turn trend.
 const stock=w=>cities(w).filter(c=>c.ownerFactionId===id).reduce((n,c)=>n+(c.siegeStock??0),0);
 const granaryOneTime=Math.max(0,stock(forecast)-stock(s)),granaryNet=next.granary-f.granary+granaryOneTime;
 result.domesticCrises=crisisView(s);
 // UI-SPEC-V3 [붙일 것] fields: learning, armory, gold upkeep / arrears.
 Object.assign(result,{learning:learningView(s,id),armory:{...(f.armory??{})},goldUpkeep:v3GoldUpkeep(s,id),unpaidTurns:f.unpaidTurns??0});
 Object.assign(result,{granary:f.granary,granaryNet,granaryOneTime,granaryTurnsLeft:granaryNet<0?Math.floor(Math.max(0,f.granary-granaryOneTime)/-granaryNet):null,treasury:f.treasury,treasuryNet:next.treasury-f.treasury,grainBuy:grainBuyView(s,id),domesticStandards:[...f.domesticStandards],domesticPolicyDefault:f.domesticPolicyDefault,domesticUnits:{...trial.units}});
 for(const c of cities(s).filter(c=>c.ownerFactionId===id)){
  const projected=result.ownCities[c.cityId];if(!projected)continue;
  const land=domesticV3Influence(s,c);
  const tilePrice=trial.tilePurchase.price*trial.tilePurchase.repeatFactor**(c.tilesBought??0)*(1+learningModifier(s,id,'TILE_BUY_COST_MOD')/100);
  const specialists=Object.fromEntries(Object.entries(c.domesticSpecialists).map(([kind,count])=>[kind,{count,training:v3Seats(s,c).filter(x=>x.specialist===kind).map(seat=>{
   const basePeriod=seat.active?(seat.statValue>=trial.specialists.fastStat?trial.specialists.fastPeriod:trial.specialists.period):trial.specialists.passivePeriod;
   const period=Math.max(seat.active&&seat.statValue>=trial.specialists.fastStat?2:1,basePeriod+learningModifier(s,id,'SPECIALIST_PERIOD_ADD'));
   const paused=seat.officerId&&!seat.active||seat.kind!=='office'&&!activeFacilities(s,c).some(f=>v3FacilityKind(f)===seat.kind);
   return {seat:seat.kind,turnsLeft:paused?null:Math.max(0,period-(c.domesticTraining[seat.kind]??0))};
  })}]));
  Object.assign(projected,{people:c.people,peopleCapacity:land.capacity,growthNext:forecast.cities[c.cityId].people-c.people,territory:[...c.territory],buyableTiles:expansionCandidates(s,c).map(t=>({tileId:t.tileId,price:tilePrice})),grade:v3Grade(c).id,characters:[...c.domesticCharacters],characterCandidates:v3CharacterCandidates(s,c),seats:v3Seats(s,c).map(x=>({...x,accelerationPercent:x.bonus*100})),specialists,hurryCost:v3HurryCost(s,c),domesticPolicy:{effective:v3Policy(s,c),overridden:c.domesticPolicyOverride!=null||c.domesticPolicy!=null},outputBreakdown:v3OutputBreakdown(s,c,projected.economyForecast),policyPreview:v3PolicyPreview(s,c),resources:resourceView(s,c.cityId),recruit:v3RecruitView(s,c)});
 }
 return result;
}
