// @ts-check
// 고도 UI/UX 방 (Claude, 2026-10-24) — 화면 ⑪ 계략 예고(대상을 고른 뒤) 모델.
// 설계: docs/work-integration/20261023/screen-mockups/19-stratagem/DESIGN.md(지도형 · 지도 위 띄움 판 1개).
// 값: 엔진 stratagemPreview · stratagemOptions · stratagems-v0.1.json + 웹 hud-ink chanceText462(확률 → 말). 규칙 계산 없음.
import {resolve} from '../../../../tools/port/web/shims/node-path.mjs';
import {pathToFileURL} from '../../../../tools/port/web/shims/node-url.mjs';
import {readFileSync} from '../../../../tools/port/web/shims/node-fs.mjs';
import {ROOT, officerArt, artHead} from './hud-model.mjs';

const load = (p) => import(pathToFileURL(resolve(ROOT, p)).href);
const [R, St, V, Hud] = await Promise.all([load('prototype/src/campaign-runtime.mjs'), load('prototype/src/campaign-stratagems.mjs'),
  load('prototype/src/campaign-vision.mjs'), load('prototype/app/world/hud-ink.mjs')]);
const RULES = JSON.parse(readFileSync(resolve(ROOT, 'prototype/data/stratagems-v0.1.json'), 'utf8'));
const ART = {RUMOR: 'rumor', SOW_DISCORD: 'discord', DISRUPT_SUPPLY: 'supply'};
const MORALE = {STEADY: '안정', SHAKEN: '동요', ROUTING: '패주'};

/** 견본 장면(설계 기준 자료 · c248 검증 손잡이 world.js ?c248fixture=1 의 대상 자리): 고정 시작 · 유비 부대 → 업 곁(-10,29). 순욱 → 유비 부대 이간.
 *  아군 부대는 대상 곁에 두지 않음 — 설계 §5 S4 '아군 부대는 그리지 않음(주인공 하나) · 화면 밖 또는 생략'. */
export function stratagemScene() {
  const s = R.createCampaign({startCities: 'fixed', council: false, c31: false, c42: false, c46: false, manualEndTurn: true});
  s.prologue = null; if (s.ambitions) s.ambitions.closed = true; if (s.runModifiers?.blessing) s.runModifiers.blessing.closed = true; s.turnSummary = null;
  s.armies['U-F01-G24'].tileId = '-11,23'; s.armies['U-F01-G07'].tileId = '-10,23';   // 시작 자리(-11,28 · 업 -12,29)는 대상 곁 — 화면 밖(북쪽 6칸)으로
  const t = s.armies['U-F02-G05']; t.tileId = '-10,29'; t.morale = 'STEADY'; t.facing = 1;
  V.updateCampaignKnowledge(s);
  return {state: s, cmd: {type: 'STRATAGEM', officerId: 'G04', kind: 'SOW_DISCORD', targetArmyId: 'U-F02-G05'}};
}

function effectText(kind, target) {
  const e = kind.effect;
  if (!target && kind.target === 'ARMY') return Hud.stratagemEffectText(kind);   // 대상 전: 일반 효과 글(웹과 같음)
  if (kind.id === 'SOW_DISCORD') return target?.morale === 'STEADY' ? `사기 안정 → ${MORALE[e.morale] ?? e.morale} · ${e.turns}차례` : `이미 ${MORALE[target?.morale] ?? '동요'} · 그대로`;
  if (kind.id === 'RUMOR') return `산출 −${Math.round((1 - e.outputMult) * 100)}% · 충원 멈춤 · ${e.turns}차례`;
  if (kind.id === 'DISRUPT_SUPPLY') return `휴대 군량 −${-e.carriedFood}차례분`;
  return kind.text;
}

/** cmd 에 대상이 없으면 '대상 전' 상태(성공 열 비움 · 실행 불가 + 사유). */
export function stratagemModel(state, cmd) {
  const f = state.playerFactionId, kind = RULES.kinds.find((k) => k.id === cmd.kind), o = state.officers[cmd.officerId];
  const opts = St.stratagemOptions(state, f), me = opts.find((x) => x.officerId === cmd.officerId);
  const hasTarget = !!(cmd.targetArmyId || cmd.targetCityId);
  const p = hasTarget ? St.stratagemPreview(state, cmd, f) : null;
  const army = cmd.targetArmyId ? state.armies[cmd.targetArmyId] : null, city = cmd.targetCityId ? state.cities[cmd.targetCityId] : null;
  const tile = (army ?? city)?.tileId, [q, r] = tile ? String(tile).split(',').map(Number) : [null, null];
  const targetName = army ? `${state.officers[army.commanderId]?.name ?? army.armyId} 부대` : city?.name ?? null;
  const blocked = p?.blockedReason ? Hud.stratagemReasonText(p.blockedReason) : !hasTarget ? '지도에서 대상을 고르세요' : null;
  return {
    screen: 'stratagem', kind: kind.id, title: `계략 · ${kind.name}`, art: `assets/ui-v3/u3/stratagem/art-${ART[kind.id]}.png`, repick: '다시 고르기',
    officer: {id: o.officerId, name: o.name, intelligence: me ? Math.round(me.intelligence) : null, art: officerArt(o.officerId), head: artHead(officerArt(o.officerId))},
    focus: (() => { const c = state.cities[o.locationRef?.id]; const [fq, fr] = String(c?.tileId ?? '0,0').split(',').map(Number); return {q: fq, r: fr}; })(),   // 대상 전 지도 중심 = 실행 장수가 있는 성
    target: hasTarget ? {id: cmd.targetArmyId ?? cmd.targetCityId, name: targetName, q, r, tag: '대상'} : null,
    // 대상 전: 고를 수 있는 후보(이 장수 · 이 종류 · 막히지 않은 것) — 지도에 가는 테두리(설계 §1 ③)
    candidates: hasTarget ? [] : (me?.choices ?? []).filter((c) => c.cmd.kind === kind.id).map((c) => c.cmd.targetArmyId ?? c.cmd.targetCityId),
    effect: effectText(kind, army), cost: `주 행동 1 · 재사용 대기 ${RULES.cooldown}차례`,
    chance: p && !p.blockedReason ? Hud.chanceText462(p.chance / 100) : null,
    exposure: p && !p.blockedReason ? (p.exposedRisk > 0 ? {risk: true, text: '실패하면 들킴', tip: '들키면 내 세력의 공개 위협 +10'} : {risk: false, text: '실패해도 들키지 않음'}) : null,
    blocked, cancel: '취소', go: '실행',
  };
}

/** 지도 층(map-model) — 계략 동안 고른 부대 없음(이동 범위 · 경로 · 예고 없음) + 대상 자리. */
export async function stratagemMap(state, st) {
  const {mapModel} = await import('./map-model.mjs');
  const map = mapModel(state, {selectedArmyId: null});
  map.selected = null; map.move = []; map.path = null; map.attacks = [];
  for (const u of map.units) u.selected = false;
  map.stratagem = st;
  return map;
}
