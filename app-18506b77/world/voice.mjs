// @ts-check
import {audioBuses} from './sfx.mjs';
// 장수 음성(시험) — 부대를 고르거나 명령을 내리면 그 부대의 대장이 한마디 한다. 표시용(게임 규칙 아님).
// 사용자 2026-10-11: 주요 장수는 Gemini 음성 그대로, 나머지는 목소리를 바꾼 것. 지금은 유비·조조·손권만 제 음성이고,
// 나머지 장수는 만들어 둔 묶음 가운데 하나를 장수 ID 로 정해 쓴다(무작위처럼 보이지만 같은 장수는 늘 같은 목소리). 대사는 아직 세 사람 것을 빌려 쓴다.
// 묶음 목록: /assets/audio/voice/voice.json (tools/voice/voice-pack.py 가 만든다). 파일이 없거나 서버가 못 주면 조용히 침묵한다.

/** @typedef {{voice?: string, lines: Record<string, {file: string, text?: string}>}} VoicePack */
/** @typedef {{officers?: Record<string, string>, pool?: string[], packs?: Record<string, VoicePack>}} VoiceManifest */

export const VOICE_OFFSETS = Object.freeze({
 'G07/attack':.045,'G08/attack':.05,'el_G08/attack':.05488,'nam04_G08/attack':.0449,
 'nam06_G07/attack':.0898,'nam06_G08/victory':.31927,'nam17_G07/move':.07483,
 'nam17_G08/tactic':.27937,'nam17_G08/victory':.22948,'seol_G07/attack':.09977,'seol_G08/attack':.04989,
});
export const VOICE_URL = '/assets/audio/voice/';
// 한마디가 다른 한마디를 끊을 수 있는 순서 — 고르기 소리가 공격 외침을 끊지 않게
export const VOICE_RANK = Object.freeze({select: 0, move: 1, levelup: 1, recruit: 1, attack: 2, tactic: 2, victory: 3, retreat: 3});
const VOICE_GAIN = 4; // 배경 음악(기본 음량 0.15)보다 또렷하게

/** @param {string} text */
function hash(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** 장수의 음성 묶음 이름 — 정해 둔 장수는 그 묶음, 나머지는 ID 로 정해지는 묶음 하나
 * @param {VoiceManifest|null|undefined} manifest @param {string} officerId @returns {string|null} */
export function voicePackFor(manifest, officerId) {
  if (!manifest || !officerId) return null;
  const fixed = manifest.officers?.[officerId];
  if (fixed && manifest.packs?.[fixed]) return fixed;
  const pool = (manifest.pool ?? []).filter((id) => manifest.packs?.[id]);
  return pool.length ? pool[hash(officerId) % pool.length] : null;
}

/**
 * @param {{factory?: (src:string)=>any, settings?: {muted?:boolean, volume?:number}, manifest?: VoiceManifest|null,
 *   load?: ()=>Promise<VoiceManifest>, now?: ()=>number, repeatMs?: number, buses?:any, onSay?: (info:{officerId:string, slot:string, pack:string, text:string}|null)=>void}} [options]
 */
export function createWorldVoice({factory = (src) => new Audio(src), settings = {muted: false, volume: 0.15}, manifest = null,
  load = () => fetch(VOICE_URL + 'voice.json').then((r) => (r.ok ? r.json() : Promise.reject(new Error('voice.json')))),
  now = () => Date.now(), repeatMs = 2500, buses = audioBuses, onSay = () => {}} = {}) {
  /** @param {{muted?:boolean, volume?:number}} s */
  const norm = (s) => ({muted: !!s.muted, volume: Number.isFinite(s.volume) ? Math.max(0, Math.min(1, /** @type {number} */ (s.volume))) : 0.15});
  let prefs = norm(settings), active = true;
  /** @type {VoiceManifest|null} */ let data = manifest;
  /** @type {{el:any, rank:number, key:string}|null} */ let cur = null;
  /** @type {Map<string, number>} */ const said = new Map();
  const ready = data ? Promise.resolve(true) : Promise.resolve().then(load).then((m) => { data = m; return true; }).catch(() => false);
  const level = () => (!active ? 0 : Math.min(1, buses.level('voice') * VOICE_GAIN));
  buses.configure(prefs);
  buses.subscribe(()=>{if(cur)try{cur.el.volume=level();}catch{}});
  const duckToken={};
  const halt = (/** @type {any} */ el) => { try { el.pause(); } catch {} buses.duck(duckToken,false); };

  /** 한마디 하기. 실제로 소리를 냈으면 true
   * @param {string|null|undefined} officerId @param {string} slot */
  function say(officerId, slot) {
    if (!officerId || !data || level() <= 0) return false;
    const pack = voicePackFor(data, officerId), line = pack ? data.packs?.[pack]?.lines?.[slot] : null;
    if (!pack || !line?.file) return false;
    const rank = VOICE_RANK[/** @type {keyof typeof VOICE_RANK} */ (slot)] ?? 1, key = pack + ':' + slot, t = now();
    if (t - (said.get(key) ?? -Infinity) < repeatMs) return false; // 같은 장수의 같은 말을 연달아 하지 않는다
    if (cur && !cur.el.ended && !cur.el.paused && rank < cur.rank) return false; // 더 급한 말이 끝나지 않았다
    let el;
    try { el = factory(VOICE_URL + line.file); } catch { return false; }
    if (cur) halt(cur.el);
    const mine = {el, rank, key};
    cur = mine; said.set(key, t);
    try { el.volume = level(); } catch {}
    const offset=VOICE_OFFSETS[pack+'/'+slot]??0;
    const seek=()=>{try{el.currentTime=offset;}catch{}};
    if(offset){seek();el.addEventListener?.('loadedmetadata',seek,{once:true});}
    buses.duck(duckToken,true);
    el.addEventListener?.('ended', () => { if (cur === mine) {cur = null;buses.duck(duckToken,false);} });
    el.addEventListener?.('error', () => { if (cur === mine) {cur = null;buses.duck(duckToken,false);} });
    let played;
    try { played = el.play(); } catch (error) { played = Promise.reject(error); }
    Promise.resolve(played).catch(() => { if (cur === mine) {cur = null;buses.duck(duckToken,false);} said.delete(key); });
    try { onSay({officerId, slot, pack, text: line.text ?? ''}); } catch {}
    return true;
  }

  return Object.freeze({
    say, ready,
    /** @param {{muted?:boolean, volume?:number}} next */
    configure(next) { prefs = norm({...prefs, ...next}); buses.configure(prefs); if (cur) { try { cur.el.volume = level(); } catch {} if (level() <= 0) { halt(cur.el); cur = null; } } },
    deactivate() { active = false; if (cur) { halt(cur.el); cur = null; } },
    activate() { active = true; },
    stop() { if (cur) { halt(cur.el); cur = null; } },
    /** @param {string} officerId */
    packOf(officerId) { return voicePackFor(data, officerId); },
    get snapshot() { return {loaded: !!data, speaking: cur?.key ?? null, level: level()}; },
  });
}
