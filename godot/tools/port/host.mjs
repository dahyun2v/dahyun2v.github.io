#!/usr/bin/env node
// @ts-check
// 고도(Godot) 이식 호스트 (Claude, 2026-10-23 — 감사 C293 권고 ③).
// 규칙은 prototype/src/campaign-runtime.mjs 를 그대로 부른다(다시 짜지 않음). 전체 state 는 이 프로세스만 갖고,
// Godot 에는 플레이어 공개 view 에서 만든 지도 모델(campaignMapModel)과 HUD 몇 줄만 보낸다.
// 규약: 표준 입력 한 줄 = 요청 JSON {id, cmd, ...}, 표준 출력 한 줄 = 응답 JSON {id, ok, ...}. 진단은 표준 오류.
// 자세한 규약: docs/work-integration/20261023/godot-port/PROTOCOL.md
import {createInterface} from './web/shims/node-readline.mjs';
import {dirname, resolve} from './web/shims/node-path.mjs';
import {fileURLToPath, pathToFileURL} from './web/shims/node-url.mjs';

// 표준 출력은 규약 전용 — 규칙 모듈이 console 로 찍는 것은 모두 표준 오류로 돌린다(모듈을 부르기 전에).
const out = process.stdout.write.bind(process.stdout);
for (const k of /** @type {const} */ (['log', 'info', 'debug', 'warn'])) console[k] = (...a) => console.error(...a);

export const PROTOCOL = 1; // 규약 판 1.2(PROTOCOL.md) — 판 번호는 깨지는 변경 때만 올린다
export const PROTOCOL_VERSION = '1.2';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const src = (p) => import(pathToFileURL(resolve(ROOT, 'prototype/src', p)).href);
const [R, MapModel, Combat, Growth, Display, Roster, Strat, Draft, Adapters, Abil, Effects] = await Promise.all([
  src('campaign-runtime.mjs'), src('campaign-map-model.mjs'), src('campaign-combat.mjs'), src('campaign-growth.mjs'), src('troop-display.mjs'), src('campaign-roster.mjs'), src('campaign-stratagems.mjs'),
  src('campaign-officer-draft.mjs'), src('campaign-adapters.mjs'), src('campaign-abilities.mjs'), src('campaign-effects.mjs'),
]);
// 이동 무르기 판정(웹 hud-ink movementUndoReason) · 경유 경로(엔진 waypointRoute) — 웹과 같은 함수
const {movementUndoReason} = await import(pathToFileURL(resolve(ROOT, 'prototype/app/world/hud-ink.mjs')).href);
const Orders = await import(pathToFileURL(resolve(ROOT, 'prototype/src/campaign-orders.mjs')).href);
// 이동 예고(웹 C186 · world.js routeRisks): 추격(previewDisengage) · 접근사격(previewApproachFire) — 웹처럼 공개 보기로 만든 세계(campaignTacticsWorld)에서 계산(숨은 적이 새지 않게)
const AiTactics = await import(pathToFileURL(resolve(ROOT, 'prototype/src/campaign-ai-tactics.mjs')).href);
// 렌즈(웹 X 위험 · 보급): 위험 = 엔진 campaignDangerTiles + 적마다 노림(world.js dangerTiles 3353) · 보급 = 웹 map-v3 publicSupplyTiles(같은 함수)
const Dipl = await import(pathToFileURL(resolve(ROOT, 'prototype/src/campaign-diplomacy.mjs')).href);
const MapV3 = await import(pathToFileURL(resolve(ROOT, 'prototype/app/world/map-v3.mjs')).href);
// 능력 · 불 지도 연출(웹 fx-ink.mjs C177 — 같은 함수): 보이는 불 칸 · 전법이 닿은 칸 · 새로 붙은 불
const FxInk = await import(pathToFileURL(resolve(ROOT, 'prototype/app/world/fx-ink.mjs')).href);
const {fireReadout, chanceText462} = await import(pathToFileURL(resolve(ROOT, 'prototype/app/world/hud-ink.mjs')).href);
const {CAMPAIGN_RETREAT_FATE_RULES} = await import(pathToFileURL(resolve(ROOT, 'prototype/src/campaign-retreat-fate-adjudicator.mjs')).href);
// 팀업 짝 자료(웹 world.js bondsData — 같은 파일): 지도 금색 끈(bondLinks)에 씀
const BONDS = await import('./web/shims/node-fs.mjs').then((fs) => JSON.parse(fs.readFileSync(resolve(ROOT, 'docs/design-data/officer-pack/bonds-v0.1.json'), 'utf8'))).catch(() => null);
/** 웹 bondLinks(world.js:2273) 그대로: 짝(anchor · partner) 장수가 둘 다 내 부대 대장이고 그 팀업이 켜져 있으면 두 부대 칸을 잇는 끈. */
function bondLinks(v) {
  if (!BONDS) return [];
  const out = [], armyOf = (id) => Object.values(v.ownArmies).find((a) => a.commanderId === id);
  for (const b of BONDS.teamUps ?? []) {
    const anchor = armyOf(b.anchor); if (!anchor) continue;
    for (const pid of b.partners ?? []) {
      const p = armyOf(pid); if (!p) continue;
      const on = [b.anchor, pid].some((id) => (v.officers[id]?.teamUps ?? []).some((t) => t.id === b.id));
      if (on && anchor.tileId !== p.tileId) out.push({from: anchor.tileId, to: p.tileId, label: b.name, armies: [anchor.armyId, p.armyId]});
    }
  }
  return out;
}
// 성장 카드 명령 목록은 글 시험판(C172)과 같은 것을 쓴다 — 버리기 · 전법 연결까지 엔진이 받는 명령만 나온다.
const {listActions} = await import(pathToFileURL(resolve(ROOT, 'prototype/app/harness/harness.mjs')).href);

// Godot 가 보낼 수 있는 플레이어 명령. ADVANCE_AI 는 호스트가 스스로 돌리고, 숨은 정보 · 자동 플레이 우회(autoPlayer)는 받지 않는다.
const PLAYER_COMMANDS = new Set(['MOVE_UNIT', 'ATTACK_UNIT', 'ATTACK_CITY', 'END_TURN', 'EVENT_CHOICE', 'DRAFT_PICK', 'DRAFT_REROLL', 'CLOSE_SUMMARY', 'SORTIE', 'STRATAGEM', 'DIPLO_GIFT', 'DIPLO_PROPOSE', 'DIPLO_RESPOND', 'DIPLO_END_ALLIANCE', 'QUEUE_MOVE', 'ADVANCE_ORDER', 'CANCEL_MOVE', 'USE_TACTIC',
  // 부대 행동(웹 #unit-menu): 방어 B · 재정비 S · 대기 H · 복귀 G · 정면 F
  'BRACE', 'REGROUP', 'WAIT_UNIT', 'GARRISON', 'FACE',
  // 친목(웹 명부 · 저택): 찾아간다 VISIT {officerId, choice}
  'VISIT',
  // 능력 Q · W(계통 엔진 · 구조물) — E · R 은 USE_TACTIC
  'USE_TROOP_Q', 'ENGINE_ACTION', 'ATTACK_STRUCTURE',
  // 성 일 · 새 내정(v3 — 엔진 applyDomesticV3Command 가 검증): 웹 city-stage domesticIntent 와 같은 명령
  'CITY_JOB', 'CITY_RESERVE_JOB', 'DV3_BUY_GRAIN', 'DV3_BUY_HORSES', 'DV3_LEARNING_PICK', 'DV3_CRISIS_RESPONSE', 'DV3_HURRY', 'DV3_SEAT', 'DV3_TAX_EXEMPT',
  'DV3_POLICY_CITY', 'DV3_POLICY_DEFAULT', 'DV3_RECRUIT_TARGET', 'DV3_BUY_TILE', 'DV3_EMERGENCY', 'DV3_CHARACTER',
  // 성 '특기'(웹 관청 특기 탭 — 엔진 domesticCommands) · 주점 술자리 · 떠돌이 등용(UI 방 성 시설 장면)
  'CITY_ALT_PAYMENT', 'CITY_REVOKE_PRIVILEGE', 'CITY_REMOTE_RECRUIT', 'FEAST', 'WANDERER_RECRUIT',
  // 판 흐름(C506 — 구디헛 · 황건 · 이민족): 무리 · 진지 공격 FLOW_ATTACK {armyId, targetId} · 구디헛 수령 · 조사 FLOW_CLAIM {armyId, siteId} · 조공 · 고용
  'FLOW_ATTACK', 'FLOW_CLAIM', 'FLOW_TRIBUTE', 'FLOW_HIRE',
  // GAP2: runtime:727,741,763-780; world.js:1402,1858,2038-2045,2524,2554-2559;
  // council-world.mjs:124-129. 인자는 웹 요청 그대로 엔진에 전달한다.
  'MARK_SITUATION_LINE', 'EXPLORE_CHOICE', 'ACHIEVEMENT_CHOICE', 'CHOOSE_AMBITION', 'CHOOSE_ORDER',
  'CHOOSE_BLESSING', 'REWIND_TURN', 'COUNCIL_APPOINT', 'COUNCIL_DECIDE', 'COUNCIL_CLOSE',
  'EQUIP_TRAITS', 'TACTIC_LOADOUT', 'MODIFIER_REBIND',
  // CLOSE_RELATION_SCENE = VISIT 뒤 관계 장면 닫기 짝 명령(world.js:660,2554,2558; runtime:741).
  'CLOSE_RELATION_SCENE',
  // runtime:799-836,899; world.js:227,2595,2935,3441-3445,3561-3564,4426.
  'CAPTIVE_ACTION', 'OCCUPATION_METHOD', 'TRANSFER_RESERVES', 'BUILD_HUB', 'SWAP_ARMIES',
  'RECALL_UNIT', 'STAR_ACTION', 'DEPLOY', 'STOW', 'REPAIR_CITY']);

