// @ts-check
import {renderSettlementCue} from '../../src/settlement-audio.mjs';
// 흑묵 화면의 효과음 — 녹음한 듯한 짧은 소리 파일(ogg)을 동작마다 낸다. 표시용(게임 규칙 아님).
// 사용자 2026-10-13 "배경음악이랑 효과음도 촘촘하게 넣어봐". 그때까지는 WebAudio 로 만든 짧은 신호음 세 가지(ui-sfx.mjs)와 옛 합성음뿐이었다.
// 소리 파일: prototype/assets/audio/sfx/{이름}.ogg (tools/art/sfx-prepare.py 가 만든다 — 로컬 Stable Audio 3 초안을 다듬은 것).
// 음량·음소거는 기존 소리 설정(pilotAudio.settings)을 그대로 따른다. 파일이 없거나 풀 수 없으면 그 소리만 조용히 건너뛴다.
//   연결: ① 명령 하나가 끝날 때 world.js 가 command(…) 를 부른다(이동 · 교전 · 함락 · 차례 …) ② 창이 열리고 닫히는 것 · 단추 누르기는 attach(document) 가 직접 듣는다.

/** @typedef {{gain:number, gap:number}} SfxDef  gain = 소리마다의 크기, gap = 같은 소리를 다시 내기까지의 최소 간격(ms) */
/** @type {Readonly<Record<string, SfxDef>>} */
export const SFX = Object.freeze({
  settlement: {gain:.32/2.4,gap:900},
  'blade-edge': {gain:1,gap:100}, hoof: {gain:1,gap:100}, counter: {gain:1,gap:100}, 'bow-release': {gain:1,gap:100}, 'volley-air': {gain:1,gap:100},
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
  // 10-16 닷토리 '소리가 구분됐으면 하는 순간': 차례 시작 · 시설 완공 · 패배 · 성소 발견
  'turn-drum': {gain: 0.8, gap: 900}, 'build-complete': {gain: 0.9, gap: 600}, 'defeat-dirge': {gain: 0.7, gap: 3000}, 'temple-bell': {gain: 0.75, gap: 1500},
  'fire-out': {gain: 0.65, gap: 900},
});
// C454: one transient owns contact; the optional edge stays quiet.
export const SFX_LAYERS = Object.freeze({clash: [['blade-edge', 0, 0.22]]});
// Measured and target RMS dBFS at unity master; gain = 10 ** ((target-measured)/20).
/** @type {Readonly<Record<string, [string, number, number]>>} */
export const SFX_ASSETS = Object.freeze({
  clash: ['sword-core-a', -26, -28], 'blade-edge': ['blade-edge-a', -29.3, -28],
  hoof: ['hoof-run-a', -28.3, -30], charge: ['charge-wall-a', -22.7, -24],
  'bow-release': ['bow-release-a', -19.4, -32], 'volley-air': ['volley-air-a', -29.7, -36],
  arrows: ['arrow-hit-group-a', -26.8, -28], siege: ['siege-impact-a', -22.9, -24],
  counter: ['hit-cloth-a', -22.6, -34],
  click: ['ui-order-soft-a', -18.6, -38], select: ['ui-order-soft-a', -18.6, -38],
  brush: ['ui-order-soft-a', -18.6, -38], stamp: ['ui-order-soft-a', -18.6, -38], deny: ['ui-order-soft-a', -18.6, -38],
  'paper-open': ['ui-paper-open-a', -26.8, -38], 'paper-close': ['ui-paper-close-a', -25.5, -38],
  tactic: ['tactic-core-a', -15.1, -25], 'fire-ignite': ['fire-ignite-a', -31.9, -28],
  rout: ['rout-break-a', -27.2, -23], capture: ['capture-flag-a', -23.3, -23],
});
export const sfxUrl = name => SFX_ASSETS[name] ? `/assets/audio/sfx-c451/${SFX_ASSETS[name][0]}.wav` : `/assets/audio/sfx/${name}.ogg`;
const UI_NAMES = new Set(['click','select','brush','stamp','deny','paper-open','paper-close','stone','gate','cup']);
const LIMITS = {hoof:.12, stone:.22, gate:.22, cup:.22, gallop:.18, march:.24, warcry:.3};
const BIG_RESULTS = new Set(['rout','capture','warhorn','defeat-dirge','gong']);
export function createAudioBuses() {
  const listeners = new Set(), ducks = new Set();
  let prefs = {muted:false,volume:.15};
  const emit = () => { for (const fn of listeners) fn(); };
  return {
    configure(next) { prefs = {...prefs,...next}; emit(); },
    level(bus) { return prefs.muted ? 0 : Math.max(0,Math.min(1,prefs.volume ?? .15)) * (bus==='bgm'&&ducks.size ? 10**(-6/20) : 1); },
    duck(token,on) { if(on)ducks.add(token);else ducks.delete(token);emit(); },
    subscribe(fn) { listeners.add(fn); return ()=>listeners.delete(fn); },
    get ducked() { return ducks.size>0; },
  };
}
export const audioBuses = createAudioBuses();
/** 되풀이해 트는 소리(이어 틀기 · 서서히 켜고 끔). 창 id → 소리 */
export const LOOP_PANELS = Object.freeze({'city-stage': 'town-ambience'});
/** 이름에 불이 든 전법(화계 · 화공 · 화시 …) */
export const fireTactic = (/** @type {unknown} */ name) => /화계|화공|화시|화우|화염|불|火|fire/i.test(String(name ?? ''));


