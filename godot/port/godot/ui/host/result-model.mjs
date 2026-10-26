// @ts-check
// 고도 UI/UX 방 (Claude, 2026-10-24) — 화면 ⑦ 교전 결과(한 줄 판) 모델.
// 설계: docs/work-integration/20261023/screen-mockups/06-result/DESIGN.md(개발총괄 방 · 지도형).
// 값: 엔진 확정 기록 state.lastCombat(웹 world.js animateCombat 이 읽는 것) + 웹 hud-ink battleResultRows292(줄 · 병력 글). 규칙 계산 없음.
import {momentModel} from './gap2-model.mjs';
import {resolve} from '../../../../tools/port/web/shims/node-path.mjs';
import {pathToFileURL} from '../../../../tools/port/web/shims/node-url.mjs';
import {ROOT, officerArt, artHead} from './hud-model.mjs';

const load = (p) => import(pathToFileURL(resolve(ROOT, p)).href);
const [R, Hud, MapModel] = await Promise.all([load('prototype/src/campaign-runtime.mjs'), load('prototype/app/world/hud-ink.mjs'), load('prototype/src/campaign-map-model.mjs')]);
const SIDE = {FRONT: '정면', FLANK: '측면', REAR: '후방'};
// hud-ink.mjs:372 과 같은 낱말 · 무거운 상태(기호만 위험색 — 설계 §6)
const LABEL = {ORDERED: '정돈', DISORDERED: '흐트러짐', BROKEN: '붕괴', STEADY: '안정', SHAKEN: '동요', ROUTING: '패주'};
const ICON = {ORDERED: 'formation-ordered', DISORDERED: 'formation-disordered', BROKEN: 'formation-broken', STEADY: 'morale-steady', SHAKEN: 'morale-shaken', ROUTING: 'morale-broken'};
const HEAVY = new Set(['BROKEN', 'ROUTING']);
// 설계 §6 배지 순서: 격파 · 함락 > 패주 > 붕괴 · 성벽 파괴 > 동요 > 흐트러짐 > 돌아섬
const RANK = {ELIM: 0, ROUTING: 1, BROKEN: 2, SHAKEN: 3, DISORDERED: 4, TURNED: 5};

/** 견본 장면(설계서 §6 기본): c464 판 · 황충(궁병) → 조운(창병) 거리 2 정면 사격. 조운 자리(8,3)는 hud-host 의 'c464-result' 견본이 놓는다. */
export function resultScene(fixtureState) {
  const s = fixtureState;
  const target = Object.values(s.armies).find((a) => a.commanderId === 'G02');
  const attacker = Object.values(s.armies).find((a) => a.commanderId === 'G06') ?? s.armies['U-F01-G24'];
  const before = structuredClone(s);
  const after = R.step(s, {type: 'ATTACK_UNIT', armyId: attacker.armyId, targetId: target.armyId});
  return {before, after, combat: after.lastCombat, attackerId: attacker.armyId};
}

export function resultModel(before, after, c) {
  const bv = R.view(before), av = R.view(after);
  const commander = (id) => (bv.ownArmies[id] ?? bv.knowledge?.observedArmies?.[id])?.commanderId;
  const units = MapModel.campaignMapModel(bv).units.map((u) => ({...u, portrait: officerArt(commander(u.id)), engineId: bv.officers[commander(u.id)]?.engine?.engineId, isRuler: !!bv.officers[commander(u.id)] && before.factions[bv.officers[commander(u.id)].allegianceFactionId]?.rulerId === commander(u.id)}));
  const captured = (c.units ?? []).flatMap(row => {
    const id = commander(row.unitId);
    return av.officers[id]?.captivityState === 'PRISONER' && bv.officers[id]?.captivityState !== 'PRISONER' && units.some(u => u.id === row.unitId) ? [row.unitId] : [];
  });
  const rows = Hud.battleResultRows292(c, units);
  // 실적(world.js animateCombat 과 같은 비교 — 내 부대 계통 실적이 늘었으면)
  const merits = [];
  for (const a of Object.values(bv.ownArmies)) for (const m of av.ownArmies[a.armyId]?.engine?.merits ?? []) {
    const old = a.engine?.merits?.find((x) => x.id === m.id)?.count ?? 0;
    if (m.count > old) merits.push(m.count >= m.goal ? '2차 전직 가능' : `실적 +${m.count - old} · ${m.count}/${m.goal}`);
  }
  const badges = (id) => {
    const out = [];
    if ((c.eliminatedIds ?? []).includes(id)) out.push({key: 'ELIM', label: '격파', icon: 'morale-broken', heavy: true});
    for (const x of [...(c.moraleChanges ?? []), ...(c.formationChanges ?? [])].filter((x) => x.armyId === id))
      out.push({key: x.to, label: LABEL[x.to] ?? x.to, icon: ICON[x.to] ?? 'formation-disordered', heavy: HEAVY.has(x.to)});
    if (c.facingTurned && id === c.targetId) out.push({key: 'TURNED', label: '돌아섬', icon: 'formation-disordered', heavy: false});
    return out.sort((a, b) => (RANK[a.key] ?? 9) - (RANK[b.key] ?? 9)).slice(0, 2);
  };
  const block = (r) => {
    const id = commander(r.id);
    return {id: r.id, name: r.name, art: officerArt(id), head: artHead(officerArt(id)), before: r.before, after: r.after,
      loss: r.loss === '0' ? null : `−${r.loss}`, badges: badges(r.id), color: units.find((u) => u.id === r.id)?.color ?? null};
  };
  const att = rows.find((r) => r.id === c.attackerId), tgt = rows.find((r) => r.id === c.targetId);
  return {
    moment: momentModel({...c, uiCapturedIds: c.uiCapturedIds ?? captured}, units),
    screen: 'result', side: SIDE[c.side] ?? '', counter: !!c.counter,
    attacker: att ? block(att) : null, target: tgt ? block(tgt) : null,
    extra: [...merits, ...(c.supplyLoot ? [`군량 노획 +${c.supplyLoot}`] : [])],
    text: Hud.combatResultText(c, units),
  };
}
