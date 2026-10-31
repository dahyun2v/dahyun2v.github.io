import chinaGraph from '../../docs/design-data/map-layout-china-v1-graph.json' with {type:'json'};
import {boardNeighbors,tileId,hexDistance} from './map-primitives.mjs';
import {edgeTicksForSearch} from './movement.mjs';
import {parentTroop} from './campaign-special-troops.mjs';
import {diplomacyHostile} from './campaign-diplomacy.mjs';
import {campaignScenarioRules} from './campaign-scenario-data.mjs';

const ordered=xs=>[...xs].sort((a,b)=>a.localeCompare(b,'en'));
const troops=a=>Math.max(0,a?.troopCount??0);
// Wall-clock observations are deliberately absent from deterministic saves.
export function campaignRecordAiMs(s,timings){
 // Only annotate an existing military record: creating an empty one here would
 // add a save field to profiles that never plan (legacy replays keep exact saves).
 for(const [f,ms] of Object.entries(timings)){const m=s.aiMilitary?.[f];if(!m)continue;Object.defineProperty(m,'ms',{value:ms,writable:true,configurable:true,enumerable:false});}
}
// Same cost/tile ordering as movement.findPath. Sources are independent labels:
// a nearest-source field alone cannot answer a specified army's route query.
function frontier(){
 const heap=[],less=(a,b)=>a.cost-b.cost||a.id.localeCompare(b.id,'en')||a.source.localeCompare(b.source,'en');
 return {get size(){return heap.length;},push(x){let i=heap.length;heap.push(x);while(i){const p=(i-1)>>1;if(less(heap[p],x)<=0)break;heap[i]=heap[p];i=p;}heap[i]=x;},pop(){const first=heap[0],last=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let c=i*2+1;if(c+1<heap.length&&less(heap[c+1],heap[c])<0)c++;if(less(last,heap[c])<=0)break;heap[i]=heap[c];i=c;}heap[i]=last;}return first;}};
}
export function campaignFrontDistanceField(worlds,{destinations=null}={}){
 const queue=frontier(),fields=new Map(),nearest=new Map();
 for(const [source,w] of worlds){const a=w.armies[source];if(!a||!w.tiles[a.tileId])continue;
  fields.set(source,{world:w,cost:edgeTicksForSearch(w,a),dist:new Map([[a.tileId,0]]),previous:new Map(),settled:new Set(),remaining:destinations&&new Set([...destinations].filter(t=>w.tiles[t])),finished:false});queue.push({source,id:a.tileId,cost:0});}
 while(queue.size){const x=queue.pop(),f=fields.get(x.source);if(f.finished||x.cost!==f.dist.get(x.id))continue;f.settled.add(x.id);f.remaining?.delete(x.id);
  const old=nearest.get(x.id);if(!old||x.cost<old.totalTicks)nearest.set(x.id,{armyId:x.source,totalTicks:x.cost});
  if(f.remaining?.size===0){f.finished=true;continue;}
  for(const p of boardNeighbors(f.world.tiles[x.id],f.world.tiles)){const to=tileId(p),cost=f.cost(x.id,to);if(cost===null)continue;const next=x.cost+cost;
   if(next<(f.dist.get(to)??Infinity)){f.dist.set(to,next);f.previous.set(to,x.id);queue.push({source:x.source,id:to,cost:next});}}
 }
 return {nearest,route(source,to){const f=fields.get(source);if(!f)return null;if(!f.settled.has(to))return f.finished?undefined:null;const path=[to];while(f.previous.has(path[0]))path.unshift(f.previous.get(path[0]));return {pathTileIds:path,totalTicks:f.dist.get(to)};}};
}

