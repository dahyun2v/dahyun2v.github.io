import {C507_IDS,c507Install,c507Targets,c507Cast,c507Start,c507Finish,c507AfterAttack} from './campaign-c507.mjs';
import {C505_IDS,c505Adopt,c505Install,c505Targets,c505Cast,c505Start,c505Finish,c505Options,c505Movement,c505AfterAttack,c505Counter} from './campaign-c505.mjs';
import {cloneCampaign} from './campaign-clone.mjs';
import {C491_IDS,c491Install,c491Targets,c491Cast,c491Start,c491Finish} from './campaign-c491.mjs';
import {C468_IDS,c468Install,c468Targets,c468Cast,c468Calm,c468IgnoreMorale,c468Cancel,c468AfterOrder,c468ForceArmyTo} from './campaign-c468.mjs';
import {isSliceMap} from './map-primitives.mjs';
import {C487_IDS,c487Install,c487Targets,c487Cast,c487Start,c487Finish} from './campaign-c487.mjs';
import {C467_IDS,c467Targets,c467Cast,c467Start,c467Finish,c467Pay} from './campaign-c467.mjs';
import abilityNames from '../data/common-traits-v0.2.json' with {type:'json'};
import {C466_IDS,c466Targets,c466Cast,c466Pay} from './campaign-c466.mjs';
import {C461_IDS,c461Targets,c461Cast,c461Wait,c461IgnoreMorale,c461Cancel,c461Capture,c461AfterOrder,c461Pay} from './campaign-c461.mjs';
import {withCampaignQueries,memoCampaignQuery,registerCampaignRule,campaignRuleRegistered} from './campaign-rule-registry.mjs';
import {diplomacyArmyHostile} from './campaign-diplomacy.mjs';
import {C34_OFFICERS} from './campaign-officers-51-100.mjs';
import {uniqueOwned,uniqueGovernor,uniqueBuff,uniqueStatus,uniqueIgnite} from './campaign-rule-registry.mjs';
import {hexDistance,neighbors} from './map-primitives.mjs';
import {C12,campaignAttackPower,campaignDefensePower,changeFormation,attackDirection} from './campaign-abilities.mjs';
import {changeMorale,checkMorale} from './campaign-morale.mjs';
import {castleArmyActive} from './campaign-city-footprint.mjs';
import {combatEmptyStep,oppositeCombatTile} from './campaign-rule-registry.mjs';

export {C34_OFFICERS};
export const C34_RULES=new Set(C34_OFFICERS.flatMap(o=>[o.uniqueTrait,o.signatureTactic].map(c=>c.effects[0].rule)));
export const c34Enabled=s=>isSliceMap(s.mapId);
const owned=(s,id,r)=>c34Enabled(s)&&uniqueOwned(s,id,r);
const relevant=(s,id)=>!!s.campaignGrowth?.officers[s.armies[id]?.commanderId??id]?.cards[s.campaignGrowth.officers[s.armies[id]?.commanderId??id]?.coreId]?.effects?.some(e=>C34_RULES.has(e.rule));
const present=s=>memoCampaignQuery(s,'c34:present',()=>c34Enabled(s)&&(Object.values(s.campaignGrowth?.officers??{}).some(r=>r.cards[r.coreId]?.effects?.some(e=>C34_RULES.has(e.rule)))||Object.values(s.armies).some(a=>a.c34)||!!s.c34));
const state=(s,id)=>s.armies[id].c34??={};
const dist=(s,a,b)=>hexDistance(s.tiles[a],s.tiles[b]);
const city=(s,id)=>Object.values(s.cities).find(c=>c.ownerFactionId===s.armies[id]?.factionId&&[c.tileId,...c.footprint.gates].includes(s.armies[id].tileId));
const strength=(s,id)=>s.personnel.formations.find(f=>f.formationId===id)?.targetStrength??s.armies[id].deploymentStrength??s.armies[id].troopCount;
const percent=(s,id)=>100*s.armies[id].troopCount/Math.max(1,strength(s,id));
const hills=(s,id)=>['hill','mountain'].includes(s.tiles[s.armies[id].tileId].terrainType);
const hidden=(s,id)=>Object.keys(s.factions).filter(f=>f!==s.armies[id].factionId).every(f=>s.knowledge[f]?.tiles[s.armies[id].tileId]!=='VISIBLE');
const stat=(s,id,key)=>s.officers[s.armies[id].commanderId].baseStats[key];
export function c34Near(s,id,range=2,enemy=false,center=id){const a=s.armies[id],c=s.armies[center];return !a||!c?[]:Object.values(s.armies).filter(b=>castleArmyActive(s,b)&&b.armyId!==id&&(enemy?diplomacyArmyHostile(s,id,b.armyId):b.factionId===a.factionId)&&dist(s,c.tileId,b.tileId)<=range).sort((a,b)=>a.armyId.localeCompare(b.armyId));}
const allies=(s,id,range=2)=>[s.armies[id],...c34Near(s,id,range)];
const lower=(s,id,n=1,log=[])=>{for(let i=0;i<n;i++)changeMorale(s,id,s.armies[id].morale==='STEADY'?'SHAKEN':'ROUTING','고유 효과',log);};
export const c34Rally=(s,id,n=1)=>{if(c34Near(s,id,1).some(b=>owned(s,b.armyId,'U_STRICT_LAW')))return;for(let i=0;i<n;i++)changeMorale(s,id,s.armies[id].morale==='ROUTING'?'SHAKEN':'STEADY','고유 효과');};
const once=(s,id,key)=>{const x=state(s,id),stamp=`${s.turn}.${s.activeFactionId}`;if(x[key]===stamp)return false;x[key]=stamp;return true;};
let gaugeCooldown=null;
export function configureC34Gauge(fn){gaugeCooldown=fn;}
const cooldown=(s,id,n)=>{if(gaugeCooldown?.(s,id,n))return;const a=s.armies[id],key=Object.keys(a.tacticReadyTurns??{}).sort()[0];if(key)a.tacticReadyTurns[key]+=n;};
const leader=(s,id)=>Object.values(s.armies).filter(b=>b.factionId===s.armies[id].factionId&&castleArmyActive(s,b)).sort((a,b)=>Object.values(s.officers[b.commanderId].baseStats).reduce((n,v)=>n+v,0)-Object.values(s.officers[a.commanderId].baseStats).reduce((n,v)=>n+v,0)||a.armyId.localeCompare(b.armyId))[0];
const lostLord=(s,id)=>Object.values(s.armies).some(b=>b.factionId===s.armies[id].factionId&&b.commanderId===s.factions[b.factionId].rulerId&&(!b.troopCount||b.morale==='ROUTING'))||(s.combatLog??[]).some(l=>l.captureLine&&s.armies[l.attackerId]?.factionId!==s.armies[id].factionId);

