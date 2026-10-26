// @ts-check
// 고도 UI/UX 방 (Claude, 2026-10-24) — 화면 ⑭ 판 결과(기록 탭) 모델.
// 설계: docs/work-integration/20261023/screen-mockups/14-ending/DESIGN.md v1.2(인물형 · 결말 장면 한 장 + 기록 판 한 열 + 다음 판 칸).
// 값: 엔진 gameResult · view · 웹 hud-ink campaignResultScore 그대로. 견본 판 = 설계 ending-state.mjs 와 같은 한 판(F01 · v3 · 시드 1 · END_TURN autoPlayer 26번 · 셋째 판 가정).
// 글 다듬기(설계 §6 · §7 · §11 정한 것 2 · 5): 사유 = 갈린 기준 문장('판정' · 쉼표 · 머리와 겹치는 말 뺌) · 연대기 두 줄 = 성 얻음 · 사건 · 위기 중 가장 이른 줄과 늦은 줄
// · '비틀린 역사' = 총점에 들어간 수(gameResult.history.twisted) · 끝 마침표 뺌. 규칙 계산 없음.
import {resolve} from '../../../../tools/port/web/shims/node-path.mjs';
import {pathToFileURL} from '../../../../tools/port/web/shims/node-url.mjs';
import {existsSync, readFileSync, writeFileSync} from '../../../../tools/port/web/shims/node-fs.mjs';
import {ROOT, officerArt} from './hud-model.mjs';

const load = (p) => import(pathToFileURL(resolve(ROOT, p)).href);
const [R, Hud, Ev, Display, Troops, KT] = await Promise.all([load('prototype/src/campaign-runtime.mjs'), load('prototype/app/world/hud-ink.mjs'),
  load('prototype/src/campaign-events.mjs'), load('prototype/src/troop-display.mjs'), load('prototype/app/world/troops.mjs'), load('prototype/app/world/korean-text.mjs')]);
const colorOf = (fid) => Troops.FACTION?.[fid]?.color ?? '#777777';

/** 견본 판(설계 §7 값의 출처와 같은 판): 26차례 끝까지 자동 진행. */
export function endingScene(seed = 1) {
  let s = R.createCampaign({factionId: 'F01', seed, map: 'v3', unlocks: ['U-MEM-01', 'U-MEM-02'], legacy: {runsFinished: 2, ambitionsAchieved: [], memoryLastSeen: {'U-MEM-01': 1, 'U-MEM-02': 2}}});
  for (let i = 0; i < 40 && !s.gameResult; i++) s = R.step(s, {type: 'END_TURN', autoPlayer: true});
  return s;
}

/** 판 동안 모으는 기록(웹 hud-ink createRunEndMemory 그대로 — 저장에 안 들어감): observe(상태) · frames · losses */
export const runEndMemory = () => Hud.createRunEndMemory();

/** 견본(탭 캡처용): endingScene 을 웹 기록 장치로 차례마다 보며 돌리고 data/ending-live-<seed>.json 에 둠(한 번 2~3분 · 다음부터 바로). */
export function endingLiveSample(seed = 1) {
  const file = resolve(ROOT, `port/godot/ui/data/ending-live-${seed}.json`);
  if (existsSync(file)) { const j = JSON.parse(readFileSync(file, 'utf8')); if (j.losses) return {state: R.deserialize(j.state), memory: {frames: j.frames, losses: j.losses}}; }
  let s = R.createCampaign({factionId: 'F01', seed, map: 'v3', unlocks: ['U-MEM-01', 'U-MEM-02'], legacy: {runsFinished: 2, ambitionsAchieved: [], memoryLastSeen: {'U-MEM-01': 1, 'U-MEM-02': 2}}});
  const mem = runEndMemory(); mem.observe(s);
  for (let i = 0; i < 40 && !s.gameResult; i++) { s = R.step(s, {type: 'END_TURN', autoPlayer: true}); mem.observe(s); }
  writeFileSync(file, JSON.stringify({state: R.serialize(s), frames: mem.frames, losses: mem.losses}));
  return {state: s, memory: {frames: mem.frames, losses: mem.losses}};
}

const josa = (w, a, b) => { const c = String(w).charCodeAt(String(w).length - 1) - 0xac00; return c >= 0 && c <= 11171 && c % 28 ? a : b; };
const noDot = (t) => String(t ?? '').replace(/\.\s*$/, '');

