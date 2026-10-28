// @ts-check
// C514 — 정본 지역 아홉(R01~R09) 지역 전술 규칙. 설계: docs/work-integration/20261023/map-china/REGION-RULES.md · 전투 정본 20 v3.8(§2 시야 · §5.3 두 줄)
// 중국 지도 새 판에서만: createCampaign 이 s.regionRules 를 만든 판(스위치 trialRules.regionRules === false 면 안 만듦). 옛 판 · 저장(키 없음) · v2 · v3 는 꺼짐.
// 지역은 지도 칸 상태에 넣지 않는다 — 넣으면 china 내용 지문이 바뀌어 기존 china 저장이 깨진다. 지도 json 을 여기서 따로 읽는다.
// 규칙은 지역 세기(regionStrength) 2 이상 칸에만(가장자리 1칸은 그림만 섞임). 수치는 시험값 — 지도 json regions[].tactic.params.
import rawMap from '../../docs/design-data/map-layout-china-v1.json' with {type:'json'};
import {createRng} from './rng.mjs';
import {campaignScenarioRules} from './campaign-scenario-data.mjs';

const REGIONS=/** @type {Record<string,{name:string,tactic:{id:string,name:string,params:any}}>} */(/** @type {any} */(rawMap).regions??{});
const TILE=new Map(rawMap.tiles.filter(/** @param {any} t */t=>t.region&&!t.out).map(/** @param {any} t */t=>[t.at.join(','),{region:t.region,strength:t.regionStrength}]));
const ROAD=new Set(rawMap.roads.flatMap(/** @param {any} e */e=>e.map(/** @param {number[]} p */p=>p.join(','))));
const RIVERSIDE=new Set(/** @type {string[]} */([...rawMap.riverEdges,...rawMap.bridges]).flatMap(e=>e.split('|')));
const OASIS=new Set([...rawMap.tiles.filter(/** @param {any} t */t=>t.climateClass==='oasis').map(/** @param {any} t */t=>t.at.join(',')),
 .../** @type {any[]} */(rawMap.landmarks??[]).filter(l=>l.kind==='oasis').flatMap(l=>l.footprint.map(/** @param {number[]} p */p=>p.join(',')))]);
const P=/** @param {string} r */r=>REGIONS[r]?.tactic?.params??{};
export const REGION_RULES=Object.freeze({minStrength:2,ids:Object.fromEntries(Object.entries(REGIONS).map(([r,v])=>[r,v.tactic?.id]))});

/** @param {any} s */
export const regionRulesOn=s=>s?.mapId==='china'&&s.regionRules?.version===1;
/** 규칙이 걸리는 칸의 지역(세기 2 이상), 아니면 null. @param {any} s @param {string} tileId */
export function tileRegion(s,tileId){if(!regionRulesOn(s))return null;const t=TILE.get(tileId);return t&&t.strength>=REGION_RULES.minStrength?t.region:null;}
/** 그림 · 화면용(세기 상관없이). @param {string} tileId */
export const tileRegionAny=tileId=>TILE.get(tileId)??null;

