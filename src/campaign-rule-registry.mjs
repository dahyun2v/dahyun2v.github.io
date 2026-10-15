import {diplomacyEnabled,diplomacyArmyHostile,diplomacyMoveReason,diplomacyAttackReason} from './campaign-diplomacy.mjs';
import {classPostMove,armyClass,CLASS_ABILITIES} from './campaign-classes.mjs';
import initialBannerWorld from '../../docs/design-data/first3-initial-state-v1.json' with {type:'json'};
import {c34Cost} from './campaign-c34.mjs';
import {c34Cancel,c34AttackOptions,c34Range,c34Strategy} from './campaign-c34.mjs';
import {C34_OFFICERS} from './campaign-officers-51-100.mjs';
import {C34_RULES,C34_DAMAGE_TACTICS,c34Ops,c34Tactic,c34HasRule,c34Immune,c34Domestic,c34Siege,c34Targets,c34Start,c34AfterAttack,c34Xp,c34MoraleWeight} from './campaign-c34.mjs';
import {attackDirection,archerAttackReason} from './campaign-abilities.mjs';
import {C29_DATA,C29_AWAKENING,c29CoreFactor,c29Hidden,c29CoreCard,c29Aw,c29CityOutput,c29Gain,c30ElementDamage,c30Spread} from './campaign-c29.mjs';
import {c28Suppressed,c28Rule,C28,c28ControlGuard} from './campaign-career.mjs';
import redesign50 from '../../docs/design-data/officer-pack/redesign-50-v0.2.json' with {type:'json'};
import commonPool from '../../docs/design-data/officer-pack/common-pool-v0.3.json' with {type:'json'};
// C25 extension registry. Existing engine rules retain their existing handlers.
const handlers=new Map();
// C32 definitions are projected from the read-only redesign input below.
export function registerCampaignRule(id,handler){
 if(typeof id!=='string'||!id||typeof handler!=='function')throw new Error('INVALID_CAMPAIGN_RULE_HANDLER');
 if(handlers.has(id))throw new Error('DUPLICATE_CAMPAIGN_RULE_HANDLER');
 handlers.set(id,handler);return ()=>handlers.delete(id);
}
export const campaignRuleRegistered=id=>handlers.has(id);
export function executeCampaignRule(id,context){return handlers.get(id)?.(context);}
export const CLASS_RULES=Object.freeze(CLASS_ABILITIES.map(c=>c.ability.rule));
for(const rule of CLASS_RULES)registerCampaignRule(rule,({s,id})=>armyClass(s,id,rule));

// C33 trial hooks. Queries never mutate state; followups never dispatch actions.
export const c33Enabled=s=>['v2','v3'].includes(s.mapId);
export const c33Card=c=>!!c?.c33;
export const c33FormationCard=c=>c33Card(c)&&c.effects.some(e=>e.rule?.startsWith('FORMATION_'));
export function installC33(r){
 if(r.c33Version===3)return;
 for(const card of [...C33_POOL.traits,...C33_POOL.tactics,...C33_POOL.domestic]){
  const traitId=`${r.pack.id}.c33.${card.id}`,copy={...structuredClone(card),traitId,c33:true,sourceText:card.domestic?'공용 내정':'공용'};delete copy.formerName;
  r.cards[traitId]??=copy;
  if(!r.pool.traits.some(t=>t.traitId===traitId))r.pool.traits.push({traitId,ownershipType:'PUBLIC',rarity:card.rarity,rankMax:5,stageTags:['EARLY','MID','LATE'],affinityTags:[card.classTag],roleTags:[],experienceTags:[],domestic:!!card.domestic,careerCard:true});
 }
 r.c33Version=3;if(r.track)syncPoolFingerprint(r);
}
export function c33Owned(s,id,rule){return c33Enabled(s)?combatRule(s,id,rule):null;}
export function c33Formation(s,id,rule){const f=s.armies[id]?.c33?.formation;return c33Enabled(s)&&f&&f.until>=s.turn&&(!rule||f.rule===rule)?f:null;}
// Public perception only; never use this count to settle damage.
export function campaignShownCount(s,id,factionId){const a=s.armies[id];return a.troopCount*campaignShownScale(s,id,factionId);}
export function campaignShownScale(s,id,factionId){const a=s.armies[id];return a&&a.factionId!==factionId&&s.knowledge[factionId]?.tiles[a.tileId]==='VISIBLE'&&c33Owned(s,id,'FAKE_BANNERS')?2:1;}
export function campaignBannerView(s,v){if(!c33Enabled(s))return v;for(const a of Object.values(v.knowledge.observedArmies)){if(v.knowledge.tiles[a.tileId]!=='VISIBLE')continue;const scale=campaignShownScale(s,a.armyId,v.factionId);a.troopCount=campaignShownCount(s,a.armyId,v.factionId);a.maxTroopCount=Math.max(s.armies[a.armyId].troopCount,initialBannerWorld.world.armies[a.armyId]?.troopCount??s.armies[a.armyId].troopCount)*scale;}return v;}
export function c33Governor(s,c,rule){return c33Enabled(s)&&governorValid(s,c)?c33Owned(s,domesticGovernorId(c),rule):null;}
const c33Near=(s,id,range=1,allies=true)=>{const a=s.armies[id];return Object.values(s.armies).filter(b=>b.armyId!==id&&castleArmyActive(s,b)&&(allies?b.factionId===a.factionId:diplomacyArmyHostile(s,id,b.armyId))&&distance(s,a.tileId,b.tileId)<=range).sort((a,b)=>a.armyId.localeCompare(b.armyId));};
export function c33Eligible(r,c){
 if(!c33Card(c))return true;
 const troops=r.pack.allowedTroops??r.c33Troops??[];
 const required=['CT-V04'].includes(c.id)?['BT02']:['CT-V05','CT-V06','CTA-23','CTA-24','CTA-25','CTA-52'].includes(c.id)?['BT03']:c.id==='CT-V12'?['catapult']:c.id==='CT-V01'?['BT01','BT02']:null;
 if(required&&troops.length&&!troops.some(t=>required.includes(t)||required.includes(troopToCampaign(t))))return false;
 if(c.kind==='tactic'&&[c.classTag].flat().includes('무용')){const ranks=r.track.growthStates[r.pack.id].ownedTraitRanks;if(Object.keys(ranks).some(k=>r.cards[k]?.effects?.some(e=>e.rule==='DIVINE_CALC')))return false;}
 return true;
}
export function c33Mods(s,id,whens,ctx){
 const out={DAMAGE_MOD:0,DEFENSE_MOD:0,lines:[]},a=s.armies[id],t=s.armies[ctx.targetId];if(!c33Enabled(s)||!a)return out;
 const add=(rule,op,n)=>{if(n){out[op]+=n;out.lines.push(`${c33Owned(s,id,rule)?.card.name??c33Formation(s,id,rule)?.name??rule} ${n>=0?'+':''}${n}%`);}};
 if(whens.includes('ON_ATTACK')){
  if(t&&c33Owned(s,id,'LOWER_MIGHT_BONUS')&&(s.officers[a.commanderId].baseStats.might??s.officers[a.commanderId].baseStats.strength)>(s.officers[t.commanderId].baseStats.might??s.officers[t.commanderId].baseStats.strength))add('LOWER_MIGHT_BONUS','DAMAGE_MOD',15);
  if(c33Owned(s,id,'STACKING_FURY'))add('STACKING_FURY','DAMAGE_MOD',Math.min(15,a.c33?.fury??0));
  if(t?.c33?.mark?.until>=s.turn&&t.c33.mark.factionId===a.factionId&&t.c33.mark.source!==id)add('MARK_TARGET','DAMAGE_MOD',10);
  if(c33Formation(s,id,'FORMATION_ARROW'))add('FORMATION_ARROW','DAMAGE_MOD',25);
  if(c33Formation(s,id,'FORMATION_SNAKE')&&['forest','hill'].includes(s.tiles[a.tileId].terrainType))add('FORMATION_SNAKE','DAMAGE_MOD',10);
 }
 if(whens.includes('ON_DEFEND')){
  if(c33Owned(s,id,'RATTAN_ARMOR'))add('RATTAN_ARMOR','DEFENSE_MOD',30);
  if(t?.c27?.ambush&&c33Owned(s,id,'ROUGH_MARCH'))add('ROUGH_MARCH','DEFENSE_MOD',50);
  if(c33Formation(s,id,'FORMATION_SCALE')&&(!t||attackDirection(s,t.armyId,id)==='FRONT'))add('FORMATION_SCALE','DEFENSE_MOD',20);
  if(c33Formation(s,id,'FORMATION_ARROW'))add('FORMATION_ARROW','DEFENSE_MOD',-15);
  if(c33Formation(s,id,'FORMATION_DRILL'))add('FORMATION_DRILL','DEFENSE_MOD',-20);
  if(c33Formation(s,id,'FORMATION_GEESE')&&t&&distance(s,a.tileId,t.tileId)===1)add('FORMATION_GEESE','DEFENSE_MOD',-15);
 }
 return out;
}
export function c33Movement(s,id){if(!c33Enabled(s))return {rooted:false,delta:0};const a=s.armies[id];return {rooted:!!c33Formation(s,id,'FORMATION_RING')||a.c33?.bideUntil>=s.turn,delta:(c33Formation(s,id,'FORMATION_DRILL')?2:0)-(a.c33?.chainCostTurn===s.turn?2:0)};}
export function c33Range(s,id,card=null){const a=s.armies[id];if(!c33Enabled(s)||!a)return 0;return card?([card.classTag].flat().includes('지략')&&c33Owned(s,id,'SCHEME_RANGE')?1:0):(a.troopType==='catapult'&&c33Owned(s,id,'SIEGE_RANGE')?1:0)+(troopToCampaign(a.troopType)==='BT03'&&c33Formation(s,id,'FORMATION_GEESE')?1:0);}
export function c33Cooldown(s,id,c){return Math.max(1,c.cooldown+(c33Owned(s,id,'SCHEME_HASTE')?([c.classTag].flat().includes('지략')?-1:[c.classTag].flat().includes('무용')?1:0):0)+(c33Enabled(s)&&s.armies[id]?.c33?.scaleCost?1:0));}
export function c33Immune(s,id,status,source=null){
 if(!c33Enabled(s))return false;
 if(['CONFUSED','SLOWED','ROOTED'].includes(status)&&[s.armies[id],...c33Near(s,id)].some(a=>c33Owned(s,a.armyId,'INSIGHT_AURA')))return true;
 return source&&['CONFUSED','ROOTED','TAUNT'].includes(status)&&c33Owned(s,id,'SEE_THROUGH')&&s.officers[s.armies[id].commanderId].baseStats.intelligence>s.officers[s.armies[source].commanderId].baseStats.intelligence;
}
export function c33Limit(s,id,loss,commit=true,{front=false}={}){
 const a=s.armies[id];if(!c33Enabled(s)||!a)return loss;
 if(front&&c33Owned(s,id,'DAMAGE_CAP'))loss=Math.min(loss,Math.floor(a.troopCount*.08));
 if(c33Owned(s,id,'BARRIER')){const left=a.c33?.barrier??50,n=Math.min(loss,left);loss-=n;if(commit){a.c33??={};a.c33.barrier=left-n;}}
 return loss;
}
export function c33AfterAttack(s,before,id,target,log,heal){
 if(!c33Enabled(s))return;const a=s.armies[id],t=s.armies[target];a.c33??={};t.c33??={};
 if(c33Owned(s,id,'LIFESTEAL'))heal(id,Math.floor(log.enemyLoss*.1));
 if(c33Owned(s,id,'MARK_TARGET'))t.c33.mark={until:s.turn+1,factionId:a.factionId,source:id};
 if(c33Owned(s,id,'STACKING_FURY')){a.c33.fury=Math.min(15,(a.c33.fury??0)+3);a.c33.lastAttack=s.turn;}
 if(c33Owned(s,id,'EXECUTE')&&t.troopCount>0&&t.troopCount<.15*(t.deploymentStrength??before.armies[target].troopCount))changeMorale(s,target,'ROUTING','끝장내기',log.moraleChanges);
 if(c33Owned(s,id,'CHAIN_ACTION')&&(t.morale==='ROUTING'||!t.troopCount)&&before.armies[target].morale!=='ROUTING'&&a.c33.chainTurn!==s.turn){a.c33.chainTurn=s.turn;a.c33.chainCostTurn=s.turn+1;a.c27??={};a.c27.extraTurn=s.turn;s.endedArmyIds=s.endedArmyIds.filter(k=>k!==id);}
 for(const b of Object.values(s.armies))if((b.morale==='ROUTING'||!b.troopCount)&&before.armies[b.armyId]?.morale!=='ROUTING'&&before.armies[b.armyId]?.troopCount>0){
  const r=s.campaignGrowth.officers[b.commanderId];if(c33Owned(s,b.armyId,'LOSS_STREAK_XP'))r.c33Loss=true;
  for(const other of Object.values(s.armies))if(other.armyId!==b.armyId&&other.factionId===b.factionId&&castleArmyActive(s,other)&&distance(s,b.tileId,other.tileId)<=2&&c33Owned(s,other.armyId,'AVENGE_ALLY'))changeMorale(s,other.armyId,other.morale==='ROUTING'?'SHAKEN':'STEADY','동료가 쓰러지면',log.moraleChanges);
 }
 const r=s.campaignGrowth.officers[a.commanderId];if((t.morale==='ROUTING'||!t.troopCount)&&r.c33Loss)delete r.c33Loss;
}
export function c33Start(s,fid){if(!c33Enabled(s))return;for(const a of Object.values(s.armies).filter(a=>a.factionId===fid&&castleArmyActive(s,a))){a.c33??={};if(a.c33.started===s.turn)continue;a.c33.started=s.turn;if(a.c33.formation?.until<=s.turn)delete a.c33.formation;if((a.c33.lastAttack??-1)<s.turn-1)a.c33.fury=0;if(Object.values(s.cities).some(c=>c.ownerFactionId===fid&&c.tileId===a.tileId))a.c33.barrier=50;}}
export function c33Targets(s,id,card,{hidden=()=>false}={}){
 const a=s.armies[id],r=s.campaignGrowth.officers[a.commanderId];if(!c33Eligible(r,card)||a.c33?.bideUntil>=s.turn||a.c33?.drillTurn===s.turn)return [];
 const rule=card.effects.find(e=>e.op==='RULE')?.rule,range=card.range+c33Range(s,id,card),visible=at=>s.knowledge[a.factionId].tiles[at]==='VISIBLE'&&distance(s,a.tileId,at)<=range;
 if(rule==='RAM')return Object.values(s.cities).filter(c=>c.ownerFactionId!==a.factionId&&visible(c.tileId)&&c.durability>0).map(c=>c.cityId).sort();
 if(rule==='PLACE_TRAP')return Object.values(s.tiles).filter(t=>visible(t.tileId)&&distance(s,a.tileId,t.tileId)===1&&!combatArmyAt(s,t.tileId)&&!Object.values(s.cities).some(c=>c.tileId===t.tileId)).map(t=>t.tileId).sort();
 if(range===0||card.effects.some(e=>['ADJACENT_ALLIES','ADJACENT_ENEMIES'].includes(e.target)))return [id];
 const friendly=['CTA-35','CTA-36','CTA-37','CTA-56'].includes(card.id);
 return Object.values(s.armies).filter(b=>castleArmyActive(s,b)&&visible(b.tileId)&&!hidden(b.armyId)&&(b.factionId===a.factionId)===friendly&&(!['CTA-23','CTA-24','CTA-25'].includes(card.id)||distance(s,a.tileId,b.tileId)>1)&&(!(rule==='FLANK_RAID')||attackDirection(s,id,b.armyId)!=='FRONT')&&(!(rule==='ROCKSLIDE')||s.tiles[a.tileId].terrainType==='hill'&&s.tiles[b.tileId].terrainType!=='hill')&&(!(rule==='HOOK_PULL')||distance(s,a.tileId,b.tileId)===2&&c33PullTile(s,id,b.armyId))).map(b=>b.armyId).sort();
}
export function c33PullTile(s,id,target){return neighbors(s.tiles[s.armies[id].tileId]).map(tileId).filter(to=>combatEmptyStep(s,target,to)&&distance(s,to,s.armies[target].tileId)===1).sort()[0];}
export function c33AiUseful(s,id,c,target){const a=s.armies[id],t=s.armies[target];if(c33FormationCard(c)||c.range===0)return c33Near(s,id,2,false).some(b=>s.knowledge[a.factionId].tiles[b.tileId]==='VISIBLE');if(['CTA-35','CTA-37'].includes(c.id))return t?.woundedCount>0;if(c.id==='CTA-36')return t?.formation!=='ORDERED'||t?.effectStates.some(e=>e.op==='STATUS_APPLY');return true;}

