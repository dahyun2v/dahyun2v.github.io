// @ts-check
// 흑묵 화면의 효과음 — 녹음한 듯한 짧은 소리 파일(ogg)을 동작마다 낸다. 표시용(게임 규칙 아님).
// 사용자 2026-10-13 "배경음악이랑 효과음도 촘촘하게 넣어봐". 그때까지는 WebAudio 로 만든 짧은 신호음 세 가지(ui-sfx.mjs)와 옛 합성음뿐이었다.
// 소리 파일: prototype/assets/audio/sfx/{이름}.ogg (tools/art/sfx-prepare.py 가 만든다 — 로컬 Stable Audio 3 초안을 다듬은 것).
// 음량·음소거는 기존 소리 설정(pilotAudio.settings)을 그대로 따른다. 파일이 없거나 풀 수 없으면 그 소리만 조용히 건너뛴다.
//   연결: ① 명령 하나가 끝날 때 world.js 가 command(…) 를 부른다(이동 · 교전 · 함락 · 차례 …) ② 창이 열리고 닫히는 것 · 단추 누르기는 attach(document) 가 직접 듣는다.

/** @typedef {{gain:number, gap:number}} SfxDef  gain = 소리마다의 크기, gap = 같은 소리를 다시 내기까지의 최소 간격(ms) */
/** @type {Readonly<Record<string, SfxDef>>} */
export const SFX = Object.freeze({
  click: {gain: 0.55, gap: 45}, deny: {gain: 0.7, gap: 250}, 'paper-open': {gain: 0.9, gap: 160}, 'paper-close': {gain: 0.75, gap: 160},
  brush: {gain: 0.6, gap: 160}, stamp: {gain: 0.85, gap: 160}, select: {gain: 0.8, gap: 140},
  march: {gain: 0.8, gap: 500}, gallop: {gain: 0.95, gap: 500}, 'drum-hit': {gain: 0.9, gap: 400}, gong: {gain: 0.55, gap: 900},
  clash: {gain: 1, gap: 380}, arrows: {gain: 0.95, gap: 380}, charge: {gain: 0.95, gap: 380}, siege: {gain: 0.9, gap: 380}, tactic: {gain: 0.8, gap: 380},
  capture: {gain: 0.7, gap: 1500}, rout: {gain: 0.5, gap: 1500}, warhorn: {gain: 0.5, gap: 1500},
  gate: {gain: 0.75, gap: 500}, hammer: {gain: 0.85, gap: 300}, coins: {gain: 0.8, gap: 250}, muster: {gain: 0.8, gap: 500}, cup: {gain: 0.8, gap: 500},
  levelup: {gain: 0.75, gap: 700}, stone: {gain: 0.8, gap: 500}, guqin: {gain: 0.75, gap: 600},
  // 10-15 사용자 "교전 효과음이 너무 구림 — 함성 · 병기 부딪히는 소리 · 돌진 소리, 타격감", "화계 불타는 소리", "성 화면에 사람 소리"
  warcry: {gain: 0.6, gap: 900}, 'charge-rumble': {gain: 0.8, gap: 900}, 'clash-heavy': {gain: 0.85, gap: 120}, impact: {gain: 0.9, gap: 120},
  melee: {gain: 0.5, gap: 700}, 'tactic-boom': {gain: 0.9, gap: 600}, 'fire-ignite': {gain: 0.9, gap: 600}, 'fire-burn': {gain: 0.55, gap: 900},
  'town-ambience': {gain: 0.32, gap: 0},
});
/** 맞는 순간의 소리에 겹쳐 내는 소리: [이름, 늦춤(ms), 크기 배율]. 한 소리만으로는 '쾅' 하나라 얇다 — 금속(병기) · 묵직한 타격 · 이어지는 난전을 겹친다.
 * @type {Readonly<Record<string, [string, number, number][]>>} */
