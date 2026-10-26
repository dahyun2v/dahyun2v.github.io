// @ts-check
// 고도 UI/UX 방 (Claude, 2026-10-24) — 화면 ⓪-2 군주(세력) 고르기 모델.
// 설계: docs/work-integration/20261023/screen-mockups/02-faction/DESIGN.md(개발총괄 방 · 인물형).
// 값: 웹 world.js C251 블록(2925~2962)과 같은 출처 — 군주마다 createCampaign(시작 성 무작위 · 바깥 부대 없음)의 공개 view +
// hud-ink abilityName356 · abilityGloss356 + 엔진 SPECIAL_TROOPS. 구호 · 원화는 웹 world.html 카드에 박혀 있어 같은 값을 옮겨 적었다.
import {resolve} from '../../../../tools/port/web/shims/node-path.mjs';
import {existsSync, readFileSync} from '../../../../tools/port/web/shims/node-fs.mjs';
import {pathToFileURL} from '../../../../tools/port/web/shims/node-url.mjs';
import {ROOT, officerArt, artHead} from './hud-model.mjs';

const load = (p) => import(pathToFileURL(resolve(ROOT, p)).href);
const [R, Hud, Special, China] = await Promise.all([load('prototype/src/campaign-runtime.mjs'), load('prototype/app/world/hud-ink.mjs'), load('prototype/src/campaign-special-troops.mjs'),
  load('prototype/src/campaign-china12.mjs')]);
const LORDS = ['F01', 'F02', 'F03'];
// world.html .w-lord 카드 글(kit 고침 officer-draft-ui.mjs:159 — '규격' → '규약')
const MOTTO = {F01: '규약으로 묶는 천하', F02: '이어 붙여 함께 버티는 천하', F03: '물길로 잇는 천하'};
const COLUMN = {F01: 0, F02: 1, F03: 2};    // hud-kit.css:2748 ruler-six-v1 3×2 묶음의 세력 열(0행 = 군주 특기)
const FACILITY_ICON = {tuntian: 'D2-tuntian', clinic: 'D2-clinic', mufu: 'D2-command-tent', command: 'D2-command-tent'};
const TROOP_ICON = {cavalry: 'D3-cavalry', spear: 'D3-spear', bow: 'D3-bow', militia: 'D3-melee', sword: 'D3-melee'};
const ICON_DIR = 'assets/ui-v3/dots-1016/icons/';
// 화면 짧은 글(설계 02-faction §7 #8 · #11 · #13~14 · #16~17 — 쉼표 · '판정' · % 0 · 원문 요약). 설계서가 쓴 것은 조조 판뿐 —
// 다른 군주는 엔진 원문을 두 줄에서 자르고 전문은 풀이(설계 §10 '설명 두 줄 상한 · 전문 툴팁')
const SHORT = {
  F01: {trait: '시야 안 적이 쓴 전법을 내 전법으로 쓴다', facility: '도시 식량 +3', policy: '함락한 적 성의 큰 시설을\n우리 성에서도 짓는다',
    troops: '호표기 돌격이 전열을 더 자주 흐트러뜨림\n청주병 출진 병력 1.5배'},
};
const firstSentence = (t) => String(t ?? '').split(/(?<=[.。])\s/)[0].replace(/[.。]$/, '').trim();

