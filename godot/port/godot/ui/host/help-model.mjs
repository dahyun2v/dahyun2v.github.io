// @ts-check
// 고도 UI/UX 방 (Claude, 2026-10-24) — 화면 ⑬ 도움말 · 규칙 모델.
// 설계: docs/work-integration/20261023/screen-mockups/15-help/DESIGN.md(문서형 띄움 · 목차 + 고른 규칙 하나).
// 글 = 웹 그대로: 그림 규칙 8장 ink-cards ruleCardDefinitions(C12 · C182) · 용어 glossary-v0.1 + 계략 4(c207-info) · 기본 규칙 world.html #rules-modal.
// 묶음 넷(기본 · 전투 · 성과 군량 · 용어) · 같은 글자 용어 7개는 항목에 접음(설계 §4.3). 규칙 계산 없음.
import {resolve} from '../../../../tools/port/web/shims/node-path.mjs';
import {pathToFileURL} from '../../../../tools/port/web/shims/node-url.mjs';
import {ROOT} from './hud-model.mjs';

const load = (p) => import(pathToFileURL(resolve(ROOT, p)).href);
const [Cards, Info, Ab, Reg] = await Promise.all([load('prototype/app/world/ink-cards.mjs'), load('prototype/app/world/c207-info.mjs'),
  load('prototype/src/campaign-abilities.mjs'), load('prototype/src/campaign-rule-registry.mjs')]);
const CARDS = Cards.ruleCardDefinitions(Ab.C12, Reg.C182);
const TERMS = [...Info.GLOSSARY.entries, ...Info.STRATAGEM_GLOSSARY];
const term = (t) => TERMS.find((e) => e.term === t);
const G = (s) => Info.glossaryText(s);
// world.html #rules-modal 의 기본 규칙 글(웹 그대로 · '끝' → '차례와 승리' — 설계 §6 · title-menu 항목 이름)
const BASIC = {
  조작: '부대를 누르고 칸을 누르면 이동 · 적을 누르면 공격 · Shift+끌기 여러 부대 · 끌기 지도 이동 · 휠 확대 · N 다음 부대 · Enter 다음 차례 · Esc 취소',
  이동: '옅은 옥빛 칸은 이번 차례, 더 먼 칸은 예약 이동. 평지 한 차례 기병 8 · 보병 5 · 궁병 4칸.',
  성장: '레벨업마다 특기 카드, Lv 5·10·15…에는 전법 카드.',
  '차례와 승리': '한 판 26차례. 세 큰 성을 모두 차지하고 차례를 넘기면 통일, 내 성을 모두 잃으면 멸망.',
  공격: '근접 공격을 받은 쪽은 남은 병력으로 반격합니다(궁병의 원거리 공격은 반격 없음). 옆 +15%, 뒤 +30%. 지형·강 너머가 피해를 바꿉니다.',
  통제: '적과 맞닿은 칸에 들어가면 멈춥니다. 붙어 있다가 떠나면 추격을 받습니다.',
  성: '성문 칸에 선 부대가 성을 쳐 내구를 0으로 만들면 함락. 성문을 잡으면 포위되어 성이 회복하지 못합니다.',
  군량: '내 성 · 보급 거점에서 8칸 안(보급권)에서는 부대 군량이 줄지 않고 가득 채워집니다. 보급권 밖에서는 차례마다 줄어들며(16칸 안 반 차례분, 그 밖 한 차례분) 휴대 군량은 5차례분. 적 성문에 붙은 부대는 가까워도 보급이 닿지 않아 휴대 군량으로 버팁니다. 적 부대를 없애면 한 차례분, 성이나 적 거점을 빼앗으면 가득 얻습니다. 바닥나면 굶주려 병력을 잃습니다.',
};
const firstSentence = (s) => String(s).split(/(?<=[.!?。])\s/)[0];
const rest = (s) => String(s).split(/(?<=[.!?。])\s/).slice(1).join(' ');
const sentences = (s) => String(s).split(/(?<=[.!?。])\s/);