export const SFX_LAYERS = Object.freeze({
  clash: [['clash-heavy', 0, 1], ['impact', 30, 0.9], ['melee', 160, 0.8]],
  charge: [['impact', 0, 1], ['clash-heavy', 60, 0.9], ['melee', 220, 0.8]],
  siege: [['impact', 0, 0.8]],
  tactic: [['tactic-boom', 0, 1]],
});
/** 되풀이해 트는 소리(이어 틀기 · 서서히 켜고 끔). 창 id → 소리 */
export const LOOP_PANELS = Object.freeze({'city-stage': 'town-ambience'});
/** 이름에 불이 든 전법(화계 · 화공 · 화시 …) */
export const fireTactic = (/** @type {unknown} */ name) => /화계|화공|화시|화우|화염|불|火|fire/i.test(String(name ?? ''));
const BASE = '/assets/audio/sfx/';

/** 병종 → 움직일 때 · 칠 때의 소리. 특수 병종(투석기 등)은 이름에 든 글자로 가른다. @param {unknown} troop */
export function troopSounds(troop) {
  const t = String(troop ?? '');
  if (/BT04|caval|horse/i.test(t)) return {move: 'gallop', hit: 'charge'};
  if (/BT03|bow|archer|crossbow/i.test(t)) return {move: 'march', hit: 'arrows'};
  if (/catapult|ram|siege/i.test(t)) return {move: 'march', hit: 'siege'};
  return {move: 'march', hit: 'clash'};
}

/** 명령 하나가 끝난 뒤 낼 소리들: [이름, 늦춤(ms), 크기 배율]. 순수 함수 — 테스트용으로 밖에 둔다.
 * @param {{request:any, before:any, state:any, combat:any, deferImpact?:boolean, visible?:(armyId:string)=>boolean}} c
 * @returns {[string, number, number][]} */