export function c33ApplyTactic({s,id,target,card,damage,heal,attack,cityAttack,log}){
 const a=s.armies[id],t=s.armies[target],e=card.effects.find(e=>e.op==='RULE'),rule=e?.rule,p=e?.params??{},near=(range=1,allies=false)=>c33Near(s,id,range,allies),line=text=>log.effectLines.push(`${card.name} — ${text}`);
 const status=(who,name)=>{if(c33Immune(s,who,name,id)||uniqueImmune(s,who,name))return;s.armies[who].effectStates.push({op:'STATUS_APPLY',status:name,value:0,source:id,startsTurn:s.turn,expiresTurn:s.turn+(s.campaignEffects.startedTurns[s.armies[who].factionId]===s.turn?1:0)});};
 const buff=(who,op,value,turns=1)=>s.armies[who].effectStates.push({op,value,source:id,traitId:card.traitId,startsTurn:s.turn,expiresTurn:s.turn+turns-1});
 const strategy=()=>!!c33Owned(s,id,'DIVINE_CALC')||s.officers[a.commanderId].baseStats.intelligence+c34Strategy(s,id)>s.officers[t.commanderId].baseStats.intelligence;
 const strike=(who=target,ratio=1)=>attack(who,ratio);
 if(c33FormationCard(card)){
  a.c33??={};a.c33.formation={rule,name:card.name,until:s.turn+1};
  if(rule==='FORMATION_SCALE')a.c33.scaleCost=true;
  if(rule==='FORMATION_DRILL')a.c33.drillTurn=s.turn;
  if(rule==='FORMATION_BASKET'){const b=near().sort((b,c)=>Object.values(s.officers[c.commanderId].baseStats).reduce((x,n)=>x+n,0)-Object.values(s.officers[b.commanderId].baseStats).reduce((x,n)=>x+n,0)||b.armyId.localeCompare(c.armyId))[0];if(b)buff(b.armyId,'DAMAGE_MOD',-30,2);}
  line('이전 진형 대체 · 다음 내 차례까지');return;
 }
 switch(rule){
 case 'FLANK_RAID':strike();changeFormation(s,target,1,log.formationChanges);break;
 case 'VOLLEY':{strike(target,.7);const b=Object.values(s.armies).filter(b=>b.armyId!==target&&b.factionId===t.factionId&&castleArmyActive(s,b)&&distance(s,t.tileId,b.tileId)===1&&s.knowledge[a.factionId].tiles[b.tileId]==='VISIBLE').sort((a,b)=>a.armyId.localeCompare(b.armyId))[0];if(b)strike(b.armyId,.7);break;}
 case 'REPEATER':strike(target,.6);if(castleArmyActive(s,s.armies[target]))strike(target,.6);status(target,'SLOWED');break;
 case 'FIRE_ARROW':case 'INFERNO':{const at=t.tileId,tiles=new Set([at]);let frontier=[at];for(let n=0;n<(rule==='INFERNO'?2:0);n++){frontier=frontier.flatMap(at=>boardNeighbors(s.tiles[at],s.tiles).map(tileId)).filter(at=>!tiles.has(at));frontier.forEach(at=>tiles.add(at));}s.c27??={counts:{}};s.c27.fires??=[];s.c27.fires.push({... (diplomacyEnabled(s)?{source:id}:{}),tiles:[...tiles],until:s.turn});log.fire=true;damage(Object.values(s.armies).filter(b=>castleArmyActive(s,b)&&!diplomacyAttackReason(s,id,b.armyId)&&tiles.has(b.tileId)).map(b=>({targetId:b.armyId,loss:Math.round(b.troopCount*.1)})));if(rule==='FIRE_ARROW')status(target,'ROOTED');else for(const b of Object.values(s.armies).filter(b=>castleArmyActive(s,b)&&!diplomacyAttackReason(s,id,b.armyId)&&tiles.has(b.tileId)))checkMorale(s,b.armyId,card.name,10,log.moraleChanges);break;}
 case 'WARCRY':for(const b of near())buff(b.armyId,'DAMAGE_MOD',-15,2);break;
 case 'SHATTER':buff(target,'DEFENSE_MOD',-20,2);break;
 case 'TAUNT_INSULT':if(strategy()){checkMorale(s,target,card.name,15,log.moraleChanges);buff(target,'DAMAGE_MOD',-10,2);}break;
 case 'ROOT':status(target,'ROOTED');break;
 case 'MASS_CONFUSE':if(strategy()){status(target,'CONFUSED');const b=Object.values(s.armies).filter(b=>b.armyId!==target&&b.factionId===t.factionId&&castleArmyActive(s,b)&&distance(s,t.tileId,b.tileId)===1&&s.knowledge[a.factionId].tiles[b.tileId]==='VISIBLE').sort((a,b)=>a.armyId.localeCompare(b.armyId))[0];if(b)status(b.armyId,'CONFUSED');}break;
 case 'ROCKSLIDE':strike();changeFormation(s,target,1,log.formationChanges);break;
 case 'CLEANSE':case 'DEEP_CURE':t.effectStates=t.effectStates.filter(e=>e.op!=='STATUS_APPLY');if(t.c27)delete t.c27.rootTurn;changeFormation(s,target,-1,log.formationChanges);if(rule==='DEEP_CURE'){heal(target,30);t.c33??={};t.c33.moraleFixedUntil=s.turn+1;}break;
 case 'DISARM_AREA':for(const b of near().slice(0,2)){b.c32??={};b.c32.disarmUntil=s.turn+1;}break;
 case 'EVADE':for(const b of [a,...near(1,true).slice(0,1)])buff(b.armyId,'DEFENSE_MOD',30);a.c32??={};a.c32.disarmUntil=s.turn;break;
 case 'BIDE':a.c33??={};a.c33.bideUntil=s.turn+1;a.c33.doubleTurn=s.turn+2;buff(id,'DEFENSE_MOD',40,2);break;
 case 'MASS_TAUNT':for(const b of near(2))if(!c33Immune(s,b.armyId,'TAUNT',id)&&!uniqueImmune(s,b.armyId,'TAUNT'))turnFacing(s,b.armyId,id);buff(id,'DEFENSE_MOD',20);break;
 case 'WHIRLWIND':for(const b of near())strike(b.armyId);changeFormation(s,id,1,log.formationChanges);break;
 case 'RAM':cityAttack(2);break;
 case 'BRIBE':s.factions[a.factionId].prestige=Math.max(0,s.factions[a.factionId].prestige-10);if(strategy()||uniqueOwned(s,target,'U_BRIBE_BROKER'))status(target,'CONFUSED');break;
 case 'HOOK_PULL':{const to=c33PullTile(s,id,target);if(to!==t.tileId){t.tileId=to;t.currentOrder=null;t.movementState=null;}checkFormation(s,target,10,log.formationChanges);break;}
 case 'SMOKE':for(const b of [a,...near(1,true)]){b.c33??={};b.c33.smokeUntil=s.turn;}break;
 case 'EMPOWER':buff(target,'DAMAGE_MOD',30);buff(target,'DEFENSE_MOD',20);break;
 case 'PLACE_TRAP':s.c33??={};s.c33.traps??=[];s.c33.traps.push({tileId:target,factionId:a.factionId,source:id});break;
 default:throw new Error(`C33_UNKNOWN_TACTIC:${rule}`);
 }
 line('효과 적용');
}

export function c33DomesticOutput(s,c,raw){
 if(!c33Enabled(s))return;
 if(c33Governor(s,c,'ADJACENCY_BONUS')&&c.facilities.length>=2)for(const k of Object.keys(raw))raw[k]*=c.facilities.length>=3?1.15:1.1;
 if(Object.values(s.cities).some(home=>home.ownerFactionId===c.ownerFactionId&&c33Governor(s,home,'RITUAL')))raw.science*=.85;
 if(c33Governor(s,c,'TRIBAL_FRIEND'))raw.prestige*=.7;
 if(c.c33?.taxUntil>=s.turn)raw.production=0;
}
export function c33DomesticEvent(s,c,event){
 if(!c33Enabled(s))return event;
 if(event.type==='DISASTER'&&c33Governor(s,c,'RITUAL'))return {...event,prevented:true};
 if(event.type==='BANDIT'&&Object.values(s.cities).some(home=>home.ownerFactionId===c.ownerFactionId&&distance(s,home.tileId,event.tileId??c.tileId)<=3&&c33Governor(s,home,'BANDIT_SWEEP')))return {...event,prevented:true};
 if(event.type==='TRIBAL'&&c33Governor(s,c,'TRIBAL_FRIEND'))return {...event,hostile:false,mercenaries:{troop:'cavalry',count:100}};
 return event;
}
export function c33TaxReason(s,c){if(!c33Governor(s,c,'TAX_ADVANCE'))return '태수 특기 필요';if(c.c33?.taxUntil>=s.turn)return '앞당긴 생산 상환 중';if(c.besieged||(s.occupations[c.cityId]?.stage??'NORMAL')!=='NORMAL')return '정상 도시에서만 사용 가능';return null;}
export function c33Tax(s,c,production){const reason=c33TaxReason(s,c);if(reason)throw new Error(`C33_TAX_LOCKED:${reason}`);c.c33??={};c.c33.taxUntil=s.turn+2;c.c33.advanceProduction=(c.c33.advanceProduction??0)+production*3;domesticSecurity(s,c,1,'COMMAND');domesticLine(s,c,{rule:'TAX_ADVANCE',card:{name:'세금 앞당겨 걷기'}},`생산 ${production*3} 선지급 · 3턴 생산 0 · 치안 악화`);}

// C26 domestic handlers share the already served registry module.
import career from '../../docs/design-data/officer-pack/career-titles-v0.3.json' with {type:'json'};
import {hexDistance,neighbors,boardNeighbors,tileId} from './map-primitives.mjs';
import {directionToward,changeFormation,checkFormation,turnFacing} from './campaign-abilities.mjs';
import {troopToCampaign} from './campaign-adapters.mjs';
import {edgeTicks} from './movement.mjs';
import {changeMorale,checkMorale} from './campaign-morale.mjs';
import {castleArmyActive} from './campaign-city-footprint.mjs';
import {creditCampaignGrowth,initializeCampaignGrowth,CAMPAIGN_TRAIT_SLOTS,syncPoolFingerprint} from './campaign-growth.mjs';
import {syncCampaignAdministrativeTerminal} from './campaign-terminal-world-application.mjs';

