// @ts-check
// 고도 UI/UX 방 (Claude, 2026-10-25) — 성장(레벨업 · 특기 고르기) 모델. **웹 그대로**(사용자 10-25 "성장(특기 선택) · 출진 편성 화면은 예전 것이 더 나은 듯").
// 원본 = 웹 world.js renderGrowthDraft(2089~2140) · growthRecommendation · growthQueue · growthPlan · draftDescription(295) — world.js 안 지역 함수는 같은 식을 옮겨 적음(줄 표시).
// 글 · 그림은 웹과 같은 함수(hud-ink levelupReadout · levelupQueue · levelupArtCategory · LEVELUP_ASSETS · draftTraitUseText · growthUseText · abilityName356)에서.
// 명령: 고르기 확정 = {type:'DRAFT_PICK', draftId, traitId, resolution, tacticId}(웹 growthPlan 그대로 — 특기 칸이 차면 합치기) · 카드 다시 뽑기 = {type:'DRAFT_REROLL', draftId, traitId}.
import {resolve} from '../../../../tools/port/web/shims/node-path.mjs';
import {pathToFileURL} from '../../../../tools/port/web/shims/node-url.mjs';
import {ROOT, officerArt, artHead} from './hud-model.mjs';
import {cardDescription, playerText} from './officer-model.mjs';