export function c34Ops({s,source,recipient=source,e,ctx={}}){
 if(!c34Enabled(s))return [];const a=s.armies[source],t=s.armies[ctx.targetId],x=a?.c34??{},p=e.params??{},out=[];
 const add=(op,value)=>out.push({op,value,target:'SELF',condition:null,when:'PASSIVE',duration:0});
 const self=recipient===source,attack=ctx.when!=='ON_DEFEND',aura=(range,op,n)=>{if(a&&c34Near(s,source,range).some(b=>b.armyId===recipient))add(op,n);};
 switch(e.rule){
 case 'U_FORCED_MARCH_STRIKE':if(self&&a&&(a.movedTiles??0)>=p.minMove)add('RULE',0);break;
 case 'U_SET_AND_WAIT':if(self&&x.set&&!(a.movedTiles??0))add('DAMAGE_MOD',p.bonus);break;
 case 'U_STRICT_LAW':case 'U_SEE_THE_TRAP':case 'U_TAKE_THE_BLOW':case 'U_NEW_FORT':case 'U_WELCOME_STRANGERS':case 'U_CALM_FACE':case 'U_MEDIATE':case 'U_PRESS_SUPPLY':case 'U_SEED_MONEY':case 'U_TIGER_SOUL':case 'U_STRAIGHT_WORDS':case 'U_SCHOLAR_BUILDER':case 'U_PILLAR_ELDER':case 'U_OPEN_THE_RETREAT':case 'U_AWAIT_CAVALRY':case 'U_BOAST':case 'U_WATERWORKS':case 'U_FEAST':case 'U_LINGERING_POISON':case 'U_PHOTO_MEMORY':case 'U_DEAF_TO_RUMOR':case 'U_NO_SURRENDER':case 'U_MINT':case 'U_BRIBE_BROKER':case 'U_RETURNING_KNIVES':case 'U_READ_THE_ESCAPE':case 'U_HONEST_COUNSEL':case 'U_CARRY_THE_ARMY':break;
 case 'U_FIRST_ON_WALL':if(self&&x.wallUntil>=s.turn)add('DEFENSE_MOD',-p.cost);break;
 case 'U_SMALL_FORT':if(self&&a&&t&&(city(s,source)||a.braced))add('DEFENSE_MOD',Math.min(p.max,Math.max(0,(1-a.troopCount/t.troopCount)*60)));break;
 case 'U_SWORD_AND_PLAN':break;
 case 'U_STRIKE_THE_HEART':if(self&&a&&hills(s,source))add('DEFENSE_MOD',-p.cost);break;
 case 'U_HOLD_THE_POST':if(self&&a&&x.post===`${a.tileId}.${a.facing}`)add('DEFENSE_MOD',x.hold??0);break;
 case 'U_SCARS':if(self)add('DEFENSE_MOD',(x.scars??0)*p.per);break;
 case 'U_SAME_FOE':if(self&&t)add('DAMAGE_MOD',x.foe===t.armyId&&x.foeTurn===s.turn-1?p.bonus:x.foe&&x.foe!==t.armyId?-10:0);break;
 case 'U_CHASE':if(self&&t&&t.c34?.movedTurn===s.turn-1)add('DAMAGE_MOD',p.bonus);break;
 case 'U_TAISHAN_BAND':if(self&&a&&hills(s,source)){add('DAMAGE_MOD',10);add('DEFENSE_MOD',20);}break;
 case 'U_HIDDEN_BLADE':case 'U_NIGHT_ASSAULT':if(self&&a&&!x.firstAttack&&x.hiddenStart)add('DAMAGE_MOD',p.bonus);break;
 case 'U_LAST_TO_LEAVE':if(self&&a&&lostLord(s,source))add('MOVE_MOD',2);break;
 case 'U_BROKEN_SHAFT':if(self&&a&&a.formation!=='ORDERED')add('DAMAGE_MOD',p.bonus);break;
 case 'U_TRUST_NO_ONE':if(self&&a){const alone=!c34Near(s,source).length,adj=c34Near(s,source,1).length;add('DAMAGE_MOD',alone?15:adj?-5:0);add('DEFENSE_MOD',alone?10:adj?-5:0);}break;
 case 'U_PURSUE_WISELY':if(self&&t?.morale==='ROUTING')add('DAMAGE_MOD',p.bonus);break;
 case 'U_MOUNTAIN_RICE':if(self&&a&&hills(s,source))add('DEFENSE_MOD',10);break;
 case 'U_STIR_TRIBES':if(a&&['forest','hill','mountain'].includes(s.tiles[a.tileId].terrainType)&&['militia','spear'].includes(s.armies[recipient]?.troopType))aura(1,'DAMAGE_MOD',10);break;
 case 'U_PLANTED_FEET':if(self&&x.planted&&!x.defended)add('DEFENSE_MOD',p.reduce);break;
 case 'U_STUBBORN_SIEGE':if(self&&a&&city(s,source)){add('DEFENSE_MOD',p.reduce);add('MOVE_MOD',-2);}break;
 case 'U_GREED':if(self&&t?.morale==='ROUTING')add('DAMAGE_MOD',p.bonus);if(!self&&a&&s.armies[recipient]&&city(s,recipient)&&Object.values(s.cities).filter(c=>c.ownerFactionId===a.factionId).every(c=>dist(s,c.tileId,a.tileId)>3))aura(1000,'DEFENSE_MOD',-p.cost);break;
 default:throw new Error(`UNKNOWN_C34_TRAIT:${e.rule}`);
 }
 if(self&&a){if(x.driveStacks)add('DAMAGE_MOD',x.driveStacks*5);if(x.flankCostUntil>=s.turn&&t&&attackDirection(s,t.armyId,source)!=='FRONT')add('DEFENSE_MOD',-15);}
 return out.map(o=>o.op==='RULE'?{...o,rule:'NO_COUNTER_TAKEN'}:o);
}
export function c34HasRule(s,id,rule){if(p417Api.batchRule(s,id,rule))return true;const a=s.armies[id],x=a?.c34??{};if(!present(s)||!a)return false;
 if(rule==='NO_COUNTER_TAKEN')return !!owned(s,id,'U_FORCED_MARCH_STRIKE')&&(a.movedTiles??0)>=3||!!owned(s,id,'U_HIDDEN_BLADE')&&!x.firstAttack&&x.hiddenStart;
 if(rule==='NEVER_ROUT')return !!owned(s,id,'U_NO_SURRENDER')&&!!city(s,id);
 if(rule==='NO_PURSUIT')return x.noPursuitUntil>=s.turn;
 if(rule==='SIEGE_IMMUNE')return x.wallTurn===s.turn;
 if(rule==='REACH_2')return x.rangeUntil>=s.turn;
 return false;
}
export function c34Immune(s,id,status){const a=s.armies[id];if(!present(s)||!a)return false;
 if(['CONFUSED','ROOTED'].includes(status)&&(owned(s,id,'U_SET_AND_WAIT')&&a.c34?.set&&!(a.movedTiles??0)||c34Near(s,id,1).some(b=>owned(s,b.armyId,'U_STRICT_LAW'))))return true;
 if(['TAUNT','ROOTED'].includes(status)&&c34Near(s,id).some(b=>owned(s,b.armyId,'U_STRAIGHT_WORDS')))return true;
 if(status==='ROOTED'&&c34Near(s,id,1).some(b=>owned(s,b.armyId,'U_CALM_FACE')))return true;
 return a.c34?.envoyUntil>=s.turn&&['TAUNT','ROOTED'].includes(status)||status==='ROOTED'&&(owned(s,id,'U_DEAF_TO_RUMOR')||c34Near(s,id,1).some(b=>owned(s,b.armyId,'U_DEAF_TO_RUMOR')));
}
export function c34MoraleWeight(s,id,w,reason=''){if(!present(s))return w;const a=s.armies[id];if(!a)return w;
 if(/근처|아군|패주/.test(reason)&&c34Near(s,id,1).some(b=>owned(s,b.armyId,'U_CALM_FACE')))return 0;
 if(owned(s,id,'U_LAST_TO_LEAVE')&&lostLord(s,id))return 0;
 if(owned(s,id,'U_CARRY_THE_ARMY')||c34Near(s,id,1).some(b=>owned(s,b.armyId,'U_PILLAR_ELDER'))||a.commanderId===s.factions[a.factionId].rulerId&&c34Near(s,id).some(b=>owned(s,b.armyId,'U_HONEST_COUNSEL')))return Math.max(0,w-10);
 return w;
}
export function c34IgnoreMorale(s,id,reason){return c468IgnoreMorale(s,id,reason)||c461IgnoreMorale(s,id)||present(s)&&(!!owned(s,id,'U_LAST_TO_LEAVE')&&lostLord(s,id)||/아군|패주/.test(reason??'')&&c34Near(s,id,1).some(b=>owned(s,b.armyId,'U_CALM_FACE')));}
export function c34Shortage(s,c){return c34Enabled(s)&&s.personnel.formations.some(f=>f.nodeId===c.cityId&&owned(s,f.formationId,'U_CARRY_THE_ARMY'))?.75:.5;}
export function c34Reveal(s,id,fid){const a=s.armies[id];return present(s)&&!!a&&(Object.values(s.armies).some(b=>b.factionId===fid&&castleArmyActive(s,b)&&owned(s,b.armyId,'U_SEE_THE_TRAP')&&dist(s,b.tileId,a.tileId)<=2)||s.c34?.maps?.some(m=>m.fid===fid&&m.until>=s.turn&&dist(s,s.cities[m.cityId].tileId,a.tileId)<=m.range));}
export function c34KnownTraits(s,fid){return c34VisibleTrait(s,fid)?Object.values(s.officers).filter(o=>o.allegianceFactionId!==fid).flatMap(o=>{const r=s.campaignGrowth.officers[o.officerId],card=r?.cards[r.coreId];return card?[{officerId:o.officerId,name:card.name,text:card.text}]:[];}):[];}
export function c34DamageLimit(s,id,loss,commit=true){if(!present(s))return loss;const a=s.armies[id],x=a.c34??{};
 if(loss>=a.troopCount&&owned(s,id,'U_SCARS')&&(x.scars??0)<3){if(commit)state(s,id).scars=(x.scars??0)+1;return Math.max(0,a.troopCount-Math.max(1,Math.floor(strength(s,id)*.05)));}return loss;
}
export const c34Recovery=(s,id)=>c34Enabled(s)&&s.armies[id]?.c34?.noRecoveryUntil>=s.turn?0:1;
export function c34RemoveStatuses(s,id,predicate){const a=s.armies[id];a.effectStates=a.effectStates.filter(e=>{if(!predicate(e))return true;if(e.op==='STATUS_APPLY'&&owned(s,e.source,'U_LINGERING_POISON')&&!e.c34Poisoned){s.c34??={};(s.c34.poison??=[]).push({source:e.source,targetId:id});}return false;});}
export function c34FlushPoison(s,damage){const rows=s.c34?.poison;if(!rows?.length)return;delete s.c34.poison;for(const row of rows)if(castleArmyActive(s,s.armies[row.targetId]))damage(row.source,[{targetId:row.targetId,loss:Math.round(s.armies[row.targetId].troopCount*.05)}]);}
export function c34Siege(s,id){if(!present(s))return 1;return (owned(s,id,'U_FIRST_ON_WALL')?1.3:1)*(owned(s,id,'U_GREED')?1.2:1)*(s.c34?.maps?.some(m=>m.fid===s.armies[id].factionId&&m.until>=s.turn)?1.2:1);}
export function c34Range(s,id,card){if(!card&&s.trialRules?.mechanicsBatch==='c467'&&s.trialRules?.mechanics==='v2'&&s.armies[id]?.mechV2?.flagRangeTurn===s.turn)return 1;if(!card&&c34Enabled(s)&&s.armies[id]?.troopType==='bow'&&s.armies[id].c34?.rangeUntil>=s.turn)return 1;return c34Enabled(s)&&s.turn%2===0&&owned(s,id,'U_SWORD_AND_PLAN')&&card&&/지략|계략|혼란/.test(card.text)?1:0;}
export function c34Strategy(s,id){return !c34Enabled(s)?0:(owned(s,id,'U_BOAST')?15:0)+(s.turn%2===0&&owned(s,id,'U_SWORD_AND_PLAN')?10:0);}
export function c34Xp(s,id){const o=s.officers[id];return c34Enabled(s)&&Object.values(s.officers).some(b=>b.officerId!==id&&b.allegianceFactionId===o?.allegianceFactionId&&JSON.stringify(b.locationRef)===JSON.stringify(o.locationRef)&&owned(s,b.officerId,'U_BOAST'))?.8:1;}
export function c34Domestic(s,c,raw){if(!present(s))return [];const causes=[];const mod=(rule,key,f)=>{const r=uniqueGovernor(s,c,rule);if(!r)return;const before=raw[key];raw[key]*=f;causes.push({rule,resource:key,label:r.card.name,amount:raw[key]-before});};mod('U_PRESS_SUPPLY','food',.95);mod('U_SEED_MONEY','production',1.15);mod('U_WATERWORKS','food',1.2+(s.mapRules.riverEdges.some(e=>e.split('|').some(t=>dist(s,c.tileId,t)<=1))?.1:0));mod('U_MINT','production',1.1);mod('U_HONEST_COUNSEL','prestige',1.1);return causes;}
export function c34Cost(s,c,kind,cost){if(!present(s))return cost;let factor=1;if(kind==='recruit'&&(uniqueGovernor(s,c,'U_WELCOME_STRANGERS')||uniqueGovernor(s,c,'U_BRIBE_BROKER')))factor=.7;if(kind==='prestige'&&(uniqueGovernor(s,c,'U_STRAIGHT_WORDS')||uniqueGovernor(s,c,'U_MINT')))factor=.7;if(kind==='facility'&&uniqueGovernor(s,c,'U_SCHOLAR_BUILDER'))factor=.9;return factor===1?cost:Math.ceil(cost*factor);}
export function c34Joined(s,c,id){if(uniqueGovernor(s,c,'U_WELCOME_STRANGERS')){s.officers[id].c26??={};s.officers[id].c26.firstDraftExtra=1;s.officers[id].c26.firstDraftLevel=s.officers[id].level+1;}}
export function c34Capture(s,formerOwner){c461Capture(s,formerOwner);if(!c34Enabled(s)||!formerOwner)return;for(const c of Object.values(s.cities).filter(c=>c.ownerFactionId===formerOwner&&uniqueGovernor(s,c,'U_SEED_MONEY'))){c.foodStock+=30;c.productionProgress+=10;}}
export function c34Cancel(s,id,target,card){if(c468Cancel(s,id,target,card)||c461Cancel(s,id,target,card))return true;const a=s.armies[id],t=s.armies[target];if(!c34Enabled(s)||!a||!t||a.factionId===t.factionId)return false;if(/도발|거짓 소문|사기/.test(card.text)&&[t,...c34Near(s,target,1).slice(0,1)].some(b=>owned(s,b.armyId,'U_DEAF_TO_RUMOR')))return true;return false;}
export function c34AttackOptions(s,id,target,options){const a=s.armies[id],t=s.armies[target];if(!c34Enabled(s)||!a||!t)return options;const guarded=c34Near(s,target).some(b=>owned(s,b.armyId,'U_SEE_THE_TRAP'));return guarded&&(a.c27?.ambush||a.c32?.hiddenUntil>=s.turn||t.c27?.feignedFlankUntil>=s.turn)?{...options,forceSide:'FRONT',noFlank:true}:options;}
export function c34CounterFactor(s,id,target){const a=s.armies[id],t=s.armies[target];if(!c34Enabled(s))return 1;return c505Counter(s,id,target)*(owned(s,target,'U_SAME_FOE')&&t.c34?.foe===id&&t.c34.foeTurn===s.turn-1?.5:1)*(a.c34?.stripUntil>=s.turn?1.35:1)*(1+(a.c34?.counterBonus??0)/100);}
// Shares only original rows. No recursive guard or shield propagation.
export function c34ShareRows(s,rows,{commit=true}={}){if(!present(s))return rows;const extra=[];for(const row of rows){const a=s.armies[row.id];if(!a||row.loss<=0)continue;const shield=a.c34?.shield;
 const guard=c34Near(s,row.id).filter(b=>owned(s,b.armyId,'U_TAKE_THE_BLOW')&&b.c34?.takeTurn!==`${s.turn}.${s.activeFactionId}`).sort((b,c)=>Number(c.commanderId===s.factions[a.factionId].rulerId)-Number(b.commanderId===s.factions[a.factionId].rulerId)||b.armyId.localeCompare(c.armyId))[0];
 const who=guard?.armyId??(shield?.until>=s.turn&&castleArmyActive(s,s.armies[shield.source])?shield.source:null);if(!who)continue;const n=Math.min(s.armies[who].troopCount,Math.round(row.loss*(guard?1:shield.share/100)));row.loss-=n;extra.push({id:who,loss:n});if(commit&&guard)state(s,who).takeTurn=`${s.turn}.${s.activeFactionId}`;
 }for(const e of extra){const row=rows.find(r=>r.id===e.id);if(row)row.loss+=e.loss;else rows.push(e);}return rows;}
export function c34VisibleTrait(s,id){return present(s)&&Object.values(s.armies).some(a=>castleArmyActive(s,a)&&owned(s,a.armyId,'U_PHOTO_MEMORY')&&a.factionId===id);}
export function c34Security(s,c,causes){if(!present(s))return causes;const out=[...causes];if(uniqueGovernor(s,c,'U_TAISHAN_BAND'))out.shift();if(uniqueGovernor(s,c,'U_MINT'))out.push('돈을 찍어 낸다');return out;}
export function c34AfterCity(s,id){if(owned(s,id,'U_FIRST_ON_WALL')){const x=state(s,id);x.wallTurn=s.turn;x.wallUntil=s.turn+1;}}
export function c34Wait(s,id,kind){c461Wait(s,id,kind);if(!c34Enabled(s))return;const a=s.armies[id];if(owned(s,id,'U_SET_AND_WAIT'))state(s,id).set=!(a.movedTiles??0);if(owned(s,id,'U_PLANTED_FEET'))state(s,id).planted=kind==='WAIT_UNIT'||kind==='BRACE';if(kind==='REGROUP'){for(const b of c34Near(s,id,1)){if(owned(s,b.armyId,'U_STRICT_LAW'))changeFormation(s,id,-1);if(owned(s,id,'U_FEAST'))c34Rally(s,b.armyId);}if(owned(s,id,'U_FEAST'))uniqueBuff(s,id,id,'DEFENSE_MOD',-10);}}
export function c34Finish(s,fid){if(!present(s))return;for(const a of Object.values(s.armies).filter(a=>a.factionId===fid&&castleArmyActive(s,a))){const id=a.armyId;if(!relevant(s,id))continue;const end=state(s,id);if(end.finished===s.turn)continue;end.finished=s.turn;
 if(owned(s,id,'U_HOLD_THE_POST')){const x=state(s,id),key=`${a.tileId}.${a.facing}`;x.hold=x.post===key&&!(a.movedTiles??0)?Math.min(20,(x.hold??0)+5):0;x.post=key;}
 if(owned(s,id,'U_STIR_TRIBES'))for(const c of Object.values(s.cities).filter(c=>c.ownerFactionId!==fid&&dist(s,c.tileId,a.tileId)<=3))c.securityLevel=Math.min(2,(c.securityLevel??0)+1);
 }}