export function campaignCityGraph(s,v,route,memory={}){
 if(s.mapId==='china'){
  // The three registered capitals have scenario aliases. Match by public tile.
  const aliases=new Map(Object.values({...v.knowledge.cities,...v.ownCities}).map(c=>[c.tileId,c.cityId]));
  const ids=new Map(chinaGraph.nodes.map(n=>[n.id,aliases.get((n.at??[]).join(','))??n.id]));
  return {edges:chinaGraph.edges.map(e=>({...e,a:ids.get(e.a)??e.a,b:ids.get(e.b)??e.b}))};
 }
 // Build from public, known routes only. Newly discovered cities extend the table;
 // unknown terrain never gets probed to manufacture a strategic connection.
 const graph=structuredClone(memory.cityGraph??{edges:[],pairs:[]}),seen=new Set(graph.pairs),cities=Object.values({...v.knowledge.cities,...v.ownCities}).sort((a,b)=>a.cityId.localeCompare(b.cityId));
 const templates=Object.values(v.ownArmies),infantry=templates.find(a=>parentTroop(a.troopType)!=='cavalry')??templates[0],horse=templates.find(a=>parentTroop(a.troopType)==='cavalry')??infantry,normal=infantry&&{...infantry,troopType:'spear'},cavalry=horse&&{...horse,troopType:'cavalry'};
 for(let i=0;i<cities.length;i++)for(let j=i+1;j<cities.length;j++){
  const a=cities[i],b=cities[j],key=`${a.cityId}|${b.cityId}`;if(seen.has(key)||!normal)continue;
  // A failed infantry route never contributes an edge. Its cavalry probe was
  // discarded as well; do not perform that second read-only search at all.
  const r=route(a,b,normal);if(!r)continue;const c=route(a,b,cavalry);
  graph.edges.push({a:a.cityId,b:b.cityId,turnsInfantry:r.totalTicks/s.time.ticksPerTurn,turnsCavalry:(c??r).totalTicks/s.time.ticksPerTurn,path:r.pathTileIds,passes:[],chokes:[],bridges:[]});graph.pairs.push(key);
 }
 return graph;
}
export function campaignCityDistances(graph,starts,cavalry=false){
 const edges=new Map();for(const e of graph.edges){for(const [a,b] of [[e.a,e.b],[e.b,e.a]]){if(!edges.has(a))edges.set(a,[]);edges.get(a).push({to:b,cost:e[cavalry?'turnsCavalry':'turnsInfantry']});}}
 const dist=new Map(starts.map(id=>[id,0])),queue=frontier();for(const id of starts)queue.push({source:'',id,cost:0});
 while(queue.size){const x=queue.pop();if(x.cost!==dist.get(x.id))continue;for(const e of edges.get(x.id)??[]){const cost=x.cost+e.cost;if(cost<(dist.get(e.to)??Infinity)){dist.set(e.to,cost);queue.push({source:'',id:e.to,cost});}}}return dist;
}
export function campaignStrategyReview(s,v,memory,crisis=false){
 const cities=Object.values({...v.knowledge.cities,...v.ownCities}).map(c=>`${c.cityId}:${c.ownerFactionId??'-'}`).sort();
 const pairs=Object.entries(s.c43?.pairs??{}).filter(([k])=>k.split('|').includes(v.factionId)).map(([k,p])=>`${k}:${p.state}:${p.until??''}:${Number(p.until<s.turn)}`).sort();
 const contacts=[...new Set(Object.values({...v.knowledge.lastSeenArmies,...v.knowledge.observedArmies}).filter(a=>s.turn-(a.lastSeen?.turn??a.lastSeenTurn??s.turn)<=3&&v.tiles?.[a.tileId]&&Object.values(v.ownCities).some(c=>v.tiles[c.tileId]&&hexDistance(v.tiles[a.tileId],v.tiles[c.tileId])<=3)).map(a=>a.factionId))].sort();
 const signature=JSON.stringify([cities,pairs,contacts,crisis]);
 const offset=Number(v.factionId.replace(/\D/g,''))||0;
 const due=!memory?.frontStrategy||memory.frontSignature!==signature||((s.turn+offset)%3===0&&memory.frontStrategy.turn!==s.turn);
 return {due,signature,reason:!memory?.frontStrategy?'INITIAL':memory.frontSignature!==signature?'EVENT':'PERIODIC'};
}
export function campaignFrontPause(previous,ratio,{crisis=false,supplied=true}={}){
 const reason=crisis?'DEFENSE_CRISIS':!supplied?'SUPPLY':null;
 const paused=!!reason;
 return {paused,pauseReason:reason??(paused?previous?.pauseReason??'FORCE_RATIO':null)};
}
// Troop budgets and indivisible army assignments are both exposed. Residents
// satisfy their own minimum before any cross-front reinforcement is considered.
export function campaignAllocateFronts(fronts,units,{previous={},turn=1,reserveEligible=()=>true,reserveDistances={}}={}){
 const rows=fronts.map(f=>({...f,armyIds:[],allocated:0})),available=new Set(units.map(a=>a.armyId)),byId=new Map(units.map(a=>[a.armyId,a]));
 const total=units.reduce((n,a)=>n+troops(a),0),transferCaps=new Map(),transfers=new Map(),take=(f,a)=>{
  const source=Object.values(previous).find(p=>p.id!==f.id&&p.armyIds?.includes(a.armyId));
  if(source&&transferCaps.has(f.id)&&(transfers.get(f.id)??0)+troops(a)>transferCaps.get(f.id))return false;
  available.delete(a.armyId);f.armyIds.push(a.armyId);f.allocated+=troops(a);if(source)transfers.set(f.id,(transfers.get(f.id)??0)+troops(a));return true;
 };
 // Preserve previous residents where possible. Transfers may never strip a
 // source below its minimum, including when a newly urgent front sorts first.
 for(const f of rows)for(const id of previous[f.id]?.armyIds??[]){const a=byId.get(id);if(a&&available.has(id)&&f.allocated<f.minimum)take(f,a);}
 const urgent=[...rows].sort((a,b)=>b.minimum-a.minimum||a.id.localeCompare(b.id));
 for(const f of urgent)for(const a of units)if(available.has(a.armyId)&&f.homeArmyIds?.includes(a.armyId)&&f.allocated<f.minimum)take(f,a);
 for(const f of urgent){let transferred=0;const transferLimit=Math.max(0,f.minimum-f.allocated)*.5;if(f.minimum>0)transferCaps.set(f.id,transferLimit);
  for(const a of [...units].sort((a,b)=>(f.arrivals?.[a.armyId]??Infinity)-(f.arrivals?.[b.armyId]??Infinity)||a.armyId.localeCompare(b.armyId))){
   const source=Object.values(previous).find(p=>p.id!==f.id&&p.armyIds?.includes(a.armyId));
   if(!available.has(a.armyId)||f.allocated>=f.minimum||source&&transferred+troops(a)>transferLimit)continue;
   if(take(f,a)&&source)transferred+=troops(a);
  }
 }
 for(const f of rows)f.minimumArmyIds=[...f.armyIds];
 const crisis=rows.some(f=>f.critical&&f.allocated<f.minimum),allMinimum=rows.every(f=>f.allocated>=f.minimum);
 // Round toward zero for indivisible armies: never reserve the last offensive
 // army merely to approximate a 10% budget (two starting armies => zero).
 const reserve=[],reserveBudget=total*.1;let reserved=0;
 for(const a of [...units].sort((a,b)=>(reserveDistances[a.armyId]??Infinity)-(reserveDistances[b.armyId]??Infinity)||a.armyId.localeCompare(b.armyId)))if(available.has(a.armyId)&&reserveEligible(a)&&reserved+troops(a)<=reserveBudget){available.delete(a.armyId);reserve.push(a.armyId);reserved+=troops(a);}
 const candidates=rows.filter(f=>f.opportunity>0&&f.hostile&&!(previous[f.id]?.role==='DEFEND'&&previous[f.id]?.threat>0)).sort((a,b)=>{
  const score=f=>(f.opportunity-f.threat)*(previous[f.id]?.role==='ATTACK'&&turn-(previous[f.id]?.chosenTurn??0)<3?1.25:1)*((previous[f.id]?.stalledTurns??0)>=3?.25:1);
  return score(b)-score(a)||a.id.localeCompare(b.id);
 });
 const locked=candidates.find(f=>previous[f.id]?.role==='ATTACK'&&turn-(previous[f.id]?.chosenTurn??0)<3&&(previous[f.id]?.stalledTurns??0)<3);
 const primary=locked??candidates[0];
 for(const f of rows)f.role=f.threat>0?'DEFEND':'QUIET';
 if(primary&&!crisis){primary.role='ATTACK';const demand=Math.max(primary.minimum,(primary.enemyTroops??0)*1.1,total*.6);for(const a of units)if(available.has(a.armyId)&&primary.allocated<demand)take(primary,a);}
 // Wish defense is capped at half the field army, never reducing minimums.
 const wish=rows.filter(f=>f.role==='DEFEND'),extra=wish.reduce((n,f)=>n+Math.max(0,f.desired-f.minimum),0),scale=extra?Math.min(1,Math.max(0,total*.5-wish.reduce((n,f)=>n+f.minimum,0))/extra):0;
 for(const f of wish){f.desired=f.minimum+(f.desired-f.minimum)*scale;for(const a of units)if(available.has(a.armyId)&&f.allocated<f.desired)take(f,a);}
 const secondary=candidates.find(f=>f!==primary),operationLimit=crisis?0:primary?allMinimum&&(secondary||(primary.cityIds?.length??0)>1)?2:1:0;
 // The existing r9 splitter controls surplus units within the attack fronts.
 if(operationLimit===2&&secondary)secondary.role='ATTACK';
 if(primary&&!crisis)for(const a of units)if(available.has(a.armyId))take(operationLimit===2&&secondary?secondary:primary,a);
 for(const f of rows){f.chosenTurn=previous[f.id]?.role===f.role?previous[f.id]?.chosenTurn??turn:turn;Object.assign(f,campaignFrontPause(previous[f.id],f.allocated/Math.max(1,f.enemyTroops??0),{crisis,supplied:f.supplied!==false}));}
 return {fronts:rows,reserveArmyIds:reserve,reserveTroops:reserved,unassignedArmyIds:[...available],crisis,operationLimit};
}