// GAP2 공개 부분 선택: 모든 잎 값은 R.view 의 값 그대로. 숨은 state/규칙 함수는 읽지 않는다.
// 없는 view 필드는 null. orders 는 snapshot 의 이동 예약과 구분하여 commandOrders 로 공개한다.
const PUBLIC_PARTS = {
  // knowledge.mjs:99 (runtime:293): 플레이어 bark 후보 · 사용 기록.
  situations: (v) => publicFields(v, ['situationEvents', 'situationBarks']),
  personCrisis: (v) => v.c31 ?? null, // campaign-events.mjs:213; runtime:358
  exploration: (v) => v.exploration ?? null, // runtime:357
  dejaVu: (v) => v.dejaVu ?? null, // runtime:358
  // run-modifiers.mjs:97-100; runtime:387: 최상위 네 필드를 묶기만 한다.
  run: (v) => publicFields(v, ['blessing', 'heaven', 'weather', 'rewind']),
  ambitions: (v) => v.ambition ?? null, // campaign-ambitions.mjs:216-221; runtime:387
  commandOrders: (v) => v.orders ?? null, // 같은 ambitionsView 의 군령(이동 예약 아님)
  achievements: (v) => v.achievements ?? null, // runtime:311
  council: (v) => v.council ?? null, // runtime:368
  captives: (v) => v.captives ?? null, // runtime:381
  // runtime:330-331: 엔진이 공개한 도시의 occupation 만(안개 속 점령 state 접근 금지).
  occupations: (v) => publicEntries({...v.knowledge?.cities, ...v.ownCities}, 'occupation'),
  reserveTransfers: (v) => v.reserveTransfers ?? null, // campaign-engine-gaps.mjs:79; runtime:387
  // runtime:303: 공개 hubs 와 내 부대별 supply(보급원 포함). 남의 부대는 고르지 않는다.
  supply: (v) => v.hubs === undefined ? null : {hubs: v.hubs, armies: publicEntries(v.ownArmies, 'supply')},
  relations: (v) => v.social ?? null, // runtime:358
};
function publicFields(v, fields) {
  return fields.every((key) => v[key] === undefined) ? null : Object.fromEntries(fields.map((key) => [key, v[key] ?? null]));
}
function publicEntries(rows, field) {
  const entries = Object.entries(rows ?? {}).filter(([, row]) => row[field] !== undefined).map(([id, row]) => [id, row[field]]);
  return entries.length ? Object.fromEntries(entries) : null;
}
const AI_STEP_LIMIT = 500;
// 시험용 견본 판 — 규약 처리(handle)가 동기라 뒤에서 미리 읽어 둔다(없거나 실패해도 보통 판에는 영향 없음).
const FIXTURES = {};
import(pathToFileURL(resolve(ROOT, 'port/godot/ui/host/stratagem-model.mjs')).href).then((m) => { FIXTURES.stratagem = () => m.stratagemScene().state; }).catch(() => {});
import(pathToFileURL(resolve(ROOT, 'port/godot/ui/host/ending-model.mjs')).href).then((m) => { FIXTURES.ending = () => m.endingScene(1); }).catch(() => {});
// 'duel' = 검 · 방패 공방 이식 시험 판(10-25): 하북 v3 새 판(시드 3 · 유비 F02 · 두 부대) — 유비(검병) 곁 빈 칸에 조조 부대를 검병(militia)으로 두기.
// 규칙은 그대로, 시험용 판 상태만(병종 · 자리). 공방 연출을 실제 명령(고르기 → 공격 → 결과)으로 보려는 용도.
Promise.all([src('campaign-vision.mjs'), src('map-primitives.mjs')]).then(([V, Prim]) => {
  FIXTURES.duel = () => {
    const ps = new PortSession(); ps.newGame({seed: 3, factionId: 'F02', field: true});
    const s = ps.state, mine = s.armies['U-F02-G05'], foe = s.armies['U-F01-G24'];   // 장료 — 허용 병종에 검병(militia)이 있음
    // 성(성벽 임시 모형)에서 3칸 이상 떨어진 빈 들 두 칸에 나란히 — 공방이 성벽에 가리지 않게
    const dist = (a, b) => { const [q1, r1] = a.split(',').map(Number), [q2, r2] = b.split(',').map(Number); return (Math.abs(q1 - q2) + Math.abs(r1 - r2) + Math.abs(q1 + r1 - q2 - r2)) / 2; };
    const cityTiles = Object.values(s.cities).map((c) => c.tileId);
    const open = (t) => s.tiles[t] && s.tiles[t].terrainType === 'plain' && !Object.values(s.armies).some((x) => x.tileId === t) && cityTiles.every((c) => dist(c, t) >= 3);
    const near = Object.keys(s.tiles).filter(open).sort((x, y) => dist(x, mine.tileId) - dist(y, mine.tileId));
    let home = null, spot = null;
    for (const t of near) {
      const [q, r] = t.split(',').map(Number);
      const nb = Prim.neighbors({q, r}).map((n) => `${n.q},${n.r}`).find((n) => n !== t && open(n));
      if (nb) { home = t; spot = nb; break; }
    }
    if (!spot) throw new PortError('BAD_REQUEST', 'duel: 둘 자리 없음');
    mine.tileId = home;
    foe.tileId = spot; foe.troopType = mine.troopType;   // 장료는 원래 검병도 쓸 수 있음(allowedTroops)
    V.updateCampaignKnowledge(s);
    return R.deserialize(R.serialize(s));
  };
  // 'fire' = 'duel' 판에서 적 부대 칸과 그 곁 한 칸에 불(엔진 c27 화공 불 기록 — 화계 전법이 남기는 것과 같은 모양)을 붙인 판. 불 · 그을음 지도 연출 시험용.
  FIXTURES.fire = () => {
    const s = FIXTURES.duel(), foe = s.armies['U-F01-G24'], [q, r] = foe.tileId.split(',').map(Number);
    const nb = Prim.neighbors({q, r}).map((n) => `${n.q},${n.r}`).find((t) => s.tiles[t] && !Object.values(s.armies).some((x) => x.tileId === t));
    s.c27 ??= {counts: {}}; s.c27.fires ??= [];
    s.c27.fires.push({tiles: [foe.tileId, ...(nb ? [nb] : [])], until: s.turn + 2});
    V.updateCampaignKnowledge(s);
    return R.deserialize(R.serialize(s));
  };
}).catch(() => {});
// 'china-contact' = 중국 전역 새 판(시드 3)에서 가장 가까운 적 부대 하나를 내 첫 부대 곁 빈 칸으로 옮긴 판(규칙은 그대로 — 자리만). 중국 판 공격 · 예고 · 결과 시험용.
Promise.all([src('campaign-vision.mjs'), src('map-primitives.mjs')]).then(([V, Prim]) => {
  FIXTURES['china-contact'] = () => {
    const ps = new PortSession(); ps.newGame({seed: 3, map: 'china', field: true});
    const s = ps.state, f = s.playerFactionId, mine = Object.values(s.armies).find((a) => a.factionId === f);
    const foes = Object.values(s.armies).filter((a) => a.factionId !== f && a.factionId);
    const [q, r] = mine.tileId.split(',').map(Number);
    const dist = (t) => { const [a, b] = t.split(',').map(Number); return (Math.abs(a - q) + Math.abs(b - r) + Math.abs(a + b - q - r)) / 2; };
    foes.sort((a, b) => dist(a.tileId) - dist(b.tileId));
    const foe = foes[0];
    const spot = Prim.neighbors({q, r}).map((t) => `${t.q},${t.r}`).find((t) => s.tiles[t] && ['plain', 'hill', 'forest'].includes(s.tiles[t].terrainType) && !Object.values(s.armies).some((x) => x.tileId === t) && !Object.values(s.cities).some((c) => c.tileId === t));
    if (!foe || !spot) throw new PortError('BAD_REQUEST', 'china-contact: 둘 자리 없음');
    foe.tileId = spot;
    V.updateCampaignKnowledge(s);
    return R.deserialize(R.serialize(s));   // 새 객체로(엔진 view 가 같은 상태 객체의 앞 결과를 기억해 둠 — 자리 바꾼 뒤 그대로 넘기면 옛 시야)
  };
}).catch(() => {});
// 엔진 오류 코드 → 화면 문장(모르는 코드는 원문 그대로).
const MESSAGES = {
  EVENT_PENDING: '사건을 먼저 정하세요.',
  DRAFT_FIXED: '다시 뽑기 전에 고른 장수는 바꿀 수 없습니다.',
  DRAFT_NOT_LOCKED: '고르지 않은 장수입니다.',
  UNDO_UNAVAILABLE: '무를 수 없습니다',
  DRAFT_SELECTION_REQUIRED: '성장 카드를 먼저 고르세요.',
  INVALID_CAMPAIGN_PHASE_OR_COMMAND: '지금은 할 수 없는 명령입니다.',
  STALE_REVISION: '화면이 오래된 상태입니다. 다시 받아 오세요.',
  NO_CAMPAIGN: '진행 중인 판이 없습니다.',
  NOT_OWN_ARMY: '내 부대가 아닙니다.',
  NOT_OWN_CITY: '내 성이 아닙니다.',
  NO_DRAFT: '드래프트를 먼저 여세요.', DRAFT_BUDGET: '그릇이 모자라 이 사람은 깨울 수 없습니다.', DRAFT_TOO_FEW: '두 사람부터 시작합니다(성 · 군대).', DRAFT_NO_REROLL: '다시 찾을 수 없습니다.',
  // 계략 막힘(웹 hud-ink stratagemReasonText 와 같은 글)
  STRATAGEM_OFFICER: '성에 있는 자유 장수만 가능', STRATAGEM_COMMANDING: '부대 지휘 중', STRATAGEM_ACTION_USED: '이번 차례 주 행동 사용', STRATAGEM_COOLDOWN: '재사용 대기 중',
  STRATAGEM_TARGET: '적 대상 종류를 확인하세요', STRATAGEM_NOT_VISIBLE: '지금 보이지 않는 대상', STRATAGEM_RANGE: '범위 밖',
  UNSUPPORTED_COMMAND: '이 조각에서 받지 않는 명령입니다.',
  BAD_REQUEST: '요청 형식이 틀렸습니다.',
  MAP_UNSUPPORTED: '규칙 엔진이 아직 이 지도를 돌리지 못합니다.',
  // 웹 world.js:252 ERROR_TEXT 그대로(10-25 — 고도도 같은 문장)
  C26_COMMAND_UNAVAILABLE: '지금은 이 내정 명령을 쓸 수 없습니다.',
  INVALID_C26_CITY: '우리 성에서만 쓸 수 있습니다.',
  INVALID_ORDER_UNITS: '이미 움직였거나 행동을 마친 부대에는 이동 명령을 줄 수 없습니다.',
  INVALID_ORDER_DESTINATION: '갈 수 없는 칸입니다.',
  INVALID_CAMPAIGN_ATTACK: '지금 공격할 수 없는 대상입니다.',
  INVALID_CAMPAIGN_CITY_ATTACK: '지금 이 성은 공격할 수 없습니다.',
  INVALID_CAMPAIGN_FACE: '이동하기 전에만 정면을 돌릴 수 있습니다.',
  INVALID_MUSTER_OFFICER_OR_TROOP: '출진할 장수와 병종을 확인하세요.',
  MUSTER_RESERVE_200_REQUIRED: '예비병이 2,000명 이상 있어야 출진할 수 있습니다.',
  INVALID_WANDERER_RECRUITMENT: '지금은 등용할 수 없습니다(이미 협의 중이거나 성의 주인이 아님).',
  INVALID_GARRISON: '적과 붙어 있지 않은 상태로 자기 성 중심에 있어야 주둔할 수 있습니다.',
  MAIN_ACTION_USED: '이번 턴 행동을 이미 썼습니다.',
  EVENT_PENDING: '사건 카드를 먼저 정하세요.',
  UNIQUE_FACILITY_LIMIT: '고유 시설은 도시당 1개입니다.',
  UNIQUE_FACILITY_LOCKED: '다른 세력의 고유 시설입니다.',
  NO_DAMAGED_FACILITY: '손상된 시설이 없습니다.',
  MINOR_CITY_NO_FACILITIES: '작은 성에는 지을 수 없습니다.',
  STAR_COOLDOWN: '재사용 대기 중입니다.',
  STAR_UNAVAILABLE: '패주 중이라 쓸 수 없습니다.',
  STAR_OCCUPIED: '점령 처리 중인 성입니다.',
};
const TROOP_KEY = {BT01: 'militia', BT02: 'spear', BT03: 'bow', BT04: 'cavalry'};