export function c34Start(s,fid,{heal,damage}){if(!present(s))return;
 c34FlushPoison(s,damage);
 for(const a of Object.values(s.armies).filter(a=>a.factionId===fid&&castleArmyActive(s,a))){const id=a.armyId;
  if(!relevant(s,id)&&!a.c34)continue;
  const x=state(s,id);if(x.start===s.turn)continue;x.start=s.turn;x.defended=false;x.hiddenStart=hidden(s,id);x.post??=`${a.tileId}.${a.facing}`;
  if(x.moveCostTurn===s.turn)uniqueBuff(s,id,id,'MOVE_MOD',-1);
  if(x.chaseCostTurn===s.turn)changeFormation(s,id,1);
  if(x.mercenaries?.until<=s.turn){const f=s.personnel.formations.find(f=>f.formationId===id),n=Math.min(a.troopCount,x.mercenaries.count);a.troopCount-=n;f.field-=n;s.personnel.initialPersonnel-=n;delete x.mercenaries;}
  if(owned(s,id,'U_MEDIATE')&&c34Near(s,id,1).length>=2){const b=c34Near(s,id,1).sort((b,c)=>['ORDERED','DISORDERED','BROKEN'].indexOf(c.formation)-['ORDERED','DISORDERED','BROKEN'].indexOf(b.formation)||b.armyId.localeCompare(c.armyId))[0];changeFormation(s,b.armyId,-1);}
  if(owned(s,id,'U_TIGER_SOUL')){const b=c34Near(s,id)[0];if(b)heal(b.armyId,Math.min(40,Math.round(100-percent(s,id))));}
  if(owned(s,id,'U_MOUNTAIN_RICE')&&hills(s,id))heal(id,20);
 }
 for(const c of Object.values(s.cities).filter(c=>c.ownerFactionId===fid))if(uniqueGovernor(s,c,'U_PRESS_SUPPLY')){c.c34??={};if(c.c34.supplyTurn===s.turn)continue;c.c34.supplyTurn=s.turn;for(const a of Object.values(s.armies).filter(a=>a.factionId===fid&&castleArmyActive(s,a)&&dist(s,c.tileId,a.tileId)<=3))heal(a.armyId,20);}
 // Expiry poison is a finite result row and never a new action.
 for(const a of Object.values(s.armies))for(const e of a.effectStates??[])if(e.op==='STATUS_APPLY'&&e.expiresTurn<s.turn&&!e.c34Poisoned&&owned(s,e.source,'U_LINGERING_POISON')){e.c34Poisoned=true;damage(e.source,[{targetId:a.armyId,loss:Math.round(a.troopCount*.05)}]);}
}
export function c34AfterAttack(s,before,id,target,log,heal,damage){if(!present(s))return;const a=s.armies[id],t=s.armies[target];if(!a||!t)return;
 if(relevant(s,id)||relevant(s,target)||a.c34){const x=state(s,id);x.firstAttack=true;x.foe=target;x.foeTurn=s.turn;if(owned(s,id,'U_SET_AND_WAIT'))x.set=false;}
 if(owned(s,id,'U_FORCED_MARCH_STRIKE')&&(a.movedTiles??0)>=3)state(s,id).moveCostTurn=s.turn+1;
 if(owned(s,id,'U_SWORD_AND_PLAN')&&s.turn%2===1)checkMorale(s,target,'칼과 계략',10,log.moraleChanges);
 if(t.c34){state(s,target).defended=true;if(t.c34.guardHit){t.effectStates=t.effectStates.filter(e=>!e.c34Guard);delete t.c34.guardHit;delete t.c34.counterBonus;}}
 if(t.c34?.stripUntil>=s.turn){a.effectStates=a.effectStates.filter((e,i,rows)=>i!==rows.findIndex(e=>['DAMAGE_MOD','DEFENSE_MOD','MOVE_MOD'].includes(e.op)&&e.value>0));}
 if(owned(s,id,'U_PURSUE_WISELY')&&(t.morale==='ROUTING'||!t.troopCount)){changeFormation(s,id,-1);state(s,id).noChaseTurn=s.turn;}
 for(const b of Object.values(s.armies).filter(b=>castleArmyActive(s,b))){const who=b.armyId;
  if(diplomacyArmyHostile(s,who,id)&&b.factionId===t.factionId&&b.c34?.takeTurn===`${s.turn}.${s.activeFactionId}`&&b.c34?.replied!==b.c34.takeTurn){b.c34.replied=b.c34.takeTurn;damage([{targetId:id,loss:Math.max(1,Math.round(b.troopCount*.12*campaignAttackPower(s,b.commanderId,true)/campaignDefensePower(s,a.commanderId)*C12.counter))}]);}
  if(diplomacyArmyHostile(s,who,id)&&b.factionId===t.factionId&&dist(s,b.tileId,t.tileId)<=1&&owned(s,who,'U_PILLAR_ELDER')&&once(s,who,'pillar'))damage([{targetId:id,loss:Math.round((log.allyLoss||log.enemyLoss)*.4)}]);
  if(diplomacyArmyHostile(s,target,who)&&b.factionId!==t.factionId&&dist(s,b.tileId,t.tileId)<=2&&who!==id&&owned(s,target,'U_RETURNING_KNIVES')&&log.counter&&once(s,target,'knives'))damage([{targetId:who,loss:Math.round(log.allyLoss*.4)}]);
  if(owned(s,who,'U_OPEN_THE_RETREAT')&&onceEligible(s,b,before)){const foe=c34Near(s,who,1,true,beforeRoute(s,b,before)?.armyId)[0];if(foe&&once(s,who,'retreat'))damage([{targetId:foe.armyId,loss:Math.max(1,Math.round(b.troopCount*.06))}]);}
 }
}
const beforeRoute=(s,b,before)=>Object.values(s.armies).find(a=>a.factionId===b.factionId&&a.armyId!==b.armyId&&dist(s,a.tileId,b.tileId)<=2&&a.morale==='ROUTING'&&before.armies[a.armyId]?.morale!=='ROUTING');
const onceEligible=(s,b,before)=>!!beforeRoute(s,b,before);
export function c34AfterTactic(s,id,card,target){if(!present(s))return;if(owned(s,id,'U_STRIKE_THE_HEART')&&/지략|계략|혼란/.test(card.text)&&s.armies[target])checkMorale(s,target,card.name,10,s.lastCombat.moraleChanges);
 for(const b of c34Near(s,id,2,true))if(owned(s,b.armyId,'U_PHOTO_MEMORY')&&!card.effects.some(e=>e.rule?.startsWith('U_'))&&!card.signature){const r=s.campaignGrowth.officers[b.commanderId],key=`${b.commanderId}.c34.memory.${card.id??card.traitId}`;r.cards[key]={...structuredClone(card),traitId:key,core:false};if(!r.pool.traits.some(c=>c.traitId===key))r.pool.traits.push({traitId:key,ownershipType:'PUBLIC',rarity:card.rarity,rankMax:5,stageTags:['EARLY','MID','LATE'],affinityTags:[],roleTags:[],experienceTags:[]});r.track.poolFingerprint=c34Fingerprint(r.pool);}
}
const c34Fingerprint=v=>Array.isArray(v)?`[${v.map(c34Fingerprint).join(',')}]`:v&&typeof v==='object'?`{${Object.keys(v).sort().map(k=>`${JSON.stringify(k)}:${c34Fingerprint(v[k])}`).join(',')}}`:JSON.stringify(v);
export function c34Movement(s,id,from,{damage}={}){if(!present(s)||from===s.armies[id].tileId)return;const a=s.armies[id];
 // Only explicitly inserted C34 units carry movement history.
 if(relevant(s,id)||a.c34||Object.values(s.armies).some(b=>owned(s,b.armyId,'U_CHASE'))){const x=state(s,id);x.movedTurn=s.turn;x.set=false;x.hold=0;x.planted=false;if(owned(s,id,'U_NEW_FORT')&&c34Near(s,id,2,true).every(b=>dist(s,a.tileId,b.tileId)>dist(s,from,b.tileId)))x.formationGuardUntil=s.turn+1;}
 for(const b of c34Near(s,id,2,true)){
  const who=b.armyId,old=dist(s,from,b.tileId),now=dist(s,a.tileId,b.tileId);
  if(damage&&owned(s,who,'U_AWAIT_CAVALRY')&&b.troopType==='bow'&&a.troopType==='cavalry'&&old>1&&now===1&&once(s,who,'await'))damage(who,[{targetId:id,loss:Math.max(1,Math.round(b.troopCount*.12))}]);
  if(damage&&owned(s,who,'U_READ_THE_ESCAPE')&&old===1&&now>1&&once(s,who,'escape'))damage(who,[{targetId:id,loss:Math.max(1,Math.round(b.troopCount*.072))}]);
  if((owned(s,who,'U_CHASE')||owned(s,who,'U_NIGHT_ASSAULT'))&&old===1&&now>1&&b.c34?.noChaseTurn!==s.turn&&once(s,who,'chase')){const to=neighbors(s.tiles[b.tileId]).map(t=>`${t.q},${t.r}`).filter(t=>combatEmptyStep(s,who,t)&&dist(s,t,a.tileId)<now).sort()[0];if(to){b.currentOrder=null;b.tileId=to;state(s,who).chaseCostTurn=s.turn+1;}}
 }
}
export function c34Targets(s,id,card,{visible,hidden:hide}){const e=card.effects.find(e=>C34_RULES.has(e.rule));if(!e)return null;const a=s.armies[id],r=e.rule,range=card.range+c34Range(s,id,card);
 if(r==='U_NORTH_AGAIN'&&percent(s,id)>=50||r==='U_CALL_THE_QIANG'&&(percent(s,id)>=50||Object.values(s.cities).some(c=>c.ownerFactionId===a.factionId&&dist(s,c.tileId,a.tileId)<=3))||r==='U_FOLLOW_THE_LORD'&&!lostLord(s,id))return [];
 if(r==='U_JOIN_THE_ASSAULT')return c34Near(s,id,1,true).filter(b=>(s.combatLog??[]).some(l=>l.turn===s.turn&&l.targetId===b.armyId&&l.attackerId!==id&&s.armies[l.attackerId]?.factionId===a.factionId)).map(b=>b.armyId);
 if(r==='U_STORM_THE_WALL'||r==='U_OPEN_THE_GATE')return Object.values(s.cities).filter(c=>c.ownerFactionId!==a.factionId&&c.durability>0&&visible(c.tileId)&&dist(s,a.tileId,c.tileId)<=card.range&&(r!=='U_STORM_THE_WALL'||c.footprint.gates.includes(a.tileId))).map(c=>c.cityId).sort();
 if(card.range===0)return [id];
 const friendly=new Set(['U_ENVOY_OF_HEARTS','U_HAND_OVER','U_RAISE_TWO','U_PASS_THE_GUARD','U_TAKE_MY_SHARE','U_CLEAR_THE_WAY','U_BLOOD_SHIELD','U_REBALANCE','U_MARCH_TOGETHER']);
 return Object.values(s.armies).filter(b=>castleArmyActive(s,b)&&visible(b.tileId)&&!hide(b.armyId)&&dist(s,a.tileId,b.tileId)<=range&&(b.factionId===a.factionId)===friendly.has(r)&&(!['U_HAND_OVER','U_PASS_THE_GUARD','U_TAKE_MY_SHARE'].includes(r)||b.armyId!==id)&&(!['U_STEAL_HORSES','U_RISE_AND_SHOOT'].includes(r)||b.troopType==='cavalry')).map(b=>b.armyId).sort();
}
export const C34_DAMAGE_TACTICS=new Set(['U_CHAIN_ARROWS','U_DRIVE_DEEP','U_NORTH_AGAIN','U_SPREAD_RUMOR','U_TIGER_CLAWS','U_LEAVE_A_GAP','U_THREE_HUNDRED','U_FIRST_OF_ARMIES','U_BLADE_FIRST','U_RISE_AND_SHOOT','U_CUT_RETREAT','U_I_WILL_SLAY','U_SHAFT_STRIKE','U_EXTORT','U_HEAVEN_SHAKER','U_MOONLIT_BOW','U_JOIN_THE_ASSAULT','U_FLAME_DANCE','U_FOLLOW_THE_LORD']);
export function c34Tactic({s,id,target,card,attack,damage,heal,retreat,cityAttack}){
 const e=card.effects.find(e=>C34_RULES.has(e.rule)),r=e.rule,p=e.params??{},a=s.armies[id],t=s.armies[target],x=state(s,id),log=s.lastCombat;
 const hit=(who=target,n=100)=>attack(id,who,n),buff=(bs,op,n,d=1)=>bs.forEach(b=>uniqueBuff(s,id,b.armyId,op,n,d));
 const status=(bs,name,d=1)=>bs.forEach(b=>uniqueStatus(s,id,b.armyId,name,d,{guaranteed:true}));
 const rally=(bs,n=1)=>bs.forEach(b=>c34Rally(s,b.armyId,n));const clean=bs=>bs.forEach(b=>c34RemoveStatuses(s,b.armyId,e=>e.op==='STATUS_APPLY'));
 const form=(bs,n=-1)=>bs.forEach(b=>changeFormation(s,b.armyId,n,log.formationChanges));const near=(range=2,enemy=false,center=id)=>c34Near(s,id,range,enemy,center);
 const stop=(who,d=1)=>{state(s,who).disarmUntil=s.turn+d;};const costRecovery=d=>x.noRecoveryUntil=d===Infinity?Number.MAX_SAFE_INTEGER:s.turn+d;
 switch(r){
 case 'U_CHAIN_ARROWS':for(let n=0;n<p.hits;n++)hit(target,p.ratio);if(t.armyId===leader(s,target)?.armyId)cooldown(s,target,1);break;
 case 'U_DRIVE_DEEP':{const broken=t.formation!=='ORDERED';hit();if(broken){const to=oppositeCombatTile(s,id,target);if(combatEmptyStep(s,target,to)){const at=t.tileId;t.currentOrder=null;t.tileId=to;if(combatEmptyStep(s,id,at)){a.currentOrder=null;a.tileId=at;}}}x.driveStacks=Math.min(p.max,(x.driveStacks??0)+1);break;}
 case 'U_UNSHAKEN':clean(allies(s,id));form(allies(s,id));status([a],'ROOTED');break;
 case 'U_STORM_THE_WALL':cityAttack(p.siege);for(const b of Object.values(s.armies).filter(b=>b.factionId===s.cities[target].ownerFactionId&&dist(s,b.tileId,s.cities[target].tileId)<=1))checkMorale(s,b.armyId,card.name,p.morale,log.moraleChanges);stop(id);break;
 case 'U_ELDER_GRACE':for(const b of allies(s,id))state(s,b.armyId).ignoreRelationsUntil=s.turn+1;buff(allies(s,id),'DAMAGE_MOD',p.atk);buff(allies(s,id),'DEFENSE_MOD',p.def);break;
 case 'U_GATE_GIANT':status(near(1,true).filter(b=>attackDirection(s,b.armyId,id)==='FRONT'),'ROOTED');buff([a],'DEFENSE_MOD',p.reduce);status([a],'ROOTED');break;
 case 'U_TEN_SIDES':for(const b of near(2,true)){checkMorale(s,b.armyId,card.name,p.morale,log.moraleChanges);if(b.effectStates.some(e=>e.op==='STATUS_APPLY'))state(s,b.armyId).noRecoveryUntil=s.turn+2;}break;
 case 'U_HOLD_AND_STRIP':x.stripUntil=s.turn+1;break;
 case 'U_NORTH_AGAIN':hit(target,p.ratio);rally(allies(s,id));costRecovery(Infinity);break;
 case 'U_ENVOY_OF_HEARTS':rally([t],2);state(s,target).envoyUntil=s.turn+1;break;
 case 'U_SPREAD_RUMOR':{const b=near(2,true).sort((b,c)=>c.troopCount-b.troopCount||b.armyId.localeCompare(c.armyId))[0];if(b){damage([{targetId:b.armyId,loss:Math.round(a.troopCount*.15)}]);buff([b],'DEFENSE_MOD',-p.bonus,2);}break;}
 case 'U_HAND_OVER':buff([t],'MOVE_MOD',p.move);buff([t],'DAMAGE_MOD',p.bonus);state(s,target).handoverTurn=s.turn;t.c27??={};t.c27.extraTurn=s.turn;s.endedArmyIds=s.endedArmyIds.filter(k=>k!==target);break;
 case 'U_RAISE_TWO':form([t,...near(2).filter(b=>b.armyId!==target)].slice(0,2));break;
 case 'U_PASS_THE_GUARD':a.braced=false;state(s,target).guardHit=true;buff([t],'DEFENSE_MOD',p.reduce);t.effectStates.at(-1).c34Guard=true;state(s,target).counterBonus=p.counter;break;
 case 'U_TAKE_MY_SHARE':form([a],1);form([t],-2);heal(target,p.heal);break;
 case 'U_TIGER_CLAWS':for(const b of near(1,true).slice(0,2)){hit(b.armyId,p.ratio);status([b],'TAUNT');state(s,b.armyId).tauntSource=id;}form([a],1);break;
 case 'U_STERN_HALT':buff([t],'DAMAGE_MOD',-p.reduce);if(t.commanderId===s.factions[t.factionId].rulerId)state(s,target).noTacticUntil=s.turn+1;break;
 case 'U_LEAVE_A_GAP':hit(target,100+p.bonus);if(neighbors(s.tiles[t.tileId]).some(at=>combatEmptyStep(s,target,`${at.q},${at.r}`)))checkMorale(s,target,card.name,p.morale,log.moraleChanges);break;
 case 'U_FIRE_RAIN':for(const b of [t,...near(1,true,target)].slice(0,2))uniqueIgnite(s,id,b.armyId,1,damage,false);damage([{targetId:id,loss:Math.floor(a.troopCount*p.cost/100)}]);break;
 case 'U_CLEAR_THE_WAY':for(const b of near(1,true,target))checkMorale(s,b.armyId,card.name,10,log.moraleChanges);state(s,target).noPursuitUntil=s.turn+1;break;
 case 'U_BLOOD_SHIELD':state(s,target).shield={source:id,until:s.turn+2,share:p.share};buff([a],'DEFENSE_MOD',-p.cost,2);break;
 case 'U_THREE_HUNDRED':hit(target,100+p.bonus);status([t],'TAUNT');state(s,target).tauntSource=id;x.moveCostTurn=s.turn+1;break;
 case 'U_FIRST_OF_ARMIES':hit();hit(target,p.ratio);stop(target);x.flankCostUntil=s.turn+1;break;
 case 'U_BLADE_FIRST':hit(target,p.ratio);stop(target);costRecovery(2);buff([a],'DEFENSE_MOD',-10,2);break;
 case 'U_RISE_AND_SHOOT':for(const b of near(2,true).filter(b=>b.troopType==='cavalry')){hit(b.armyId,p.ratio);state(s,b.armyId).noChargeUntil=s.turn+1;}x.rootTurn=s.turn+1;break;
 case 'U_REVEAL_DEPOT':case 'U_PRESENT_MAP':{const c=Object.values(s.cities).filter(c=>c.ownerFactionId!==a.factionId).sort((c,d)=>dist(s,a.tileId,c.tileId)-dist(s,a.tileId,d.tileId)||c.cityId.localeCompare(d.cityId))[0];if(c){s.c34??={};(s.c34.maps??=[]).push({fid:a.factionId,cityId:c.cityId,range:r==='U_PRESENT_MAP'?p.vision:3,until:s.turn+1});if(r==='U_REVEAL_DEPOT')buff(Object.values(s.armies).filter(b=>b.factionId===c.ownerFactionId&&dist(s,b.tileId,c.tileId)<=3),'DEFENSE_MOD',-p.bonus,2);}if(r==='U_PRESENT_MAP')lower(s,id);break;}
 case 'U_MUDDY_WATERS':for(const b of near(2,true).slice(0,2))if(uniqueStatus(s,id,b.armyId,'CONFUSED'))buff([b],'MOVE_MOD',-2);break;
 case 'U_CUT_RETREAT':{const b=near(1,true).sort((b,c)=>stat(s,b.armyId,'leadership')-stat(s,c.armyId,'leadership')||b.armyId.localeCompare(c.armyId))[0];if(b){hit(b.armyId,100+p.bonus);status([b],'ROOTED');}break;}
 case 'U_STEAL_HORSES':buff([t],'MOVE_MOD',-3,2);buff([a],'MOVE_MOD',1,2);break;
 case 'U_I_WILL_SLAY':{const weak=t.morale!=='STEADY';hit(target,p.ratio);if(weak||s.officers[t.commanderId].c26OriginFaction===a.factionId)lower(s,target,2);break;}
 case 'U_CALL_THE_QIANG':{const f=s.personnel.formations.find(f=>f.formationId===id);f.field+=p.troops;a.troopCount+=p.troops;f.targetStrength=Math.max(f.targetStrength,f.field);a.deploymentStrength=Math.max(a.deploymentStrength??0,a.troopCount);a.maxHp=Math.max(a.maxHp,a.troopCount*2);a.hp=Math.max(a.hp,a.troopCount*2);s.personnel.initialPersonnel+=p.troops;x.mercenaries={count:p.troops,until:s.turn+2};break;}
 case 'U_SHAFT_STRIKE':hit();if(stat(s,target,'might')>=p.might)lower(s,target,2);form([a],1);break;
 case 'U_EXTORT':hit(target,p.ratio);hit(target,p.ratio);if(t.morale==='ROUTING'){const c=Object.values(s.cities).find(c=>c.ownerFactionId===a.factionId);if(c)c.foodStock+=10;}break;
 case 'U_BURN_THE_CITY':{const bs=near(2,true).slice(0,p.tiles);for(const b of bs){uniqueIgnite(s,id,b.armyId,1,damage,false);checkMorale(s,b.armyId,card.name,10,log.moraleChanges);}for(const c of Object.values(s.cities).filter(c=>c.ownerFactionId===a.factionId&&bs.some(b=>dist(s,c.tileId,b.tileId)<=3)))s.factions[c.ownerFactionId].prestige=Math.max(0,s.factions[c.ownerFactionId].prestige-10);break;}
 case 'U_HEAVEN_SHAKER':hit();buff(near(1,true),'MOVE_MOD',-2);break;
 case 'U_RETREAT_FIRST':for(const b of allies(s,id)){state(s,b.armyId).noPursuitUntil=s.turn+1;}buff(allies(s,id),'MOVE_MOD',1);break;
 case 'U_MOONLIT_BOW':hit();buff([a],'DEFENSE_MOD',p.reduce);break;
 case 'U_REBALANCE':{const bs=allies(s,id).sort((b,c)=>b.troopCount-c.troopCount||b.armyId.localeCompare(c.armyId)),lo=bs[0],hi=bs.at(-1);if(lo!==hi){const n=Math.floor(hi.troopCount*p.ratio/100),lf=s.personnel.formations.find(f=>f.formationId===lo.armyId),hf=s.personnel.formations.find(f=>f.formationId===hi.armyId);hi.troopCount-=n;lo.troopCount+=n;hf.field-=n;lf.field+=n;lf.targetStrength=Math.max(lf.targetStrength,lf.field);lo.maxHp=Math.max(lo.maxHp,lo.troopCount*2);lo.hp=Math.max(lo.hp,lo.troopCount*2);}break;}
 case 'U_LINKED_GATES':buff(allies(s,id).filter(b=>b.braced||city(s,b.armyId)),'DEFENSE_MOD',p.reduce,2);break;
 case 'U_JOIN_THE_ASSAULT':hit(target,100+p.bonus);form([a],1);break;
 case 'U_OPEN_THE_GATE':{const c=s.cities[target];const n=Math.round(c.durability*p.dur/100);c.durability-=n;log.dealt=n;log.enemyLoss=n;log.cityId=target;s.factions[a.factionId].prestige=Math.max(0,s.factions[a.factionId].prestige-p.fame);lower(s,id);break;}
 case 'U_FLAME_DANCE':for(const b of near(1,true)){hit(b.armyId);uniqueIgnite(s,id,b.armyId,1,damage,false);checkMorale(s,b.armyId,card.name,10,log.moraleChanges);}form([a],1);break;
 case 'U_SPREAD_REVOLT':{const old=t.effectStates.find(e=>e.op==='STATUS_APPLY'&&e.status==='CONFUSED');if(old)old.expiresTurn++;else status([t],'CONFUSED');break;}
 case 'U_YOUR_BATTLEFIELD':status([t],'ROOTED',2);status([a],'ROOTED');break;
 case 'U_SMOKE_RETREAT':{const from=a.tileId,path=retreat(2);if(path.length){a.currentOrder=null;a.tileId=path.at(-1);}s.c34??={};(s.c34.smoke??=[]).push({tileId:from,fid:a.factionId,until:s.turn+1});clean(allies(s,id));break;}
 case 'U_FOLLOW_THE_LORD':hit(target,p.ratio);lower(s,id,2);break;
 case 'U_KING_WEN':if(stat(s,id,'intelligence')+c34Strategy(s,id)>stat(s,target,'intelligence'))stop(target,2);else lower(s,id);break;
 case 'U_MARCH_TOGETHER':state(s,target).rangeUntil=s.turn+1;buff([t],'MOVE_MOD',1);break;
 case 'U_RALLY_ALL':buff([a],'DAMAGE_MOD',Math.min(p.max,allies(s,id).length*p.per));break;
 default:throw new Error(`UNKNOWN_C34_TACTIC:${r}`);
 }
 return s;
}

