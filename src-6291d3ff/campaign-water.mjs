// @ts-check
// C529 — 물 칸 = 배 · 항구 강점 · 관문 · 항구 거점(정본 20 v3.10 §1.4). 설계: docs/work-integration/20261023/map-china/WATER-BOATS.md · PASSES-PORTS.md §6
// 중국 지도 새 판에서만: 배 칸(tile.boat) · 항구 칸(tile.port)은 지도 데이터에서 오고, 거점 상태(s.water)는 createCampaign 이 china 판에만 만든다. 옛 판 · v2 · v3 는 꺼짐.
// 이동 비용(배 2.5일 · 타고 내리기 · 항구 0)은 map-primitives movementTicks 한 곳. 여기는 전투 배율 · 거점(주인 · 내구 · 막기 · 함락) · 보급 · 화면 투영.
// 수치는 모두 시험값.
import rawMap from '../../docs/design-data/map-layout-china-v1.json' with {type:'json'};
import {boatTile,hexDistance} from './map-primitives.mjs';
// 외교(적대) 판정은 런타임이 넘겨준다(configureWater) — 이 모듈은 movement.mjs 가 일찍 읽어서, 외교 모듈을 직접 가져오면 모듈 순환으로 초기화 순서가 깨진다(보호 저장 불러오기).
let diplomacyHostile=(/** @type {any} */_s,/** @type {string|null} */a,/** @type {string|null} */b)=>a!==b;
/** @param {{hostile:(s:any,a:string|null,b:string|null)=>boolean}} services */
export function configureWater(services){diplomacyHostile=services.hostile;}

/** @typedef {{id:string,kind:'pass'|'port',name:string,at:number[],cityId?:string}} StrongholdSpec */
const SPECS=/** @type {StrongholdSpec[]} */(/** @type {any} */(rawMap).strongholds??[]);
const RATIO=/** @type {Record<string,number>} */(/** @type {any} */(rawMap).strongholdDurabilityRatio??{pass:1/3,port:.2});
const ZONE=new Map(rawMap.tiles.filter(/** @param {any} t */t=>t.zone).map(/** @param {any} t */t=>[t.at.join(','),t.zone]));
const CITY_TILE=new Map(rawMap.cities.map(/** @param {any} c */c=>[c.id,c.at.join(',')]));
const BY_TILE=new Map(SPECS.map(x=>[x.at.join(','),x]));
export const WATER_TUNING=Object.freeze({boatMelee:.75,boatDefense:.75,landing:.75,cityMax:100,damagePerTroop:.07,regen:.1});
const BOW=new Set(['bow','archer','horseArcher','crossbow']);

/** @param {any} s */
export const waterRulesOn=s=>s?.mapId==='china'&&s.water?.version===1;
/** @param {any} s @param {any} a */
export const armyOnBoat=(s,a)=>!!a&&boatTile(s.tiles[a.tileId]);
/** @param {any} a */
const isBow=a=>BOW.has(a.troopType)||/bow|archer/i.test(String(a.troopType));

// ── 판 시작: 거점 주인 = 가까운 성(zone)의 세력, 내구 = 성 최대 내구 × 비율 ──
/** @param {any} s */
export function initializeWater(s){
 if(s.mapId!=='china'||!SPECS.length)return;
 const cityAt=new Map(Object.values(s.cities).map(/** @param {any} c */c=>[c.tileId,c]));
 /** @type {Record<string,{owner:string|null,durability:number,max:number}>} */const strongholds={};
 for(const x of SPECS){
  const zoneCity=cityAt.get(CITY_TILE.get(ZONE.get(x.at.join(','))??'')??'');
  const max=Math.max(1,Math.round(WATER_TUNING.cityMax*(RATIO[x.kind]??.25)));
  strongholds[x.id]={owner:zoneCity?.ownerFactionId??null,durability:max,max};
 }
 s.water={version:1,strongholds};
}
/** @param {any} s */
export function validateWater(s){
 if(s.water===undefined)return;
 if(s.mapId!=='china'||s.water?.version!==1||typeof s.water.strongholds!=='object')throw new Error('INVALID_CAMPAIGN_WATER');
 for(const [id,x] of Object.entries(s.water.strongholds)){
  if(!SPECS.some(y=>y.id===id)||!(x.owner===null||Object.hasOwn(s.factions,x.owner))||!Number.isSafeInteger(x.durability)||!Number.isSafeInteger(x.max)||x.durability<0||x.durability>x.max)throw new Error('INVALID_CAMPAIGN_WATER_STRONGHOLD');
 }
}
/** 그 칸의 거점(없으면 null). @param {any} s @param {string} tileId */
export function strongholdAt(s,tileId){if(!waterRulesOn(s))return null;const x=BY_TILE.get(tileId);return x?{...x,...s.water.strongholds[x.id]}:null;}