class PortError extends Error { constructor(code, detail) { super(code); this.code = code; this.detail = detail; } }

/** 한 프로세스 = 한 판(규칙 모듈의 전역 설정이 섞이지 않게 — 감사 §1). */
export class PortSession {
  constructor() { /** @type {any} */ this.state = null; this.revision = 0; /** @type {any} */ this.cache = null; this.games = 0; this.sessionId = `${process.pid.toString(36)}-0`; }
  /** 새 판 · 불러오기마다 새 session_id(프로세스 id + 판 번호) — 이전 실행 · 이전 판의 응답과 섞이지 않게(GPT6PRO 2턴 §2-2). */
  newSession() { this.games++; this.sessionId = `${process.pid.toString(36)}-${this.games}`; }
  require() { if (!this.state) throw new PortError('NO_CAMPAIGN'); return this.state; }
  publicParts(parts = Object.keys(PUBLIC_PARTS)) {
    const s = this.require();
    if (!Array.isArray(parts) || !parts.every((name) => typeof name === 'string')) throw new PortError('BAD_REQUEST', 'parts');
    const v = R.view(s);
    // 고른 값도 복사하여 호출자가 엔진의 캐시된 공개 view 를 바꿀 수 없게 한다.
    return {revision: this.revision, parts: structuredClone(Object.fromEntries(parts.map((name) =>
      [name, Object.hasOwn(PUBLIC_PARTS, name) ? PUBLIC_PARTS[name](v) : null])))};
  }
  commit(next) { this.state = next; this.revision++; }

  newGame({seed = 190919, factionId = 'F01', field = false, map = 'v3', companions = null, domesticV3 = true, china12 = false, flow = null} = {}) {
    if (!Number.isSafeInteger(seed) || typeof factionId !== 'string' || typeof map !== 'string') throw new PortError('BAD_REQUEST', 'seed · factionId · map');
    // 웹 실제 판(world.js begin)과 같게(사용자 10-25 '웹 기준으로'): 새 판은 성에서 시작(fieldArmies:false — 사용자 10-11 '기본 2부대 출진 삭제'),
    // 드래프트로 고른 동료 = companions. field:true = 지도 위 두 부대로 시작(웹 ?field=1 — 자동 점검 · 대표 장면 · 시험용).
    // map = 엔진 지도 id(v3 · china). 모르는 지도면 엔진 오류를 MAP_UNSUPPORTED 로.
    // domesticV3 = 새 내정(trialRules.domesticV3 — 웹은 ?trial=v3 숨김 진입점). 총괄 10-25: 고도 새 판 기본은 켬(화면 개발은 고도만 · 웹 기본 · 저장은 그대로). 옛 내정 판은 domesticV3:false.
    if (companions !== null && !(Array.isArray(companions) && companions.every((c) => typeof c === 'string'))) throw new PortError('BAD_REQUEST', 'companions');
    // 중국 12세력 시험 판(총괄 10-25 — 사용자 '구디헛이랑 이민족도 없고'): map 'china' · china12(C509 드래프트 · 공정 시작) · flow 'v1'(C506 판 흐름)
    if (flow !== null && flow !== 'v1') throw new PortError('BAD_REQUEST', 'flow');
    const trial = {...(domesticV3 ? {domesticV3: true} : {}), ...(china12 && map === 'china' ? {china12: true} : {}), ...(flow ? {flow} : {})};
    let s;
    try { s = R.createCampaign({factionId, seed, map, manualEndTurn: true, ...(field ? {} : {fieldArmies: false}), ...(companions ? {companions} : {}), ...(Object.keys(trial).length ? {trialRules: trial} : {})}); }
    catch (e) { if (map !== 'v3') throw new PortError('MAP_UNSUPPORTED', `${map}: ${e instanceof Error ? e.message : e}`); throw e; }
    this.newSession();
    this.commit(this.advanceAi(s));
    return this.snapshot(true);
  }

  /** 상대 세력 진행은 호스트가 끝까지 돌린다(Godot 는 결과만 그린다). */
  advanceAi(s) {
    let n = 0;
    while (s.phase === 'AI' && !s.gameResult) {
      if (++n > AI_STEP_LIMIT) throw new PortError('AI_STEP_LIMIT');
      const prev = s;
      s = R.step(s, {type: 'ADVANCE_AI'});
      this.aiReplayStep(prev, s);
    }
    return s;
  }

  /**
   * 상대 차례 연출 기록(손맛 검토 v2 — 계산과 연출 분리): AI 한 걸음(prev → next)마다 내게 보인 이동 · 공격만 차례로 this.aiReplay 에 쌓음.
   * 내 시야(VISIBLE 칸) 밖은 생략. 값은 공개 범위만 — 부대 id · 보인 칸 · 공격 상대 id(병력 수는 담지 않음 — 끝 changes 가 정본).
   * advanceAi 를 덮어쓰는 쪽(hud-host 진행 띠)도 걸음마다 이것을 불러야 기록됨.
   */
  aiReplayStep(prev, next) {
    const r = this.aiReplay;
    if (!r) return;
    r.steps++;
    const actor = aiHeadFaction(prev);
    const me = prev.playerFactionId, seen = (st, tile) => st.knowledge?.[me]?.tiles?.[tile] === 'VISIBLE';
    for (const [id, a] of Object.entries(next.armies)) {
      const b = prev.armies[id];
      if (!b || a.factionId === me || b.tileId === a.tileId) continue;
      if (seen(prev, b.tileId) || seen(next, a.tileId)) r.events.push({kind: 'move', armyId: id, from: seen(prev, b.tileId) ? b.tileId : null, to: seen(next, a.tileId) ? a.tileId : null});
    }
    const c = (next.battleSequence ?? 0) > (prev.battleSequence ?? 0) ? next.lastCombat : null;
    if (c?.attackerId && c.targetId) {
      const at = next.armies[c.attackerId]?.tileId ?? prev.armies[c.attackerId]?.tileId, tt = next.armies[c.targetId]?.tileId ?? prev.armies[c.targetId]?.tileId;
      if ((at && seen(prev, at)) || (tt && seen(prev, tt)) || next.armies[c.targetId]?.factionId === me || prev.armies[c.targetId]?.factionId === me)
        r.events.push({kind: 'attack', attackerId: c.attackerId, targetId: c.targetId, from: at && seen(prev, at) ? at : null, to: tt && seen(prev, tt) ? tt : null});
    }
    // C518 세력별로 바로: 움직이던 세력이 바뀌거나 상대 차례가 끝나면 그 세력이 낸 보인 움직임을 알림 한 줄(aiReplayChunk)로 — 다음 세력은 그동안 계산.
    // 엔진 걸음 · 순서는 그대로(결과 · 판 해시 같음). 끝 응답의 aiReplay.events 는 전체 그대로(from = 그 묶음이 전체에서 시작하는 자리 — 고도가 이미 본 것을 건너뜀).
    const nextActor = next.phase === 'AI' && !next.gameResult ? aiHeadFaction(next) : null;
    if (actor !== nextActor) {
      const from = r.sent ?? 0, events = r.events.slice(from);
      r.sent = r.events.length;
      if (events.length) emitHostEvent({event: 'aiReplayChunk', factionId: actor, from, events, steps: r.steps});
    }
  }