// C422 default ability overlay for the four approved C417 officers.
import * as p417m0 from './map-primitives.mjs';
import * as p417m1 from './campaign-city-footprint.mjs';
import * as p417m2 from './campaign-diplomacy.mjs';
import * as p417m3 from './campaign-effects.mjs';
import * as p417m4 from './campaign-abilities.mjs';
import * as p417m5 from './campaign-morale.mjs';
import * as p417m6 from './campaign-combat.mjs';
import * as p417eng from './campaign-engines.mjs';
import * as p417m7 from './knowledge.mjs';
import {c450Rule,C450_IDS,c450Targets,c450Cast,c450Start,c450Finish,c450AfterAttack,c450Factor,c450Options,c450NoRout,c450MoveAllowed,c450Moved,c450Intercept,c450AttackAllowed} from './campaign-c450.mjs';
const P417_DATA=(await import('../data/mechanics-v2-pilot.json',{with:{type:'json'}})).default;
const p417Api=(()=>{
const DATA=P417_DATA;
const updateKnowledge=(...args)=>p417m7.updateKnowledge(...args);
const attackRange=(...args)=>p417m6.attackRange(...args);
const attackTargets=(...args)=>p417m6.attackTargets(...args);
const forceArmyTo=(...args)=>c468ForceArmyTo(...args);
const resolveAttack=(...args)=>p417m6.resolveAttack(...args);
const campaignPath=(...args)=>p417m5.campaignPath(...args);
const checkMorale=(...args)=>p417m5.checkMorale(...args);
const changeMorale=(...args)=>p417m5.changeMorale(...args);
const checkFormation=(...args)=>p417m4.checkFormation(...args);
const changeFormation=(...args)=>p417m4.changeFormation(...args);
const healCampaignTroops=(s,id,...args)=>c34Recovery(s,id)?p417m3.healCampaignTroops(s,id,...args):0;
const consumeMainAction=(...args)=>p417m3.consumeMainAction(...args);
const ambushHidden=(...args)=>p417m3.ambushHidden(...args);
const diplomacyArmyHostile=(...args)=>p417m2.diplomacyArmyHostile(...args);
const campaignDestinationAllowed=(...args)=>p417m1.campaignDestinationAllowed(...args);
const castleArmyActive=(...args)=>p417m1.castleArmyActive(...args);
const tileId=(...args)=>p417m0.tileId(...args);
const neighbors=(...args)=>p417m0.neighbors(...args);
const hexDistance=(...args)=>p417m0.hexDistance(...args);
// The saved marker alone selects rules. URL changes never migrate existing saves.
const mechanicsV2Enabled=s=>s?.trialRules?.mechanics==='v2';
const PILOT_OPS=Object.freeze(['DASH_LINE','MOVE_REFUND','FRENZY','PENALTY_CONTRACT','INTERCEPT','BURDEN_TRANSFER','SHARE_ALLY']);
const PILOT_RULES=Object.freeze(Object.keys(DATA.officers).flatMap(id=>['TRAIT','E','R'].map(slot=>`P417_${id}_${slot}`)));
const enabledOfficer=(s,id)=>mechanicsV2Enabled(s)&&(['G01','G03','G05','G25'].includes(id)||([...C468_IDS,...C491_IDS,...C505_IDS,...C507_IDS].includes(id)?s.trialRules.mechanicsBatch==='c467'&&s.campaignGrowth?.officers[id]?.mechanicsV2!==false:C487_IDS.includes(id)?s.trialRules.mechanicsBatch==='c467':C467_IDS.includes(id)?s.trialRules.mechanicsBatch==='c467':C466_IDS.includes(id)?['c466','c467'].includes(s.trialRules.mechanicsBatch):C461_IDS.includes(id)?['c461','c466','c467'].includes(s.trialRules.mechanicsBatch):C450_IDS.includes(id)?['c450','c461','c466','c467'].includes(s.trialRules.mechanicsBatch):['c437','c450','c461','c466','c467'].includes(s.trialRules.mechanicsBatch)));
const pilotOfficer=(s,id)=>enabledOfficer(s,s.armies[id]?.commanderId??id)?DATA.officers[s.armies[id]?.commanderId??id]:null;
const live=s=>Object.values(s.armies).filter(a=>castleArmyActive(s,a)&&a.troopCount>0);
const dist=(s,a,b)=>hexDistance(s.tiles[a.tileId??a],s.tiles[b.tileId??b]);
const state=a=>a.mechV2??={};
const owns=(s,a,id)=>enabledOfficer(s,id)&&a?.commanderId===id&&castleArmyActive(s,a)&&a.troopCount>0;
const foes=(s,a)=>live(s).filter(b=>diplomacyArmyHostile(s,a.armyId,b.armyId)&&s.knowledge[a.factionId]?.tiles[b.tileId]==='VISIBLE'&&!ambushHidden(s,b.armyId,a.factionId)).sort((b,c)=>dist(s,a,b)-dist(s,a,c)||b.armyId.localeCompare(c.armyId));
const empty=(s,id,at)=>s.tiles[at]&&!['mountain','water'].includes(s.tiles[at].terrainType)&&campaignDestinationAllowed(s,id,at)&&!live(s).some(b=>b.armyId!==id&&b.tileId===at)&&!Object.values(s.cities).some(c=>[c.tileId,...(c.footprint?.gates??[])].includes(at));

// C437: bounded rule helpers. All mutable state lives in the existing save envelope.
const record=(s,id)=>s.campaignGrowth?.officers[s.armies[id]?.commanderId??id];
const alliesOf=(s,a,n=2)=>live(s).filter(b=>b.factionId===a.factionId&&dist(s,a,b)<=n).sort((b,c)=>b.armyId.localeCompare(c.armyId));
const level=(s,id)=>{const r=record(s,id);return r?.track.growthStates[r.pack.id].level??1;};
const wounded=(s,id)=>s.personnel.lots.filter(l=>l.kind==='WOUNDED'&&l.originFormationId===id).reduce((n,l)=>n+l.count,0);
const inCity=(s,a)=>Object.values(s.cities).some(c=>c.ownerFactionId===a.factionId&&[c.tileId,...(c.footprint?.gates??[])].includes(a.tileId));
function gainException(s,id,n,event){
 const c=record(s,id)?.c29;if(!c||c.events?.[event])return 0;c.events??={};c.events[event]=true;
 const gain=Math.max(0,Math.min(n,30-(c.periodGain??0),100-c.gauge));c.periodGain=(c.periodGain??0)+gain;c.gauge+=gain;return gain;
}
function syncCosts(s,id){
 const a=s.armies[id],r=record(s,id);if(!a||!r)return;
 if(owns(s,a,'G10'))for(const c of Object.values(r.cards).filter(c=>c.pilot)){c.baseGaugeCost??=c.gaugeCost;c.gaugeCost=Math.max(0,c.baseGaugeCost-20*(a.mechV2?.awe??3));}
 if(owns(s,a,'G59')){const c=r.cards['G59.pilot.E'];if(c)c.gaugeCost=a.mechV2?.bladeTurn===s.turn-1?20:40;}
}
function spendAwe(s,id,n){
 const a=s.armies[id],x=state(a),old=x.awe??3;x.awe=Math.max(0,old-n);
 if(old>0&&!x.awe)for(const b of alliesOf(s,a))checkMorale(s,b.armyId,'위세 소진',10);
 syncCosts(s,id);
}
function stepAway(s,id,source,n=1){
 for(let i=0;i<n;i++){const a=s.armies[id],p=s.armies[source],to=neighbors(s.tiles[a.tileId]).map(tileId).filter(at=>empty(s,id,at)&&dist(s,at,p)>dist(s,a,p)).sort()[0];if(!to)break;forceArmyTo(s,id,to);}
}
function swap(s,id,target){const at=s.armies[id].tileId,to=s.armies[target].tileId;forceArmyTo(s,id,to);forceArmyTo(s,target,at);}
function shot(s,id,target,ratio=1){
 if(!s.armies[target]||!castleArmyActive(s,s.armies[target]))return s;
 return p417m6.engineDamageRows(s,id,[{targetId:target,loss:Math.max(1,Math.round(p417m6.engineBaseDamage(s,id,target)*ratio))}],'P437_SHOT',true);
}
function rescueMate(s,a){return alliesOf(s,a,1).find(b=>b.armyId!==a.armyId);}
function linePath(s,id,to,max,allowOccupied=false){
 const a=s.armies[id],from=s.tiles[a.tileId],end=s.tiles[to];if(!end||!empty(s,id,to))return null;
 const n=hexDistance(from,end);if(n<1||n>max)return null;
 const dq=(end.q-from.q)/n,dr=(end.r-from.r)/n;if(!neighbors({q:0,r:0}).some(d=>d.q===dq&&d.r===dr))return null;
 const path=Array.from({length:n},(_,i)=>tileId({q:from.q+dq*(i+1),r:from.r+dr*(i+1)}));
 return path.every(at=>s.tiles[at]&&s.knowledge[a.factionId]?.tiles[at]==='VISIBLE'&&!['mountain','water'].includes(s.tiles[at].terrainType)&&!Object.values(s.cities).some(c=>[c.tileId,...(c.footprint?.gates??[])].includes(at))&&(allowOccupied||!live(s).some(b=>b.armyId!==id&&b.tileId===at)))?path:null;
}
function batchTargets(s,id,card){
 const c507=c507Targets(s,id,card);if(c507!==null)return c507;
 const redo=c505Targets(s,id,card);if(redo!==null)return redo;
 const newest=c491Targets(s,id,card);if(newest!==null)return newest;
 const added=c468Targets(s,id,card);if(added!==null)return added;
 const contract=c487Targets(s,id,card);if(contract!==null)return contract;
 const hooked=c467Targets(s,id,card);if(hooked!==null)return hooked;
 const fourth=c466Targets(s,id,card);if(fourth!==null)return fourth;
 const third=c461Targets(s,id,card);if(third!==null)return third;
 const expanded=c450Targets(s,id,card);if(expanded!==null)return expanded;
 const a=s.armies[id],rule=card.rule,enemy=n=>foes(s,a).filter(b=>dist(s,a,b)<=n).map(b=>b.armyId),ally=n=>alliesOf(s,a,n).filter(b=>b.armyId!==id).map(b=>b.armyId);
 if(a.mechV2?.silencedUntil>=s.turn)return [];
 if(rule==='P417_G02_E')return ally(2).filter(k=>foes(s,s.armies[k]).some(b=>dist(s,s.armies[k],b)===1)&&neighbors(s.tiles[a.tileId]).map(tileId).some(at=>empty(s,k,at)));
 if(rule==='P417_G02_R'){
  const mate=rescueMate(s,a);if(!mate)return [];
  return withCampaignQueries(s,()=>Object.keys(s.tiles).filter(at=>rescuePath(s,id,at)&&neighbors(s.tiles[at]).map(tileId).some(to=>empty(s,mate.armyId,to))).sort());
 }
 if(rule==='P417_G52_R')return Object.keys(s.tiles).filter(at=>{const path=linePath(s,id,at,3,true);return path&&path.every(at=>live(s).filter(b=>b.armyId!==id&&b.tileId===at).every(b=>diplomacyArmyHostile(s,id,b.armyId)&&neighbors(s.tiles[at]).map(tileId).some(to=>empty(s,b.armyId,to)&&!path.includes(to))));}).sort();
 if(['P417_G06_E','P417_G06_R'].includes(rule))return enemy(rule.endsWith('_R')?4:p417m6.attackRange(a,s)).filter(k=>dist(s,a,s.armies[k])>1&&(rule.endsWith('_R')||p417m6.engineShotLine(s,id,k)));
 if(rule==='P417_G07_R')return enemy(3);
 if(rule==='P417_G08_E'||rule==='P417_G53_E')return ally(1);
 if(rule==='P417_G10_E'||rule==='P417_G59_E'||rule==='P417_G44_R')return enemy(2);
 if(rule==='P417_G14_E'||rule==='P417_G88_R')return enemy(p417m6.attackRange(a,s)).filter(k=>a.troopType!=='bow'||dist(s,a,s.armies[k])>1);
 if(rule==='P417_G59_R')return a.troopCount<(s.personnel.formations.find(f=>f.formationId===id)?.targetStrength??a.deploymentStrength??a.troopCount)/2?enemy(p417m6.attackRange(a,s)):[];
 if(card.pilot&&card.rule&&!['G01','G03','G05','G25'].some(k=>card.rule.includes(k)))return [id];
 return null;
}
function batchCast(s,id,card,target){
 if(C507_IDS.some(g=>card.rule===`P417_${g}_${card.slot}`))return c507Cast(s,id,card,target);
 if(C505_IDS.some(g=>card.rule===`P417_${g}_${card.slot}`))return c505Cast(s,id,card,target);
 if(C491_IDS.some(g=>card.rule===`P417_${g}_${card.slot}`))return c491Cast(s,id,card,target);
 if(C468_IDS.some(g=>card.rule===`P417_${g}_${card.slot}`))return c468Cast(s,id,card,target);
 if(C487_IDS.some(g=>card.rule===`P417_${g}_${card.slot}`))return c487Cast(s,id,card,target);
 if(C467_IDS.some(g=>card.rule===`P417_${g}_${card.slot}`))return c467Cast(s,id,card,target);
 if(C466_IDS.some(g=>card.rule===`P417_${g}_${card.slot}`))return c466Cast(s,id,card,target);
 if(C461_IDS.some(g=>card.rule===`P417_${g}_${card.slot}`))return c461Cast(s,id,card,target);
 if(C450_IDS.some(g=>card.rule===`P417_${g}_${card.slot}`))return c450Cast(s,id,card,target);
 const a=s.armies[id],x=state(a),rule=card.rule,t=s.armies[target],log=s.lastCombat;
 const rally=b=>{if(batchMoraleBlocked(s,b.armyId))return;if(b.morale==='ROUTING')changeMorale(s,b.armyId,'SHAKEN',card.name,log.moraleChanges);else if(b.morale==='SHAKEN')changeMorale(s,b.armyId,'STEADY',card.name,log.moraleChanges);};
 if(rule==='P417_G02_E'){const to=neighbors(s.tiles[a.tileId]).map(tileId).filter(at=>empty(s,target,at)).sort()[0];forceArmyTo(s,target,to);}
 else if(rule==='P417_G02_R'){
  const mate=rescueMate(s,a),path=rescuePath(s,id,target);if(!mate||!path)throw new Error('P437_RESCUE_PATH');
  for(const at of path){if(!pilotBeforeMove(s,id,a.tileId,at))break;for(const b of foes(s,a).filter(b=>b.tileId===at))s=shot(s,id,b.armyId,.35);if(empty(s,id,at))forceArmyTo(s,id,at);}
  const to=neighbors(s.tiles[s.armies[id].tileId]).map(tileId).filter(at=>empty(s,mate.armyId,at)).sort()[0];if(to)forceArmyTo(s,mate.armyId,to);
  healCampaignTroops(s,mate.armyId,Math.floor(wounded(s,mate.armyId)*.2),{exact:true});
 }
 else if(rule==='P417_G06_E')x.aim={targetId:target};
 else if(rule==='P417_G06_R'){s=shot(s,id,target,2);if(s.armies[target]?.troopCount>0){checkMorale(s,target,card.name,20);checkMorale(s,target,card.name,20);}if(!s.armies[target]?.troopCount||s.armies[target].morale==='ROUTING')gainException(s,id,40,`huang.refund.${s.turn}`);}
 else if(rule==='P417_G07_R'){
  const c=record(s,target)?.c29,recipient=alliesOf(s,a).filter(b=>b.armyId!==id&&record(s,b.armyId)?.c29).sort((b,c)=>record(s,b.armyId).c29.gauge-record(s,c.armyId).c29.gauge||b.armyId.localeCompare(c.armyId))[0]??a;
  const n=Math.min(40,c?.gauge??0,30-(record(s,recipient.armyId)?.c29.periodGain??0),100-(record(s,recipient.armyId)?.c29.gauge??100));if(c&&n>0){c.gauge-=n;gainException(s,recipient.armyId,n,`cao.transfer.${s.turn}`);}t.c34??={};t.c34.noTacticUntil=s.turn+1;state(t).stolenSilence=true;
 }
 else if(rule==='P417_G08_E'){swap(s,id,target);if(level(s,target)<level(s,id))state(t).nextFlank=true;}
 else if(rule==='P417_G08_R')for(const b of alliesOf(s,a).filter(b=>b.armyId!==id&&level(s,b.armyId)<level(s,id))){changeFormation(s,b.armyId,-1,log.formationChanges);rally(b);uniqueBuff(s,id,b.armyId,'MOVE_MOD',1);}
 else if(rule==='P417_G10_E'){if(s.officers[a.commanderId].baseStats.leadership>s.officers[t.commanderId].baseStats.leadership){state(t).nextDamage=.7;checkMorale(s,target,card.name,10);}}
 else if(rule==='P417_G10_R'){const n=x.aweRelease??x.awe??3;for(const b of alliesOf(s,a).slice(0,n)){if(!batchMoraleBlocked(s,b.armyId))changeMorale(s,b.armyId,'STEADY',card.name);state(b).nextDamage=1.25;}spendAwe(s,id,x.awe??3);delete x.aweRelease;}
 else if(rule==='P417_G14_E'){s=hit(s,id,target);stepAway(s,id,target,2);uniqueStatus(s,id,target,'SLOWED',1,{guaranteed:true});}
 else if(rule==='P417_G14_R')for(const b of alliesOf(s,a).filter(b=>['cavalry','BT04'].includes(b.troopType)))state(b).whiteHorseTurn=s.turn;
 else if(rule==='P417_G23_E'){x.nonAttackTurn=s.turn;x.defenseUntil=s.turn+1;for(const b of alliesOf(s,a))state(b).simaGuard={source:id,until:s.turn+1};}
 else if(rule==='P417_G23_R'){const eligible=alliesOf(s,a).filter(b=>b.armyId!==id).map(b=>({id:b.armyId,target:foes(s,b).find(t=>p417m6.attackTargets(s,b.armyId).includes(t.armyId))?.armyId})).filter(row=>row.target).slice(0,Math.min(4,x.waits??0));for(const row of eligible)if(castleArmyActive(s,s.armies[row.id])&&castleArmyActive(s,s.armies[row.target]))s=p417m6.resolveAttack(s,row.id,row.target,null,{enginePaid:true,troopQRatio:.6});}
 else if(rule==='P417_G44_R'){swap(s,id,target);s=p417m6.resolveAttack(s,id,target,null,{enginePaid:true,forceSide:'REAR'});}
 else if(rule==='P417_G52_E')x.frontGuardUntil=s.turn+1;
 else if(rule==='P417_G52_R'){
  const path=linePath(s,id,target,3,true),n=x.ripostes??0;x.ripostes=0;
  for(const at of path??[]){if(!pilotBeforeMove(s,id,s.armies[id].tileId,at))break;for(const b of foes(s,s.armies[id]).filter(b=>b.tileId===at)){const to=neighbors(s.tiles[at]).map(tileId).filter(to=>empty(s,b.armyId,to)&&!path.includes(to)).sort()[0];if(to)forceArmyTo(s,b.armyId,to);changeFormation(s,b.armyId,n,log.formationChanges);}if(empty(s,id,at))forceArmyTo(s,id,at);}
 }
 else if(rule==='P417_G53_E'){changeMorale(s,target,t.morale==='STEADY'?'SHAKEN':'ROUTING',card.name,log.moraleChanges);if(t.morale!=='ROUTING')changeFormation(s,target,-2,log.formationChanges);}
 else if(rule==='P417_G53_R'){for(const b of alliesOf(s,a)){b.effectStates=b.effectStates.filter(e=>e.op!=='STATUS_APPLY');changeFormation(s,b.armyId,-1,log.formationChanges);}a.c34??={};a.c34.rootTurn=s.turn;}
 else if(rule==='P417_G59_E'){if(s.officers[a.commanderId].baseStats.intelligence>s.officers[t.commanderId].baseStats.intelligence)uniqueStatus(s,id,target,'CONFUSED',1,{guaranteed:true});x.planTurn=s.turn;}
 else if(rule==='P417_G59_R'){s=p417m6.resolveAttack(s,id,target,null,{enginePaid:true,troopQRatio:1.6});for(const b of alliesOf(s,s.armies[id]))rally(b);s.armies[id].c34??={};s.armies[id].c34.noRecoveryUntil=Number.MAX_SAFE_INTEGER;}
 else if(rule==='P417_G88_R'){s=shot(s,id,target);state(s.armies[id]).yanGuardTurn=s.turn;}
 return s;
}
function batchMoraleBlocked(s,id){return mechanicsV2Enabled(s)&&live(s).some(b=>owns(s,b,'G53')&&b.factionId===s.armies[id]?.factionId&&b.armyId!==id&&dist(s,b,s.armies[id])===1);}
function batchRule(s,id,rule){
 if(c450Rule(s,id,rule))return true;
 const a=s.armies[id];if(!a||!mechanicsV2Enabled(s))return false;
 if(rule==='NEVER_ROUT')return owns(s,a,'G88')&&inCity(s,a);
 if(rule==='NO_CAPTURE')return owns(s,a,'G88');
 if(rule==='NO_COUNTER_TAKEN')return owns(s,a,'G52')&&(a.mechV2?.ripostes??0)>0;
 if(rule==='IGNORE_ZOC')return owns(s,a,'G02')&&!!a.mechV2?.rescueGoal;
 if(rule==='NO_PURSUIT')return a.c27?.cantoTurn===s.turn&&(owns(s,a,'G14')||a.mechV2?.whiteHorseTurn===s.turn);
 return false;
}

// Called at payment for every E/R, after validation and before its effects.
function pilotPay(s,id,card){
 c467Pay(s,id,card);
 c466Pay(s,id,card);
 c461Pay(s,id,card);
 if(!mechanicsV2Enabled(s))return;const a=s.armies[id],x=state(a);
 if(owns(s,a,'G10')){const n=Math.min(x.awe??3,Math.floor((card.baseGaugeCost??card.gaugeCost)/20));if(card.signature)x.aweRelease=x.awe??3;spendAwe(s,id,n);}
 if(owns(s,a,'G59')&&!card.signature){x.planTurn=s.turn;delete x.bladeTurn;syncCosts(s,id);}
}
function pilotRemember(s,id,card){
 if(!mechanicsV2Enabled(s)||card.signature)return;const a=s.armies[id];
 for(const cao of live(s).filter(b=>owns(s,b,'G07')&&diplomacyArmyHostile(s,b.armyId,id)&&s.knowledge[b.factionId]?.tiles[a.tileId]==='VISIBLE'&&!ambushHidden(s,id,b.factionId))){
  const r=record(s,cao.armyId),key='G07.pilot.E';state(cao).memory={finishes:1,fallback:cao.mechV2?.memory?.fallback??r.equippedTacticIds.filter(k=>k!==key)};
  r.cards[key]={...structuredClone(card),traitId:key,signature:false,core:false,slot:'E',gaugeCost:card.baseGaugeCost??card.gaugeCost};r.track.growthStates.G07.ownedTraitRanks[key]=1;
  if(!r.pool.traits.some(c=>c.traitId===key))r.pool.traits.push({traitId:key,ownershipType:'PUBLIC',rarity:'MYTHIC',rankMax:5,stageTags:['EARLY','MID','LATE'],affinityTags:[],roleTags:[],experienceTags:[]});
  r.equippedTacticIds=[key];r.track.poolFingerprint=c34Fingerprint(r.pool);
 }
}
function batchAfterAttack(s,before,id,target,options={}){
 c450AfterAttack(s,before,id,target,options);
 if(!mechanicsV2Enabled(s))return;const a=s.armies[id],b=s.armies[target];if(!a||!b||!s.lastCombat)return;
 const x=state(a),y=state(b),ordinary=!options.tactic&&!options.reaction&&(!options.enginePaid||options.troopQ)&&!x.auto;
 if(!options.reaction&&s.lastCombat.enemyLoss>0)x.attackTurn=s.turn;
 if(owns(s,b,'G52')&&(!(b.movedTiles??0)||y.frontGuardUntil>=s.turn)&&s.lastCombat.side==='FRONT')y.ripostes=Math.min(y.frontGuardUntil>=s.turn?3:2,(y.ripostes??0)+(!(b.movedTiles??0)?1:0)+(y.frontGuardUntil>=s.turn?1:0));
 if(ordinary){
  x.attackTurn=s.turn;const sun=sunOrder(before,id,'ADVANCE');if(sun&&level(before,id)<level(before,sun.armyId)&&(before.armies[id].movedTiles??0)>0&&before.armies[id].effectFirstAttackTurn!==s.turn)changeFormation(s,target,1,s.lastCombat.formationChanges);
  if(owns(s,a,'G06')&&!(a.movedTiles??0)&&dist(s,a,b)===2)changeFormation(s,target,1,s.lastCombat.formationChanges);
  if(owns(s,a,'G52')&&(x.ripostes??0)>0){changeFormation(s,target,x.ripostes,s.lastCombat.formationChanges);x.ripostes=0;}
  if(owns(s,a,'G59')){if(x.planTurn===s.turn-1){changeFormation(s,target,1,s.lastCombat.formationChanges);delete x.planTurn;}x.bladeTurn=s.turn;}
  if(owns(s,a,'G14')||x.whiteHorseTurn===s.turn){a.c27??={};a.c27.cantoTurn=s.turn;a.c27.cantoRemaining=25;a.c27.cantoTicks=25;s.movedArmyIds=s.movedArmyIds.filter(k=>k!==id);s.endedArmyIds=s.endedArmyIds.filter(k=>k!==id);if(x.whiteHorseTurn===s.turn){b.c50??={};b.c50.rootNext=true;}}
  delete x.nextDamage;delete x.nextFlank;
 }
}
function batchStart(s,fid){
 c507Start(s,fid);c505Start(s,fid);
 c491Start(s,fid);
 c487Start(s,fid);
 c467Start(s,fid);
 c450Start(s,fid);
 for(const a of live(s).filter(a=>a.factionId===fid)){
  if(C491_IDS.includes(a.commanderId)&&!enabledOfficer(s,a.commanderId))continue;
  if([...C468_IDS,...C491_IDS,...C505_IDS,...C507_IDS].includes(a.commanderId)&&s.campaignGrowth?.officers[a.commanderId]?.mechanicsV2===false)continue;
  if(!DATA.officers[a.commanderId]&&!a.mechV2)continue;
  const x=state(a);if(x.batchStart===s.turn)continue;x.batchStart=s.turn;delete x.frontGuardUntil;delete x.simaGuard;syncCosts(s,a.armyId);
  if(x.aim){const target=x.aim.targetId;delete x.aim;if(foes(s,a).some(b=>b.armyId===target&&dist(s,a,b)<=attackRange(a,s)&&dist(s,a,b)>1&&p417m6.engineShotLine(s,a.armyId,target))){Object.assign(s,shot(s,a.armyId,target));const now=s.armies[a.armyId];if(now.c50)now.c50.resource=Math.min(3,now.c50.resource+1);}}
 }
}
function batchFinish(s,fid){
 c507Finish(s,fid);c505Finish(s,fid);
 c491Finish(s,fid);
 c487Finish(s,fid);
 c467Finish(s,fid);
 c450Finish(s,fid);
 for(const a of live(s).filter(a=>a.factionId===fid)){
  if(C491_IDS.includes(a.commanderId)&&!enabledOfficer(s,a.commanderId))continue;
  if([...C468_IDS,...C491_IDS,...C505_IDS,...C507_IDS].includes(a.commanderId)&&s.campaignGrowth?.officers[a.commanderId]?.mechanicsV2===false)continue;
  if(!DATA.officers[a.commanderId]&&!a.mechV2)continue;
  const x=state(a),id=a.armyId;if(x.batchFinish===s.turn)continue;x.batchFinish=s.turn;if(x.stolenSilence){delete a.c34.noTacticUntil;delete x.stolenSilence;}
  if(owns(s,a,'G23')&&(x.attackTurn!==s.turn||x.nonAttackTurn===s.turn)){x.waits=Math.min(4,(x.waits??0)+1);gainException(s,id,10,`sima.wait.${s.turn}`);}
  if(owns(s,a,'G88')&&inCity(s,a)&&a.morale==='SHAKEN')healCampaignTroops(s,id,Math.floor(wounded(s,id)*.05),{exact:true});
  if(x.memory&&--x.memory.finishes<=0){const r=record(s,id);r.equippedTacticIds=x.memory.fallback;delete x.memory;}
 }
}
function pilotMovement(s,id,from,to,voluntary=true){
 if(!voluntary&&from!==to&&s.armies[id])s.armies[id].currentOrder=null;
 c505Movement(s,id,from,to);
 c450Moved(s,id,from,to,voluntary);
 if(!mechanicsV2Enabled(s)||from===to)return;const a=s.armies[id];if(owns(s,a,'G52'))state(a).ripostes=0;
}
function pilotPreparedOptions(s,id,target,options){
 options=c505Options(s,id,target,c450Options(s,id,target,options));
 if(!mechanicsV2Enabled(s))return options;
 const a=s.armies[id],x=a?.mechV2??{};
 const g=sunOrder(s,id,'ADVANCE'),advance=g&&!options.counter&&!options.reaction&&(a.movedTiles??0)>0&&a.effectFirstAttackTurn!==s.turn;
 return {...options,...(advance?{forceSide:'FLANK'}:{}),...(x.nextFlank?{forceSide:'FLANK'}:{}),...(owns(s,a,'G52')&&(x.ripostes??0)>0?{noCounter:true}:{}),...(pilotPierces(s,id,target)?{ignoreBrace:true,ignoreCover:true}:{} )};
}
function pilotPierces(s,id,target){const a=s.armies[id];return owns(s,a,'G06')&&!(a.movedTiles??0)&&s.armies[target]&&dist(s,a,s.armies[target])===2;}
function pilotRescueApproach(s,id,from,to){const a=s.armies[id];return owns(s,a,'G02')&&alliesOf(s,a,6).some(b=>b.armyId!==id&&foes(s,b).some(t=>dist(s,b,t)===1)&&dist(s,to,b)<dist(s,from,b));}

function sunRecipients(s,g){return alliesOf(s,g,g.c50?.resource>=3?3:2).filter(b=>b.armyId!==g.armyId).sort((a,b)=>Number(level(s,b.armyId)<level(s,g.armyId))-Number(level(s,a.armyId)<level(s,g.armyId))||dist(s,a,g)-dist(s,b,g)||a.troopCount-b.troopCount||a.armyId.localeCompare(b.armyId)).slice(0,g.c50?.resource??0);}
function sunOrder(s,id,order){const a=s.armies[id];if(!a)return null;return live(s).filter(g=>owns(s,g,'G08')&&g.morale==='STEADY'&&g.factionId===a.factionId&&((g.c50?.order??'ADVANCE')===order&&sunRecipients(s,g).some(b=>b.armyId===id)||a.c50?.lastOrders?.some(o=>o.sourceId===g.armyId&&o.order===order))).sort((g,h)=>Number(level(s,id)<level(s,h.armyId))-Number(level(s,id)<level(s,g.armyId))||g.armyId.localeCompare(h.armyId))[0]??null;}
function pilotEngineState(s){
 if(!mechanicsV2Enabled(s))return s;const suns=live(s).filter(a=>owns(s,a,'G08'));if(!suns.length)return s;
 const ids=new Set(suns.map(a=>a.armyId)),armies={...s.armies};for(const a of Object.values(s.armies)){if(ids.has(a.armyId)||a.c50?.lastOrders?.some(o=>ids.has(o.sourceId)))armies[a.armyId]={...a,c50:{...a.c50,...(ids.has(a.armyId)?{resource:0}:{}),lastOrders:a.c50?.lastOrders?.filter(o=>!ids.has(o.sourceId))??[]}};}
 return {...s,armies};
}
function pilotAfterOrder(s,before,id,action){
 c468AfterOrder(s,before,id,action);
 c461AfterOrder(s,before,id,action);
 if(!owns(s,s.armies[id],'G08')||action!=='ORDER')return s;
 const g=before.armies[id],targets=sunRecipients(before,g),order=g.c50?.order??'ADVANCE',spend=s.armies[id].c50?.lastSpend;
 // Replace only this command's native recipient rows. Existing earlier orders remain.
 for(const b of live(s)){const old=before.armies[b.armyId]?.c50?.lastOrders??[];b.c50.lastOrders=(b.c50.lastOrders??[]).filter(o=>o.sourceId!==id||old.some(p=>p.spend===o.spend));}
 for(const b of targets){s.armies[b.armyId].c50.lastOrders??=[];s.armies[b.armyId].c50.lastOrders.push({sourceId:id,order,expires:s.turn+1,spend:spend??`P437.ORDER.${s.turn}.${s.battleSequence}`});}
 return s;
}
function migratePilotEngines(s){
 // Existing per-officer adoption flag also preserves pre-C468 c467 cards.
 // This entry runs only while restoring a save, never during new-game creation.
 if(s.trialRules?.mechanics==='v2'&&s.trialRules.mechanicsBatch==='c467')for(const id of [...C468_IDS,...C491_IDS,...C505_IDS,...C507_IDS]){const r=s.campaignGrowth?.officers[id];if(r&&r.mechanicsV2!==true)r.mechanicsV2=false;}
 // The adopted class assignment is global; keep every legacy ability card verbatim.
 // Only obsolete engine state is normalized so pre-adoption saves remain loadable.
 for(const [id,from,to] of [['G02','JEONNONG','HOWI'],['G52','CHAEK','GANG'],['G53','GUKSA','JANGGUN']]){
  const r=s.campaignGrowth?.officers[id];if(r?.c50?.engineId===from){r.c50={engineId:to,path:null,merits:{},meritKeys:{}};}
  for(const a of Object.values(s.armies??{}))if(a.commanderId===id&&a.c50?.engineId===from)a.c50={engineId:to,resource:Math.min(3,a.c50.resource??0),reservations:{},relation:null};
 }
}

// One breadth-first tree per synchronous read scope. The old search used the
// same sorted neighbors for every destination; completing that tree preserves
// its first path, including the six-edge boundary and paths through armies.
function rescuePaths(s,id){
 return memoCampaignQuery(s,`c501:rescuePaths:${id}`,()=>{
  const a=s.armies[id],paths=new Map([[a.tileId,[]]]),queue=[a.tileId];
  const blocked=new Set(Object.values(s.cities).flatMap(c=>[c.tileId,...(c.footprint?.gates??[])]));
  for(let head=0;head<queue.length;head++){
   const at=queue[head],path=paths.get(at);if(path.length>=6)continue;
   for(const next of neighbors(s.tiles[at]).map(tileId).sort())if(!paths.has(next)&&s.tiles[next]&&s.knowledge[a.factionId]?.tiles[next]==='VISIBLE'&&!['mountain','water'].includes(s.tiles[next].terrainType)&&!blocked.has(next)){
    paths.set(next,[...path,next]);queue.push(next);
   }
  }
  return paths;
 });
}
function rescuePath(s,id,to){
 if(!empty(s,id,to))return null;
 return rescuePaths(s,id).get(to)?.slice()??null;
}
function pilotRescueWorld(s,id,to){const a=s.armies[id];return a&&s.tiles[to]&&pilotRescueApproach(s,id,a.tileId,to)?{...s,armies:{...s.armies,[id]:{...a,mechV2:{...a.mechV2,rescueGoal:to}}}}:s;}
function pilotSwapRoute(s,id,to){
 const a=s.armies[id];if(!owns(s,a,'G44')||a.mechV2?.swapTurn===s.turn||!p417m3.canMainAction(s,id))return null;
 const b=live(s).find(b=>b.armyId!==id&&b.factionId===a.factionId&&b.tileId===to);if(!b)return null;
 const proxy={...s,armies:{...s.armies,[b.armyId]:{...b,tileId:a.tileId}}};
 const path=campaignPath(proxy,id,to);return path&&path.totalTicks<=200?path:null;
}
function pilotYieldSwap(s,id,from,to){
 const a=s.armies[id];if(a.mechV2?.swapGoal!==to||!owns(s,a,'G44')||a.mechV2?.swapTurn===s.turn)return;
 const b=live(s).find(b=>b.armyId!==id&&b.factionId===a.factionId&&b.tileId===to);if(!b)return;
 forceArmyTo(s,b.armyId,from);state(a).swapTurn=s.turn;delete a.mechV2.swapGoal;
}

// The name catalog keeps hanja and gloss for Argon names. A v2 card keeps them when its
// name is that officer's catalog short name; a new temporary name has none yet.
const pilotNames=new Map(abilityNames.nameCatalog.map(e=>[e.nameKey,e]));
function pilotNameGloss(id,slot,name){const e=pilotNames.get(`${id}-${slot}`);return e&&e.nameShort===name?{nameHanja:e.nameHanja??null,nameGloss:e.nameGloss??null}:{nameHanja:null,nameGloss:null};}
function installPilot(s,id){
 const o=enabledOfficer(s,id)&&DATA.officers[id],r=s.campaignGrowth?.officers[id];if(!o||!r)return;
 if([...C468_IDS,...C491_IDS,...C505_IDS,...C507_IDS].includes(id)){if(r.mechanicsV2===false)return;c468Install();if(C491_IDS.includes(id))c491Install();if(C505_IDS.includes(id))c505Install(s,id);if(C507_IDS.includes(id))c507Install();}
 if(C487_IDS.includes(id))c487Install();
 for(const slot of ['TRAIT','E','R']){const rule=`P417_${id}_${slot}`;if(!campaignRuleRegistered(rule))registerCampaignRule(rule,ctx=>mechanicsV2Enabled(ctx.s)?ctx.apply?.(ctx):undefined);}
 if(r.mechanicsV2)return;
 const ranks=r.track.growthStates[id].ownedTraitRanks;
 r.cards[r.coreId]={...r.cards[r.coreId],name:o.uniqueTrait.name,nameShort:o.uniqueTrait.name,...pilotNameGloss(id,'uniqueTrait',o.uniqueTrait.name),text:o.uniqueTrait.text,effects:[{op:'RULE',rule:`P417_${id}_TRAIT`,when:'PASSIVE',target:'SELF'}]};
 if(['G53','G88'].includes(id))r.cards[r.coreId].effects.push({op:'RULE',rule:id==='G53'?'U_STRICT_LAW':'U_NO_SURRENDER',when:'PASSIVE',target:'SELF'});
 for(const [slot,entry] of [['E',o.uniqueE],['R',o.signatureR]]){
  if(!entry||id==='G07'&&slot==='E')continue;
  const key=slot==='R'?r.representativeId:`${id}.pilot.E`;
  if(!key)throw new Error('P417_MISSING_SIGNATURE');
  r.cards[key]={id:entry.rule,traitId:key,kind:'tactic',rarity:'MYTHIC',classTag:'고유',...entry,...(slot==='R'?pilotNameGloss(id,'signatureTactic',entry.name):{}),pilot:true,signature:slot==='R',cooldown:0,effects:[{op:'RULE',rule:entry.rule,when:'ON_TACTIC_USE',target:'SELF'}]};
  ranks[key]=1;
  if(!r.pool.traits.some(c=>c.traitId===key))r.pool.traits.push({traitId:key,ownershipType:'PUBLIC',rarity:'MYTHIC',rankMax:5,stageTags:['EARLY','MID','LATE'],affinityTags:[],roleTags:[],experienceTags:[]});
 }
 if(o.uniqueE&&id!=='G07')r.equippedTacticIds=[`${id}.pilot.E`];
 else {const fallback=Object.values(r.cards).find(c=>c.id===(o.commonE?.id??'CTA-09'));if(fallback){r.track.growthStates[id].ownedTraitRanks[fallback.traitId]=1;r.equippedTacticIds=[fallback.traitId];}else r.equippedTacticIds=[];}
 r.mechanicsV2=true;c505Adopt(s,id);r.track.poolFingerprint=c34Fingerprint(r.pool);
 if(id==='G10')for(const c of Object.values(r.cards).filter(c=>c.pilot)){c.baseGaugeCost=c.gaugeCost;c.gaugeCost=Math.max(0,c.baseGaugeCost-60);}
}

// Target grammar is shared by previews, AI, and committed commands. E aims at
// a straight empty landing tile; R's area centre is a visible tile.
function pilotDashPath(s,id,to,max=4){
 const a=s.armies[id],from=s.tiles[a.tileId],end=s.tiles[to];if(!from||!end||!empty(s,id,to))return null;
 const n=hexDistance(from,end);if(n<1||n>max)return null;
 const dq=(end.q-from.q)/n,dr=(end.r-from.r)/n;
 if(!neighbors({q:0,r:0}).some(d=>d.q===dq&&d.r===dr))return null;
 const path=Array.from({length:n},(_,i)=>tileId({q:from.q+dq*(i+1),r:from.r+dr*(i+1)}));
 if(path.some(at=>!s.tiles[at]||s.knowledge[a.factionId]?.tiles[at]!=='VISIBLE'||['mountain','water'].includes(s.tiles[at].terrainType)||Object.values(s.cities).some(c=>[c.tileId,...(c.footprint?.gates??[])].includes(at))||live(s).some(b=>b.tileId===at&&(!diplomacyArmyHostile(s,id,b.armyId)||ambushHidden(s,b.armyId,a.factionId)))))return null;
 return path;
}
function pilotTargets(s,id,card){
 if(!mechanicsV2Enabled(s)||!card.pilot)return null;
 const batch=batchTargets(s,id,card);if(batch!==null)return batch;
 if(card.rule==='P417_G01_E')return Object.keys(s.tiles).filter(at=>pilotDashPath(s,id,at)).sort();
 if(card.rule==='P417_G03_R')return Object.keys(s.tiles).filter(at=>s.knowledge[s.armies[id].factionId]?.tiles[at]==='VISIBLE'&&dist(s,s.armies[id],at)<=3).sort();
 if(card.rule==='P417_G05_E'&&live(s).filter(b=>b.armyId!==id&&b.factionId===s.armies[id].factionId&&dist(s,b,s.armies[id])<=2).length<2)return [];
 return [id];
}
const pilotLocked=(s,id)=>mechanicsV2Enabled(s)&&!!s.armies[id]?.mechV2?.frenzy&&!s.armies[id]?.mechV2?.auto;
const pilotNoRout=(s,id)=>c450NoRout(s,id)||mechanicsV2Enabled(s)&&!!(s.armies[id]?.mechV2?.intercept&&s.activeFactionId!==s.armies[id]?.factionId||s.armies[id]?.mechV2?.frenzy);
const pilotFloor=(s,id,loss)=>mechanicsV2Enabled(s)&&s.armies[id]?.mechV2?.frenzy?Math.min(loss,Math.max(0,s.armies[id].troopCount-1)):loss;
function pilotDamageFactor(s,id,target,side){
 if(!mechanicsV2Enabled(s))return 1;
 const a=s.armies[id],b=s.armies[target],x=a?.mechV2??{},y=b?.mechV2??{};
 const g=sunOrder(s,target,'GUARD'),guard=g?(level(s,target)<level(s,g.armyId)?30:15):0;
 const native=guard&&side==='FRONT'?p417eng.engineDamageFactor(pilotEngineState(s),id,target,side):1;
 const sunFactor=guard&&side==='FRONT'?Math.min(native,1-guard/100)/native:1;
 const factor=sunFactor*(x.nextDamage??1)*(y.simaGuard?.until>=s.turn?.8:1)*(y.frontGuardUntil>=s.turn&&side==='FRONT'?.7:1)*(y.yanGuardTurn===s.turn?.8:1);
 return c450Factor(s,id,target,side)*factor*(s.armies[id]?.mechV2?.expose?.turn===s.turn?1.4:1)*(s.armies[target]?.mechV2?.expose&&s.activeFactionId!==s.armies[target]?.factionId?1.25:1);
}
function pilotBurden(s,id,steps,changes){
 if(!mechanicsV2Enabled(s)||steps<=0||s.armies[id]?.commanderId==='G05')return false;
 const a=s.armies[id],g=live(s).find(b=>owns(s,b,'G05')&&b.factionId===a.factionId&&b.armyId!==id&&dist(s,a,b)<=2&&b.formation!=='BROKEN'&&b.morale!=='ROUTING'&&b.mechV2?.burdenTurn!==s.turn);
 if(!g)return false;
 const x=state(g);x.burdenTurn=s.turn;x.burdens=(x.burdens??0)+1;
 changeFormation(s,g.armyId,1,changes);return true;
}
function pilotIntercept(s,attacker,target,commit=false){
 target=c450Intercept(s,attacker,target);
 if(!mechanicsV2Enabled(s))return target;
 const a=s.armies[attacker],t=s.armies[target];if(!a||!t)return target;
 const g=live(s).filter(b=>owns(s,b,'G25')&&b.armyId!==target&&b.factionId===t.factionId&&b.morale!=='ROUTING'&&s.knowledge[a.factionId]?.tiles[b.tileId]==='VISIBLE').sort((a,b)=>a.armyId.localeCompare(b.armyId)).find(b=>b.mechV2?.intercept&&s.activeFactionId!==b.factionId?dist(s,b,t)<=2&&dist(s,a,b)<=attackRange(a,s)&&attackTargets(s,attacker).includes(b.armyId):b.formation!=='BROKEN'&&b.c50?.relation?.type==='LINK'&&b.c50.relation.targetId===target&&dist(s,b,t)===1&&b.mechV2?.interceptTurn!==s.turn);
 if(!g)return target;
 if(commit)state(g).interceptTurn=s.turn;
 return g.armyId;
}
// Split each original loss once, then merge; overlapping bonds cannot recurse.
function pilotShareRows(s,rows){
 if(!mechanicsV2Enabled(s))return;
 const original=rows.map(r=>({...r})),out=new Map();
 const add=(id,n)=>out.set(id,(out.get(id)??0)+n);
 for(const row of original){
  const link=live(s).find(a=>a.mechV2?.bond?.ids.includes(row.id)&&a.mechV2.bond.ids.every(id=>s.armies[id]&&castleArmyActive(s,s.armies[id])&&s.armies[id].troopCount>0&&s.armies[id].factionId===a.factionId)&&a.mechV2.bond.ids.every(id=>a.mechV2.bond.ids.every(other=>dist(s,s.armies[id],s.armies[other])<=2)));
  if(!link){add(row.id,row.loss);continue;}
  const ids=[row.id,...link.mechV2.bond.ids.filter(id=>id!==row.id).sort()],n=Math.floor(row.loss/3),extra=row.loss%3;
  ids.forEach((id,i)=>add(id,n+(i<extra?1:0)));
 }
 rows.splice(0,rows.length,...[...out].map(([id,loss])=>({id,loss})));
}
function pilotAfterAttack(s,before,id,target,options={}){
 c505AfterAttack(s,before,id,target,options);c507AfterAttack(s,before,id,target,options);
 batchAfterAttack(s,before,id,target,options);
 if(!owns(s,s.armies[id],'G01')||!before.armies[target]||s.armies[target]?.morale!=='ROUTING'||before.armies[target].morale==='ROUTING'||s.armies[id].mechV2?.refundTurn===s.turn)return;
 const a=s.armies[id],x=state(a);x.refundTurn=s.turn;
 // Use the same finite post-attack move budget as CANTO, without a new attack.
 const remaining=Math.max(0,200-(a.c27?.movementTicks??(a.movedTiles??0)*25));if(!remaining)return;
 a.c27??={};a.c27.cantoTurn=s.turn;a.c27.cantoRemaining=remaining;a.c27.cantoTicks=remaining;
 s.movedArmyIds=s.movedArmyIds.filter(k=>k!==id);s.endedArmyIds=s.endedArmyIds.filter(k=>k!==id);
}

function pilotWarning(s,id){
 if(!owns(s,s.armies[id],'G03'))return;
 const a=s.armies[id],w=a.c50?.warning;if(!w)return;
 const enemy=foes(s,a).find(b=>w.tiles.includes(b.tileId));
 if(enemy)state(a).contract={targetId:enemy.armyId,warning:structuredClone(w)};
}
// Called before payment/effects of any E or R, including common tactics.
function pilotBeforeTactic(s,id,api){
 if(!mechanicsV2Enabled(s))return;
 for(const a of live(s)){
  const c=a.mechV2?.contract;if(c?.targetId!==id||!a.c50?.warning)continue;
  delete a.mechV2.contract;delete a.c50.warning;
  const w=c.warning;
  api.warning(s,a.armyId,id,w);const t=s.armies[id];if(!castleArmyActive(s,t)||t.troopCount<=0)continue;
  if(w.action==='WARN_ROOT'){t.c50??={};t.c50.rootNext=true;}
  else if(w.action==='WARN_MORALE')changeMorale(s,id,t.morale==='STEADY'?'SHAKEN':'ROUTING','간파 예고');
 }
}
// Edge contracts run before crossing, so stop means the last legal tile. No
// penalty for staying inside or for allies. Empty-city comparison has no RNG.
function pilotBeforeMove(s,id,from,to){
 // A path step past its end arrives here with no tile: block it instead of reading rules for 'undefined'.
 if(!s.tiles[to])return false;
 if(!c450MoveAllowed(s,id,from,to))return false;
 if(!mechanicsV2Enabled(s))return true;
 const a=s.armies[id];if(!a||!s.tiles[to])return true;pilotYieldSwap(s,id,from,to);
 for(const g of live(s)){
  if(!diplomacyArmyHostile(s,id,g.armyId))continue;
  const x=g.mechV2;if(!x)continue;
  if(x.zone&&dist(s,from,x.zone.tileId)<=2&&dist(s,to,x.zone.tileId)>2){checkFormation(s,id,10);return false;}
  if(x.emptyCity&&dist(s,from,g)>1&&dist(s,to,g)===1){
   const bonus=Object.values(s.cities).some(c=>c.tileId===g.tileId)||Object.values(s.c50?.structures??{}).some(c=>c.tileId===g.tileId)?10:0;
   if(s.officers[a.commanderId].baseStats.intelligence<s.officers[g.commanderId].baseStats.intelligence+bonus){checkMorale(s,id,'공성계',10);return false;}
  }
 }
 return true;
}
function hit(s,id,target){
 if(!target||!castleArmyActive(s,s.armies[target])||s.armies[target].troopCount<=0||!c450AttackAllowed(s,id,target))return s;
 return resolveAttack(s,id,target,null,{enginePaid:true,engineOrigin:`P417:${s.turn}:${s.battleSequence+1}`});
}
function frenzyStrike(s,id){
 const a=s.armies[id],x=state(a);x.auto=true;
 // Frenzy picks the nearest enemy it may legally attack (fear · taunt · duel restrictions).
 const enemy=foes(s,a).find(b=>c450AttackAllowed(s,id,b.armyId));if(!enemy){delete x.auto;return s;}
 if(dist(s,a,enemy)>1){
  const to=neighbors(s.tiles[enemy.tileId]).map(tileId).filter(at=>empty(s,id,at)&&s.knowledge[a.factionId]?.tiles[at]==='VISIBLE'&&campaignPath(s,id,at)).sort((a,b)=>dist(s,s.armies[id],a)-dist(s,s.armies[id],b)||a.localeCompare(b))[0];
  if(to){const route=campaignPath(s,id,to);for(const at of route.pathTileIds.slice(1)){if(!s.armies[id].troopCount||!pilotBeforeMove(s,id,s.armies[id].tileId,at))break;forceArmyTo(s,id,at);s.armies[id].movedTiles=(s.armies[id].movedTiles??0)+1;}}
 }
 if(dist(s,s.armies[id],enemy)===1)for(let i=0;i<2;i++)if(s.armies[id].troopCount>0&&s.armies[enemy.armyId].troopCount>0&&dist(s,s.armies[id],s.armies[enemy.armyId])===1)s=hit(s,id,enemy.armyId);
 delete state(s.armies[id]).auto;return s;
}
function resolvePilotTactic(before,id,card,target){
 let s=cloneCampaign(before);const a=s.armies[id],x=state(a);
 const base={kind:'TACTIC_EFFECT',turn:s.turn,sequence:++s.battleSequence,attackerId:id,targetId:target,tacticName:card.name,tacticId:card.traitId,units:[],enemyLoss:0,allyLoss:0,counter:false,side:'FRONT',charge:false,formationChanges:[],moraleChanges:[],eliminatedIds:[],effectLines:[card.name]};
 s.lastCombat=base;s.combatLog??=[];s.combatLog.push(base);
 if(card.rule==='P417_G01_E'){
  const path=pilotDashPath(s,id,target);if(!path)throw new Error('P417_INVALID_DASH');
  const passed=foes(s,a).filter(b=>path.includes(b.tileId)).slice(0,2);
  for(const b of passed)checkFormation(s,b.armyId,15,base.formationChanges);
  let end=a.tileId,from=a.tileId;for(const at of path){if(!pilotBeforeMove(s,id,from,at))break;from=at;if(empty(s,id,at))end=at;}
  a.movedTiles=(a.movedTiles??0)+hexDistance(s.tiles[a.tileId],s.tiles[end]);if(end!==a.tileId)forceArmyTo(s,id,end);
  const enemy=foes(s,a).find(b=>dist(s,a,b)===1);
  if(enemy){s=hit(s,id,enemy.armyId);if(s.armies[enemy.armyId].morale==='ROUTING'&&state(s.armies[id]).dashTurn!==s.turn){
   state(s.armies[id]).dashTurn=s.turn;
   const next=foes(s,s.armies[id]).find(b=>b.armyId!==enemy.armyId&&b.morale!=='ROUTING'&&dist(s,s.armies[id],b)<=2);
   if(next){const landing=neighbors(s.tiles[next.tileId]).map(tileId).filter(at=>pilotDashPath(s,id,at,2)).sort()[0];if(landing){forceArmyTo(s,id,landing);s=hit(s,id,next.armyId);}}
  }}
 }else if(card.rule==='P417_G01_R'){x.frenzy={starts:1};s=frenzyStrike(s,id);}
 else if(card.rule==='P417_G03_E')x.emptyCity=true;
 else if(card.rule==='P417_G03_R')x.zone={tileId:target,finishes:2};
 else if(card.rule==='P417_G25_E')x.expose={turn:s.turn};
 else if(card.rule==='P417_G25_R')x.intercept=true;
 else if(card.rule==='P417_G05_E')x.bond={ids:[id,...live(s).filter(b=>b.armyId!==id&&b.factionId===a.factionId&&dist(s,a,b)<=2).sort((a,b)=>a.armyId.localeCompare(b.armyId)).slice(0,2).map(b=>b.armyId)],finishes:2};
 else if(card.rule==='P417_G05_R')for(const b of live(s).filter(b=>b.armyId!==id&&b.factionId===a.factionId&&dist(s,a,b)<=((x.burdens??0)>=3?3:2))){
  const wounded=s.personnel.lots.filter(l=>l.kind==='WOUNDED'&&l.originFormationId===b.armyId).reduce((n,l)=>n+l.count,0);
  healCampaignTroops(s,b.armyId,Math.floor(wounded*.25),{exact:true});if(b.morale==='ROUTING')changeMorale(s,b.armyId,'SHAKEN',card.name,base.moraleChanges);else if(b.morale==='SHAKEN')changeMorale(s,b.armyId,'STEADY',card.name,base.moraleChanges);
 }
 s=batchCast(s,id,card,target);
 const hits=s.combatLog.filter(l=>l.sequence>base.sequence);
 const units=new Map();for(const log of hits)for(const u of log.units??[]){const prev=units.get(u.unitId);units.set(u.unitId,{...u,preBattleCount:prev?.preBattleCount??u.preBattleCount,casualties:(prev?.casualties??0)+u.casualties});}
 Object.assign(base,{sequence:s.battleSequence,units:[...units.values()],enemyLoss:hits.reduce((n,l)=>n+(l.enemyLoss??0),0),allyLoss:hits.reduce((n,l)=>n+(l.allyLoss??0),0),pilotHits:hits.map(l=>({targetId:l.targetId,enemyLoss:l.enemyLoss,allyLoss:l.allyLoss})),formationChanges:[...base.formationChanges,...hits.flatMap(l=>l.formationChanges??[])],moraleChanges:[...base.moraleChanges,...hits.flatMap(l=>l.moraleChanges??[])]});s.lastCombat=base;
 consumeMainAction(s,id,{attack:true});updateKnowledge(s);return s;
}
function pilotStart(s,fid){
 if(!mechanicsV2Enabled(s))return;batchStart(s,fid);
 for(const a of live(s).filter(a=>a.factionId===fid)){
  const x=a.mechV2;if(!x)continue;delete x.emptyCity;delete x.intercept;delete x.expose;
  if(x.frenzy&&x.frenzy.starts>0){x.frenzy.starts--;const next=frenzyStrike(s,a.armyId);Object.assign(s,next);}
 }
}
function pilotFinish(s,fid){
 if(!mechanicsV2Enabled(s))return;batchFinish(s,fid);
 for(const a of live(s).filter(a=>a.factionId===fid)){
  const x=a.mechV2;if(!x)continue;
  if(x.zone&&--x.zone.finishes<=0)delete x.zone;
  if(x.bond&&--x.bond.finishes<=0)delete x.bond;
  if(x.frenzy&&x.frenzy.starts===0){delete x.frenzy;changeFormation(s,a.armyId,2);changeMorale(s,a.armyId,'SHAKEN','광란 종료');}
 }
}

return {pilotRescueWorld,pilotSwapRoute,migratePilotEngines,pilotEngineState,pilotAfterOrder,batchRule,pilotPay,pilotRemember,pilotMovement,pilotPreparedOptions,pilotPierces,pilotRescueApproach,mechanicsV2Enabled,PILOT_OPS,PILOT_RULES,pilotOfficer,installPilot,pilotDashPath,pilotTargets,pilotLocked,pilotNoRout,pilotFloor,pilotDamageFactor,pilotBurden,pilotIntercept,pilotShareRows,pilotAfterAttack,pilotWarning,pilotBeforeTactic,pilotBeforeMove,resolvePilotTactic,pilotStart,pilotFinish};
})();
export const {pilotRescueWorld,pilotSwapRoute,migratePilotEngines,pilotEngineState,pilotAfterOrder,batchRule,pilotPay,pilotRemember,pilotMovement,pilotPreparedOptions,pilotPierces,pilotRescueApproach,mechanicsV2Enabled,PILOT_OPS,PILOT_RULES,pilotOfficer,installPilot,pilotDashPath,pilotTargets,pilotLocked,pilotNoRout,pilotFloor,pilotDamageFactor,pilotBurden,pilotIntercept,pilotShareRows,pilotAfterAttack,pilotWarning,pilotBeforeTactic,pilotBeforeMove,resolvePilotTactic,pilotStart,pilotFinish}=p417Api;
