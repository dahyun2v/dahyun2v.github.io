// FIRST3 axial geometry and static edge costs. No hidden army state is read here.
const directions=[[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]];
function point(p){if(!p || !Number.isSafeInteger(p.q) || !Number.isSafeInteger(p.r))throw new TypeError('육각 좌표가 올바르지 않습니다.');}
export function tileId(p){point(p);return `${p.q},${p.r}`;}
export function hexDistance(a,b){point(a);point(b);return (Math.abs(a.q-b.q)+Math.abs(a.r-b.r)+Math.abs(a.q+a.r-b.q-b.r))/2;}
export function neighbors(p){point(p);return directions.map(([q,r])=>({q:p.q+q,r:p.r+r}));}
export function boardNeighbors(p,tiles){return neighbors(p).filter(next=>Object.hasOwn(tiles,tileId(next)));}
const movementClass={spear:'normal',cavalry:'cavalry',bow:'normal',engineer:'engineer',militia:'normal',mystic:'normal'};
const land=new Set(['plain','forest','hill']);
const terrain=new Set([...land,'mountain','water']);
// C529: 배가 다니는 물(호수 · 큰 강) — 칸 상태에 boat:true(중국 새 판만, 바다는 없음). 값은 시험값(정본 20 v3.10 §1.4)
const BOAT_DAYS=2.5,BOARD_DAYS=2;
export const boatTile=t=>t?.terrainType==='water'&&t.boat===true;

/**
 * Caller supplies a known edge (road/river/crossing/blocked); this function never
 * infers an unseen enemy or river from coordinates. Null means impassable.
 * Occupancy, ZOC, dynamic effects and arbitration belong to the timeline layer.
 */
export function movementTicks({from,to,troopType,maneuver=50,edge,tuning,tickDays=.05}){
  point(from);point(to);
  if(!Object.hasOwn(movementClass,troopType))throw new TypeError('알 수 없는 병종입니다.');
  if(!Number.isFinite(maneuver) || !Number.isFinite(tickDays) || tickDays<=0)throw new TypeError('이동 시간 입력이 올바르지 않습니다.');
  if(!terrain.has(from.terrainType) || !terrain.has(to.terrainType))throw new TypeError('알 수 없는 지형입니다.');
  if(!edge || typeof edge.road!=='boolean' || typeof edge.river!=='boolean' || typeof edge.blocked!=='boolean' || !['none','bridge','ford','wide'].includes(edge.crossing))throw new TypeError('연결 정보가 필요합니다.');
  const boatFrom=boatTile(from),boatTo=boatTile(to);
  if(hexDistance(from,to)!==1 || !(land.has(from.terrainType)||boatFrom) || !(land.has(to.terrainType)||boatTo) || edge.blocked)return null;
  if(edge.river && edge.crossing==='none')return null;
  const cls=tuning?.byTroop?.[troopType]??tuning?.[movementClass[troopType]]; // 캠페인만 병종별 표를 둔다(FIRST3 는 없음)
  const rough=['forest','hill'].some(type=>from.terrainType===type || to.terrainType===type);
  // C529 정본 20 v3.10 §1.4: 호수 · 큰 강 칸(boat) = 모든 병종 같은 배 비용 · 길 · 지형 배율 없음, 땅 ↔ 물은 여울과 같은 비용(항구 칸이면 0)
  const base=boatFrom||boatTo?BOAT_DAYS:cls?.[edge.road?'road':rough?'rough':'plain'];
  const extra=cls?.crossingExtra??BOARD_DAYS;
  const delay=boatFrom!==boatTo?(from.port===true||to.port===true?0:extra):edge.river && edge.crossing==='ford'?cls?.crossingExtra:edge.river && edge.crossing==='wide'?extra*2:0;
  if(!Number.isFinite(base) || base<=0 || !Number.isFinite(delay) || delay<0)throw new TypeError('병종 이동 시험값이 올바르지 않습니다.');
  const ability=Math.max(0,Math.min(100,maneuver));
  const range=tuning.maneuverRange;
  if(!range || !Number.isFinite(range.timeMultiplierAtMinimum) || !Number.isFinite(range.timeMultiplierAtMaximum))throw new TypeError('기동지휘 보정이 필요합니다.');
  const multiplier=range.timeMultiplierAtMinimum+(range.timeMultiplierAtMaximum-range.timeMultiplierAtMinimum)*ability/100;
  // Crossing delay is outside the maneuver multiplier (M38).
  const rawTicks=(base*multiplier+delay)/tickDays;
  return Math.max(1,Math.ceil(rawTicks-1e-9));
}

// Shared campaign slice contract; v1 retains its historical rules.
export const isSliceMap=mapId=>mapId==='v2'||mapId==='v3'||mapId==='china';