// ── 막기: 주인 있는 적 거점(내구 > 0)은 들어갈 수 없다. 빈 거점(주인 없음)은 막지 않는다 — 들어가면 차지 ──
/** @param {any} s @param {string} factionId @param {string} tileId */
export function strongholdBlocks(s,factionId,tileId){
 const x=strongholdAt(s,tileId);
 return !!x&&x.owner!==null&&x.owner!==factionId&&x.durability>0&&diplomacyHostile(s,factionId,x.owner);
}
/** 경로 찾기용: 판을 한 번 읽어 둠(꺼져 있거나 막는 거점이 없으면 null). @param {any} s @param {string} factionId */
export function strongholdBlockFactory(s,factionId){
 if(!waterRulesOn(s))return null;
 const blocked=new Set(SPECS.filter(x=>strongholdBlocks(s,factionId,x.at.join(','))).map(x=>x.at.join(',')));
 return blocked.size?(/** @type {string} */tileId)=>blocked.has(tileId):null;
}

// ── 전투 배율(정본 §1.4): 배 위 근접 공격 ×0.75 · 배 위 방어 ×0.75 · 배에서 땅 치기 = 상륙 ×0.75(항구 칸 적이면 없음) ──
/** @param {any} s @param {string} attackerId @param {string} targetId */
export function boatAttackMul(s,attackerId,targetId){
 const a=s.armies[attackerId],t=s.armies[targetId];if(!a||!t)return 1;
 const aw=boatTile(s.tiles[a.tileId]),tw=boatTile(s.tiles[t.tileId]);if(!aw&&!tw)return 1;
 let m=1;
 if(aw&&!isBow(a))m*=WATER_TUNING.boatMelee;
 if(tw)m/=WATER_TUNING.boatDefense;
 if(aw&&!tw&&s.tiles[t.tileId]?.port!==true)m*=WATER_TUNING.landing;
 return m;
}
/** 돌격 · 돌파 · 관통 · 밀치기 금지(배 위에서 · 배를 대상으로). @param {any} s @param {string} fromTileId @param {string} toTileId */
export const boatNoCharge=(s,fromTileId,toTileId)=>boatTile(s.tiles[fromTileId])||boatTile(s.tiles[toTileId]);
/** 배에서 성 공격은 궁병만. @param {any} s @param {any} a */
export const boatCitySiegeBlocked=(s,a)=>armyOnBoat(s,a)&&!isBow(a);

// ── 보급: 물 칸도 보급길(정본 §1.4). 강 건너 보급은 항구를 쥔 쪽만 — 보급 쪽(성 · 거점)의 물 ↔ 땅 경계는 자기 항구(또는 자기 성 칸)에서만 ──
/** 자기 항구 · 자기 성 칸인가. @param {any} s @param {string} factionId @param {string} tileId */
function ownLanding(s,factionId,tileId){
 const x=strongholdAt(s,tileId);if(x?.kind==='port'&&x.owner===factionId)return true;
 return Object.values(s.cities).some(/** @param {any} c */c=>c.ownerFactionId===factionId&&(c.tileId===tileId||(c.footprint?.gates??[]).includes(tileId)));
}
/** 부대 → 보급원 쪽으로 찾을 때: 물에서 땅으로 오르는 걸음은 자기 항구 · 자기 성 칸만. @param {any} s @param {string} factionId @param {string} fromTileId @param {string} toTileId */
export const supplyLandingBlocked=(s,factionId,fromTileId,toTileId)=>waterRulesOn(s)&&boatTile(s.tiles[fromTileId])&&!boatTile(s.tiles[toTileId])&&!ownLanding(s,factionId,toTileId);
/** 성 → 성 보급길: 땅 ↔ 물 걸음은 양쪽 다 자기 항구 · 자기 성 칸만(배 칸이 아닌 물 · 산은 부르는 쪽이 막음). @param {any} s @param {string} factionId @param {string} fromTileId @param {string} toTileId */
export function citySupplyWaterStep(s,factionId,fromTileId,toTileId){
 const a=boatTile(s.tiles[fromTileId]),b=boatTile(s.tiles[toTileId]);
 if(a===b)return true;
 return ownLanding(s,factionId,a?toTileId:fromTileId);
}

