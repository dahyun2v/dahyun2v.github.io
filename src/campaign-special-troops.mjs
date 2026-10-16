import {troopText,troopDelta} from './troop-display.mjs';
import C193 from '../data/c193-siege-v0.1.json' with {type:'json'};
export {C193};
// C24 trial values; campaign v2/v3 only. Parent rules remain in FIRST3 adapters.
import {hexDistance} from './map-primitives.mjs';
export const C24=Object.freeze({chargeDamage:1.1,chargeWeight:15,hubaoProduction:4,hubaoReserve:100,qingzhouCount:1.5,shakenThreshold:.75,aura:.85,baiyiAttack:.9,wudangCount:200,wudangVision:1,jiefanReceived:1.1,danyangTerrain:1.1,danyangMove:-1,catapultAttack:C193.catapult.unitDamageMultiplier,catapultMove:-2,catapultVision:-1,catapultSiege:C193.catapult.siegeMultiplier,aiPeriod:3,catapultCityRange:C193.catapult.range});
const def=(name,parent,factionId,effectLine,costLine,extra={})=>Object.freeze({name,parent,factionId,effectLine,costLine,siegeMultiplier:1,...extra});
export const SPECIAL_TROOPS=Object.freeze({
 hubao:def('호표기','cavalry','F01','돌격 피해 +10% · 전열 판정 1회 추가',`추가 예비병 ${troopDelta(100)}`),
 qingzhou:def('청주병','spear','F01','출진 병력 1.5배','예비병 1.5배 · 동요 손실 문턱 0.75배'),
 baiyi:def('백이병','militia','F02','인접 아군 받는 피해 −15% (중첩 없음)','자기 공격 피해 −10%'),
 wudang:def('무당비군','bow','F02','숲·언덕 이동 비용 = 평지 · 시야 +1',`최소 병력 ${troopText(500)} · 예비병 ${troopText(500)}`),
 jiefan:def('해번군','spear','F03','통과 가능한 사이 칸을 넘어 2칸 공격 · 반격 없음','근접 공격으로 받는 피해 +10%'),
 danyang:def('단양병','militia','F03','방어 태세 무시 · 숲·언덕에서 공격·반격 피해 +10%','이동 −1칸'),
 catapult:def('투석기','bow',null,`전개 후 사거리 ${C193.catapult.range} · 성 내구 피해 ×${C193.catapult.siegeMultiplier}`,'부대 피해 −50% · 전개 중 이동 불가 · 이동 −2칸 · 시야 −1',{siegeMultiplier:C193.catapult.siegeMultiplier,requiresDeployed:true}),
});
export const c24Enabled=s=>['v2','v3'].includes(s.mapId);
export const parentTroop=type=>SPECIAL_TROOPS[type]?.parent??type;
export const specialTroop=(s,type)=>c24Enabled(s)?SPECIAL_TROOPS[type]:undefined;
export const platformState=a=>a?.troopType==='catapult'?(a.platformState??'STOWED'):null;
export const platformAttackReason=(s,id)=>specialTroop(s,s.armies[id]?.troopType)?.requiresDeployed&&platformState(s.armies[id])!=='DEPLOYED'?'투석기는 전개 후 공격할 수 있습니다':null;
export function initializePlatforms(s){for(const a of Object.values(s.armies))if(a.troopType==='catapult')a.platformState??='STOWED';}
// Read the actor's public contact state; hidden enemies do not reveal themselves
// through a disabled button. The existing movement/contact system reveals them.
export function platformReason(s,id,type,hostile=b=>b.factionId!==s.armies[id]?.factionId){
 const a=s.armies[id];
 if(!a||!specialTroop(s,a.troopType)?.requiresDeployed)return '투석기만 전개·거두기 가능';
 if(a.hp<=0||a.troopCount<=0||a.morale==='ROUTING'||s.campaignTerminalWorld&&s.campaignTerminalWorld.armiesById[id]?.disposition!=='ACTIVE')return '명령할 수 없는 부대입니다';
 if(type==='STOW')return platformState(a)==='DEPLOYED'?null:'이미 거둔 상태입니다';
 if(platformState(a)==='DEPLOYED')return '이미 전개한 상태입니다';
 if(s.movedArmyIds?.includes(id)||(a.movedTiles??0)>0)return '이동한 차례에는 전개할 수 없습니다';
 const k=s.knowledge[a.factionId];
 if(Object.values(k.observedArmies).some(b=>k.tiles[b.tileId]==='VISIBLE'&&hostile(b)&&hexDistance(s.tiles[a.tileId],s.tiles[b.tileId])===1))return '적과 붙어 있어 전개할 수 없습니다';
 return null;
}
export const troopInfo=(s,type)=>({parentBaseTroopId:({militia:'BT01',spear:'BT02',bow:'BT03',cavalry:'BT04'})[parentTroop(type)]??null,troopType:type,troopDisplayName:specialTroop(s,type)?.name??({militia:'도검병',spear:'창병',bow:'궁병',cavalry:'기병'})[type]??type,parentTroopType:parentTroop(type),effectLine:specialTroop(s,type)?.effectLine??'',costLine:specialTroop(s,type)?.costLine??'',siegeMultiplier:specialTroop(s,type)?.siegeMultiplier??1});
export function specialMusterReason(s,c,type){
 const d=SPECIAL_TROOPS[type];if(!d)return null;
 if(!c24Enabled(s))return '특수 병종은 v2·v3에서만 출진 가능';
 if(d.factionId&&d.factionId!==c.ownerFactionId)return '다른 세력의 특수 병종은 출진 불가';
 if(c.kind!=='major')return '큰 성에서만 특수 병종 출진 가능';
 const facility=type==='catapult'?'workshop':'barracks';
 return c.facilities.some(f=>f.kind===facility&&!f.damaged&&!f.disabled)?null:`${facility==='workshop'?'공방':'병영'} 필요`;
}
export const lossMoraleThreshold=(s,a)=>.3*(specialTroop(s,a.troopType)&&a.troopType==='qingzhou'&&a.morale!=='SHAKEN'?C24.shakenThreshold:1);
export function c24DamageFactor(s,a,t,charge=false,{ranged=false}={}){
 if(!c24Enabled(s))return 1;
 let factor=a.troopType==='baiyi'?C24.baiyiAttack:a.troopType==='catapult'?C193.catapult.unitDamageMultiplier:1;
 if(a.troopType==='hubao'&&charge)factor*=C24.chargeDamage;
 if(a.troopType==='danyang'&&['forest','hill'].includes(s.tiles[a.tileId].terrainType))factor*=C24.danyangTerrain;
 if(!ranged&&t.troopType==='jiefan'&&hexDistance(s.tiles[a.tileId],s.tiles[t.tileId])===1)factor*=C24.jiefanReceived;
 if(Object.values(s.armies).some(b=>b.armyId!==t.armyId&&b.factionId===t.factionId&&b.troopType==='baiyi'&&b.troopCount>0&&b.hp>0&&(!s.campaignTerminalWorld||s.campaignTerminalWorld.armiesById[b.armyId]?.disposition==='ACTIVE')&&hexDistance(s.tiles[b.tileId],s.tiles[t.tileId])===1))factor*=C24.aura;
 return factor;
}
export function jiefanLine(s,a,t){
 if(!specialTroop(s,a.troopType)||a.troopType!=='jiefan'||hexDistance(s.tiles[a.tileId],s.tiles[t.tileId])!==2)return true;
 const land=new Set(['plain','forest','hill']);
 return Object.values(s.tiles).some(m=>hexDistance(s.tiles[a.tileId],m)===1&&hexDistance(m,s.tiles[t.tileId])===1&&land.has(m.terrainType)&&[a.tileId,t.tileId].every(id=>{const edge=[id,m.tileId].sort().join('|');return !s.mapRules.blockedEdges.includes(edge)&&(!s.mapRules.riverEdges.includes(edge)||s.mapRules.crossings[edge]);}));
}
export function validateSpecialTroops(s){
 for(const a of Object.values(s.armies))if(SPECIAL_TROOPS[a.troopType]){
  if(!c24Enabled(s)||!s.officers[a.commanderId].allowedTroops.includes(parentTroop(a.troopType)))throw new Error('INVALID_C24_TROOP');
  if(a.troopType==='catapult'&&!['STOWED','DEPLOYED'].includes(platformState(a)))throw new Error('INVALID_PLATFORM_STATE');
 }
 if(s.c24Stats){if(!Number.isSafeInteger(s.c24Stats.catapultCityDamage)||s.c24Stats.catapultCityDamage<0||Object.values(s.c24Stats.musters).some(n=>!Number.isSafeInteger(n)||n<0))throw new Error('INVALID_C24_STATS');}
 if(s.c24AiMusters&&Object.values(s.c24AiMusters).some(n=>!Number.isSafeInteger(n)||n<0))throw new Error('INVALID_C24_AI_MUSTERS');
}
