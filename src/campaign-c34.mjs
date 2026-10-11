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
export const c34Enabled=s=>['v2','v3'].includes(s.mapId);
const owned=(s,id,r)=>c34Enabled(s)&&uniqueOwned(s,id,r);
const relevant=(s,id)=>!!s.campaignGrowth?.officers[s.armies[id]?.commanderId??id]?.cards[s.campaignGrowth.officers[s.armies[id]?.commanderId??id]?.coreId]?.effects?.some(e=>C34_RULES.has(e.rule));
const present=s=>c34Enabled(s)&&(Object.values(s.campaignGrowth?.officers??{}).some(r=>r.cards[r.coreId]?.effects?.some(e=>C34_RULES.has(e.rule)))||Object.values(s.armies).some(a=>a.c34)||!!s.c34);
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
const cooldown=(s,id,n)=>{const a=s.armies[id],key=Object.keys(a.tacticReadyTurns??{}).sort()[0];if(key)a.tacticReadyTurns[key]+=n;};
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
export function c34HasRule(s,id,rule){const a=s.armies[id],x=a?.c34??{};if(!present(s)||!a)return false;
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
export function c34IgnoreMorale(s,id,reason){return present(s)&&(!!owned(s,id,'U_LAST_TO_LEAVE')&&lostLord(s,id)||/아군|패주/.test(reason??'')&&c34Near(s,id,1).some(b=>owned(s,b.armyId,'U_CALM_FACE')));}
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
export function c34Range(s,id,card){if(!card&&c34Enabled(s)&&s.armies[id]?.troopType==='bow'&&s.armies[id].c34?.rangeUntil>=s.turn)return 1;return c34Enabled(s)&&s.turn%2===0&&owned(s,id,'U_SWORD_AND_PLAN')&&card&&/지략|계략|혼란/.test(card.text)?1:0;}
export function c34Strategy(s,id){return !c34Enabled(s)?0:(owned(s,id,'U_BOAST')?15:0)+(s.turn%2===0&&owned(s,id,'U_SWORD_AND_PLAN')?10:0);}
export function c34Xp(s,id){const o=s.officers[id];return c34Enabled(s)&&Object.values(s.officers).some(b=>b.officerId!==id&&b.allegianceFactionId===o?.allegianceFactionId&&JSON.stringify(b.locationRef)===JSON.stringify(o.locationRef)&&owned(s,b.officerId,'U_BOAST'))?.8:1;}
export function c34Domestic(s,c,raw){if(!present(s))return [];const causes=[];const mod=(rule,key,f)=>{const r=uniqueGovernor(s,c,rule);if(!r)return;const before=raw[key];raw[key]*=f;causes.push({rule,resource:key,label:r.card.name,amount:raw[key]-before});};mod('U_PRESS_SUPPLY','food',.95);mod('U_SEED_MONEY','production',1.15);mod('U_WATERWORKS','food',1.2+(s.mapRules.riverEdges.some(e=>e.split('|').some(t=>dist(s,c.tileId,t)<=1))?.1:0));mod('U_MINT','production',1.1);mod('U_HONEST_COUNSEL','prestige',1.1);return causes;}
export function c34Cost(s,c,kind,cost){if(!present(s))return cost;let factor=1;if(kind==='recruit'&&(uniqueGovernor(s,c,'U_WELCOME_STRANGERS')||uniqueGovernor(s,c,'U_BRIBE_BROKER')))factor=.7;if(kind==='prestige'&&(uniqueGovernor(s,c,'U_STRAIGHT_WORDS')||uniqueGovernor(s,c,'U_MINT')))factor=.7;if(kind==='facility'&&uniqueGovernor(s,c,'U_SCHOLAR_BUILDER'))factor=.9;return factor===1?cost:Math.ceil(cost*factor);}
export function c34Joined(s,c,id){if(uniqueGovernor(s,c,'U_WELCOME_STRANGERS')){s.officers[id].c26??={};s.officers[id].c26.firstDraftExtra=1;s.officers[id].c26.firstDraftLevel=s.officers[id].level+1;}}
export function c34Capture(s,formerOwner){if(!c34Enabled(s)||!formerOwner)return;for(const c of Object.values(s.cities).filter(c=>c.ownerFactionId===formerOwner&&uniqueGovernor(s,c,'U_SEED_MONEY'))){c.foodStock+=30;c.productionProgress+=10;}}
export function c34Cancel(s,id,target,card){const a=s.armies[id],t=s.armies[target];if(!c34Enabled(s)||!a||!t||a.factionId===t.factionId)return false;if(/도발|거짓 소문|사기/.test(card.text)&&[t,...c34Near(s,target,1).slice(0,1)].some(b=>owned(s,b.armyId,'U_DEAF_TO_RUMOR')))return true;return false;}
export function c34AttackOptions(s,id,target,options){const a=s.armies[id],t=s.armies[target];if(!c34Enabled(s)||!a||!t)return options;const guarded=c34Near(s,target).some(b=>owned(s,b.armyId,'U_SEE_THE_TRAP'));return guarded&&(a.c27?.ambush||a.c32?.hiddenUntil>=s.turn||t.c27?.feignedFlankUntil>=s.turn)?{...options,forceSide:'FRONT',noFlank:true}:options;}
export function c34CounterFactor(s,id,target){const a=s.armies[id],t=s.armies[target];if(!c34Enabled(s))return 1;return (owned(s,target,'U_SAME_FOE')&&t.c34?.foe===id&&t.c34.foeTurn===s.turn-1?.5:1)*(a.c34?.stripUntil>=s.turn?1.35:1)*(1+(a.c34?.counterBonus??0)/100);}
// Shares only original rows. No recursive guard or shield propagation.
export function c34ShareRows(s,rows,{commit=true}={}){if(!present(s))return rows;const extra=[];for(const row of rows){const a=s.armies[row.id];if(!a||row.loss<=0)continue;const shield=a.c34?.shield;
 const guard=c34Near(s,row.id).filter(b=>owned(s,b.armyId,'U_TAKE_THE_BLOW')&&b.c34?.takeTurn!==`${s.turn}.${s.activeFactionId}`).sort((b,c)=>Number(c.commanderId===s.factions[a.factionId].rulerId)-Number(b.commanderId===s.factions[a.factionId].rulerId)||b.armyId.localeCompare(c.armyId))[0];
 const who=guard?.armyId??(shield?.until>=s.turn&&castleArmyActive(s,s.armies[shield.source])?shield.source:null);if(!who)continue;const n=Math.min(s.armies[who].troopCount,Math.round(row.loss*(guard?1:shield.share/100)));row.loss-=n;extra.push({id:who,loss:n});if(commit&&guard)state(s,who).takeTurn=`${s.turn}.${s.activeFactionId}`;
 }for(const e of extra){const row=rows.find(r=>r.id===e.id);if(row)row.loss+=e.loss;else rows.push(e);}return rows;}
export function c34VisibleTrait(s,id){return present(s)&&Object.values(s.armies).some(a=>castleArmyActive(s,a)&&owned(s,a.armyId,'U_PHOTO_MEMORY')&&a.factionId===id);}
export function c34Security(s,c,causes){if(!present(s))return causes;const out=[...causes];if(uniqueGovernor(s,c,'U_TAISHAN_BAND'))out.shift();if(uniqueGovernor(s,c,'U_MINT'))out.push('돈을 찍어 낸다');return out;}
export function c34AfterCity(s,id){if(owned(s,id,'U_FIRST_ON_WALL')){const x=state(s,id);x.wallTurn=s.turn;x.wallUntil=s.turn+1;}}
export function c34Wait(s,id,kind){if(!c34Enabled(s))return;const a=s.armies[id];if(owned(s,id,'U_SET_AND_WAIT'))state(s,id).set=!(a.movedTiles??0);if(owned(s,id,'U_PLANTED_FEET'))state(s,id).planted=kind==='WAIT_UNIT'||kind==='BRACE';if(kind==='REGROUP'){for(const b of c34Near(s,id,1)){if(owned(s,b.armyId,'U_STRICT_LAW'))changeFormation(s,id,-1);if(owned(s,id,'U_FEAST'))c34Rally(s,b.armyId);}if(owned(s,id,'U_FEAST'))uniqueBuff(s,id,id,'DEFENSE_MOD',-10);}}
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
  if((owned(s,who,'U_CHASE')||owned(s,who,'U_NIGHT_ASSAULT'))&&old===1&&now>1&&b.c34?.noChaseTurn!==s.turn&&once(s,who,'chase')){const to=neighbors(s.tiles[b.tileId]).map(t=>`${t.q},${t.r}`).filter(t=>combatEmptyStep(s,who,t)&&dist(s,t,a.tileId)<now).sort()[0];if(to){b.tileId=to;state(s,who).chaseCostTurn=s.turn+1;}}
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
 case 'U_DRIVE_DEEP':{const broken=t.formation!=='ORDERED';hit();if(broken){const to=oppositeCombatTile(s,id,target);if(combatEmptyStep(s,target,to)){const at=t.tileId;t.tileId=to;if(combatEmptyStep(s,id,at))a.tileId=at;}}x.driveStacks=Math.min(p.max,(x.driveStacks??0)+1);break;}
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
 case 'U_SMOKE_RETREAT':{const from=a.tileId,path=retreat(2);if(path.length)a.tileId=path.at(-1);s.c34??={};(s.c34.smoke??=[]).push({tileId:from,fid:a.factionId,until:s.turn+1});clean(allies(s,id));break;}
 case 'U_FOLLOW_THE_LORD':hit(target,p.ratio);lower(s,id,2);break;
 case 'U_KING_WEN':if(stat(s,id,'intelligence')+c34Strategy(s,id)>stat(s,target,'intelligence'))stop(target,2);else lower(s,id);break;
 case 'U_MARCH_TOGETHER':state(s,target).rangeUntil=s.turn+1;buff([t],'MOVE_MOD',1);break;
 case 'U_RALLY_ALL':buff([a],'DAMAGE_MOD',Math.min(p.max,allies(s,id).length*p.per));break;
 default:throw new Error(`UNKNOWN_C34_TACTIC:${r}`);
 }
 return s;
}