export const c26Enabled=s=>['v2','v3'].includes(s.mapId);
export const DOMESTIC_RULES=Object.freeze([...new Set([...career.titleCards,...career.mythicDomestic,...career.commonDomesticTraits].filter(c=>c.domestic).flatMap(c=>c.effects.filter(e=>e.op==='RULE').map(e=>e.rule)))]);
export function domesticParams(params={},rank=1){return Object.fromEntries(Object.entries(params).map(([k,v])=>[k,typeof v==='number'?v*(1+.5*(rank-1)):v]));}
const distance=(s,a,b)=>hexDistance(s.tiles[a],s.tiles[b]);
const alive=o=>o?.lifeState==='ALIVE'&&o.captivityState==='FREE';
export function domesticOwned(s,id){
 if(!c26Enabled(s)||!alive(s.officers[id]))return [];
 const r=s.campaignGrowth?.officers[id];if(!r)return [];
 const ranks=r.track.growthStates[id].ownedTraitRanks;
 return [...new Set([r.coreId,...Object.keys(ranks)])].map(key=>r.cards[key]).filter(c=>c?.domestic&&c.kind==='trait').flatMap(card=>(card.effects??[]).filter(e=>e.op==='RULE'&&DOMESTIC_RULES.includes(e.rule)).map(e=>({id,card,e,rule:e.rule,rank:ranks[card.traitId]??1,params:domesticParams(e.params,ranks[card.traitId]??1)})));
}
export const domesticGovernorId=c=>c?.governorId??c?.c26?.occupationGovernorId;
const governorValid=(s,c)=>{const o=s.officers[domesticGovernorId(c)];return !(s.mapId!=='v1'&&s.c46Disabled!==true&&o?.injury)&&alive(o)&&o.allegianceFactionId===c.ownerFactionId&&o.locationRef?.kind==='CITY'&&o.locationRef.id===c.cityId;};
// A city receives each rule once, including overlapping Regent auras.
export function domesticCityRules(s,c,{actorId=null}={}){
 if(!c26Enabled(s)||!c||c.ownerFactionId===null)return new Map();
 const list=[];
 for(const home of Object.values(s.cities)){
  if(home.ownerFactionId!==c.ownerFactionId||!governorValid(s,home))continue;
  const owned=domesticOwned(s,domesticGovernorId(home)),regent=owned.find(x=>x.rule==='REGENT'&&x.e.target==='CITY');
  if(home.cityId===c.cityId||regent&&distance(s,home.tileId,c.tileId)<=regent.params.range)list.push(...owned.filter(x=>x.e.target==='CITY').map(x=>({...x,homeCityId:home.cityId})));
 }
 if(actorId&&s.officers[actorId]?.allegianceFactionId===c.ownerFactionId)list.push(...domesticOwned(s,actorId).filter(x=>x.e.target==='SELF'));
 const result=new Map();for(const x of list.sort((a,b)=>b.rank-a.rank||a.id.localeCompare(b.id)||a.card.traitId.localeCompare(b.card.traitId)))if(!result.has(x.rule))result.set(x.rule,x);
 return result;
}
export const domesticRule=(s,c,rule,options)=>domesticCityRules(s,c,options).get(rule);
export function domesticFactionRules(s,fid,rule){return Object.values(s.cities).filter(c=>c.ownerFactionId===fid).map(c=>({c,x:domesticRule(s,c,rule)})).filter(row=>row.x);}
const strongest=rows=>rows.sort((a,b)=>b.x.rank-a.x.rank||a.c.tileId.localeCompare(b.c.tileId))[0];
export function domesticLine(s,c,x,detail,resource='rule',amount=0){
 s.c26??={counts:{},selected:{},seenOfficers:Object.keys({...s.officers,...s.wanderers})};
 s.c26.counts[x.rule]=(s.c26.counts[x.rule]??0)+1;
 const text=`${s.cityDisplayNames?.[c.cityId]??c.name}: [${x.card.name}] ${detail}`;
 s.administrationLog??=[];s.administrationLog.push({turn:s.turn,factionId:c.ownerFactionId,rule:x.rule,text});
 c.economyCauses??=[];c.economyCauses.push({turn:s.turn,rule:x.rule,resource,label:text,amount});
}
export function runDomestic(s,c,rule,phase,args={}){const x=domesticRule(s,c,rule,{actorId:args.actorId});if(!x)return;const before=s.c26?.counts?.[rule]??0,result=executeCampaignRule(rule,{s,c,x,phase,...args});if((s.c26?.counts?.[rule]??0)>before)regentLine(s,c,x);return result;}
function regentLine(s,c,x){if(x.homeCityId&&x.homeCityId!==c.cityId){const r=domesticRule(s,s.cities[x.homeCityId],'REGENT');if(r)domesticLine(s,c,r,`${s.officers[x.id].name} 섭정 — [${x.card?.name??'내정 특기'}] 적용`);}}
export function domesticReserve(s,c,amount){
 amount=Math.trunc(amount);if(!amount)return;
 if(amount>0){const lotId=`C26.${s.turn}.${c.cityId}.${s.personnel.lots.length}`;s.personnel.lots.push({lotId,kind:'READY',nodeId:c.cityId,identity:{baseTroopId:'BT01',specialTroopId:null},originFormationId:null,count:amount});s.economy.lotFaction[lotId]=c.ownerFactionId;s.economy.recruitedReady[lotId]=true;s.economy.readyAt[lotId]=s.turn;}
 else {let left=-amount;for(const l of s.personnel.lots.filter(l=>l.nodeId===c.cityId&&l.kind!=='WOUNDED'&&l.count>0)){const n=Math.min(left,l.count);l.count-=n;left-=n;}if(left)throw new Error('C26_RESERVE_LEDGER_REQUIRED');}
 s.personnel.initialPersonnel+=amount;c.reserveTroops=(c.reserveTroops??0)+amount;
}
export function domesticSecurity(s,c,delta,source){
 if(!c26Enabled(s)){c.securityLevel=Math.max(0,Math.min(2,(c.securityLevel??0)+delta));return;}
 if(delta>0&&!['EVENT','TACTIC','CRISIS','COMMAND'].includes(source)&&c33Governor(s,c,'BENEVOLENT_RULE'))return;
 const law=domesticRule(s,c,'MARTIAL_LAW'),spy=['EVENT','TACTIC','CRISIS'].includes(source)&&delta>0&&domesticRule(s,c,'COUNTER_SPY');
 if(law||spy){const x=law||spy;c.securityLevel=law?0:c.securityLevel;domesticLine(s,c,x,`${source} 치안 악화 무시`,'security');return;}
 c.securityLevel=Math.max(0,Math.min(2,(c.securityLevel??0)+delta));
}
export function domesticSecurityCauses(s,c,causes){
 if(c29Aw(s,c.governorId,'AW_TT-V05')&&causes.length)causes.splice(0,1);
 const x=domesticRule(s,c,'INCORRUPTIBLE');if(x&&causes.length){const ignored=causes.splice(0,Math.floor(x.params.guard));domesticLine(s,c,x,`원인 무시: ${ignored.join(' · ')}`,'security');}
 const law=domesticRule(s,c,'MARTIAL_LAW');if(law){causes.length=0;c.securityLevel=0;domesticLine(s,c,law,'항상 안정 · 생산 대가','security');}
}
export function domesticOutput(s,c,raw,{commit=false}={}){
 c29CityOutput(s,c,raw);
 const causes=[];const change=(rule,resource,fn)=>{const x=domesticRule(s,c,rule);if(!x)return;const before=raw[resource];raw[resource]=Math.max(0,fn(before,x.params));const n=raw[resource]-before;causes.push({rule,resource,label:`${x.card.name}: ${rule}`,amount:n});if(commit){domesticLine(s,c,x,`${resource} ${n}`);regentLine(s,c,x);}};
 change('GARRISON_FARMING','food',(n,p)=>n+Math.floor((c.reserveTroops??0)/p.per)*p.food);
 change('MARTIAL_LAW','production',(n,p)=>n*Math.max(0,1-p.production/100));
 change('UNBLOCKABLE_SUPPLY','production',(n,p)=>n-p.productionCost);
 if(c.c26?.hometown)change('HOMETOWN_GOVERNOR','prestige',n=>n*.5);
 if(c.c26?.privilege){const before=raw.production;raw.production=Math.max(0,before-1);causes.push({rule:'LOCAL_PRIVILEGE',resource:'production',label:'토호에게 특권 주기: 생산 영구 −1',amount:raw.production-before});if(commit)domesticLine(s,c,c.c26.privilege.source,'생산 영구 −1');}
 return causes;
}
export function domesticFacilityCost(s,c,kind,cost){
 if(!c26Enabled(s)||!domesticFacility(kind))return cost;
 const chain=domesticRule(s,c,'BUILD_CHAIN'),record=s.c26?.blueprints?.[c.ownerFactionId]?.[kind];
 const shared=record?Math.max(0,...Object.entries(record.sources??{[record.cityId]:record.discount}).filter(([id])=>id!==c.cityId).map(([,n])=>n)):0;
 const discount=(chain?Math.min(chain.params.max,(c.c26?.chain??0)*chain.params.step):0)+shared;
 return Math.max(1,Math.ceil(cost*Math.max(0,1-discount/100)));
}
export const domesticFacility=kind=>!['muster','recruit','reorganize','repair'].includes(kind);
export function domesticJobCompleted(s,c,job,overflow){
 runDomestic(s,c,'PRODUCTION_OVERFLOW','job',{overflow});
 if(domesticFacility(job.kind)){runDomestic(s,c,'BUILD_CHAIN','facility');runDomestic(s,c,'SHARED_BLUEPRINT','facility',{kind:job.kind});}
}
export function domesticBeforeSettlement(s,c){
 if(!c26Enabled(s))return;c.c26??={};c.c26.settlements=(c.c26.settlements??0)+1;
 if(!c.currentProduction)c.c26.chain=0;
 for(const rule of ['HARVEST_PULSE','CAPTIVE_DEBT','EMERGENCY_LEVY'])runDomestic(s,c,rule,'settle');
 if(!c.besieged)c.c26.levied=false;
}
export function domesticAfterSettlement(s,c){for(const rule of ['MENTOR_CITY','LECTURE','IMPART','TALENT_MAGNET'])runDomestic(s,c,rule,'settle');}
function localOfficers(s,c,{armies=false}={}){return Object.values(s.officers).filter(o=>alive(o)&&o.allegianceFactionId===c.ownerFactionId&&(o.locationRef.kind==='CITY'&&o.locationRef.id===c.cityId&&!Object.values(s.armies).some(a=>a.commanderId===o.officerId&&castleArmyActive(s,a))||armies&&Object.values(s.armies).some(a=>a.commanderId===o.officerId&&castleArmyActive(s,a)&&a.tileId===c.tileId))).sort((a,b)=>a.officerId.localeCompare(b.officerId));}
export function domesticMusterAvailable(s,c){return (c.reserveTroops??0)+(domesticRule(s,c,'BLOODLESS_MUSTER')?s.personnel.lots.filter(l=>l.nodeId===c.cityId&&l.kind==='WOUNDED').reduce((n,l)=>n+l.count,0):0);}
export const domesticMusterReason=(s,id)=>domesticOwned(s,id).some(x=>x.rule==='REGENT')?'섭정: 출진 불가':null;
export function domesticMusterLots(s,c){const blood=domesticRule(s,c,'BLOODLESS_MUSTER');return s.personnel.lots.filter(l=>l.nodeId===c.cityId&&l.count>0&&(blood||l.kind!=='WOUNDED')).sort((a,b)=>Number(b.kind==='WOUNDED')-Number(a.kind==='WOUNDED')||a.lotId.localeCompare(b.lotId));}
export function domesticMuster(s,c,a){for(const rule of ['BLOODLESS_MUSTER','STRICT_DISCIPLINE'])runDomestic(s,c,rule,'muster',{a});}
export function domesticMoraleThreshold(s,a){return (a.c26?.discipline??[]).filter(x=>s.turn<x.until).reduce((n,x)=>n*x.threshold,1);}
export function domesticStartFaction(s,fid){
 if(!c26Enabled(s))return;
 for(const c of Object.values(s.cities).filter(c=>c.ownerFactionId===fid)){const spy=domesticRule(s,c,'COUNTER_SPY');if(spy&&c.c26?.visionTurn!==s.turn){c.c26??={};c.c26.visionTurn=s.turn;domesticLine(s,c,spy,`성 시야 +${spy.params.vision}`,'vision',spy.params.vision);}}
 for(const a of Object.values(s.armies).filter(a=>a.factionId===fid&&castleArmyActive(s,a))){if(a.c26?.startedTurn===s.turn)continue;a.c26??={};a.c26.startedTurn=s.turn;a.c26.move=0;
  for(const c of Object.values(s.cities).filter(c=>c.ownerFactionId===fid)){runDomestic(s,c,'FIELD_DEPOT','start',{a});runDomestic(s,c,'RELAY_STATIONS','start',{a});}
 }
}
function roadConnected(s,c,a){
 const adjacency=new Map();for(const edge of s.mapRules.roads){const [p,q]=edge.split('|');for(const [u,v] of [[p,q],[q,p]]){if(!adjacency.has(u))adjacency.set(u,[]);adjacency.get(u).push(v);}}
 if(!adjacency.has(a.tileId))return false;
 const reached=new Set([a.tileId]),queue=[a.tileId];while(queue.length){const t=queue.shift();for(const next of adjacency.get(t)??[])if(!reached.has(next)){reached.add(next);queue.push(next);}}
 const connected=Object.values(s.cities).filter(other=>other.ownerFactionId===c.ownerFactionId&&[other.tileId,...other.footprint.gates].some(id=>reached.has(id)));
 return connected.some(other=>other.cityId===c.cityId)&&connected.length>=2;
}
export function domesticOccupationActor(s,c){return domesticGovernorId(c)??Object.values(s.armies).filter(a=>a.factionId===c.ownerFactionId&&castleArmyActive(s,a)&&[c.tileId,...c.footprint.gates].includes(a.tileId)).sort((a,b)=>a.armyId.localeCompare(b.armyId))[0]?.commanderId;}
export function domesticOccupationGovernor(s,id){return domesticOwned(s,id).some(x=>x.e.target==='CITY'&&['HOMETOWN_GOVERNOR','PROCLAMATION','LOCAL_PRIVILEGE','PLUNDER_ARCHIVES','INSTANT_ALLEGIANCE'].includes(x.rule));}
export function domesticPlunderReason(s,c){
 if(domesticFactionRules(s,c.ownerFactionId,'INSTANT_ALLEGIANCE').length)return '천하귀심: 세력 전체 수탈 불가';
 if(domesticRule(s,c,'INCORRUPTIBLE'))return '청렴: 이 성 수탈 불가';return null;
}
export function finishDomesticGovernor(s,c){const id=c.c26?.occupationGovernorId;if(!id)return;c.governorId=id;delete c.c26.occupationGovernorId;if(s.terminal){s.terminal.citiesById[c.cityId].governorId=id;s.terminal.officersById[id].assignment={kind:'CITY',id:c.cityId};}}
export function domesticNormal(s,c){const o=s.occupations[c.cityId];Object.assign(o,{stage:'NORMAL',state:'NORMAL',turnsLeft:0,productionEnabled:true,recruitmentEnabled:true,replenishmentEnabled:true});c.occupationState='NORMAL';finishDomesticGovernor(s,c);if(s.terminal){const tc=s.terminal.citiesById[c.cityId];Object.assign(tc,{occupationState:'NORMAL',pendingGovernor:false,occupationRecordId:null});for(const choice of Object.values(s.terminal.choicesById))if(choice.type==='OCCUPATION'&&choice.cityId===c.cityId&&choice.status==='PENDING'){const recordId=`${choice.causeRecordId}.C26.NORMAL.${s.globalTick}`;s.terminal.recordsById[recordId]={recordId,globalTick:s.globalTick,type:'OCCUPATION_CHOICE',causeRecordIds:[choice.causeRecordId],refs:{factionIds:[c.ownerFactionId],armyIds:[],officerIds:[],cityIds:[c.cityId],choiceIds:[choice.choiceId],prisonerRecordIds:[]},details:{method:o.method}};Object.assign(choice,{status:'RESOLVED',resolvedAtTick:s.globalTick,resolutionRecordId:recordId});}syncCampaignAdministrativeTerminal(s);}s.economy.occupationStatus[c.cityId]='NORMAL';}
export function domesticOccupation(s,c,method){const actorId=domesticOccupationActor(s,c);if(c33Owned(s,actorId,'RENOWN')&&s.occupations[c.cityId]?.turnsLeft>0)s.occupations[c.cityId].turnsLeft--;for(const rule of ['PROCLAMATION','PLUNDER_ARCHIVES','LOCAL_PRIVILEGE','INSTANT_ALLEGIANCE'])runDomestic(s,c,rule,'occupation',{method,actorId});}
export function domesticGovernance(s){for(const c of Object.values(s.cities))if(c.securityLevel>0&&domesticRule(s,c,'MARTIAL_LAW'))domesticSecurity(s,c,0,'GOVERNOR');}
export function domesticGovernor(s,c){domesticGovernance(s);runDomestic(s,c,'HOMETOWN_GOVERNOR','governor');}
export function domesticResearchThreshold(s,fid,base){const row=strongest(domesticFactionRules(s,fid,'TOO_SMART'));return row?Math.max(1,Math.ceil(base*Math.max(0,1-row.x.params.discount/100))):base;}
export function domesticResearchRaised(s,fid){for(const {c,x} of domesticFactionRules(s,fid,'TOO_SMART')){domesticSecurity(s,c,1,'RESEARCH');domesticLine(s,c,x,'연구 문턱 감소 · 단계 상승 대가: 치안 악화','security',1);}}
export function domesticRecruitCost(s,fid,cost){const row=strongest(domesticFactionRules(s,fid,'TALENT_MAGNET'));return row?Math.ceil(cost*(1+row.x.params.recruitPenalty/100)):cost;}
export function domesticRecruit(s,c,id){if(c29Aw(s,c.governorId,'AW_TT-V06')){s.officers[id].c26??={};s.officers[id].c26.firstDraftExtra=(s.officers[id].c26.firstDraftExtra??0)+1;}runDomestic(s,c,'THREE_VISITS','recruit',{officerId:id});const magnet=strongest(domesticFactionRules(s,c.ownerFactionId,'TALENT_MAGNET'));if(magnet)domesticLine(s,magnet.c,magnet.x,'등용 인망 대가');}
export function domesticRelease(s,p){if(Object.values(s.cities).some(c=>c.ownerFactionId===p.captorFactionId&&c33Governor(s,c,'RENOWN')))s.factions[p.captorFactionId].prestige+=5;for(const {c} of domesticFactionRules(s,p.captorFactionId,'CAPTIVE_DEBT'))runDomestic(s,c,'CAPTIVE_DEBT','release');for(const {c} of domesticFactionRules(s,p.captorFactionId,'RELEASE_PROPAGANDA'))runDomestic(s,c,'RELEASE_PROPAGANDA','release',{homeFactionId:p.homeFactionId});}
export function domesticSupport(s,from,to,amount){runDomestic(s,to,'SUPPORT_REFUND','support',{from,amount});const x=domesticRule(s,from,'UNBLOCKABLE_SUPPLY');if(x)domesticLine(s,from,x,'포위·거리 제한 없이 지원','food',-amount);}
export function domesticFoodAvailable(s,c){const shared=domesticFactionRules(s,c.ownerFactionId,'SHARED_GRANARY').length;return shared?Object.values(s.cities).filter(other=>other.ownerFactionId===c.ownerFactionId).reduce((n,other)=>n+Math.max(0,other.foodStock-other.reservedResources.food),0):Math.max(0,c.foodStock-c.reservedResources.food);}
export function domesticSpendFood(s,c,amount){
 if(domesticFoodAvailable(s,c)<amount)throw new Error('C26_FOOD_REQUIRED');
 const shared=strongest(domesticFactionRules(s,c.ownerFactionId,'SHARED_GRANARY'));
 let left=amount;for(const other of [c,...(shared?Object.values(s.cities).filter(other=>other!==c&&other.ownerFactionId===c.ownerFactionId).sort((a,b)=>a.cityId.localeCompare(b.cityId)):[])]){const n=Math.min(left,Math.max(0,other.foodStock-other.reservedResources.food));other.foodStock-=n;left-=n;}
 if(shared)domesticLine(s,c,shared.x,`공동 창고 소비 ${amount}`,'food',-amount);
}
export function domesticWall(s,c,damage,{commit=false}={}){const x=domesticRule(s,c,'LAST_WALL');if(x&&damage>=c.durability&&c.durability>0&&(c.c26?.wallUses??0)<Math.floor(x.params.uses)){if(commit){c.c26??={};c.c26.wallUses=(c.c26.wallUses??0)+1;domesticLine(s,c,x,'내구도 1로 버팀','durability',1);}return Math.max(0,c.durability-1);}return damage;}
export function domesticStrike(s,c,{commit=false}={}){const x=domesticRule(s,c,'LAST_WALL');if(!x)return 1;if(commit)domesticLine(s,c,x,`성 사격 −${x.params.strikePenalty}%`,'damage');return Math.max(0,1-x.params.strikePenalty/100);}
export function domesticCaptured(s,payload){
 const actor=Object.values(s.armies).filter(a=>a.factionId===payload.occupierFactionId&&a.tileId===s.cities[payload.capturedCityId]?.tileId).sort((a,b)=>a.armyId.localeCompare(b.armyId))[0];if(actor&&c29Aw(s,actor.armyId,'AW_TT-C05'))c29Gain(s,actor.armyId,30,`capture.${payload.transactionId}`);
 const c=s.cities[payload.capturedCityId];if(!c26Enabled(s))return;
 c.c26={...c.c26,formerOwners:[...new Set([...(c.c26?.formerOwners??[]),payload.formerOwnerFactionId])]};delete c.c26.occupationGovernorId;c.c26.chain=0;c.c26.levied=false;
 for(const home of Object.values(s.cities)){const x=domesticRule(s,home,'REFUGEE_INFLOW');if(x&&(payload.formerOwnerFactionId===null||payload.formerOwnerFactionId===home.ownerFactionId)&&home.cityId!==c.cityId&&distance(s,home.tileId,c.tileId)<=x.params.range){const n=home.population<home.populationCapacity?1:0;home.population+=n;if(n)domesticLine(s,home,x,'피란민 인구 +1','population',1);}}
}
export function domesticWelcomeCapture(s,payloads,snapshot=null){
 if(!c26Enabled(s))return [];
 if(snapshot===null)return payloads.flatMap(p=>{
  const row=strongest(domesticFactionRules(s,p.occupierFactionId,'DEFECTION_WELCOME'));if(!row||p.formerOwnerFactionId===null||p.formerOwnerFactionId===p.occupierFactionId)return [];
  return Object.values(s.officers).filter(o=>alive(o)&&o.allegianceFactionId===p.formerOwnerFactionId&&o.locationRef.kind==='CITY'&&o.locationRef.id===p.capturedCityId&&!Object.values(s.armies).some(a=>a.commanderId===o.officerId&&castleArmyActive(s,a))).map(o=>({officerId:o.officerId,cityId:p.capturedCityId,homeCityId:row.c.cityId,x:structuredClone(row.x)}));
 });
 for(const row of snapshot){
  const o=s.officers[row.officerId];if(!o)continue;
  const held=Object.values(s.terminal?.prisonersById??{}).find(p=>p.officerId===o.officerId&&p.disposition==='HELD');
  if(held){const recordId=`${held.captureRecordId}.C26.WELCOME.${s.globalTick}.${o.officerId}`;s.terminal.recordsById[recordId]={recordId,globalTick:s.globalTick,type:'PRISONER_LEDGER',causeRecordIds:[held.captureRecordId],refs:{factionIds:[held.homeFactionId,held.captorFactionId].sort(),armyIds:[],officerIds:[o.officerId],cityIds:[row.cityId],choiceIds:[],prisonerRecordIds:[held.prisonerRecordId]},details:{disposition:'RELEASED'}};Object.assign(held,{disposition:'RELEASED',closedAtTick:s.globalTick,closureRecordId:recordId});}
  Object.assign(o,{captivityState:'FREE',captorFactionId:null,locationRef:{kind:'NONE',id:null}});
  if(s.terminal?.officersById[o.officerId])Object.assign(s.terminal.officersById[o.officerId],{captivityState:'FREE',captorFactionId:null,assignment:{kind:'NONE',id:null}});
  s.wanderers[o.officerId]={...structuredClone(o),allegianceFactionId:null,locationRef:{kind:'CITY',id:row.cityId}};
  for(const r of s.c20?.refugees??[])r.officerIds=r.officerIds.filter(id=>id!==o.officerId);
  if(s.terminal){
   const t=s.terminal,cause=t.citiesById[row.cityId].occupationRecordId,recordId=`${cause}.C26.WANDERER.${o.officerId}`;
   t.recordsById[recordId]={recordId,globalTick:s.globalTick,type:'OFFICER_CAPTIVITY',causeRecordIds:[cause],refs:{factionIds:[o.allegianceFactionId],armyIds:[],officerIds:[o.officerId],cityIds:[row.cityId],choiceIds:[],prisonerRecordIds:[]},details:{c26WandererState:'WANDERER'}};
   for(const choice of Object.values(t.choicesById))if(choice.status==='PENDING')choice.candidateOfficerIds=choice.candidateOfficerIds.filter(id=>id!==o.officerId);
  }
  domesticLine(s,s.cities[row.homeCityId],row.x,`${o.name} ${s.cities[row.cityId].name} 재야로 잔류`);
 }
 if(s.terminal)for(const row of snapshot){
  const o=s.officers[row.officerId],t=s.terminal,f=t.factionsById[o.allegianceFactionId];if(f.rulerId!==o.officerId||!f.alive)continue;
  const candidates=t.officerOrder.filter(id=>!s.wanderers[id]&&t.officersById[id].allegianceFactionId===o.allegianceFactionId&&alive(t.officersById[id])).sort(),cause=`${t.citiesById[row.cityId].occupationRecordId}.C26.WANDERER.${o.officerId}`,recordId=`${cause}.RULER`,choiceId=`CHOICE.C26.SUCCESSION.${s.globalTick}.${o.officerId}`;
  f.rulerId=null;f.rulerVacancy=candidates.length?'PENDING_SUCCESSION':'VACANT_ONE_TURN';s.factions[o.allegianceFactionId].rulerId=null;
  t.recordsById[recordId]={recordId,globalTick:s.globalTick,type:'FACTION_RULER',causeRecordIds:[cause],refs:{factionIds:[o.allegianceFactionId],armyIds:[],officerIds:[o.officerId],cityIds:[],choiceIds:[choiceId],prisonerRecordIds:[]},details:{previousRulerId:o.officerId,rulerVacancy:f.rulerVacancy,candidateOfficerIds:candidates}};
  t.choicesById[choiceId]={choiceId,type:'SUCCESSION',factionId:o.allegianceFactionId,cityId:null,candidateOfficerIds:candidates,status:'PENDING',createdAtTick:s.globalTick,causeRecordId:recordId,resolvedAtTick:null,resolutionRecordId:null};t.choiceOrder.push(choiceId);t.choiceOrder.sort();
 }
 if(snapshot.length&&s.terminal)syncCampaignAdministrativeTerminal(s);
 return snapshot;
}
export function domesticMetrics(s){return {selected:s.c26?.selected??{},activations:s.c26?.counts??{}};}
export function domesticGranaryView(s,fid,capacity){const row=strongest(domesticFactionRules(s,fid,'SHARED_GRANARY'));if(!row)return null;const cities=Object.values(s.cities).filter(c=>c.ownerFactionId===fid);return {stock:cities.reduce((n,c)=>n+c.foodStock,0),capacity:Math.max(cities.reduce((n,c)=>n+c.reservedResources.food,0),Math.floor(cities.reduce((n,c)=>n+capacity(c),0)*Math.max(0,1-row.x.params.capPenalty/100))),cityIds:cities.map(c=>c.cityId).sort()};}

export function initializeDomestic(s){
 if(!c26Enabled(s))return;
 for(const o of Object.values(s.officers)){if(!Object.hasOwn(o,'c26OriginFaction'))o.c26OriginFaction=o.allegianceFactionId;if(!Object.hasOwn(o,'c26OriginCity'))o.c26OriginCity=o.locationRef.kind==='CITY'?o.locationRef.id:s.personnel?.formations.find(f=>s.armies[f.formationId]?.commanderId===o.officerId)?.nodeId??s.factions[o.allegianceFactionId]?.capitalCityId;}
 s.c26??={counts:{},selected:{},seenOfficers:Object.keys({...s.officers,...s.wanderers})};
}
export function domesticCommands(s,c,costForJob,recruitCost){
 if(!c26Enabled(s))return [];
 const choices=[],alt=domesticRule(s,c,'ALT_PAYMENT'),job=c.currentProduction;
 if(alt&&job&&domesticFacility(job.kind))for(const resource of ['fame','science']){const wallet=resource==='fame'?'prestige':'science',cost=c34Cost(s,c,resource==='fame'?'prestige':'science',Math.ceil(Math.max(0,costForJob(job.kind)-(c.jobProgress[job.key]??0))*alt.params[resource]));choices.push({type:'CITY_ALT_PAYMENT',cityId:c.cityId,resource,label:resource==='fame'?'인망으로 마무리':'과학으로 마무리',cost,blockedReason:cost>s.factions[c.ownerFactionId][wallet]-(wallet==='prestige'?(s.captiveRecruitment?.factions[c.ownerFactionId]?.reservedPrestige??0):0)?'세력 자원 부족':null});}
 if(c.c26?.privilege)choices.push({type:'CITY_REVOKE_PRIVILEGE',cityId:c.cityId,label:'특권 철회',cost:c.c26.privilege.revoke,blockedReason:s.factions[c.ownerFactionId].prestige-(s.captiveRecruitment?.factions[c.ownerFactionId]?.reservedPrestige??0)<c.c26.privilege.revoke?'세력 인망 부족':null});
 if(domesticRule(s,c,'REMOTE_RECRUIT'))for(const o of Object.values(s.wanderers??{}).filter(o=>o.locationRef.id!==c.cityId&&s.cities[o.locationRef.id]?.ownerFactionId===c.ownerFactionId).sort((a,b)=>a.officerId.localeCompare(b.officerId)))choices.push({type:'CITY_REMOTE_RECRUIT',cityId:c.cityId,officerId:o.officerId,label:`${o.name} 원격 등용`,cost:recruitCost(o.locationRef.id),blockedReason:Object.values(s.captiveRecruitment.proposals).some(p=>p.targetOfficerId===o.officerId&&p.status==='NEGOTIATING')?'등용 협의 중':null});
 return choices;
}
export function domesticCommand(s,command,{costForJob,finishJob,recruit,recruitCost}){
 const c=s.cities[command.cityId];if(!c||c.ownerFactionId!==s.playerFactionId)throw new Error('INVALID_C26_CITY');
 const choice=domesticCommands(s,c,kind=>costForJob(s,c,kind),cityId=>recruitCost(s,cityId,c.ownerFactionId)).find(x=>x.type===command.type&&(x.resource??null)===(command.resource??null)&&(x.officerId??null)===(command.officerId??null));
 if(!choice)throw new Error('C26_COMMAND_UNAVAILABLE');if(choice.blockedReason)throw new Error(choice.blockedReason);
 if(command.type==='CITY_ALT_PAYMENT'){const job=c.currentProduction;if(s.occupations?.[c.cityId]?.stage&&s.occupations[c.cityId].stage!=='NORMAL')throw new Error('점령 중 생산 중단');const wallet=command.resource==='fame'?'prestige':'science',oldProduction=c.production;s.factions[c.ownerFactionId][wallet]-=choice.cost;c.jobProgress[job.key]=costForJob(s,c,job.kind);c.production=0;finishJob(s,c);c.production=oldProduction;if(c.currentProduction)throw new Error(c.jobBlocked??'시설 완공 불가');domesticLine(s,c,domesticRule(s,c,'ALT_PAYMENT'),`${choice.label} · ${choice.cost} 소모`,wallet,-choice.cost);}
 if(command.type==='CITY_REVOKE_PRIVILEGE'){const x=c.c26.privilege.source;s.factions[c.ownerFactionId].prestige-=choice.cost;delete c.c26.privilege;domesticLine(s,c,x,`특권 철회 · 인망 −${choice.cost}`,'prestige',-choice.cost);}
 if(command.type==='CITY_REMOTE_RECRUIT'){const origin=s.wanderers[command.officerId].locationRef.id;recruit(s,{cityId:origin,officerId:command.officerId});s.c26.remoteProposals??={};s.c26.remoteProposals[`C16.${s.captiveSequence}`]=c.cityId;domesticLine(s,c,domesticRule(s,c,'REMOTE_RECRUIT'),`${command.officerId} 원격 등용 협의`);}
 return s;
}
// Pool settlements pay aggregate upkeep even when individual cities are besieged.
export function domesticBeginGranaries(s,rates,need){
 if(!c26Enabled(s))return {};
 const pools={};
 for(const fid of Object.keys(s.factions)){
  const row=strongest(domesticFactionRules(s,fid,'SHARED_GRANARY')),cities=Object.values(s.cities).filter(c=>c.ownerFactionId===fid);
  if(!row){if(s.c26?.granaries?.[fid])delete s.c26.granaries[fid];continue;}
  const reserved=cities.reduce((n,c)=>n+c.reservedResources.food,0),cap=Math.max(reserved,Math.floor(cities.reduce((n,c)=>n+rates(s,c).capacity,0)*(1-row.x.params.capPenalty/100)));
  pools[fid]={stock:cities.reduce((n,c)=>n+c.foodStock,0),cap,reserved,shortage:cities.reduce((n,c)=>n+c.foodStock-c.reservedResources.food+rates(s,c).food-need(s,c),0)<0,cities: cities.map(c=>c.cityId),source:row};
  for(const c of cities)c.foodStock=c.reservedResources.food;
  pools[fid].stock+=cities.reduce((n,c)=>n+rates(s,c,{shortage:pools[fid].shortage}).food,0)-reserved;
  s.c26.granaries??={};s.c26.granaries[fid]={capacity:cap};
  domesticLine(s,row.c,row.x,`공동 창고 상한 ${cap} · −${row.x.params.capPenalty}%`,'food');
 }
 return pools;
}
export function domesticFinishGranaries(s,pools,rates){
 for(const [fid,pool] of Object.entries(pools)){
  const row=pool.source,overflow=Math.max(0,pool.stock+pool.reserved-pool.cap);runDomestic(s,row.c,'SURPLUS_TO_TROOPS','overflow',{overflow});
  const stock=Math.max(0,Math.min(pool.stock,pool.cap-pool.reserved)),cities=pool.cities.map(id=>s.cities[id]),caps=cities.map(c=>Math.max(0,rates(s,c).capacity-c.reservedResources.food)),total=caps.reduce((n,v)=>n+v,0);let left=Math.floor(stock);
  for(let i=0;i<cities.length;i++){const c=cities[i],n=i===cities.length-1?left:Math.min(left,Math.floor(stock*(total?caps[i]/total:1/cities.length)));c.foodStock=c.reservedResources.food+n;left-=n;c.foodCapacity=Math.max(c.reservedResources.food,rates(s,c).capacity);}
 }
}