// ── J2 지역 날씨: 판 시작에 시드로 정함(게임 진행 난수를 쓰지 않음) ──
/** @param {any} s */
function schedule(s){
 const limit=campaignScenarioRules(s).turnLimit,r=createRng(((Number(s.campaignSeed)>>>0)^0x51452514)>>>0||1),pick=(/** @type {number} */a,/** @type {number} */b)=>a+Math.floor(r.next()*(b-a+1));
 /** @type {{kind:string,region:string,startTurn:number,until:number,tileId?:string}[]} */const ev=[];
 const windows=(/** @type {string} */kind,/** @type {string} */region,/** @type {number} */n,/** @type {number} */dur,/** @type {number} */from)=>{const taken=new Set();for(let i=0;i<n;i++){let t=0;for(let k=0;k<20;k++){t=pick(from,Math.max(from,limit-dur));if(![...taken].some(x=>Math.abs(/** @type {number} */(x)-t)<=dur+1))break;}taken.add(t);ev.push({kind,region,startTurn:t,until:t+dur-1});}};
 const b=P('R01'),f=P('R04'),g=P('R07'),v=P('R09');
 windows('BLIZZARD','R01',pick(b.windows?.[0]??3,b.windows?.[1]??4),b.duration??2,3);
 windows('FLOOD','R04',pick(f.times?.[0]??1,f.times?.[1]??2),f.duration??3,8);
 windows('FOG','R07',4,2,3);
 const vents=[...TILE.entries()].filter(([,t])=>t.region==='R09'&&t.strength>=REGION_RULES.minStrength).map(([id])=>id).sort();
 const nv=pick(v.ventFires?.[0]??2,v.ventFires?.[1]??4);
 for(let i=0;i<nv&&vents.length;i++){const t=pick(4,Math.max(4,limit-1));ev.push({kind:'VENT_FIRE',region:'R09',startTurn:t,until:t,tileId:vents[Math.floor(r.next()*vents.length)]});}
 return ev.sort((x,y)=>x.startTurn-y.startTurn||x.kind.localeCompare(y.kind));
}
/** @param {any} s */
export function initializeRegionRules(s){if(s.mapId!=='china')return s;s.regionRules={version:1,events:schedule(s)};return s;}
/** @param {any} s */
export function validateRegionRules(s){
 if(s.regionRules===undefined)return;
 const ok=s.mapId==='china'&&s.regionRules?.version===1&&Array.isArray(s.regionRules.events)&&s.regionRules.events.every(/** @param {any} e */e=>['BLIZZARD','FLOOD','FOG','VENT_FIRE'].includes(e.kind)&&Number.isInteger(e.startTurn)&&Number.isInteger(e.until)&&e.until>=e.startTurn&&(e.kind!=='VENT_FIRE'||TILE.has(e.tileId)));
 if(!ok)throw new Error('INVALID_REGION_RULES');
}
/** @param {any} s @param {string} kind */
export const regionEventActive=(s,kind)=>regionRulesOn(s)&&s.regionRules.events.some(/** @param {any} e */e=>e.kind===kind&&e.startTurn<=s.turn&&s.turn<=e.until);
/** 범람 중인 칸(R04 강가 · 길 아님). @param {any} s @param {string} tileId */
export const floodedTile=(s,tileId)=>tileRegion(s,tileId)==='R04'&&RIVERSIDE.has(tileId)&&!ROAD.has(tileId)&&regionEventActive(s,'FLOOD');