/** 병종 → 움직일 때 · 칠 때의 소리. 특수 병종(투석기 등)은 이름에 든 글자로 가른다. @param {unknown} troop */
export function troopSounds(troop) {
  const t = String(troop ?? '');
  if (/BT04|caval|horse/i.test(t)) return {move: 'gallop', hit: 'charge'};
  if (/BT03|bow|archer|crossbow/i.test(t)) return {move: 'march', hit: 'arrows'};
  if (/catapult|ram|siege/i.test(t)) return {move: 'march', hit: 'siege'};
  return {move: 'march', hit: 'clash'};
}

/** 명령 하나가 끝난 뒤 낼 소리들: [이름, 늦춤(ms), 크기 배율]. 순수 함수 — 테스트용으로 밖에 둔다.
 * @param {{request:any, before:any, state:any, combat:any, deferImpact?:boolean, managedFx?:boolean, feel?:boolean, visible?:(armyId:string)=>boolean}} c
 * @returns {[string, number, number][]} */
export function commandSounds({request, before, state, combat, deferImpact = false, managedFx = false, feel = false, visible = () => true}) {
  /** @type {[string, number, number][]} */ const out = [];
  const type = request?.type, me = state?.playerFactionId, ai = type === 'ADVANCE_AI';
  const army = (/** @type {string|undefined} */ id) => state?.armies?.[id ?? ''] ?? before?.armies?.[id ?? ''];
  // 교전: 누가 쳤는지에 따라(성을 치면 공성). 상대 차례의 싸움은 보이는 것만, 조금 작게
  if (combat) {
    const atk = army(combat.attackerId ?? request?.armyId), seen = !ai || visible(combat.attackerId) || visible(combat.targetId);
    if (seen) {
      const k = ai ? 0.7 : 1, city = type === 'ATTACK_CITY' || !!combat.cityId || combat.kind === 'SIEGE';
      const tactic = type === 'USE_TACTIC' || !!combat.tacticName || combat.kind === 'TACTIC';
      if (tactic && !managedFx) out.push(['tactic', 0, k]);
      if (tactic && fireTactic(combat.tacticName) && !managedFx) out.push(['fire-ignite', 300, k], ['fire-burn', 900, k]);
      if(!deferImpact&&!tactic&&combat.kind!=='TACTIC_EFFECT')out.push([combat.kind === 'OVERWATCH' ? 'arrows' : city ? 'siege' : troopSounds(atk?.troopType).hit, type === 'USE_TACTIC' ? 260 : 0, k]);
      if (!feel && (combat.eliminatedIds ?? []).some((/** @type {string} */ id) => before?.armies?.[id]?.factionId === me)) out.push(['rout', 900, 1]);
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
    QUEUE_MOVE: 'brush', CANCEL_MOVE: 'paper-close', GARRISON: 'gate', RECALL_UNIT: 'gate', REGROUP: 'muster', BRACE: 'select',
    BUILD_HUB: 'hammer', CITY_GOVERNOR: 'stamp', CITY_TAX_ADVANCE: 'coins', STAR_ACTION: 'stamp', EVENT_CHOICE: 'stamp', EXPLORE_CHOICE: 'stamp',
    OCCUPATION_METHOD: 'stamp', CAPTIVE_ACTION: 'stamp', DRAFT_PICK: 'stamp', DRAFT_REROLL: 'paper-open', FEAST: 'cup', VISIT: 'cup',
    WANDERER_RECRUIT: 'coins', TACTIC_LOADOUT: 'click', MODIFIER_REBIND: 'click',
  }[type];
  if (type === 'CITY_JOB') out.push([request.kind === 'muster' ? 'muster' : 'hammer', 0, 1]);
  else if (simple && !(combat && type !== 'END_TURN')) out.push([simple, 0, type === 'VISIT' ? 0.6 : 1]);
  // 새 차례: 큰 북 한 번 + 징 여운(차례 넘김의 작은 북 뒤에)
  // C454: settlementAudio owns the new-turn cue.
  // C177: 완공 · 새 출진 부대 소리. 완공은 10-16 전용 소리(나무 마치 · 작은 종)
  if ((state?.turn ?? 0) > (before?.turn ?? 0)) {
    if(Object.values(state?.cities??{}).some((/** @type {any} */ c)=>c.ownerFactionId===me&&before?.cities?.[c.cityId]?.currentProduction&&before.cities[c.cityId].currentProduction.kind!=='muster'&&!c.currentProduction))out.push(['build-complete',950,1]);
  }
  if(Object.values(state?.armies??{}).some((/** @type {any} */ a)=>a.armyId&&a.factionId===me&&!before?.armies?.[a.armyId]))out.push(['muster',200,1]);
  const growthLevel=(/** @type {any} */ s,/** @type {string} */ id)=>s?.campaignGrowth?.officers?.[id]?.track?.growthStates?.[id]?.level??1;
  if(Object.keys(state?.campaignGrowth?.officers??{}).some(id=>state.officers?.[id]?.allegianceFactionId===me&&growthLevel(state,id)>growthLevel(before,id)))out.push(['levelup',250,1]);
  if(state?.gameResult&&!before?.gameResult){const defeat=state.gameResult.type==='PLAYER_DEFEAT'||state.gameResult.winnerFactionId&&state.gameResult.winnerFactionId!==me;if(defeat||!out.some(([name])=>BIG_RESULTS.has(name)))out.push([defeat?'defeat-dirge':'gong',200,1]);}
  return out.filter(([name]) => !!name);
}

/** Public before/after projections; disappearance into fog is not an extinguished fire.
 * @param {any} before @param {any} after @returns {string[]} */
export function transitionSounds(before,after){
 const names=new Set();
 if((after.exploration?.places??[]).some(p=>/성소/.test(p.label)&&p.status!=='UNKNOWN'&&before.exploration?.places?.find(x=>x.placeId===p.placeId)?.status==='UNKNOWN'))names.add('temple-bell');
 const cities={...after.knowledge?.cities,...after.ownCities},oldCities={...before.knowledge?.cities,...before.ownCities};
 if(Object.values(cities).some((/** @type {any} */ c)=>c.besieged&&!oldCities[c.cityId]?.besieged&&(after.ownCities?.[c.cityId]||after.knowledge?.tiles?.[c.tileId]==='VISIBLE')))names.add('siege');
 if((after.diplomacy?.factions??[]).some(f=>['TRUCE','ALLIANCE'].includes(f.state)&&before.diplomacy?.factions?.find(x=>x.factionId===f.factionId)?.state!==f.state))names.add('stamp');
 if((before.fire?.tiles??[]).some(f=>after.knowledge?.tiles?.[f.tileId]==='VISIBLE'&&!(after.fire?.tiles??[]).some(x=>x.tileId===f.tileId)))names.add('fire-out');
 if(Object.values(after.ownArmies??{}).some((/** @type {any} */ a)=>a.morale!=='ROUTING'&&before.ownArmies?.[a.armyId]?.morale==='ROUTING'))names.add('select');
 return [...names];
}

/** 창이 열릴 때 · 닫힐 때의 소리(창의 id → [열림, 닫힘]) */
export const PANEL_SOUNDS = Object.freeze({
  'city-stage': ['paper-open', 'paper-close'], 'event-modal': ['paper-open', null], 'choice-modal': ['paper-open', null], 'growth-modal': ['paper-open', null],
  'officer-draft': ['paper-open', null], 'crisis-modal': ['paper-open', null], result: [null, null], roster: ['paper-open', 'paper-close'],
  diplo: ['paper-open', 'paper-close'], council: ['paper-open', 'paper-close'], 'officer-modal': ['paper-open', 'paper-close'],
  'rules-modal': ['paper-open', 'paper-close'], 'save-confirm': ['paper-open', 'paper-close'], 'visit-modal': ['paper-open', 'paper-close'],
});

/** 누른 곳 → 소리(위에서부터 먼저 맞는 것). 명령으로 이어져 command() 가 따로 소리를 내는 단추는 넣지 않는다. */
const CLICK_SOUNDS = [
  ['#start-go', 'select'], ['.w-lord', 'select'], ['#save, #save-overwrite', 'brush'], ['.draft-card, .od-card, [data-draft-pick]', 'select'],
  ['.cs-spot, .cs-lord .act', 'click'], ['.office-tabs button, .ri-filter button, [role="tab"]', 'click'], ['.ih-rb, .ih-menu button, .w-icon-btn', 'click'],
  ['.ri-row, .wc-row, .dq-act, .dq-lord, .feast-seats li, .face-btn', 'click'], ['button, [role="button"], summary', 'click'],
];
/** 눌러도 소리를 내지 않는 곳: 명령이 소리를 내거나(차례 넘김 · 공격 · 선택 확정) 지도 자체 */
const CLICK_SILENT = '.ih-end, #end-turn, .ev-choice, #growth-confirm, .ih-cmd .atk, [data-cmd], .wmap, #mute, [data-fwd="#mute"]';

/**
 * @param {() => {muted?: boolean, volume?: number}} getSettings
 * @param {{contextFactory?: () => any, fetchImpl?: (url:string)=>Promise<any>, clock?: () => number, timer?: (fn:()=>void, ms:number)=>any, buses?:any, random?: () => number}} [options]
 */
export function createWorldSfx(getSettings, {contextFactory = () => new (globalThis.AudioContext ?? /** @type {any} */ (globalThis).webkitAudioContext)(),
  fetchImpl = (url) => fetch(url), clock = () => globalThis.performance?.now?.() ?? Date.now(), timer = (fn, ms) => setTimeout(fn, ms), random = Math.random, buses = audioBuses} = {}) {
  /** @type {any} */ let ctx = null;
  /** @type {Map<string, any>} */ const buffers = new Map();
  /** @type {Map<string, Promise<any>>} */ const loading = new Map();
  /** @type {Map<string, number>} */ const last = new Map();
  const eventTurns=new Set();
  /** @param {string} name @param {string} turn @param {number} [gain] */
  function once(name,turn,gain=1){const key=`${turn}:${name}`;if(eventTurns.has(key))return;eventTurns.add(key);if(eventTurns.size>256)eventTurns.delete(eventTurns.values().next().value);play(name,{gain,duration:name==='warcry'?0.9:undefined});}
  let lastAny = -Infinity, master = null;
  const active = new Set();
  let uiGeneration = 0, disposed = false;
  const refresh = () => {
    buses.configure(getSettings?.() ?? {});
    if(master)master.gain.value = Math.min(1,buses.level('sfx') * 2.4);
  };
  const unsubscribe = buses.subscribe(()=>{if(getSettings?.()?.muted)for(const node of [...active])if(node.group?.startsWith('melee465'))node.stop();if(master)master.gain.value=Math.min(1,buses.level('sfx')*2.4);});

  const level = () => { const s = getSettings?.() ?? {}; return ctx && ctx.state === 'running' && !s.muted && (s.volume ?? 0) > 0 ? Math.min(1, /** @type {number} */ (s.volume) * 2.4) : 0; };
  /** @param {string} name */
  const load = (name) => {
    if (buffers.has(name) || !ctx || !SFX[name]) return Promise.resolve(buffers.get(name) ?? null);
    if(name==='settlement'){
      try {const samples=renderSettlementCue(ctx.sampleRate??44100),buf=ctx.createBuffer(1,samples.length,ctx.sampleRate??44100);buf.getChannelData(0).set(samples);buffers.set(name,buf);return Promise.resolve(buf);}catch{return Promise.resolve(null);}
    }
    let p = loading.get(name);
    if (!p) {
      p = Promise.resolve().then(() => fetchImpl(sfxUrl(name))).then((r) => (r?.ok === false ? null : r.arrayBuffer())).then((b) => (b ? ctx.decodeAudioData(b) : null))
        .then((buf) => { if (buf) buffers.set(name, buf); return buf; }).catch(() => null);
      loading.set(name, p);
    }
    return p;
  };
  function preload() {
    // Suspended contexts can decode ahead of the first combat gesture.
    try { ctx ??= contextFactory(); if(!master){master=ctx.createGain();master.connect(ctx.destination);refresh();} } catch { return; }
    for (const name of ['clash','charge','hoof','brush','arrows','counter',...Object.keys(SFX)]) load(name);
  }
  function unlock() {
    preload();
    try { if (ctx?.state === 'suspended') Promise.resolve(ctx.resume()).catch(() => {}); } catch { /* no audio device */ }
  }
  /** @param {string} name @param {{gain?: number, delay?: number, layers?: boolean, duration?:number, eventId?:string, pitch?:number, pan?:number, group?:string, fade?:number}} [o] */
  function play(name, {gain = 1, delay = 0, layers = true, duration, eventId, pitch=1, pan=0, group, fade=.015} = {}) {
    if(disposed)return false;
    const row=eventId?/** @type {any} */(globalThis).__feelLog?.find(e=>e.eventId===eventId):null;
    const call=row?{name,requestMs:clock(),delay,playStartMs:null,playEndMs:null,status:'requested'}:null;
    if(call)row.audioCalls.push(call);
    const def = SFX[name]; if (!def) return false;
    const generation=UI_NAMES.has(name)?++uiGeneration:null;
    const run=()=>{
      if(disposed||(generation!==null&&generation!==uiGeneration))return false;
      const played = playNow(name, def, gain, duration, call, pitch, pan, group, fade);
      if (played && layers) for (const [layer, d, k] of SFX_LAYERS[name] ?? []) play(layer, {gain: gain * k, delay: d, layers: false,eventId});
      return played;
    };
    if (delay > 0) { timer(run, delay); return true; }
    return run();
  }
  /** @type {Map<string, {src:any, g:any}>} */ const loops = new Map();
  /** @type {Map<string, number>} */ const loopWanted = new Map();
  /** 되풀이해 틀기(서서히 켬). 이미 틀고 있으면 그대로. @param {string} name */
  function startLoop(name, {gain=1}={}) {
    if(disposed)return false;
    const def = SFX[name], v = level(); if (!def || !v) {stopLoop(name);return false;}if(loops.has(name))return false;
    const wasWanted=loopWanted.has(name);loopWanted.set(name,gain);
    const buf = buffers.get(name); if (!buf) { if(!wasWanted)load(name).then((b) => { if (b && loopWanted.has(name) && !loops.has(name)) startLoop(name,{gain:loopWanted.get(name)}); }); return false; }
    try {
      const src = ctx.createBufferSource(), g = ctx.createGain(), t = ctx.currentTime ?? 0;
      src.buffer = buf; src.loop = true; g.gain.setValueAtTime?.(0, t); g.gain.linearRampToValueAtTime?.(def.gain * gain, t + 1.2);
      src.connect(g).connect(master); src.start(); loops.set(name, {src, g}); return true;
    } catch { return false; }
  }
  /** 서서히 끄기. @param {string} name */
  function stopLoop(name) {
    loopWanted.delete(name);
    const l = loops.get(name); if (!l) return; loops.delete(name);
    try { const t = ctx.currentTime ?? 0; l.g.gain.cancelScheduledValues?.(t); l.g.gain.setValueAtTime?.(l.g.gain.value, t); l.g.gain.linearRampToValueAtTime?.(0, t + 0.6); l.src.stop(t + 0.7); } catch { /* 이미 멈춤 */ }
  }
  /** @param {string} name @param {SfxDef} def @param {number} gain @param {number} [duration] @param {any} [call] */
  function playNow(name, def, gain, duration, call, pitch, pan, group, fade) {
    const v = level(), now = clock();
    if (!v || now - (last.get(name) ?? -Infinity) < def.gap || (name === 'click' && now - lastAny < 90)) {if(call)call.status=!v?'muted-or-locked':'gap';return false;}
    const buf = buffers.get(name); if (!buf) {if(call)call.status='not-loaded';load(name); return false; }
    try {
      const src = ctx.createBufferSource(), g = ctx.createGain();
      refresh();
      if(UI_NAMES.has(name))for(const node of [...active])if(node.ui)node.stop();
      const asset=SFX_ASSETS[name], normalized=asset?10**((asset[2]-asset[1])/20):def.gain;
      const length=Math.min(duration>0?duration:Infinity, group?.startsWith('melee465')?Infinity:LIMITS[name]??Infinity, buf.duration??Infinity);
      src.buffer = buf; src.playbackRate.value = pitch * (asset ? 1 : 0.97 + random() * 0.06);
      g.gain.value = normalized * gain; const panner=pan&&ctx.createStereoPanner?.();if(panner){panner.pan.value=pan;src.connect(g).connect(panner).connect(master);}else src.connect(g).connect(master);
      const token={},node={group,ui:UI_NAMES.has(name),stop:()=>{try{src.stop();}catch{} finish();}};
      const finish=()=>{active.delete(node);buses.duck(token,false);try{src.disconnect?.();g.disconnect?.();panner?.disconnect?.();}catch{} if(call){call.playEndMs=clock();call.status='ended';}};
      active.add(node);src.onended=finish;
      if(BIG_RESULTS.has(name))buses.duck(token,true);
      try {
        if(Number.isFinite(length)){
          const t=ctx.currentTime??0,tail=Math.min(fade,length/3);
          g.gain.setValueAtTime?.(g.gain.value,t);
          g.gain.setValueAtTime?.(g.gain.value,t+length-tail);
          g.gain.linearRampToValueAtTime?.(0,t+length);
          src.start(0,0,length);
        }else src.start();
      }catch(error){finish();throw error;}
      if(call){call.playStartMs=clock();call.audioContextStart=ctx.currentTime;call.status='started';}
      last.set(name, now); lastAny = now; return true;
    } catch { if(call)call.status='error';return false; }
  }
  /** 명령 하나가 끝난 뒤 world.js 가 부른다. @param {{request:any, before:any, state:any, combat:any, beforeView?:any, afterView?:any, deferImpact?:boolean, managedFx?:boolean, feel?:boolean, visible?:(armyId:string)=>boolean}} c */
  function command(c) {
    const events=c.beforeView&&c.afterView?transitionSounds(c.beforeView,c.afterView):[],turn=`${c.state?.campaignSeed}:${c.state?.turn}`;
    if(!c.state?.gameResult&&!commandSounds(c).some(([name])=>BIG_RESULTS.has(name))&&Object.values(c.state?.factions??{}).some((/** @type {any} */ f)=>f.alive===false&&c.before?.factions?.[f.factionId]?.alive))events.push('gong');
    for (const [name, delay, k] of commandSounds(c)) if(!events.includes(name))play(name, {delay, gain: k});
    for(const name of events)if(!(name==='siege'&&c.combat&&c.deferImpact))once(name,turn,name==='warcry'?0.5:1);
  }
  /** 창 여닫이와 단추 누르기를 듣는다. @param {Document} doc */
  function attach(doc) {
    preload();
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
  return {refresh, stopGroup(group){for(const node of [...active])if(node.group===group)node.stop();}, dispose(){disposed=true;uiGeneration++;loopWanted.clear();for(const n of [...active])n.stop();for(const name of [...loops.keys()])stopLoop(name);unsubscribe();}, unlock, play, once, command, attach, startLoop, stopLoop, get snapshot(){return {active:active.size,ui:[...active].filter(n=>n.ui).length,loops:loops.size};}, get ready() { return buffers.size; }};
}