// Registered handlers only commit at their explicit event, never on generic PASSIVE queries.
const domesticHandlers={
 HARVEST_PULSE:({s,c,x,phase})=>{if(phase==='settle'&&c.c26.settlements%Math.max(1,Math.round(x.params.period))===0){c.foodStock+=Math.round(x.params.food);domesticLine(s,c,x,`식량 +${Math.round(x.params.food)}`,'food',Math.round(x.params.food));}},
 CAPTIVE_DEBT:({s,c,x,phase})=>{let n=phase==='release'?x.params.release:phase==='settle'?Object.values(s.terminal?.prisonersById??{}).filter(p=>p.captorFactionId===c.ownerFactionId&&p.disposition==='HELD').length*x.params.perTurn:0;if(n){n=Math.round(n);s.factions[c.ownerFactionId].prestige+=n;domesticLine(s,c,x,`포로 인망 +${n} · 이 성 포로 등용 불가`,'prestige',n);}},
 EMERGENCY_LEVY:({s,c,x,phase})=>{if(phase==='settle'&&c.besieged&&!c.c26.levied){c.c26.levied=true;if(domesticFoodAvailable(s,c)>=Math.round(x.params.food)){domesticSpendFood(s,c,Math.round(x.params.food));domesticReserve(s,c,x.params.reserve);domesticLine(s,c,x,`식량 −${Math.round(x.params.food)} · 예비병 +${Math.trunc(x.params.reserve)}`,'food',-Math.round(x.params.food));}}},
 HARSH_TREATMENT:({s,c,x,phase})=>{if(phase==='settle'&&c.securityLevel>0&&c.reserveTroops>=Math.round(x.params.reserve)){domesticReserve(s,c,-Math.round(x.params.reserve));domesticSecurity(s,c,-1,'TREATMENT');domesticLine(s,c,x,`예비병 −${Math.round(x.params.reserve)} · 치안 회복`,'security',-1);}},
 SURPLUS_TO_TROOPS:({s,c,x,phase,overflow})=>{if(phase==='overflow'&&overflow>0){const n=Math.floor(overflow*x.params.ratio);domesticReserve(s,c,n);domesticLine(s,c,x,`넘친 식량 ${overflow} → 예비병 ${n}`,'reserve',n);}},
 PRODUCTION_OVERFLOW:({s,c,x,phase,overflow})=>{if(phase==='job'&&overflow>0){c.c26??={};c.c26.productionCarry=(c.c26.productionCarry??0)+overflow;domesticLine(s,c,x,`다음 작업 생산 +${overflow}`,'production',overflow);}},
 BUILD_CHAIN:({s,c,x,phase})=>{if(phase==='facility'){c.c26??={};c.c26.chain=(c.c26.chain??0)+1;domesticLine(s,c,x,`다음 시설 −${Math.min(x.params.max,c.c26.chain*x.params.step)}%`,'production');}},
 SHARED_BLUEPRINT:({s,c,x,phase,kind})=>{if(phase==='facility'){s.c26??={counts:{},selected:{}};s.c26.blueprints??={};s.c26.blueprints[c.ownerFactionId]??={};const previous=s.c26.blueprints[c.ownerFactionId][kind]??={sources:{}};previous.sources[c.cityId]=Math.max(previous.sources[c.cityId]??0,x.params.discount);domesticLine(s,c,x,`${({farm:'농장',granary:'창고',market:'시장',barracks:'병영',workshop:'공방',clinic:'의원',tuntian:'둔전',mufu:'장막부'})[kind]??'시설'} 설계 공유 −${x.params.discount}%`,'production');}},
 MENTOR_CITY:ctx=>lecture(ctx,false), LECTURE:ctx=>lecture(ctx,true),
 IMPART:({s,c,x,phase})=>{if(phase!=='settle'||c.c26.settlements%Math.max(1,Math.round(x.params.period)))return;const source=domesticOwned(s,x.id).map(x=>x.card).sort((a,b)=>a.id.localeCompare(b.id));for(const o of localOfficers(s,c)){if(o.officerId===x.id)continue;const r=s.campaignGrowth.officers[o.officerId],ranks=r.track.growthStates[o.officerId].ownedTraitRanks;if(Object.keys(ranks).filter(k=>r.cards[k]?.kind==='trait').length>=CAMPAIGN_TRAIT_SLOTS)continue;const card=source.find(c=>!Object.keys(ranks).some(k=>r.cards[k]?.id===c.id));if(!card)continue;const key=`${o.officerId}.career.${card.id}`;r.cards[key]={...structuredClone(card),traitId:key};ranks[key]=1;if(!r.pool.traits.some(t=>t.traitId===key)){r.pool.traits.push({traitId:key,ownershipType:'PUBLIC',rarity:card.rarity,rankMax:5,stageTags:['EARLY','MID','LATE'],affinityTags:[card.classTag],roleTags:[],experienceTags:[],domestic:true,careerCard:true});syncPoolFingerprint(r);}domesticLine(s,c,x,`${o.name}에게 ${card.name} 1단계 전수`);return;}},
 FIELD_DEPOT:({s,c,x,phase,a})=>{if(phase!=='start'||distance(s,c.tileId,a.tileId)>x.params.range)return;const f=s.personnel.formations.find(f=>f.formationId===a.armyId);let left=Math.min(Math.round(x.params.heal),Math.max(0,f.targetStrength-f.field)),healed=0;for(const l of s.personnel.lots.filter(l=>l.kind==='WOUNDED'&&l.originFormationId===a.armyId)){const n=Math.min(left,l.count);l.count-=n;left-=n;healed+=n;}if(healed){f.field+=healed;a.troopCount+=healed;a.woundedCount=Math.max(0,a.woundedCount-healed);a.hp=Math.min(a.maxHp,a.hp+healed*2);domesticLine(s,c,x,`${s.officers[a.commanderId]?.name??'??'} 부상병 ${healed} 복귀`,'reserve',healed);}},
 RELAY_STATIONS:({s,c,x,phase,a})=>{if(phase==='start'&&roadConnected(s,c,a)&&a.c26.move<x.params.move){a.c26.move=x.params.move;domesticLine(s,c,x,`${s.officers[a.commanderId]?.name??'??'} 이동 +${x.params.move}`,'move',x.params.move);}},
 STRICT_DISCIPLINE:ctx=>discipline(ctx), BLOODLESS_MUSTER:ctx=>discipline(ctx),
 PROCLAMATION:({s,c,x,phase})=>{if(phase==='occupation'){domesticSecurity(s,c,-1,'OCCUPATION');domesticLine(s,c,x,'치안 한 단계 회복','security',-1);}},
 PLUNDER_ARCHIVES:({s,c,x,phase,method})=>{if(phase==='occupation'&&method==='plunder'){const n=Math.round(x.params.science);s.factions[c.ownerFactionId].science+=n;domesticLine(s,c,x,`수탈 과학 +${n}`,'science',n);}},
 LOCAL_PRIVILEGE:({s,c,x,phase,method})=>{if(phase==='occupation'&&method==='conciliation'){const o=s.occupations[c.cityId];o.turnsLeft=Math.max(0,o.turnsLeft-Math.round(x.params.stages));c.c26??={};c.c26.privilege={revoke:Math.round(x.params.revoke),source:structuredClone(x)};if(!o.turnsLeft)domesticNormal(s,c);domesticLine(s,c,x,'점령 단축 · 생산 영구 −1','production',-1);}},
 INSTANT_ALLEGIANCE:({s,c,x,phase})=>{if(phase==='occupation'){domesticNormal(s,c);domesticLine(s,c,x,'즉시 정상 · 세력 전체 수탈 불가');}},
 HOMETOWN_GOVERNOR:({s,c,x,phase})=>{const officer=s.officers[x.id],home=officer.c26OriginCity,origin=officer.c26OriginFaction;if(phase==='governor'&&home===c.cityId&&origin&&origin!==c.ownerFactionId&&officer.allegianceFactionId===c.ownerFactionId){const o=s.occupations[c.cityId];if(o&&o.stage!=='NORMAL'){o.turnsLeft=Math.max(0,o.turnsLeft-Math.round(x.params.stages));c.c26??={};c.c26.hometown=true;if(!o.turnsLeft)domesticNormal(s,c);domesticLine(s,c,x,'고향 태수 점령 단축 · 인망 산출 절반','prestige');}}},
 THREE_VISITS:({s,c,x,phase,officerId})=>{if(phase==='recruit'){s.officers[officerId].c26??={};s.officers[officerId].c26.firstDraftExtra=Math.round(x.params.extra);s.officers[officerId].c26.firstDraftLevel=(s.campaignGrowth.officers[officerId]?.track.growthStates[officerId].level??1)+1;domesticLine(s,c,x,`${s.officers[officerId].name} 첫 레벨업 후보 +${Math.round(x.params.extra)}`);}},
 RELEASE_PROPAGANDA:({s,c,x,phase,homeFactionId})=>{if(phase==='release'){const n=Math.round(x.params.fame);s.factions[c.ownerFactionId].prestige+=n;const other=Object.values(s.cities).filter(c=>c.ownerFactionId===homeFactionId).sort((a,b)=>a.tileId.localeCompare(b.tileId))[0];if(other)domesticSecurity(s,other,1,'RELEASE');domesticLine(s,c,x,`석방 인망 +${n} · 원소속 성 치안 악화`,'prestige',n);if(other)domesticLine(s,other,x,'석방 선전으로 치안 악화','security',1);}},
 SUPPORT_REFUND:({s,c,x,phase,from,amount})=>{if(phase==='support'){const n=Math.floor(amount*x.params.ratio/100);from.foodStock+=n;domesticLine(s,c,x,`${from.name} 지원 식량 ${n} 반환`,'food',n);}},
 TALENT_MAGNET:({s,c,x,phase})=>{if(phase==='settle'&&c.c26.settlements%Math.max(1,Math.round(x.params.period))===0)attractTalent(s,c,x);},
};
function lecture({s,c,x,phase},armies){if(phase!=='settle')return;const os=localOfficers(s,c,{armies});for(const o of os)creditCampaignGrowth(s,{officerId:o.officerId,eventId:`C26.${x.rule}.${s.turn}.${c.cityId}.${o.officerId}`,kind:'GOVERNOR_TURN',amount:Math.round(x.params.xp)});if(os.length)domesticLine(s,c,x,`${os.map(o=>o.name).join(' · ')} 내정 경험치 +${Math.round(x.params.xp)}`,'xp',Math.round(x.params.xp));}
function discipline({s,c,x,phase,a}){if(phase==='muster'){a.c26??={};a.c26.discipline??=[];a.c26.discipline.push({rule:x.rule,threshold:x.params.threshold,until:s.turn+Math.max(1,Math.round(x.params.turns))});domesticLine(s,c,x,`${s.officers[a.commanderId]?.name??'??'} ${Math.round(x.params.turns)}턴 동요 문턱 ×${x.params.threshold}`);}}
// Spawn sources are injected from the campaign roster's existing pack catalog.
let talentCatalog={},makeOfficer=null;
export function configureDomesticTalent(packs,factory){talentCatalog=packs;makeOfficer=factory;}
export function attractTalent(s,c,x){
 s.c26??={counts:{},selected:{}};s.c26.seenOfficers??=Object.keys({...s.officers,...s.wanderers});
 const p=Object.values(talentCatalog).filter(p=>!s.c26.seenOfficers.includes(p.id)&&!s.officers[p.id]&&!s.wanderers[p.id]).sort((a,b)=>Object.values(b.stats).reduce((n,v)=>n+v,0)-Object.values(a.stats).reduce((n,v)=>n+v,0)||a.id.localeCompare(b.id))[0];
 if(p&&makeOfficer){s.wanderers[p.id]=makeOfficer(s,p,null,c.cityId);s.c26.seenOfficers.push(p.id);domesticLine(s,c,x,`${p.name} 재야 출현`);}
}
// Query and transaction rules use the same registered entry point as periodic
// rules. The caller supplies the event phase; generic PASSIVE never commits.
function domesticTransaction(id,ctx){
 const {s,c,x,phase}=ctx;
 if(phase==='output'&&['GARRISON_FARMING','MARTIAL_LAW','UNBLOCKABLE_SUPPLY'].includes(id))return domesticOutput(s,c,ctx.raw,{commit:ctx.commit});
 if(phase==='command'&&['ALT_PAYMENT','REMOTE_RECRUIT'].includes(id))return domesticCommand(s,ctx.command,ctx.adapters);
 if(id==='COUNTER_SPY'){if(phase==='vision')return x.params.vision;if(phase==='security')return domesticSecurity(s,c,ctx.delta,ctx.cause);}
 if(id==='LAST_WALL'){if(phase==='wall')return domesticWall(s,c,ctx.damage,{commit:ctx.commit});if(phase==='strike')return domesticStrike(s,c,{commit:ctx.commit});}
 if(id==='INCORRUPTIBLE'&&phase==='security')return domesticSecurityCauses(s,c,ctx.causes);
 if(id==='TOO_SMART'&&phase==='research')return domesticResearchThreshold(s,c.ownerFactionId,ctx.base);
 if(id==='DEFECTION_WELCOME'&&phase==='capture')return domesticWelcomeCapture(s,ctx.payloads,ctx.snapshot??null);
 if(id==='REFUGEE_INFLOW'&&phase==='capture')return domesticCaptured(s,ctx.payload);
 if(id==='SHARED_GRANARY'&&phase==='granary')return domesticBeginGranaries(s,ctx.rates,ctx.need);
 if(id==='REGENT'&&phase==='scope')return domesticCityRules(s,ctx.recipientCity);
}
export function domesticJoinedWanderer(s,id){if(!s.terminal)return;const source=Object.values(s.terminal.recordsById).find(r=>r.details.c26WandererState==='WANDERER'&&r.refs.officerIds.includes(id));if(!source)return;const recordId=`${source.recordId}.JOINED.${s.globalTick}`;s.terminal.recordsById[recordId]={recordId,globalTick:s.globalTick,type:'OFFICER_CAPTIVITY',causeRecordIds:[source.recordId],refs:{factionIds:[s.officers[id].allegianceFactionId],armyIds:[],officerIds:[id],cityIds:[],choiceIds:[],prisonerRecordIds:[]},details:{c26WandererState:'JOINED'}};}
for(const id of DOMESTIC_RULES)registerCampaignRule(id,domesticHandlers[id]??(ctx=>domesticTransaction(id,ctx)));