  step(command, expectedRevision) {
    const s = this.require();
    if (expectedRevision !== undefined && expectedRevision !== this.revision) throw new PortError('STALE_REVISION', {revision: this.revision});
    if (!command || typeof command !== 'object' || !PLAYER_COMMANDS.has(command.type)) throw new PortError('UNSUPPORTED_COMMAND', command?.type);
    const {autoPlayer, ...clean} = command; // eslint-disable-line no-unused-vars
    // 출진: 병종 · 병력을 비우면 장수 기본 병종 · 엔진 허용 최대(웹 출진 편성과 같은 기본값)
    if (clean.type === 'SORTIE') {
      clean.troopType ??= s.officers[clean.officerId]?.troopType;
      clean.troopCount ??= Roster.sortieTroopRange(s, s.cities[clean.cityId], clean.troopType, clean.officerId)?.max;
    }
    const before = this.snapshot(), sequence = s.battleSequence ?? 0;
    this.aiReplay = {steps: 0, events: []};   // advanceAi(또는 그것을 덮어쓴 진행 띠 고리)가 걸음마다 aiReplayStep 으로 채움
    // 차례 넘김은 웹처럼 incremental(world.js:681 — 엔진이 상대 진행을 한 걸음씩 남김 → advanceAi 가 걸음마다 보인 이동 · 공격을 기록)
    this.commit(this.advanceAi(R.step(s, clean.type === 'END_TURN' ? {...structuredClone(clean), incremental: true} : structuredClone(clean))));
    // 이동 무르기(웹 world.js:599 moveUndo): 방금 MOVE_UNIT 이면 전 상태 · 무를 수 없는 까닭(새로 본 것 · 교전 · 무작위 …)을 기억, 다른 명령이면 지움
    this.moveUndo = clean.type === 'MOVE_UNIT' ? {before: s, after: this.state, armyId: clean.armyId, reason: movementUndoReason(s, this.state, clean, R.view(s), R.view(this.state)) || null} : null;
    const after = this.snapshot();
    // 사라짐 = '소멸 확정'(내 부대가 엔진에서 없어짐 · 이번 교전 eliminatedIds) vs '시야 밖'(그 밖) — 손맛 검토 10-25: 시야 이탈을 전멸처럼 그리지 않게
    const elim = new Set((this.state.battleSequence ?? 0) > sequence ? (this.state.lastCombat?.eliminatedIds ?? []) : []);
    const changes = unitChanges(before, after).map((c) => c.gone ? {...c, destroyed: elim.has(c.id) || (c.own && !this.state.armies[c.id])} : c);
    // 교전 연출 갈래: 부대 공격 · 병종 Q · 계통 W · 전법이 교전을 낳았으면(웹은 이 교전들을 같은 animateCombat 로 그림)
    const feel = ['ATTACK_UNIT', 'USE_TROOP_Q', 'ENGINE_ACTION', 'USE_TACTIC'].includes(clean.type) && (this.state.battleSequence ?? 0) > sequence ? combatFeel(s, this.state.lastCombat) : null;
    const aiReplay = this.aiReplay?.steps ? this.aiReplay : null;
    // 전법 · 능력 지도 연출(웹 fx-ink impactTactic): 이번 교전이 전법이면 닿은 칸 · 새 불 · 큰 충격 여부(웹 tacticTiles 그대로 — 보이는 칸만)
    const lc = (this.state.battleSequence ?? 0) > sequence ? this.state.lastCombat : null;
    const tacticFx = (clean.type === 'USE_TACTIC' || lc?.tacticName) && lc ? (() => { const t = FxInk.tacticTiles(s, this.state, lc); return {from: t.from ?? null, to: t.to ?? null, targets: t.targets, igniting: t.igniting, big: t.targets.length > 1 || (lc.enemyLoss ?? 0) >= 100, name: lc.tacticName ?? null, fire: !!lc.fire}; })()
      : clean.type === 'USE_TACTIC' ? {from: s.armies[clean.armyId]?.tileId ?? null, to: s.armies[clean.targetId]?.tileId ?? s.cities?.[clean.targetId]?.tileId ?? (s.tiles[clean.targetId] ? clean.targetId : null), targets: [], igniting: FxInk.visibleFireTiles(this.state).filter((id) => !FxInk.visibleFireTiles(s).includes(id)), big: false, name: null, fire: false} : null;   // 상대 차례가 돌았으면 그 연출 기록(걸음 수 · 보인 이동/공격)
    this.aiReplay = null;
    return {...this.snapshot(false), applied: clean.type, newCombats: (this.state.battleSequence ?? 0) - sequence, changes, events: publicEvents(this.revision, before, after, changes, clean), feel, aiReplay, tacticFx};
  }

  /**
   * 장수 드래프트(웹 officer-draft-ui.mjs 와 같은 엔진 함수 · 순서 — 새 규칙 없음): 새 판 전에 '함께 깨어날 사람'을 고른다.
   * draft {factionId, seed} → createOfficerDraft · draftLock {officerId} → lockDraftOfficer · draftReroll {searchOwnerId?} → rerollOfficerDraft ·
   * draftConfirm → officerDraftCompanions(모자라면 엔진 오류) — 돌려준 companions 를 'new' 에 그대로 넘기면 웹 begin(factionId, seed, companions) 과 같다.
   * 응답 = {draft: officerDraftView(draft)}(엔진 보기 그대로 — 화면은 UI 방). 드래프트 상태는 판(state)과 따로 이 프로세스에만.
   */
  draftStart({factionId = 'F01', seed = 190919, map = 'v3', china12 = false} = {}) {
    if (!Number.isSafeInteger(seed) || typeof factionId !== 'string') throw new PortError('BAD_REQUEST', 'seed · factionId');
    this.draft = Draft.createOfficerDraft({factionId, seed, ...(map === 'china' && china12 ? {mapId: 'china', china12: true} : {})});
    return {draft: Draft.officerDraftView(this.draft), locked: [...this.draft.locked], fixed: [], factionId, seed};
  }
  draftStep(fn) {
    if (!this.draft) throw new PortError('NO_DRAFT');
    this.draft = fn(this.draft);
    return {draft: Draft.officerDraftView(this.draft), locked: [...this.draft.locked], fixed: Draft.officerDraftFixed(this.draft)};   // locked = 깨운 차례(동료 칸 순서 — UI 방 화면) · fixed = 다시 뽑기로 고정된 것(취소 불가)
  }
  draftConfirm() {
    if (!this.draft) throw new PortError('NO_DRAFT');
    const companions = Draft.officerDraftCompanions(this.draft);
    return {companions, factionId: this.draft.factionId, draft: Draft.officerDraftView(this.draft)};
  }

  /**
   * 고른 부대의 Q · W · E · R(웹 #unit-menu 와 같은 엔진 값 — view troopQ · engineActions · campaignTactics). 대상마다 지도 칸(tileId)을 붙여 줌.
   * Q = USE_TROOP_Q {targetTileId} · E/R = USE_TACTIC {traitId, targetId} · W = ENGINE_ACTION {action, targetId}(여러 대상 고르기 W 는 multi:true — 다음 단계) · ATTACK_STRUCTURE.
   * E/R 갈래 = 웹 world.js:4402(slot 이 있으면 slot, 없으면 대표 전법 signature = R).
   */
  abilities(armyId) {
    const s = this.require(), v = R.view(s), a = v.ownArmies[armyId];
    if (!a) throw new PortError('NOT_OWN_ARMY', armyId);
    const visible = {...v.ownArmies, ...Object.fromEntries(Object.entries(v.knowledge.observedArmies).filter(([, o]) => v.knowledge.tiles[o.tileId] === 'VISIBLE'))};
    const cities = {...v.knowledge.cities, ...v.ownCities};
    const tileOf = (t) => {
      const id = typeof t === 'string' ? t : t?.targetId ?? t?.targetTileId ?? t?.tileId ?? t?.id;
      if (typeof id !== 'string') return null;
      if (visible[id]) return {id, tileId: visible[id].tileId, kind: 'unit'};
      if (cities[id]) return {id, tileId: cities[id].tileId, kind: 'city'};
      if (s.tiles[id]) return {id, tileId: id, kind: 'tile'};
      return null;
    };
    const targets = (list) => (list ?? []).map(tileOf).filter(Boolean);
    const q = a.troopQ ? {name: a.troopQ.name, canUse: !!a.troopQ.canUse, reason: a.troopQ.reasonText || null, targets: targets(a.troopQ.targets)} : null;
    // 웹 openEngineAction(world.js:4577): 계통 행동 + 구조물 공격 · resource = 계통 자원(경고 중심 + 칸 둘 · 위압 최대 수에 씀)
    const resource = a.engine?.resource ?? 0;
    const w = [...(a.engineActions ?? []), ...(a.structureTargets?.length ? [{action: 'ATTACK_STRUCTURE', name: '구조물 공격', canUse: true, targets: a.structureTargets}] : [])].map((o) => ({action: o.action, name: o.name, canUse: !!o.canUse, reason: o.reasonText || null, targets: targets(o.targets), resource,
      multi: ['FLURRY', 'INTIMIDATE'].includes(o.action) || String(o.action).startsWith('WARN') && resource === 2}));
    const cards = Effects.campaignTactics(s, armyId);
    const tactic = (key) => {
      const c = cards.find((x) => x.slot === key || !x.slot && (key === 'R' ? x.signature : !x.signature));
      return c ? {traitId: c.traitId, name: c.name, canUse: !!c.canUse, reason: c.reasonText || null, targets: targets(c.targets), selfOnly: c.targets?.length === 1 && c.targets[0] === armyId} : null;
    };
    return {armyId, revision: this.revision, Q: q, W: w, E: tactic('E'), R: tactic('R')};
  }