export function commandSounds({request, before, state, combat, deferImpact = false, visible = () => true}) {
  /** @type {[string, number, number][]} */ const out = [];
  const type = request?.type, me = state?.playerFactionId, ai = type === 'ADVANCE_AI';
  const army = (/** @type {string|undefined} */ id) => state?.armies?.[id ?? ''] ?? before?.armies?.[id ?? ''];
  // 교전: 누가 쳤는지에 따라(성을 치면 공성). 상대 차례의 싸움은 보이는 것만, 조금 작게
  if (combat) {
    const atk = army(combat.attackerId ?? request?.armyId), seen = !ai || visible(combat.attackerId) || visible(combat.targetId);
    if (seen) {
      const k = ai ? 0.7 : 1, city = type === 'ATTACK_CITY' || !!combat.cityId || combat.kind === 'SIEGE';
      const tactic = type === 'USE_TACTIC' || !!combat.tacticName || combat.kind === 'TACTIC';
      if (tactic) out.push(['tactic', 0, k]);
      if (tactic && fireTactic(combat.tacticName)) out.push(['fire-ignite', 300, k], ['fire-burn', 900, k]);
      // 치기 시작할 때 함성(기병은 말발굽 우레) — 맞는 순간의 소리는 world.js 가 따로 낸다(deferImpact)
      else if (!tactic && !city && combat.kind !== 'OVERWATCH' && combat.kind !== 'TACTIC_EFFECT') out.push([troopSounds(atk?.troopType).hit === 'charge' ? 'charge-rumble' : troopSounds(atk?.troopType).hit === 'clash' ? 'warcry' : '', 0, k * 0.8]);
      if(!deferImpact&&combat.kind!=='TACTIC_EFFECT')out.push([combat.kind === 'OVERWATCH' ? 'arrows' : city ? 'siege' : troopSounds(atk?.troopType).hit, type === 'USE_TACTIC' ? 260 : 0, k]);
      if ((combat.eliminatedIds ?? []).some((/** @type {string} */ id) => before?.armies?.[id]?.factionId === me)) out.push(['rout', 900, 1]);
    }
  } else if (['MOVE_UNIT', 'ADVANCE_ORDER'].includes(type)) {
    const a = army(request.armyId); if (a && a.tileId !== before?.armies?.[request.armyId]?.tileId) out.push([troopSounds(a.troopType).move, 0, 1]);
  } else if (ai) {
    const moved = Object.values(state?.armies ?? {}).find((/** @type {any} */ a) => a.tileId !== before?.armies?.[a.armyId]?.tileId && visible(a.armyId));
    if (moved) out.push([troopSounds(/** @type {any} */ (moved).troopType).move, 0, 0.45]);
  }
  // 성의 주인이 바뀜: 내가 얻으면 뿔나팔과 함성, 잃으면 낮은 뿔나팔
  for (const c of Object.values(state?.cities ?? {})) {
    const was = before?.cities?.[/** @type {any} */ (c).cityId]?.ownerFactionId, now = /** @type {any} */ (c).ownerFactionId;
    if (was === now || !now) continue;
    if (now === me) { out.push(['capture', combat ? 1100 : 200, 1]); break; }
    if (was === me) { out.push(['warhorn', combat ? 1100 : 200, 1]); break; }
  }
  const simple = {
    END_TURN: 'drum-hit', QUEUE_MOVE: 'brush', CANCEL_MOVE: 'paper-close', GARRISON: 'gate', RECALL_UNIT: 'gate', REGROUP: 'muster', BRACE: 'select',
    BUILD_HUB: 'hammer', CITY_GOVERNOR: 'stamp', CITY_TAX_ADVANCE: 'coins', STAR_ACTION: 'stamp', EVENT_CHOICE: 'stamp', EXPLORE_CHOICE: 'stamp',
    OCCUPATION_METHOD: 'stamp', CAPTIVE_ACTION: 'stamp', DRAFT_PICK: 'stamp', DRAFT_REROLL: 'paper-open', FEAST: 'cup', VISIT: 'cup',
    WANDERER_RECRUIT: 'coins', TACTIC_LOADOUT: 'click', MODIFIER_REBIND: 'click',
  }[type];
  if (type === 'CITY_JOB') out.push([request.kind === 'muster' ? 'muster' : 'hammer', 0, 1]);
  else if (simple && !(combat && type !== 'END_TURN')) out.push([simple, 0, type === 'VISIT' ? 0.6 : 1]);
  // 새 차례: 징 한 번(차례 넘김의 북 뒤에)
  if ((state?.turn ?? 0) > (before?.turn ?? 0) && !state?.gameResult) out.push(['gong', 750, 1]);
  return out.filter(([name]) => !!name);
}

/** 창이 열릴 때 · 닫힐 때의 소리(창의 id → [열림, 닫힘]) */
export const PANEL_SOUNDS = Object.freeze({
  'city-stage': ['gate', 'paper-close'], 'event-modal': ['guqin', null], 'choice-modal': ['guqin', null], 'growth-modal': ['levelup', null],
  'officer-draft': ['stone', null], 'crisis-modal': ['warhorn', null], result: ['gong', null], roster: ['paper-open', 'paper-close'],
  diplo: ['paper-open', 'paper-close'], council: ['paper-open', 'paper-close'], 'officer-modal': ['paper-open', 'paper-close'],
  'rules-modal': ['paper-open', 'paper-close'], 'save-confirm': ['paper-open', 'paper-close'], 'visit-modal': ['cup', 'paper-close'],
});