// C27 combat handlers use explicit query/commit phases. Secondary hits never
// dispatch ON_ATTACK or produce another action, so chains are finite.
export const COMBAT_TITLE_RULES=Object.freeze(['AMBUSHER','BLADESTORM','BREACH_RALLY','BREAKTHROUGH','CANTO','CHARGE_MOMENTUM','ENCIRCLE','GRUDGE','HEDGEHOG','IRON_NERVE','NINE_LIVES','NO_COUNTER_ON_FLANK','NO_FRONT','OATH_OF_REVENGE','PINCER_FOLLOWUP','ROUT_ADVANCE','SET_SPEARS','SQUARE']);
export const COMMON_TACTIC_RULES=Object.freeze(['SHOVE','SWAP','SHATTER_LINE','TAUNT','OVERWATCH','PIERCE','DUAL_STRIKE','MORALE_CONTEST','FALSE_ORDERS','STAKES','FIRE_ATTACK','AMBUSH','FEIGNED_RETREAT','INSIDE_AGENT','FLOOD','WOODPECKER','MIRROR','GALEFORCE']);
export const combatParams=(params={},rank=1)=>Object.fromEntries(Object.entries(params).map(([k,v])=>[k,typeof v==='number'?v*(1+.5*(Math.max(1,Math.min(5,rank))-1)):v]));
export function combatTraitActive(r,key){
 const reserves=r.c27RewardReserveIds??[];if(!reserves.includes(key))return true;
 const ranks=r.track.growthStates[r.pack.id].ownedTraitRanks,active=Object.keys(ranks).filter(k=>r.cards[k]?.kind==='trait'&&!reserves.includes(k)).length;
 return reserves.filter(k=>ranks[k]).indexOf(key)<Math.max(0,CAMPAIGN_TRAIT_SLOTS-active);
}
export function combatRule(s,id,rule){
 if(c28Suppressed(s,id))return null;
 const r=s.campaignGrowth?.officers[s.armies[id]?.commanderId??id];if(!r)return null;
 const ranks=r.track.growthStates[r.pack.id].ownedTraitRanks;
 const rows=[...new Set([r.coreId,...Object.keys(ranks)])].filter(k=>combatTraitActive(r,k)).map(k=>r.cards[k]).filter(c=>c?.kind==='trait').flatMap(card=>(card.effects??[]).filter(e=>e.op==='RULE'&&e.rule===rule).map(e=>({card,e,rank:ranks[card.traitId]??1,params:combatParams(e.params,ranks[card.traitId]??1)})));
 const x=rows.sort((a,b)=>b.rank-a.rank||a.card.traitId.localeCompare(b.card.traitId))[0];return x?executeCampaignRule(rule,{s,id,x,phase:'query'})??null:null;
}
export function combatRuleLine(s,id,rule,detail=''){return `${combatRule(s,id,rule)?.card.name??rule}${detail?` — ${detail}`:''}`;}
export function combatCount(s,rule){s.c27??={counts:{}};s.c27.counts[rule]=(s.c27.counts[rule]??0)+1;}
export const combatMetrics=s=>({activations:Object.fromEntries([...COMBAT_TITLE_RULES,...COMMON_TACTIC_RULES,'CTA-05'].map(rule=>[rule,s.c27?.counts?.[rule]??0]))});
export function runCombatRule(s,id,rule,phase,args={}){const x=combatRule(s,id,rule);return x?executeCampaignRule(rule,{s,id,x,phase,...args}):undefined;}
export function combatTacticRule(card){return (card?.effects??[]).find(e=>e.op==='RULE'&&COMMON_TACTIC_RULES.includes(e.rule));}
export function installCommonCombatTactics(r){
 if(r.commonCombatVersion===1)return;
 for(const card of COMMON_COMBAT_TACTICS){const traitId=`${r.pack.id}.combat.${card.id}`;r.cards[traitId]??={...structuredClone(card),traitId,sourceText:'공용 전투 전법'};
  if(!r.pool.traits.some(t=>t.traitId===traitId))r.pool.traits.push({traitId,ownershipType:'PUBLIC',rarity:card.rarity,rankMax:5,stageTags:['EARLY','MID','LATE'],affinityTags:[card.classTag].flat().filter(Boolean),roleTags:[],experienceTags:[],careerCard:true,domestic:false});
 }
 r.commonCombatVersion=1;if(r.track)syncPoolFingerprint(r);
}
const combatDistance=(s,a,b)=>hexDistance(s.tiles[a],s.tiles[b]);
export function oppositeCombatTile(s,source,target){const a=s.tiles[s.armies[source].tileId],t=s.tiles[s.armies[target].tileId],ray=neighbors(t)[directionToward(t,a)];return tileId({q:2*t.q-ray.q,r:2*t.r-ray.r});}
export function combatArmyAt(s,tile){return Object.values(s.armies).filter(a=>a.tileId===tile&&castleArmyActive(s,a)).sort((a,b)=>a.armyId.localeCompare(b.armyId))[0];}
export function combatAlly(s,id,target,{behind=false}={}){const a=s.armies[id],t=s.armies[target];return Object.values(s.armies).filter(b=>b.armyId!==id&&b.factionId===a.factionId&&!diplomacyAttackReason(s,b.armyId,target)&&b.morale!=='ROUTING'&&castleArmyActive(s,b)&&(behind?b.tileId===oppositeCombatTile(s,id,target):combatDistance(s,b.tileId,t.tileId)===1)).sort((a,b)=>a.armyId.localeCompare(b.armyId))[0];}
export function combatRival(s,id){
 const a=s.armies[id],r=s.campaignGrowth?.officers[a?.commanderId],ids=(r?.titles??[]).map(t=>t.opponentId).filter(Boolean);
 return Object.values(s.armies).filter(b=>diplomacyArmyHostile(s,id,b.armyId)&&ids.includes(b.commanderId)&&castleArmyActive(s,b)&&s.knowledge[a.factionId]?.tiles[b.tileId]==='VISIBLE'&&s.knowledge[a.factionId]?.observedArmies[b.armyId]).sort((b,c)=>combatDistance(s,a.tileId,b.tileId)-combatDistance(s,a.tileId,c.tileId)||b.armyId.localeCompare(c.armyId))[0];
}
export function combatMoveAllowed(s,id,destination){const a=s.armies[id],rival=combatRule(s,id,'GRUDGE')&&combatRival(s,id);return !rival||combatDistance(s,destination,rival.tileId)<combatDistance(s,a.c27?.startTile??a.tileId,rival.tileId);}
export function combatMovement(s,id){const a=s.armies[id],rival=combatRule(s,id,'GRUDGE')&&combatRival(s,id);return {rooted:a.c27?.rootTurn===s.turn||(a.c27?.rootTurn<=s.turn&&a.c27?.c31RootUntil>=s.turn),delta:(rival?combatRule(s,id,'GRUDGE').params.move:0)-(a.c27?.floodCostTurn===s.turn?2:0),max:classPostMove(s,id)?Math.max(0,Math.floor(10/(s.mapRules.tuning?.byTroop?.[a.troopType]?.plain??(a.troopType==='cavalry'?1.25:2)))-armyClass(s,id).ability.params.movePenalty):a.c32?.postMove===s.turn||combatRule(s,id,'SQUARE')?1:Infinity};}
export function combatIgnoreZone(s,id,enemy){return !!combatRule(s,id,'BREAKTHROUGH')&&['DISORDERED','BROKEN'].includes(enemy.formation);}
export function combatCanPostMove(s,id){const a=s.armies[id];return classPostMove(s,id)||a?.c27?.cantoTurn===s.turn&&(a.c27.cantoRemaining??0)>0;}
export function combatMoraleGuard(s,id,from,to){
 if(['STEADY','SHAKEN','ROUTING'].indexOf(to)<=['STEADY','SHAKEN','ROUTING'].indexOf(from))return false;
 if(combatRule(s,id,'GRUDGE')&&combatRival(s,id)){combatCount(s,'GRUDGE');return true;}
 return !!runCombatRule(s,id,'IRON_NERVE','morale');
}
export function combatSurvive(s,id,loss,commit){return runCombatRule(s,id,'NINE_LIVES','survive',{loss,commit})??loss;}
export function combatStartFaction(s,fid){
 for(const a of Object.values(s.armies).filter(a=>a.factionId===fid&&castleArmyActive(s,a))){
  if(a.c27?.started===s.turn)continue;
  if(a.c27||COMBAT_TITLE_RULES.some(rule=>combatRule(s,a.armyId,rule))){a.c27??={};a.c27.started=s.turn;a.c27.startTile=a.tileId;a.c27.hiddenFrom=Object.keys(s.factions).filter(f=>f!==fid&&s.knowledge[f]?.tiles[a.tileId]!=='VISIBLE');delete a.c27.overwatch;delete a.c27.stakes;delete a.c27.cantoTurn;a.c27.movementTicks=0;}
  runCombatRule(s,a.armyId,'ENCIRCLE','start');
 }
 for(const c of Object.values(s.cities))if(c.ownerFactionId===fid&&c.c27?.insideUntil<s.turn)delete c.c27.insideUntil;
 if(s.c27?.floods)s.c27.floods=s.c27.floods.filter(e=>e.until>=s.turn);
 if(s.c27?.fires)s.c27.fires=s.c27.fires.filter(e=>e.until>=s.turn);
}
export function combatRecordRouts(s,before,attacker,target){
 for(const a of Object.values(s.armies))if(a.morale==='ROUTING'&&before.armies[a.armyId]?.morale!=='ROUTING'&&combatRule(s,a.armyId,'OATH_OF_REVENGE')){
  const x=combatRule(s,a.armyId,'OATH_OF_REVENGE'),killer=s.armies[a.armyId===attacker?target:attacker];if(!killer||killer.factionId===a.factionId)continue;a.c27??={};a.c27.oath={left:Math.floor(x.params.turns),opponentId:killer.commanderId};combatCount(s,'OATH_OF_REVENGE');
 }
}
export function combatFinishAttack(s,before,id,target,p,{reaction=false}={}){
 const a=s.armies[id],t=s.armies[target],lines=p.effectLines;
 for(const rule of COMBAT_TITLE_RULES)runCombatRule(s,id,rule,'after',{before,target,p,reaction,lines});
 if(a.c27?.ambush)delete a.c27.ambush;
 if(!reaction&&a.c27?.oath){
  const oath=a.c27.oath;if(t.commanderId===oath.opponentId&&(t.morale==='ROUTING'||!t.troopCount)){
   const r=s.campaignGrowth.officers[a.commanderId],enemy=s.campaignGrowth.officers[t.commanderId];
   const card=Object.values(enemy.cards).filter(c=>c.title&&c.rarity==='RARE'&&c.kind==='trait'&&!c.core).sort((a,b)=>a.traitId.localeCompare(b.traitId))[0]??Object.values(r.cards).filter(c=>c.kind==='trait'&&c.rarity==='RARE'&&c.traitId.includes('.common.')).sort((a,b)=>a.traitId.localeCompare(b.traitId))[0];
   if(card){const traitId=card.traitId.startsWith(`${r.pack.id}.`)?card.traitId:`${r.pack.id}.revenge.${card.id}`;r.cards[traitId]??={...structuredClone(card),traitId};const ranks=r.track.growthStates[r.pack.id].ownedTraitRanks;if(!ranks[traitId]&&Object.keys(ranks).filter(k=>r.cards[k]?.kind==='trait'&&combatTraitActive(r,k)).length>=CAMPAIGN_TRAIT_SLOTS){r.c27RewardReserveIds??=[];r.c27RewardReserveIds.push(traitId);}if(!r.pool.traits.some(c=>c.traitId===traitId)){r.pool.traits.push({traitId,ownershipType:'PUBLIC',rarity:'RARE',rankMax:5,stageTags:['EARLY','MID','LATE'],affinityTags:[card.classTag].flat().filter(Boolean),roleTags:[],experienceTags:[]});syncPoolFingerprint(r);}ranks[traitId]=Math.min(5,(ranks[traitId]??0)+1);lines.push(`복수의 맹세 — ${card.name} 즉시 획득`);}
   delete a.c27.oath;
  }else if(--oath.left<=0)delete a.c27.oath;
 }
 combatRecordRouts(s,before,id,target);
}
const titleHandlers={
 IRON_NERVE:({s,id,phase})=>{if(phase!=='morale')return;const a=s.armies[id];if(a.c27?.nerveTurn===s.turn)return false;a.c27??={};a.c27.nerveTurn=s.turn;combatCount(s,'IRON_NERVE');return true;},
 NINE_LIVES:({s,id,x,phase,loss,commit})=>{if(phase!=='survive')return;const a=s.armies[id];if(loss<a.troopCount||(a.c27?.lives??0)>=Math.floor(x.params.uses))return loss;const left=Math.max(1,Math.ceil(a.troopCount*.05));if(commit){a.c27??={};a.c27.lives=(a.c27.lives??0)+1;a.c27.saved=true;combatCount(s,'NINE_LIVES');}return a.troopCount-left;},
 CANTO:({s,id,phase,p,reaction,lines})=>{if(phase!=='after'||reaction||!p.charge)return;const a=s.armies[id],plain=s.mapRules.tuning?.byTroop?.[a.troopType]?.plain??s.mapRules.tuning?.cavalry?.plain??1.25;const left=Math.max(0,200-(a.c27?.movementTicks??(a.movedTiles??0)*plain*20));if(left&&a.troopCount&&a.morale!=='ROUTING'){a.c27??={};a.c27.cantoTurn=s.turn;a.c27.cantoRemaining=left;a.c27.cantoTicks=left;s.endedArmyIds=s.endedArmyIds.filter(k=>k!==id);s.movedArmyIds=s.movedArmyIds.filter(k=>k!==id);if(!lines.some(l=>l.startsWith(combatRuleLine(s,id,'CANTO'))))lines.push(combatRuleLine(s,id,'CANTO',`남은 이동 ${left}틱 · 후퇴만`));combatCount(s,'CANTO');}},
 BREAKTHROUGH:({s,id,phase,p,reaction,lines})=>{if(phase==='after'&&p.charge&&!reaction){changeFormation(s,id,1,p.formationChanges);if(!lines.some(l=>l.startsWith(combatRuleLine(s,id,'BREAKTHROUGH'))))lines.push(combatRuleLine(s,id,'BREAKTHROUGH','대가: 자기 전열 한 단계'));combatCount(s,'BREAKTHROUGH');}},
 ROUT_ADVANCE:({s,id,x,phase,p,target,before,reaction,lines})=>{if(phase!=='after'||reaction||!p.charge||s.armies[target].morale!=='ROUTING'||before.armies[target].morale==='ROUTING')return;const a=s.armies[id],to=before.armies[target].tileId;if(combatDistance(s,a.tileId,to)===1&&combatEmptyStep(s,id,to)){a.tileId=to;a.movedTiles++;lines.push(combatRuleLine(s,id,'ROUT_ADVANCE','1칸 전진 · 공격 불가'));combatCount(s,'ROUT_ADVANCE');}},
 ENCIRCLE:({s,id,x,phase})=>{if(phase!=='start')return;const a=s.armies[id];for(const c of Object.values(s.cities).filter(c=>c.ownerFactionId!==a.factionId&&!diplomacyAttackReason(s,id,c.cityId)&&combatDistance(s,a.tileId,c.tileId)<=1)){
  const occupied=new Set(Object.values(s.armies).filter(b=>b.factionId===a.factionId&&castleArmyActive(s,b)&&combatDistance(s,b.tileId,c.tileId)===1).map(b=>b.tileId));if(occupied.size<3||c.c27?.encircleKey===`${s.turn}.${a.factionId}`)continue;c.c27??={};c.c27.encircleKey=`${s.turn}.${a.factionId}`;const damage=Math.min(c.durability,Math.floor(x.params.durability));c.durability-=damage;combatCount(s,'ENCIRCLE');const defender=combatArmyAt(s,c.tileId);if(defender)checkMorale(s,defender.armyId,'포위망',10);s.combatLog??=[];const e={kind:'ENCIRCLE',sequence:++s.battleSequence,turn:s.turn,attackerId:id,cityId:c.cityId,dealt:damage,enemyLoss:damage,allyLoss:0,effectLines:[combatRuleLine(s,id,'ENCIRCLE',`성 내구 −${damage}`)],units:[],moraleChanges:[],eliminatedIds:[]};s.combatLog.push(e);
 }}
};
// Query handlers return the same params used in damage, targeting and movement.
for(const rule of COMBAT_TITLE_RULES)registerCampaignRule(rule,ctx=>ctx.phase==='query'?ctx.x:titleHandlers[rule]?.(ctx));
for(const rule of COMMON_TACTIC_RULES)registerCampaignRule(rule,ctx=>ctx.apply?.(ctx));
export function combatEmptyStep(s,id,to){const a=s.armies[id];return !!s.tiles[to]&&!diplomacyMoveReason(s,id,to)&&!combatArmyAt(s,to)&&!Object.values(s.cities).some(c=>c.tileId===to&&c.ownerFactionId!==a.factionId)&&edgeTicks(s,a,a.tileId,to)!==null&&!(s.c27?.floods??[]).some(e=>e.until>=s.turn&&e.edges.includes([a.tileId,to].sort().join('|')));}