  /** 시설 자리 고르기(내정 기획 방 DESIGN §17 · UI-SPEC-V3 4-1): 내 성 · 시설 종류의 놓을 수 있는 칸(엔진 view facilitySiteOptions 그대로) → CITY_JOB {tileId}. */
  facilitySites(cityId, kind) {
    const s = this.require(), c = R.view(s).ownCities?.[cityId];
    if (!c) throw new PortError('NOT_OWN_CITY', cityId);
    const job = (c.jobs ?? []).find((j) => j.kind === kind);
    return {cityId, kind, name: job?.name ?? kind, options: c.facilitySiteOptions?.[kind] ?? [], revision: this.revision};
  }

  /**
   * 지도 렌즈(웹 X 위험 · 보급 — 공개 보기만): danger = {tiles: 보이는 적이 다음 차례에 닿는 칸, intents: [{from, to}] 적 → 노리는 내 부대 · 성},
   * supply = {tiles: 내 성 · 보급 거점에서 보급이 닿는 칸, links: [{armyId, from, to, state}] 내 부대 → 보급원}.
   */
  lens(kind) {
    const s = this.require(), v = R.view(s), fid = v.factionId;
    if (kind === 'danger') {
      const tiles = Combat.campaignDangerTiles(s, fid), intents = [], targets = [...Object.values(v.ownArmies), ...Object.values(v.ownCities)];
      for (const a of Object.values(v.knowledge?.observedArmies ?? {})) {
        if (v.knowledge.tiles[a.tileId] !== 'VISIBLE' || a.factionId === s.playerFactionId) continue;
        const k = s.knowledge[fid], publicSource = {...s, knowledge: {...s.knowledge, [fid]: {...k, observedArmies: {[a.armyId]: a}}}};
        const area = new Set(Combat.campaignDangerTiles(publicSource, fid));
        for (const t of targets) if (!Dipl.diplomacyAttackReason(s, a.armyId, t.armyId ?? t.cityId) && [t.tileId, ...(t.footprint?.gates ?? []), ...(t.footprint?.walls ?? [])].some((id) => area.has(id))) intents.push({from: a.tileId, to: t.tileId, armyId: a.armyId, targetId: t.armyId ?? t.cityId});
      }
      return {kind, tiles, intents, revision: this.revision};
    }
    if (kind === 'supply') {
      const all = Object.values(s.tiles).map((t) => ({id: t.tileId ?? `${t.q},${t.r}`, q: t.q, r: t.r}));
      const hubs = v.hubs ?? [];
      const tiles = MapV3.publicSupplyTiles(all, Object.values(v.ownCities), hubs).map((t) => t.id);
      const cityTile = (id) => v.ownCities[id]?.tileId ?? null, hubTile = (id) => hubs.find((h) => h.hubId === id || h.id === id)?.tileId ?? null;
      const links = Object.entries(v.ownArmies).map(([id, a]) => ({armyId: id, from: a.tileId, to: a.supply?.sourceHubId ? hubTile(a.supply.sourceHubId) : cityTile(a.supply?.sourceCityId), state: a.supply?.linkState ?? a.supply?.state ?? null})).filter((l) => l.to && l.to !== l.from);
      return {kind, tiles, links, hubs: hubs.map((h) => ({tileId: h.tileId, name: h.name ?? null})), revision: this.revision};
    }
    throw new PortError('BAD_REQUEST', 'lens kind');
  }

  /** 이동 무르기 Z(웹 undoMovement world.js:626): 방금 한 이동이 무를 수 있으면 이동 전 상태로(판 revision +1). */
  undoMove() {
    const u = this.moveUndo;
    if (!u || u.after !== this.state) throw new PortError('UNDO_UNAVAILABLE', '무를 이동 없음');
    if (u.reason) throw new PortError('UNDO_UNAVAILABLE', u.reason);
    this.moveUndo = null;
    this.commit(u.before);
    return {...this.snapshot(false), applied: 'UNDO_MOVE', armyId: u.armyId, changes: [], events: []};
  }

  /** 경유 경로(웹 movementPreview · waypointRoute): points = 경유 칸들 + 마지막 목적지 → {ok, reason, path, turns}. 실행은 MOVE_UNIT {path}. */
  route(armyId, points) {
    const s = this.require();
    if (!R.view(s).ownArmies[armyId]) throw new PortError('NOT_OWN_ARMY', armyId);
    if (!Array.isArray(points) || !points.every((t) => typeof t === 'string' && s.tiles[t])) throw new PortError('BAD_REQUEST', 'points');
    const r = Orders.waypointRoute(s, armyId, points);
    return {armyId, ok: !!r.ok, reason: r.ok ? null : (MESSAGES[r.reason] ?? r.reason ?? null), path: r.pathTileIds ?? [], turns: r.ok ? Orders.routeTurns(s, armyId, r) : null, revision: this.revision};
  }

  /** 정면 F(웹 world.js:3840): 누른 칸 쪽 방향 = 엔진 directionToward(부대 칸, 누른 칸, 지금 방향) — FACE 명령에 그대로. */
  faceToward(armyId, tileId) {
    const s = this.require(), a = R.view(s).ownArmies[armyId] ? s.armies[armyId] : null;
    if (!a) throw new PortError('NOT_OWN_ARMY', armyId);
    if (!s.tiles[tileId] || tileId === a.tileId) throw new PortError('BAD_REQUEST', 'tileId');
    return {armyId, facing: Abil.directionToward(s.tiles[a.tileId], s.tiles[tileId], a.facing ?? 0), revision: this.revision};
  }

  /** 고른 내 부대가 갈 수 있는 칸 · 칠 수 있는 대상 — 엔진 판정 그대로(Godot 는 길을 찾지 않는다). */
  armyOptions(armyId) {
    const s = this.require(), v = R.view(s);
    if (!v.ownArmies[armyId]) throw new PortError('NOT_OWN_ARMY', armyId);
    const ticks = s.time?.ticksPerTurn ?? 200;
    const move = R.campaignMoveOptions(s, armyId).map((o) => ({tileId: o.tileId, path: o.route?.pathTileIds ?? [], turns: Math.max(1, Math.ceil((o.route?.totalTicks ?? 0) / ticks)), supply: o.supplyState ?? null}));
    const units = Combat.attackTargets(s, armyId).map((targetId) => { const p = Combat.previewAttack(s, armyId, targetId); return {targetId, forecast: forecast(p), detail: forecastDetail(s, v, armyId, targetId, p)}; });
    const cities = Combat.cityAttackTargets(s, armyId).map((cityId) => ({cityId}));
    // 판 흐름(C506): 칠 수 있는 무리 · 진지(FLOW_ATTACK) · 받을 수 있는 구디헛(FLOW_CLAIM) — 엔진 view flow 그대로 + 칸
    const fv = v.flow, fsite = (id) => (fv?.sites ?? []).find((x) => x.id === id), funit = (id) => (fv?.units ?? []).find((x) => x.armyId === id);
    const flowAttack = (fv?.attackTargets?.[armyId] ?? []).map((id) => { const t = funit(id) ?? fsite(id); return t ? {targetId: id, tileId: t.tileId, name: t.name ?? id} : null; }).filter(Boolean);
    const flowClaim = (fv?.claimTargets?.[armyId] ?? []).map((id) => { const t = fsite(id); return t ? {siteId: id, tileId: t.tileId, name: t.name ?? id, kind: t.goodyKind ?? t.kind} : null; }).filter(Boolean);
    // 이동 예고(UI 방 요청 — ForecastCard · 이동 칸에 결과 판과 같은 말로): 지금 자리를 떠나면 추격 · 그 칸에 들어가면 사격 받음
    const probe = (() => { try { return AiTactics.campaignTacticsWorld(s, AiTactics.campaignTacticsView(s, s.playerFactionId)); } catch { return null; } })();
    const nameOf = (id) => { const cid = v.ownArmies[id]?.commanderId ?? v.knowledge.observedArmies[id]?.commanderId; return (cid && (s.officers?.[cid]?.name ?? s.wanderers?.[cid]?.name)) ?? '적 부대'; };
    let disengage = null;
    // C516: 예고 = 실제(엔진 previewDisengageFor · previewApproachFireFor — 진짜 판 · 실제 결과와 같은 함수, 안 보이는 추격 · 사격자만 공개 판 값)
    try { const d = move.length ? Combat.previewDisengageFor(s, armyId, probe) : null; if (d) disengage = {pursuerId: d.pursuerId, pursuerName: nameOf(d.pursuerId), pursuers: 1, dealt: d.dealt, dealtText: Display.troopText(d.dealt), effectLines: d.effectLines ?? []}; } catch { /* 예고 실패는 이동을 막지 않음 */ }
    for (const m of move) {
      m.approachFire = null;
      try { const f = Combat.previewApproachFireFor(s, armyId, m.tileId, probe); if (f) m.approachFire = {shooterId: f.archerId ?? f.attackerId ?? null, shooterName: nameOf(f.archerId ?? f.attackerId), damage: f.damage, damageText: Display.troopText(f.damage), effectLines: f.effectLines ?? []}; } catch { /* 같음 */ }
      // 이 칸으로 가면 받는 것 모두(추격자 · 사격자 수와 합계 — 고도 예고 판 · 이동 경고 한 줄)
      const parts = [disengage ? {kind: '추격', name: disengage.pursuerName, loss: disengage.dealt} : null, m.approachFire ? {kind: '접근 사격', name: m.approachFire.shooterName, loss: m.approachFire.damage} : null].filter(Boolean);
      m.risk = parts.length ? {count: parts.length, parts: parts.map((p) => ({...p, lossText: Display.troopText(p.loss)})), total: parts.reduce((n, p) => n + p.loss, 0), totalText: Display.troopText(parts.reduce((n, p) => n + p.loss, 0))} : null;
    }
    return {armyId, revision: this.revision, move, attackUnits: units, attackCities: cities, flowAttack, flowClaim, disengage};
  }