const load = (p) => import(pathToFileURL(resolve(ROOT, p)).href);
const [R, Hud, G, C29, Effects] = await Promise.all([
  load('prototype/src/campaign-runtime.mjs'), load('prototype/app/world/hud-ink.mjs'), load('prototype/src/campaign-growth.mjs'),
  load('prototype/src/campaign-c29.mjs'), load('prototype/src/campaign-effects.mjs'),
]);
const STAT_NAMES = {leadership: '지휘', might: '무용', strength: '무용', intelligence: '지략', politics: '정무', charisma: '감화'};
const rel = (u) => String(u ?? '').replace(/^\//, '');

// world.js:2070 growthRecommendation
function recommend(state, p) {
  const r = state.campaignGrowth.officers[p.officerId];
  return p.draft.promotion ? p.cards[0]?.traitId : C29.c29AiChoice(r, p.draft, G.rankCampaignAiDraft(r, p.draft.offeredIds)) ?? p.cards[0]?.traitId;
}
// world.js:2069 growthQueue — 이번 차례 레벨업이 걸린 장수마다 하나
function queue(state) {
  return Object.entries(state.campaignGrowth?.officers ?? {}).flatMap(([id, r]) => {
    const p = G.pendingCampaignDraft({...state, campaignGrowth: {...state.campaignGrowth, officers: {[id]: r}}});
    return p ? [p] : [];
  });
}
// world.js:2071 growthPlan — 고른 카드로 낼 명령(특기 칸이 차면 낮은 단계 둘 합치기 · 전법 변형은 묶을 전법)
export function growthPlan(state, p, traitId) {
  const r = state.campaignGrowth.officers[p.officerId];
  const preview = structuredClone(state), resolution = [], notes = [];
  while (G.needsTraitResolution(preview, p.officerId, traitId)) {
    const traits = Effects.officerEffectCards(preview, p.officerId).filter((c) => !c.core).sort((a, b) => a.rank - b.rank || a.traitId.localeCompare(b.traitId));
    if (traits.length < 2) break;
    const merge = {mode: 'merge', keepId: traits[0].traitId, removeId: traits[1].traitId};
    notes.push(`${traits[0].name} + ${traits[1].name} 합치기`); resolution.push(merge); G.resolveTraitSpace(preview, p.officerId, merge);
  }
  const tacticId = r.cards[traitId]?.modifier ? C29.c29BindingTargets(state, p.officerId, r.cards[traitId])[0] : undefined;
  if (tacticId) notes.push(`${r.cards[tacticId]?.name ?? tacticId}에 묶기`);
  return {type: 'DRAFT_PICK', draftId: p.draft.draftId, traitId, resolution, ...(tacticId ? {tacticId} : {}), notes};
}
// world.js:295 draftDescription(각성 STEADY_UP 수치 비교는 생략 — 각성 카드는 본문 글)
function description(state, c, id) {
  if (c.kind === 'awakening') return playerText(c.text || '이 특기의 수치가 한 단계 오른다');
  const text = c.rank ? Hud.levelupUpgradeText(c, (card) => cardDescription(state, C29.c29CoreCard(state, id, card), id)) : cardDescription(state, C29.c29CoreCard(state, id, {...c, rank: 1}), id);
  return text + (Effects.cardEffectPending(c) ? ' · 효과 준비 중' : '');
}

/** 성장 화면 모델. pick = 고른 카드(traitId) — 없으면 고르지 않은 상태(웹 draftPick) */
export function growthModel(state, {pick = null} = {}) {
  const p = G.pendingCampaignDraft(state);
  if (!p) return null;
  const id = p.officerId, r = state.campaignGrowth.officers[id], level = p.draft.contextSnapshot.levelAfter, officer = state.officers[id];
  const v = R.view(state), g = Hud.levelupReadout(state.campaignGrowth.log, id, state.turn, level);
  const rec = recommend(state, p);
  if (pick && !p.cards.some((c) => c.traitId === pick)) pick = null;
  const c28 = p.draft.c28, bonus = c28?.bonusRerolls ?? 0, orderRerolls = v.orders?.rerolls ?? 0;
  const vo = v.officers[id], army = Object.values(v.ownArmies).find((a) => a.commanderId === id);
  const use = (c) => Hud.draftTraitUseText(c, vo?.growth) || Hud.growthUseText(c, {field: !!army, governor: Object.values(v.ownCities).some((city) => city.governorId === id)}) || '';
  const cards = p.cards.map((c) => {
    const left = (c.rerollsRemaining ?? 0) + bonus + orderRerolls;
    return {
      id: c.traitId, picked: c.traitId === pick, rec: c.traitId === rec, slot: c28 ? c.slot ?? '' : null,
      kind: (c.kind === 'awakening' ? `각성 · ${{steady: '정석', narrative: '서사', wild: '변칙'}[c.branch] ?? ''}` : c.kind === 'fork' ? '갈래' : c.modifier ? '전법 변형' : {stat: '능력', trait: '특기', tactic: '전법'}[c.kind] ?? '특기') + ' · ',
      grade: G.CAMPAIGN_RARITY_NAMES[c.rarity] ?? c.rarity, rarity: c.rarity,
      art: rel(Hud.LEVELUP_ASSETS.art[Hud.levelupArtCategory(c)]), name: Hud.abilityName356(c), cardName: c.name ?? '',
      origin: c.origin ?? c.formerName ?? '', text: description(state, c, id), use: use(c),
      reroll: c28 ? {text: `다시 뽑기 · ${c.rerollsRemaining ?? 0}${bonus ? ` (+${bonus})` : ''}${orderRerolls ? ` · 군령 +${orderRerolls}` : ''}`, ok: left >= 1} : null,
      command: growthPlan(state, p, c.traitId),
    };
  });
  const limit = p.draft.rerollLimit ?? 1;
  const picked = cards.find((c) => c.picked);
  return {
    screen: 'growth', officerId: id, draftId: p.draft.draftId, promotion: !!p.draft.promotion,
    title: p.draft.c29?.awakening ? `각성 · Lv ${level}` : `성장 · Lv ${g.before} → ${g.after}`,
    stats: g.stats.map((s) => ({key: s.key, name: STAT_NAMES[s.key] ?? s.key, before: s.before, after: s.after, delta: s.delta})),
    reason: g.reason ?? '',
    status: (officer.injury ? `부대가 무너졌습니다 — ${officer.name} 중상 · ${Hud.injuryReturnText(state.turn, vo?.injury)}. ` : '')
      + (p.draft.c29?.awakening ? `고유 특기 각성 — ${p.cards.length}갈래 중 1개를 고르세요.`
        : `레벨업 — ${level % 5 === 0 ? '전법' : '특기'} ${p.cards.length}장 중 1장을 고르세요. ${level % 5 === 0 ? '얻은 전법의 장착 상태는 장수 정보에서 확인하세요.' : '보유에 추가 · 빈 칸이 있으면 자동 장착합니다. 같은 특기는 최대 5단계까지 강해집니다.'}`),
    queueText: Hud.levelupQueue(state, id), auto: '자동 고르기', autoPick: rec,
    queue: queue(state).map((q) => ({officerId: q.officerId, name: state.officers[q.officerId]?.name ?? q.officerId, draftId: q.draft.draftId,
      // 웹: 아래 줄 단추의 '고름'은 따로 기억(c282GrowthPicks)하고 없으면 추천 — 카드를 눌러도 여기는 추천 그대로
      cards: q.cards.map((c) => ({id: c.traitId, name: c.name, rec: recommend(state, q) === c.traitId, on: recommend(state, q) === c.traitId})),
      notes: growthPlan(state, q, q.officerId === id ? pick ?? recommend(state, q) : recommend(state, q)).notes})),
    cards,
    reroll: c28 ? null : {text: (p.draft.rerollCount >= limit ? '다시 뽑기 사용 완료' : `다시 뽑기 · ${limit - p.draft.rerollCount}회`) + (orderRerolls ? ` · 군령 +${orderRerolls}` : ''),
      ok: !((!orderRerolls && (p.draft.rerollCount >= limit || r.track.growthStates[id].aptitudePoints < 1)) || p.draft.eligibleCandidateSnapshot.filter((c) => !p.draft.offeredIds.includes(c.traitId)).length < 1)},
    officer: {name: officer.name, lv: `Lv ${g.before} → ${g.after}`, potential: r.potential ?? '', art: officerArt(id), head: artHead(officerArt(id))},
    confirm: picked ? `${picked.cardName} 선택 확정` : '카드를 고르세요', confirmOk: !!picked,
    assets: {bg: rel(Hud.LEVELUP_ASSETS.background), strip: rel(Hud.LEVELUP_ASSETS.parts['stat-strip']), card: rel(Hud.LEVELUP_ASSETS.parts.card), cardOn: rel(Hud.LEVELUP_ASSETS.parts['card-on']),
      seal: rel(Hud.LEVELUP_ASSETS.parts['seal-select']), confirm: rel(Hud.LEVELUP_ASSETS.parts['btn-confirm']), plate: 'assets/ui-v3/hud/draft-name-plate.png'},
  };
}

/** 견본: 웹 web-port-fixture 'growth' 와 같은 판(seed 489 · 조조 · 시작 성 고정 · 지도 위 부대) + 첫 부대장에게 실적 → 레벨업 한 번 */
export function growthSample({amount = 120} = {}) {
  let s = R.createCampaign({factionId: 'F01', seed: 489, startCities: 'fixed', fieldArmies: true, council: false, c31: false, manualEndTurn: true});
  for (let n = 0; s.phase === 'AI' && !s.gameResult && n < 500; n++) s = R.step(s, {type: 'ADVANCE_AI'});
  if (s.ambitions) s.ambitions.closed = true;
  if (s.runModifiers?.blessing) s.runModifiers.blessing.closed = true;
  s.prologue = null;
  const v = R.view(s), id = Object.values(v.ownArmies)[0]?.commanderId ?? v.faction.rulerId;
  G.creditCampaignGrowth(s, {eventId: 'port-growth', officerId: id, kind: 'DAMAGE', amount, fixed: true});
  return s;
}