// ── J3 이동: movementTicks 결과에 지역 배율(장마 날씨와 같은 자리) ──
/** @param {any} s @param {string} parentTroop @param {string} fromId @param {string} toId @param {number} ticks @param {boolean} road */
export function regionMoveTicks(s,parentTroop,fromId,toId,ticks,road){
 if(!regionRulesOn(s))return ticks;
 const r=tileRegion(s,toId);let m=1;
 if(r==='R01'&&regionEventActive(s,'BLIZZARD'))m*=P('R01').moveMul??1.5;
 if(parentTroop==='cavalry'&&(r==='R05'||r==='R06'&&!road))m*=P(r).cavalryMoveMul??1.5;
 if(floodedTile(s,toId)||floodedTile(s,fromId))m*=1.5;      // 범람 땅 = 거친 땅(정본 v3.8 §5.3) — 평지 2일 → 거친 3일과 같은 배율
 return m===1?ticks:Math.max(1,Math.ceil(ticks*m-1e-9));
}
/** 경로 찾기용: 판 상태를 한 번 읽어 두고 칸마다는 표만 찾음(꺼져 있으면 null). @param {any} s @param {string} parentTroop */
export function regionMoveFactory(s,parentTroop){
 if(!regionRulesOn(s))return null;
 const blizzard=regionEventActive(s,'BLIZZARD'),flood=regionEventActive(s,'FLOOD'),cav=parentTroop==='cavalry';
 if(!blizzard&&!flood&&!cav)return null;
 const bz=P('R01').moveMul??1.5,cm=P('R05').cavalryMoveMul??1.5,cm6=P('R06').cavalryMoveMul??1.5;
 const fl=(/** @type {string} */id)=>flood&&RIVERSIDE.has(id)&&!ROAD.has(id)&&tileRegion(s,id)==='R04';
 return (/** @type {string} */fromId,/** @type {string} */toId,/** @type {number|null} */ticks,/** @type {boolean} */road)=>{
  if(ticks===null)return null;
  const r=tileRegion(s,toId);let m=1;
  if(blizzard&&r==='R01')m*=bz;
  if(cav&&(r==='R05'||r==='R06'&&!road))m*=r==='R05'?cm:cm6;
  if(fl(toId)||fl(fromId))m*=1.5;
  return m===1?ticks:Math.max(1,Math.ceil(ticks*m-1e-9));
 };
}
// ── J4 시야: 부대가 선 칸의 지역 · 날씨로 줄어듦(최소 1) ──
/** @param {any} s @param {string} tileId */
export function regionVisionDelta(s,tileId){
 const r=tileRegion(s,tileId);
 if(r==='R01'&&regionEventActive(s,'BLIZZARD'))return P('R01').visionDelta??-2;
 if(r==='R07')return regionEventActive(s,'FOG')?(P('R07').fogVisionDelta??-2):(P('R07').visionDelta??-1);
 return 0;
}
// ── J5 보급: R02 성 밖 소모 배율, 오아시스 칸에서 가득 ──
/** @param {any} s @param {any} a */
export const regionSupplyDrainMul=(s,a)=>tileRegion(s,a.tileId)==='R02'&&!OASIS.has(a.tileId)?(P('R02').drainMul??2):1;
/** @param {any} s @param {any} a */
export const regionOasisRefill=(s,a)=>regionRulesOn(s)&&OASIS.has(a.tileId);
// ── J6 매복 · 구릉 → 길: R03 · R07 숲 · 구릉 칸은 적 부대가 2칸 안에 없으면 숨음, R03 구릉에서 아래 길 칸 공격 ×1.10 ──
/** @param {any} s @param {string} armyId @param {string} viewerFactionId @param {(a:any,b:any)=>number} dist */
export function regionHidden(s,armyId,viewerFactionId,dist){
 const a=s.armies[armyId];if(!a||a.factionId===viewerFactionId)return false;
 const r=tileRegion(s,a.tileId);if(r!=='R03'&&r!=='R07')return false;
 if(!(P(r).hideOn??['forest','hill']).includes(s.tiles[a.tileId]?.terrainType))return false;
 return !Object.values(s.armies).some(/** @param {any} b */b=>b.factionId===viewerFactionId&&b.troopCount>0&&dist(s.tiles[a.tileId],s.tiles[b.tileId])<=2);
}
/** @param {any} s @param {string} attackerTileId @param {string} defenderTileId */
export const regionDownhillMul=(s,attackerTileId,defenderTileId)=>tileRegion(s,attackerTileId)==='R03'&&s.tiles[attackerTileId]?.terrainType==='hill'&&ROAD.has(defenderTileId)&&s.tiles[defenderTileId]?.terrainType!=='hill'?1.10:1;
// ── J7 회복 · 불 · 소금 ──
/** R09 성 부상병 회복 더하기(비율). @param {any} s @param {any} city */
export const regionRecoveryPlus=(s,city)=>tileRegion(s,city.tileId)==='R09'?(P('R09').recoveryPlus??0.05):0;
/** 성 부상병 회복 한도 배율(회복 10% → 15% = ×1.5). @param {any} s @param {any} city */
export const regionRecoveryMul=(s,city)=>1+regionRecoveryPlus(s,city)/0.10;
/** 차례 시작: 이번 차례 증기 틈 칸을 지금 전투 불 장부(c182 fires)에 1차례 불로(번지지 않음). initializeCombatFire 는 부르는 쪽이 넘김(가져오기 고리 피함). @param {any} s @param {(s:any)=>void} initFire */
export function regionTurnStart(s,initFire){
 const tiles=regionVentFires(s).filter(id=>s.tiles[id]);if(!tiles.length)return;
 initFire(s);s.c182??={version:1,fires:[],burnedForest:[],log:[]};
 for(const tileId of tiles)if(!s.c182.fires.some(/** @param {any} f */f=>f.tileId===tileId))s.c182.fires.push({tileId,until:s.turn,ignitedTurn:s.turn,spreadAttempted:true});
}
/** 이번 차례 불 칸(증기 틈). @param {any} s */
export const regionVentFires=s=>regionRulesOn(s)?s.regionRules.events.filter(/** @param {any} e */e=>e.kind==='VENT_FIRE'&&e.startTurn===s.turn).map(/** @param {any} e */e=>e.tileId):[];
const SALT=new Set(/** @type {any[]} */(rawMap.regionPockets??[]).filter(p=>p.region==='R08').length?[...TILE.entries()].filter(([,t])=>t.region==='R08'&&t.strength>=3).map(([id])=>id):[]);
/** R08 핵심 칸(소금) — 영역에 두면 소금 특수 자원. @param {string} tileId */
export const saltTile=tileId=>SALT.has(tileId);
// ── 공개 투영(화면 · 고도 이식 방): 지역 날씨 예보 · 지금 걸린 것 ──
/** @param {any} s */
export function regionView(s){
 if(!regionRulesOn(s))return null;
 const ev=s.regionRules.events;
 return {version:1,active:ev.filter(/** @param {any} e */e=>e.startTurn<=s.turn&&s.turn<=e.until).map(/** @param {any} e */e=>({kind:e.kind,region:e.region,until:e.until,name:REGIONS[e.region]?.name})),
  upcoming:ev.filter(/** @param {any} e */e=>e.startTurn>s.turn&&e.startTurn-s.turn<=2&&e.kind!=='VENT_FIRE').map(/** @param {any} e */e=>({kind:e.kind,region:e.region,startTurn:e.startTurn,name:REGIONS[e.region]?.name})),
  rules:Object.fromEntries(Object.entries(REGIONS).map(([r,v])=>[r,{name:v.name,tactic:v.tactic?.name}]))};
}