// ── 거점 공격 · 함락 · 회복 ──
/** 이 부대가 칠 수 있는 거점 id(주인 있는 적 거점 · 내구 > 0 · 그 칸에 지키는 부대 없음 · 근접 1칸 · 궁병 2칸 · 배 위 근접은 불가). @param {any} s @param {string} id */
export function strongholdAttackTargets(s,id){
 const a=s.armies[id];if(!waterRulesOn(s)||!a||a.troopCount<=0)return [];
 if(boatCitySiegeBlocked(s,a))return [];
 const reach=isBow(a)?2:1;
 return SPECS.filter(x=>{
  const at=x.at.join(','),st=s.water.strongholds[x.id];
  if(!st||st.owner===null||st.owner===a.factionId||st.durability<=0||!diplomacyHostile(s,a.factionId,st.owner))return false;
  const d=hexDistance(s.tiles[a.tileId],s.tiles[at]);
  if(d<1||d>reach||s.knowledge?.[a.factionId]?.tiles?.[at]!=='VISIBLE')return false;
  return !Object.values(s.armies).some(/** @param {any} b */b=>b.troopCount>0&&b.tileId===at&&b.factionId===st.owner);
 }).map(x=>x.id).sort();
}
/** 주 행동 1회로 거점 내구를 깎는다(성 벽 피해와 같은 크기 — 병력 × 0.07, 시험값). consume 은 부르는 쪽(주 행동 소모). @param {any} s @param {string} id @param {string} targetId @param {(s:any,id:string,o:{attack:boolean})=>void} consume */
export function resolveStrongholdAttack(s,id,targetId,consume){
 if(!strongholdAttackTargets(s,id).includes(targetId))throw new Error('INVALID_STRONGHOLD_TARGET');
 const a=s.armies[id],st=s.water.strongholds[targetId],spec=SPECS.find(x=>x.id===targetId);
 const dealt=Math.min(st.durability,Math.max(1,Math.round(a.troopCount*WATER_TUNING.damagePerTroop)));
 st.durability-=dealt;consume(s,id,{attack:true});
 s.water.log=[...(s.water.log??[]).slice(-19),{turn:s.turn,armyId:id,strongholdId:targetId,name:spec?.name,dealt,left:st.durability}];
 return s;
}
/** 거점 칸에 선 부대가 차지(빈 거점 · 내구 0 인 적 거점). 차지한 뒤 내구는 0 에서 다시 참. @param {any} s */
export function observeStrongholds(s){
 if(!waterRulesOn(s))return;
 for(const x of SPECS){
  const at=x.at.join(','),st=s.water.strongholds[x.id];
  const here=Object.values(s.armies).find(/** @param {any} b */b=>b.troopCount>0&&b.tileId===at&&s.factions[b.factionId]);
  if(!here||here.factionId===st.owner)continue;
  if(st.owner!==null&&st.durability>0)continue;   // 막혀 있어야 정상 — 강제 이동 등으로 들어온 경우는 그대로
  const empty=st.owner===null;st.owner=here.factionId;st.durability=empty?st.max:0;   // 빈 거점은 싸움 없이 온전히, 무너뜨린 적 거점은 0 에서
  s.water.log=[...(s.water.log??[]).slice(-19),{turn:s.turn,armyId:here.armyId,strongholdId:x.id,name:x.name,captured:here.factionId}];
 }
}
/** 차례 시작: 주인이 쥔 거점은 둘레 1칸에 적이 없으면 최대 내구의 10% 회복. @param {any} s */
export function waterTurnStart(s){
 if(!waterRulesOn(s))return;
 for(const x of SPECS){
  const st=s.water.strongholds[x.id];if(st.owner===null||st.durability>=st.max)continue;
  const at=s.tiles[x.at.join(',')];
  if(Object.values(s.armies).some(/** @param {any} b */b=>b.troopCount>0&&b.factionId!==st.owner&&diplomacyHostile(s,b.factionId,st.owner)&&hexDistance(s.tiles[b.tileId],at)<=1))continue;
  st.durability=Math.min(st.max,st.durability+Math.max(1,Math.round(st.max*WATER_TUNING.regen)));
 }
}
// ── 공개 투영(화면 · 고도): 배에 탄 부대 · 거점 ──
/** @param {any} s */
export function waterView(s){
 if(!waterRulesOn(s))return null;
 return {version:1,
  boats:Object.values(s.armies).filter(/** @param {any} a */a=>a.troopCount>0&&armyOnBoat(s,a)).map(/** @param {any} a */a=>a.armyId).sort(),
  strongholds:SPECS.map(x=>({id:x.id,kind:x.kind,name:x.name,tileId:x.at.join(','),...(x.cityId?{cityId:x.cityId}:{}),owner:s.water.strongholds[x.id].owner,durability:s.water.strongholds[x.id].durability,max:s.water.strongholds[x.id].max}))};
}