/** 누른 곳 → 소리(위에서부터 먼저 맞는 것). 명령으로 이어져 command() 가 따로 소리를 내는 단추는 넣지 않는다. */
const CLICK_SOUNDS = [
  ['#start-go', 'gong'], ['.w-lord', 'brush'], ['#save, #save-overwrite', 'brush'], ['.draft-card, .od-card, [data-draft-pick]', 'stone'],
  ['.cs-spot, .cs-lord .act', 'click'], ['.office-tabs button, .ri-filter button, [role="tab"]', 'click'], ['.ih-rb, .ih-menu button, .w-icon-btn', 'click'],
  ['.ri-row, .wc-row, .dq-act, .dq-lord, .feast-seats li, .face-btn', 'click'], ['button, [role="button"], summary', 'click'],
];
/** 눌러도 소리를 내지 않는 곳: 명령이 소리를 내거나(차례 넘김 · 공격 · 선택 확정) 지도 자체 */
const CLICK_SILENT = '.ih-end, #end-turn, .ev-choice, #growth-confirm, .ih-cmd .atk, [data-cmd], .wmap, #mute, [data-fwd="#mute"]';

/**
 * @param {() => {muted?: boolean, volume?: number}} getSettings
 * @param {{contextFactory?: () => any, fetchImpl?: (url:string)=>Promise<any>, clock?: () => number, timer?: (fn:()=>void, ms:number)=>any, random?: () => number}} [options]
 */