export function campaignBuildFronts(s,v,graph,{previous={},netThreat,targets=[],active=()=>true}={}){
 const units=Object.values(v.ownArmies).filter(a=>troops(a)>0&&a.morale!=='ROUTING'&&active(a)),own=Object.values(v.ownCities),cities=Object.values(v.knowledge.cities),ownIds=own.map(c=>c.cityId),cavalry=units.filter(a=>parentTroop(a.troopType)==='cavalry').reduce((n,a)=>n+troops(a),0)>units.reduce((n,a)=>n+troops(a),0)/2;
 const distances=campaignCityDistances(graph,ownIds,cavalry),direct=new Set(graph.edges.filter(e=>ownIds.includes(e.a)||ownIds.includes(e.b)).flatMap(e=>[e.a,e.b]));
 const ranking=new Map();for(const c of Object.values({...v.knowledge.cities,...v.ownCities}))if(c.ownerFactionId){const row=ranking.get(c.ownerFactionId)??{id:c.ownerFactionId,major:0,minor:0};row[c.kind==='minor'?'minor':'major']++;ranking.set(row.id,row);}
 const leader=[...ranking.values()].sort((a,b)=>b.major-a.major||b.minor-a.minor||a.id.localeCompare(b.id))[0]?.id;
 const observations=Object.values({...v.knowledge.lastSeenArmies,...v.knowledge.observedArmies}),neighbors=new Set(cities.filter(c=>c.ownerFactionId!==v.factionId&&(direct.has(c.cityId)||(distances.get(c.cityId)??Infinity)<=2.5||c.ownerFactionId===null)).map(c=>c.ownerFactionId??'NEUTRAL'));
 for(const a of observations)if(a.factionId!==v.factionId&&s.turn-(a.lastSeen?.turn??a.lastSeenTurn??s.turn)<=3&&v.tiles[a.tileId]&&own.some(c=>hexDistance(v.tiles[a.tileId],v.tiles[c.tileId])<=3))neighbors.add(a.factionId);
 const fronts=[];
 for(const id of ordered(neighbors)){
  const factionId=id==='NEUTRAL'?null:id,hostile=!factionId||diplomacyHostile(s,v.factionId,factionId),pair=s.c43?.pairs?.[[v.factionId,factionId].sort().join('|')],threatActive=hostile||pair?.state==='TRUCE'&&pair.until-s.turn<=1;
  const enemyCities=cities.filter(c=>c.ownerFactionId===factionId),border=own.filter(c=>graph.edges.some(e=>(e.a===c.cityId&&enemyCities.some(x=>x.cityId===e.b))||(e.b===c.cityId&&enemyCities.some(x=>x.cityId===e.a)))),defendCities=border.length?border:own;
  const net=threatActive?netThreat(factionId,defendCities):{minimum:0,enemyTroops:0};
  const positions=graph.edges.filter(e=>defendCities.some(c=>c.cityId===e.a||c.cityId===e.b)).filter(e=>e.passes?.length||e.chokes?.length||e.bridges?.length).flatMap(e=>e.path??[]).map(p=>Array.isArray(p)?p.join(','):p).filter(t=>v.knowledge.tiles[t]&&v.knowledge.tiles[t]!=='UNEXPLORED');
  const choices=targets.filter(t=>enemyCities.some(c=>c.cityId===t.cityId)),contain=factionId&&(leader===factionId||(s.c43?.axes?.threat?.[factionId]??0)>=50),containmentBonus=contain?(campaignScenarioRules(s).unificationMajorCities-(ranking.get(factionId)?.major??0)<=2?3:1.5):1;
  const opportunity=hostile?choices.reduce((n,t)=>n+Math.max(0,t.score??0),0)*containmentBonus:0;
  const enemyTroops=Object.values(v.knowledge.observedArmies).filter(a=>a.factionId===factionId&&v.knowledge.tiles[a.tileId]==='VISIBLE').reduce((n,a)=>n+troops(a),0);
  fronts.push({id,factionId,hostile,cityIds:enemyCities.map(c=>c.cityId),defendCityIds:defendCities.map(c=>c.cityId),defensePositions:[...new Set(positions)],threat:net.minimum+(threatActive?(s.c43?.axes?.threat?.[factionId]??0)*.01:0),minimum:net.minimum,desired:net.minimum+(net.minimum>0&&defendCities.some(c=>c.kind==='major'||positions.length)?net.minimum*.25:0),enemyTroops,critical:defendCities.some(c=>c.kind==='major'||c.cityId===v.faction.capitalCityId),opportunity,containmentBonus,supplied:!choices.length||choices.some(t=>t.supplyRatio===undefined||t.supplyRatio>0),homeArmyIds:units.filter(a=>defendCities.some(c=>hexDistance(v.tiles[a.tileId],v.tiles[c.tileId])<=1)).map(a=>a.armyId)});
 }
 const core=own.find(c=>c.cityId===v.faction.capitalCityId)??own[0],reserveDistances=Object.fromEntries(units.map(a=>[a.armyId,core?hexDistance(v.tiles[a.tileId],v.tiles[core.tileId]):Infinity]));
 const reserveEligible=a=>!Object.values(v.knowledge.observedArmies).some(b=>v.knowledge.tiles[b.tileId]==='VISIBLE'&&diplomacyHostile(s,v.factionId,b.factionId)&&hexDistance(v.tiles[a.tileId],v.tiles[b.tileId])<=2)&&!cities.some(c=>c.ownerFactionId!==v.factionId&&diplomacyHostile(s,v.factionId,c.ownerFactionId)&&hexDistance(v.tiles[a.tileId],v.tiles[c.tileId])<=2);
 return {...campaignAllocateFronts(fronts,units,{previous,turn:s.turn,reserveEligible,reserveDistances}),distances};
}