  /**
   * 시험용 견본 판(화면 시험이 특정 장면을 실제 클릭으로 돌릴 때만). 'stratagem' = 고도 UI/UX 방 계략 장면(엔진 c248 — 순욱 · 유비 부대가 업 곁),
   * 'ending' = 그 방 판 결과 장면(26차례 끝까지 자동 진행 — 수십 초).
   * 판 만들기는 그 방 port/godot/ui/host/stratagem-model.mjs 를 읽기만 해서 씀. 응답은 보통 판처럼 공개 모델만.
   */
  fixture(name) {
    if (!['stratagem', 'ending', 'china-contact', 'duel', 'fire'].includes(name)) throw new PortError('BAD_REQUEST', 'fixture ' + name);
    if (!FIXTURES[name]) throw new PortError('HOST_NOT_READY', 'fixture 아직 읽는 중');
    const state = FIXTURES[name]();
    this.newSession();
    this.commit(state);
    return this.snapshot(true);
  }

  /** 계략 후보 — 엔진 stratagemOptions 그대로(내 장수 · 지금 보이는 대상만). 장수마다 종류별 대상 칸 목록. */
  stratagemOptions() {
    const s = this.require();
    const officers = Strat.stratagemOptions(s, s.playerFactionId).map((o) => {
      const kinds = {};
      for (const c of o.choices) (kinds[c.cmd.kind] ??= {kind: c.cmd.kind, name: c.name, targets: []}).targets.push({targetArmyId: c.cmd.targetArmyId ?? null, targetCityId: c.cmd.targetCityId ?? null, tileId: c.tileId, name: c.targetName});
      return {officerId: o.officerId, name: o.name, cityId: o.cityId, intelligence: Math.round(o.intelligence), cooldown: o.cooldown, blocked: o.blockedReason ? (MESSAGES[o.blockedReason] ?? o.blockedReason) : null, kinds: Object.values(kinds)};
    });
    return {officers, revision: this.revision};
  }

  /** 내 성의 출진 후보(자유 장수 + 태수) — 병력 범위 · 못 나가는 까닭은 엔진 판정 그대로. 화면 모델(UI 방 sortieModel)이 없을 때의 최소 흐름용. */
  sortieOptions(cityId) {
    const s = this.require(), v = R.view(s), c = v.ownCities[cityId];
    if (!c) throw new PortError('NOT_OWN_CITY', cityId);
    const ids = [...new Set([...(c.freeOfficers ?? []).map((o) => o.officerId), ...(c.governorId ? [c.governorId] : [])])];
    const officers = ids.map((id) => {
      const type = v.officers[id]?.troopType, range = Roster.sortieTroopRange(s, s.cities[cityId], type, id);
      const reason = Roster.sortieReason(s, {type: 'SORTIE', cityId, officerId: id, troopType: type, troopCount: range.min})?.message ?? null;
      return {officerId: id, name: v.officers[id]?.name ?? id, governor: id === c.governorId, troopType: type, min: range.min, max: range.max, step: range.step ?? 100, maxText: Display.troopText(range.max), reason};
    });
    return {cityId, name: c.name, displayScale: Display.TROOP_DISPLAY_SCALE, reserve: c.reserveTroops, reserveText: Display.troopText(c.reserveTroops), officers, revision: this.revision};
  }

  /**
   * 시작 메뉴 '이어하기' 한 줄 — 저장 글을 지금 판과 따로 읽어 확인만(지금 판은 그대로). 고도는 저장 글을 열지 않는다(숨은 정보).
   * 읽힘 {readable:true, summary:'조조 · 3차례 / 26', factionId, turn} · 못 읽음 {readable:false, reason}(UI 방 시작 메뉴 사유 넷 중 하나).
   */
  saveInfo(text) {
    if (typeof text !== 'string' || !text.length) return {readable: false, reason: '저장된 판이 없습니다'};
    let s;
    try { s = R.deserialize(text); } catch (e) {
      const msg = String(e?.message ?? e);
      if (/지원하지 않는/.test(msg)) return {readable: false, reason: '판 형식이 옛것입니다'};
      if (e instanceof SyntaxError || /JSON|크기|손상/.test(msg)) return {readable: false, reason: '저장이 손상되었습니다'};
      return {readable: false, reason: '저장을 읽지 못했습니다'};
    }
    const v = R.view(s), ruler = v.officers[v.faction?.rulerId]?.name ?? v.faction?.name ?? s.playerFactionId;
    // slot = 저장 확인 카드 한 줄 앞부분(웹 saveSlotSummary '조조 · 190년 3월 상순 · 7차례' — 저장 시각은 고도가 파일 시각으로 붙임)
    return {readable: true, summary: `${ruler} · ${s.turn}차례 / ${R.CAMPAIGN_TURN_LIMIT}`, slot: `${ruler} · ${dateText(s.turn)} · ${s.turn}차례`, factionId: s.playerFactionId, turn: s.turn};
  }

  save() { const text = R.serialize(this.require()); return {text, chars: text.length, revision: this.revision}; }

  load(text) {
    if (typeof text !== 'string') throw new PortError('BAD_REQUEST', 'text');
    const next = R.deserialize(text); // 실패하면 지금 판을 그대로 둔다(deserialize 가 먼저 검증)
    this.newSession();
    this.commit(next);
    return this.snapshot(true);
  }

  /** Godot 에 보내는 공개 모델. view(플레이어 세력)와 그 투영만 읽고, 내 부대의 행동 여부만 state 에서 본다. */
  /**
   * full = 칸 목록 · 길 · 강 · 다리 · 지명까지(판을 열 때 · 불러올 때 · view 기본). 아니면 map 대신 시야 글자열만:
   * map.vis = 칸 순서(마지막 full 의 map.tiles 순서)대로 한 글자씩 V(보임) · R(기억) · U(못 가 봄) — 큰 지도(중국 전역 5,970칸)에서 응답을 줄인다.
   */
  snapshot(full = true) {
    if (!(this.cache?.revision === this.revision && this.cache.state === this.state)) this.cache = {revision: this.revision, state: this.state, data: this.buildSnapshot()};
    const data = this.cache.data;
    if (full) return data;
    return {...data, map: {vis: data.map.tiles.map((t) => (t.vis === 'VISIBLE' ? 'V' : t.vis === 'REMEMBERED' ? 'R' : 'U')).join(''), tileCount: data.map.tiles.length}};
  }

  buildSnapshot() {
    const s = this.require(), v = R.view(s), map = MapModel.campaignMapModel(v, {movedArmyIds: s.movedArmyIds ?? []});
    const own = new Set(Object.keys(v.ownArmies));
    // 공개 이름표: 지도 모델은 명부 밖 장수(G 꾸러미)를 id 로 돌려줌 → 보이는 부대의 지휘관 이름(웹 화면과 같은 값), 모르면 '적 부대'
    const label = (u) => {
      const cid = own.has(u.id) ? v.ownArmies[u.id].commanderId : v.knowledge.observedArmies[u.id]?.commanderId;
      if (u.name && u.name !== cid) return u.name;
      return (cid && (s.officers?.[cid]?.name ?? s.wanderers?.[cid]?.name)) ?? (own.has(u.id) ? '부대' : '적 부대');
    };
    const units = map.units.map((u) => ({
      id: u.id, name: label(u), factionId: u.factionId, tileId: u.tileId, troop: TROOP_KEY[u.troop] ?? u.troop,
      troopName: u.troopName ?? (v.ownArmies[u.id] ?? v.knowledge.observedArmies[u.id])?.troopDisplayName ?? null,
      count: u.count, countText: Number.isFinite(u.count) ? Display.troopText(u.count) : '?', maxCount: u.maxCount ?? null, maxCountText: Number.isFinite(u.maxCount) ? Display.troopText(u.maxCount) : null, morale: u.morale, facing: u.facing ?? null,
      commanderId: own.has(u.id) ? v.ownArmies[u.id].commanderId : (v.knowledge.observedArmies[u.id]?.commanderId ?? null),
      own: own.has(u.id), moved: !!u.moved, ended: own.has(u.id) ? Combat.armyActionEnded(s, u.id) : false, remembered: !!u.remembered,
    }));
    // 내 성의 지어진 시설 자리(facilityPlacements) · 짓는 중인 시설 자리(currentProduction.tileId) — 지도에 임시 모형으로(아스트라 시설 모형이 오면 교체)
    const facilitiesOf = (id) => {
      const oc = v.ownCities?.[id]; if (!oc) return null;
      const nameOf = (k) => (oc.jobs ?? []).find((j) => j.kind === k)?.name ?? k;
      const cur = oc.currentProduction;
      return {built: (oc.facilityPlacements ?? []).map((p) => ({...p, name: nameOf(p.kind)})), building: cur?.tileId ? {kind: cur.kind ?? null, name: nameOf(cur.kind), tileId: cur.tileId} : null};
    };
    const cities = map.cities.map((c) => ({id: c.id, name: c.name, kind: c.kind, factionId: c.factionId, center: c.center, gates: c.gates ?? [], walls: c.walls ?? [],
      defense: c.defense ?? null, defenseMax: c.defenseMax ?? null, besieged: !!c.besieged, own: c.factionId === v.factionId, facilities: facilitiesOf(c.id)}));
    // 외교(공개 view 그대로): 만난 세력 · 내게 들어온 제안 — 고도가 첫 만남 · 제안 받기 화면을 띄울 때 씀
    const diplomacy = {met: (v.diplomacy?.factions ?? []).filter((f) => f.contact).map((f) => f.factionId),
      incoming: (v.diplomacy?.incoming ?? []).map((p) => ({proposalId: p.proposalId, from: p.from, kind: p.kind, expiresTurn: p.expiresTurn ?? null}))};
    const factions = Object.fromEntries([[v.factionId, {name: v.faction?.name ?? v.factionId, relation: 'SELF'}],
      ...(v.diplomacy?.factions ?? []).map((f) => [f.factionId, {name: f.name, relation: f.relation ?? f.state ?? null}])]);
    const result = v.gameResult ? {type: v.gameResult.type ?? null, winnerFactionId: v.gameResult.winnerFactionId ?? null, rank: v.gameResult.rank ?? null} : null;
    return {
      revision: this.revision, mapId: v.mapId, turn: v.turn, turnLimit: R.CAMPAIGN_TURN_LIMIT, date: dateText(v.turn), phase: s.phase,
      playerFactionId: v.factionId, factions, diplomacy, result,
      map: {tiles: map.tiles.map((t) => ({id: `${t.q},${t.r}`, q: t.q, r: t.r, terrain: t.terrain, vis: t.vis})), roads: map.roads, rivers: map.rivers, bridges: map.bridges ?? [], places: map.places ?? []},
      cities, units, pending: this.pending(s, v), combat: combatLines(v, units),
      // C30 세트 · 팀업 · 인연(사용자 10-25 'TFT 처럼 장수 모으면 효과'): 엔진 view 그대로 + 웹 bondLinks(지도 금색 끈)
      bonds: {setProgress: v.setProgress ?? [], boundGroups: v.social?.boundGroups ?? [], links: bondLinks(v)},
      // 판 흐름(C506 — 중국 판 flow v1 에서만): 구디헛 · 이민족 진지 · 황건 근거지(sites) · 떠도는 무리(units) · 국면 — 엔진 view 그대로(보이는 것만)
      flow: v.flow ? {phase: v.flow.phase ?? null, worldPhase: v.flow.worldPhase ?? null, sites: v.flow.sites ?? [], units: v.flow.units ?? [], crises: v.flow.crises ?? [], investigations: v.flow.investigations ?? []} : null,
      // 불(웹 fx-ink visibleFireTiles · hud-ink fireReadout — 보이는 칸만): 타는 칸 · 남은 차례 · 그을린 숲
      fire: (() => { const fr = fireReadout(v), left = new Map(fr.fires.map((f) => [f.id, f.turnsLeft])), known = v.knowledge?.tiles ?? {};
        return {tiles: FxInk.visibleFireTiles(s, known).map((id) => ({tileId: id, turnsLeft: left.get(id) ?? null})), scorches: (fr.scorches ?? []).filter((id) => known[id] && known[id] !== 'UNEXPLORED')}; })(),
      // 무르기 단추(웹 #c186-undo): 무를 이동이 있으면 {armyId, reason(null = 무를 수 있음)}
      undo: this.moveUndo && this.moveUndo.after === s ? {armyId: this.moveUndo.armyId, reason: this.moveUndo.reason} : null,
      // 예약 이동(웹 여러 부대 함께 이동 — QUEUE_MOVE → ADVANCE_ORDER 를 줄이 빌 때까지): 내 부대만
      orders: {queue: (s.orderQueue ?? []).filter((id) => own.has(id)), moves: Object.fromEntries(Object.entries(s.moveOrders ?? {}).filter(([id]) => own.has(id)).map(([id, o]) => [id, o.destinationTileId]))},
    };
  }

