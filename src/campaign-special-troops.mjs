import {troopText,troopDelta} from './troop-display.mjs';
// C24 trial values; campaign v2/v3 only. Parent rules remain in FIRST3 adapters.
import {hexDistance} from './map-primitives.mjs';
export const C24=Object.freeze({chargeDamage:1.1,chargeWeight:15,hubaoProduction:4,hubaoReserve:100,qingzhouCount:1.5,shakenThreshold:.75,aura:.85,baiyiAttack:.9,wudangCount:200,wudangVision:1,jiefanReceived:1.1,danyangTerrain:1.1,danyangMove:-1,catapultAttack:.5,catapultMove:-2,catapultVision:-1,catapultSiege:2.5,aiPeriod:3,catapultCityRange:3});
const def=(name,parent,factionId,effectLine,costLine,extra={})=>Object.freeze({name,parent,factionId,effectLine,costLine,siegeMultiplier:1,...extra});
export const SPECIAL_TROOPS=Object.freeze({
 hubao:def('호표기','cavalry','F01','돌격 피해 +10% · 전열 판정 1회 추가',`추가 예비병 ${troopDelta(100)}`),
 qingzhou:def('청주병','spear','F01','출진 병력 1.5배','예비병 1.5배 · 동요 손실 문턱 0.75배'),
 baiyi:def('백이병','militia','F02','인접 아군 받는 피해 −15% (중첩 없음)','자기 공격 피해 −10%'),
 wudang:def('무당비군','bow','F02','숲·언덕 이동 비용 = 평지 · 시야 +1',`최소 병력 ${troopText(500)} · 예비병 ${troopText(500)}`),
 jiefan:def('해번군','spear','F03','통과 가능한 사이 칸을 넘어 2칸 공격 · 반격 없음','근접 공격으로 받는 피해 +10%'),
 danyang:def('단양병','militia','F03','방어 태세 무시 · 숲·언덕에서 공격·반격 피해 +10%','이동 −1칸'),
 catapult:def('투석기','bow',null,'성 내구 피해 ×2.5 · 사거리 2','부대 피해 −50% · 이동 −2칸 · 시야 −1',{siegeMultiplier:C24.catapultSiege}),
});
export const c24Enabled=s=>['v2','v3'].includes(s.mapId);
export const parentTroop=type=>SPECIAL_TROOPS[type]?.parent??type;
export const specialTroop=(s,type)=>c24Enabled(s)?SPECIAL_TROOPS[type]:undefined;
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
 let factor=a.troopType==='baiyi'?C24.baiyiAttack:a.troopType==='catapult'?C24.catapultAttack:1;
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
 }
 if(s.c24Stats){if(!Number.isSafeInteger(s.c24Stats.catapultCityDamage)||s.c24Stats.catapultCityDamage<0||Object.values(s.c24Stats.musters).some(n=>!Number.isSafeInteger(n)||n<0))throw new Error('INVALID_C24_STATS');}
 if(s.c24AiMusters&&Object.values(s.c24AiMusters).some(n=>!Number.isSafeInteger(n)||n<0))throw new Error('INVALID_C24_AI_MUSTERS');
}