/** 사유 한 줄(설계 §6 갈래) — ranking 1 · 2위를 견줘 갈린 기준을 고른다. 패배면 앞에 '{세력} 승리 —'. */
function reasonLine(g, me, name) {   // g = {type, ranking, winnerFactionId}
  const [a, b] = g.ranking ?? [];
  let line = '기한이 되어 세력 순위로 끝났습니다';
  if (g.type === 'UNIFICATION') line = '세 큰 성을 모두 차지했습니다';
  else if (a && b) {
    if (a.majorCities !== b.majorCities) line = `큰 성 ${a.majorCities} 대 ${b.majorCities}로 앞섰습니다`;
    else if (a.minorCities !== b.minorCities) line = `큰 성이 같아 작은 성 ${a.minorCities} 대 ${b.minorCities}로 앞섰습니다`;
    else if (a.troops !== b.troops) line = '큰 성 · 작은 성이 같아 병력으로 앞섰습니다';
    else line = '큰 성 · 작은 성 · 병력이 모두 같아 정해진 순서로 앞섰습니다';
  }
  return g.winnerFactionId && g.winnerFactionId !== me ? `${name(g.winnerFactionId)} 승리 — ${line}` : line;
}

/** 화면 모델 — 한 판의 요약(판 상태든 기록 파일이든 같은 모양)에서. */
function view(sum, {tab = 'record', record = '첫 기록'} = {}) {
  const head = sum.type === 'UNIFICATION' ? (sum.won ? '통일' : '패배') : sum.type === 'TURN_LIMIT' ? (sum.won ? '승리' : '패배') : '멸망';
  const chron = [...sum.chron].sort((a, b) => a.turn - b.turn);
  const pick2 = chron.length > 1 ? [chron[0], chron[chron.length - 1]] : chron;
  const mine = (sum.ranking ?? []).find((r) => r.factionId === sum.me) ?? {};
  return {
    screen: 'ending', head, won: sum.won, turnText: `${sum.ended}차례`, reason: reasonLine(sum, sum.me, sum.factionName), ambition: sum.ambition ? noDot(sum.ambition) : null,
    backdrop: 'res://ui/art/ending-bg.webp',
    tabs: [['record', '기록'], ['rank', '순위'], ['chronicle', '연대기'], ['replay', '판도 재생'], ['roster', '명부']].map(([id, name]) => ({id, name})), tab,
    chronicle: pick2.map((c) => ({turn: `${c.turn}차례`, text: c.text})),
    records: [[['큰 성', String(mine.majorCities ?? 0)], ['작은 성', String(mine.minorCities ?? 0)], ['병력', sum.troopsText]],
      [['교전', `${sum.battles}회`], ['비틀린 역사', String(sum.twisted)], ['얻은 칭호', String(sum.titles)]]],
    scoreLabel: '총점', score: Number(sum.score).toLocaleString('en-US'), record,
    next: sum.unlock ? {title: sum.unlock.recalled ? '다시 떠오른 기억' : '다음 판에 남는 것', line: noDot(sum.unlock.line)} : null,
    home: '처음 화면', go: '다음 판',
    // 탭마다(웹 world.js 결과 판 2222~ · hud-ink runEndReplayHtml · runEndLossHtml): 순위 줄 · 연대기 전부 · 판도 재생 · 명부(전사 · 포로)
    rank: (() => { const rows = sum.ranking ?? [], maxT = Math.max(1, ...rows.map((r) => r.troops ?? 0));
      return rows.map((r, i) => ({n: i + 1, factionId: r.factionId, name: sum.factionName(r.factionId), me: r.factionId === sum.me, color: colorOf(r.factionId),
        major: r.majorCities ?? r.cities ?? 0, minor: r.minorCities ?? 0, troops: Display.troopText(r.troops ?? 0), ratio: (r.troops ?? 0) / maxT})); })(),
    // 연대기 탭 = 웹 결과 판 연대기 띠(world.js:2228 shownChron — chronicleEntries 여섯 넘으면 처음 · 고르게 넷 · 끝)
    chronAll: (() => { const all = sum.chronFull ?? chron; const shown = all.length <= 6 ? all : [all[0], ...Array.from({length: 4}, (_, i) => all[Math.round((i + 1) * (all.length - 1) / 5)]), all.at(-1)];
      return shown.map((c) => ({turn: `${c.turn}차례`, text: c.text, kind: c.kind ?? null})); })(),
    replay: sum.replay ? {...sum.replay, runKey: sum.runKey ?? null} : null,   // runKey = 웹 c286Key(시드 · 세력 · 차례) — 화면이 판마다 보던 차례를 따로 둠
    losses: sum.losses ?? null,
  };
}

