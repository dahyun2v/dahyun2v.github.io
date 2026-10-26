// @ts-check
// 고도 UI/UX 방 (Claude, 2026-10-24) — 화면 ⑫ 설정(S1) · 저장 확인(S2) 모델.
// 설계: docs/work-integration/20261023/screen-mockups/16-settings/DESIGN.md(v3 · COMMON v1.1 — 문서형 띄움).
// 값 목록 = 웹 hud-ink.mjs FX_OPTIONS · FX_DEFAULTS · UI_SIZES · mountSettingsPanel(소리 · 의식 카드 · 카드 안내 · 조작 표) + prologue-ui 안내자 말 + map-v3 지명.
// 고른 값은 고도 쪽(user://settings.json)이 들고 있다가 prefs 로 넘긴다 — 설정은 판 저장에 들어가지 않는다(C210 · C261). 규칙 계산 없음.
import {resolve} from '../../../../tools/port/web/shims/node-path.mjs';
import {pathToFileURL} from '../../../../tools/port/web/shims/node-url.mjs';
import {ROOT} from './hud-model.mjs';

const Hud = await import(pathToFileURL(resolve(ROOT, 'prototype/app/world/hud-ink.mjs')).href);

export const DEFAULTS = Object.freeze({muted: 'off', volume: 0.15, uiSize: '100', ...Hud.FX_DEFAULTS, ritual: 'v1', placeNames: 'on', rules: 'on', reports: 'on', guideSpeech: 'on', flash: 'on', autoCamera: 'on'});   // flash · autoCamera = 고도 새 항목(손맛 검토 10-25)
const STATUS = '이 기기의 소리와 연출에만 적용됩니다';
// 초점 때 바닥 설명 한 줄(설계 §7 표 — 화면·연출 7줄). 다른 탭은 설계가 정하지 않음(총괄 확인 전) → 평소 글.
const DESC = {
  uiSize: '글자 크기를 바꿉니다. 지도와 그림은 그대로입니다', aiSpeed: '상대 차례의 움직임을 보여 주는 빠르기입니다', cutin: '전법을 쓸 때 장수 그림이 크게 나옵니다',
  shake: '공격이 맞을 때 지도가 흔들립니다', motion: '움직이는 연출을 줄입니다. 켜면 흔들림도 꺼집니다', ritual: '장수 사이에 큰 인연이나 이별이 생기면 카드로 보여 줍니다',
  placeNames: '지도에 지역과 강 이름을 씁니다',
  flash: '번쩍이는 빛(특기 발동 · 함락 · 컷인 섬광)을 줄입니다. 켜면 빛 대신 테두리만 남깁니다', autoCamera: '상대 차례 · 교전 때 지도가 저절로 그쪽으로 움직입니다',
};
const onOff = [['on', '켬'], ['off', '끔']];
const opts = (list) => list.map(([id, text]) => ({id, text}));
const KEYS = [['병종 기술', 'Q'], ['계통 엔진', 'W'], ['전법', 'E'], ['고유 전법', 'R'], ['이동', 'M'], ['공격', 'A'], ['정면', 'F'], ['방어', 'B'], ['재정비', 'S'], ['복귀', 'G'], ['대기', 'H'],
  ['다음 부대', 'N'], ['다음 차례', 'Enter'], ['닫기 · 취소', 'Esc'], ['여러 부대 선택', 'Shift + 끌기'], ['지도 이동', '끌기'], ['지도 확대 · 축소', '휠']];