export function createWorldSfx(getSettings, {contextFactory = () => new (globalThis.AudioContext ?? /** @type {any} */ (globalThis).webkitAudioContext)(),
  fetchImpl = (url) => fetch(url), clock = () => globalThis.performance?.now?.() ?? Date.now(), timer = (fn, ms) => setTimeout(fn, ms), random = Math.random} = {}) {
  /** @type {any} */ let ctx = null;
  /** @type {Map<string, any>} */ const buffers = new Map();
  /** @type {Map<string, Promise<any>>} */ const loading = new Map();
  /** @type {Map<string, number>} */ const last = new Map();
  let lastAny = -Infinity;
  const level = () => { const s = getSettings?.() ?? {}; return ctx && ctx.state === 'running' && !s.muted && (s.volume ?? 0) > 0 ? Math.min(1, /** @type {number} */ (s.volume) * 2.4) : 0; };
  /** @param {string} name */
  const load = (name) => {
    if (buffers.has(name) || !ctx || !SFX[name]) return Promise.resolve(buffers.get(name) ?? null);
    let p = loading.get(name);
    if (!p) {
      p = Promise.resolve().then(() => fetchImpl(`${BASE}${name}.ogg`)).then((r) => (r?.ok === false ? null : r.arrayBuffer())).then((b) => (b ? ctx.decodeAudioData(b) : null))
        .then((buf) => { if (buf) buffers.set(name, buf); return buf; }).catch(() => null);
      loading.set(name, p);
    }
    return p;
  };
  function unlock() {
    try { ctx ??= contextFactory(); if (ctx.state === 'suspended') Promise.resolve(ctx.resume()).catch(() => {}); } catch { return; }
    for (const name of Object.keys(SFX)) load(name);   // 첫 손짓에 한꺼번에 받아 둔다(모두 합쳐 0.7MB)
  }
  /** @param {string} name @param {{gain?: number, delay?: number, layers?: boolean}} [o] */
  function play(name, {gain = 1, delay = 0, layers = true} = {}) {
    const def = SFX[name]; if (!def) return false;
    if (delay > 0) { timer(() => play(name, {gain, layers}), delay); return true; }
    const played = playNow(name, def, gain);
    if (played && layers) for (const [layer, d, k] of SFX_LAYERS[name] ?? []) play(layer, {gain: gain * k, delay: d, layers: false});
    return played;
  }
  /** @type {Map<string, {src:any, g:any}>} */ const loops = new Map();
  /** 되풀이해 틀기(서서히 켬). 이미 틀고 있으면 그대로. @param {string} name */
  function startLoop(name) {
    const def = SFX[name], v = level(); if (!def || !v || loops.has(name)) return false;
    const buf = buffers.get(name); if (!buf) { load(name).then((b) => { if (b && !loops.has(name)) startLoop(name); }); return false; }
    try {
      const src = ctx.createBufferSource(), g = ctx.createGain(), t = ctx.currentTime ?? 0;
      src.buffer = buf; src.loop = true; g.gain.setValueAtTime?.(0, t); g.gain.linearRampToValueAtTime?.(Math.min(1, v * def.gain), t + 1.2);
      src.connect(g).connect(ctx.destination); src.start(); loops.set(name, {src, g}); return true;
    } catch { return false; }
  }
  /** 서서히 끄기. @param {string} name */
  function stopLoop(name) {
    const l = loops.get(name); if (!l) return; loops.delete(name);
    try { const t = ctx.currentTime ?? 0; l.g.gain.cancelScheduledValues?.(t); l.g.gain.setValueAtTime?.(l.g.gain.value, t); l.g.gain.linearRampToValueAtTime?.(0, t + 0.6); l.src.stop(t + 0.7); } catch { /* 이미 멈춤 */ }
  }
  /** @param {string} name @param {SfxDef} def @param {number} gain */
  function playNow(name, def, gain) {
    const v = level(), now = clock();
    if (!v || now - (last.get(name) ?? -Infinity) < def.gap || (name === 'click' && now - lastAny < 90)) return false;
    const buf = buffers.get(name); if (!buf) { load(name); return false; }
    try {
      const src = ctx.createBufferSource(), g = ctx.createGain();
      src.buffer = buf; src.playbackRate.value = 0.97 + random() * 0.06;   // 같은 소리가 되풀이돼도 조금씩 다르게
      g.gain.value = Math.min(1, v * def.gain * gain); src.connect(g).connect(ctx.destination); src.start();
      last.set(name, now); lastAny = now; return true;
    } catch { return false; }
  }
  /** 명령 하나가 끝난 뒤 world.js 가 부른다. @param {{request:any, before:any, state:any, combat:any, deferImpact?:boolean, visible?:(armyId:string)=>boolean}} c */
  function command(c) { for (const [name, delay, k] of commandSounds(c)) play(name, {delay, gain: k}); }
  /** 창 여닫이와 단추 누르기를 듣는다. @param {Document} doc */
  function attach(doc) {
    doc.addEventListener('pointerdown', unlock, {capture: true, passive: true}); doc.addEventListener('keydown', unlock, {capture: true, passive: true});
    doc.addEventListener('click', (e) => {
      const t = /** @type {Element|null} */ (e.target instanceof Element ? e.target : null); if (!t || t.closest(CLICK_SILENT)) return;
      for (const [sel, name] of CLICK_SOUNDS) { const hit = t.closest(sel); if (hit) { if (!(/** @type {any} */ (hit).disabled)) play(name); return; } }
    }, {capture: true, passive: true});
    if (typeof MutationObserver !== 'function') return;
    const seen = new Map();
    const check = (/** @type {Element} */ el) => {
      const pair = PANEL_SOUNDS[/** @type {keyof typeof PANEL_SOUNDS} */ (el.id)]; if (!pair) return;
      const open = !(/** @type {any} */ (el).hidden), was = seen.get(el.id); seen.set(el.id, open);
      if (was === undefined || was === open) return;
      const name = open ? pair[0] : pair[1]; if (name) play(name);
      const loop = /** @type {Record<string, string>} */ (LOOP_PANELS)[el.id]; if (loop) { if (open) startLoop(loop); else stopLoop(loop); }
    };
    for (const id of Object.keys(PANEL_SOUNDS)) { const el = doc.getElementById(id); if (el) seen.set(id, !(/** @type {any} */ (el).hidden)); }
    new MutationObserver((list) => { for (const m of list) if (m.type === 'attributes' && m.target instanceof Element) check(m.target); })
      .observe(doc.body, {attributes: true, attributeFilter: ['hidden'], subtree: true});
  }
  return {unlock, play, command, attach, startLoop, stopLoop, get ready() { return buffers.size; }};
}