// 웹 world.html 군주 카드(.w-lord .art)와 같은 그림: 결정본(-decided-hA)이 있으면 그것(손권 = G08-decided-hA — 공통 officerArt 는 full-hA)
function lordArt(id) {
  const rel = `assets/officer-art/cutout/${id}-decided-hA.webp`;
  return existsSync(resolve(ROOT, 'prototype', rel)) ? rel : officerArt(id);
}
function lord(fid) {
  const s = R.createCampaign({factionId: fid, fieldArmies: false, manualEndTurn: true});
  const p = R.view(s), ruler = p.officers[p.faction.rulerId];
  const trait = ruler.growth?.cards?.find((c) => c.traitId === `${ruler.officerId}.unique`);
  const facility = p.policy?.facilities?.find((f) => f.factionId === fid);
  const specials = Object.values(Special.SPECIAL_TROOPS).filter((t) => t.factionId === fid);
  const companions = (p.faction.officerIds ?? []).filter((id) => id !== ruler.officerId).slice(0, 5);
  return {
    id: fid, name: p.faction.name ?? ruler.name, rulerId: ruler.officerId, ruler: ruler.name,
    title: String(trait?.origin ?? '').replace(/\s*\(.*\)$/, ''), titleFull: String(trait?.origin ?? ''), motto: MOTTO[fid] ?? '',   // titleFull = 웹 c251-title 그대로(한자 포함)
    art: lordArt(ruler.officerId), head: artHead(lordArt(ruler.officerId)), emblem: `assets/ui-v3/emblems/${fid}.png`,
    trait: trait ? {name: Hud.abilityName356(trait), text: SHORT[fid]?.trait ?? firstSentence(trait.text), full: trait.text ?? '',   // 뜻풀이 뺌(사용자 10-25)
      icon: {atlas: 'assets/ui-kit/own/trait-icons/ruler-six-v1.webp', col: COLUMN[fid] ?? 0, row: 0, cols: 3, rows: 2}} : null,
    // 세력 특기 세 칸(설계 §5: 시설 · 정책 · 병종 — 뼈색 납작 실루엣 · 정책 = 성문 누각 그림이 아직 없어 D2-sortie(성문) 임시)
    cells: [
      facility ? {kind: 'facility', name: facility.name, text: SHORT[fid]?.facility ?? facility.description ?? '', full: facility.description ?? '', icon: [ICON_DIR + (FACILITY_ICON[facility.kind] ?? 'D2-workshop') + '.png']} : null,
      p.policy ? {kind: 'policy', name: p.policy.name, text: SHORT[fid]?.policy ?? p.policy.description ?? '', full: p.policy.description ?? '', icon: [ICON_DIR + 'D2-sortie.png']} : null,
      specials.length ? {kind: 'troops', name: specials.map((t) => t.name).join(' · '), text: SHORT[fid]?.troops ?? specials.map((t) => `${t.name} ${t.effectLine ?? ''}`.trim()).join('\n'), full: specials.map((t) => `${t.name} ${t.effectLine ?? ''}`.trim()).join('\n'),
        icon: specials.map((t) => ICON_DIR + (TROOP_ICON[t.parent] ?? 'D3-melee') + '.png')} : null,
    ].filter(Boolean),
    companions: companions.map((id) => ({id, name: p.officers[id]?.name ?? id, art: officerArt(id), head: artHead(officerArt(id)), bust: `assets/officer-art/bust/${id}.webp`})),   // bust = 웹 c251-officers 그림
  };
}

/** 중국 12세력 시험 판(총괄 10-25 · 이식 방 'new-china12'): 세력마다 새 판을 미리 만들 수 없음(동료 드래프트가 먼저) → 엔진 자료에서 바로
 *  CHINA_FACTIONS(군주 · 색) · chinaDraftPacks(고유 특기 · 장수 이름) · c509 home(본디 세력 장수 = 동료 소개). 조조 · 유비 · 손권은 3세력 판 것 그대로. */
let PACKS = null, HOME = null;
function chinaLord(f) {
  PACKS ??= China.chinaDraftPacks();
  HOME ??= JSON.parse(readFileSync(resolve(ROOT, 'prototype/data/c509-china-draft.json'), 'utf8')).home ?? {};
  const rid = f.rulerOfficerId, p = PACKS[rid], art = existsSync(resolve(ROOT, 'prototype', `assets/officer-art/cutout/${rid}-decided-hA.webp`)) ? lordArt(rid) : officerArt(rid);
  const comps = Object.entries(HOME).filter(([id, fid]) => fid === f.id && id !== rid).map(([id]) => id).slice(0, 5);
  return {
    id: f.id, name: f.ruler, rulerId: rid, ruler: f.ruler, title: '', titleFull: '', motto: '', color: f.color,
    art: art ?? null, head: art ? artHead(art) : null, emblem: `assets/ui-v3/emblems/${f.id}.png`,
    trait: p?.uniqueTrait ? {name: p.uniqueTrait.name, text: firstSentence(p.uniqueTrait.text), full: p.uniqueTrait.text ?? '', icon: null} : null,
    cells: [],
    companions: comps.map((id) => ({id, name: PACKS[id]?.name ?? id, art: officerArt(id) ?? null, head: officerArt(id) ? artHead(officerArt(id)) : null, bust: `assets/officer-art/bust/${id}.webp`})),
  };
}

export function factionModel(pickId = 'F01', {china12 = false} = {}) {
  const lords = china12 ? China.CHINA_FACTIONS.map((f) => (LORDS.includes(f.id) ? lord(f.id) : chinaLord(f))) : LORDS.map(lord);
  return {screen: 'faction', step: '새 판 1/2', title: china12 ? '군주 고르기 — 중국 12세력(시험)' : '군주 고르기', pick: pickId, lords, china12,
    note: '시작 도시는 판마다 무작위', back: '처음 화면', go: '동료 고르기', backdrop: null};
}
