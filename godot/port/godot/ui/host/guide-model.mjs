// @ts-check
// 고도 UI/UX 방 (Claude, 2026-10-24) — 화면 ⓪-3 안내자 고르기 모델.
// 설계: docs/work-integration/20261023/screen-mockups/02b-guide/DESIGN.md(개발총괄 방 · 인물형).
// 값: prototype/data/guide-v0.1.json(웹 prologue-ui.mjs chooseGuide 와 같은 자료) + 웹 formatGuideAddress(호칭 채우기 — 공개 함수).
// 안내자는 규칙 · 능력치에 영향이 없다 — 숫자 · 효과 없음.
import {resolve} from '../../../../tools/port/web/shims/node-path.mjs';
import {pathToFileURL} from '../../../../tools/port/web/shims/node-url.mjs';
import {readFileSync, existsSync} from '../../../../tools/port/web/shims/node-fs.mjs';
import {ROOT} from './hud-model.mjs';

const Prologue = await import(pathToFileURL(resolve(ROOT, 'prototype/app/world/prologue-ui.mjs')).href);
const DATA = JSON.parse(readFileSync(resolve(ROOT, 'prototype/data/guide-v0.1.json'), 'utf8'));
const ORDER = ['G08', 'G17', 'G51'];   // prologue-ui.mjs:61 카드 순서

/** state: 'first'(S1 처음 — 돌아가기 없음) | 'reselect'(S2 설정에서 다시 고르기 — 돌아가기 있음). voice: 음원 있는 안내자 id 목록. */
export function guideModel(pickId = 'G17', {state = 'reselect', callName = '신참', voice = []} = {}) {
  const art = (id) => {
    const cut = DATA.guides[id].portrait.replace(/^\//, '').replace(/\/full\.webp$/, '/full-cut.webp');   // 알파 사본(웹과 같음)
    return existsSync(resolve(ROOT, 'prototype', cut)) ? cut : DATA.guides[id].portrait.replace(/^\//, '');
  };
  const intro = (id) => Prologue.formatGuideAddress(String(DATA.lines?.[id]?.['select.intro']?.text ?? ''), callName)
    .split(/(?<=[.!?~])\s+/).filter(Boolean);    // 코드가 '. ' 마다 줄을 바꿈(설계 §7)
  const guides = ORDER.filter((id) => DATA.guides[id]).map((id) => ({id, name: DATA.guides[id].name, persona: DATA.guides[id].persona, art: art(id),
    intro: intro(id), voice: voice.includes(id)}));
  const pick = guides.find((g) => g.id === pickId) ?? guides[0];
  return {screen: 'guide', title: '이 판을 곁에서 이끌 안내자', state, pick: pick.id, guides,
    voice: pick.voice ? {ok: true} : {ok: false, reason: '목소리 준비 중'}, back: state === 'reselect' ? '돌아가기' : null, go: '이 안내자와 함께'};
}
