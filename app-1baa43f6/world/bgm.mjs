// @ts-check
// 화면별 배경 음악 — 처음·드래프트·지도(평시/전시, 곡 둘씩)·교전·성·주점·군의·위기·승리·패배. 곡 바꿈은 교차 페이드.
// 표시용(게임 규칙 아님). 음량·음소거는 기존 소리 설정을 그대로 따른다.
// 곡 파일: prototype/assets/audio/bgm/{자리}.ogg (tools/art/bgm-prepare.py 가 만든다). 파일이 없거나 서버가 못 주면 조용히 침묵한다.

/** @typedef {{src:string, loop:boolean, gain:number}} BgmTrack */
/** @type {Readonly<Record<string, BgmTrack>>} */
export const BGM_TRACKS = Object.freeze({
  title: {src: '/assets/audio/bgm/title.ogg', loop: true, gain: 1},
  'map-peace': {src: '/assets/audio/bgm/map-peace.ogg', loop: true, gain: 1},
  'map-war': {src: '/assets/audio/bgm/map-war.ogg', loop: true, gain: 1},
  battle: {src: '/assets/audio/bgm/battle.ogg', loop: true, gain: 0.9},
  city: {src: '/assets/audio/bgm/city.ogg', loop: true, gain: 0.95},
  crisis: {src: '/assets/audio/bgm/crisis.ogg', loop: true, gain: 1},
  victory: {src: '/assets/audio/bgm/victory.ogg', loop: false, gain: 1},
  defeat: {src: '/assets/audio/bgm/defeat.ogg', loop: false, gain: 1},
  // 2026-10-13 장면을 더 잘게: 주점 · 군의(외교 포함) · 석각 드래프트 · 지도 곡의 둘째 판(두 차례마다 번갈아)
  tavern: {src: '/assets/audio/bgm/tavern.ogg', loop: true, gain: 0.95},
  council: {src: '/assets/audio/bgm/council.ogg', loop: true, gain: 0.95},
  draft: {src: '/assets/audio/bgm/draft.ogg', loop: true, gain: 1},
  'map-peace-b': {src: '/assets/audio/bgm/map-peace-b.ogg', loop: true, gain: 1},
  'map-war-b': {src: '/assets/audio/bgm/map-war-b.ogg', loop: true, gain: 1},
});

const STEP_MS = 50;

/**
 * @param {{factory?: (src:string)=>any, settings?: {muted?:boolean, volume?:number}, fadeMs?: number,
 *   timer?: {set:(fn:()=>void, ms:number)=>any, clear:(id:any)=>void}, onStatus?: (scene:string|null, state:string)=>void}} [options]
 */
export function createWorldBgm({factory = (src) => new Audio(src), settings = {muted: false, volume: 0.15}, fadeMs = 1800,
  timer = {set: (fn, ms) => setInterval(fn, ms), clear: (id) => clearInterval(id)}, onStatus = () => {}} = {}) {
  /** @param {{muted?:boolean, volume?:number}} s */
  const norm = (s) => ({muted: !!s.muted, volume: Number.isFinite(s.volume) ? Math.max(0, Math.min(1, /** @type {number} */ (s.volume))) : 0.15});
  let prefs = norm(settings), active = true, requested = false;
  /** @type {string|null} */ let wanted = null;
  /** @type {{name:string, el:any, f:number, gain:number, ended:boolean}|null} */ let cur = null;
  /** @type {Set<{el:any, f:number, gain:number}>} */ const fading = new Set();
  /** @type {Set<string>} */ const failed = new Set();
  /** @type {any} */ let tick = null;
  const level = () => (prefs.muted ? 0 : prefs.volume);
  const status = (/** @type {string} */ s) => { try { onStatus(cur?.name ?? wanted, s); } catch {} };
  const setVol = (/** @type {{el:any, f:number, gain:number}} */ v) => { try { v.el.volume = Math.max(0, Math.min(1, level() * v.gain * v.f)); } catch {} };
  const halt = (/** @type {any} */ el) => { try { el.pause(); el.removeAttribute?.('src'); el.load?.(); } catch {} };

  function step() {
    const d = STEP_MS / Math.max(STEP_MS, fadeMs);
    if (cur) { cur.f = Math.min(1, cur.f + d); setVol(cur); }
    for (const v of [...fading]) { v.f -= d; if (v.f <= 0) { halt(v.el); fading.delete(v); } else setVol(v); }
    if ((!cur || cur.f >= 1) && !fading.size && tick !== null) { timer.clear(tick); tick = null; }
  }
  const run = () => { if (tick === null) tick = timer.set(step, STEP_MS); };

  function stopAll() {
    if (cur) { halt(cur.el); cur = null; }
    for (const v of fading) halt(v.el);
    fading.clear();
    if (tick !== null) { timer.clear(tick); tick = null; }
  }

  /** @param {string} name */
  function start(name) {
    const track = BGM_TRACKS[name];
    if (!track || failed.has(name)) { status('SILENT'); return; }
    let el;
    try { el = factory(track.src); } catch { failed.add(name); status('FAILED'); return; }
    const voice = {name, el, f: 0, gain: track.gain, ended: false};
    cur = voice;
    try { el.loop = track.loop; el.preload = 'auto'; el.volume = 0; } catch {}
    el.addEventListener?.('error', () => { failed.add(name); if (cur === voice) cur = null; status('FAILED'); });
    el.addEventListener?.('ended', () => { voice.ended = true; });
    status('STARTING');
    let played;
    try { played = el.play(); } catch (error) { played = Promise.reject(error); }
    Promise.resolve(played).then(() => { if (cur === voice) { status('PLAYING'); run(); } })
      .catch((error) => {
        if (cur !== voice) return;
        cur = null;
        if (error?.name === 'NotAllowedError') { requested = false; status('BLOCKED'); } // 브라우저가 막음 → 다음 클릭에서 다시
        else { failed.add(name); status('FAILED'); }
      });
    run();
  }

  function sync() {
    if (!active || !requested || level() === 0) { stopAll(); status(level() === 0 ? 'MUTED' : 'WAITING'); return; }
    if (cur && cur.name === wanted) { setVol(cur); for (const v of fading) setVol(v); return; }
    if (cur) { fading.add({el: cur.el, f: cur.f, gain: cur.gain}); cur = null; run(); }
    if (wanted) start(wanted);
  }

  return Object.freeze({
    /** 화면이 바뀌면 부른다. 같은 곡이면 아무 일도 없다. @param {string|null} name */
    scene(name) { if (name === wanted) return; wanted = name && BGM_TRACKS[name] ? name : null; sync(); },
    /** 사용자의 첫 클릭·키 입력에서 부른다(브라우저 자동 재생 정책). */
    gesture() { if (!active) return; requested = true; sync(); },
    /** @param {{muted?:boolean, volume?:number}} next */
    configure(next) { prefs = norm({muted: typeof next.muted === 'boolean' ? next.muted : prefs.muted, volume: Number.isFinite(next.volume) ? next.volume : prefs.volume}); sync(); },
    deactivate() { active = false; stopAll(); status('STOPPED'); },
    activate() { active = true; sync(); },
    get snapshot() { return {active, requested, wanted, playing: cur?.name ?? null, fading: fading.size, failed: [...failed], settings: {...prefs}}; },
  });
}
