#!/usr/bin/env node
// @ts-check
// 유니티 UI 호스트 (Claude, 2026-10-24). 고도 이식 방의 tools/port/host.mjs 규약(표준 입출력 한 줄 JSON)을 그대로 쓰고
// 'hud' 명령 하나를 더한다 — 유니티는 이 프로세스를 띄워 {cmd:'hud'} 로 지도 HUD 모델을 받는다.
//   node port/unity-ui/host/hud-host.mjs                          → 대화형(표준 입출력)
//   node port/unity-ui/host/hud-host.mjs --export <파일> [--fixture c464] → 한 장 떠서 JSON 파일로(견본 · 캡처용)
// --fixture c464 = 웹 C464 캡처와 같은 판(c437 fixture · 황충/조조) — 웹 캡처와 나란히 비교하려고.
import {createInterface} from '../../../../tools/port/web/shims/node-readline.mjs';
import {writeFileSync, mkdirSync} from '../../../../tools/port/web/shims/node-fs.mjs';
import {dirname, resolve} from '../../../../tools/port/web/shims/node-path.mjs';
import {pathToFileURL} from '../../../../tools/port/web/shims/node-url.mjs';

const out = process.stdout.write.bind(process.stdout);
for (const k of /** @type {const} */ (['log', 'info', 'debug', 'warn'])) console[k] = (...a) => console.error(...a);
const {ROOT, hudModel} = await import('./hud-model.mjs');
const Host = await import(pathToFileURL(resolve(ROOT, 'tools/port/host.mjs')).href);

async function fixtureState(name) {
  if (name === 'growth') return (await import('./growth-model.mjs')).growthSample();   // 성장 견본 판(레벨업 하나 걸림)
  if (name === 'meeting-offer' || name === 'meeting-ally') {
    // 외교 만남 견본 판(고도 이식 방 요청 10-25): 새 판(seed 190919 · 조조 F01 · v3) + 유비(F02)와의 상황 하나
    //   meeting-offer = 유비가 휴전을 제안해 옴(incoming → S3 · proposal_answered → DIPLO_RESPOND)
    //   meeting-ally  = 유비와 이번 차례 동맹(S2 에 '동맹 끝내기' → S4 · betray_confirmed → DIPLO_END_ALLIANCE · 이른 종료라 신용 줄어듦)
    const Dp = await import(pathToFileURL(resolve(ROOT, 'prototype/src/campaign-diplomacy.mjs')).href);
    const ps = new Host.PortSession(); ps.newGame({seed: 190919, factionId: 'F01', map: 'v3'});
    const s = structuredClone(ps.state), key = Dp.diplomacyPair('F02', s.playerFactionId);
    // 접촉 = 내 정보에 유비 성 하나(새 판은 아직 못 만남 — 엔진 diplomacyContact 가 knowledge 로 셈)
    const [cid, c] = Object.entries(s.cities).find(([, x]) => x.ownerFactionId === 'F02');
    s.knowledge[s.playerFactionId].cities[cid] = {cityId: cid, name: c.name, tileId: c.tileId, ownerFactionId: 'F02'};
    if (name === 'meeting-offer') Dp.proposeDiplomacy(s, 'F02', s.playerFactionId, 'TRUCE');
    else s.c43.pairs[key] = {...(s.c43.pairs[key] ?? {}), state: 'ALLIANCE', since: s.turn, everAgreed: true};
    return s;
  }
  if (name === 'v3') {
    // 새 내정(v3) 판: 웹 실제 판(world.js begin)과 같은 trialRules.domesticV3 · 성에서 시작 — 성 화면 v3 견본 · 시험용
    const R = await import(pathToFileURL(resolve(ROOT, 'prototype/src/campaign-runtime.mjs')).href);
    let s = R.createCampaign({factionId: 'F01', seed: 190919, manualEndTurn: true, fieldArmies: false, trialRules: {domesticV3: true}});
    while (s.phase === 'AI' && !s.gameResult) s = R.step(s, {type: 'ADVANCE_AI'});
    return s;
  }
  if (name !== 'c464' && name !== 'c464-result') throw Error('unknown fixture ' + name);
  const {fixture, B, refresh} = await import(pathToFileURL(resolve(ROOT, 'prototype/test-campaign-c437-fixture.mjs')).href);
  // tools/smoke/c464-server.mjs 의 /c440-fixture.json 과 같은 손질.
  const s = fixture('G06'); s.prologue = null; s.ambitions.closed = true; s.runModifiers.blessing.closed = true; s.turnSummary = null; s.armies[B].tileId = '7,3'; s.campaignGrowth.officers.G06.c29.gauge = 5;
  if (name === 'c464-result') s.armies[B].tileId = '8,3';   // 교전 결과 견본: 조운을 황충(궁병) 사거리 2 로(설계 06 §6 기본 장면)
  refresh(s);
  return s;
}