  /** 차례 넘기기를 막는 결정(사건 · 성장 카드). 명령은 호스트가 만들어 주고 Godot 는 그대로 돌려보낸다. */
  pending(s, v) {
    if (v.pendingEvent) return {kind: 'EVENT', title: v.pendingEvent.title, text: v.pendingEvent.text ?? '',
      choices: v.pendingEvent.choices.map((c) => ({label: c.label, detail: c.preview ?? '', disabled: c.blockedReason ?? null, command: {type: 'EVENT_CHOICE', eventId: v.pendingEvent.eventId, choiceId: c.id}}))};
    const draft = Growth.pendingCampaignDraft(s);
    if (draft) {
      const name = v.officers[draft.officerId]?.name ?? draft.officerId;
      const cards = new Map((draft.cards ?? []).map((c) => [c.traitId, c]));
      const choices = listActions(s, {compact: true}).filter((a) => a.command.type === 'DRAFT_PICK').map((a) => {
        const c = cards.get(a.command.traitId);
        const tail = a.command.resolution?.removeId ? ` · ${a.command.resolution.removeId} 버림` : a.command.tacticId ? ` → ${a.command.tacticId}` : '';
        return {label: `${c?.name ?? a.command.traitId}${tail}`, detail: c?.description ?? c?.summary ?? c?.text ?? '', disabled: null, command: a.command};
      });
      return {kind: 'DRAFT', title: `${name} 성장 — 카드 하나를 고르세요`, text: '', choices};
    }
    return null;
  }
}

/**
 * 교전 예고 '자세히'(웹 world.js forecastHtml 3197~3214 · forecastTacticSwitch 3192 — 같은 말 · 같은 계산, 공개 보기만):
 * terrain(지형 · 방어 배수) · result(대승/우세/접전/불리/격파 + 까닭) · mods(보정 줄 — 효과 · 지형 · 성 · 상성 · 도하 · 협공 · 방향) · risks(전열 · 사기 · 기습 경고) ·
 * captureChance(격파 뒤 퇴로 없을 때 사로잡을 확률) · tactics(이 대상에 쓸 수 있는 피해 전법 E/R — 웹 '공격 방식' 전환).
 */
const SIDE_NAME = {FRONT: '정면', FLANK: '측면', REAR: '후방'};
function forecastDetail(s, v, attId, tgtId, p0) {
  if (!p0) return null;
  let p = p0;
  if (Array.isArray(p.targetLosses)) p = {...p, enemyLoss: p.targetLosses.find((r) => r.targetId === tgtId)?.loss ?? 0, allyLoss: p.targetLosses.find((r) => r.targetId === attId)?.loss ?? 0};
  const visible = {...v.knowledge.observedArmies, ...v.ownArmies}, A = visible[attId], T = visible[tgtId];
  const aT = A?.troopCount ?? 0, tT = p.shownTargetCount ?? T?.troopCount ?? 0, tAfter = Math.max(0, tT - (p.enemyLoss ?? 0));
  const ef = (tT - tAfter) / Math.max(1, tT), af = (p.allyLoss ?? 0) / Math.max(1, aT), destroyed = tAfter <= 0;
  const result = destroyed ? '격파' : ef - af > 0.15 ? '대승' : ef - af > 0.05 ? '우세' : ef - af > -0.05 ? '접전' : '불리';
  const m = p.multipliers ?? {}, terrainType = v.tiles?.[T?.tileId]?.terrainType;
  const mods = [...new Set((p.effectLines ?? []).map((line) => line.replace(/^병종 × 지형:\s*/, '지형 — ').replace(/공격 (-?\d+)%/, (_, n) => `공격 ${Number(n) > 0 ? '+' : '−'}${Math.abs(Number(n))}%`).replace(/궁병 성 공격 — 성벽 내구 피해 ×0\.5/, '성벽 피해 절반')))];
  if (m.terrain && m.terrain !== 1) mods.push(`${terrainType === 'forest' ? '숲' : '언덕'} 방어 ×${m.terrain}`);
  if (m.castle && m.castle !== 1) mods.push(`성 방어 ×${m.castle}`);
  if (m.matchup && m.matchup !== 1) mods.push(`상성 ${m.matchup < 1 ? '불리' : '유리'} ×${m.matchup}`);
  if (m.river && m.river !== 1) mods.push(`도하 ×${m.river}`);
  if (m.flank && m.flank !== 1) mods.push(`협공 +${Math.round((m.flank - 1) * 100)}%`);
  const sideBonus = Number.isFinite(m.side) ? Math.round((m.side - 1) * 100) : 0;
  const cleanMods = mods.filter((x) => !/^(측면|후방) \+/.test(x)); if (sideBonus) cleanMods.push(`${SIDE_NAME[p.side]} +${sideBonus}%`);
  const capture = CAMPAIGN_RETREAT_FATE_RULES.blockedFateBasisPoints.captured, captureChance = (capture[1] - capture[0]) / 100;
  const warn = v.diplomacy?.factions?.find((f) => f.factionId === T?.factionId)?.attackWarning;
  const risks = [warn ? (typeof warn === 'string' ? warn : warn.text ?? warn.label ?? '외교 관계를 깨는 공격입니다') : null, p.formationRisk?.check ? '적 전열을 무너뜨림' : null,
    p.moraleRisk?.check ? `적 사기가 떨어질 수 있음(${chanceText462(1 - p.moraleRisk.successProbability)})` : null].filter(Boolean);
  const tactics = Effects.campaignTactics(s, attId).filter((c) => ['E', 'R'].includes(c.slot) && Effects.tacticIsDamage(c)).map((c) => ({traitId: c.traitId, slot: c.slot, name: c.name, canUse: !!c.canUse && (c.targets ?? []).includes(tgtId), reason: c.reasonText || null, gauge: c.gauge ?? null, gaugeCost: c.gaugeCost ?? null}));
  return {terrain: {type: terrainType ?? null, defense: m.terrain ?? 1}, side: p.side ?? null, sideName: SIDE_NAME[p.side] ?? null, result,
    resultHelp: `적 ${Math.round(ef * 100)}% · 아군 ${Math.round(af * 100)}% 잃음${destroyed ? ' · 격파 뒤 퇴로가 없으면 사로잡을 확률 ' + captureChance + '%' : ''} · ${result}가 예상됩니다`,
    mods: cleanMods, risks, captureChance: destroyed ? captureChance : null, tactics};
}
// 상대 차례 지금 움직이는 세력(hud-host 진행 띠 headFaction 과 같은 읽기)
function aiHeadFaction(st) { const e = st?.aiQueue?.[0]; return e?.factionId ?? e?.faction ?? e?.tacticsFaction ?? null; }
// 호스트 알림 한 줄(id 없음): 고도가 띄운 호스트(node hud-host · host 직접 · 웹 워커 — process.argv[1] 로 앎)일 때만 표준 출력에. 시험에서 불러 쓸 때는 조용히(onHostEvent 로 받을 수 있음)
export const hostEvents = {sink: null};
const LAUNCHED = /(?:hud-host|host)\.mjs$/.test(String(process.argv?.[1] ?? '').split('\\').join('/'));
function emitHostEvent(body) {
  if (hostEvents.sink) { hostEvents.sink(body); return; }
  if (LAUNCHED) out(JSON.stringify({id: null, ...body}) + '\n');
}
function forecast(p) {
  if (!p) return null;
  return {side: p.side ?? null, allyLoss: p.allyLoss ?? 0, enemyLoss: p.enemyLoss ?? 0, allyLossText: Display.troopText(p.allyLoss ?? 0), enemyLossText: Display.troopText(p.enemyLoss ?? 0), counter: !!p.counter, lines: (p.effectLines ?? []).slice(0, 4)};
}
/**
 * 공개 연출 사건(규약 1.2 events): 명령 전후 공개 모델끼리만 견줘 만든다 — 숨은 정보 없음. 사건 ID = '<revision>:<순번>'(중복 재생 막기).
 * move = 보이던 부대가 다른 칸으로(내 명령이면 command 의 목적지, 경로는 armyOptions 의 path) · attack = 내 공격 명령 · loss = 병력 감소 · gone = 보이지 않게 됨.
 */
