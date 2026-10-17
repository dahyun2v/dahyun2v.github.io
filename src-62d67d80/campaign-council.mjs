import C195 from '../data/c195-trial-v0.1.json' with {type:'json'};
import {troopText} from './troop-display.mjs';
import data from '../../docs/design-data/council-v0.1.json' with {type:'json'};
import {getFactionView} from './knowledge.mjs';
import {campaignBannerView,combatMovement} from './campaign-rule-registry.mjs';
import {campaignAiPlan,campaignCityTargetScore,campaignCityDefense,selectCampaignAiJobs} from './campaign-strategic-bridge.mjs';
import {selectAiRoster} from './campaign-roster.mjs';
import {CITY_JOBS,cityEconomyRates,campaignFoodNeed,cityJobCost} from './campaign-economy.mjs';
import {startDiplomacyAi,canProposeDiplomacy,diplomacyHostile,diplomacyMoveReason} from './campaign-diplomacy.mjs';
import {supplyEnabled,supplyView,supplyAiHubSite,beginHub} from './campaign-supply.mjs';
import {campaignReachable} from './campaign-morale.mjs';
import {castleArmyActive,campaignMovementWorld} from './campaign-city-footprint.mjs';
import {findPath,edgeTicks} from './movement.mjs';
import {campaignSubAbility} from './campaign-abilities.mjs';
import {C20_FACILITIES} from './campaign-policy.mjs';
import {gainRelation,relation} from './campaign-relations.mjs';
import {officerClass,CLASS_ABILITIES} from './campaign-classes.mjs';
import {creditCampaignGrowth} from './campaign-growth.mjs';
import {explorationEnabled,explorationView} from './campaign-exploration.mjs';
import {troopInfo} from './campaign-special-troops.mjs';
import {hexDistance} from './map-primitives.mjs';