const args = process.argv.slice(2), opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
if (args.includes('--export')) {
  const file = resolve(process.cwd(), opt('--export') ?? 'hud.json');
  let state, report = null, result = null, sortie = null, roster = null, stratagem = null;
  if (opt('--gap2-state')) {
    const {readFileSync} = await import('../../../../tools/port/web/shims/node-fs.mjs');
    const R = await import(pathToFileURL(resolve(ROOT, 'prototype/src/campaign-runtime.mjs')).href);
    state = R.deserialize(JSON.parse(readFileSync(resolve(opt('--gap2-state')), 'utf8')));
  } else if (opt('--event')) {
    // 사건 장면: 테스트 c197 과 같은 새 판(고정 시작 성 · 2차례)에 엔진 덱 사건 하나를 건다
    const R = await import(pathToFileURL(resolve(ROOT, 'prototype/src/campaign-runtime.mjs')).href);
    state = R.createCampaign({startCities: 'fixed', factionId: 'F01', fieldArmies: false, manualEndTurn: true, c31: false, council: false});
    state.turn = 2; state.turnNumber = 2; state.globalTick = 200; state.currentDate = 10;
    (await import('./event-model.mjs')).offerEvent(state, opt('--event'));
  } else if (args.includes('--report')) {
    // 차례 보고 장면: 고정 시작 · 업 둔전을 골라 완공 차례까지(설계서 13-report §5.3 과 같은 방법 — 값은 엔진)
    report = (await import('./report-model.mjs')).builtScene();
    state = report.state;
  } else if (args.includes('--roster')) {
    // --roster [ai] = 웹 실측과 같은 판(seed 489 · 6명) · ai = 예전 AI 26차례 판(11명 · 쪽 넘김). --roster-filter · --roster-pick · --roster-pin · --roster-sort · --roster-query · --roster-focus
    const RM = await import('./roster-model.mjs'); const sc = opt('--roster') === 'ai' ? RM.rosterScene() : RM.webRosterScene();
    state = sc.state; roster = RM.rosterModel(sc.state, {pick: opt('--roster-pick') ?? sc.pickId, filter: opt('--roster-filter'), sort: opt('--roster-sort'), query: opt('--roster-query'), pin: opt('--roster-pin')});
    if (opt('--roster-focus')) roster.focus = opt('--roster-focus');   // 견본 캡처용: 그 줄에 포커스(웹 실측은 줄을 눌러 고른 뒤라 금 테가 보임)
  } else if (args.includes('--sortie')) {
    // --sortie web | web-empty | web-two = 웹 실측과 같은 판(web-port-fixture 'sortie': seed 489 · 시작 성 고정 · 바깥 부대 없음) + 조조 / 없음 / 조조 · 허저
    const SM = await import('./sortie-model.mjs'), kind = String(opt('--sortie') ?? '');
    const sc = kind.startsWith('web') ? SM.webSortieScene(kind) : SM.sortieScene();
    state = sc.state; sortie = SM.sortieModel(sc.state, sc.cityId, sc.selections, sc.viewId);
    sortie.backdrop = 'res://ui/art/sortie-bg.webp';   // 병영 마당(Codex image_gen v2 · 의뢰 docs/work-integration/20261024/godot-ui/art/ORDER-SORTIE-BG.md · 원본 1672×941 → 1920)
  } else if (args.includes('--stratagem')) {
    // 계략 예고: c248 검증 손잡이와 같은 자리(유비 부대 업 곁) · 순욱 → 유비 부대 이간(설계 19 기본 · --no-target = 대상 전)
    const SM = await import('./stratagem-model.mjs'); const sc = SM.stratagemScene();
    state = sc.state; stratagem = SM.stratagemModel(state, args.includes('--no-target') ? {...sc.cmd, targetArmyId: undefined} : sc.cmd);
  } else if (args.includes('--result')) {
    result = (await import('./result-model.mjs')).resultScene(await fixtureState('c464-result'));
    state = result.after;
  } else if (opt('--fixture')) state = await fixtureState(opt('--fixture'));
  else {
    const ps = new Host.PortSession(); ps.newGame({seed: Number(opt('--seed') ?? 190919), factionId: opt('--faction') ?? 'F01', map: opt('--map-id') ?? 'v3'});
    // --end-turns N: 새 판을 N 차례 넘긴 장면(견본 — 예: 중국 판 시드 190919 6차례 = 눈보라 · 산안개, C514 지역 날씨)
    for (let i = 0; i < Number(opt('--end-turns') ?? 0); i++) ps.step({type: 'END_TURN'}, ps.revision);
    state = ps.state;
  }
  if (args.includes('--sets-sample')) {
    // 장수 세트 진행판 견본(사용자 10-25 'TFT 처럼'): c464 판의 세트 기록에 '조조의 책사들 3/4 · 3단계' · '다섯 범 장군 2/5 · 2단계' 를 넣고 황충(다섯 범 장군 소속) 부대에 세트 칩(시험 그림용 — 실제 판은 엔진 c30 그대로)
    state = structuredClone(state); const snap = state.c30?.factions?.[state.playerFactionId];
    if (snap) { for (const x of snap.sets) { if (x.id === 'ST-03') { x.count = 3; x.tier = 3; } if (x.id === 'ST-01') { x.count = 2; x.tier = 2; } }
      const hz = Object.values(state.armies).find((a) => a.commanderId === 'G06');
      if (hz) { snap.armies ??= {}; snap.armies[hz.armyId] = {teamUps: [], effectBonds: [], moraleUsed: false, formationUsed: false, firstTacticUsed: false, ...(snap.armies[hz.armyId] ?? {}), commanderId: 'G06', sets: [{id: 'ST-01', tier: 2}]}; } }
  }
  let model;
  try { model = hudModel(state, {selectedArmyId: opt('--select') ?? null}); }
  catch (e) {
    // 명부 견본(AI 26차례 판)은 지도 HUD 를 쓰지 않는 전체 화면 — HUD 모델 실패는 기록만(원인은 REPORT 남은 문제)
    if (!roster) throw e;
    console.error('[hud-host] HUD 모델 건너뜀(명부 전체 화면):', e instanceof Error ? e.message : e);
    model = {screen: 'roster-only', units: {rows: []}, minimap: {cities: []}};
  }
  if (result) { const RM = await import('./result-model.mjs'); model.result = RM.resultModel(result.before, result.after, result.combat);
    const {mapModel} = await import('./map-model.mjs'); model.map = mapModel(state, {selectedArmyId: result.attackerId}); }
  if (sortie) model.sortie = sortie;
  if (sortie && opt('--sortie-layout') && sortie.web) sortie.web.layout = opt('--sortie-layout');   // 출진 시안 견본: compact(v1) · v2
  if (stratagem) { const {stratagemMap} = await import('./stratagem-model.mjs'); model.stratagem = stratagem; model.map = await stratagemMap(state, stratagem); }
  if (args.includes('--ending')) {
    // 견본 = 설계 14 기본 장면의 기록(시드 1 · 26차례 · 승리 — docs/work-integration/20261023/screen-mockups/14-ending/ending-state-seed1.json). --ending-live = 지금 엔진으로 끝까지 돌린 판(2~3분)
    const EM = await import('./ending-model.mjs');
    // --ending-tab <rank|chronicle|replay|roster> = 탭 견본(판도 재생 · 명부까지 차는 실제 판 — endingLiveSample 저장본)
    if (opt('--ending-tab')) { const L = EM.endingLiveSample(1); model.ending = EM.endingModel(L.state, {tab: opt('--ending-tab'), memory: L.memory}); }
    else model.ending = args.includes('--ending-live') ? EM.endingModel(EM.endingScene(1))
      : EM.endingRecordModel(JSON.parse((await import('../../../../tools/port/web/shims/node-fs.mjs')).readFileSync(resolve(ROOT, 'docs/work-integration/20261023/screen-mockups/14-ending/ending-state-seed1.json'), 'utf8')));
  }
  if (args.includes('--help')) model.help = (await import('./help-model.mjs')).helpModel({pick: opt('--help') && !String(opt('--help')).startsWith('--') ? opt('--help') : '전열', expanded: args.includes('--expanded')});
  if (args.includes('--settings')) { const SM = await import('./settings-model.mjs');
    model.settings = SM.settingsModel(opt('--ui-size') ? {uiSize: opt('--ui-size')} : {}, {tab: opt('--settings') && !String(opt('--settings')).startsWith('--') ? opt('--settings') : 'display', focus: opt('--focus') ?? null}); }
  if (args.includes('--save-confirm')) { const SM = await import('./settings-model.mjs');
    model.save = SM.saveConfirmModel({summary: SM.sampleSummary(state, new Date(2026, 9, 19, 21, 40).getTime()), color: '#8e2018'}); }
  if (args.includes('--guide')) model.guide = (await import('./guide-model.mjs')).guideModel('G17', {state: args.includes('--first') ? 'first' : 'reselect'});
  if (args.includes('--faction-pick')) { model.faction = (await import('./faction-model.mjs')).factionModel(opt('--faction-pick') && !String(opt('--faction-pick')).startsWith('--') ? opt('--faction-pick') : 'F01', {china12: args.includes('--china12')});
    model.faction.backdrop = 'res://ui/art/faction-bg.webp'; }   // 새벽 안개 위 돌 사열대(Codex image_gen v2 · 의뢰 docs/work-integration/20261024/godot-ui/art/ORDER-FACTION-BG.md · 원본 1672×941 → 1920)
  // 시작 메뉴: 저장 상태(설계 01 §6 — 이 견본은 '저장 없음' 기본). 실제 판은 고도 쪽이 저장을 읽어 continue 를 채운다.
  // continue 모양: 저장 있음 = {ok: true, summary: '조조 · 1차례 / 26', factionId: 'F01'} · 없음 / 옛 형식 / 손상 / 읽기 오류 = {ok: false, reason}
  if (args.includes('--title')) model.title = args.includes('--saved')
    ? {screen: 'title', continue: {ok: true, summary: '조조 · 1차례 / 26', factionId: 'F01'}, selected: 'continue'}
    : {screen: 'title', continue: {ok: false, reason: '저장된 판이 없습니다'}, selected: 'new'};
  if (roster) model.roster = roster;
  if (report) model.report = (await import('./report-model.mjs')).reportModel(report.before, report.after, report.rows);
  if (opt('--event')) model.event = (await import('./event-model.mjs')).eventModel(state);
  if (args.includes('--officer')) model.officer = (await import('./officer-model.mjs')).officerModel(state, opt('--officer') && !String(opt('--officer')).startsWith('--') ? opt('--officer') : null);
  if (model.officer && opt('--officer-tab')) { model.officer.tab = opt('--officer-tab'); model.officer.tabs = model.officer.tabs.map((t) => ({...t, selected: t.key === opt('--officer-tab')})); }   // 견본: 처음 보일 쪽
  if (args.includes('--meeting')) {
    // 외교 만남 화면(10-25 문명식) 견본: --meeting talk | first | offer | answer | betray · 상대 = 유비(F02) · c464 판
    const DM = await import('./diplomacy-model.mjs'), Dp = await import(pathToFileURL(resolve(ROOT, 'prototype/src/campaign-diplomacy.mjs')).href);
    const RR = await import(pathToFileURL(resolve(ROOT, 'prototype/src/campaign-runtime.mjs')).href);
    const mode = opt('--meeting') && !String(opt('--meeting')).startsWith('--') ? opt('--meeting') : 'talk';
    let st = structuredClone(state);
    if (mode === 'offer') Dp.proposeDiplomacy(st, 'F02', st.playerFactionId, 'TRUCE');
    if (mode === 'answer') st = RR.step(st, {type: 'DIPLO_PROPOSE', factionId: 'F02', kind: 'TRUCE'});
    if (mode === 'betray') { st.c43.pairs[Dp.diplomacyPair('F02', st.playerFactionId)] = {...(st.c43.pairs[Dp.diplomacyPair('F02', st.playerFactionId)] ?? {}), state: 'ALLIANCE', since: st.turn}; }
    model.diplomacy = DM.meetingModel(st, 'F02', {mode: ['first', 'betray'].includes(mode) ? mode : null});
  }
  if (args.includes('--draft')) {
    // 드래프트(동료 고르기) — 웹 그대로(10-25): --draft [깨울 카드 순번 쉼표 목록 예: 1 · 1,3]
    const DM = await import('./draft-model.mjs'), k = String(opt('--draft') ?? '');
    const lock = /^[\d,]+$/.test(k) ? k.split(',').map(Number) : [];
    model.draft = DM.draftModel(DM.draftSample({lock}));
  }
  if (args.includes('--growth')) {
    // 성장(레벨업 · 특기 고르기) — 웹 그대로(10-25): --growth [traitId 순번 0~2 = 고른 상태]
    const GM = await import('./growth-model.mjs'), s = GM.growthSample(), base = GM.growthModel(s);
    const k = opt('--growth'), idx = k !== undefined && /^\d$/.test(k) ? Number(k) : -1;
    model.growth = idx >= 0 ? GM.growthModel(s, {pick: base.cards[idx]?.id}) : base;
  }
  if (args.includes('--diplomacy')) model.diplomacy = (await import('./diplomacy-model.mjs')).diplomacyModel(state, opt('--diplomacy') && !String(opt('--diplomacy')).startsWith('--') ? opt('--diplomacy') : null);
  if (args.includes('--city')) {
    const C = await import('./city-model.mjs');
    const cid = state.factions[state.playerFactionId].capitalCityId;
    const s2 = ['busy', 'v3', 'v3warn'].includes(opt('--city')) ? C.withProduction(state, cid) : state;   // v3 = --fixture v3 판에 생산 중 + 예약
    // v3warn = 경고 줄 견본: 창고 곡식을 2차례치만 · 봉록 1순 밀림(웹 warningsV3 의 곡식 · 봉록 경고)
    if (opt('--city') === 'v3warn') { const f = s2.factions[s2.playerFactionId]; f.granary = 1500; f.unpaidTurns = 1; }
    model.city = C.cityModel(s2, cid);
    if (opt('--city-drawer')) model.city.__drawer = opt('--city-drawer');   // 견본 캡처: v3 옆 서랍 열린 상태(ledger · jobs · reserve · seat:office · policy · land · emergency)
    if (opt('--city-facility')) model.city.__facility = opt('--city-facility');
  }
  if (args.includes('--map')) { const {mapModel} = await import('./map-model.mjs'); model.map = mapModel(state, {selectedArmyId: opt('--select') ?? model.selected?.id ?? null}); }
  mkdirSync(dirname(file), {recursive: true});
  writeFileSync(file, JSON.stringify(model, null, 1));
  console.error(`[hud-host] ${file} · 부대 ${model.units.rows.length} · 성 ${model.minimap.cities.length}`);
  process.exit(0);
}

