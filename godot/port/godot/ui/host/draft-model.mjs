// @ts-check
// 고도 UI/UX 방 (Claude, 2026-10-25) — 드래프트(함께 깨어날 동료 고르기) 화면 모델. **웹 그대로**(사용자 10-25 "드래프트가 고도판에 도입 안 돼 있다").
// 원본 = 웹 prototype/app/world/officer-draft-ui.mjs(c404-v6 kit) — draftOfficerBriefs · draftDetailMarkup · draftWakeMarkup · draftBudgetMarkup · stoneHeadStyle.
// 그 파일은 브라우저 주소(/src/…)로 엔진을 불러 node 에서 바로 못 읽어, 같은 엔진 함수로 같은 값을 만든다(줄마다 출처).
// 입력 = 고도 이식 방 호스트 드래프트 응답({draft: officerDraftView, factionId, seed, locked?}) — 규칙은 엔진(campaign-officer-draft)만.
import {resolve} from '../../../../tools/port/web/shims/node-path.mjs';
import {pathToFileURL} from '../../../../tools/port/web/shims/node-url.mjs';
import {existsSync, readFileSync} from '../../../../tools/port/web/shims/node-fs.mjs';
import {ROOT, officerArt, artHead} from './hud-model.mjs';

const load = (p) => import(pathToFileURL(resolve(ROOT, p)).href);
const [R, G, Eng, Hud, Draft, China] = await Promise.all([
  load('prototype/src/campaign-runtime.mjs'), load('prototype/src/campaign-growth.mjs'), load('prototype/src/campaign-engines.mjs'),
  load('prototype/app/world/hud-ink.mjs'), load('prototype/src/campaign-officer-draft.mjs'), load('prototype/src/campaign-china12.mjs'),
]);
const readJson = (rel) => { try { return JSON.parse(readFileSync(resolve(ROOT, rel), 'utf8')); } catch { return {}; } };
const PITCH = readJson('prototype/data/officer-pitch-v0.1.json');
const STONE = readJson('prototype/assets/officer-art/stone/index.json').files ?? {};
const STATS = ['지휘', '무용', '지략', '정무', '감화'];
const TROOP = {militia: ['sword', '도'], spear: ['spear', '창'], bow: ['bow', '궁'], cavalry: ['cavalry', '기']};   // officer-draft-ui draftTroop
const REASON = {
  BOND: '옛 인연이 먼저 부른다', NEED_GOVERN: '다스릴 사람이 비어 있다', NEED_COMMAND: '군을 맡길 사람이 비어 있다', NEED_MIGHT: '앞장설 사람이 비어 있다',
  NEED_INTELLECT: '꾀를 낼 사람이 비어 있다', NEED_CHARISMA: '사람을 모을 이가 비어 있다', WANDER: '떠돌다 이 땅에 닿았다',
};
const GIMMICK = {
  F01: '조조 — 더 많이 보고 필요한 사람을 고른다 · 다시 부르기가 한 번 더 있다',
  F02: '유비 — 인연이 인연을 부른다 · 깨운 사람의 옛 벗이 더 잘 나타난다',
  F03: '손권 — 찾는 일을 맡긴다 · 아래 얼굴을 눌러 맡길 사람을 정하고 다시 부른다',
};
// <picture> 는 브라우저가 <source srcset> 을 먼저 고름 → srcset → src → url( 순서
let RULER = null;   // 고른 군주(briefs 가 채움 — 부르는 장면 · 출정 장면 · 손권 맡기기)
const src = (html) => { const h = String(html ?? ''); return (/srcset="\/?([^"]+\.(?:png|webp))/.exec(h) ?? /(?:src="|url\(['"]?)\/?([^"')]+\.(?:png|webp))/.exec(h))?.[1] ?? ''; };

// officer-draft-ui draftOfficerBriefs — 실제 출정과 같은 초기화에서 지금 가진 카드만 읽음
const PREVIEW_CACHE = new Map();
let previewScope = '';
let PREVIEW_BASE = null;   // C575: China preview world for the current scope
function useScope(factionId, seed, map, ch) {
  const scope = JSON.stringify([factionId, seed, map, ch]);
  if (scope !== previewScope) { PREVIEW_CACHE.clear(); PREVIEW_BASE = null; RULER = null; previewScope = scope; }
}
const makePreview = (factionId, seed, companions, map, ch) => R.createCampaign({factionId, seed, companions, map, fieldArmies: false, trialRules: {domesticV3: true, ...(ch ? {china12: true, flow: 'v1'} : {})}});
const chinaPreviewBase = (factionId, seed) => makePreview(factionId, seed, Draft.officerDraftPool({factionId, mapId: 'china', china12: true, seed}).sort((a, b) => a.cost - b.cost || a.officerId.localeCompare(b.officerId)).slice(0, 2).map((c) => c.officerId), 'china', true);
/** C575: build the China draft preview ahead (the host calls this while the guide screen is open). */
export function warmDraftPreview({factionId, seed, map = 'china', china12 = map === 'china'} = {}) {
  if (map !== 'china' || !china12) return;
  useScope(factionId, seed, map, true);
  PREVIEW_BASE ??= chinaPreviewBase(factionId, seed);
}
function briefs(factionId, seed, cards, map = 'v3', china12 = false) {
  // 중국 12세력 판(10-31 사용자 '중국판 드래프트가 안 나오네')은 같은 지도로 미리보기 — v3 로 만들면 중국 장수가 INVALID_COMPANIONS,
  // 다섯을 한 번에 넣으면 그릇(DRAFT_BUDGET)을 넘으므로 장수마다 '그 장수 + 가장 싼 다른 카드' 둘로 만든 판에서 읽는다(같은 세력 · 시드 · 캐시).
  const ch = map === 'china' && china12;
  const ids = cards.map(c => c.officerId);
  if (!ids.length) throw new Error('DRAFT_EMPTY');
  useScope(factionId, seed, map, ch);
  const make = (companions) => makePreview(factionId, seed, companions, map, ch);
  const costOf = Object.fromEntries(cards.map((c) => [c.officerId, c.cost ?? 0]));
  // C575: one China preview per (faction · seed) — the two cheapest pool cards — then each card officer is moved from the
  // preview's wanderers into the faction and given its growth record and engine, as applyChinaDraft does. A card used to
  // build a whole China world (about 3 seconds each); now about 20 ms. The real campaign is still made from the confirmed picks.
  const previewFor = ch
    ? (id) => {
      const p = PREVIEW_BASE ??= chinaPreviewBase(factionId, seed);
      if (!p.officers[id]) {
        const o = p.wanderers?.[id];
        if (!o) throw new Error('DRAFT_PREVIEW_OFFICER');
        delete p.wanderers[id];
        Object.assign(o, {allegianceFactionId: factionId, locationRef: {kind: 'CITY', id: p.factions[factionId].capitalCityId}});
        p.officers[id] = o;
        G.initializeCampaignGrowth(p, China.chinaDraftPacks()); Eng.initializeEngines(p);
      }
      return p;
    }
    : (() => { let p; return () => p ??= make(ids); })();
  return Object.fromEntries(ids.map((id) => {
    if (PREVIEW_CACHE.has(id)) return [id, PREVIEW_CACHE.get(id)];
    const preview = previewFor(id);
    const rid = preview.factions[factionId]?.rulerId;
    RULER = rid ? {id: rid, name: preview.officers[rid]?.name ?? rid, art: officerArt(rid) ?? '', head: artHead(officerArt(rid)) ?? {}} : null;
    const growth = G.campaignOfficerGrowth(preview, id);
    const core = growth?.cards.find((c) => c.traitId === `${id}.unique`);
    const sig = growth?.cards.find((c) => c.traitId === growth.signature?.traitId) ?? growth?.cards.find((c) => c.kind === 'tactic');
    const o = preview.officers[id], engine = Eng.engineView(preview, id);
    const d = {name: o?.name, officer: {officerId: id, name: o?.name}, army: {commanderId: id, troopType: o?.troopType, engine}};
    const brief = {
      engine: engine ? {id: engine.engineId, name: engine.name, icon: `assets/ui-kit/own/class-v1/${String(engine.engineId).toLowerCase()}.png`} : null,
      pitch: PITCH.pitches?.[id] ?? '',
      troops: (o?.multiTroopTrait?.troopTypes ?? [o?.troopType]).map((t) => TROOP[t]).filter(Boolean).map(([icon, short]) => ({icon: `assets/ui-kit/own/sym/troops/${icon}.webp`, short})),
      // 이름: 웹 mountDraftNames356 이 '고유 특기 · ' 줄만 새 이름(abilityName356)으로 바꿈 · 아이콘 = dockIcon327(그림 칸에 넘기는 값은 {name, text} 뿐 — 웹 brief 그대로)
      trait: {name: core ? Hud.abilityName356(core) : '준비 중', text: core?.text || '효과 설명 준비 중', icon: src(Hud.dockIcon327(d, 'passive', core ? {name: core.name, text: core.text} : {}))},
      tactic: {name: sig?.name ?? '준비 중', text: sig?.text || '효과 설명 준비 중', icon: src(Hud.dockIcon327(d, 'R', sig ? {name: sig.name, text: sig.text} : {}))},
      tacticE: (() => { const e = growth?.cards.find((c) => c.pilot && c.slot === 'E'); return e ? {name: e.name, text: e.text ?? ''} : null; })(),
    };
    // Keep only presentation data for this draft, never five entire China worlds.
    PREVIEW_CACHE.set(id, brief);
    return [id, brief];
  }));
}

/** 드래프트 화면 모델. res = 호스트 드래프트 응답({draft, factionId, seed, locked?}) */
export function draftModel(res) {
  const v = res.draft, factionId = res.factionId ?? v.gimmick?.factionId, seed = res.seed;
  const ids = v.cards.map((c) => c.officerId);
  const b = briefs(factionId, seed, v.cards, res.mapId ?? res.map ?? 'v3', !!res.china12);
  const locked = (res.locked ?? v.cards.filter((c) => c.locked).map((c) => c.officerId)).filter((id) => ids.includes(id));
  const cards = v.cards.map((c) => {
    const art = officerArt(c.officerId) ?? '', stone = STONE[c.officerId];
    const bust = `assets/officer-art/bust/${c.officerId}.webp`;
    return {
      id: c.officerId, name: c.name, cost: c.cost, locked: !!c.locked, lockBlocked: c.lockBlocked ?? null, home: !!c.home, reason: REASON[c.reasonCode] ?? REASON.WANDER,
      art, head: artHead(art) ?? {}, bust: existsSync(resolve(ROOT, 'prototype', bust)) ? bust : art,
      stone: stone ? {src: String(stone.src).replace(/^\//, ''), size: stone.size, head: stone.head} : null,
      stats: STATS.map((k) => ({k, v: c.stats?.[k] ?? null})),
      ...b[c.officerId],
    };
  });
  return {
    screen: 'draft', factionId, seed, title: '새 판 2/2 · 동료 고르기', gimmick: GIMMICK[factionId] ?? '',
    budget: v.budget, lockedCost: v.lockedCost, slots: v.slots ?? 5, locked, fixed: Array.isArray(res.fixed) ? res.fixed.filter((id) => ids.includes(id)) : null,   // 엔진이 고정한 사람(다시 뽑기 뒤 — 취소 못 함) · 없으면 null(화면이 기억)
    rerollsLeft: v.rerollsLeft, canReroll: !!v.canReroll,
    canConfirm: !!v.canConfirm, ended: !!v.ended, endReason: v.endReason ?? null,
    endNote: v.endReason === 'SLOTS_FULL' ? '다섯을 모두 깨웠다' : v.ended ? `그릇이 찼다 — ${['', '한 명', '두 명', '세 명', '네 명', '다섯 명'][locked.length]}과 함께 깨어난다` : '',
    canDelegate: !!v.gimmick?.canDelegate, owners: v.gimmick?.owners ?? [], ruler: RULER,
    sweep: `assets/ui-v3/hud/faction-sweep-${factionId}.webp`,
    cards,
    assets: {bg: 'assets/ui-v3/scenes/plate-draft.webp', hero: 'assets/ui-kit/own/screens-v6/draft/scene.png', costSeal: 'assets/ui-kit/own/screens-v6/draft/cost-seal.png',
      wake: 'assets/ui-kit/own/screens-v6/draft/primary-button.png', emptySeat: 'assets/ui-kit/own/screens-v6/draft/empty-seat.png', paper: 'assets/ui-kit/own/paper.webp',
      pine: 'assets/ui-kit/own/detail-d3/pine.webp', seal: 'assets/ui-kit/own/detail-d3/seal-tall.webp', prev: 'assets/ui-kit/own/sym/controls/prev.webp', emblem: `assets/ui-v3/emblems/${factionId}.png`},
  };
}

/** 견본(웹 web-port 실측과 같은 판): 조조 · seed 489 · lock = 깨울 카드 순번들 */
export function draftSample({factionId = 'F01', seed = 489, lock = []} = {}) {
  let d = Draft.createOfficerDraft({factionId, seed});
  for (const i of lock) d = Draft.lockDraftOfficer(d, d.offers[i]);
  return {draft: Draft.officerDraftView(d), factionId, seed, locked: [...d.locked]};
}