/** 웹 world.js:2172 chronicleEntries 그대로(시작 · 사건 — 고른 것 · 성 얻음 · 위기 — 결과 · 칭호(자리만큼 고르게) · 끝 · 결과 연대기 줄). */
function chronicleEntries(s, v) {
  const me = s.playerFactionId, f = s.factions[me], out = [], cn = (id) => s.cityDisplayNames?.[id] ?? s.cities[id]?.name ?? id;
  const ended = (t) => s.gameResult ? Math.max(1, Math.min(t - 1, R.CAMPAIGN_TURN_LIMIT)) : t;
  out.push({turn: 1, kind: 'start', text: `${s.officers[f?.rulerId]?.name ?? f?.name ?? me}, ${cn(f?.startCapitalCityId ?? f?.capitalCityId)}에서 일어서다`});
  for (const x of s.c22?.fired ?? []) if (x.factionId === me) { const e = Ev.C22_EVENTS.find((e) => e.eventId === x.eventId), c = e?.choices.find((c) => c.id === x.choiceId); if (e) out.push({turn: x.turn, kind: 'event', text: `${e.title}${c ? ` — ${c.label}` : ''}`}); }
  for (const [id, x] of Object.entries(s.c22?.captures ?? {})) if (x.factionId === me && s.cities[id]?.ownerFactionId === me) out.push({turn: x.turn, kind: 'city', text: `${KT.josa(cn(id) + '을(를)')} 얻다`});
  if (s.c31?.actorId && s.c31.startTurn) out.push({turn: s.c31.startTurn, kind: 'crisis', text: `${s.officers[s.c31.actorId]?.name ?? ''}의 ${s.c31.name ?? '위기'}${s.c31.resolved ? ` — ${s.c31.resolved === 'TIMEOUT' ? '지나감' : '막아냄'}` : ''}`});
  const titles = []; for (const [id, r] of Object.entries(s.campaignGrowth?.officers ?? {})) if (s.officers[id]?.allegianceFactionId === me) for (const t of r.titles ?? []) titles.push({turn: t.turn, kind: 'title', text: `${s.officers[id].name} — ‘${t.name}’`});
  titles.sort((a, b) => a.turn - b.turn);
  const room = Math.max(3, 13 - out.length), step = Math.max(1, Math.ceil(titles.length / room)); out.push(...titles.filter((_, i) => i % step === 0).slice(0, room));
  const g = s.gameResult; if (g) out.push({turn: ended(s.turn), kind: 'end', text: g.type === 'UNIFICATION' ? '천하가 하나로 모이다' : g.type === 'TURN_LIMIT' ? '판이 닫히다' : '깃발이 내려지다'});
  out.push(...Hud.resultChronicleRows(v.gameResult, ended(s.turn)));
  return out.sort((a, b) => a.turn - b.turn || (a.kind === 'end') - (b.kind === 'end'));
}