const session = new Host.PortSession();
const send = (obj) => out(JSON.stringify(obj) + '\n');
// 상대 차례 진행 소식(10-25 사용자 '상대 턴 진행 중이라는 것 · 내 턴이 됐다는 것'): 호스트가 상대 세력을 한 번에 돌리는 동안 세력이 바뀔 때마다
// {id:null, event:'aiProgress', factionId, name, index, total, names} · 끝에 {event:'aiProgress', done:true} — 고도 TurnCue 가 '적군의 차례' 띠에 그림.
// 윈도 파이프는 쓰기가 비동기라 계산이 끝난 뒤 한꺼번에 나간다 → 표준 출력을 막힘 모드로(진행 중에 바로 나가게).
try { /** @type {any} */ (process.stdout)._handle?.setBlocking?.(true); } catch { /* 안 되면 끝에 한꺼번에 */ }
{
  const R = await import(pathToFileURL(resolve(ROOT, 'prototype/src/campaign-runtime.mjs')).href);
  const AM = await import('./audio-model.mjs');
  const headFaction = (s) => { const e = s.aiQueue?.[0]; return e?.factionId ?? e?.faction ?? e?.tacticsFaction ?? null; };
  session.advanceAi = (s) => {
    if (s.phase !== 'AI' || s.gameResult) return s;
    const order = [...new Set((s.aiQueue ?? []).map((e) => e.factionId ?? e.faction ?? e.tacticsFaction).filter((f) => f && s.factions[f]?.alive !== false))];
    const names = order.map((f) => AM.factionLabel(s, f));
    let n = 0, last = null;
    while (s.phase === 'AI' && !s.gameResult) {
      const f = headFaction(s);
      if (f && f !== last && order.includes(f)) { last = f; send({id: null, event: 'aiProgress', factionId: f, name: names[order.indexOf(f)], index: order.indexOf(f), total: order.length, names}); }
      if (++n > 500) throw Error('AI_STEP_LIMIT');
      const prev = s; s = R.step(s, {type: 'ADVANCE_AI'});
      session.aiReplayStep?.(prev, s);   // 상대 차례 연출 기록(이식 방 host.mjs aiReplay — 걸음마다 내게 보인 이동 · 공격)
    }
    if (last) send({id: null, event: 'aiProgress', done: true, total: order.length, names});
    return s;
  };
}
send({id: null, event: 'ready', protocol: Host.PROTOCOL, ui: 'unity-hud'});
const rl = createInterface({input: process.stdin, crlfDelay: Infinity});
// 줄은 들어온 순서대로 하나씩(앞 명령의 await 가 끝나기 전에 다음 명령이 돌지 않게 — 'fixture' 다음 'hud' 경쟁 방지)
let queue = Promise.resolve();
let lastTurn = null, lastAttack = null;
const runMemory = (await import('./ending-model.mjs')).runEndMemory();   // 판도 재생 · 명부(웹 world.js c286Memory): 명령마다 상태를 보여 줌 — 차례마다 성 주인 · 함락 · 잃은 장수, 새 판이면 비움
let draftMemo = {factionId: null, seed: null, locked: []};   // 'draftUi' 용(마지막 드래프트의 세력 · 시드 · 깨운 차례)   // 'report' · 'result' 용 전후 상태
rl.on('line', (line) => { queue = queue.then(() => handleLine(line)); });
async function handleLine(line) {
  if (!line.trim()) return;
  let req;
  try { req = JSON.parse(line); } catch { send({id: null, ok: false, error: {code: 'BAD_REQUEST'}}); return; }
  if (req.cmd === 'quit') { send({id: req.id ?? null, ok: true}); rl.close(); return; }
  try {
    if (req.cmd === 'fixture') { session.commit(await fixtureState(req.name)); send({id: req.id ?? null, ok: true, revision: session.revision}); return; }
    if (req.cmd === 'faction') {
      // 군주 고르기 모델(판 없이도 됨 — 군주마다 새 판 미리보기): {factionId?} — 고도 이식 방 요청 10-24
      const faction = (await import('./faction-model.mjs')).factionModel(req.factionId ?? 'F01', {china12: !!req.china12 || req.map === 'china'});   // 12세력 판 = {map:'china', china12:true}
      faction.backdrop = 'res://ui/art/faction-bg.webp';
      send({id: req.id ?? null, ok: true, faction}); return;
    }
    if (req.cmd === 'event') {
      // 사건 모델(지금 판 · 걸린 사건이 있을 때만 — 없으면 event: null): EventView.choice_confirmed(id) → step {type:'EVENT_CHOICE', eventId, choiceId}
      const event = (await import('./event-model.mjs')).eventModel(session.require());
      send({id: req.id ?? null, ok: true, revision: session.revision, event}); return;
    }
    if (req.cmd === 'report') {
      // 차례 보고(마지막 'step' END_TURN 전후): {report: {cards: [...]}} — 카드가 없으면 cards: []
      if (!lastTurn) throw Error('NO_TURN');
      const report = (await import('./report-model.mjs')).turnReport(lastTurn.before, lastTurn.after);
      send({id: req.id ?? null, ok: true, revision: session.revision, report}); return;
    }
    if (req.cmd === 'result') {
      // 교전 결과(마지막 'step' ATTACK_UNIT · ATTACK_CITY 전후 · 엔진 lastCombat): 판만(지도 층 없음)
      if (!lastAttack || !lastAttack.after.lastCombat) throw Error('NO_COMBAT');
      const result = (await import('./result-model.mjs')).resultModel(lastAttack.before, lastAttack.after, lastAttack.after.lastCombat);
      send({id: req.id ?? null, ok: true, revision: session.revision, result}); return;
    }
    if (req.cmd === 'city') {
      // 성 / 내정 모델(지금 판 · 내 성): {cityId?} — 내 성 클릭 → CityView(출진은 그 화면 안 단추 · 총괄 10-25 사용자 지적) · city_changed 뒤 다시 받기
      const city = (await import('./city-model.mjs')).cityModel(session.require(), req.cityId ?? null);
      if (!city) throw Error('NO_CITY');
      send({id: req.id ?? null, ok: true, revision: session.revision, city}); return;
    }
    if (req.cmd === 'growth') {
      // 성장 모델(지금 판 · 걸린 레벨업): {pick?: traitId} — GrowthView.card_picked 뒤 다시 받기 · 확정 = 모델 cards[i].command 를 step 으로
      const growth = (await import('./growth-model.mjs')).growthModel(session.require(), {pick: req.pick ?? null});
      send({id: req.id ?? null, ok: true, revision: session.revision, growth}); return;
    }
    if (req.cmd === 'roster') {
      // 소속 장수 모델(지금 판): {pick?, filter?: all|army|gov|idle, sort?, query?, page?, pin?, locked?} — RosterView 신호마다 다시 받아 update()
      const roster = (await import('./roster-model.mjs')).rosterModel(session.require(), req);
      send({id: req.id ?? null, ok: true, revision: session.revision, roster}); return;
    }
    if (req.cmd === 'officer') {
      // 장수 정보 모델(지금 판): {officerId?} — OfficerView.officer_changed 뒤 다시 그릴 때
      const st = session.require();
      const officer = (await import('./officer-model.mjs')).officerModel(st, req.officerId ?? null);
      send({id: req.id ?? null, ok: true, revision: session.revision, officer}); return;
    }
    if (req.cmd === 'diplomacy') {
      // 외교 모델(지금 판): {factionId?} — DiplomacyView.faction_picked 뒤 다시 그릴 때
      const st = session.require();
      // meeting:true = 외교 만남 화면(10-25 문명식) 무대 · mode 로 첫 만남(first) · 동맹 끝내기 확인(betray)을 강제(없으면 엔진 상태로 talk · offer · answer)
      const DM = await import('./diplomacy-model.mjs');
      const diplomacy = req.meeting ? DM.meetingModel(st, req.factionId ?? null, {mode: req.mode ?? null}) : DM.diplomacyModel(st, req.factionId ?? null);
      send({id: req.id ?? null, ok: true, revision: session.revision, diplomacy}); return;
    }
    if (req.cmd === 'ending') {
      // 판 결과 모델(지금 판 — gameResult 가 있어야 함): {tab?, record?: '첫 기록' | '새 기록' | null}
      const st = session.require(); if (!st.gameResult) throw Error('NO_RESULT');
      const ending = (await import('./ending-model.mjs')).endingModel(st, {tab: req.tab ?? 'record', record: req.record === undefined ? '첫 기록' : req.record, memory: runMemory});
      send({id: req.id ?? null, ok: true, revision: session.revision, ending}); return;
    }
    if (req.cmd === 'help') {
      // 도움말 모델: {pick?: 항목 이름, open?: 묶음, query?: 검색어} — 판 없이도 됨(시작 화면 '플레이 안내' = {pick:'조작', open:'기본'})
      const help = (await import('./help-model.mjs')).helpModel({pick: req.pick ?? '전열', open: req.open ?? null, query: req.query ?? ''});
      send({id: req.id ?? null, ok: true, help}); return;
    }
    if (req.cmd === 'settings') {
      // 설정 판 모델: {prefs?: 고도 쪽 저장 값, tab?, focus?, status?: 'reset' | 'fail'} — 판 없이도 됨
      const settings = (await import('./settings-model.mjs')).settingsModel(req.prefs ?? {}, {tab: req.tab ?? 'display', focus: req.focus ?? null, status: req.status ?? null});
      send({id: req.id ?? null, ok: true, settings}); return;
    }
    if (req.cmd === 'saveConfirm') {
      // 저장 확인 카드: {summary(웹 saveSlotSummary 형식 — 고도 쪽이 이전 저장에서 읽음), color?(세력색)}
      const save = (await import('./settings-model.mjs')).saveConfirmModel({summary: req.summary ?? '', color: req.color ?? '#8e2018'});
      send({id: req.id ?? null, ok: true, save}); return;
    }
    if (req.cmd === 'guide') {
      // 안내자 고르기 모델: {guideId?, state?: 'first' | 'reselect', voice?: [ids]}
      const guide = (await import('./guide-model.mjs')).guideModel(req.guideId ?? 'G17', {state: req.state ?? 'first', voice: req.voice ?? []});
      send({id: req.id ?? null, ok: true, guide}); return;
    }
    if (req.cmd === 'sortie') {
      // 출진 편성 모델(지금 판): {cityId?, selections:[{officerId, count?(엔진 단위 — 표시 ×10)}], viewId?} — 고도 이식 방 요청 10-24
      const SM = await import('./sortie-model.mjs'), st = session.require();
      const cityId = req.cityId ?? st.factions[st.playerFactionId].capitalCityId;
      const sortie = SM.sortieModel(st, cityId, req.selections ?? [], req.viewId ?? null);
      sortie.backdrop = 'res://ui/art/sortie-bg.webp';
      send({id: req.id ?? null, ok: true, revision: session.revision, sortie}); return;
    }
    if (req.cmd === 'stratagem') {
      // 계략 예고 모델(지금 판): {officerId, kind: 'RUMOR'|'SOW_DISCORD'|'DISRUPT_SUPPLY', targetArmyId?|targetCityId?, map?: true}
      // 대상이 없으면 '대상 전'(성공 열 비움 · 실행 불가 + 사유). map:true = 지도 층(고른 부대 없음 · 대상 꺾쇠 자리) 같이.
      const SM = await import('./stratagem-model.mjs'), st = session.require();
      const stratagem = SM.stratagemModel(st, {type: 'STRATAGEM', officerId: req.officerId, kind: req.kind, targetArmyId: req.targetArmyId, targetCityId: req.targetCityId});
      send({id: req.id ?? null, ok: true, revision: session.revision, stratagem, ...(req.map ? {map: await SM.stratagemMap(st, stratagem)} : {})}); return;
    }
    if (req.cmd === 'hud') {
      // map:true = 지도 모델(이동 범위 · 경로 · attacks[i] 교전 예고 값 — ForecastCard 가 쓰는 모양)을 같이(고도 이식 방 요청 10-24)
      const st = session.require(), hud = hudModel(st, {selectedArmyId: req.armyId ?? null});
      if (req.map) { const {mapModel} = await import('./map-model.mjs'); hud.map = mapModel(st, {selectedArmyId: req.armyId ?? hud.selected?.id ?? null}); }
      send({id: req.id ?? null, ok: true, revision: session.revision, hud}); return;
    }
    // 차례 넘김 · 공격 전 상태를 잡아 두기('report' · 'result' 가 전후를 견줌 — 고도 이식 방 요청 10-24)
    const kind = req.cmd === 'step' ? req.command?.type : null;
    const before = kind && session.state ? structuredClone(session.state) : null;
    if (kind === 'END_TURN') req.command = {...req.command, incremental: true};   // 상대 세력을 한 칸씩(웹과 같은 incremental) — advanceAi 가 세력마다 진행 소식을 냄
    const res = Host.handle(session, req);
    // 드래프트(고도 이식 방 호스트 명령 draft · draftLock · draftReroll · draftConfirm) 응답에 웹 화면 모델을 붙임(draftUi) — 세력 · 시드 · 깨운 차례는 여기서 기억
    if (['draft', 'draftLock', 'draftUnlock', 'draftReroll', 'draftConfirm'].includes(req.cmd) && res?.draft) {
      if (req.cmd === 'draft') draftMemo = {factionId: res.factionId ?? req.factionId, seed: res.seed ?? req.seed, locked: []};
      if (req.cmd === 'draftLock' && !draftMemo.locked.includes(req.officerId)) draftMemo.locked.push(req.officerId);
      if (req.cmd === 'draftUnlock') draftMemo.locked = draftMemo.locked.filter((id) => id !== req.officerId);   // 고르기 취소(이식 방 unlockDraftOfficer · 응답 fixed = 고정 목록)
      try { res.draftUi = (await import('./draft-model.mjs')).draftModel({factionId: draftMemo.factionId, seed: draftMemo.seed, locked: res.locked ?? draftMemo.locked, ...res}); }
      catch (e) { console.error('[hud-host] draftUi', e instanceof Error ? e.message : e); }
    }
    if (before && kind === 'END_TURN') lastTurn = {before, after: structuredClone(session.state)};
    if (session.state) { try { runMemory.observe(session.state); } catch (e) { console.error('[hud-host] runMemory', e instanceof Error ? e.message : e); } }
    if (before && ['ATTACK_UNIT', 'ATTACK_CITY'].includes(kind)) lastAttack = {before, after: structuredClone(session.state)};
    // 소리(10-25 사용자 "소리가 안 난다"): 명령 = 낼 소리 목록 + 지도 곡 · 새 판 · 불러오기 · 보기 = 지도 곡만 — 고도 UiAudio 가 응답에서 읽음
    let audio;
    try {
      const AM = await import('./audio-model.mjs');
      if (before) audio = AM.commandAudio(req.command, before, session.state);
      else if (['new', 'load', 'view', 'scene', 'fixture'].includes(req.cmd) && session.state) audio = {sfx: [], bgm: AM.mapScene(session.state), combat: false};
    } catch (e) { console.error('[hud-host] audio', e instanceof Error ? e.message : e); }
    // 명령 확정 연출(웹 commitFx — world.js:664): 공격 · 전법 = 호부(tally) · 차례 넘김 = 인장(seal) — 고도 TurnCue 가 응답에서 읽음
    const fx = ['ATTACK_UNIT', 'ATTACK_CITY', 'USE_TACTIC'].includes(kind) ? 'tally' : kind === 'END_TURN' ? 'seal' : null;
    // 전법 컷인(웹 showTacticCutIn — 전투에 전법 이름이 있으면): 고도 TacticCutin 이 응답에서 읽음
    let cutin = null;
    try { if (before && ['ATTACK_UNIT', 'ATTACK_CITY', 'USE_TACTIC'].includes(kind)) cutin = (await import('./cutin-model.mjs')).cutinInfo(before, session.state); }
    catch (e) { console.error('[hud-host] cutin', e instanceof Error ? e.message : e); }
    send({id: req.id ?? null, ok: true, ...res, ...(audio ? {audio} : {}), ...(fx ? {fx} : {}), ...(cutin ? {cutin} : {})});
  } catch (e) {
    console.error('[hud-host]', e instanceof Error ? e.stack : e);
    const error = Host.errorBody(e);
    // 웹 world.js 처럼 엔진 거절 낱말 → 한국어 + (낱말) — 성 화면 붉은 줄 · 지도 알림에 그대로 씀
    if (req.cmd === 'step' && /^[A-Z0-9_]+$/.test(String(error.message ?? ''))) {
      try { error.message = `${(await import('./city-v3-model.mjs')).errorText(error.message)} (${error.message})`; } catch { /* 글표 없으면 낱말 그대로 */ }
    }
    send({id: req.id ?? null, ok: false, error});
  }
}
rl.on('close', () => { queue.then(() => out('', () => process.exit(0))); });