// C27 data projection: kept byte-for-value equal to the read-only input in test-campaign-c27.
// Existing browser allowlist forbids another data route; use the already served registry.
export const COMMON_COMBAT_TACTICS=[{"id":"CTA-01","kind":"tactic","name":"밀어붙이기","rarity":"COMMON","classTag":"무용","range":1,"cooldown":2,"text":"인접 적을 1칸 밀어낸다. 밀 칸이 막혔으면 대신 전열 판정(가중 10).","effects":[{"op":"RULE","rule":"SHOVE","params":{"push":1,"blockedFormation":10},"when":"ON_TACTIC_USE","target":"TARGET","value":0,"duration":0,"condition":null}],"ref":"파이어 엠블렘 밀기·인투 더 브리치 충돌","weightTags":["무용"]},{"id":"CTA-02","kind":"tactic","name":"자리 바꾸기","rarity":"COMMON","classTag":"지휘","range":1,"cooldown":2,"text":"인접 아군과 자리를 바꾼다(흔들린 아군을 뒤로 빼기).","effects":[{"op":"RULE","rule":"SWAP","params":{},"when":"ON_TACTIC_USE","target":"ALLY","value":0,"duration":0,"condition":null}],"ref":"파이어 엠블렘 자리 바꾸기","weightTags":["지휘","DEFENSE"]},{"id":"CTA-03","kind":"tactic","name":"전열 깨기","rarity":"UNCOMMON","classTag":"무용","range":1,"cooldown":2,"text":"공격. 정돈된 상대는 흐트러지고 다음 차례까지 반격하지 못한다.","effects":[{"op":"DAMAGE_MOD","when":"ON_TACTIC_USE","target":"TARGET","value":0,"duration":0,"condition":null},{"op":"RULE","rule":"SHATTER_LINE","params":{},"when":"ON_TACTIC_USE","target":"TARGET","value":0,"duration":0,"condition":null}],"ref":"파이어 엠블렘 엔게이지 브레이크","weightTags":["무용","CHARGE"]},{"id":"CTA-04","kind":"tactic","name":"도발","rarity":"UNCOMMON","classTag":"감화","range":1,"cooldown":2,"text":"대상이 이쪽을 바라보게 돌린다 — 다른 아군에게 옆구리가 열린다.","effects":[{"op":"RULE","rule":"TAUNT","params":{},"when":"ON_TACTIC_USE","target":"TARGET","value":0,"duration":0,"condition":null}],"ref":"배틀 브라더스·택틱스 오우거 도발","weightTags":["감화","FLANK"]},{"id":"CTA-05","kind":"tactic","name":"결집","rarity":"UNCOMMON","classTag":"감화","range":0,"cooldown":3,"text":"2칸 안 아군 사기 한 단계 회복(패주 → 동요, 동요 → 안정).","effects":[{"op":"MORALE_DELTA","when":"ON_TACTIC_USE","target":"ALL_ALLIES_IN_BATTLE","value":1,"duration":0,"condition":null}],"ref":"배틀 브라더스 결집","weightTags":["감화","COMEBACK"]},{"id":"CTA-06","kind":"tactic","name":"경계 사격","rarity":"UNCOMMON","classTag":"지휘","range":0,"cooldown":2,"text":"궁병: 다음 내 차례까지 정면 2칸 안에 처음 들어오는 적을 쏜다.","effects":[{"op":"RULE","rule":"OVERWATCH","params":{"range":2},"when":"ON_TACTIC_USE","target":"TARGET","value":0,"duration":0,"condition":null}],"ref":"XCOM2 경계","weightTags":["지휘","DEFENSE"]},{"id":"CTA-07","kind":"tactic","name":"관통 사격","rarity":"RARE","classTag":"무용","range":2,"cooldown":2,"text":"궁병 사격이 대상 뒤 부대에도 절반 피해.","effects":[{"op":"DAMAGE_MOD","when":"ON_TACTIC_USE","target":"TARGET","value":0,"duration":0,"condition":null},{"op":"RULE","rule":"PIERCE","params":{"ratio":50},"when":"ON_TACTIC_USE","target":"TARGET","value":0,"duration":0,"condition":null}],"ref":"삼국지11 관시","weightTags":["무용"]},{"id":"CTA-08","kind":"tactic","name":"둘이 함께 치기","rarity":"RARE","classTag":"지휘","range":1,"cooldown":3,"text":"대상과 맞닿은 아군 한 부대가 함께 공격(그 아군은 행동을 쓰지 않음).","effects":[{"op":"RULE","rule":"DUAL_STRIKE","params":{},"when":"ON_TACTIC_USE","target":"TARGET","value":0,"duration":0,"condition":null}],"ref":"XCOM 유대·삼국지14 연계","weightTags":["지휘","FLANK"],"formerName":"쌍격"},{"id":"CTA-09","kind":"tactic","name":"기세 싸움","rarity":"RARE","classTag":"지휘","range":1,"cooldown":3,"text":"맞닿은 적 1부대와 지휘 비교 — 이기면 대상 사기 한 단계 하락, 지면 이 부대 사기 판정(가중 10).","effects":[{"op":"RULE","rule":"MORALE_CONTEST","params":{"stat":"지휘","loseWeight":10},"when":"ON_TACTIC_USE","target":"TARGET","value":0,"duration":0,"condition":null}],"ref":"토탈워 사기 판정 · 다키스트 던전 스트레스(부대 대 부대 — 일기토 없음)","weightTags":["지휘"],"note":"2026-10-04: 사용자 결정 \"일기토는 없다\"(작업기준 :216)에 따라 일대일 결투(DUEL)를 부대 기세 싸움으로 바꿈. 옛 이름 일기토는 formerName."},{"id":"CTA-10","kind":"tactic","name":"거짓 소문","rarity":"RARE","classTag":"지략","range":2,"cooldown":3,"text":"지략 대결. 이기면 대상은 다음 차례 이동하지 못한다.","effects":[{"op":"RULE","rule":"FALSE_ORDERS","params":{},"when":"ON_TACTIC_USE","target":"TARGET","value":0,"duration":0,"condition":null}],"ref":"삼국지 시리즈 위보","weightTags":["지략"],"formerName":"위보(僞報)"},{"id":"CTA-11","kind":"tactic","name":"말뚝 박고 버티기","rarity":"RARE","classTag":"지휘","range":0,"cooldown":3,"text":"다음 내 차례까지 측면·돌격 보너스를 받지 않는다. 대가: 다음 차례 이동 불가.","effects":[{"op":"RULE","rule":"STAKES","params":{},"when":"ON_TACTIC_USE","target":"TARGET","value":0,"duration":0,"condition":null}],"ref":"토탈워 말뚝","weightTags":["지휘","DEFENSE"],"cost":"다음 차례 이동 불가","formerName":"말뚝 박기"},{"id":"CTA-12","kind":"tactic","name":"불 지르기","rarity":"EPIC","classTag":"지략","range":2,"cooldown":3,"text":"숲·풀 칸에 불. 그 칸과 맞닿은 숲으로 한 번 번지고, 불 칸의 부대는 병력 손실 + 전열 판정.","effects":[{"op":"RULE","rule":"FIRE_ATTACK","params":{"spread":1,"formation":10},"when":"ON_TACTIC_USE","target":"TARGET","value":0,"duration":0,"condition":null}],"ref":"삼국지 화계·트라이앵글 스트래티지 불","weightTags":["지략"],"formerName":"화계"},{"id":"CTA-13","kind":"tactic","name":"매복","rarity":"EPIC","classTag":"지략","range":0,"cooldown":3,"text":"숲에 있으면 숨는다 — 첫 공격까지 적 시야에 안 보이고, 그 첫 공격은 후방 공격.","effects":[{"op":"RULE","rule":"AMBUSH","params":{},"when":"ON_TACTIC_USE","target":"TARGET","value":0,"duration":0,"condition":null}],"ref":"삼국지8R 매복","weightTags":["지략","FLANK"]},{"id":"CTA-14","kind":"tactic","name":"후퇴로 꾀어내기","rarity":"EPIC","classTag":"지휘","range":0,"cooldown":3,"text":"추격 없이 2칸 물러난다. 따라온 적이 아군 2부대 이상에 닿으면 측면 판정 + 흐트러짐.","effects":[{"op":"RULE","rule":"FEIGNED_RETREAT","params":{"back":2},"when":"ON_TACTIC_USE","target":"TARGET","value":0,"duration":0,"condition":null}],"ref":"노부나가 시마즈 낚시 매복","weightTags":["지휘","FLANK"],"formerName":"낚시 매복(釣り野伏せ)"},{"id":"CTA-15","kind":"tactic","name":"성 안 내통","rarity":"LEGENDARY","classTag":"지략","range":2,"cooldown":3,"text":"성 태수와 지략 대결. 이기면 그 성 1턴 동안 성 사격·내구 회복 없음. 대가: 지면 이 부대 사기 한 단계 하락.","effects":[{"op":"RULE","rule":"INSIDE_AGENT","params":{},"when":"ON_TACTIC_USE","target":"TARGET","value":0,"duration":0,"condition":null}],"ref":"삼국지·노부나가 조략","weightTags":["지략","SIEGE"],"cost":"실패 시 자기 사기 하락","formerName":"내응(內應)"},{"id":"CTA-16","kind":"tactic","name":"강물 터뜨리기","rarity":"LEGENDARY","classTag":"지략","range":2,"cooldown":3,"text":"강 칸 하나와 이웃 강 칸을 2턴 동안 건널 수 없게. 그 칸 부대는 전열 판정. 대가: 이 부대도 다음 차례 이동 −2.","effects":[{"op":"RULE","rule":"FLOOD","params":{"turns":2},"when":"ON_TACTIC_USE","target":"TARGET","value":0,"duration":0,"condition":null}],"ref":"삼국지 수공","weightTags":["지략"],"cost":"다음 차례 이동 −2","formerName":"수공(水攻)"},{"id":"CTA-17","kind":"tactic","name":"앞뒤로 몰아치기","rarity":"LEGENDARY","classTag":"지휘","range":2,"cooldown":3,"text":"대상 뒤에 아군이 있으면 그 아군이 후방 공격하고 대상을 이쪽으로 1칸 민다. 대가: 그 아군은 이번 차례 행동 종료.","effects":[{"op":"RULE","rule":"WOODPECKER","params":{},"when":"ON_TACTIC_USE","target":"TARGET","value":0,"duration":0,"condition":null}],"ref":"노부나가 다케다 딱따구리","weightTags":["지휘","FLANK"],"cost":"협력 아군 행동 종료","formerName":"딱따구리 전법(啄木鳥)"},{"id":"CTA-18","kind":"tactic","name":"적 전법 따라 하기","rarity":"MYTHIC","classTag":"지략","range":0,"cooldown":3,"text":"마지막으로 이 부대를 맞힌 적 전법을 그대로 한 번 쓴다. 대가: 쓰고 나면 그 전법 재사용 대기가 이 전법에도 걸림.","effects":[{"op":"RULE","rule":"MIRROR","params":{},"when":"ON_TACTIC_USE","target":"TARGET","value":0,"duration":0,"condition":null}],"ref":"발라트로 청사진·청마도사","weightTags":["지략","LEARN"],"cost":"대기 공유","formerName":"거울 장군"},{"id":"CTA-19","kind":"tactic","name":"몰아쳐 한 번 더","rarity":"MYTHIC","classTag":"무용","range":1,"cooldown":3,"text":"공격. 이 공격으로 패주시키면 이번 차례 행동 한 번 더(턴당 1회). 대가: 패주시키지 못하면 이 부대 전열 흐트러짐.","effects":[{"op":"DAMAGE_MOD","when":"ON_TACTIC_USE","target":"TARGET","value":10,"duration":0,"condition":null},{"op":"RULE","rule":"GALEFORCE","params":{},"when":"ON_TACTIC_USE","target":"TARGET","value":0,"duration":0,"condition":null}],"ref":"파이어 엠블렘 질풍·XCOM 연쇄","weightTags":["무용","CHARGE"],"cost":"실패 시 자기 흐트러짐","formerName":"질풍"}];

// C32 trial input projection; keep existing browser routes and old saved cards.
export const UNIQUE_OFFICERS=[...redesign50.officers,...C34_OFFICERS].map(o=>({id:o.id,name:o.name,uniqueTrait:o.uniqueTrait,signatureTactic:o.signatureTactic}));

export const uniqueEnabled=s=>['v2','v3'].includes(s.mapId);
export const UNIQUE_RULES=Object.freeze(UNIQUE_OFFICERS.flatMap(o=>[o.uniqueTrait,o.signatureTactic].flatMap(c=>c.effects.map(e=>e.rule))));
const uniqueById=new Map(UNIQUE_OFFICERS.map(o=>[o.id,o]));
export function overlayUniquePack(s,pack){
 const o=uniqueEnabled(s)&&uniqueById.get(pack.id);if(!o)return structuredClone(pack);
 const next=structuredClone(pack);next.uniqueVersion=Number(pack.id.slice(1))>50?'redesign-51-100-v0.2':'redesign-50-v0.2';next.uniqueTrait=structuredClone(o.uniqueTrait);
 const index=next.draftPool.findIndex(c=>c.kind==='tactic'&&[c.classTag].flat().includes('고유'));
 next.draftPool[index<0?0:index]=structuredClone(o.signatureTactic);if(Number(pack.id.slice(1))>50){delete next.uniqueTrait.formerName;delete next.draftPool[index<0?0:index].formerName;}return next;
}
export function uniqueOwned(s,id,rule){
 if(c28Suppressed(s,id)&&!c29Hidden(s,id))return null;
 if(!uniqueEnabled(s))return null;
 const r=s.campaignGrowth?.officers[s.armies[id]?.commanderId??id];if(!r)return null;
 const ranks=r.track.growthStates[r.pack.id].ownedTraitRanks;
 return [...new Set([r.coreId,...Object.keys(ranks)])].map(k=>r.cards[k]).filter(c=>c?.kind==='trait').flatMap(c=>(c.effects??[]).filter(e=>e.rule===rule).map(e=>({card:c,e,params:Object.fromEntries(Object.entries(e.params??{}).map(([k,v])=>[k,typeof v==='number'&&!['range','turns','uses','cost','at','threshold'].includes(k)?v*c29CoreFactor(s,id):v])),id}))).at(0)??null;
}
const uniqueNear=(s,id,{enemy=false,range=2,center=id}={})=>{const a=s.armies[id],c=s.armies[center];return !a||!c?[]:Object.values(s.armies).filter(b=>castleArmyActive(s,b)&&(enemy?diplomacyArmyHostile(s,id,b.armyId):b.factionId===a.factionId)&&hexDistance(s.tiles[c.tileId],s.tiles[b.tileId])<=range).sort((a,b)=>a.armyId.localeCompare(b.armyId));};
const uniqueStrength=(s,id)=>s.personnel.formations.find(f=>f.formationId===id)?.targetStrength??s.armies[id]?.troopCount??1;
const uniquePercent=(s,id)=>100*s.armies[id].troopCount/Math.max(1,uniqueStrength(s,id));
const uniqueStat=(s,id,key)=>s.officers[s.armies[id]?.commanderId??id]?.baseStats[key]??0;
const uniqueCity=(s,id)=>{const a=s.armies[id];return Object.values(s.cities).find(c=>c.ownerFactionId===a?.factionId&&[c.tileId,...c.footprint.gates].includes(a.tileId));};
const uniqueCount=(s,rule)=>{s.c32??={counts:{},uses:{}};s.c32.counts[rule]=(s.c32.counts[rule]??0)+1;};
const uniqueCooldown=(s,id,delta)=>{const a=s.armies[id];for(const key of Object.keys(a.tacticReadyTurns??{}))a.tacticReadyTurns[key]=Math.max(s.turn,a.tacticReadyTurns[key]+delta);};
const uniqueRecoverMorale=(s,id)=>{const a=s.armies[id];if(a?.troopCount)changeMorale(s,id,a.morale==='ROUTING'?'SHAKEN':'STEADY','고유 효과');};
export function uniqueOp(op,value,target='SELF',condition=null,extra={}){return {op,value,target,condition,when:'PASSIVE',duration:0,...extra};}
export function uniqueOps({s,source,recipient=source,e,ctx={},when='PASSIVE'}){
 if(c28Suppressed(s,source))return [];
 if(!uniqueEnabled(s))return [];
 if(C34_RULES.has(e.rule))return c34Ops({s,source,recipient,e,ctx,when});
 const a=s.armies[source],t=s.armies[ctx.targetId],p=e.params??{},rule=e.rule,ops=[];
 const add=(op,value,condition=null,target='SELF',extra={})=>ops.push(uniqueOp(op,value,target,condition,extra));
 const aura=(op,value,enemy=false)=>{if(a&&uniqueNear(s,source,{enemy}).some(b=>b.armyId===recipient))add(op,value);};
 const attack=['PASSIVE','ON_ATTACK'].includes(when);
 switch(rule){
 case 'U_FLYING_GENERAL':add('RULE',0,null,'SELF',{rule:'IGNORE_ZOC'});add('DAMAGE_MOD',p.lowerMightBonus,'TARGET_LOWER_MIGHT');break;
 case 'U_FEARLESS':if(a?.morale==='STEADY')add('RULE',0,null,'SELF',{rule:'IGNORE_ZOC'});break;
 case 'U_SLEEPING_DRAGON':break; // cancellation and cooldown are committed events
 case 'U_KINGS_AIDE':break; // city-only progress hook
 case 'U_BENEVOLENCE':if(a?.morale==='ROUTING')add('RULE',0,null,'SELF',{rule:'IGNORE_ZOC'});break;
 case 'U_OLD_VIGOR':add('DAMAGE_MOD',p.bonus+(s.campaignGrowth?.officers[a?.commanderId]?.track.growthStates[a?.commanderId]?.level>=10?p.late:0),'TROOP:BT03');break;
 case 'U_HERO_OF_CHAOS':aura('DAMAGE_MOD',p.aura);break;
 case 'U_TALENT_USE':if(a&&uniqueNear(s,source).length>=3){aura('DAMAGE_MOD',p.bonus);aura('DEFENSE_MOD',p.bonus);}break;
 case 'U_FOUR_GENERATIONS':break;
 case 'U_IMPERIAL_SEAL':add('DAMAGE_MOD',Math.max(0,p.start*(1-(s.turn-1)/p.turns)));break;
 case 'U_SAVAGE_HERO':aura('DAMAGE_MOD',-p.aura,true);break;
 case 'U_XILIANG_CAVALRY':add('MOVE_MOD',p.move,'TROOP:BT04');break;
 case 'U_DIVINE_MIGHT':if(a&&uniqueNear(s,source,{enemy:true}).length>=3)add('DAMAGE_MOD',p.bonus);add('DAMAGE_MOD',10,'CHARGE');break;
 case 'U_WHITE_HORSE':break; // attack mode and finite post-move hook
 case 'U_HOLD_LAND':add('DAMAGE_MOD',-15);break;
 case 'U_FIVE_PECKS':break;
 case 'U_RISE_AGAIN':add('DAMAGE_MOD',15,'TERRAIN:FOREST');add('DAMAGE_MOD',15,'TERRAIN:HILL');break;
 case 'U_MARTIAL_SAINT':add('DAMAGE_MOD',p.lowerMightBonus,'TARGET_LOWER_MIGHT');aura('DAMAGE_MOD',p.aura);aura('DEFENSE_MOD',p.aura);if(a&&t&&uniqueNear(s,source).some(b=>b.armyId!==source&&hexDistance(s.tiles[b.tileId],s.tiles[t.tileId])===1))add('DAMAGE_MOD',10);break;
 case 'U_ROAR':if(a&&uniqueNear(s,source,{enemy:true}).length>uniqueNear(s,source).length)add('DAMAGE_MOD',p.bonus);break;
 case 'U_LITTLE_CONQUEROR':if(a?.c32?.awakened)add('DAMAGE_MOD',p.awaken);break;
 case 'U_PHOENIX_CHICK':break;
 case 'U_LEGACY_PLAN':break;
 case 'U_HAWK_WOLF':break;
 case 'U_AWE':if(t){const best=Object.values(s.armies).filter(b=>b.factionId===t.factionId&&castleArmyActive(s,b)).sort((b,c)=>Object.values(s.officers[c.commanderId].baseStats).reduce((n,v)=>n+v,0)-Object.values(s.officers[b.commanderId].baseStats).reduce((n,v)=>n+v,0)||b.armyId.localeCompare(c.armyId))[0];if(best===t)add('DAMAGE_MOD',p.bonus);}break;
 case 'U_BODYGUARD':break;
 case 'U_FATAL_BEAUTY':if(s.officers[s.armies[recipient]?.commanderId]?.gender!=='FEMALE')aura('DAMAGE_MOD',-p.aura,true);break;
 case 'U_FIRE_GOD':break;
 case 'U_LINKED_CAMPS':break;
 case 'U_BELL_SOUND':break;
 case 'U_DIVINE_ARCHER':break;
 case 'U_PINCER_STANCE':break;
 case 'U_FORMATION_BREAKER':break;
 case 'U_FIERCE_PRIDE':break;
 case 'U_IRON_CITADEL':if(a&&uniqueCity(s,source))add('DEFENSE_MOD',p.reduce);break;
 case 'U_COUNTER_SCHEME':break;
 case 'U_TWELVE_PLANS':if(a?.c32?.spellTurn===s.turn&&attack)add('DAMAGE_MOD',15);break;
 case 'U_ADAPTIVE':break;
 case 'U_DEATH_REMONSTRANCE':{const ruler=Object.values(s.armies).find(b=>b.commanderId===s.factions[a?.factionId]?.rulerId);if(ruler&&uniqueNear(s,source).includes(ruler)&&ruler.armyId===recipient)add('DAMAGE_MOD',10);break;}
 case 'U_SUPERVISE':break;
 case 'U_FRESH_EYES':break;
 case 'U_GENEROUS':break;
 case 'U_CONSECUTIVE':break;
 case 'U_GRUDGE_AND_GRACE':if(a?.c32?.grudge===t?.commanderId)add('DAMAGE_MOD',15);if(a?.c27?.ambush||a?.c32?.hiddenUntil>=s.turn)add('DAMAGE_MOD',25,'FIRST_ROUND');break;
 case 'U_NINE_BENDS':add('MOVE_MOD',p.move,'TROOP:BT04');if(a&&Object.values(s.cities).some(c=>c.ownerFactionId===a.factionId&&distance(s,c.tileId,a.tileId)<=3))add('DAMAGE_MOD',10);break;
 case 'U_NO_RETREAT':if(a)add('DAMAGE_MOD',a.c32?.rage??0);break;
 case 'U_PLUNDERER':break;
 case 'U_FALLEN_PHOENIX':if(a&&['forest','hill'].includes(s.tiles[a.tileId].terrainType)&&(a.c27?.ambush||a.c32?.hiddenUntil>=s.turn)){add('DAMAGE_MOD',p.bonus,'FIRST_ROUND');if(t&&uniqueStat(s,t.armyId,'intelligence')>uniqueStat(s,t.armyId,'strength'))add('DAMAGE_MOD',25,'FIRST_ROUND');}break;
 case 'U_SLOW_PLAN':break;
 case 'U_TWIN_BLADES':if(a?.morale==='ROUTING')add('DEFENSE_MOD',p.retreatReduce);break;
 case 'U_FALSE_SURRENDER':if(a)add('DAMAGE_MOD',a.c32?.rage??0);break;
 default:break;
 }
 const factor=c29CoreFactor(s,source,{...ctx,side:t&&a?attackDirection(s,source,ctx.targetId):ctx.side,defending:ctx.when==='ON_DEFEND'});for(const op of ops)if(op.op!=='RULE'&&typeof op.value==='number')op.value*=factor;return ops;
}
export function expandUniqueEffect(s,source,e,ctx={},recipient=source){return e.rule?.startsWith('U_')&&uniqueEnabled(s)?executeCampaignRule(e.rule,{s,source,recipient,e,ctx,when:e.when,phase:'ops'})??[]:[e];}
export function uniqueHasRule(s,id,rule){
 if(!uniqueEnabled(s))return false;
 const a=s.armies[id];if(!a)return false;
 if(c34HasRule(s,id,rule))return true;
 if(rule==='IGNORE_ZOC')return !!uniqueOwned(s,id,'U_FLYING_GENERAL')||a.morale==='STEADY'&&!!uniqueOwned(s,id,'U_FEARLESS')||a.morale==='ROUTING'&&!!uniqueOwned(s,id,'U_BENEVOLENCE');
 if(rule==='NEVER_ROUT')return !!uniqueOwned(s,id,'U_NO_RETREAT')&&uniquePercent(s,id)>10;
 if(rule==='NO_PURSUIT')return a.c32?.noPursuitTurn===s.turn;
 if(rule==='TERRAIN_WALKER')return a.c32?.terrainUntil>=s.turn;
 return false;
}
export function uniqueImmune(s,id,status){
 if(!uniqueEnabled(s))return false;
 const a=s.armies[id];if(!a)return false;
 return c34Immune(s,id,status)||a.morale==='STEADY'&&!!uniqueOwned(s,id,'U_FEARLESS')&&['CONFUSED','ROOTED','SLOWED','TAUNT'].includes(status)||['ROOTED','TAUNT'].includes(status)&&uniqueNear(s,id).some(b=>uniqueOwned(s,b.armyId,'U_PINCER_STANCE'));
}
export function uniqueStatus(s,source,id,status,duration=1,{guaranteed=false}={}){
 if(!castleArmyActive(s,s.armies[id])||uniqueImmune(s,id,status))return false;
 const penalty=uniqueNear(s,id).some(b=>uniqueOwned(s,b.armyId,'U_PHOENIX_CHICK'))?30:0;
 const chance=Math.max(10,Math.min(95,60+(uniqueStat(s,source,'intelligence')-uniqueStat(s,id,'intelligence'))/2+(uniqueOwned(s,source,'U_FATAL_BEAUTY')?15:0)-penalty));
 // Same deterministic campaign stream as other committed combat checks.
 if(!guaranteed&&uniqueRoll(s)>=chance)return false;
 if(c28ControlGuard(s,id,status))return false;
 const a=s.armies[id],extra=uniqueNear(s,source).some(b=>uniqueOwned(s,b.armyId,'U_SUPERVISE'))?1:0;
 const start=s.turn+(s.campaignEffects?.startedTurns[a.factionId]===s.turn?1:0);
 a.effectStates??=[];a.effectStates.push({op:'STATUS_APPLY',status,source,startsTurn:start,expiresTurn:start+duration+extra-1,expiresFactionId:a.factionId});return true;
}
function uniqueRoll(s){ // campaign RNG is the shared deterministic stream
 return uniqueRandom(s)*100;}