/** 지금 판(gameResult 있음) → 화면 모델. */
export function endingModel(s, opts = {}) {
  const v = R.view(s), g = s.gameResult, me = s.playerFactionId;
  const won = g.winnerFactionId === me;
  const cn = (id) => s.cityDisplayNames?.[id] ?? s.cities[id]?.name ?? id;
  // 연대기 — 시작 · 칭호 · 역사 비교 · 끝 줄을 빼고 성 얻음 · 사건(제목만) · 위기(설계 §7)
  const chron = [];
  for (const x of s.c22?.fired ?? []) if (x.factionId === me) { const e = Ev.C22_EVENTS.find((e) => e.eventId === x.eventId); if (e) chron.push({turn: x.turn, text: e.title}); }
  for (const [id, x] of Object.entries(s.c22?.captures ?? {})) if (x.factionId === me && s.cities[id]?.ownerFactionId === me) chron.push({turn: x.turn, text: `${cn(id)}${josa(cn(id), '을', '를')} 얻다`});
  if (s.c31?.actorId && s.c31.startTurn) chron.push({turn: s.c31.startTurn, text: `${s.officers[s.c31.actorId]?.name}의 ${s.c31.name ?? '위기'}`});
  const troops = Object.values(v.ownArmies ?? {}).reduce((n, a) => n + (a.troopCount ?? 0), 0) + Object.values(v.ownCities ?? {}).reduce((n, c) => n + (c.reserveTroops ?? 0), 0);
  const titles = Object.values(v.officers).filter((o) => o.growth && o.allegianceFactionId === me).flatMap((o) => o.growth?.titles ?? []);
  return view({type: g.type, won, winnerFactionId: g.winnerFactionId, me, ranking: g.ranking, ended: Math.max(1, Math.min(s.turn - 1, R.CAMPAIGN_TURN_LIMIT)),
    score: Hud.campaignResultScore(v, won, R.CAMPAIGN_TURN_LIMIT).total, troopsText: Display.troopText(troops), battles: s.battleSequence ?? 0,
    twisted: Array.isArray(g.history?.twisted) ? g.history.twisted.length : Number(g.history?.twisted ?? 0), titles: titles.length,
    ambition: v.gameResult?.ambition?.endingLine, unlock: v.gameResult?.unlocksEarned?.[0] ?? null, chron, chronFull: chronicleEntries(s, v), runKey: `${s.campaignSeed}.${me}.${s.turn}`, factionName: (id) => s.factions[id]?.name ?? id,
    ...runEnd(s, opts.memory)}, opts);
}

/** 웹 runEndRecords(엔진 기록만) → 판도 재생(차례마다 성 주인 · 그 차례 일) · 명부(내 장수 전사 · 포로) */
function runEnd(s, memory) {
  try {
    const copy = {frames: (memory?.frames ?? []).map((f) => ({...f, events: [...(f.events ?? [])]})), losses: [...(memory?.losses ?? [])]};
    const rec = Hud.runEndRecords(s, copy);   // 함락 기록이 있으면 그것으로 차례를 다시 짓고, 없으면 판 동안 모은 기록(hud-host runMemory)
    const qr = (id) => { const [q, r] = String(id).split(',').map(Number); return {q, r}; };
    const cities = Object.values(s.cities).map((c) => ({id: c.cityId, name: s.cityDisplayNames?.[c.cityId] ?? c.name, ...qr(c.tileId), major: c.kind !== 'minor'}));
    const colors = Object.fromEntries(Object.keys(s.factions).map((f) => [f, colorOf(f)]));
    return {
      replay: rec.frames.length ? {cities, colors, sessionOnly: rec.sessionOnly, frames: rec.frames.map((f) => ({turn: f.turn, owners: f.owners, events: f.events.map((e) => ({text: e.text, cityId: e.cityId ?? null}))}))} : null,
      losses: rec.losses.map((r) => ({officerId: r.officerId, name: r.name, line: `${r.turn}차례 · ${r.place} · ${r.kind}`, art: officerArt(r.officerId)})),
    };
  } catch { return {replay: null, losses: []}; }
}

/** 기록 파일(설계 ending-state.mjs 출력 — 그 판을 엔진으로 끝까지 돌린 값) → 화면 모델. 견본 캡처용(지금 엔진으로 같은 시드를 돌리면 판이 달라짐 — 설계 기본 장면 = 이 기록). */
export function endingRecordModel(j, opts = {}) {
  const names = {F01: '조조', F02: '유비', F03: '손권'};
  const chron = (j.chron ?? []).filter((c) => ['city', 'event', 'crisis'].includes(c.kind)).map((c) => {
    if (c.kind === 'city') { const n = c.text.replace(/ 얻다$/, ''); return {turn: c.turn, text: `${n}${josa(n, '을', '를')} 얻다`}; }
    return {turn: c.turn, text: c.kind === 'crisis' ? c.text.replace(/ — .*$/, '') : c.text.split(' — ')[0]};
  });
  return view({type: j.type, won: j.won, winnerFactionId: j.won ? 'F01' : j.ranking?.[0]?.factionId, me: 'F01', ranking: j.ranking, ended: j.ended, score: j.score.total,
    troopsText: j.troopsShown, battles: j.battles, twisted: Array.isArray(j.history?.twisted) ? j.history.twisted.length : 0, titles: (j.titles ?? []).length,
    ambition: j.ambition?.endingLine, unlock: j.unlocksEarned?.[0] ?? null, chron, factionName: (id) => names[id] ?? id}, opts);
}
