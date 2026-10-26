// @ts-check
// UI v3 효과음 — 파일 없이 WebAudio 로 만든다(소리 설정·음소거는 기존 pilotAudio 설정을 따른다).
//   seal  : 인장 확정 — 나무 도장 몸통 '쿵' + 종이에 닿는 '탁'
//   tally : 호부 맞물림 — 금속 반쪽 두 개가 차례로 '딸깍'
//   bell  : 모드 전환 — 얇은 종 한 번
/** @param {() => {muted?: boolean, volume?: number}} getSettings */
export function createUiSfx(getSettings) {
  /** @type {AudioContext|null} */
  let ctx = null, last = 0;
  const unlock = () => {
    try {
      const AC = globalThis.AudioContext ?? /** @type {any} */ (globalThis).webkitAudioContext;
      if (!AC) return;
      ctx ??= new AC();
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    } catch {}
  };
  const level = () => {
    const s = getSettings?.() ?? {};
    return ctx && ctx.state === 'running' && !s.muted && (s.volume ?? 0) > 0 ? /** @type {number} */ (s.volume) : 0;
  };
  /** @param {AudioContext} c @param {number} dur */
  const noise = (c, dur) => {
    const b = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const s = c.createBufferSource(); s.buffer = b; return s;
  };
  /** @param {GainNode} g @param {number} t @param {number} attack @param {number} peak @param {number} decay */
  const env = (g, t, attack, peak, decay) => {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  };
  /** @param {AudioContext} c @param {number} v */
  const out = (c, v) => { const g = c.createGain(); g.gain.value = v; g.connect(c.destination); return g; };
  const SOUNDS = {
    /** @param {AudioContext} c @param {number} v */
    seal(c, v) {
      const t = c.currentTime, o = out(c, v * 1.6);
      const body = c.createOscillator(), bg = c.createGain();
      body.type = 'sine'; body.frequency.setValueAtTime(190, t); body.frequency.exponentialRampToValueAtTime(70, t + 0.12);
      env(bg, t, 0.004, 0.9, 0.16); body.connect(bg).connect(o); body.start(t); body.stop(t + 0.22);
      const n = noise(c, 0.08), f = c.createBiquadFilter(), ng = c.createGain();
      f.type = 'bandpass'; f.frequency.value = 1400; f.Q.value = 0.8;
      env(ng, t, 0.002, 0.7, 0.05); n.connect(f).connect(ng).connect(o); n.start(t); n.stop(t + 0.08);
    },
    /** @param {AudioContext} c @param {number} v */
    tally(c, v) {
      const o = out(c, v * 0.9);
      for (const [dt, amp] of [[0, 1], [0.055, 0.8]]) {
        const t = c.currentTime + dt;
        for (const [fr, a] of [[2210, 0.5], [3480, 0.35], [5130, 0.22], [7400, 0.1]]) {
          const osc = c.createOscillator(), g = c.createGain();
          osc.type = 'sine'; osc.frequency.value = fr * (dt ? 1.03 : 1);
          env(g, t, 0.001, a * amp, 0.09); osc.connect(g).connect(o); osc.start(t); osc.stop(t + 0.12);
        }
        const n = noise(c, 0.02), f = c.createBiquadFilter(), ng = c.createGain();
        f.type = 'highpass'; f.frequency.value = 3000;
        env(ng, t, 0.001, 0.5 * amp, 0.015); n.connect(f).connect(ng).connect(o); n.start(t); n.stop(t + 0.03);
      }
    },
    /** @param {AudioContext} c @param {number} v */
    bell(c, v) {
      const t = c.currentTime, o = out(c, v * 0.5);
      for (const [ratio, a, d] of [[1, 0.5, 0.9], [2.76, 0.22, 0.5], [5.4, 0.1, 0.25]]) {
        const osc = c.createOscillator(), g = c.createGain();
        osc.type = 'sine'; osc.frequency.value = 1318 * ratio;
        env(g, t, 0.003, a, d); osc.connect(g).connect(o); osc.start(t); osc.stop(t + d + 0.05);
      }
    },
  };
  /** @param {'seal'|'tally'|'bell'} kind */
  function play(kind) {
    const v = level(), now = globalThis.performance?.now?.() ?? Date.now();
    if (!v || !ctx || now - last < 60) return false;
    last = now;
    try { SOUNDS[kind]?.(ctx, v); return true; } catch { return false; }
  }
  return {unlock, play};
}