/** S1 설정 판. prefs = 고도 쪽이 들고 있는 값(빠진 것은 기본값) · tab = 'sound' | 'display' | 'guide' | 'keys' · focus = 줄 key · status = 'reset' | 'fail' | null */
export function settingsModel(prefs = {}, {tab = 'display', focus = null, status = null} = {}) {
  const p = {...DEFAULTS, ...prefs};
  const rows = {
    sound: [
      {key: 'muted', label: 'BGM·효과음', kind: 'choice', options: opts([['off', '켬'], ['on', '끔']]), value: p.muted},
      {key: 'volume', label: '통합 음량', kind: 'slider', value: Number(p.volume), text: `${Math.round(Number(p.volume) * 100)}%`},
    ],
    display: [
      {key: 'uiSize', label: 'UI 크기', kind: 'step', options: Hud.UI_SIZES.map((n) => ({id: n, text: `${n}%`})), value: String(p.uiSize)},
      {key: 'aiSpeed', label: '상대 차례 속도', kind: 'choice', options: opts(Hud.FX_OPTIONS.aiSpeed), value: p.aiSpeed},
      {key: 'cutin', label: '전법 컷인', kind: 'choice', options: opts(Hud.FX_OPTIONS.cutin), value: p.cutin},
      {key: 'shake', label: '화면 흔들림', kind: 'choice', options: opts(Hud.FX_OPTIONS.shake), value: p.shake},
      // 값 '움직임 줄이기 켬 / 끔' → '켬 / 끔'(설계 §7 바꾼 것 — 줄 이름과 같은 말 되풀이)
      {key: 'motion', label: '움직임 줄이기', kind: 'choice', options: opts([['system', '운영체제 설정'], ['on', '켬'], ['off', '끔']]), value: p.motion},
      // 손맛 검토 10-25(POLISH-REVIEW-RESULT '흔들림 끔에 더해 번쩍임 · 자동 카메라 이동 끄기') — 값은 user://settings.json prefs, 지도 쪽은 이식 방이 읽음
      {key: 'flash', label: '번쩍임', kind: 'choice', options: opts([['on', '켬'], ['less', '줄이기']]), value: p.flash},
      {key: 'autoCamera', label: '카메라 자동 이동', kind: 'choice', options: opts(onOff), value: p.autoCamera},
      {key: 'ritual', label: '의식 카드', kind: 'choice', options: opts([['v1', '켬'], ['off', '끔']]), value: p.ritual},
      {key: 'placeNames', label: '지명', kind: 'choice', options: opts(onOff), value: p.placeNames},
    ],
    guide: [
      {key: 'rules', label: '처음 보는 규칙 카드', kind: 'choice', options: opts(onOff), value: p.rules},
      {key: 'reports', label: '보고 카드', kind: 'choice', options: opts(onOff), value: p.reports},
      {key: 'guideHead', label: '안내자', kind: 'head'},
      // 웹은 브라우저 기본 드롭다운 → 칸 고르기 3칸(설계 §1 상태 표) · 같은 줄 오른쪽 보조 단추 '안내자 바꾸기'
      {key: 'guideSpeech', label: '안내자 말', kind: 'choice', options: opts([['on', '켬'], ['less', '적게'], ['off', '끔']]), value: p.guideSpeech, action: {key: 'guideChange', text: '안내자 바꾸기'}},
    ],
    keys: [{key: 'keys', label: '조작', kind: 'keys', keys: KEYS.map(([name, key]) => ({name, key}))}],
  };
  for (const list of Object.values(rows)) for (const r of list) if (DESC[r.key]) r.desc = DESC[r.key];
  const focusRow = rows[tab]?.find((r) => r.key === focus);
  const desc = status === 'reset' ? {text: '현재 탭의 기본값을 적용했습니다.', tone: 'muted'} : status === 'fail' ? {text: '이 기기에 설정을 저장할 수 없습니다.', tone: 'danger'}
    : focusRow?.desc ? {text: focusRow.desc, tone: 'bone'} : {text: STATUS, tone: 'muted'};
  return {
    screen: 'settings', title: '설정', close: '닫기', reset: '이 탭 기본값',
    tabs: [['sound', '소리'], ['display', '화면·연출'], ['guide', '안내'], ['keys', '조작']].map(([id, name]) => ({id, name})),
    tab, focus, rows: rows[tab] ?? [], desc, uiScale: Number(p.uiSize) / 100,   // UI 크기(설계 §9 — 판 크기 그대로 · 글만 커짐)
  };
}

/** S2 저장 확인(이전 저장이 있을 때만). summary = 웹 saveSlotSummary 와 같은 글(고도 쪽이 저장 파일에서 읽어 넘김). */
export function saveConfirmModel({summary, color = '#8e2018'}) {
  return {screen: 'save', question: '이전 저장을 덮어쓸까요?', record: {text: summary, color}, note: '저장 칸은 하나입니다', cancel: '취소', ok: '덮어쓰기', focus: 'cancel'};
}

/** 견본 저장 요약 — 웹 saveSlotSummary(저장본 · 날짜 글 · 저장 시각) 그대로. */
export function sampleSummary(state, stampMs) {
  const n = 7 - 1, date = `${190 + Math.floor(n / 36)}년 ${Math.floor((n % 36) / 3) + 1}월 ${['상순', '중순', '하순'][n % 3]}`;
  return Hud.saveSlotSummary({...state, turn: 7}, date, stampMs);
}