export const COUNCIL=data;
export const COUNCIL_ADOPTION_AFFINITY=C195.council.adoptionAffinity;
export const councilEnabled=s=>['v2','v3'].includes(s.mapId)&&!s.councilDisabled;
const own=s=>s.playerFactionId;
const ruler=s=>s.factions[own(s)].rulerId;
const cityName=(s,id)=>s.cityDisplayNames?.[id]??s.cities[id]?.name??'—';
const officerName=(s,id)=>s.officers[id]?.name??'—';
const factionName=(s,id)=>s.factions[id]?.name??'—';
export function format(line,values){
 const missing=key=>values[key]==null||String(values[key]).trim()==='';
 const clauses=line.split(' · ');
 const kept=clauses.length>1?clauses.filter(clause=>![...clause.matchAll(/\{([^}]+)\}/g)].some(([,key])=>missing(key))):clauses;
 return kept.map(clause=>clause
  .replace(/\{([^}]+)\}[ \t]*/g,(token,key)=>missing(key)?'':token)
  .replace(/\{([^}]+)\}(으로|이라|이|가|을|를|은|는|과|와|로|라)?/g,(_,key,particle='')=>{
   const value=String(values[key]),last=value.charCodeAt(value.length-1);
   if(last<0xac00||last>0xd7a3)return value+particle;
   const final=(last-0xac00)%28;
   const pair={이:['가','이'],가:['가','이'],을:['를','을'],를:['를','을'],은:['는','은'],는:['는','은'],과:['와','과'],와:['와','과'],으로:['로','으로'],로:['로','으로'],이라:['라','이라'],라:['라','이라']}[particle];
   return value+(pair?pair[particle==='으로'||particle==='로'?Number(final!==0&&final!==8):Number(final!==0)]:particle);
  }).trim()).filter(Boolean).join(' · ')||'—';
}
const eligible=(s,o)=>o.allegianceFactionId===own(s)&&o.officerId!==ruler(s)&&o.lifeState==='ALIVE'&&o.captivityState==='FREE'&&!o.injury;
export function councilCandidates(s){return Object.values(s.officers).filter(o=>eligible(s,o)).sort((a,b)=>b.baseStats.intelligence-a.baseStats.intelligence||a.officerId.localeCompare(b.officerId));}
export function initializeCouncil(s){
 if(councilEnabled(s))s.council??={turn:0,status:'CLOSED',strategistId:null,candidates:[],report:[],proposals:[],resolutions:[],advisorLine:null,appointmentUsed:false};
 return s;
}
function publicContext(s){
 const v=campaignBannerView(s,getFactionView(s,own(s)));
 const cities=Object.values(v.ownCities),armies=Object.values(v.ownArmies).filter(a=>castleArmyActive(s,a));
 const enemies=Object.values(v.knowledge.observedArmies).filter(a=>v.knowledge.tiles[a.tileId]==='VISIBLE'&&diplomacyHostile(s,own(s),a.factionId));
 return {v,cities,armies,enemies};
}
function arrivalTurns(s,v,a,destination){
 if(!s.armies[a.armyId]||!castleArmyActive(s,s.armies[a.armyId]))return Infinity;
 const publicWorld={...s,armies:Object.fromEntries(Object.values({...v.ownArmies,...v.knowledge.observedArmies}).map(b=>[b.armyId,{...s.armies[b.armyId],...b,hp:b.hp??1,troopCount:b.troopCount??1}])),cities:Object.fromEntries(Object.values({...v.ownCities,...v.knowledge.cities}).filter(c=>s.castleKnowledge?.[v.factionId]?.[c.cityId]).map(c=>[c.cityId,{...c,...s.castleKnowledge[v.factionId][c.cityId]}]))};
 const world=campaignMovementWorld(publicWorld,a.armyId);world.tiles=Object.fromEntries(Object.entries(s.tiles).filter(([id])=>['VISIBLE','REMEMBERED'].includes(v.knowledge.tiles[id])));
 if(!world.tiles[a.tileId]||!world.tiles[destination])return Infinity;const path=findPath(world,a.armyId,destination);if(!path||path.pathTileIds.slice(1).some((to,i)=>diplomacyMoveReason(s,a.armyId,to,path.pathTileIds[i])))return Infinity;
 const max=combatMovement(s,a.armyId).max,budget=s.time.ticksPerTurn;let turns=1,ticks=0,steps=0;
 for(let i=1;i<path.pathTileIds.length;i++){
  const cost=edgeTicks(world,world.armies[a.armyId],path.pathTileIds[i-1],path.pathTileIds[i]);if(cost===null||cost>budget||max<1)return Infinity;
  if(ticks+cost>budget||steps>=max){turns++;ticks=0;steps=0;}ticks+=cost;steps++;
 }
 return turns;
}
export function councilReport(s,{foresight=true}={}){
 const {v,cities,armies,enemies}=publicContext(s),found=new Map(),put=(id,values)=>{if(!found.has(id))found.set(id,format(data.report.topics.find(t=>t.id===id).line,values));};
 for(const c of cities)for(const a of enemies)if(hexDistance(s.tiles[c.tileId],s.tiles[a.tileId])<=6)put('THREAT',{'성':cityName(s,c.cityId),'세력':factionName(s,a.factionId),'병력':troopText(a.troopCount)});
 if(supplyEnabled(s))for(const a of armies){const supply=supplyView(s,s.armies[a.armyId]);if(supply.state==='STARVING')put('STARVING',{'부대장':officerName(s,a.commanderId)});else if(supply.state==='CUT')put('SUPPLY_CUT',{'부대장':officerName(s,a.commanderId),n:Math.floor(supply.turnsLeft)});}
 const delta=cities.reduce((n,c)=>n+cityEconomyRates(s,s.cities[c.cityId]).food-campaignFoodNeed(s,s.cities[c.cityId]),0)-(supplyEnabled(s)?armies.reduce((n,a)=>n+(supplyView(s,s.armies[a.armyId]).perTurn??0),0):0);
 if(delta<0)put('FOOD',{n:Math.ceil(cities.reduce((n,c)=>n+c.foodStock,0)/-delta)});
 const pending=s.c43?.proposals.find(p=>p.to===own(s)&&p.status==='PENDING');
 const threatening=Object.keys(s.factions).find(f=>f!==own(s)&&(s.c43?.axes.threat[f]??0)>=50);
 const diplomacyLine=data.report.topics.find(t=>t.id==='DIPLOMACY').line.split(' / ');
 if(pending)found.set('DIPLOMACY',format(diplomacyLine[0],{'세력':factionName(s,pending.from),'제안':pending.kind==='TRUCE'?'휴전':'동맹'}));
 else if(threatening||(s.c43?.axes.trust[own(s)]??30)<30)found.set('DIPLOMACY',format(diplomacyLine[1],{'세력':factionName(s,threatening??own(s))}));
 for(const c of Object.values(v.knowledge.cities).filter(c=>v.knowledge.tiles[c.tileId]==='VISIBLE'&&c.ownerFactionId!==own(s)&&diplomacyHostile(s,own(s),c.ownerFactionId)))for(const a of armies){
  const destinations=s.castleKnowledge?.[own(s)]?.[c.cityId]?.footprint.gates??[c.tileId];
  if(campaignCityDefense(s,v,c)<a.troopCount&&destinations.some(t=>arrivalTurns(s,v,a,t)<=2))put('OPPORTUNITY',{'성':cityName(s,c.cityId)});
 }
 for(const c of cities)if((c.securityLevel??0)>0)put('SECURITY',{'성':cityName(s,c.cityId)});
 for(const o of Object.values(s.officers).filter(o=>o.allegianceFactionId===own(s)&&o.lifeState==='ALIVE'))if(o.injury||(o.fatigue??0)>=60)put('AVAILABILITY',{'장수':o.name});
 if(!found.size)put('CALM',{});
 const topics=data.report.topics.filter(t=>found.has(t.id)).slice(0,data.report.maxLines),lines=topics.map(t=>found.get(t.id));
 const strategist=councilCandidates(s).find(o=>o.officerId===s.council?.strategistId)??councilCandidates(s)[0];
 if(foresight&&strategist?.baseStats.intelligence>=data.strategist.foresight.intelligenceAtLeast){
  const largest=[...enemies].sort((a,b)=>b.troopCount-a.troopCount||a.armyId.localeCompare(b.armyId))[0];
  if(largest){
   // Predict only a target already visible/known to the player. The enemy AI's
   // public snapshot is evaluated on a clone; no hidden army enters the line.
   const enemyView=campaignBannerView(s,getFactionView(s,largest.factionId));
   const targets=Object.values(enemyView.knowledge.cities).filter(c=>c.ownerFactionId!==largest.factionId&&diplomacyHostile(s,largest.factionId,c.ownerFactionId)).sort((a,b)=>campaignCityTargetScore(s,enemyView,b)-campaignCityTargetScore(s,enemyView,a)||a.cityId.localeCompare(b.cityId));
   const target=targets[0];
   if(target&&(v.ownCities[target.cityId]||v.knowledge.cities[target.cityId]))lines.push(format(data.strategist.foresight.line,{'세력':factionName(s,largest.factionId),'부대장':officerName(s,largest.commanderId),'성':cityName(s,target.cityId)}));
  }
 }
 return {lines,topicIds:topics.map(t=>t.id)};
}

