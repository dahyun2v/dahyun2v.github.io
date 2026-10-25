import {engineOrderRecipients} from './campaign-engines.mjs';
import {c467Owns,c467Factor,c467CounterFactor,c467MoveAllowed,c467AfterLoss} from './campaign-c467.mjs';
import {c466Start,c466AfterAttack,c466AfterLoss,c466Moved,c466AttackAllowed} from './campaign-c466.mjs';
import {c461Start,c461Finish,c461AfterAttack,c461Factor,c461Options,c461AttackAllowed,c461MoveAllowed,c461Moved,c461AfterLoss,c461MoraleTarget,c461Cancel} from './campaign-c461.mjs';
// Batch two uses the P417 dispatcher and the existing personnel ledger.
// All continuations are bounded; reactions never create another reaction.
import {hexDistance,neighbors,tileId} from './map-primitives.mjs';
import {castleArmyActive,campaignDestinationAllowed} from './campaign-city-footprint.mjs';
import {diplomacyArmyHostile} from './campaign-diplomacy.mjs';
import {changeFormation,checkFormation,directionToward,C12} from './campaign-abilities.mjs';
import {changeMorale,checkMorale} from './campaign-morale.mjs';
import {uniqueBuff,uniqueStatus} from './campaign-rule-registry.mjs';
import {ambushHidden,healCampaignTroops} from './campaign-effects.mjs';
import {engineDamageRows,engineBaseDamage,resolveAttack,forceArmyTo,attackRange} from './campaign-combat.mjs';


export const C450_IDS=Object.freeze(['G11','G30','G33','G34','G38','G45','G47','G55','G58','G61','G63','G66','G68','G70','G73','G78','G82','G85','G95','G98']);
const enabled=s=>s?.trialRules?.mechanics==='v2'&&['c450','c461','c466','c467'].includes(s.trialRules.mechanicsBatch);
const live=s=>Object.values(s.armies).filter(a=>a.troopCount>0&&castleArmyActive(s,a));
const owns=(s,a,g)=>enabled(s)&&a?.commanderId===g&&a.troopCount>0&&castleArmyActive(s,a);
const x=a=>a.mechV2??={};
const d=(s,a,b)=>hexDistance(s.tiles[a.tileId??a],s.tiles[b.tileId??b]);
const allies=(s,a,n=2)=>live(s).filter(b=>b.factionId===a.factionId&&d(s,a,b)<=n).sort((a,b)=>a.armyId.localeCompare(b.armyId));
const enemies=(s,a,n=2)=>live(s).filter(b=>diplomacyArmyHostile(s,a.armyId,b.armyId)&&d(s,a,b)<=n&&s.knowledge[a.factionId]?.tiles[b.tileId]==='VISIBLE'&&!ambushHidden(s,b.armyId,a.factionId)).sort((a,b)=>a.armyId.localeCompare(b.armyId));
const empty=(s,id,to)=>s.tiles[to]&&!['water','mountain'].includes(s.tiles[to].terrainType)&&campaignDestinationAllowed(s,id,to)&&!live(s).some(b=>b.armyId!==id&&b.tileId===to)&&!Object.values(s.cities).some(c=>[c.tileId,...(c.footprint?.gates??[])].includes(to));
const baseStrength=(s,id)=>s.personnel.formations.find(f=>f.formationId===id)?.targetStrength??s.armies[id].deploymentStrength??s.armies[id].troopCount;
const ratio=(s,id)=>s.armies[id].troopCount/Math.max(1,baseStrength(s,id));
const wounded=(s,id)=>s.personnel.lots.filter(l=>l.kind==='WOUNDED'&&l.originFormationId===id).reduce((n,l)=>n+l.count,0);
const city=(s,a)=>Object.values(s.cities).some(c=>c.ownerFactionId===a.factionId&&[c.tileId,...(c.footprint?.gates??[])].includes(a.tileId));
const fort=(s,a)=>city(s,a)||Object.values(s.c50?.structures??{}).some(b=>b.tileId===a.tileId&&b.factionId===a.factionId&&b.type==='CAMP');
const drop=(s,id,n=1)=>{for(let i=0;i<n;i++)changeMorale(s,id,s.armies[id].morale==='STEADY'?'SHAKEN':'ROUTING','고유 효과');};
const rally=(s,id)=>changeMorale(s,id,s.armies[id].morale==='ROUTING'?'SHAKEN':'STEADY','고유 효과');
const damage=(s,id,to,k=1)=>engineDamageRows(s,id,[{targetId:to,loss:Math.max(1,Math.round(engineBaseDamage(s,id,to)*k))}],'P450_SHOT',true,{c450Scaled:true});
const strike=(s,id,to,k=1)=>resolveAttack(s,id,to,null,{enginePaid:true,troopQRatio:k,c450Tactic:true});
function away(s,id,source,n=1){for(let i=0;i<n;i++){const a=s.armies[id],b=s.armies[source];const to=neighbors(s.tiles[a.tileId]).map(tileId).filter(t=>empty(s,id,t)&&d(s,t,b)>d(s,a,b)).sort()[0];if(!to)break;forceArmyTo(s,id,to);}}

