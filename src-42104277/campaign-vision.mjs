import {classHidden} from './campaign-classes.mjs';
import {c34Enabled} from './campaign-c34.mjs';
import {c29Wind} from './campaign-c29.mjs';
import {C28,c28Rule} from './campaign-career.mjs';
import {C24,SPECIAL_TROOPS,c24Enabled} from './campaign-special-troops.mjs';
import {domesticRule} from './campaign-rule-registry.mjs';
// 캠페인 시야·이동 (사용자 지시 2026-10-03, 시험값). FIRST3 동결 화면은 원본 3/3/1·기존 이동 그대로.
// 성 10칸. 병종 순서는 사용자 지시 "기병 > 보병 > 궁병": 시야 기병 6·보병 5·궁병 4, 언덕 위 +1.
// 평지 1칸 걸리는 날수: 기병 1.25(8칸/턴)·보병 2(5칸)·궁병 2.5(4칸). 기병·보병은 기존 이동 표 그대로, 궁병만 느리게.
import {C20,c20Enabled} from './campaign-policy.mjs';
import {updateKnowledge} from './knowledge.mjs';
import {hasCampaignRule,ambushHidden} from './campaign-effects.mjs';

export const CAMPAIGN_VISION = Object.freeze({
  profile: 'CAMPAIGN_V1', city: 10, field: 5, hillBonus: 1,
  byTroop: Object.freeze({cavalry: 6, militia: 5, spear: 5, engineer: 5, bow: 4, mystic: 4}),
});
const RANGED_MOVE = Object.freeze({plain: 2.5, rough: 3.5, road: 1.8, crossingExtra: 2});
export const CAMPAIGN_MOVE_BY_TROOP = Object.freeze({bow: RANGED_MOVE, mystic: RANGED_MOVE});

/** 캠페인 상태의 시야 규칙을 캠페인 값으로 맞추고 안개를 다시 계산한다(옛 저장 포함). */
export function applyCampaignVision(s) {
  const current = s.mapRules.vision ?? {};
  const same = current.profile === CAMPAIGN_VISION.profile && current.city === CAMPAIGN_VISION.city &&
    current.field === CAMPAIGN_VISION.field && current.hillBonus === CAMPAIGN_VISION.hillBonus &&
    JSON.stringify(current.byTroop) === JSON.stringify(CAMPAIGN_VISION.byTroop) &&
    JSON.stringify(s.mapRules.tuning?.byTroop) === JSON.stringify(CAMPAIGN_MOVE_BY_TROOP);
  if (same) return s;
  s.mapRules = {...s.mapRules, vision: {...current, ...structuredClone(CAMPAIGN_VISION)},
    tuning: {...s.mapRules.tuning, byTroop: structuredClone(CAMPAIGN_MOVE_BY_TROOP)}};
  updateKnowledge(s);
  return s;
}

export function updateCampaignKnowledge(s){
 const armies=Object.fromEntries(Object.entries(s.armies).map(([id,a])=>[id,c29Wind(s,id)||c28Rule(s,id,'SCOUT_EYE')||hasCampaignRule(s,id,'EAGLE_EYE')||c20Enabled(s)&&a.starVisionUntil>=s.turn?{...a,troopType:`EAGLE.${id}`} :a]));
 const byTroop={...s.mapRules.vision.byTroop};if(c24Enabled(s))for(const [type,d] of Object.entries(SPECIAL_TROOPS))byTroop[type]=(byTroop[d.parent]??s.mapRules.vision.field)+(type==='wudang'?C24.wudangVision:type==='catapult'?C24.catapultVision:0);for(const [id,a] of Object.entries(armies))if(a.troopType.startsWith('EAGLE.'))byTroop[a.troopType]=(hasCampaignRule(s,id,'EAGLE_EYE')?10-(s.tiles[a.tileId].terrainType==='hill'?(s.mapRules.vision.hillBonus??0):0):(byTroop[s.armies[id].troopType]??s.mapRules.vision.field))+(c20Enabled(s)&&a.starVisionUntil>=s.turn?C20.vision:0)+(c28Rule(s,id,'SCOUT_EYE')?C28.scoutVision:0)+(c29Wind(s,id)?1:0);
 for(const c of Object.values(s.cities)){const star=c20Enabled(s)&&c.ownerFactionId==='F03'&&c.starVisionUntil>=s.turn?C20.vision:0,spy=domesticRule(s,c,'COUNTER_SPY')?.params.vision??0;if(star||spy){const id=`STAR.CITY.${c.cityId}`;armies[id]={armyId:id,factionId:c.ownerFactionId,tileId:c.tileId,troopType:id,hp:1,troopCount:1};byTroop[id]=s.mapRules.vision.city+star+spy;}}
 if(c34Enabled(s))for(const [n,m] of (s.c34?.maps??[]).entries())if(m.until>=s.turn&&s.cities[m.cityId]){const id=`STAR.CITY.C34.${n}`;armies[id]={armyId:id,factionId:m.fid,tileId:s.cities[m.cityId].tileId,troopType:id,hp:1,troopCount:1};byTroop[id]=m.range;}
 const campaignTerminalWorld=s.campaignTerminalWorld?{...s.campaignTerminalWorld,armiesById:{...s.campaignTerminalWorld.armiesById,...Object.fromEntries(Object.keys(armies).filter(id=>id.startsWith('STAR.CITY.')).map(id=>[id,{disposition:'ACTIVE'}]))}}:undefined;
 updateKnowledge({...s,armies,...(campaignTerminalWorld?{campaignTerminalWorld}:{}),mapRules:{...s.mapRules,vision:{...s.mapRules.vision,byTroop}}});
 for(const k of Object.values(s.knowledge))for(const id of Object.keys(armies).filter(id=>id.startsWith('STAR.CITY.'))){delete k.observedArmies[id];delete k.lastSeenArmies[id];}
 for(const [f,k] of Object.entries(s.knowledge))for(const [id,a] of Object.entries(s.armies)){
   if(ambushHidden(s,id,f)||classHidden(s,id,f)){delete k.observedArmies[id];delete k.lastSeenArmies[id];}
   else {if(k.observedArmies[id])k.observedArmies[id].troopType=a.troopType;if(k.lastSeenArmies[id])k.lastSeenArmies[id].troopType=a.troopType;}
 }
 return s;
}