// Native AI ordering is retained for judgments which have no numerical score.
// A cross-kind score and a siege-duration forecast are not present in v0.1.
export function councilProposals(s){
 const sandbox=structuredClone(s),{v,cities}=publicContext(sandbox),fid=own(s),plan=campaignAiPlan(sandbox,fid),pool=[],skippedKinds=[];
 const add=(kind,target,preferredId,values={},score=null)=>pool.push({kind,target,preferredId,values,score});
 const targetCity=v.knowledge.cities[plan?.goal?.targetCityId];
 for(const c of plan?.candidates??[]){
  const a=sandbox.armies[c.armyId];if(!a||!castleArmyActive(sandbox,a)||!eligible(sandbox,sandbox.officers[a.commanderId]))continue;
  if(c.reasonCode==='EXPLORE_PLACE'){
   // The AI exposes the selected destination but not the ultimate place ID.
   // Only an unambiguous arrival can be adapted without inventing a selector.
   const place=explorationEnabled(sandbox)&&explorationView(sandbox,fid).places.find(p=>p.tileId===c.destinationTileId&&!['UNKNOWN','RESOLVED','PENDING'].includes(p.status));
   if(place)add('EXPLORE',{placeId:place.placeId,armyId:a.armyId},a.commanderId,{'부대장':officerName(s,a.commanderId),'장소':place.label});else if(!skippedKinds.includes('EXPLORE'))skippedKinds.push('EXPLORE');
  }
  if(c.reasonCode==='DEFEND_DAMAGED_CITY'||c.reasonCode==='C31_FORTRESS'){
   const city=cities.find(city=>city.tileId===c.destinationTileId||city.cityId===c.crisisTargetCityId);
   if(city)add('DEFEND_CITY',{cityId:city.cityId,armyId:a.armyId},a.commanderId,{'부대장':officerName(s,a.commanderId),'성':cityName(s,city.cityId),'병력':publicContext(s).enemies.filter(e=>hexDistance(s.tiles[e.tileId],s.tiles[city.tileId])<=6).reduce((n,e)=>n+e.troopCount,0)});else if(!skippedKinds.includes('DEFEND_CITY'))skippedKinds.push('DEFEND_CITY');
  }else if(targetCity&&!['CAPITAL_GARRISON','REPLENISH_ARMY','MUSTER_SIEGE','EXPLORE_PLACE','WITHDRAWAL'].includes(c.reasonCode))add('ATTACK_CITY',{cityId:targetCity.cityId,armyId:a.armyId},a.commanderId,{'부대장':officerName(s,a.commanderId),'성':cityName(s,targetCity.cityId),d:s.castleKnowledge?.[fid]?.[targetCity.cityId]?.durability},campaignCityTargetScore(sandbox,v,targetCity));
  if(targetCity){const site=supplyAiHubSite(sandbox,a.armyId,campaignReachable(sandbox,a.armyId,s.time.ticksPerTurn),targetCity.cityId);if(site){const preview=structuredClone(sandbox);preview.armies[a.armyId].tileId=site;beginHub(preview,a.armyId);add('BUILD_HUB',{tileId:site,armyId:a.armyId},null,{'부대장':officerName(s,a.commanderId),n:preview.supply.pending[a.armyId].cost});}}
 }
 selectCampaignAiJobs(sandbox,fid);
 for(const city of cities){const job=sandbox.cities[city.cityId].currentProduction,old=s.cities[city.cityId].currentProduction;if(!job||JSON.stringify(job)===JSON.stringify(old))continue;
  if(job.kind==='muster')add('MUSTER',{cityId:city.cityId,officerId:job.officerId,troopType:job.troopType},job.officerId,{'성':cityName(s,city.cityId),'장수':officerName(s,job.officerId),'병종':troopInfo(s,job.troopType).troopDisplayName});
  else if(!['recruit','repair','reorganize'].includes(job.kind))add('CITY_DEVELOP',{cityId:city.cityId,facility:job.kind},null,{'성':cityName(s,city.cityId),'시설':CITY_JOBS[job.kind].name,'효과':C20_FACILITIES[job.kind]?.description,n:cityJobCost(s,s.cities[city.cityId],job.kind)});
 }
 const beforeDip=sandbox.c43?.sequence??0;startDiplomacyAi(sandbox,fid);
 for(const p of sandbox.c43?.proposals??[])if(p.from===fid&&Number(p.id.split('.').at(-1))>beforeDip){const check=canProposeDiplomacy(s,fid,p.to,p.kind);if(check.ok&&check.score>=0)add('DIPLOMACY',{factionId:p.to,kind:p.kind},null,{'세력':factionName(s,p.to),'휴전·동맹':p.kind==='TRUCE'?'휴전':'동맹'},check.score);}
 const beforeRecruit=new Set(Object.keys(sandbox.captiveRecruitment?.proposals??{}));selectAiRoster(sandbox,fid);
 for(const [id,p] of Object.entries(sandbox.captiveRecruitment?.proposals??{}))if(!beforeRecruit.has(id)&&p.factionId===fid&&v.knowledge.tiles[s.cities[p.candidateSourceRef]?.tileId]==='VISIBLE')add('RECRUIT',{cityId:p.candidateSourceRef,officerId:p.targetOfficerId},null,{'성':cityName(s,p.candidateSourceRef),'장수':s.wanderers?.[p.targetOfficerId]?.name,n:p.cost});
 const used=new Set(),kinds=new Set(),proposals=[];
 pool.sort((a,b)=>(b.score??-Infinity)-(a.score??-Infinity));
 for(const candidate of pool){if(kinds.has(candidate.kind))continue;
  const axis={CITY_DEVELOP:'politics',DIPLOMACY:'charisma',RECRUIT:'charisma'}[candidate.kind];
  const ranked=councilCandidates(s).sort((a,b)=>candidate.kind==='BUILD_HUB'?campaignSubAbility(s,b.officerId,'정무','병참')-campaignSubAbility(s,a.officerId,'정무','병참'):axis?b.baseStats[axis]-a.baseStats[axis]:Number(b.officerId===candidate.preferredId)-Number(a.officerId===candidate.preferredId));
  const proposer=candidate.preferredId?ranked.find(o=>o.officerId===candidate.preferredId&&!used.has(o.officerId)):ranked.find(o=>!used.has(o.officerId));if(!proposer)continue;
  const spec=data.proposals.kinds[candidate.kind],values=candidate.values;
  const missing=[...new Set([spec.what,spec.expected,spec.risk].join(' ').match(/\{[^}]+\}/g)??[])].map(k=>k.slice(1,-1)).filter(k=>values[k]===undefined);
  const risk=candidate.kind==='ATTACK_CITY'?spec.risk.split(' / ')[campaignCityDefense(s,v,v.knowledge.cities[candidate.target.cityId])>s.armies[candidate.target.armyId].troopCount?1:0]:spec.risk;
  proposals.push({id:`COUNCIL.${s.turn}.${proposals.length+1}`,kind:candidate.kind,proposerId:proposer.officerId,target:candidate.target,what:format(spec.what,values),expected:format(spec.expected,values),risk:format(risk,values),decision:null,score:candidate.score,unavailableFields:missing});used.add(proposer.officerId);kinds.add(candidate.kind);
  if(proposals.length===data.proposals.count)break;
 }
 return {proposals,skippedKinds,limitations:['종류 간 공통 점수 미제공','함락 예상 차례 미제공','탐험 AI 반환값에 원거리 장소 대상 미제공','잘린 방어 경로의 성 대상 미제공']};
}
// Deterministic opinions use only existing officer traits, class and relationship.
export function councilOpinions(s,proposal){
 const cfg=C195.council,peace=['CITY_DEVELOP','DIPLOMACY','RECRUIT','BUILD_HUB'].includes(proposal.kind),axis=peace?'politics':'leadership';
 const attendees=councilCandidates(s).filter(o=>o.officerId!==proposal.proposerId).slice(0,cfg.attendees);
 return [{officerId:proposal.proposerId,stance:'FOR',reason:'이 안건을 제안했습니다.'},...attendees.map(o=>{
  const assigned=officerClass(s,o.officerId),classTags=CLASS_ABILITIES.filter(c=>[assigned?.primaryId,assigned?.secondaryId].includes(c.id)).flatMap(c=>c.draftTags??[]);
  const tags=[o.rolePrimary,o.roleSecondary,...classTags,...(o.tags??[]),...(o.personalityTags??[])].filter(Boolean).join(' ');
  const affinity=relation(s,ruler(s),o.officerId).value;
  const martial=/무용|지휘|무장|공격|용맹|전투|war|martial/i.test(tags),civil=/정무|지략|민정|신중|문관|civil|scholar/i.test(tags);
  const tag=(peace?Number(civil)-Number(martial):Number(martial)-Number(civil))*cfg.tagWeight;
  const experience=((o.baseStats[axis]??cfg.axisNeutral)-cfg.axisNeutral)*cfg.axisWeight,bond=(affinity-cfg.bondNeutral)*cfg.bondWeight,score=experience+bond+tag;
  const support=score>=cfg.supportThreshold;
  const driver=[{value:tag,label:'계통과 성향'},{value:bond,label:'군주와의 관계'},{value:experience,label:peace?'내정 경험':'지휘 경험'}].sort((a,b)=>Math.abs(b.value)-Math.abs(a.value)).find(x=>support?x.value>=0:x.value<0);
  const reason=`${driver?.label??'능력과 관계'}를 바탕으로 ${support?'실행할 만하다고 봅니다':'준비가 더 필요하다고 봅니다'}.`;
  return {officerId:o.officerId,stance:support?'FOR':'AGAINST',reason};
 })];
}
export function councilOpinionView(s){const c=structuredClone(s.council);for(const p of c.proposals)p.opinions=councilOpinions(s,p);return c;}
function award(s,id,amount,eventId){if(s.campaignGrowth?.officers[id])creditCampaignGrowth(s,{eventId,officerId:id,kind:'GOVERNOR_TURN',amount,fixed:true});}
export function startCouncilTurn(s){
 if(!councilEnabled(s)||s.phase!=='PLAYER'||s.gameResult)return s;initializeCouncil(s);
 if((s.turn-1)%3!==0){s.council.advisorLine=councilReport(s,{foresight:false}).lines[0]??null;return s;}
 if(s.council.turn===s.turn)return s;
 closeCouncil(s);
 const candidates=councilCandidates(s),valid=candidates.some(o=>o.officerId===s.council.strategistId),result=councilProposals(s);
 Object.assign(s.council,{turn:s.turn,status:'OPEN',strategistId:valid?s.council.strategistId:candidates[0]?.officerId??null,candidates:valid?[]:candidates.slice(0,3).map(o=>o.officerId),appointmentUsed:false,experienceGranted:false,advisorLine:null,...result});
 const report=councilReport(s);s.council.report=report.lines;s.council.reportTopicIds=report.topicIds;
 return s;
}
function councilExperience(s){const c=s.council;if(!c.experienceGranted&&c.strategistId){award(s,c.strategistId,data.strategist.perCouncilExperience,`COUNCIL.${c.turn}.STRATEGIST`);c.experienceGranted=true;}}
export function closeCouncil(s){const c=s.council;if(!c||c.status!=='OPEN')return s;for(const p of c.proposals)if(p.decision===null)p.decision='HOLD';councilExperience(s);c.status='CLOSED';return s;}
export function councilCommand(s,cmd){
 initializeCouncil(s);const c=s.council;if(!c||s.phase!=='PLAYER'||s.gameResult||c.status!=='OPEN'||c.turn!==s.turn)throw new Error('COUNCIL_NOT_OPEN');
 if(cmd.type==='COUNCIL_CLOSE')return closeCouncil(s);
 if(cmd.type==='COUNCIL_APPOINT'){
  if(c.appointmentUsed)throw new Error('COUNCIL_APPOINTMENT_USED');
  if(!councilCandidates(s).some(o=>o.officerId===cmd.officerId)||(c.candidates.length&&!c.candidates.includes(cmd.officerId)))throw new Error('INVALID_COUNCIL_STRATEGIST');
  c.strategistId=cmd.officerId;c.appointmentUsed=true;const report=councilReport(s);c.report=report.lines;c.reportTopicIds=report.topicIds;return s;
 }
 if(cmd.type!=='COUNCIL_DECIDE'||!['APPROVE','HOLD'].includes(cmd.decision))throw new Error('INVALID_COUNCIL_DECISION');
 const p=c.proposals.find(p=>p.id===cmd.proposalId);if(!p||p.decision!==null)throw new Error('INVALID_COUNCIL_PROPOSAL');
 p.decision=cmd.decision;if(cmd.decision==='APPROVE')gainRelation(s,ruler(s),p.proposerId,C195.council.adoptionAffinity);if(cmd.decision==='APPROVE')c.resolutions.push({proposalId:p.id,kind:p.kind,target:structuredClone(p.target),proposerId:p.proposerId,deadlineTurn:c.turn+2,status:'ACTIVE'});return s;
}
function resolve(s,r,status){
 r.status=status;const fulfilled=status==='FULFILLED',effect=data.decision[fulfilled?'fulfilled':'broken'];
 if(fulfilled)award(s,r.proposerId,effect.effects.proposerExperience,`${r.proposalId}.FULFILLED`);
 gainRelation(s,ruler(s),r.proposerId,effect.effects.rulerAffinity);
 (s.administrationLog??=[]).push({turn:s.turn,factionId:own(s),text:format(effect.log,{'장수':officerName(s,r.proposerId)})});
}
export function observeCouncil(s,before,command={}){
 if(!councilEnabled(s)||!s.council)return s;
 for(const r of s.council.resolutions.filter(r=>r.status==='ACTIVE')){
  const t=r.target,within=before.turn<=r.deadlineTurn;
  const action=before.phase==='PLAYER'&&within;
  const moved=Object.values(s.armies).some(a=>a.factionId===own(s)&&before.armies[a.armyId]&&a.tileId!==before.armies[a.armyId].tileId&&s.cities[t.cityId]&&hexDistance(s.tiles[a.tileId],s.tiles[s.cities[t.cityId].tileId])<=1);
  const newArmy=Object.values(s.armies).some(a=>a.factionId===own(s)&&a.commanderId===t.officerId&&!before.armies[a.armyId]);
  const hub=(s.supply?.hubs??[]).some(h=>h.factionId===own(s)&&h.tileId===t.tileId&&!(before.supply?.hubs??[]).some(b=>b.hubId===h.hubId));
  const explored=s.exploration?.places[t.placeId],previous=before.exploration?.places[t.placeId];
  const fulfilled={
   ATTACK_CITY:action&&((command.type==='ATTACK_CITY'&&command.cityId===t.cityId)||(s.combatLog??[]).some(log=>log.sequence>before.battleSequence&&log.turn<=r.deadlineTurn&&log.cityId===t.cityId&&s.armies[log.attackerId]?.factionId===own(s))||before.cities[t.cityId]?.ownerFactionId!==own(s)&&s.cities[t.cityId]?.ownerFactionId===own(s)),
   DEFEND_CITY:action&&moved,
   BUILD_HUB:within&&hub,
   MUSTER:within&&newArmy,
   CITY_DEVELOP:action&&command.type==='CITY_JOB'&&command.cityId===t.cityId&&command.kind===t.facility,
   DIPLOMACY:action&&command.type==='DIPLO_PROPOSE'&&command.factionId===t.factionId&&command.kind===t.kind,
   EXPLORE:within&&explored?.investigator&&s.officers[explored.investigator]?.allegianceFactionId===own(s)&&explored.status!==previous?.status,
   RECRUIT:action&&command.type==='WANDERER_RECRUIT'&&command.officerId===t.officerId
  }[r.kind];
  if(fulfilled)resolve(s,r,'FULFILLED');else if(s.turn>r.deadlineTurn)resolve(s,r,'BROKEN');
 }
 return s;
}
export function validateCouncil(s){
 if(!councilEnabled(s)||s.council===undefined)return;
 const c=s.council,fail=()=>{throw new Error('INVALID_CAMPAIGN_COUNCIL');},kinds=Object.keys(data.proposals.kinds),obj=x=>x&&typeof x==='object'&&!Array.isArray(x);
 if(!obj(c)||!Number.isSafeInteger(c.turn)||c.turn<0||c.turn>s.turn||c.turn>0&&(c.turn-1)%3!==0||!['OPEN','CLOSED'].includes(c.status))fail();
 if(c.strategistId!==null&&(!s.officers[c.strategistId]||c.strategistId===ruler(s)))fail();
 if(!Array.isArray(c.candidates)||c.candidates.length>3||new Set(c.candidates).size!==c.candidates.length||c.candidates.some(id=>!s.officers[id]||id===ruler(s)))fail();
 if(!Array.isArray(c.report)||c.report.length>data.report.maxLines+1||c.report.some(line=>typeof line!=='string'))fail();
 if(!Array.isArray(c.proposals)||c.proposals.length>data.proposals.count||!Array.isArray(c.resolutions))fail();
 if(c.advisorLine!=null&&typeof c.advisorLine!=='string'||c.appointmentUsed!==undefined&&typeof c.appointmentUsed!=='boolean'||c.experienceGranted!==undefined&&typeof c.experienceGranted!=='boolean')fail();
 const validTarget=(kind,t)=>{
  if(!obj(t))return false;
  if(['ATTACK_CITY','DEFEND_CITY','CITY_DEVELOP'].includes(kind)&&!s.cities[t.cityId])return false;
  if(['ATTACK_CITY','DEFEND_CITY','BUILD_HUB','EXPLORE'].includes(kind)&&!s.armies[t.armyId])return false;
  if(kind==='BUILD_HUB'&&!s.tiles[t.tileId]||kind==='MUSTER'&&(!s.officers[t.officerId]||!s.cities[t.cityId]||typeof t.troopType!=='string')||kind==='CITY_DEVELOP'&&!CITY_JOBS[t.facility]||kind==='DIPLOMACY'&&(!s.factions[t.factionId]||!['TRUCE','ALLIANCE'].includes(t.kind))||kind==='EXPLORE'&&!s.exploration?.places[t.placeId]||kind==='RECRUIT'&&!s.officers[t.officerId]&&!s.wanderers?.[t.officerId])return false;
  return true;
 };
 const ids=new Set(),proposers=new Set(),seen=new Set();
 for(const p of c.proposals){if(!obj(p)||typeof p.id!=='string'||ids.has(p.id)||!kinds.includes(p.kind)||seen.has(p.kind)||!s.officers[p.proposerId]||proposers.has(p.proposerId)||p.proposerId===ruler(s)||!validTarget(p.kind,p.target)||!['what','expected','risk'].every(k=>typeof p[k]==='string')||![null,'APPROVE','HOLD'].includes(p.decision)||c.status==='CLOSED'&&p.decision===null)fail();ids.add(p.id);seen.add(p.kind);proposers.add(p.proposerId);}
 const resolutionIds=new Set();for(const r of c.resolutions){if(!obj(r)||typeof r.proposalId!=='string'||resolutionIds.has(r.proposalId)||!kinds.includes(r.kind)||!validTarget(r.kind,r.target)||!s.officers[r.proposerId]||r.proposerId===ruler(s)||!Number.isSafeInteger(r.deadlineTurn)||r.deadlineTurn<1||!['ACTIVE','FULFILLED','BROKEN'].includes(r.status))fail();resolutionIds.add(r.proposalId);}
}