/** 그림 규칙 항목(카드 + 같은 글자 용어). formation 은 설계 §6 글 그대로(첫 문장 = 칸 이름과 같은 값이라 뺌 · '대열' → '전열'). */
function cardEntry(name, id, {folded = [], effect, solve, solveTerm} = {}) {
  const c = CARDS[id];
  const t = term(name);
  const s = sentences(c.text);
  return {
    name, art: `assets/ui-v3/rule-cards/rule-${id}.webp`, tags: c.tags, head: c.title.replace('대열', '전열'),
    effect: effect ?? (s.length > 1 ? s.slice(1).join(' ') : s[0]).replace(/\.$/, ''),
    solve: solve ?? (t ? G(t.lines[2]) : null), solveTerm: solveTerm ?? null, folded,
  };
}

export function helpModel({pick = '전열', open = null, query = '', expanded = false} = {}) {
  const entries = {
    기본: ['조작', '이동', '성장', '차례와 승리'].map((n) => ({name: n, head: n, summary: firstSentence(BASIC[n]), detail: rest(BASIC[n])})),
    전투: [
      {name: '공격', head: '공격', summary: firstSentence(BASIC.공격), detail: rest(BASIC.공격)},
      {name: '통제', head: '통제', summary: firstSentence(BASIC.통제), detail: rest(BASIC.통제), terms: ['통제 구역']},
      cardEntry('측면', 'flank', {folded: ['측면']}),
      cardEntry('후방', 'rear', {folded: ['후방']}),
      cardEntry('접근사격', 'approach-fire', {folded: ['접근사격']}),
      cardEntry('상성', 'matchup'),
      // 설계 §6 #19~23: 효과 = 카드 글 둘째 문장 그대로 · 푸는 법 = 용어 '붕괴' 셋째 줄 그대로 · '재정비' 점선 밑줄
      {...cardEntry('전열', 'formation', {folded: ['흐트러짐', '붕괴'], effect: '흐트러진 부대는 더 아프게 맞는다', solve: G(term('붕괴').lines[2]), solveTerm: '재정비'}),
        solveTermLines: term('재정비').lines.map(G)},   // 점선 밑줄 풀이(C207 '무엇 · 효과 · 푸는 법')
      cardEntry('화계', 'fire', {folded: ['화계', '바람']}),
    ],
    '성과 군량': [
      {...cardEntry('성', 'siege'), summary: firstSentence(BASIC.성), terms: ['내구', '포위']},
      {...cardEntry('군량', 'supply'), summary: CARDS.supply.text.replace(/\.$/, ''), detail: BASIC.군량, terms: ['보급권']},   // 요약 1줄 = 카드 문장 · 펼침 = 기본 규칙 글(설계 §4.2 긴 항목)
    ],
  };
  const folded = new Set(Object.values(entries).flat().flatMap((e) => e.folded ?? []));
  entries.용어 = TERMS.filter((t) => !folded.has(t.term)).map((t) => ({name: t.term, head: t.term, what: G(t.lines[0]), effect: G(t.lines[1]), solve: G(t.lines[2])}));
  open ??= Object.entries(entries).find(([, list]) => list.some((e) => e.name === pick))?.[0] ?? '전투';   // 펼친 묶음 = 고른 항목이 든 묶음 하나
  const q = String(query).trim();
  const hit = (e) => !q || [e.name, e.head, e.summary, e.detail, e.effect, e.solve, e.what].some((x) => x && String(x).includes(q));
  const groups = Object.entries(entries).map(([name, list]) => ({name, open: q ? list.some(hit) : name === open, items: list.filter(hit).map((e) => e.name)})).filter((g) => !q || g.items.length);
  const all = Object.values(entries).flat();
  const entry = all.find((e) => e.name === pick) ?? all[0];
  // entries = 모든 항목(이름 → 내용) — 화면이 목차를 눌러 바로 바꿔 그림(검색은 search_changed 로 다시 받거나 화면이 이름 · 본문으로 거름)
  return {screen: 'help', title: '도움말', close: '닫기', search: '규칙 · 용어 검색', query: q, groups, pick: entry.name, entry, entries: Object.fromEntries(all.map((e) => [e.name, e])),
    expanded, allGroups: Object.entries(entries).map(([name, list]) => ({name, items: list.map((e) => e.name)})), more: '자세히 보기',
    empty: q && !groups.length ? {text: '찾은 항목이 없습니다', action: '검색어 지우기'} : null};
}