function uniqueRandom(s){const rng=createUniqueRng();rng.restore(s.rng.value);const n=rng.next();s.rng.value=rng.state();s.rng.draws++;return n;}
// Imported once here so the existing served registry owns the C32 handlers.
import {createRng as createUniqueRng} from './rng.mjs';
export function uniqueBuff(s,source,id,op,value,duration=1){
 const a=s.armies[id];if(!a)return;a.effectStates??=[];a.effectStates.push(uniqueOp(op,value,'SELF',null,{name:'고유 효과',source,startsTurn:s.turn,expiresTurn:s.turn+duration-1+(s.campaignEffects?.startedTurns[a.factionId]===s.turn&&s.activeFactionId!==a.factionId?1:0),expiresFactionId:a.factionId}));
}
export function uniqueGovernor(s,c,rule){
 const id=c?.governorId,o=s.officers[id];if(!o||(s.mapId!=='v1'&&s.c46Disabled!==true&&o.injury)||o.lifeState!=='ALIVE'||o.captivityState!=='FREE'||o.allegianceFactionId!==c.ownerFactionId||o.locationRef?.kind!=='CITY'||o.locationRef.id!==c.cityId)return null;
 return uniqueOwned(s,id,rule);
}
export function uniqueDomestic(s,c,raw,{commit=false}={}){
 if(!uniqueEnabled(s))return [];
 const causes=[],change=(rule,key,factor)=>{const x=uniqueGovernor(s,c,rule);if(!x)return;const before=raw[key];raw[key]*=factor;causes.push({rule,resource:key,label:x.card.name,amount:raw[key]-before});if(commit)uniqueCount(s,rule);};
 causes.push(...c34Domestic(s,c,raw));
 change('U_FIVE_PECKS','food',1.5);change('U_SLOW_PLAN','food',1.3);
 if(Object.values(s.cities).some(home=>home.ownerFactionId===c.ownerFactionId&&uniqueGovernor(s,home,'U_GENEROUS'))){const before=raw.production;raw.production*=1.1;causes.push({rule:'U_GENEROUS',resource:'production',label:'아낌없이 베푼다',amount:raw.production-before});if(commit)uniqueCount(s,'U_GENEROUS');}
 if(uniqueOwned(s,c.governorId,'U_IMPERIAL_SEAL'))raw.prestige*=.8;
 return causes;
}
export function uniqueProgress(s,c,value){return uniqueGovernor(s,c,'U_KINGS_AIDE')?value*1.3:value;}
export function uniqueXpFactor(s,id){const o=s.officers[id];return c34Xp(s,id)*( Object.values(s.officers).some(b=>b.allegianceFactionId===o?.allegianceFactionId&&JSON.stringify(b.locationRef)===JSON.stringify(o.locationRef)&&uniqueOwned(s,b.officerId,'U_TALENT_USE'))?1.5:1);}
export function uniqueMusterFactor(s,c){return uniqueGovernor(s,c,'U_FOUR_GENERATIONS')?1.5:1;}
export function uniqueMusterCost(s,c,kind,troop,cost){return uniqueEnabled(s)&&kind==='muster'&&troop!=null&&troopToCampaign(troop)==='BT04'&&uniqueGovernor(s,c,'U_XILIANG_CAVALRY')?Math.max(1,Math.ceil(cost*.5)):cost;}
export function uniqueGuardedCommander(s,id){return uniqueNear(s,id).some(a=>uniqueOwned(s,a.armyId,'U_BODYGUARD'));}
export function uniqueRevealedWanderers(s,fid){return uniqueEnabled(s)&&Object.values(s.cities).some(c=>c.ownerFactionId===fid&&uniqueGovernor(s,c,'U_KINGS_AIDE'))?Object.values(s.wanderers??{}).map(o=>({name:o.name,cityId:o.locationRef.id})):[];}
export function uniqueSupply(s,donor,amount){if(uniqueGovernor(s,donor,'U_GENEROUS')){s.factions[donor.ownerFactionId].prestige+=Math.floor(amount*.2);uniqueCount(s,'U_GENEROUS');}}
export function uniqueSettlement(s,c){
 if(uniqueGovernor(s,c,'U_SLOW_PLAN')&&!(s.combatLog??[]).some(e=>e.turn===s.turn&&e.cityId&&s.armies[e.attackerId]?.factionId===c.ownerFactionId)){s.factions[c.ownerFactionId].prestige+=3;uniqueCount(s,'U_SLOW_PLAN');}
 if(uniqueGovernor(s,c,'U_PLUNDERER')){c.securityLevel=Math.min(2,(c.securityLevel??0)+1);uniqueCount(s,'U_PLUNDERER');}
}
export const uniqueHoldLand=(s,c)=>!!uniqueGovernor(s,c,'U_HOLD_LAND');
export function uniqueSiegeFactor(s,id){return c34Siege(s,id)*(uniqueOwned(s,id,'U_FORMATION_BREAKER')?1.3:1)*(1+(s.armies[id]?.c32?.siegeUntil>=s.turn?s.armies[id].c32.siegeBonus??0:0)/100);}
export function uniqueRange(s,id,card=null){return c34Range(s,id,card)+(uniqueOwned(s,id,'U_LEGACY_PLAN')||uniqueOwned(s,id,'U_LINKED_CAMPS')?1:0);}
export function uniqueCooldownTurns(s,id,n){return Math.max(1,n-(uniqueOwned(s,id,'U_TWELVE_PLANS')?1:0));}
export function uniqueDamageLimit(s,id,loss){const x=uniqueOwned(s,id,'U_BODYGUARD'),small=x&&loss<=uniqueStrength(s,id)*x.params.small/100?Math.ceil(loss/2):loss;return s.armies[id]?.c32?.restHits>0?Math.round(small*.7):small;}
export function uniqueChainRows(s,rows){
 const extra=new Map();for(const row of rows){const link=s.armies[row.id]?.c32?.chain;if(!link||link.until<s.turn)continue;
  for(const b of Object.values(s.armies))if(b.armyId!==row.id&&castleArmyActive(s,b)&&b.c32?.chain?.key===link.key&&b.c32.chain.until>=s.turn)extra.set(b.armyId,(extra.get(b.armyId)??0)+Math.round(Math.min(row.loss,s.armies[row.id].troopCount)*link.share/100));
 }
 // Share only the original hits. Secondary damage never shares itself.
 for(const [id,loss] of extra){const row=rows.find(r=>r.id===id);if(row)row.loss+=loss;else rows.push({id,loss});}return rows;
}
export function uniqueTacticTargets(s,id,card,{visible,hidden}){
 const e=card.effects.find(e=>e.rule?.startsWith('U_'));if(!e||!uniqueEnabled(s))return null;
 const c34=c34Targets(s,id,card,{visible,hidden});if(c34!==null)return c34;
 const a=s.armies[id],rule=e.rule;if(a.c32?.noTacticTurn===s.turn)return [];
 if(e.rule==='U_BALANCE')return uniqueNear(s,id).map(b=>b.armyId);
 if(card.range===0)return [id];
 const range=card.range+uniqueRange(s,id,card),ally=rule==='U_BALANCE';
 if(rule==='U_STORM_CAMP')return Object.values(s.cities).filter(c=>c.ownerFactionId!==a.factionId&&c.durability>0&&visible(c.tileId)&&distance(s,a.tileId,c.tileId)<=range).map(c=>c.cityId).sort();
 return Object.values(s.armies).filter(b=>castleArmyActive(s,b)&&visible(b.tileId)&&!hidden(b.armyId)&&distance(s,a.tileId,b.tileId)<=range&&(ally?b.factionId===a.factionId:b.factionId!==a.factionId)&&!(uniqueScheme(card)&&uniqueOwned(s,b.armyId,'U_COUNTER_SCHEME')&&uniqueStat(s,b.armyId,'intelligence')>uniqueStat(s,id,'intelligence'))).map(b=>b.armyId).sort();
}
export const uniqueScheme=card=>/계략|계책|혼란|불|이간|지략|사슬|둔화/.test(card.text??'');
export function uniqueCancelTactic(s,id,target,card){
 if(!uniqueEnabled(s)||!s.armies[target]||s.armies[target].factionId===s.armies[id].factionId)return null;
 const t=s.armies[target];
 if(c34Cancel(s,id,target,card))return 'CANCEL';
 if(uniqueScheme(card)&&uniqueOwned(s,target,'U_COUNTER_SCHEME')&&uniqueStat(s,target,'intelligence')>=uniqueStat(s,id,'intelligence')){uniqueCount(s,'U_COUNTER_SCHEME');return 'REFLECT';}
 if(uniqueScheme(card)&&uniqueNear(s,target).some(b=>uniqueOwned(s,b.armyId,'U_DEATH_REMONSTRANCE'))&&t.commanderId===s.factions[t.factionId].rulerId)return 'CANCEL';
 const guard=uniqueNear(s,target,{range:1}).find(b=>uniqueOwned(s,b.armyId,'U_SLEEPING_DRAGON')&&uniqueStat(s,b.armyId,'intelligence')>=uniqueStat(s,id,'intelligence'));
 if(guard&&uniqueRoll(s)<25){uniqueCount(s,'U_SLEEPING_DRAGON');return 'CANCEL';}return null;
}
export function uniqueAfterTactic(s,id,card,heal){
 if(!uniqueEnabled(s))return;
 const a=s.armies[id];a.c32??={};
 if(uniqueOwned(s,id,'U_SLEEPING_DRAGON')){for(const b of uniqueNear(s,id))uniqueCooldown(s,b.armyId,-1);uniqueCount(s,'U_SLEEPING_DRAGON');}
 if(uniqueOwned(s,id,'U_TWELVE_PLANS')){a.c32.spellTurn=s.turn;uniqueCount(s,'U_TWELVE_PLANS');}
 s.c32??={counts:{},uses:{}};const rule=card.effects.find(e=>e.rule?.startsWith('U_'))?.rule;
 if(rule)s.c32.uses[a.commanderId]=(s.c32.uses[a.commanderId]??0)+1;
}
export function uniqueSpreadTactic(s,id,target,card,log,damage){
 if(!uniqueOwned(s,id,'U_PHOENIX_CHICK')||!s.armies[target]||s.armies[id].factionId===s.armies[target].factionId)return;
 const next=uniqueNear(s,id,{enemy:true,range:1,center:target}).find(b=>b.armyId!==target);if(!next)return;
 const victim=s.armies[target];
 for(const effect of victim.effectStates.filter(e=>e.source===id))next.effectStates.push({...structuredClone(effect),value:Math.round((effect.value??0)*.5)});
 const loss=log.units.filter(u=>u.unitId===target).reduce((n,u)=>n+u.casualties,0);if(loss)damage([{targetId:next.armyId,loss:Math.round(loss*.5)}]);uniqueCount(s,'U_PHOENIX_CHICK');
}
export function uniqueAttackOptions(s,id,target,options={}){
 const a=s.armies[id],t=s.armies[target];
 if(!uniqueEnabled(s))return options;
 const result={...c34AttackOptions(s,id,target,options)};if(a.c32?.hiddenUntil>=s.turn||a.c32?.rearTurn===s.turn)result.forceSide='REAR';
 if((uniqueOwned(s,id,'U_OLD_VIGOR')&&troopToCampaign(a.troopType)==='BT03')||uniqueOwned(s,id,'U_FORMATION_BREAKER'))result.ignoreBrace=true;
 if(uniqueOwned(s,target,'U_IRON_CITADEL')&&uniqueCity(s,target))result.noFlank=true;
 if(uniqueOwned(s,target,'U_ROAR')&&uniqueNear(s,target,{enemy:true,range:1}).length>=3)result.noFlank=true;
 return c34AttackOptions(s,id,target,result);
}
export function uniqueOrdinaryDamageFactor(s,id){return uniqueOwned(s,id,'U_WHITE_HORSE')&&troopToCampaign(s.armies[id].troopType)==='BT04'?.7:1;}
export function uniqueDefenseExtra(s,id,options){return (s.armies[id]?.c32?.restHits??0)>0?30:options?.reaction&&uniqueOwned(s,id,'U_SUPERVISE')?30:0;}
export function uniqueFollowupRows(s,id,target,hit,options,formula){
 if(!uniqueEnabled(s)||options.counter||options.reaction||options.pursuit)return [];
 const a=s.armies[id],rows=[],add=(ratio,rule,to=target)=>rows.push({sourceId:id,targetId:to,rule,loss:Math.round(hit.damage*ratio/100),line:rule});
 if(!options.tactic){
  if(uniqueOwned(s,id,'U_DIVINE_ARCHER'))add(50,'U_DIVINE_ARCHER');
  for(const [rule,ratio] of [['U_LITTLE_CONQUEROR',60],['U_CONSECUTIVE',50]]){const x=uniqueOwned(s,id,rule);if(x&&uniqueRoll(s)<(x.params.extra??x.params.chance))add(ratio,rule);}
 }
 return rows;
}
export function uniqueAfterAttack(s,before,id,target,log,heal,damage){
 c34AfterAttack(s,before,id,target,log,heal,damage);
 if(!uniqueEnabled(s))return;
 const a=s.armies[id],t=s.armies[target];a.c32??={};t.c32??={};
 const hit=log.units.find(u=>u.unitId===target)?.casualties??log.enemyLoss;
 const hurt=log.units.find(u=>u.unitId===id)?.casualties??log.allyLoss;
 const apply=(who,rule,fn)=>{const x=uniqueOwned(s,who,rule);if(x){fn(x.params);uniqueCount(s,rule);}};
 if(hit>0){
  apply(target,'U_GRUDGE_AND_GRACE',()=>t.c32.grudge=a.commanderId);
  for(const rule of ['U_NO_RETREAT','U_FALSE_SURRENDER'])apply(target,rule,p=>t.c32.rage=Math.min(p.max,(t.c32.rage??0)+p.stack));
  for(const rule of ['U_HERO_OF_CHAOS','U_HAWK_WOLF'])apply(target,rule,()=>{const key=Object.keys(a.tacticReadyTurns??{}).sort()[0];if(key)a.tacticReadyTurns[key]++;});
  apply(target,'U_LEGACY_PLAN',()=>{if(t.c32.legacyTurn===s.turn)return;t.c32.legacyTurn=s.turn;const ally=uniqueNear(s,target).find(b=>b.armyId!==target)??t;uniqueCooldown(s,ally.armyId,-1);});
  if(!log.c32Secondary)apply(target,'U_FIERCE_PRIDE',p=>damage([{targetId:id,loss:Math.round(hit*p.reflect/100)}]));
 }
 if(hurt>0){for(const rule of ['U_NO_RETREAT','U_FALSE_SURRENDER'])apply(id,rule,p=>a.c32.rage=Math.min(p.max,(a.c32.rage??0)+p.stack));}
 if(log.c32Secondary)return;
 for(const rule of ['U_AWE','U_BELL_SOUND'])apply(id,rule,()=>checkMorale(s,target,rule,10,log.moraleChanges));
 apply(id,'U_TWIN_BLADES',p=>{const from=t.formation;checkFormation(s,target,p.formation,log.formationChanges);if(t.formation!==from)changeMorale(s,target,t.morale==='STEADY'?'SHAKEN':'ROUTING','양날의 칼',log.moraleChanges);else if(!s.endedArmyIds.includes(id))s.endedArmyIds.push(id);});
 apply(id,'U_PINCER_STANCE',()=>{t.c32.attackers??={};const key=`${s.turn}.${a.factionId}`;t.c32.attackers[key]=[...new Set([...(t.c32.attackers[key]??[]),id])];if(t.c32.attackers[key].length>=2)uniqueStatus(s,id,target,'CONFUSED');});
 for(const [rule,ratio] of [['U_FRESH_EYES',10],['U_CONSECUTIVE',10]])apply(id,rule,()=>{if(rule==='U_FRESH_EYES'||distance(s,a.tileId,t.tileId)===1)heal(id,Math.round(hit*ratio/100));});
 apply(id,'U_LITTLE_CONQUEROR',p=>{const extra=(log.c27Followups??[]).filter(f=>f.rule=== 'U_LITTLE_CONQUEROR').reduce((n,f)=>n+f.loss,0);heal(id,Math.round(extra*.2));if(!a.c32.awakened&&uniquePercent(s,id)<30)a.c32.awakened=true;});
 if((log.c27Followups??[]).some(f=>f.rule==='U_DIVINE_ARCHER'))checkMorale(s,target,'두 번째 사격',10,log.moraleChanges);
 if(t.morale==='ROUTING'||!t.troopCount){
  for(const rule of ['U_ADAPTIVE','U_FIERCE_PRIDE'])if(uniqueOwned(s,id,rule))uniqueRecoverMorale(s,id);
  apply(id,'U_BELL_SOUND',p=>uniqueNear(s,id,{enemy:true}).forEach(b=>checkMorale(s,b.armyId,'방울 소리',p.morale,log.moraleChanges)));
  apply(id,'U_PLUNDERER',()=>{const c=Object.values(s.cities).filter(c=>c.ownerFactionId===a.factionId).sort((c,d)=>distance(s,c.tileId,a.tileId)-distance(s,d.tileId,a.tileId))[0];if(c)c.foodStock+=20;s.factions[a.factionId].prestige+=10;});
 }
 for(const b of Object.values(s.armies)){if(uniqueOwned(s,b.armyId,'U_FIERCE_PRIDE')&&log.units.some(u=>!u.postBattleCount&&s.armies[u.unitId].factionId===b.factionId))uniqueRecoverMorale(s,b.armyId);}
 if(uniqueOwned(s,id,'U_LINKED_CAMPS')&&(s.c32?.fires??[]).some(f=>f.tileId===t.tileId&&f.until>=s.turn)){for(const b of uniqueNear(s,id,{enemy:true,range:1,center:target}))uniqueIgnite(s,id,b.armyId,1,damage);}
 delete a.c32.hiddenUntil;delete a.c32.rearTurn;delete a.c32.spellTurn;delete a.c32.rage;
 if(uniqueOwned(s,id,'U_WHITE_HORSE')&&troopToCampaign(a.troopType)==='BT04'){a.c32.postMove=s.turn;a.c27??={};a.c27.cantoTurn=s.turn;a.c27.cantoRemaining=200;a.c27.cantoTicks=200;s.endedArmyIds=s.endedArmyIds.filter(k=>k!==id);s.movedArmyIds=s.movedArmyIds.filter(k=>k!==id);}
 uniqueScheduleRevival(s,before,log);
 for(const o of Object.values(s.officers))if(uniqueOwned(s,o.officerId,'U_DEATH_REMONSTRANCE')&&['CAPTURED','DEAD'].includes(o.captivityState==='CAPTURED'?'CAPTURED':o.lifeState)&&before.officers[o.officerId]?.lifeState==='ALIVE'&&before.officers[o.officerId]?.captivityState==='FREE')for(const b of Object.values(s.armies).filter(b=>b.factionId===o.allegianceFactionId))checkMorale(s,b.armyId,'목숨 건 직언',10,log.moraleChanges);
}
export function uniqueScheduleRevival(s,before,log){
 if(!uniqueEnabled(s))return;
 for(const a of Object.values(s.armies)){if(!uniqueOwned(s,a.armyId,'U_RISE_AGAIN')||a.c32?.revival||a.c32?.revivals>=2)continue;
  if(a.troopCount>0&&a.morale!=='ROUTING')continue;
  const home=Object.values(s.cities).filter(c=>c.ownerFactionId===a.factionId).sort((c,d)=>distance(s,c.tileId,a.tileId)-distance(s,d.tileId,a.tileId)||c.cityId.localeCompare(d.cityId))[0];if(!home)continue;
  a.c32??={};a.c32.revivals=(a.c32.revivals??0)+1;a.c32.revival={turn:s.turn+3,cityId:home.cityId,strength:uniqueStrength(before,a.armyId)};uniqueCount(s,'U_RISE_AGAIN');
 }
}
export function uniqueRevive(s,a){
 const pending=a.c32?.revival;if(!pending||pending.turn>s.turn)return false;
 const c=s.cities[pending.cityId];if(c?.ownerFactionId!==a.factionId)return false;
 const to=[c.tileId,...c.footprint.gates].find(t=>!Object.values(s.armies).some(b=>b.armyId!==a.armyId&&castleArmyActive(s,b)&&b.tileId===t));if(!to)return false;
 const f=s.personnel.formations.find(f=>f.formationId===a.armyId),n=Math.max(1,Math.floor(pending.strength*.5)),delta=n-f.field;
 // An explicit trial replacement is accounted for in the personnel ledger.
 s.personnel.initialPersonnel+=delta;f.field=n;f.targetStrength=Math.max(f.targetStrength,n);a.troopCount=n;a.hp=Math.max(1,n*2);a.maxHp=Math.max(a.maxHp,a.hp);a.tileId=to;a.morale='STEADY';a.formation='ORDERED';
 const o=s.officers[a.commanderId];o.lifeState='ALIVE';o.captivityState='FREE';o.captorFactionId=null;o.conditionState='NORMAL';o.allegianceFactionId=a.factionId;o.locationRef={kind:'ARMY',id:a.armyId};
 for(const home of Object.values(s.cities))if(home.governorId===a.commanderId){home.governorId=null;if(s.terminal)s.terminal.citiesById[home.cityId].governorId=null;}
 if(s.campaignTerminalWorld?.armiesById[a.armyId])s.campaignTerminalWorld.armiesById[a.armyId].disposition='ACTIVE';
 if(s.terminal?.armiesById[a.armyId]){s.terminal.armiesById[a.armyId].disposition='ACTIVE';s.terminal.armiesById[a.armyId].terminalAtTick=null;s.terminal.armiesById[a.armyId].terminalRecordId=null;}
 if(s.terminal?.officersById[a.commanderId])Object.assign(s.terminal.officersById[a.commanderId],{lifeState:'ALIVE',captivityState:'FREE',captorFactionId:null,allegianceFactionId:a.factionId,assignment:{kind:'ARMY',id:a.armyId}});
 syncCampaignAdministrativeTerminal(s);
 s.endedArmyIds=s.endedArmyIds.filter(k=>k!==a.armyId);delete a.c32.revival;return true;
}
export function uniqueStart(s,fid,{heal,damage}){
 c34Start(s,fid,{heal,damage});
 if(!uniqueEnabled(s))return;
 for(const a of Object.values(s.armies).filter(a=>a.factionId===fid)){
  uniqueRevive(s,a);if(!castleArmyActive(s,a))continue;
  if(uniqueOwned(s,a.armyId,'U_BENEVOLENCE'))for(const b of uniqueNear(s,a.armyId))if(uniquePercent(s,b.armyId)<30)heal(b.armyId,30);
  if(uniqueOwned(s,a.armyId,'U_SAVAGE_HERO'))checkMorale(s,a.armyId,'豪傑',5);
  if(s.turn>=5&&uniqueOwned(s,a.armyId,'U_HAWK_WOLF')){const b=uniqueNear(s,a.armyId,{enemy:true})[0];if(b){damage(a.armyId,[{targetId:b.armyId,loss:Math.max(1,Math.round(a.troopCount*.1))}]);b.effectStates.forEach(e=>{if(e.op==='STATUS_APPLY')e.expiresTurn++;});uniqueCount(s,'U_HAWK_WOLF');}}
 }
 for(const c of Object.values(s.cities).filter(c=>c.ownerFactionId===fid))if(uniqueGovernor(s,c,'U_KINGS_AIDE')){c.c32??={};c.c32.revealsWanderers=true;uniqueCount(s,'U_KINGS_AIDE');}
}
export function uniqueLevel(s,id){const x=uniqueOwned(s,id,'U_FRESH_EYES'),r=s.campaignGrowth?.officers[id];if(x&&(r.c32Levels??0)<10){const stats=s.officers[id].baseStats,key=stats.strength<=stats.intelligence?'strength':'intelligence';stats[key]=s.mapId==='v1'?Math.min(100,stats[key]+1):stats[key]+1;r.c32Levels=(r.c32Levels??0)+1;uniqueCount(s,'U_FRESH_EYES');}}
export function uniqueMoraleWeight(s,id,weight){return uniqueNear(s,id).some(b=>uniqueOwned(s,b.armyId,'U_BENEVOLENCE'))&&uniquePercent(s,id)<30?weight*.5:uniqueNear(s,id,{range:1}).some(b=>uniqueOwned(s,b.armyId,'U_FOUR_GENERATIONS'))?weight*.8:weight;}
export function uniqueIgnite(s,id,target,duration,damage,spread=true){
 const a=s.armies[target];if(!a||diplomacyAttackReason(s,id,target)||uniqueOwned(s,target,'U_FIRE_GOD'))return;
 s.c32??={counts:{},uses:{}};s.c32.fires??=[];s.c32.fires.push({tileId:a.tileId,until:s.turn+duration-1,source:id});
 damage([{targetId:target,loss:Math.max(1,Math.round(c30ElementDamage(s,id,target,a.troopCount*.1)*(uniqueOwned(s,id,'U_FIRE_GOD')?1.5:1)*(c28Rule(s,target,'FIRE_WARD')?C28.fireReduce:1)))}]);
 if(spread&&c30Spread(s,id)){
  s.c30.fireSpread??={};
  for(const b of uniqueNear(s,id,{enemy:true,range:1,center:target}))if(s.tiles[b.tileId].terrainType==='forest'){
   const key=`${s.battleSequence}.${id}.${b.armyId}`;
   if(s.c30.fireSpread[key])continue;
   s.c30.fireSpread[key]=true;uniqueIgnite(s,id,b.armyId,duration,damage,false);
  }
 }
}
export function uniqueMetrics(s){return structuredClone(s.c32??{counts:{},uses:{}});}