export function c450Targets(s,id,card){
 if(!enabled(s)||!C450_IDS.some(g=>card.rule?.startsWith(`P417_${g}_`)))return null;
 const a=s.armies[id],g=card.rule.split('_')[1],e=card.slot==='E';
 if(e&&g==='G30')return enemies(s,a,2).map(b=>b.armyId);
 if(e&&g==='G33')return allies(s,a).filter(b=>b.armyId!==id).map(b=>b.armyId);
 if(e&&g==='G45')return a.c50?.relation?.type==='RIVAL'&&enemies(s,a,1).some(b=>b.armyId===a.c50.relation.targetId)?[id]:[];
 if(e&&g==='G66')return allies(s,a,1).filter(b=>b.armyId!==id).map(b=>b.armyId);
 if(['G38','G47','G61','G98'].includes(g)&&!e)return enemies(s,a,g==='G47'||g==='G61'?Infinity:g==='G38'?3:2).map(b=>b.armyId);
 if(g==='G61'&&e)return enemies(s,a,3).map(b=>b.armyId);
 if(g==='G70')return allies(s,a).filter(b=>b.armyId!==id).map(b=>b.armyId);
 if(['G30','G68','G73','G82','G85'].includes(g)&&!e)return enemies(s,a,g==='G30'?2:attackRange(a,s)).filter(b=>a.troopType!=='bow'||d(s,a,b)>1).map(b=>b.armyId);
 if(['G78','G95'].includes(g))return enemies(s,a,1).sort((b,c)=>s.officers[b.commanderId].baseStats.leadership-s.officers[c.commanderId].baseStats.leadership||b.armyId.localeCompare(c.armyId)).slice(0,g==='G78'?1:undefined).map(b=>b.armyId);
 if(g==='G63')return allies(s,a).filter(b=>b.armyId!==id).length>=2?[id]:[];
 return [id];
}
export function c450Cast(s,id,card,target){
 if(!enabled(s)||!C450_IDS.some(g=>card.rule?.startsWith(`P417_${g}_`)))return s;
 const a=s.armies[id],g=card.rule.split('_')[1],z=x(a),e=card.slot==='E',t=s.armies[target];
 if(g==='G11')for(const b of enemies(s,a,e?1:2)){if(e){s=damage(s,id,b.armyId,.6);if(b.morale!=='STEADY')away(s,b.armyId,id);}else{checkMorale(s,b.armyId,card.name,20);if(b.morale!=='STEADY')x(b).fear={source:id,starts:1};}}
 if(g==='G30'){if(e){s=damage(s,id,target);x(s.armies[target]).nextAttack=.75;c450Combo(s,id,target,true);}else for(let i=0;i<3&&s.armies[target].troopCount>0;i++){s=damage(s,id,target,.5);if(i===2){changeFormation(s,target,1);checkMorale(s,target,card.name,10);x(s.armies[id]).combo={target,turn:s.turn,n:3};}}}
 if(g==='G33'){if(e){healCampaignTroops(s,target,z.rage??0,{exact:true});z.rage=0;rally(s,target);}else{z.retaliation={loss:0};}}
 if(g==='G34'){if(e)for(const b of allies(s,a))x(b).armor={n:1,source:id};else{z.fortress=2;for(const b of allies(s,a,1))x(b).armor={n:2,source:id};}}
 if(g==='G38'){t.effectStates=t.effectStates.filter(e=>!(e.value>0));if(t.c50){t.c50.reservations={};delete t.c50.warning;delete t.c50.strikeMark;}for(const key of ['armor','liGuardTurn','nextDamage','nextAttack','aim','contract','zone','bond','nextFlank','simaGuard','frontGuardUntil'])delete x(t)[key];t.c27??={};delete t.c27.ambush;delete t.c27.stakes;uniqueBuff(s,id,target,'MOVE_MOD',-2);x(a).revealedTargets={target,candidates:allies(s,a,Infinity).filter(b=>d(s,b,t)<=attackRange(t,s)).map(b=>b.armyId),until:s.turn+1};s.lastCombat.effectLines.push('사거리 안 아군: '+(x(a).revealedTargets.candidates.map(k=>s.officers[s.armies[k].commanderId].name).join(' · ')||'없음'));}
 if(g==='G45'){if(e){s=engineDamageRows(s,id,[{targetId:id,loss:Math.floor(a.troopCount*.1)}],'P450_WOUNDED',true,{permanentLossRatio:0,c450Cost:true});const foe=s.armies[a.c50?.relation?.type==='RIVAL'?a.c50.relation.targetId:null];if(foe){s=strike(s,id,foe.armyId);changeFormation(s,foe.armyId,1+(a.c50?.resource??0));s.armies[id].c50.resource=0;}}else z.coffin=true;}
 if(g==='G47')z.watch={target,n:2};
 if(g==='G55')for(const b of allies(s,a))x(b).liGuardTurn=s.turn;
 if(g==='G58')z.manGuard=true;
 if(g==='G61'){const targets=e?[t]:enemies(s,a,Infinity).sort((b,c)=>c.troopCount-b.troopCount||b.armyId.localeCompare(c.armyId)).slice(0,2);for(const b of targets){const before=b.morale;checkMorale(s,b.armyId,card.name,e?15:20);if(e&&before!==b.morale)for(const c of enemies(s,a,Infinity).filter(c=>c.armyId!==b.armyId&&d(s,b,c)<=2))checkMorale(s,c.armyId,card.name,5);if(!e){checkMorale(s,b.armyId,card.name,20);x(b).noRallyStarts=3;}}}
 if(g==='G63'){const chosen=allies(s,a).filter(b=>b.armyId!==id).slice(0,2);for(const b of chosen){changeFormation(s,b.armyId,-1);x(b).peaceStarts=3;x(b).peacePartner=chosen.find(c=>c!==b).commanderId;}}
 if(g==='G66'){if(e)z.decoy=target;else{for(const b of enemies(s,a,1).slice(0,2))s=strike(s,id,b.armyId,.7);for(const b of enemies(s,s.armies[id],2))x(b).taunted={source:id,starts:1};changeFormation(s,id,1);}}
 if(g==='G68'){s=strike(s,id,target,1.2);away(s,target,id,2);checkMorale(s,target,card.name,15);}
 if(g==='G70'){for(const b of enemies(s,a,Infinity).filter(b=>d(s,b,t)===1))checkMorale(s,b.armyId,card.name,10);x(t).freeRetreatTurn=s.turn;}
 if(g==='G73'){s=strike(s,id,target);if(s.armies[target].troopCount>0)s=strike(s,id,target,.6);uniqueStatus(s,id,target,'CONFUSED',1,{guaranteed:true});x(s.armies[id]).yanRisk=true;}
 if(g==='G78'){s=strike(s,id,target,1.3);x(s.armies[target]).exitLock={source:id,starts:1};}
 if(g==='G82'){s=strike(s,id,target);if(s.officers[t.commanderId].baseStats.might>=85)drop(s,target,2);changeFormation(s,id,1);}
 if(g==='G85'){s=strike(s,id,target);for(const b of enemies(s,s.armies[id],1))uniqueBuff(s,id,b.armyId,'MOVE_MOD',-2);}
 if(g==='G95'){z.duel={other:target,starts:2};x(t).duel={other:id,starts:2};}
 if(g==='G98'){if(s.officers[a.commanderId].baseStats.intelligence>s.officers[t.commanderId].baseStats.intelligence)x(t).hesitateStarts=2;else drop(s,id);}
 return s;
}
function c450Combo(s,id,target,force=false){
 const a=s.armies[id],z=x(a),old=z.combo;
 if(!force&&old?.turn===s.turn)return;
 const n=old?.target===target&&old.turn===s.turn-1?Math.min(3,old.n+1):1;
 z.combo={target,turn:s.turn,n};if(owns(s,a,'G30')&&n>=3){changeFormation(s,target,1);checkMorale(s,target,'신궁연발',10);}
}
export function c450AttackAllowed(s,id,target){
 if(!c466AttackAllowed(s,id,target))return false;
 if(!c461AttackAllowed(s,id,target))return false;
 if(!enabled(s))return true;const a=s.armies[id],b=s.armies[target];if(!a||!b)return true;
 const z=a.mechV2??{};if(z.fear?.active&&z.fear.source===target)return false;
 if(z.taunted?.active&&!z.maPeace&&live(s).some(c=>c.armyId===z.taunted.source)&&target!==z.taunted.source)return false;
 for(const g of live(s).filter(c=>diplomacyArmyHostile(s,id,c.armyId)&&owns(s,c,'G66')&&(c.c50?.resource??0)>=1&&d(s,a,c)===1))if(target!==g.armyId)return false;
 return true;
}
export function c450Options(s,id,target,options){
 options=c461Options(s,id,target,options);
 if(!enabled(s))return options;const a=s.armies[id],b=s.armies[target];
 const guard=live(s).some(a=>owns(s,a,'G55')&&a.factionId===b?.factionId&&d(s,a,b)<=2);
 const joint=a?.mechV2?.liGuardTurn===s.turn&&(s.c38?.hits??[]).some(h=>h.turn===s.turn&&h.target===target&&h.officerId!==a.commanderId&&live(s).some(c=>c.commanderId===h.officerId&&c.mechV2?.liGuardTurn===s.turn)&&s.relations?.[[a.commanderId,h.officerId].sort().join('|')]?.kind==='RIVAL');
 const trap=options.forceSide||options.ambush||a?.c27?.ambush||a?.c27?.hiddenFrom?.includes(b?.factionId)||b?.c27?.feignedFlankUntil>=s.turn;
 return {...options,...(joint?{forceSide:'FLANK'}:{}),...(guard&&trap?{noFlank:true,forceSide:'FRONT'}:{})};
}
export function c450Factor(s,id,target,side){
 if(!enabled(s))return 1;const a=s.armies[id],b=s.armies[target],z=a.mechV2??{},y=b.mechV2??{};let f=c461Factor(s,id,target,side)*c467Factor(s,id,target);
 if(z.liGuardTurn===s.turn)f*=1.12;if(y.liGuardTurn===s.turn)f*=.9;
 f*=z.nextAttack??1;if(y.armor?.n>0)f*=.5;if(y.stillGuard)f*=.75;
 if(owns(s,a,'G45')&&z.coffin)f*=1.3;
 if(owns(s,a,'G82')&&a.formation!=='ORDERED')f*=1.15;
 if(owns(s,a,'G85')&&b.morale==='ROUTING')f*=1.3;
 if(owns(s,a,'G73')&&a.c50?.relation?.targetId!==target){const c=z.combo;if(c?.target===target&&(c.turn===s.turn-1||c.turn===s.turn)&&c.n>=1)f*=1.2;else if(c&&c.target!==target)f*=.9;}
 if(owns(s,b,'G73')&&y.yanRisk&&side!=='FRONT')f*=1.15;
 if(owns(s,b,'G61')&&['hill','mountain'].includes(s.tiles[b.tileId].terrainType))f*=1.15;

 return f;
}
export function c450CounterFactor(s,id,target){
 if(!enabled(s))return 1;let n=s.armies[id]?.mechV2?.manGuard?1.35:1;
 const a=s.armies[target],c=a?.mechV2?.combo;if(owns(s,a,'G73')&&a.c50?.relation?.targetId!==id&&c?.target===id&&c.turn===s.turn-1)n*=.5;return n*c467CounterFactor(s,id);
}
export function c450NoRout(s,id){const a=s.armies[id];return owns(s,a,'G45')&&(a.mechV2?.coffin||ratio(s,id)>.1)||enabled(s)&&a?.mechV2?.fortress>0;}
export function c450MoraleWeight(s,id,weight){if(!enabled(s))return weight;const a=s.armies[id];return weight-(live(s).some(g=>c467Owns(s,g,'G99')&&g.factionId===a.factionId&&engineOrderRecipients(s,g.armyId).includes(id))?10:0)-(live(s).some(b=>owns(s,b,'G98')&&b.factionId===a.factionId&&s.factions[a.factionId].rulerId===a.commanderId&&d(s,a,b)<=2)?10:0);}
export function c450MoraleTarget(s,id,from,to){
 to=c461MoraleTarget(s,id,from,to);
 const ranks=['STEADY','SHAKEN','ROUTING'];if(!enabled(s)||ranks.indexOf(to)>=ranks.indexOf(from))return to;
 const a=s.armies[id];if((a.mechV2?.noRallyStarts??0)>0)return from;
 return live(s).some(b=>owns(s,b,'G11')&&b.factionId===a.factionId&&d(s,a,b)<=2)?ranks[Math.min(ranks.indexOf(from),ranks.indexOf(to)+1)]:to;
}
export function c450Peace(s,a,b){if(!enabled(s))return false;const units=live(s),one=units.find(c=>c.commanderId===a),two=units.find(c=>c.commanderId===b);return !!one&&!!two&&one.factionId===two.factionId&&(one.mechV2?.peacePartner===b&&one.mechV2.peaceStarts>0||one.mechV2?.liGuardTurn===s.turn&&two.mechV2?.liGuardTurn===s.turn);}
export function c450Start(s,fid){
 c466Start(s,fid);
 c461Start(s,fid);
 if(!enabled(s))return;
 const renew=[];
 for(const a of live(s).filter(a=>a.factionId===fid)){
  const z=x(a);if(z.start450===s.turn)continue;z.start450=s.turn;
  if(z.armor)delete z.armor;if(z.manGuard)delete z.manGuard;delete z.decoy;delete z.yanRisk;delete z.wall;
  for(const key of ['noRallyStarts','peaceStarts','hesitateStarts'])if(z[key]&&--z[key]<=0)delete z[key];
  for(const key of ['fear','taunted','exitLock','duel','openSide'])if(z[key]){if(z[key].active&&--z[key].starts<=0)delete z[key];else z[key].active=true;}
  if(z.fear?.active&&s.armies[z.fear.source])away(s,a.armyId,z.fear.source);
  if(z.retaliation){const n=z.retaliation.loss;delete z.retaliation;for(const b of enemies(s,a,1)){Object.assign(s,engineDamageRows(s,a.armyId,[{targetId:b.armyId,loss:n}],'P450_RETALIATE',true));checkFormation(s,b.armyId,10);}}
  if(z.watch)delete z.watch;
  if(z.rageUntil<s.turn){delete z.rage;delete z.rageUntil;}
  if(owns(s,a,'G34')&&fort(s,a))z.armor={n:2,source:a.armyId};
  if(z.fortress>0){z.fortress--;renew.push(a.armyId);}
  if(owns(s,a,'G70')){z.armor={n:z.station?.tile===a.tileId&&z.station?.facing===a.facing?Math.min(2,(z.station.n??0)+1):0,source:a.armyId};}
  if(owns(s,a,'G95'))z.stillGuard=z.stayed===true;
  if(owns(s,a,'G38')){const ruler=allies(s,a).find(b=>s.factions[fid].rulerId===b.commanderId);if(ruler)z.advice=ruler.armyId;else delete z.advice;}
  if(owns(s,a,'G63')){const near=allies(s,a,1).filter(b=>b.armyId!==a.armyId);if(near.length>=2){const rank={ORDERED:0,DISORDERED:1,BROKEN:2};near.sort((b,c)=>rank[c.formation]-rank[b.formation]||b.armyId.localeCompare(c.armyId));changeFormation(s,near[0].armyId,-1);checkFormation(s,a.armyId,5);}}
  for(const dong of live(s).filter(b=>owns(s,b,'G11')&&diplomacyArmyHostile(s,a.armyId,b.armyId)&&d(s,a,b)===1))checkMorale(s,a.armyId,'포학무도',5);
 }
 // Clear expired armor for every recipient before renewing any source's aura.
 for(const id of renew)for(const b of allies(s,s.armies[id],1))x(b).armor={n:2,source:id};
}
export function c450Finish(s,fid){c461Finish(s,fid);if(!enabled(s))return;for(const a of live(s).filter(a=>a.factionId===fid)){const z=x(a);z.stayed=!(a.movedTiles??0);if(owns(s,a,'G70'))z.station={tile:a.tileId,facing:a.facing,n:z.armor?.n??0};}}
export function c450AfterAttack(s,before,id,target,options){
 c466AfterAttack(s,before,id,target,options);
 c461AfterAttack(s,before,id,target,options);
 if(!enabled(s))return;const a=s.armies[id],b=s.armies[target],log=s.lastCombat;if(!a||!b||!log)return;
 if(owns(s,a,'G33'))delete x(a).rage;
 c450AfterLoss(s,id,log.units??[],target);
 if(options.reaction)return;
 delete x(a).nextAttack;
 if(!options.c450Tactic&&!options.tactic&&log.enemyLoss>0){
  if(owns(s,a,'G30')||owns(s,a,'G73')&&a.c50?.relation?.targetId!==target)c450Combo(s,id,target);
  if(owns(s,a,'G45')&&ratio(s,id)<.5)changeFormation(s,target,ratio(s,id)<.25?2:1);
  if(owns(s,a,'G47')&&['forest','mountain'].includes(before.tiles[before.armies[id].tileId].terrainType)&&ambushHidden(before,id,b.factionId)&&before.armies[target].morale!=='STEADY'&&s.officers[b.commanderId].baseStats.intelligence>s.officers[b.commanderId].baseStats.might)changeMorale(s,target,'ROUTING','매복사격');
  if(owns(s,a,'G68'))x(b).openSide={source:id,starts:1};
  if(owns(s,a,'G85')&&b.morale==='ROUTING'&&before.armies[target].morale!=='ROUTING'&&x(a).routStep!==s.turn){x(a).routStep=s.turn;changeFormation(s,id,-1);a.c27??={};a.c27.cantoTurn=s.turn;a.c27.cantoRemaining=25;a.c27.cantoTicks=25;s.movedArmyIds=s.movedArmyIds.filter(k=>k!==id);s.endedArmyIds=s.endedArmyIds.filter(k=>k!==id);}
 }
 if(b.mechV2?.manGuard){const buff=a.effectStates?.find(e=>e.value>0);if(buff)a.effectStates.splice(a.effectStates.indexOf(buff),1);}
}
export function c450AfterLoss(s,source,units,counterSource=null){
 c467AfterLoss(s,source,units);
 c466AfterLoss(s,source,units);
 c461AfterLoss(s,source,units);
 if(!enabled(s))return;
 for(const u of units){const a=s.armies[u.unitId];if(!a||!u.casualties)continue;const z=x(a);if(z.armor?.n>0)z.armor.n--;delete z.stillGuard;const other=u.unitId===source?counterSource:source;if(owns(s,a,'G33')&&other){z.rage=Math.min(engineBaseDamage(s,u.unitId,other),(z.rage??0)+Math.floor(u.casualties*.3));z.rageUntil=s.turn+1;if(z.retaliation)z.retaliation.loss+=Math.floor(u.casualties*.5);}}
}
export function c450EffectRows(s,id,rows,log){
 if(!enabled(s)||log.c450Cost)return rows;
 if(owns(s,s.armies[id],'G61')&&['TACTIC','TACTIC_EFFECT'].includes(log.kind))return rows.map(r=>{checkMorale(s,r.targetId,'공심지계',Math.min(30,Math.round(r.loss/Math.max(1,baseStrength(s,r.targetId))*100)));return {...r,loss:0};});
 if(log.c450Scaled)return rows;
 return rows.map(r=>({...r,loss:Math.round(r.loss*(s.armies[r.targetId]?.mechV2?.armor?.n>0?.5:1))}));
}
export function c450Rule(s,id,rule){
 if(!enabled(s))return false;const a=s.armies[id];
 if(rule==='EXTENDED_ZOC')return owns(s,a,'G78')&&['hill','mountain'].includes(s.tiles[a.tileId].terrainType);
 if(rule==='NO_PURSUIT'&&s.armies[id]?.mechV2?.retreatTurn===s.turn)return true;
 if(rule==='NO_PURSUIT')return a?.mechV2?.freeRetreatTurn===s.turn||owns(s,a,'G85')&&a.mechV2?.routStep===s.turn;
 return false;
}
export function c450DuelCounter(s,id,target){return enabled(s)&&s.armies[id]?.mechV2?.duel?.other===target;}
export function c450BeforeAttack(s,id){if(enabled(s)&&s.armies[id]?.mechV2?.hesitateStarts)checkMorale(s,id,'인고간언',10);}
export function c450Intercept(s,id,target){if(!enabled(s))return target;const a=s.armies[target],decoy=a?.mechV2?.decoy,b=s.armies[decoy];return owns(s,a,'G66')&&b&&castleArmyActive(s,b)&&b.troopCount>0&&d(s,s.armies[id],b)<=attackRange(s.armies[id],s)?decoy:target;}
export function c450BeforeTactic(s,id,target,card){
 if(c461Cancel(s,id,target,card))return true;
 if(!enabled(s)||card.signature||!s.armies[target]||s.armies[target].factionId===s.armies[id].factionId)return false;
 const guard=live(s).find(a=>owns(s,a,'G38')&&a.mechV2?.advice===target);if(!guard)return false;delete x(guard).advice;drop(s,guard.armyId);return true;
}
export function c450Reveal(s,id,fid){return enabled(s)&&live(s).some(a=>owns(s,a,'G55')&&a.factionId===fid&&d(s,a,s.armies[id])<=2);}
export function c450MoveAllowed(s,id,from,to){
 if(!c467MoveAllowed(s,id,to))return false;
 if(!c461MoveAllowed(s,id,from,to))return false;
 if(!enabled(s))return true;const a=s.armies[id],z=a?.mechV2??{};if(!a)return true;
 if(z.duel||z.exitLock?.active&&s.armies[z.exitLock.source]&&d(s,a,s.armies[z.exitLock.source])===1&&d(s,to,s.armies[z.exitLock.source])>1)return false;
 if(owns(s,a,'G45')&&z.coffin&&enemies(s,a,Infinity).some(b=>d(s,to,b)>d(s,from,b)))return false;
 if(z.openSide?.active&&s.armies[z.openSide.source]&&d(s,to,s.armies[z.openSide.source])<=d(s,from,s.armies[z.openSide.source]))return false;
 if(live(s).some(b=>b.mechV2?.wall&&b.mechV2.wall.tile===to&&b.mechV2.wall.until>=s.turn))return false;
 return true;
}
export function c450Moved(s,id,from,to,voluntary=true){
 c466Moved(s,id,from,to);
 c461Moved(s,id,from,to,voluntary);
 if(!enabled(s)||from===to)return;const a=s.armies[id],z=x(a);
 if(owns(s,a,'G70')){delete z.armor;delete z.station;}
 if(!voluntary)return;
 if(owns(s,a,'G58')&&z.wallTurn!==s.turn&&enemies(s,a,Infinity).some(b=>d(s,to,b)>d(s,from,b))){z.wall={tile:from,until:s.turn+1};z.wallTurn=s.turn;}
 for(const g of live(s).filter(b=>owns(s,b,'G47')&&b.mechV2?.watch?.target===id&&b.mechV2.watch.n>0)){const w=x(g).watch;w.n--;Object.assign(s,damage(s,g.armyId,id,.7));}
}