function publicEvents(revision, before, after, changes, command) {
  const was = new Map(before.units.map((u) => [u.id, u])), out = [];
  const push = (e) => out.push({eventId: `${revision}:${out.length}`, ...e});
  if (command.type === 'ATTACK_UNIT' || command.type === 'ATTACK_CITY') push({kind: 'attack', armyId: command.armyId, targetId: command.targetId ?? command.cityId});
  for (const u of after.units) { const w = was.get(u.id); if (w && w.tileId !== u.tileId) push({kind: 'move', armyId: u.id, from: w.tileId, to: u.tileId, own: u.own}); }
  for (const c of changes) push(c.gone ? {kind: 'gone', armyId: c.id} : {kind: 'loss', armyId: c.id, delta: c.delta, deltaText: c.deltaText});
  return out;
}
/** 명령 전후 공개 모델끼리의 병력 변화(둘 다 보이는 부대만) + 사라진 부대(전멸 · 시야 밖 구분 없이 '보이지 않음'). */
/**
 * 교전 연출 종류(웹 world.js animateCombat 1007~1019 의 갈래 그대로 — 표현만, 수치 없음): melee = 근접 공방(박자마다 병력이 줄어듦 · animateMapMelee465),
 * 아니면 접촉 한 번(animateMapFeel) — ranged = 화살 · charge = 돌격 · counter = 반격. 병력 수는 공개 모델 전후(changes)로만 — 엔진 기록 수(가짜 깃발 등)를 내보내지 않음.
 */
function combatFeel(before, c) {
  if (!c?.attackerId || !c.targetId) return null;
  const a = before.armies[c.attackerId], troop = Adapters.troopToCampaign(a?.troopType);
  const meleeCandidate = !c.tacticName && !c.charge && !['APPROACH_FIRE', 'PURSUIT', 'TACTIC_EFFECT', 'CITY', 'CITY_STRIKE'].includes(c.kind);
  const melee = meleeCandidate && ['BT01', 'BT02', 'BT04'].includes(troop);
  const from = a?.tileId, to = c.fromTileId ?? before.armies[c.targetId]?.tileId;
  const gap = (() => { if (!from || !to) return 1; const [q1, r1] = from.split(',').map(Number), [q2, r2] = to.split(',').map(Number); return (Math.abs(q1 - q2) + Math.abs(r1 - r2) + Math.abs(q1 + r1 - q2 - r2)) / 2; })();
  const ranged = (troop === 'BT03' || a?.troopType === 'horseArcher' && gap > 1) && c.kind !== 'PURSUIT';
  // side = 정면/측면/후방(FRONT · FLANK · REAR — 웹 예고 · 결과에 이미 보이는 값) · rout = 이 교전으로 패주 · 대열 무너짐이 된 부대(웹 feel rout)
  const rout = [...new Set([...(c.moraleChanges ?? []).filter((e) => e.to === 'ROUTING').map((e) => e.armyId), ...(c.formationChanges ?? []).filter((e) => e.to === 'BROKEN').map((e) => e.armyId)])];
  return {attackerId: c.attackerId, targetId: c.targetId, melee, ranged: !melee && ranged, charge: !melee && !!c.charge, counter: !!c.counter, brake: troop === 'BT04' && Adapters.troopToCampaign(before.armies[c.targetId]?.troopType) === 'BT02', side: c.side ?? null, rout};
}
function unitChanges(before, after) {
  const now = new Map(after.units.map((u) => [u.id, u])), out = [];
  for (const u of before.units) {
    const n = now.get(u.id);
    if (!n) { if (!u.remembered) out.push({id: u.id, name: u.name, own: u.own, gone: true}); continue; }
    if (Number.isFinite(u.count) && Number.isFinite(n.count) && n.count !== u.count) out.push({id: u.id, name: u.name, own: u.own, delta: n.count - u.count, deltaText: Display.troopDelta(n.count - u.count)});
  }
  return out;
}
function dateText(turn) { const n = turn - 1; return `${190 + Math.floor(n / 36)}년 ${Math.floor((n % 36) / 3) + 1}월 ${['상순', '중순', '하순'][n % 3]}`; }
/** 이번 차례 공개 교전 한 줄씩(view.combatFeedback — 숨은 부대는 엔진이 이미 걸러 냄). */
function combatLines(v, units) {
  const name = (id) => units.find((u) => u.id === id)?.name ?? v.ownCities?.[id]?.name ?? v.knowledge?.cities?.[id]?.name ?? '알 수 없음';
  return (v.combatFeedback ?? []).flatMap((e) => (e.targetLosses ?? []).map((r) => { const loss = r.count ?? r.loss ?? null; return {sequence: e.sequence, targetId: r.targetId, target: name(r.targetId), loss, lossText: Number.isFinite(loss) ? Display.troopText(loss) : null}; })).slice(-6);
}

export function errorBody(e) {
  const code = e instanceof PortError ? e.code : e instanceof Error ? e.message : String(e);
  return {code, message: MESSAGES[code] ?? code, ...(e instanceof PortError && e.detail !== undefined ? {detail: e.detail} : {})};
}

/** 요청 한 개 처리 — 실패해도 판은 바뀌지 않는다(step 은 새 state 를 돌려줄 때만 바꾼다). */
export function handle(session, req) {
  switch (req?.cmd) {
    case 'hello': return {protocol: PROTOCOL, protocolVersion: PROTOCOL_VERSION, node: process.version, runtime: 'prototype/src/campaign-runtime.mjs', turnLimit: R.CAMPAIGN_TURN_LIMIT, hasCampaign: !!session.state};
    case 'new': return session.newGame(req);
    case 'view': return session.snapshot(req.full !== false);
    case 'public': return session.publicParts(req.parts);
    case 'armyOptions': return session.armyOptions(req.armyId);
    case 'faceToward': return session.faceToward(req.armyId, req.tileId);
    case 'abilities': return session.abilities(req.armyId);
    case 'undoMove': return session.undoMove();
    case 'lens': return session.lens(req.kind);
    case 'facilitySites': return session.facilitySites(req.cityId, req.kind);
    case 'route': return session.route(req.armyId, req.points);
    case 'sortieOptions': return session.sortieOptions(req.cityId);
    case 'stratagemOptions': return session.stratagemOptions();
    case 'saveInfo': return session.saveInfo(req.text);
    case 'draft': return session.draftStart(req);
    case 'draftLock': return session.draftStep((d) => Draft.lockDraftOfficer(d, req.officerId));
    case 'draftReroll': return session.draftStep((d) => Draft.rerollOfficerDraftFixing(d, req.searchOwnerId === undefined ? {} : {searchOwnerId: req.searchOwnerId}));   // 다시 뽑으면 그때까지 고른 장수 고정(사용자 10-25)
    case 'draftUnlock': return session.draftStep((d) => Draft.unlockDraftOfficer(d, req.officerId));   // 고정 전 고르기 취소
    case 'draftConfirm': return session.draftConfirm();
    case 'scene': return session.fixture(req.name);   // hud-host 의 'fixture'(c464)와 이름이 겹치지 않게
    case 'step': return session.step(req.command, req.expectedRevision ?? req.base_revision);
    case 'save': return session.save();
    case 'load': return session.load(req.text);
    default: throw new PortError('BAD_REQUEST', req?.cmd);
  }
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const session = new PortSession();
  const send = (obj) => out(JSON.stringify(obj) + '\n');
  send({id: null, event: 'ready', protocol: PROTOCOL, protocolVersion: PROTOCOL_VERSION, session: session.sessionId, node: process.version});
  const rl = createInterface({input: process.stdin, crlfDelay: Infinity});
  rl.on('line', (line) => {
    if (!line.trim()) return;
    let req;
    try { req = JSON.parse(line); } catch { send({id: null, ok: false, error: errorBody(new PortError('BAD_REQUEST', 'json'))}); return; }
    if (req.cmd === 'quit') { send({id: req.id ?? null, ok: true}); rl.close(); return; }
    const t0 = performance.now();
    try { const body = handle(session, req); send({id: req.id ?? null, ok: true, session: session.sessionId, ms: Math.round(performance.now() - t0), ...body}); }
    catch (e) { console.error(`[host] ${req.cmd} 실패:`, e instanceof PortError ? e.code : e instanceof Error ? e.stack : e); send({id: req.id ?? null, ok: false, error: errorBody(e)}); }
  });
  // 입력이 닫히면(quit · Godot 종료) 남은 출력을 비운 뒤 끝낸다.
  rl.on('close', () => out('', () => process.exit(0)));
}