// Each registered U_* handler has an op query or a bounded event executor.
// Followups are result rows, never recursively dispatched actions.
const UNIQUE_ATTACK_TACTICS=new Set(['U_TRIPLE_ASSAULT','U_LONE_RIDE','U_HUNDRED_PACES','U_RANDOM_VOLLEY','U_MOUNTAIN_FALL','U_PIERCING_CHARGE','U_WHITE_RUSH','U_SHAKE_THE_REALM','U_TIGER_ROAR','U_LIAO_IS_COMING','U_NIGHT_RAID','U_DECEIVE_HEAVEN','U_HUNDRED_BATTLES','U_AWE_SCHEME','U_TURNCOAT_STRIKE','U_RAMPAGE','U_STORM_CAMP']);
export const uniqueTacticIsDamage=card=>card?.effects?.some(e=>(UNIQUE_ATTACK_TACTICS.has(e.rule)||C34_DAMAGE_TACTICS.has(e.rule)))??false;
export function runUniqueTactic({s,id,target,card,attack,damage,heal,retreat,cityAttack}){
 if(card.effects.some(e=>C34_RULES.has(e.rule)))return c34Tactic({s,id,target,card,attack,damage,heal,retreat,cityAttack});
 const e=card.effects.find(e=>e.rule?.startsWith('U_')),p=e.params??{},rule=e.rule;
 const a=s.armies[id],t=s.armies[target],near=(enemy=false,range=2,center=id)=>uniqueNear(s,id,{enemy,range,center});
 const buff=(units,op,value,duration=1)=>units.forEach(b=>uniqueBuff(s,id,b.armyId,op,value,duration));
 const status=(units,name,duration=1,guaranteed=false)=>units.forEach(b=>uniqueStatus(s,id,b.armyId,name,duration,{guaranteed}));
 const morale=(units,weight=10)=>units.forEach(b=>checkMorale(s,b.armyId,card.name,weight,s.lastCombat.moraleChanges));
 const restore=(units,n=0,clean=false,rally=true)=>units.forEach(b=>{if(rally)uniqueRecoverMorale(s,b.armyId);if(clean)b.effectStates=(b.effectStates??[]).filter(e=>e.op!=='STATUS_APPLY');if(n)heal(b.armyId,n);});
 const hit=(who=target,ratio=100)=>attack(id,who,ratio);
 const aoe=(ratio=100,range=1,center=id)=>near(true,range,center).forEach(b=>hit(b.armyId,ratio));
 a.c32??={};uniqueCount(s,rule);
 switch(rule){
 case 'U_TRIPLE_ASSAULT':for(let n=0;n<3;n++)if(s.armies[target].troopCount)hit(target,p.ratio);morale([s.armies[target]],p.morale);break;
 case 'U_LONE_RIDE':{hit();const to=oppositeCombatTile(s,id,target);if(combatEmptyStep(s,id,to)){a.tileId=to;a.movedTiles++;}status(near(true,1),'CONFUSED');break;}
 case 'U_DIVINE_SCHEME':{const units=near(true,1,target);status(units,'CONFUSED');buff(units,'DAMAGE_MOD',-p.reduce);break;}
 case 'U_DRIVE_TIGER':case 'U_ESTRANGE':{const other=near(true,1,target).find(b=>b.armyId!==target);if(other&&uniqueStat(s,id,'intelligence')>uniqueStat(s,target,'intelligence')){attack(target,other.armyId,100);if(rule==='U_ESTRANGE'&&s.armies[other.armyId].troopCount)attack(other.armyId,target,100);}break;}
 case 'U_GREAT_VIRTUE':restore(near(),p.heal);break;
 case 'U_HUNDRED_PACES':hit(target,100+p.bonus);morale([s.armies[target]]);break;
 case 'U_WEI_MIGHT':buff(near(),'DAMAGE_MOD',p.atk);buff(near(),'DEFENSE_MOD',p.def);break;
 case 'U_BALANCE':for(const key of Object.keys(t.tacticReadyTurns))t.tacticReadyTurns[key]=s.turn;a.c32.noTacticTurn=s.turn+1;break;
 case 'U_RANDOM_VOLLEY':aoe(p.ratio,1,target);break;
 case 'U_YUAN_GLORY':buff([t],'DAMAGE_MOD',-p.reduce);morale([t]);break;
 case 'U_MOUNTAIN_FALL':aoe();morale(near(true,1));break;
 case 'U_TEN_THOUSAND_HORSES':buff(near().filter(b=>troopToCampaign(b.troopType)==='BT04'),'MOVE_MOD',p.move);break;
 case 'U_PIERCING_CHARGE':{const other=combatArmyAt(s,oppositeCombatTile(s,id,target));hit();if(other?.factionId!==a.factionId&&other)hit(other.armyId,p.second);status([s.armies[target]],'CONFUSED');break;}
 case 'U_WHITE_RUSH':hit();status([s.armies[target]],'ROOTED',1,true);break;
 case 'U_HOLD_RESOLVE':buff(near().filter(b=>uniqueCity(s,b.armyId)),'DEFENSE_MOD',p.reduce);break;
 case 'U_ALL_LAWS':restore(near(false,p.range),p.heal,true,false);break;
 case 'U_KING_ROAR':morale(near(true,1),p.morale);break;
 case 'U_SHAKE_THE_REALM':{const units=near(true,1);aoe(p.ratio);if(units[0]){units[0].c32??={};units[0].c32.disarmUntil=s.turn+1;}break;}
 case 'U_CHANGBAN_SHOUT':morale(near(true),p.morale);status(near(true),'ROOTED',1,true);break;
 case 'U_TIGER_ROAR':hit();buff(near(),'DAMAGE_MOD',p.aura);break;
 case 'U_CHAIN_SCHEME':for(const b of near(true)){b.c32??={};b.c32.chain={key:`${s.turn}.${id}.${s.battleSequence}`,until:s.turn+1,share:p.share};uniqueBuff(s,id,b.armyId,'MOVE_MOD',-2,2);}break;
 case 'U_SWIFT_WAR':buff(near(),'MOVE_MOD',p.move);buff(near(true),'DAMAGE_MOD',-15);break;
 case 'U_DIVINE_PLAN':{const units=near(true,1,target);status(units,'CONFUSED');status(units,'SLOWED');morale(units);break;}
 case 'U_LIAO_IS_COMING':hit();buff([s.armies[target]],'DAMAGE_MOD',-p.reduce);morale(near(true));break;
 case 'U_BARE_CHEST':buff([a],'DAMAGE_MOD',p.bonus);buff([a],'DEFENSE_MOD',-p.cost);break;
 case 'U_DIVINE_FIRE':{const units=near(true).filter(b=>['forest','plain'].includes(s.tiles[b.tileId].terrainType));for(const b of units)uniqueIgnite(s,id,b.armyId,1,damage);for(const b of near(true,1,target).filter(b=>s.tiles[b.tileId].terrainType==='forest'))if(!units.includes(b))uniqueIgnite(s,id,b.armyId,1,damage);if(t)status([t],'CONFUSED');break;}
 case 'U_EXTREME_FLAME':uniqueIgnite(s,id,target,2,damage);buff([t],'DAMAGE_MOD',-p.reduce,2);break;
 case 'U_NIGHT_RAID':hit();status([s.armies[target]],'CONFUSED');break;
 case 'U_DECEIVE_HEAVEN':hit();buff([s.armies[target]],'DAMAGE_MOD',-p.reduce);break;
 case 'U_PINCER_SCHEME':status([t],'ROOTED',2,true);morale([t]);break;
 case 'U_STORM_CAMP':cityAttack(p.siege);for(const b of near()){b.c32??={};b.c32.siegeBonus=p.aura;b.c32.siegeUntil=s.turn+1;}break;
 case 'U_HEROIC_SPIRIT':restore(near());buff(near(true),'DAMAGE_MOD',-p.reduce);break;
 case 'U_EIGHT_GATES':buff(near(),'DEFENSE_MOD',p.reduce,2);break;
 case 'U_FEINT_AMBUSH':status([t],'CONFUSED',2,true);status([t],'ROOTED',2,true);break;
 case 'U_MYRIAD_PLANS':restore(near());restore(near(false,3),0,true,false);break;
 case 'U_HUNDRED_BATTLES':hit();restore([a],0,true,false);break;
 case 'U_LOYAL_WISDOM':status([t],'SLOWED',1,true);status([t],'CONFUSED');break;
 case 'U_AWE_SCHEME':damage([{targetId:target,loss:Math.max(1,Math.round(a.troopCount*.15))}]);morale([t]);break;
 case 'U_WHITE_ROBES':a.c32.hiddenUntil=s.turn+1;a.c32.freeRiverUntil=s.turn+1;break;
 case 'U_KEEN_INSIGHT':restore(near(),0,true);break;
 case 'U_SECRET_PATH':buff([a],'MOVE_MOD',p.move);buff([a],'DEFENSE_MOD',-p.cost,2);a.c32.terrainUntil=s.turn;a.c32.rearTurn=s.turn;break;
 case 'U_REST_AND_WAIT':for(const b of [a,near(false,1).find(b=>b.armyId!==id)].filter(Boolean)){b.c32??={};b.c32.restHits=3;}break;
 case 'U_TURNCOAT_STRIKE':hit();if(s.armies[target].troopCount)hit(target,140);if(s.armies[target].troopCount)damage([{targetId:target,loss:Math.round(a.troopCount*.1)}]);break;
 case 'U_COFFIN_BATTLE':a.c32.prepared={turn:s.turn+1,target,ratio:p.ratio};break;
 case 'U_RAMPAGE':hit(target,p.ratio);status([s.armies[target]],'ROOTED',1,true);break;
 case 'U_SKY_EDGE':buff([a],'DEFENSE_MOD',p.reduce,2);morale(near(true));break;
 case 'U_AVOID_CALAMITY':{a.c32.noPursuitTurn=s.turn;const path=retreat(1);if(path.length){a.tileId=path.at(-1);a.movedTiles++;}break;}
 case 'U_MAJESTIC':turnFacing(s,target,id);t.c32??={};t.c32.disarmUntil=s.turn+1;break;
 case 'U_SELF_INJURY':damage([{targetId:id,loss:Math.floor(a.troopCount*p.cost/100)}]);uniqueIgnite(s,id,target,1,damage);status([s.armies[target]],'CONFUSED');buff([s.armies[id]],'DEFENSE_MOD',30,2);break;
 default:throw new Error(`UNIMPLEMENTED_UNIQUE_TACTIC:${rule}`);
 }
 return s;
}
for(const rule of UNIQUE_RULES)registerCampaignRule(rule,context=>context.phase==='ops'?uniqueOps(context):context.phase==='tactic'?runUniqueTactic(context):undefined);

// C28 counter handlers are passive queries; no new actions.
for(const rule of ['HALF_FLANK_TAKEN','TACTIC_WARD','SCOUT_EYE','FIRE_WARD','BREACH_GUARD','CUT_SUPPLY','EXPOSE','COOL_HEAD'])registerCampaignRule(rule,({phase,x,s,id})=>phase==='query'?x??c28Rule(s,id,rule):undefined);

for(const rule of [...C29_DATA.modifiers.map(c=>c.rule),'WIND_READER',...C29_AWAKENING.wild.pool.map(c=>c.rule),...C29_AWAKENING.narrative.byTitle.map(c=>`AW_${c.titleId}`),'STEADY_UP'])if(!campaignRuleRegistered(rule))registerCampaignRule(rule,ctx=>ctx.apply?.(ctx));

// C33 read-only data projection; no new browser data route.
export const C33_POOL=commonPool;

archerAttackReason.pointBlank=(s,id)=>!!c33Owned(s,id,'POINT_BLANK');
for(const c of [...C33_POOL.traits,...C33_POOL.tactics,...C33_POOL.domestic])for(const e of c.effects)if(e.op==='RULE'&&!campaignRuleRegistered(e.rule))registerCampaignRule(e.rule,ctx=>ctx.phase==='query'?ctx.x:ctx.phase==='tactic'?c33ApplyTactic(ctx):ctx.phase==='event'?c33DomesticEvent(ctx.s,ctx.c,ctx.event):undefined);
export function c33MusterCost(s,c,kind,troop,cost){if(kind!=='muster'||!troop)return cost;if(troopToCampaign(troop)==='BT04'&&c33Governor(s,c,'HORSE_BREEDING'))return Math.ceil(cost*.5);if(troop==='catapult'&&c33Governor(s,c,'INVENTOR'))return Math.ceil(cost*.7);return cost;}
