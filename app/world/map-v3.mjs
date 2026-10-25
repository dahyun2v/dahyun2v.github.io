import {troopText} from '../../src/troop-display.mjs';
// 천하재결 지도 렌더러 v3 (Claude, 2026-10-08) — 옛 map-render.mjs 를 쓰지 않고 새로 짠다.
// 입력: campaignMapModel(view) 모델. 출력: SVG 문자열. 클릭은 data-tile / data-unit / data-city / data-prod-city / data-place.
// 층(아래→위): 땅(그린 지도 한 장, 없으면 지형 색) · 강(그림 속 강과 같은 곡선, 판정용 가는 선) · 길 · 영역 · 칸 · 안개
//            · 이동/공격 칸 · 경로 · 클릭 칸 · 시설 · 탐험지 · 성(미니어처) · 부대(무리 그림 + 장수 깃발판) · 이름판 · 효과
import {hexCenter, outlineRings} from '../design/city-walls.mjs';
import {troopLayout,troopPlateY,sampleTroop,troopKind,lodFaction,lodNearLayout,FACTION,factionFilter,mapFiguresEnabled,occlusionEnabled,occlusionPieces} from './troops.mjs';
import {symUrl,headOf,C190_ART,C190_DETAIL_ZOOM,citySiegeText,cityProductionText} from './hud-ink.mjs';
import {feelInkMarkup} from './fx-ink.mjs';
import supplyRules from '../../../docs/design-data/supply-v0.1.json' with {type:'json'};
import paintedWater from '../../assets/ui-v3/dots-1016/facilities/painted-water.json' with {type:'json'};
import geographyV3 from '../../../docs/design-data/map-layout-v3-hebei.json' with {type:'json'};

const SQRT3 = Math.sqrt(3), TILT = 0.62;
const f = (n) => Math.round(n * 10) / 10;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
// 깃발판 얼굴: 머리만 잘라 둔 그림(bust/<ID>.webp — tools/design/bust-crops.py, 그림마다 잰 머리 상자)을 창(28×34)에 채운다.
// 전신 그림을 크게 놓고 clip-path 로 자르면 그림 전체가 부대 묶음의 상자(getBoundingClientRect)에 잡혀 화면 따라가기·작은 지도 점·자동 점검 클릭이 어긋난다.
function faceImage(src, clip = 'w-face') {
  const m = /\/officer-art\/cutout\/(G\d{2,3})[-.]/.exec(String(src ?? ''));
  if (m) return `<image href="/assets/officer-art/bust/${m[1]}.webp" x="-17" y="-17" width="34" height="34" preserveAspectRatio="xMidYMid slice" clip-path="url(#${clip})"/>`;
  return `<image href="${esc(src)}" x="-26" y="-18" width="52" height="104" preserveAspectRatio="xMidYMin meet" clip-path="url(#${clip})"/>`;
}
const parse = (id) => { const [q, r] = String(id).split(',').map(Number); return {q, r}; };
const hexDist = (a, b) => (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;

// C153: a geometric public coverage outline; blocked routes remain in the supply readout.
export function publicSupplyTiles(tiles, cities=[], hubs=[]){
  const sources=[...cities.flatMap(c=>[c.tileId,...(c.footprint?.gates??[]),...(c.footprint?.walls??[])]),...hubs.map(h=>h.tileId)].filter(Boolean).map(parse);
  return tiles.filter(t=>sources.some(s=>hexDist(t,s)<=supplyRules.link.range));
}

export {FACTION};
const NEUTRAL = {color: '#76776f', name: '중립', glyph: '中'};
const TROOP_GLYPH = {militia: '步', spear: '槍', bow: '弓', cavalry: '騎'};
// 지도 모델의 병종 코드(campaign-adapters troopToCampaign) → 그림·글자 이름
// engineer · mystic: 옛 초기 자료에 남은 병종 이름(엔진에서는 근접보병 · 원거리보병으로 돈다) — 그 병종의 그림으로 그린다(공병 그림은 10-13 에 지움)
const TROOP_KEY = {BT01: 'militia', BT02: 'spear', BT03: 'bow', BT04: 'cavalry', engineer: 'militia', mystic: 'bow'};
const troopKey = (u) => TROOP_KEY[u.troop] ?? u.troop;
const TERRAIN = {plain: '#5f5a47', forest: '#34432f', hill: '#6d5d42', mountain: '#47443f', water: '#24404f', unknown: '#22231f'};

// Samples use the map's actual classes and palette, so skins and later color edits stay in sync.
export function lensLegendHtml(mode){
 const line=c=>`<path class="${c}" d="M3 12H45"/>`,area='<path class="fill" d="M3 3H45V21H3Z"/>';
 const rows={
  world:[['≋','강 · 건널 때 전투 보정',line('w-river')],['━','길 · 이동 경로',line('w-road')],['▨','기억 · 지금 보이지 않는 칸','<path class="w-fog-mem" d="M3 3H45V21H3Z"/>']],
  supply:[['┄','불안 · 보급 거리 밖',`<g class="w-supply s-disrupted">${line('')}</g>`],['━','보급 근원과 연결',`<g class="w-supply">${line('')}</g>`],['┄','끊김 · 饑 굶주림',`<g class="w-supply s-cut">${line('')}</g>`],['◌','보급권 경계',line('w-supply-boundary'),'보급권 경계 · 길의 연결은 별도']],
  faction:Object.values(FACTION).map(f=>['■',`${f.name}의 영역`,`<g class="w-terr" style="--fc:${f.color}">${area}</g>`]),
  diplomacy:[['■','전쟁','WAR'],['■','휴전','TRUCE'],['■','동맹','ALLIANCE']].map(([s,t,r])=>[s,t,`<g class="w-terr rel-${r}">${area}</g>`]),
  trace:[['◎','조사 목표', '<g class="w-site"><circle class="halo" cx="24" cy="12" r="9"/></g>'],['?','미확인 탐험지','<g class="w-site s-unknown"><circle class="halo" cx="24" cy="12" r="9"/></g>'],['✓','조사 완료','<g class="w-site"><g class="badge done"><rect x="8" y="3" width="32" height="18"/></g></g>']],
  danger:[['▧','보이는 적의 공격 가능 범위',line('lod-danger-boundary')],['┄','공개된 적의 노림',`<g class="w-intent">${line('')}</g>`],['▨','적 통제 구역',line('w-zoc')]]
 };
 return (rows[mode]??[]).map(([symbol,text,sample,tip])=>`<li${tip?` title="${esc(tip)}"`:''}><svg class="wmap mode-${esc(mode)}" viewBox="0 0 48 24" aria-hidden="true">${sample}</svg><b>${symbol}</b><span>${esc(text)}</span></li>`).join('');
}
const PLACE_GLYPH = {'성소': '祠', '은거지': '隱', '옛 진지': '營', '군마 산지': '馬'};
const FACILITY_GLYPH = {farm: '農', granary: '倉', market: '市', barracks: '兵', workshop: '工', tuntian: '屯', clinic: '醫', mufu: '幕', naval: '水'};
const FACILITY_NAME = {farm: '농지', granary: '곡창', market: '시장', barracks: '병영', workshop: '공방', tuntian: '둔전', clinic: '의원', mufu: '장막부', naval: '장막부'};
export const FACILITY_TONE = 'saturate(.8) brightness(.955) contrast(1.23)';
const FACILITY_FILE = {farm:'farm',granary:'granary',market:'market',workshop:'workshop',barracks:'barracks',tuntian:'tuntian',clinic:'clinic',mufu:'command-tent',naval:'command-tent'};

/** Visual placement stays within the engine tile; water tiles are never relocated to another tile. */
export function facilityPlacement(model, fc, layout, painting=null) {
  const tile=model.tiles.find(t=>`${t.q},${t.r}`===fc.tileId);
  if(!tile || ['water','river'].includes(tile.terrain??tile.terrainType))return null;
  const center=hexCenter(tile,layout), size=layout.size;
  const neighbors=model.tiles.filter(t=>hexDist(t,tile)===1&&['water','river'].includes(t.terrain??t.terrainType));
  const edges=[...(model.rivers??[]),...(model.bridges??[])].filter(e=>e.includes(fc.tileId));
  const wet=[...neighbors.map(t=>`${t.q},${t.r}`),...edges.map(e=>e.find(id=>id!==fc.tileId))];
  const normals=[...new Set(wet)].filter(Boolean).map(id=>{const p=hexCenter(parse(id),layout),dx=p.x-center.x,dy=(p.y-center.y)/TILT,d=Math.hypot(dx,dy);return {x:dx/d,y:dy/d};});
  const candidates=[{x:0,y:0},...[.10,.20,.28].flatMap(radius=>Array.from({length:12},(_,i)=>({x:Math.cos(i*Math.PI/6)*size*radius,y:Math.sin(i*Math.PI/6)*size*radius})))];
  // Conservative opaque footprint; additionally clipped to the inset ground hex when painted.
  const rx=size*.40, ry=size*.25;
  const valid=c=>[-1,1].every(sx=>[-1,1].every(sy=>{
    const x=c.x+sx*rx,y=c.y+sy*ry;
    return Math.abs(x)<=size*.75 && Math.abs(y/TILT)+Math.abs(x)/SQRT3<=size*.82 && normals.every(n=>x*n.x+y/TILT*n.y<=size*(SQRT3/2-.35));
  }));
  const charted=painting&&[paintedWater.source,...paintedWater.sameGeometry].some(name=>painting.src?.endsWith(name));
  const dry=c=>{
    if(!charted)return true;
    const [w,h]=paintedWater.size;
    // Bounds cover the delivered sheets' opaque content, including workshop roofs and smoke.
    const x0=Math.floor((center.x+c.x-size*.55-painting.x)/painting.width*w),x1=Math.ceil((center.x+c.x+size*.55-painting.x)/painting.width*w);
    const y0=Math.floor((center.y+c.y-size*.4-painting.y)/painting.height*h),y1=Math.ceil((center.y+c.y+size*.4-painting.y)/painting.height*h);
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)if(x<0||y<0||x>=w||y>=h||paintedWater.rows[y][x]==='1')return false;
    return true;
  };
  const score=c=>normals.reduce((n,v)=>n+c.x*v.x+c.y/TILT*v.y,0);
  const at=candidates.filter(c=>valid(c)&&dry(c)).sort((a,b)=>score(a)-score(b)||Math.hypot(a.x,a.y)-Math.hypot(b.x,b.y))[0];
  return at?{x:center.x+at.x,y:center.y+at.y,center,tileId:fc.tileId}:null;
}
const STATUS_GLYPH = {INSPIRED: '昂', SLOWED: '遲', ROOTED: '縛', CONFUSED: '惑'};

// C170 / C169b integration point: all map troop numbers use this formatter.
export const troopLabel = value => Number.isFinite(value) ? troopText(value) : '—';
// No SVG replacement or layout reads at settlement. Shared marker markup keeps
// public counts/status wording identical to the normal map renderer.
export function settleMapUnits386(root,units){
 for(const u of units){
  const node=root.querySelector(`.w-unit[data-unit="${u.id}"]`);if(!node)continue;
  node.querySelectorAll('.feel-contact').forEach(n=>n.remove());
  node.classList.remove('feel-hit','feel-rout','hit','attack-target');
  for(const key of ['active','moved','ready'])node.classList.toggle(key,!!u[key]);
  node.querySelectorAll('.c291-unit').forEach(n=>n.classList.toggle('selected',!!u.active));
  const count=troopLabel(u.count);
  node.querySelectorAll('.c291-count,.count text').forEach(n=>{if(n.textContent!==count)n.textContent=count;});
  const marker=node.querySelector('.c291-marker');
  if(marker){
   const scratch=node.ownerDocument.createElementNS('http://www.w3.org/2000/svg','svg');scratch.innerHTML=unitMarker291(u);
   marker.dataset.priority=String(!!(u.markerPriority||u.active));
   for(const selector of ['title','.c291-status']){const next=scratch.querySelector('.c291-marker '+selector),old=marker.querySelector(selector);if(next&&old&&next.innerHTML!==old.innerHTML)old.replaceWith(next);}
  }
  node.querySelectorAll('.lod-marker').forEach(n=>n.classList.toggle('lod-ended',!!u.actionEnded));
  node.querySelectorAll('.lod-tag-text,.lod-paper-text').forEach(n=>{const text=`${u.name} · ${count}${u.actionEnded?' ✓':''}`;if(n.textContent!==text)n.textContent=text;});
 }
}
// Build the contact decoration before its deadline. Applying it never rebuilds
// the map, queries layout, or recomputes campaign/view data.
export function prepareFeelContact(root,unit,effect){
 const node=root?.querySelector(`.w-unit[data-unit="${unit.id}"]`);
 if(!node)return ()=>false;
 const doc=node.ownerDocument,h=effect.feelHit,loss=effect.prevCount-effect.postCount;
 const decoration=doc.createElementNS('http://www.w3.org/2000/svg','g');
 decoration.setAttribute('class',`feel-contact c423-contact${h.counter?' c423-counter':''}${h.decisive?' c423-decisive':''}`);decoration.setAttribute('pointer-events','none');
 decoration.innerHTML=(!h.reduced?'<circle class="c423-impact-wash" cy="8" r="21" fill="currentColor" opacity=".12"/>':'')+feelInkMarkup(h)+(loss>0?`<text class="dmg ink-damage feel-damage" data-feel-event="${esc(h.eventId)}" style="--damage-size:${globalThis.document?.documentElement?.dataset.ui==='kit'?40:h.counter?23:28}px" y="${globalThis.document?.documentElement?.dataset.ui==='kit'?-48:-78}">${effect.lossLabel?esc(effect.lossLabel)+' ':''}−${troopLabel(loss)}${h.cause?`<tspan class="feel-cause" dx="5">${esc(h.cause)}</tspan>`:''}</text>`:'');
 // Resolve screen-pixel sizes during preparation, never in the contact callback.
 if(globalThis.document?.documentElement?.dataset.ui==='kit'&&node.getScreenCTM&&node.ownerSVGElement?.createSVGPoint){
  const matrix=node.getScreenCTM(),number=decoration.querySelector('.feel-damage');
  if(matrix&&number){
   const scale=Math.hypot(matrix.c,matrix.d)||1,plate=node.querySelector('.plate-top,.lod-marker')??node,box=plate.getBoundingClientRect(),point=node.ownerSVGElement.createSVGPoint();
   point.x=box.left+box.width/2;point.y=box.top-24;const local=point.matrixTransform(matrix.inverse());
   number.setAttribute('x',String(local.x));number.setAttribute('y',String(local.y));
   number.style.setProperty('font-size',`${(h.counter?22:h.charge||h.side==='REAR'?34:28)/scale}px`,'important');number.style.setProperty('stroke-width',`${2/scale}px`,'important');
   number.style.setProperty('--c260-rise',`${-40/scale}px`);
  }
 }
 const counts=[...node.querySelectorAll('.count text')],bars=[...node.querySelectorAll('.count .bar')];
 const labels=[...node.querySelectorAll('.lod-tag-text,.lod-paper-text')],text=troopLabel(effect.postCount);
 const label=`${unit.name} · ${text}${unit.actionEnded?' ✓':''}`;
 const widths=bars.map(b=>Number(b.getAttribute('width'))*(effect.prevCount>0?effect.postCount/effect.prevCount:0));
 if(h.reduced){decoration.querySelectorAll('.feel-ink,.feel-rout-mark,.feel-damage').forEach(n=>n.style.setProperty('animation','none','important'));}
 let applied=false;
 return ()=>{if(applied||!node.isConnected)return false;applied=true;
  for(const n of counts)n.textContent=text;
  for(const n of labels)n.textContent=label;
  bars.forEach((b,i)=>b.setAttribute('width',String(widths[i])));
  node.classList.add('feel-hit');if(h.rout)node.classList.add('feel-rout');node.append(decoration);
  if(!h.reduced&&h.decisive){const art=node.querySelector('.lod-soldiers');art?.animate?.([{scale:'1'},{scale:'1.035',offset:.25},{scale:'1'}],{duration:240});}
  return true;
 };
}
export function prepareFeelVolley(root,from,to,duration){
 const a=root?.querySelector(`.w-unit[data-camera-tile="${from}"]`),b=root?.querySelector(`.w-unit[data-camera-tile="${to}"]`),svg=root?.querySelector('svg');
 if(!a||!b||!svg)return ()=>{};
 const x=Number(a.dataset.x),y=Number(a.dataset.y),dx=Number(b.dataset.x)-x,dy=Number(b.dataset.y)-y;
 const group=svg.ownerDocument.createElementNS('http://www.w3.org/2000/svg','g');
 group.setAttribute('class','feel-arrows');group.setAttribute('pointer-events','none');group.setAttribute('transform',`translate(${x} ${y+8})`);
 group.innerHTML=Array.from({length:7},(_,i)=>`<path d="M-7 ${i*2-6}h7" style="--fly-x:${dx}px;--fly-y:${dy}px;animation-duration:${duration}ms"/>`).join('');
 return ()=>svg.append(group);
}
// C423: prepare against a visible city's existing effect anchor. No state lookup at impact.
export function prepareFeelWall(root,tile,reduced=false){
 const svg=root?.querySelector('svg'),anchor=svg?.querySelector(`.w-hits [data-tile="${tile}"]`);
 if(!svg||!anchor||reduced)return ()=>false;
 const doc=svg.ownerDocument,group=doc.createElementNS('http://www.w3.org/2000/svg','g');
 group.setAttribute('class','c423-wall-chips');group.setAttribute('pointer-events','none');
 const box=anchor.getBBox(),x=box.x+box.width/2,y=box.y+box.height/2;if(!Number.isFinite(x)||!Number.isFinite(y))return ()=>false;
 group.setAttribute('transform',`translate(${x} ${y})`);
 group.innerHTML=Array.from({length:6},(_,i)=>`<rect x="${i*3-8}" y="-4" width="3" height="2" style="--chip-x:${(i-2.5)*9}px;--chip-y:${12+i%3*5}px"/>`).join('');
 let applied=false;return ()=>{if(applied||!svg.isConnected)return false;applied=true;svg.append(group);setTimeout(()=>group.remove(),360);return true;};
}
export function mapHeadBox(h) {
  if(!h)return null;
  const [w,hgt]=h.size,s=Math.min(w,hgt,h.head[2]*w*1.25);
  return [Math.max(0,Math.min(w-s,h.head[0]*w-s/2)),Math.max(0,Math.min(hgt-s,h.head[1]*hgt-s/2)),s,s];
}
export function unitStatusMarks(u) {
  const marks=[],add=(kind,glyph,what,effect,recovery)=>marks.push({kind,glyph,text:`${what}\n효과 · ${effect}\n회복 · ${recovery}`});
  if(u.morale==='SHAKEN')add('SHAKEN','동','동요','공격 ×0.8','옆에 적이 없으면 차례 끝마다 한 단계 회복 또는 재정비');
  if(u.morale==='ROUTING')add('ROUTING','패','패주','명령 불가 · 매 차례 한 칸 물러남','옆에 적이 없으면 차례 끝에 동요로 회복');
  if(u.formation==='DISORDERED')add('DISORDERED','란','흐트러짐','받는 피해 ×1.15 · 반격 ×0.5','옆에 적이 없으면 차례 끝에 한 단계 회복 또는 재정비');
  if(u.formation==='BROKEN')add('BROKEN','붕','붕괴','받는 피해 ×1.30 · 통제 구역 없음','옆에 적이 없으면 차례 끝에 한 단계 회복 또는 재정비');
  if(u.braced)add('BRACED','방','방어','받는 피해 ÷1.25 · 반격 ×1.2','다음 자기 차례가 시작되면 해제');
  for(const s of u.status??[]){const kind=s.kind??s;
    if(kind==='CONFUSED')add(kind,'혼','혼란','공격 · 전법 · 반격 불가',Number.isFinite(s.turnsLeft)?`${s.turnsLeft}차례 뒤 해제`:'정해진 차례 뒤 해제');
    else if(STATUS_GLYPH[kind])add(kind,STATUS_GLYPH[kind],{INSPIRED:'고무',SLOWED:'둔화',ROOTED:'발 묶임'}[kind],{INSPIRED:'공격 강화',SLOWED:'이동 감소',ROOTED:'이동 불가'}[kind],'정해진 차례 뒤 해제');
  }
  return marks;
}
export function unitCityOffsets(cities,C,size=30) {
  const offsets={};
  for(const city of cities??[]){
    const c=C(city.center);offsets[city.center]={x:size*2.3,y:size*.35};
    for(const id of city.gates??[]){const p=C(id),dx=p.x-c.x,dy=p.y-c.y,d=Math.hypot(dx,dy)||1;offsets[id]={x:dx/d*size*.6,y:dy/d*size*.6};}
  }
  return offsets;
}
export function primaryUnitStatus(u){
  const order=['BROKEN','CONFUSED','SHAKEN','DISORDERED','BRACED','ROUTING','ROOTED','SLOWED','INSPIRED'];
  return unitStatusMarks(u).sort((a,b)=>order.indexOf(a.kind)-order.indexOf(b.kind))[0]??null;
}
export function labelBorder(side,x=-40,y=0,w=80,h=24){
  const rect=`M${x} ${y}H${x+w}V${y+h}H${x}Z`;
  if(side==='allied')return `${rect}M${x+2} ${y+2}H${x+w-2}V${y+h-2}H${x+2}Z`;
  if(side!=='enemy')return rect;
  const points=[];
  for(let i=0;i<=w;i+=4)points.push([x+i,y-(i%8===0?2:0)]);
  for(let i=0;i<=h;i+=4)points.push([x+w+(i%8===0?2:0),y+i]);
  for(let i=0;i<=w;i+=4)points.push([x+w-i,y+h+(i%8===0?2:0)]);
  for(let i=0;i<=h;i+=4)points.push([x-(i%8===0?2:0),y+h-i]);
  return 'M'+points.map(p=>p.join(' ')).join('L')+'Z';
}
// C291: these inputs have already passed the public view filter.
export function unitPriority291(u,units=[],attackTiles=[]){
 if(u.remembered)return false;
 return !!u.active||attackTiles.includes(u.tileId)||!!u.enemy&&units.some(a=>a.active&&hexDist(parse(a.tileId),parse(u.tileId))<=2);
}
export function unitMarkerDetail291({z=1,far=false,important=false}={}){
 return {strategic:z<.45&&!important,compact:far&&!important,face:far&&!important?24:36};
}
export function unitMarker291(u){
 const name=esc(u.name??'부대'),kind=troopKey(u),color=FACTION[u.factionId]?.color??NEUTRAL.color;
 if(u.remembered)return `<g class="c291-probes" visibility="hidden" pointer-events="none"><circle cx="0" cy="0" r=".01"/><circle cx="1" cy="0" r=".01"/><circle cx="0" cy="1" r=".01"/></g><g class="c291-memory"><title>흔적 · ${u.seenAge??0}차례 전</title><circle r="8"/><text x="12" y="4">기록 ${u.seenAge??0}차례 전</text></g>`;
 const h=headOf(u.portrait),box=mapHeadBox(h),status=unitStatusMarks(u),marks=[...(u.actionEnded?[{glyph:'✓',text:'행동 완료'}]:[]),...(u.enemy?[{glyph:'⚔',text:'적대'}]:[]),...status];
 const face=u.portrait&&!box?`<span class="c291-face" style="background-image:url(&quot;${esc(u.portrait)}&quot;);background-size:cover;background-position:center"></span>`:u.portrait&&box?`<span class="c291-face" style="background-image:url(&quot;${esc(u.portrait)}&quot;);background-size:${36*h.size[0]/box[2]}px ${36*h.size[1]/box[3]}px;background-position:${-36*box[0]/box[2]}px ${-36*box[1]/box[3]}px"></span>`:`<span class="c291-face">${esc(String(u.name??'部').slice(0,1))}</span>`;
 return `<g class="c291-probes" visibility="hidden" pointer-events="none"><circle cx="0" cy="0" r=".01"/><circle cx="1" cy="0" r=".01"/><circle cx="0" cy="1" r=".01"/></g><g class="c291-marker" data-faction="${esc(u.factionId)}" data-priority="${!!(u.markerPriority||u.active)}" style="--fc:${color}"><title>${name} · 병력 ${troopLabel(u.count)}</title><rect class="unit-counter-bg" x="-28" y="-30" width="56" height="18"/><foreignObject x="-40" y="-68" width="80" height="82"><div xmlns="http://www.w3.org/1999/xhtml" class="c291-unit${u.active?' selected':''}">${face}<span class="c291-strategy">${TROOP_GLYPH[kind]??'兵'}<i class="c291-cluster"></i></span><img class="c291-kind" src="/assets/ui-v3/units-ink/c170-${esc(kind)}.png" alt="${esc(u.troopName??kind)}"/><b class="c291-count">${troopLabel(u.count)}</b><span class="c291-status">${marks.slice(0,2).map(m=>`<i title="${esc(m.text)}">${m.glyph}</i>`).join('')}${marks.length>2?`<i title="${esc(marks.slice(2).map(m=>m.text).join(' · '))}">+${marks.length-2}</i>`:''}</span><strong class="c291-name">${name}</strong></div></foreignObject></g>`;
}
// Defensive rendering filter; static remembered geography is allowed, live troops are not.
export function publicOverlays291(model){
 const vis=new Map(model.tiles.map(t=>[t.id??`${t.q},${t.r}`,t.vis]));
 const known=id=>vis.has(id)&&vis.get(id)!=='UNEXPLORED';
 const live=id=>known(id)&&vis.get(id)!=='REMEMBERED';
 const h=model.highlights??{},ids=key=>[...new Set(h[key]??[])].filter(known);
 return {...model,units:(model.units??[]).filter(u=>u.remembered?vis.get(u.tileId)==='REMEMBERED':live(u.tileId)),cities:(model.cities??[]).filter(c=>known(c.center)).map(c=>({...c,remembered:c.remembered||vis.get(c.center)==='REMEMBERED'})),places:(model.places??[]).filter(p=>known(Array.isArray(p.at)?p.at.join(','):p.tileId)),facilities:(model.facilities??[]).filter(p=>live(p.tileId)),placeNames:(model.placeNames??[]).map(p=>({...p,points:p.points.filter(at=>known(at.join(',')))})).filter(p=>p.points.length),highlights:{...h,pathUncertain:(h.path??[]).some(id=>!known(id)),danger:ids('danger').filter(live),zoc:ids('zoc').filter(live),attack:ids('attack').filter(live),move:ids('move'),intents:(h.intents??[]).filter(l=>live(l.from)&&known(l.to))}};
}
function unitMarker(u) {
  if(globalThis.document?.documentElement?.dataset.ui==='kit')return unitMarker291(u);
  const key=troopKey(u),label=u.troopName??({militia:'근접보병',spear:'장병',bow:'궁병',cavalry:'기병'}[key]??'부대');
  const h=headOf(u.portrait),box=mapHeadBox(h),side=u.side??(u.enemy?'enemy':'ally'),status=primaryUnitStatus(u);
  const portrait=u.portrait&&box?`<foreignObject class="unit-head" x="-66" y="0" width="24" height="24"><div xmlns="http://www.w3.org/1999/xhtml" style="width:24px;height:24px;background-image:url(&quot;${esc(u.portrait)}&quot;);background-size:${24*h.size[0]/box[2]}px ${24*h.size[1]/box[3]}px;background-position:${-24*box[0]/box[2]}px ${-24*box[1]/box[3]}px"></div></foreignObject>`:`<text class="unit-head-initial" x="-54" y="17">${esc(String(u.name??'').slice(0,1))}</text>`;
  const art=C190_ART[{ally:'tagAlly',allied:'tagAllied',enemy:'tagEnemy'}[side]],count=u.remembered?'?':troopLabel(u.count);
  return `<g class="unit-marker c190-marker side-${side}${u.remembered?' remembered':''}${u.actionEnded?' action-ended':''}"><title>${esc(u.name)} · ${esc(label)} · 병력 ${count}${u.remembered?` · 기억한 위치 · ${u.seenAge??0}차례 전`:''}</title>
    <rect class="unit-counter-bg" x="-40" y="0" width="80" height="24"/>
    ${art?`<image data-side="${side}" href="${esc(art)}" x="-40" y="0" width="80" height="24"/>`:`<path class="unit-side-border" data-side="${side}" d="${labelBorder(side)}"/>`}
    <rect class="c264-faction-stripe" x="-40" y="0" width="4" height="24" fill="${FACTION[u.factionId]?.color??NEUTRAL.color}"/><image class="unit-kind" href="/assets/ui-v3/units-ink/c170-${esc(key)}.png" x="-38" y="2" width="20" height="20"><title>${esc(label)}</title></image>
    <g class="count unit-count"><text x="10" y="17">${count}</text></g>
    <g class="unit-portrait"><rect class="frame" x="-66" y="0" width="24" height="24" rx="12"/>${portrait}</g>
    ${u.remembered?`<text class="c264-seen" x="20" y="-6">${u.seenAge??0}차례 전</text>`:""}<g class="unit-status">${status&&!u.remembered?`<g class="unit-status-mark" data-status="${status.kind}" tabindex="0" aria-label="${esc(status.text)}" transform="translate(34 -7)"><title>${esc(status.text)}</title>${C190_ART.statusSeal?`<image href="${esc(C190_ART.statusSeal)}" x="-9" y="-9" width="18" height="18"/>`:'<rect x="-9" y="-9" width="18" height="18"/>'}<text y="5">${status.glyph}</text></g>`:''}</g></g>`;
}
export const lodInCity = (u,cities=[]) => cities.some(c=>c.center===u.tileId&&c.kind!=='fort');
export function lodUnitMarker(u,size=30) {
  if(u.remembered)return unitMarker(u);
  const fid=lodFaction(u.factionId),kind=troopKind(u),glyph={militia:'刀',spear:'槍',bow:'弓',cavalry:'騎'}[kind]??'刀';
  const root='/assets/troop-art/lod/',id='lod-face-'+String(u.id).replace(/[^\w-]/g,'_');
  const face=u.portrait?faceImage(u.portrait,id):`<text y="6">${esc(String(u.name??'').slice(0,1))}</text>`;
  const label=`${esc(u.name)} · ${u.remembered?'?':troopLabel(u.count)}${u.actionEnded?' ✓':''}`;
  const l=lodNearLayout({size,kind});
  return `<g style="--fc:${FACTION[u.factionId]?.color??NEUTRAL.color};--faction-filter:${factionFilter(u.factionId)}" class="lod-marker${u.actionEnded?' lod-ended':''}"><title>${label}</title><defs><clipPath id="${id}"><circle r="16"/></clipPath><mask id="${id}-banner" maskUnits="userSpaceOnUse" x="-18" y="0" width="72" height="62"><rect x="-18" width="72" height="62" fill="white"/><circle class="lod-banner-hole" cx="11.2" cy="23" r="${l.faceDiameter/2/l.bannerScale}" fill="black"/></mask></defs>
    <g class="lod-near"><ellipse class="lod-shadow" cy="9" rx="${l.width*.45}" ry="8"/><g class="lod-soldiers"><image class="lod-soldier-art" href="${root}${kind}-${fid}.webp" x="${-l.width/2}" y="${12-l.height}" width="${l.width}" height="${l.height}" preserveAspectRatio="xMidYMax meet"/></g>
      <g class="lod-banner" transform="translate(${l.bannerX} ${l.bannerY}) scale(${l.bannerScale})"><g class="lod-banner-face" transform="translate(11.2 23) scale(${l.faceDiameter/32/l.bannerScale})">${face}</g><image href="${root}banner-${fid}.webp" width="36" height="62" mask="url(#${id}-banner)"/></g>
      <rect class="lod-tag" x="-40" y="15" width="80" height="13"/><text class="lod-tag-text" y="24">${label}</text></g>
    <g class="lod-far"><g transform="translate(-2 -8) scale(1.72)">${face}</g><image class="lod-ring-art" href="${root}ring-${fid}.webp" x="-36" y="-40" width="78" height="81"/><circle class="lod-seal" cx="29" cy="-28" r="11"/><text class="lod-glyph" aria-hidden="true" x="29" y="-23">${glyph}</text><text class="lod-paper-text" x="2" y="34">${label}</text></g>
    ${u.active?'<ellipse class="lod-selected" cy="11" rx="36" ry="10"/>':''}${globalThis.document?.documentElement?.dataset.ui==='kit'?unitMarker291(u):''}</g>`;
}
function cityBand(city,badge,kitUi=false){
 if(kitUi&&new URLSearchParams(globalThis.location?.search??'').get('panel')!=='v1')return cityLabel289(city,badge);
 const fs=FACTION[city.factionId]??NEUTRAL;
 const seal=`<g class="c264-city-faction${city.own?' own':''}${city.remembered?' remembered':''}" transform="translate(-88 -10)"><title>${esc(fs.name)} 세력</title><rect width="18" height="18" fill="${fs.color}"/><text x="9" y="14">${fs.glyph}</text>${city.capital?'<svg class="c264-capital c285-capital" x="3" y="-14" width="12" height="12" viewBox="0 0 12 12" role="img" aria-label="수도"><title>수도 — 세력의 머리 성</title><path d="M1 10V4l3 2 2-5 2 5 3-2v6Z"/></svg>':''}</g>`;
 const progress=badge?.cost>0&&Number.isFinite(badge.progress)?`<g class="c264-production-progress"><title>진행 ${badge.progress}/${badge.cost}</title><rect x="-68" y="58" width="44" height="2"/><rect class="fill" x="-68" y="58" width="${44*Math.max(0,Math.min(1,badge.progress/badge.cost))}" height="2"/></g>`:'';
 const panelV2=kitUi&&new URLSearchParams(globalThis.location?.search??'').get('panel')!=='v1';
 const inkPlate=panelV2?`<foreignObject class="c284-city-plate${city.besieged?' threatened':''}${city.remembered?' remembered':''}" x="-70" y="-10" width="140" height="40"><div xmlns="http://www.w3.org/1999/xhtml" class="c284-city-material" tabindex="-1"><b>${esc(city.name)}</b><span>성 · ${Number.isFinite(city.troops)?troopLabel(city.troops):'?'}</span>${city.besieged?'<i title="포위 중" aria-label="포위 중"></i>':''}</div></foreignObject>`:'';
 const kitPlate=`<g class="c253-city-plate${kitUi?' k-plate':''}"><rect x="-76" y="-10" width="152" height="50"/><text class="c253-city-summary" x="-64" y="28">성 · ${Number.isFinite(city.troops)?troopLabel(city.troops):'?'}</text></g>`;
  const siege=city.besieged,wall=Number.isFinite(city.defense)?Math.round(city.defense):'?',max=Number.isFinite(city.defenseMax)?city.defenseMax:'?';
  const gauge=(y,ratio,text,kind)=>{const width=f(Math.max(0,Math.min(1,ratio??0))*44),id=`c190-bar-${esc(city.id)}-${kind}`;
    return `<g class="city-gauge ${kind}" transform="translate(-68 ${y})">${C190_ART.barTrack?`<image href="${esc(C190_ART.barTrack)}" width="44" height="2"/>`:'<rect class="city-bar-track" width="44" height="2"/>'}${Number.isFinite(ratio)?C190_ART.barFill?`<clipPath id="${id}"><rect width="${width}" height="2"/></clipPath><image href="${esc(C190_ART.barFill)}" width="44" height="2" clip-path="url(#${id})"/>`:`<rect class="city-bar-fill" width="${width}" height="2"/>`:''}<text class="city-bar-number" x="80" y="4">${text}</text></g>`;};
  return `${inkPlate}${seal}${badge?.idle&&city.own?'<circle class="c264-idle-dot" cx="68" cy="2" r="3"><title>쉬는 중</title></circle>':''}${kitPlate}${kitUi&&city.own?`<g class="c260-city-production${badge?.idle?' idle':''}${badge?.completed?' c264-completed':''}" data-prod-city="${esc(city.id)}"><text x="-68" y="55">${badge?.idle?'● 쉬는 중':esc(cityProductionText(badge))}</text>${progress}</g>`:''}<g class="c190-city-band${siege?' besieged':''}${city.remembered?' remembered':''}"><rect class="city-band-bg" x="-76" y="-10" width="152" height="${badge||siege?66:50}"/>
    ${C190_ART.cityBand?`<image href="${esc(C190_ART.cityBand)}" x="-76" y="-10" width="151" height="24"/>`:''}
    <path class="city-name-border" d="${labelBorder(siege?'enemy':'ally',-76,-10,152,24)}"/>
    <text class="name" x="-68" y="7">${esc(city.name)}</text>
    <g class="city-details"><title>성벽 ${wall}/${max} · ${city.own?'수비':'보이는 수비'} ${Number.isFinite(city.troops)?troopLabel(city.troops):'?'}</title>
      ${gauge(23,city.defenseMax?city.defense/city.defenseMax:null,`${wall}/${max}`,'wall')}
      ${gauge(35,city.own&&city.guardMaximum?city.troops/city.guardMaximum:null,Number.isFinite(city.troops)?`${troopLabel(city.troops)}${city.own&&city.guardMaximum?'/'+troopLabel(city.guardMaximum):''}`:'?','guard')}
      ${siege?`<text class="city-siege" x="-68" y="53">${citySiegeText(city)}</text>`:badge?`<g class="prod${badge.idle?' idle':''}${badge.completed?' c264-completed':''}" data-prod-city="${esc(city.id)}"><title>${esc(cityProductionText(badge))}</title><text x="-68" y="53">${badge.idle?'● 쉬는 중':'⚒ '+esc(cityProductionText(badge))}</text>${progress}</g>`:''}
    </g></g>`;
}

function corners(c, size) { return Array.from({length: 6}, (_, i) => { const a = Math.PI / 180 * (60 * i - 90); return {x: c.x + size * Math.cos(a), y: c.y + size * Math.sin(a) * TILT}; }); }
const hexPath = (c, size) => 'M' + corners(c, size).map((p) => `${f(p.x)} ${f(p.y)}`).join('L') + 'Z';
const ringsPath = (rings) => rings.map((r) => 'M' + r.map((p) => `${f(p.x)} ${f(p.y)}`).join('L') + 'Z').join('');

/** 강: 맞닿은 변들을 물길로 잇고 변 가운데점 + Chaikin 으로 굽이치게(tools/art/map-guide.mjs --smooth 와 같은 계산). */
export function riverPaths(edges, layout) {
  const segs = [];
  for (const [a, b] of edges) {
    const va = corners(hexCenter(parse(a), layout), layout.size), vb = corners(hexCenter(parse(b), layout), layout.size);
    const common = va.filter((p) => vb.some((q) => Math.hypot(p.x - q.x, p.y - q.y) < 0.5));
    if (common.length === 2) segs.push(common);
  }
  const k = (p) => `${Math.round(p.x * 2)},${Math.round(p.y * 2)}`, adj = new Map(), sk = (p, q) => [k(p), k(q)].sort().join('|');
  for (const [p, q] of segs) for (const [x, y] of [[p, q], [q, p]]) (adj.get(k(x)) ?? adj.set(k(x), []).get(k(x))).push({p: x, q: y});
  const used = new Set(), chains = [];
  for (const start of [...[...adj.keys()].filter((key) => adj.get(key).length !== 2), ...adj.keys()]) {
    for (const first of adj.get(start) ?? []) {
      if (used.has(sk(first.p, first.q))) continue;
      const chain = [first.p, first.q]; used.add(sk(first.p, first.q));
      let cur = first.q;
      for (;;) { const list = adj.get(k(cur)) ?? []; const nxt = list.find((s) => !used.has(sk(s.p, s.q))); if (!nxt || list.length > 2) break; used.add(sk(nxt.p, nxt.q)); chain.push(nxt.q); cur = nxt.q; }
      chains.push(chain);
    }
  }
  const mids = (c) => [c[0], ...c.slice(0, -1).map((p, i) => ({x: (p.x + c[i + 1].x) / 2, y: (p.y + c[i + 1].y) / 2})), c.at(-1)];
  const chaikin = (pts) => { let r = pts; for (let i = 0; i < 3; i++) { const o = [r[0]]; for (let j = 0; j < r.length - 1; j++) { const a = r[j], b = r[j + 1]; o.push({x: a.x * .75 + b.x * .25, y: a.y * .75 + b.y * .25}, {x: a.x * .25 + b.x * .75, y: a.y * .25 + b.y * .75}); } o.push(r.at(-1)); r = o; } return r; };
  return chains.map((c) => 'M' + chaikin(mids(c)).map((p) => `${f(p.x)} ${f(p.y)}`).join('L')).join('');
}

// Public projections only. Missing foreign influence/capitals stay unknown.
export function mapInfoModel(model,v){
 model.placeNames=v.mapId==='v3'?geographicNames(geographyV3):[];
 const cities={...v.knowledge.cities,...v.ownCities};
 model.territory={};model.tileYields={};
 for(const c of Object.values(cities)){
  model.territory[c.tileId]=c.ownerFactionId;
  for(const t of c.influence?.tiles??[]){if(v.knowledge.tiles[t.tileId]&&v.knowledge.tiles[t.tileId]!=='UNEXPLORED')model.territory[t.tileId]=c.ownerFactionId;
   if(c.ownerFactionId===v.factionId)model.tileYields[t.tileId]=t;
  }
 }
 for(const c of model.cities){
  c.capital=cities[c.id]?.capital===true||c.factionId===v.factionId&&v.faction?.capitalCityId===c.id;
  c.remembered=!c.own&&v.knowledge.tiles[c.center]==='REMEMBERED';
  const relation=v.diplomacy?.factions?.find(r=>r.factionId===c.factionId&&r.contact!==false)?.state;
  c.relation=relation==='ALLIANCE'?'ALLIED':relation==='WAR'?'HOSTILE':null;
 }
 const seen=new Set(model.units.map(u=>u.id));
 for(const a of Object.values(v.knowledge.lastSeenArmies??{})){
  const at=a.lastSeen?.tileId,age=(v.turn??v.turnNumber)-a.lastSeen?.turn;
  if(seen.has(a.armyId)||!at||age<0||age>3||v.knowledge.tiles[at]!=='REMEMBERED')continue;
  model.units.push({id:a.armyId,tileId:at,factionId:a.factionId,name:v.officers?.[a.commanderId]?.name??'??? ??',troop:({militia:'BT01',spear:'BT02',bow:'BT03',cavalry:'BT04'})[a.troopType]??a.troopType,count:null,enemy:true,remembered:true,seenAge:age});
 }
 return model;
}

// Read only explicit geographic fields. A map's purpose/note is not a name source.
export function geographicNames(data){
 const names=[],groups=new Map();
 for(const c of data.cities??[]){
  const name=c.province??c.region;
  if(typeof name!=='string'||!name.trim()||!c.at)continue;
  if(!groups.has(name))groups.set(name,[]);groups.get(name).push(c.at);
 }
 for(const [name,points] of groups)names.push({kind:'province',name,points});
 for(const kind of ['regions','mountains','passes'])for(const p of data[kind]??[]){
  if(typeof p.name==='string'&&p.at)names.push({kind:kind==='regions'?'province':kind==='passes'?'pass':'mountain',name:p.name,points:[p.at]});
 }
 const projection=data.projection;
 if(projection?.type==='equirectangular'){
  const [lon0,lat0]=projection.globalOriginLonLat,[x0,y0]=projection.sliceOriginGlobalOffset;
  const km=projection.kmPerHexX,cos=Math.cos(projection.refLatitude*Math.PI/180);
  for(const [name,line] of Object.entries(data.rivers??{})){
   if(!name.trim()||!Array.isArray(line)||line.length<2)continue;
   const points=line.map(([lon,lat])=>{
    const gy=Math.round((lat0-lat)*111/(km*Math.sqrt(3)/2));
    const x=Math.round((lon-lon0)*cos*111/km-(gy&1)/2)-x0,y=gy-y0;
    return [x-(y-(y&1))/2,y];
   });
   names.push({kind:'river',name,points});
  }
 }
 return names;
}
export function placeNameOpacity(kind,far,scale=1){
 return kind==='province'?(far?.35*Math.max(0,Math.min(1,(C190_DETAIL_ZOOM-scale)/.2)):0):kind==='river'?.5:.35;
}
export function placeNamesMarkup(names,center){
 return `<g class="c285-place-names" pointer-events="none" aria-hidden="true">${(names??[]).map(p=>{
  const points=p.points.map(at=>center(at.join(','))),a=points[Math.floor((points.length-1)/2)],b=points[Math.min(points.length-1,Math.floor((points.length-1)/2)+1)];
  if(!a||!p.name)return '';
  const x=p.kind==='province'?points.reduce((n,p)=>n+p.x,0)/points.length:a.x,y=p.kind==='province'?points.reduce((n,p)=>n+p.y,0)/points.length:a.y;
  let angle=p.kind==='river'?Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI:0;if(angle>90)angle-=180;if(angle< -90)angle+=180;if(globalThis.document?.documentElement?.dataset.ui==='kit')angle=Math.max(-25,Math.min(25,angle));
  return `<g class="c285-place-name" data-kind="${esc(p.kind)}" transform="translate(${f(x)} ${f(y)})"><text transform="rotate(${f(angle)})">${esc(p.name)}</text></g>`;
 }).join('')}</g>`;
}
export function setPlaceNamesEnabled(enabled){
 if(globalThis.document)document.documentElement.dataset.placeNames=enabled?'on':'off';
 try{globalThis.localStorage?.setItem('sg.placeNames.v1',enabled?'on':'off');}catch{}
}
// Integration hook for the protected shared settings module (C283).
export function mountPlaceNameSetting(host){
 if(!host||host.querySelector('[data-c285-setting]'))return;
 const row=host.ownerDocument.createElement('fieldset');row.className='c261-row';row.dataset.c285Setting='';
 row.innerHTML='<legend>지명</legend><span class="c261-options"><button type="button" data-value="on">켬</button><button type="button" data-value="off">끔</button></span>';
 const sync=()=>{for(const b of row.querySelectorAll('button'))b.setAttribute('aria-pressed',String(b.dataset.value===(document.documentElement.dataset.placeNames??'on')));};
 row.addEventListener('click',e=>{const b=e.target.closest('button');if(b){setPlaceNamesEnabled(b.dataset.value==='on');sync();}});sync();host.append(row);
}

function defs(size) {
  return `<defs>
  <radialGradient id="w-light"><stop offset="0" stop-color="#f6ecd8" stop-opacity=".92"/><stop offset=".5" stop-color="#f6ecd8" stop-opacity=".6"/><stop offset="1" stop-color="#f6ecd8" stop-opacity="0"/></radialGradient>
  <filter id="w-feather" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${f(size * 0.35)}"/></filter>
  <filter id="w-cloud" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${f(size * 0.7)}"/></filter>
  <filter id="w-paint" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" seed="7" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="${f(size * 0.55)}"/><feGaussianBlur stdDeviation="${f(size * 0.12)}"/></filter>
  <filter id="w-grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3"/><feColorMatrix values="0 0 0 0 0.5 0 0 0 0 0.45 0 0 0 0 0.38 0 0 0 0.16 0"/></filter>
  <filter id="w-shadow" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="3" stdDeviation="2.4" flood-color="#000" flood-opacity=".65"/></filter>
  <filter id="w-glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <radialGradient id="w-vignette" cx="38%" cy="32%" r="80%"><stop offset="0" stop-color="#fff6dc" stop-opacity=".07"/><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
  <clipPath id="w-face"><rect x="-14" y="-17" width="28" height="34" rx="1"/></clipPath>
  <clipPath id="w-face-shield"><path d="M-14 -17H14V9L0 17L-14 9Z"/></clipPath>
  </defs>`;
}

/**
 * opts: {size, margin, mapArt, cityArt:{cityId:{src,fit}}, unitArt:{troop:src}, facilityArt:{kind:src}, siteArt:{label:src}, unknownSiteArt,
 *        mode:'world'|'supply'|'faction'|'diplomacy'|'trace', relations:{F02:'WAR'}, cityBadges:{cityId:{idle,name,turns}}}
 */
const KIT_TONE = {F01: 'red', F02: 'green', F03: 'blue'}; // 표지 그림 색(없는 세력: 깃발 = 회색, 부대 틀 = 붉은 틀)
// Transient route/facing layers share their exact markup with a full draw.
export function renderMapPreview(hl,layout){
 const size=layout.size,C=id=>hexCenter(parse(id),layout);let svg='';
 if(hl.mech418){const m=hl.mech418;
  svg+='<g class="c418-mech" pointer-events="none">';
  for(const id of m.candidates)svg+=`<path class="c418-candidate" d="${hexPath(C(id),size*.88)}"/>`;
  if(m.path.length>1)svg+=`<path class="c418-dash" d="${m.path.map((id,i)=>{const p=C(id);return `${i?'L':'M'}${f(p.x)} ${f(p.y)}`;}).join('')}"/>`;
  for(const id of m.passed)svg+=`<path class="c418-passed" d="${hexPath(C(id),size*.7)}"><title>통과 · 전열을 무너뜨림</title></path>`;
  for(const z of m.zones)svg+=`<path class="c418-zone${z.preview?' preview':''}" d="${ringsPath(outlineRings(z.tiles.map(parse),layout))}"><title>팔진 · 반경 2</title></path>`;
  for(const l of m.links){const a=C(l.from),b=C(l.to);svg+=`<path class="c418-link" data-kind="${esc(l.kind)}" d="M${f(a.x)} ${f(a.y)}L${f(b.x)} ${f(b.y)}"><title>${esc(l.kind)}</title></path>`;}
  for(const mark of m.marks){const p=C(mark.tile);svg+=`<g class="c418-mark" transform="translate(${f(p.x)} ${f(p.y-55)})"><rect x="-17" y="-11" width="34" height="17" rx="2"/><text y="1">${esc(mark.text)}</text></g>`;}
  svg+='</g>';
 }
 for(const mark of hl.facing??[]){const p=C(mark.tile);if(mark.arrow){const a=C(mark.from),dx=p.x-a.x,dy=p.y-a.y;svg+=`<path class="w-c186-front" d="M${f(a.x+dx*.2)} ${f(a.y+dy*.2)}L${f(a.x+dx*.72)} ${f(a.y+dy*.72)}"/>`;}else if(mark.side!=='FRONT')svg+=`<g class="w-c186-facing ${mark.side}"><path d="${hexPath(p,size*.82)}"/><text x="${f(p.x)}" y="${f(p.y)}">${esc(mark.label??(mark.side==='REAR'?'뒤 +30%':'옆 +15%'))}</text></g>`;}
 for(const [i,id] of (hl.waypoints??[]).entries()){const p=C(id);svg+=`<g class="w-waypoint" transform="translate(${f(p.x)} ${f(p.y)})"><circle r="9"/><text y="4">${i+1}</text></g>`;}
 if(hl.blocked?.blockedTileId){const p=C(hl.blocked.blockedTileId),text=hl.blocked.reason;svg+=`<g class="w-route-blocked"><path d="${hexPath(p,size*.94)}"/>${hl.blockedTextInBand?'':`<g transform="translate(${f(p.x)} ${f(p.y-size)})"><rect x="-8" y="-16" width="${text.length*9+16}" height="23" rx="3"/><text y="0">${esc(text)}</text></g>`}</g>`;}
  if(globalThis.document?.documentElement?.dataset.ui==='kit')for(const mark of hl.tacticTiles??[]){const p=C(mark.tile);svg+=`<g class="c292-impact-area" pointer-events="none"><title>${mark.own?'아군 포함':'피해 대상'}</title><path d="${hexPath(p,size*.94)}"/>${mark.own?`<text x="${f(p.x)}" y="${f(p.y)}">!</text>`:''}</g>`;}
  if(globalThis.document?.documentElement?.dataset.ui==='kit'&&hl.side?.tile){
   const p=C(hl.side.tile),a=hl.side.from?C(hl.side.from):null;
   svg+=`<g class="c292-target" pointer-events="none"><title>공격 대상</title>${a?`<g data-c292-marker="origin" data-x="${f(a.x)}" data-y="${f(a.y)}" transform="translate(${f(a.x)} ${f(a.y)})"><circle r="4" stroke="none"/></g><path class="c292-attack-line" d="M${f(a.x)} ${f(a.y)} ${hl.side.ranged?`Q${f((a.x+p.x)/2)} ${f(Math.min(a.y,p.y)-size)}`:'L'} ${f(p.x)} ${f(p.y)}"/>`:''}<path class="c292-target-corners" d="M${f(p.x-size*.7)} ${f(p.y-size*.3)}v-8h8 M${f(p.x+size*.7)} ${f(p.y-size*.3)}v-8h-8 M${f(p.x-size*.7)} ${f(p.y+size*.3)}v8h8 M${f(p.x+size*.7)} ${f(p.y+size*.3)}v8h-8"/><g data-c292-marker="target" data-x="${f(p.x)}" data-y="${f(p.y-size-8)}" transform="translate(${f(p.x)} ${f(p.y-size-8)})"><path d="M-6 -16H6L0 0Z" stroke="none"/></g>${a?`<g data-c292-marker="arrow" data-x="${f(p.x)}" data-y="${f(p.y)}" data-dx="${f(p.x-a.x)}" data-dy="${f(p.y-a.y)}" transform="translate(${f(p.x)} ${f(p.y)})"><path d="M-10 -4L0 0L-10 4Z" stroke="none"/></g>`:''}</g>`;
  }
  if (hl.side?.tile) { const p = C(hl.side.tile), name = hl.side.label??({FRONT: '정면', FLANK: '옆 +15%', REAR: '뒤 +30%'}[hl.side.side] ?? ''); svg += `<g class="w-side s-${esc(hl.side.side ?? '')}"><path d="${hexPath(p, size * 0.98)}"/>${name ? `<text x="${f(p.x)}" y="${f(p.y - size * 1.0)}">${name}</text>` : ''}</g>`; }
  if (hl.path?.length > 1) {svg += `<path class="w-path" d="M${hl.path.map((id) => { const p = C(id); return `${f(p.x)} ${f(p.y)}`; }).join('L')}"/>`;const p=C(hl.path.at(-1));svg+=`<g class="c243-path-end${globalThis.document?.documentElement?.dataset.ui==='kit'&&hl.pathOk===false?' blocked':''}" pointer-events="none"><path d="${hexPath(p,size*.94)}"/><circle cx="${f(p.x)}" cy="${f(p.y)}" r="${globalThis.document?.documentElement?.dataset.ui==='kit'?12:4}"/></g>`;}
  if(globalThis.document?.documentElement?.dataset.ui==='kit'&&hl.path?.length>1){const risks=[...new Map((hl.pathRisk??[]).filter(r=>r.tileId&&hl.path.includes(r.tileId)).map(r=>[r.tileId,r])).values()];for(const r of risks.slice(0,3)){const p=C(r.tileId);svg+=`<g class="c291-route-warning" transform="translate(${f(p.x)} ${f(p.y)})"><title>${esc(r.kind)} 위험</title><svg x="-9" y="-9" width="18" height="18" viewBox="0 0 18 18"><path d="M9 1L17 16H1Z" fill="#171713" stroke="#B64F45" stroke-width="1.5"/><path d="M9 5V10M9 12V14" stroke="#E9E5DC" stroke-width="2"/></svg></g>`;}}
  if(hl.path?.length>1&&hl.pathRisk?.length){const p=C(hl.path.at(-1)),label=hl.pathRisk.map(r=>`${r.kind} −${troopText(r.loss)}`).join(' · ');svg+=`<g class="c279-path-risk" transform="translate(${f(p.x+size+8)} ${f(p.y)})" role="img" aria-label="${esc(label)}"><title>${esc(label)}</title><image href="${symUrl('controls','warning')}" width="16" height="16" y="-12"/><text x="20" y="1">${esc(label)}</text></g>`;}
  if(globalThis.document?.documentElement?.dataset.ui==='kit'&&hl.path?.length>1){const p=C(hl.path.at(-1)),label=hl.pathOk===false?'× 도달 불가':hl.pathUncertain?'? 이후 미확인':hl.pathRisk?.length?'⚠ 위험':'♧ 이동만';svg+=`<g class="c291-route-chip" transform="translate(${f(p.x)} ${f(p.y+size+12)})"><rect x="-70" y="-14" width="140" height="28"/><text y="5">${label}</text></g>`;}
  if(globalThis.document?.documentElement?.dataset.ui==='kit'&&hl.path?.length>1){const p=C(hl.path.at(-1));svg+=`<g class="c260-path-cost${hl.pathOk===false?' blocked':''}" transform="translate(${f(p.x)} ${f(p.y-size-14)})"><circle r="14"/><text y="5">${hl.pathOk===false?'×':`${hl.pathTurns??'—'}차례`}</text></g>`;}
  for (const o of hl.orders ?? []) {
    if (!o.path?.length) continue;
    const pts = o.path.map((id) => C(id)), end = pts.at(-1);
    if (pts.length > 1) svg += `<path class="w-order" d="M${pts.map((p) => `${f(p.x)} ${f(p.y)}`).join('L')}"/>`;
    svg += `<g class="w-order-end" transform="translate(${f(end.x)} ${f(end.y)})"><path d="M0 2V-20"/><path class="cloth" d="M0 -20L12 -16L0 -12Z"/>${o.turns > 1 ? `<text y="13">${o.turns}차례</text>` : ''}</g>`;
  }
  // 클릭 칸(투명) — 장식 층은 pointer-events:none
 return svg;
}
// Retain unchanged SVG layers (including decoded images) across committed
// results and unit selection. Compare generated source, never decorated DOM:
// readability and animation helpers legitimately mutate the live attributes.
const mapSources370=new WeakMap(),mapRoots370=new WeakMap();
export function updateWorldMap370(host,markup){
 const scratch=host.ownerDocument.createElement('div');scratch.innerHTML=markup;
 const next=scratch.firstElementChild,current=host.firstElementChild;
 const remember=node=>mapSources370.set(node,node.outerHTML);
 if(!current||current.tagName!==next?.tagName||!mapSources370.has(current)){
  host.replaceChildren(...scratch.childNodes);
  if(next){remember(next);mapRoots370.set(next,new Map([...next.attributes].map(a=>[a.name,a.value])));for(const node of next.children){remember(node);node.__mapKey370=[node.tagName,node.id,node.getAttribute('data-unit'),node.getAttribute('data-city'),node.getAttribute('data-tile'),node.getAttribute('class')].join('|');}}
  return;
 }
 const oldRoot=mapRoots370.get(current);
 for(const attr of [...next.attributes])if(oldRoot.get(attr.name)!==attr.value)current.setAttribute(attr.name,attr.value);
 for(const name of oldRoot.keys())if(!next.hasAttribute(name))current.removeAttribute(name);
 mapRoots370.set(current,new Map([...next.attributes].map(a=>[a.name,a.value])));
 const key=node=>[node.tagName,node.id,node.getAttribute('data-unit'),node.getAttribute('data-city'),node.getAttribute('data-tile'),node.getAttribute('class')].join('|');
 const pools=new Map();
 for(const node of current.children){const source=mapSources370.get(node);if(!source)continue;/* keys are captured before runtime decoration */
  const k=node.__mapKey370;const list=pools.get(k)??[];list.push(node);pools.set(k,list);
 }
 const keep=new Set();let cursor=current.firstElementChild;
 for(const node of [...next.children]){
  const k=key(node),candidate=pools.get(k)?.shift(),source=node.outerHTML;
  // Rebuild decorated labels: warnings and target classes must not accumulate.
  const chosen=candidate&&mapSources370.get(candidate)===source&&candidate.outerHTML===source?candidate:node;
  if(chosen===node){remember(node);node.__mapKey370=k;}
  keep.add(chosen);
  if(chosen!==cursor)current.insertBefore(chosen,cursor);
  cursor=chosen.nextElementSibling;
 }
 for(const node of [...current.children])if(!keep.has(node))node.remove();
}

// Shared by full renders and interaction-only updates; no terrain/label reconstruction.
export function renderMapInteraction462(model,layout,{dangerLens=false}={}){
 const {size}=layout,tiles=model.tiles.map(t=>({...t,id:`${t.q},${t.r}`}));
 const byId=new Map(tiles.map(t=>[t.id,t])),C=id=>hexCenter(byId.get(id)??parse(id),layout);
 const kit291=globalThis.document?.documentElement?.dataset.ui==='kit';
 const rawHighlights=model.highlights??{},hl=kit291&&!dangerLens?{...rawHighlights,danger:[],zoc:[],intents:[]}:rawHighlights;
 let svg='';
  const hexes = (ids, cls) => (ids ?? []).map((id) => byId.has(id) || parse(id) ? `<path class="${cls}" d="${hexPath(C(id), size * 0.92)}"/>` : '').join('');
  svg += kit291?`<defs><pattern id="c291-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V8" stroke="#B64F45" stroke-width="1"/></pattern></defs><g class="c291-danger"><path class="c291-danger-fill" d="${[...new Set(hl.danger??[])].map(id=>hexPath(C(id),size)).join('')}"/><path fill="url(#c291-hatch)" d="${[...new Set(hl.danger??[])].map(id=>hexPath(C(id),size)).join('')}"/></g>`+hexes(hl.move,'w-move')+hexes(hl.attack,'w-attack')+(hl.zoc?.length?`<path class="w-zoc" d="${ringsPath(outlineRings(tiles.filter(t=>hl.zoc.includes(t.id)),layout))}"/>`:''):hexes(hl.danger, 'w-danger') + hexes(hl.move, 'w-move') + hexes(hl.zoc, 'w-zoc') + hexes(hl.attack, 'w-attack');
  if(hl.danger?.length)svg+=`<path class="lod-danger-boundary" d="${ringsPath(outlineRings(tiles.filter(t=>hl.danger.includes(t.id)),layout))}"/>`;
  svg += '<defs><pattern id="c243-danger-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><path d="M0 0V8" stroke="#efe9dc" stroke-opacity=".38" stroke-width="2"/></pattern></defs>';
  if(hl.move?.length)svg+=`<path class="w-move-boundary" d="${ringsPath(outlineRings(tiles.filter(t=>hl.move.includes(t.id)),layout))}"/>`;
  if(hl.platformRange?.length)svg+=`<path class="w-platform-range" d="${ringsPath(outlineRings(tiles.filter(t=>hl.platformRange.includes(t.id)),layout))}"/>`;
  svg += '<defs><marker id="c186-front-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0L7 3.5L0 7Z" fill="#d4c7a5"/></marker><marker id="c186-danger-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0L6 3L0 6Z" fill="#c95f52"/></marker></defs>';
  svg += kit291?`<g class="c462-place-names">${placeNamesMarkup(model.placeNames,C)}</g>`:placeNamesMarkup(model.placeNames,C);
  svg += renderMapPreview({mech418:hl.mech418,tacticTiles:hl.tacticTiles,side:hl.side,facing:hl.facing},layout);
  for (const l of hl.links ?? []) { const a = C(l.from), z = C(l.to); svg += `<path class="w-link" d="M${f(a.x)} ${f(a.y)}L${f(z.x)} ${f(z.y)}"/>`; }
  for (const l of hl.intents ?? []) { const a = C(l.from), z = C(l.to), dx = z.x - a.x, dy = z.y - a.y, d = Math.hypot(dx, dy) || 1; svg += `<path class="w-intent" d="M${f(a.x + dx / d * size * .5)} ${f(a.y + dy / d * size * .5)}L${f(z.x - dx / d * size * .45)} ${f(z.y - dy / d * size * .45)}"/>`; }
  for(const warning of hl.supplyWarnings??[]){const c=C(warning.tileId);svg+=`<text class="c264-supply-warning" x="${c.x}" y="${c.y-32}">${warning.state==='STARVING'?'饑':'끊김'}</text>`;}
  for (const l of hl.supply ?? []) { const a = C(l.from), z = C(l.to); svg += `<g class="w-supply s-${esc(String(l.state ?? '').toLowerCase())}"><path d="M${f(a.x)} ${f(a.y)}L${f(z.x)} ${f(z.y)}"/><circle cx="${f(z.x)}" cy="${f(z.y)}" r="5"/><circle class="end" cx="${f(a.x)}" cy="${f(a.y)}" r="3.5"/></g>`; }
  svg += renderMapPreview({path:hl.path,pathTurns:hl.pathTurns,pathOk:hl.pathOk,pathRisk:hl.pathRisk,pathUncertain:hl.pathUncertain,orders:hl.orders,waypoints:hl.waypoints},layout);
 return kit291?`<g class="c462-interaction" pointer-events="none">${svg}</g>`:svg;
}
export function updateMapInteraction462(svg,model,options={}){
 if(globalThis.document?.documentElement?.dataset.ui==='kit')model=publicOverlays291(model);
 const layout={size:Number(svg.dataset.size),tilt:TILT,ox:Number(svg.dataset.ox),oy:Number(svg.dataset.oy)};
 const scratch=svg.ownerDocument.createElementNS('http://www.w3.org/2000/svg','svg');
 scratch.innerHTML=renderMapInteraction462(model,layout,options);
 const places=svg.querySelector('.c462-place-names');if(places)scratch.querySelector('.c462-place-names')?.replaceWith(places);
 svg.querySelector('.c462-interaction')?.replaceWith(scratch.firstElementChild);
 settleMapUnits386(svg,model.units.map(u=>({...u,markerPriority:unitPriority291(u,model.units,model.highlights.attack??[])})));
 for(const u of model.units){
  const node=svg.querySelector(`.w-unit[data-unit="${u.id}"]`);if(!node)continue;
  node.querySelectorAll('.bi,.bi-in,.lod-selected,.w-selected').forEach(n=>n.remove());
  if(u.active){
   node.insertAdjacentHTML('afterbegin',`<ellipse class="bi" cy="${layout.size*.3}" rx="${layout.size*.8}" ry="${layout.size*.3}"/><ellipse class="bi-in" cy="${layout.size*.3}" rx="${layout.size*.64}" ry="${layout.size*.22}"/>`);
   node.querySelector('.lod-marker')?.insertAdjacentHTML('afterbegin','<ellipse class="lod-selected" cy="11" rx="36" ry="10"/>');
   const plate=node.querySelector('.plate-top');if(plate?.querySelector('.std'))plate.insertAdjacentHTML('beforeend','<g class="w-selected"><rect x="15" y="-24" width="28" height="14" rx="2"/><text x="29" y="-14">선택</text></g>');
  }else if(!u.enemy&&u.moved)node.insertAdjacentHTML('afterbegin',`<ellipse class="bi done" cy="${layout.size*.3}" rx="${layout.size*.8}" ry="${layout.size*.3}" pathLength="100"/>`);
 }
 const activeFactions=new Set(model.units.filter(u=>u.active).map(u=>FACTION[u.factionId]?.color));
 for(const n of svg.querySelectorAll('.w-terr'))n.classList.toggle('selected',activeFactions.has(n.style.getPropertyValue('--fc')));
 svg.classList.toggle('target-picking',!!options.targetPicking);
}

export function renderWorldMap(model, opts = {}) {
  // The production controller still passes unitsLod=false unless ?units=lod.
  // Adopt C415 on the normal troop-layer path without changing that controller.
  const defaultTroops=!!opts.troopFormations&&mapFiguresEnabled()&&!!globalThis.location&&!new URLSearchParams(globalThis.location.search).has('units');
  if(defaultTroops)opts={...opts,unitsLod:true};
  const kit = opts.kit ?? null;
  const kit291=globalThis.document?.documentElement?.dataset.ui==='kit';
  if(kit291)model=publicOverlays291(model);
  const size = opts.size ?? 30;
  const tiles = model.tiles.map((t) => ({...t, id: `${t.q},${t.r}`}));
  const raw = tiles.map((t) => hexCenter(t, {size, ox: 0, oy: 0, tilt: TILT}));
  const xs = raw.map((c) => c.x), ys = raw.map((c) => c.y);
  const minX = Math.min(...xs), minY = Math.min(...ys), maxX = Math.max(...xs), maxY = Math.max(...ys);
  // 세계 그림(땅 둘레에 놀이판 밖 지형을 이어 그린 한 장 — tools/design/map-ring.py)이 있으면 여백 = 그 고리 너비. 화면을 끝까지 옮겨도 그림 밖이 보이지 않는다
  const world = opts.mapWorld?.src ? opts.mapWorld : null;
  const wkx = world ? (maxX - minX + size * 2) / world.land[0] : 0, wky = world ? (maxY - minY + size * 2) / world.land[1] : 0;
  const margin = world ? Math.floor(Math.min(world.ring * wkx, world.ring * wky)) - 2 : (opts.margin ?? 90);
  const layout = {size, tilt: TILT, ox: margin - minX + size, oy: margin - minY + size * 2.2};
  const painting = world ? {src:world.src,x:minX-size+layout.ox-world.ring*wkx,y:minY-size+layout.oy-world.ring*wky,width:(world.land[0]+world.ring*2)*wkx,height:(world.land[1]+world.ring*2)*wky} : null;
  const W = maxX - minX + size * 2 + margin * 2, H = maxY - minY + size * 3.2 + margin * 2;
  const byId = new Map(tiles.map((t) => [t.id, t]));
  const C = (id) => hexCenter(byId.get(id) ?? parse(id), layout);
  const rawHighlights=model.highlights??{},hl=kit291&&!opts.dangerLens?{...rawHighlights,danger:[],zoc:[],intents:[]}:rawHighlights,mode=opts.mode??'world';
  const land = ringsPath(outlineRings(tiles, layout));
  let svg = `<svg class="wmap${opts.unitsLod?' units-lod':''} mode-${esc(mode)}${world ? ' has-world' : ''}${opts.targetPicking ? ' target-picking' : ''}"${defaultTroops?' data-default-troops="true"':''} data-terrain-lens="${!!opts.terrainLens}" data-margin="${margin}" data-ox="${layout.ox}" data-oy="${layout.oy}" data-size="${size}" viewBox="0 0 ${f(W)} ${f(H)}" xmlns="http://www.w3.org/2000/svg">${defs(size)}${kit291?inkFogDefs291('c291-ink'):''}<defs><pattern id="c171-zoc" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="8" height="8" fill="#52212655"/><path d="M0 0V8" stroke="#f29486" stroke-width="2.5"/></pattern></defs>`;
  svg += `<rect class="w-void" x="0" y="0" width="${f(W)}" height="${f(H)}"/>`;

  // 땅
  if (!world) svg += `<path class="w-land-shadow" d="${land}" filter="url(#w-cloud)"/>`;
  if (world) {
    // 땅 + 땅 밖 지형을 한 장으로. 놀이판 밖은 먹 장막으로 어둡게(가장자리는 구름처럼 번지게) — 갈 수 없는 변방
    const bx = minX - size + layout.ox, by = minY - size + layout.oy;
    svg += `<image class="w-art w-world" href="${esc(world.src)}" x="${f(bx - world.ring * wkx)}" y="${f(by - world.ring * wky)}" width="${f((world.land[0] + world.ring * 2) * wkx)}" height="${f((world.land[1] + world.ring * 2) * wky)}" preserveAspectRatio="none"/>`;
    svg += `<mask id="w-m-beyond" maskUnits="userSpaceOnUse" x="0" y="0" width="${f(W)}" height="${f(H)}"><rect x="0" y="0" width="${f(W)}" height="${f(H)}" fill="#fff"/><path d="${land}" fill="#000" stroke="#000" stroke-width="${f(size * .5)}" stroke-linejoin="round" filter="url(#w-feather)"/></mask><rect class="w-beyond" x="0" y="0" width="${f(W)}" height="${f(H)}" mask="url(#w-m-beyond)"/>`;
  } else if (opts.mapArt) {
    const bx = minX - size + layout.ox, by = minY - size + layout.oy, bw = maxX - minX + size * 2, bh = maxY - minY + size * 2;
    svg += `<mask id="w-m-land" maskUnits="userSpaceOnUse"><path d="${land}" fill="#fff" stroke="#000" stroke-width="${f(size * 1.3)}" stroke-linejoin="round" filter="url(#w-feather)"/></mask><g mask="url(#w-m-land)"><image class="w-art" href="${esc(opts.mapArt)}" x="${f(bx)}" y="${f(by)}" width="${f(bw)}" height="${f(bh)}" preserveAspectRatio="none"/></g>`;
  } else {
    // 그림이 없을 때: 지형 색 칸을 붓 자국처럼 일그러뜨린 판
    const groups = {};
    for (const t of tiles) (groups[t.terrain] ??= []).push(hexPath(hexCenter(t, layout), size * 1.04));
    svg += `<g class="w-terrain" filter="url(#w-paint)">${Object.entries(groups).map(([k, d]) => `<path d="${d.join('')}" fill="${TERRAIN[k] ?? TERRAIN.unknown}"/>`).join('')}</g>`;
    svg += `<rect x="0" y="0" width="${f(W)}" height="${f(H)}" filter="url(#w-grain)" mask="url(#w-m-land2)"/><mask id="w-m-land2" maskUnits="userSpaceOnUse"><path d="${land}" fill="#fff"/></mask>`;
  }
  svg += `<rect class="w-light" x="0" y="0" width="${f(W)}" height="${f(H)}" fill="url(#w-vignette)"/>`;

  // 강(판정선) · 다리 · 길
  const waterEdges = [...(model.rivers ?? []), ...(model.bridges ?? [])];
  if (waterEdges.length) svg += `<path class="w-river" d="${riverPaths(waterEdges, layout)}"/>`;
  for (const [a, b] of model.bridges ?? []) { const p = C(a), q = C(b), mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2, ang = Math.atan2(q.y - p.y, q.x - p.x) * 180 / Math.PI; svg += `<g class="w-bridge" transform="translate(${f(mx)} ${f(my)}) rotate(${f(ang)})"><rect x="${f(-size * .38)}" y="${f(-size * .1)}" width="${f(size * .76)}" height="${f(size * .2)}"/></g>`; }
  if (model.roads?.length) svg += `<path class="w-road" d="${model.roads.map(([a, b]) => { const p = C(a), q = C(b); return `M${f(p.x)} ${f(p.y)}L${f(q.x)} ${f(q.y)}`; }).join('')}"/>`;

  // 영역
  const territory = model.territory ?? {};
  for (const fid of Object.keys(FACTION)) {
    const owned = tiles.filter((t) => territory[t.id] === fid && t.vis !== 'UNEXPLORED');
    if (!owned.length) continue;
    const d = ringsPath(outlineRings(owned, layout)), rel = opts.relations?.[fid] ? ` rel-${esc(opts.relations[fid])}` : '';
    svg += `<g class="w-terr${rel}${kit291&&model.units.some(u=>u.active&&u.factionId===fid)?' selected':''}" style="--fc:${FACTION[fid].color}"><path class="fill" d="${d}"/><path class="glow" d="${d}"/><path class="edge" d="${d}"/></g>`;
    if(kit291&&owned.length){const points=owned.map(t=>hexCenter(t,layout)),x=points.reduce((n,p)=>n+p.x,0)/points.length,y=points.reduce((n,p)=>n+p.y,0)/points.length;svg+=`<g class="c285-place-name" data-kind="faction" transform="translate(${f(x)} ${f(y)})"><text>${esc(FACTION[fid].name)}</text></g>`;}

  }
  // 칸
  svg += `<path class="w-grid" d="${tiles.map((t) => hexPath(hexCenter(t, layout), size)).join('')}"/>`;
  // 물 위 돛배(닷토리 B8 fleet · 기준 final-map-v2 의 강 위 배): 너른 물 칸 몇 곳에만, 안개 아래에 깔린다. 꾸밈일 뿐 규칙과 무관
  if (kit?.fleet) for (const t of tiles) { if (t.terrain !== 'water' || ((t.q * 7 + t.r * 13) % 5 + 5) % 5 !== 0) continue; const c = hexCenter(t, layout); svg += `<image class="w-fleet" href="${esc(kit.fleet)}" x="${f(c.x - size * 0.95)}" y="${f(c.y - size * 0.95)}" width="${f(size * 1.9)}" height="${f(size * 1.37)}"${(t.q + t.r) % 2 ? ` transform="translate(${f(c.x * 2)} 0) scale(-1 1)"` : ''}/>`; }
  // C331: 미탐험 먹구름은 그대로 두고 기억 지형의 색을 원화에 가깝게 유지한다.
  const remembered = tiles.filter((t) => t.vis === 'REMEMBERED');
  if(kit291&&remembered.length&&painting)svg+=`<defs><clipPath id="c291-memory-land"><path d="${remembered.map(t=>hexPath(hexCenter(t,layout),size)).join('')}"/></clipPath><filter id="c291-desaturate"><feColorMatrix type="saturate" values=".9"/></filter></defs><image href="${esc(painting.src)}" x="${painting.x}" y="${painting.y}" width="${painting.width}" height="${painting.height}" preserveAspectRatio="none" clip-path="url(#c291-memory-land)" filter="url(#c291-desaturate)"/>`;
  if (remembered.length) svg += `<path class="w-fog-mem" d="${remembered.map((t) => hexPath(hexCenter(t, layout), size)).join('')}"/>`;
  const unexplored = tiles.filter((t) => t.vis === 'UNEXPLORED');
  if (unexplored.length) svg += `<mask id="w-m-fog" maskUnits="userSpaceOnUse"><path d="${unexplored.map((t) => hexPath(hexCenter(t, layout), (kit291?size:size*1.15))).join('')}" fill="#fff" ${kit291?'':'filter="url(#w-cloud)"'}/></mask><rect class="w-fog" x="0" y="0" width="${f(W)}" height="${f(H)}" mask="url(#w-m-fog)"/>`;

  // 이동·공격·위험 칸, 경로, 예약, 정면, 인연선, 적 의도, 보급선
  if(opts.mode==='supply'&&opts.supplyPublic){
    const covered=publicSupplyTiles(tiles,opts.supplyPublic.cities,opts.supplyPublic.hubs);
    if(covered.length)svg+=`<path class="w-supply-boundary" d="${ringsPath(outlineRings(covered,layout))}"/>`;
  }
  svg += renderMapInteraction462(model,layout,opts);
  svg += `<g class="w-hits">${tiles.map((t) => `<path data-tile="${t.id}" tabindex="-1" aria-label="칸 정보" d="${hexPath(hexCenter(t, layout), size)}"/>`).join('')}</g>`;

  // 시설
  for (const [index,fc] of (model.facilities ?? []).entries()) {
    const c = facilityPlacement(model,fc,layout,painting);if(!c)continue;
    const art = FACILITY_FILE[fc.kind]?`/assets/ui-v3/dots-1016/facilities/A-${FACILITY_FILE[fc.kind]}.png`:opts.facilityArt?.[fc.kind];
    if (art) { const w = size * 1.35, h = w * 0.75, clip=`w-facility-land-${index}`; svg += `<clipPath id="${clip}"><path d="${hexPath(c.center,size*.82)}"/></clipPath><g clip-path="url(#${clip})"><g class="w-facility${fc.disabled ? ' off' : ''}${fc.constructing||fc.underConstruction?' building':''}" data-facility-tile="${esc(fc.tileId)}" transform="translate(${f(c.x)} ${f(c.y)})"><title>${esc(FACILITY_NAME[fc.kind] ?? fc.kind)}</title><image style="filter:${FACILITY_TONE}" href="${esc(art)}" x="${f(-w / 2)}" y="${f(-h / 2)}" width="${f(w)}" height="${f(h)}"/></g></g>`; }
    else svg += `<g class="w-facility token${fc.disabled ? ' off' : ''}" transform="translate(${f(c.x)} ${f(c.y)})"><title>${esc(FACILITY_NAME[fc.kind] ?? fc.kind)}</title><path d="${hexPath({x: 0, y: 0}, size * 0.52)}"/><text y="5">${FACILITY_GLYPH[fc.kind] ?? '工'}</text></g>`;
  }
  // 탐험지 — 모르는 곳은 안개 형체, 아는 곳은 미니어처(없으면 각인 표지)
  for (const p of model.places ?? []) {
    const c = C(Array.isArray(p.at) ? p.at.join(',') : p.tileId), status = p.status ?? 'KNOWN', unknown = status === 'UNKNOWN';
    if(kit291){svg+=`<g class="w-site c291-site s-${esc(status.toLowerCase())}" data-place="${esc(p.label)}" transform="translate(${f(c.x)} ${f(c.y)})"><g class="c264-site-disc"><title>${unknown?'미확인 흔적':esc(p.label)}</title><rect x="-16" y="-16" width="32" height="32"/><text y="7">${unknown?'?':PLACE_GLYPH[p.label]??'跡'}</text>${status==='KNOWN'?'<circle class="c291-site-ready" cx="12" cy="-12" r="3"/>':!unknown?'<path d="M-6 10H6"/>':''}</g>${unknown?'':`<text class="name" y="34">${esc(p.label)}</text>`}</g>`;continue;}
    const art = unknown ? opts.unknownSiteArt : opts.siteArt?.[p.label];
    const title = `${unknown ? '미확인 흔적' : esc(p.label)}${!unknown && p.note ? ' · ' + esc(p.note) : ''}${!unknown&&p.eventName ? ' — 조사하면: ' + esc(p.eventName) : ''}${p.layer ? ` · ${esc(p.layer)} ${esc(p.layerName ?? '')}` : ''}\n부대가 이 칸에서 교전 없이 차례를 마치면 조사`;
    svg += `<g class="w-site s-${esc(status.toLowerCase())}" data-place="${esc(p.label)}" transform="translate(${f(c.x)} ${f(c.y)})"><title>${title}</title><ellipse class="halo" rx="${f(size * 0.8)}" ry="${f(size * 0.3)}" cy="${f(size * 0.18)}"/>${status === 'KNOWN' ? `<ellipse class="beacon" rx="${f(size * 0.8)}" ry="${f(size * 0.3)}" cy="${f(size * 0.18)}"/>` : ''}`;
    if(!unknown)svg+=`<g class="c264-site-disc" transform="translate(0 10)"><circle r="14"/><text y="5">${PLACE_GLYPH[p.label]??'跡'}</text>${status==='KNOWN'||status==='PENDING'?'<g class="c191-investigate" aria-label="조사 목표"><title>조사 목표</title><circle r="13" style="fill:none"/><g transform="translate(7 -8) scale(.45)"><circle r="6"/><path d="M4 4l6 6"/></g></g>':''}</g>`;
    const baked = !!world?.baked?.includes(p.label); // 2026-10-14: 탐험지가 지도 바탕 그림 안에 그려져 있다(v13) — 얹는 미니어처 없음, 모르는 곳만 '?' 표지
    if (art && !baked) { const w = size * 2, h = w * 0.75; svg += `<image href="${esc(art)}" x="${f(-w / 2)}" y="${f(-h * 0.62)}" width="${f(w)}" height="${f(h)}"/>`; }
    else if (!baked || unknown) svg += `<g class="mark"><rect x="-10" y="-22" width="20" height="20" transform="rotate(45 0 -12)"/><text y="-7">${unknown ? '?' : PLACE_GLYPH[p.label] ?? '跡'}</text></g>`;
    if (!unknown) svg += `<text class="name" y="${f(size * 0.78)}">${esc(p.label)}</text>`;

    // 단계 표지: 조사 중 = 査(점선 고리 돎) · 조사 끝 = 已 인장
    if (status === 'PENDING') svg += `<g class="badge pend" transform="translate(${f(size * 0.72)} ${f(-size * 0.86)})"><circle class="spin" r="9.5"/><circle r="7"/><text y="3.6">査</text></g>`;
    if (status === 'RESOLVED') svg += `<g class="badge done"${p.layer ? ` data-layer="${esc(p.layer)}"` : ''} transform="translate(${f(size * 0.72)} ${f(-size * 0.86)})"><rect x="-7.5" y="-7.5" width="15" height="15"/><text y="3.6">${esc(p.layer ?? '已')}</text></g>`;
    svg += `</g>`;
  }

  if(opts.terrainLens)for(const [id,t] of Object.entries(model.tileYields??{})){
    const c=C(id),values=[['식',t.yield.food],['산',t.yield.production]].filter(([,n])=>n>0);
    svg+=`<g class="c264-tile-yields" transform="translate(${c.x} ${c.y+14})">${values.map(([k,n],i)=>`<g transform="translate(${i*20-10} 0)"><circle r="9"/><text y="4">${n}</text><title>${k==='식'?'식량':'생산'} +${n}</title></g>`).join('')}</g>`;
  }
  // 발밑 빛(2026-10-13, 사용자 "진한 펜선이랑 다 같이 갈 수 있는 방법 — 부대랑 성 쪽만 좀 밝게"): 성과 부대가 선 자리 둘레의 땅만 밝힌다.
  // CSS 에서 overlay 로 섞으므로 지도의 검은 펜선은 검게 남고 들 · 숲 · 물의 바탕만 밝아진다. 성 안에 든 부대는 성의 빛으로 충분하다.
  { const cityTiles = new Set((model.cities ?? []).map((c) => c.center));
    const lights = [...(model.cities ?? []).map((c) => ({p: C(c.center), r: size * (c.kind === 'minor' ? 3.3 : 4.1), dy: -size * 0.25, k: 'city'})),
      ...(model.units ?? []).filter((u) => !u.remembered&&!cityTiles.has(u.tileId)).map((u) => ({p: C(u.tileId), r: size * 2.5, dy: -size * 0.7, k: 'unit'}))];
    svg += `<g class="w-lights">${lights.map((l) => `<ellipse class="${l.k}" cx="${f(l.p.x)}" cy="${f(l.p.y + l.dy)}" rx="${f(l.r)}" ry="${f(l.r * 0.8)}"/>`).join('')}</g>`; }
  // 성 — 7칸 자리 + 미니어처 그림(그림 속 7칸 상자를 지도 7칸 상자에 맞춤)
  const plates = [];
  const occupied = [];
  const overlaps = (a, b) => a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
  for (const city of model.cities ?? []) {
    const fs = FACTION[city.factionId] ?? NEUTRAL;
    const cells = [parse(city.center), ...(city.gates ?? []).map(parse), ...(city.walls ?? []).map(parse)];
    const rings = outlineRings(cells, layout), pts = rings.flat();
    const bx0 = Math.min(...pts.map((p) => p.x)), bx1 = Math.max(...pts.map((p) => p.x)), by0 = Math.min(...pts.map((p) => p.y));
    const art = opts.cityArt?.[city.id], baked = !!world?.baked?.includes(city.id); // baked = 성이 지도 바탕 그림 안에 그려져 있다 — 얹는 그림 없음
    svg += `<g class="w-city${baked ? ' baked' : ''}${city.attackable?' attackable':''}${city.besieged ? ' besieged' : ''}${city.neutral ? ' neutral' : ''}" data-city="${esc(city.id)}" style="--fc:${fs.color}"><path class="ground" d="${ringsPath(rings)}"/>`;
    if (baked) { /* 그림은 바탕에 있다 */ }
    else if (art?.fit) { const [fx, fy, fw] = art.fit.flowerBox, k = (bx1 - bx0) / fw; svg += `<image class="art" href="${esc(art.src)}" x="${f(bx0 - fx * k)}" y="${f(by0 - fy * k)}" width="${f(art.fit.image[0] * k)}" height="${f(art.fit.image[1] * k)}"/>`; }
    // C237: absent city art leaves the map visible; the city nameplate remains.
    for (const g of city.gates ?? []) { const c = C(g), lost = (city.lostGates ?? []).includes(g); svg += `<g class="w-gate${lost ? ' lost' : ''}" transform="translate(${f(c.x)} ${f(c.y)})"><path d="M-5 4V-2a5 5 0 0 1 10 0V4"/>${lost ? '<path class="x" d="M-4 -6L4 2M4 -6L-4 2"/>' : ''}</g>`; }
    if (city.besieged) { const c = C(city.center); svg += kit?.siegeFire ? `<image class="w-siege" href="${esc(kit.siegeFire)}" x="${f(c.x - size * 0.9)}" y="${f(c.y - size * 2.2)}" width="${f(size * 1.8)}" height="${f(size * 1.83)}"/>` : `<g class="w-smoke" transform="translate(${f(c.x)} ${f(c.y - size)})"><circle r="7"/><circle r="10" cx="8" cy="-6"/><circle r="12" cx="-6" cy="-14"/></g>`; }
    svg += `</g>`;
    // 이름판(가장 위 층): 세력 마름모 + 이름 + 내구
    const c = C(city.center), name = esc(city.name), w = kit?.cityPlate ? Math.max(50, String(city.name ?? '').length * 17 + 26) : Math.max(76, String(city.name ?? '').length * 17 + 46), def = city.defenseMax ? Math.max(0, Math.min(1, (city.defense ?? 0) / city.defenseMax)) : null;
    const b = opts.cityBadges?.[city.id], badge = b ? (() => { const t = b.idle ? '생산 선택' : b.kind==='muster'?`출진 ${b.turns??'—'}`:`${b.name} · ${b.turns??'—'}차례`; const bw = t.length * 10 + 20; return `<g class="prod${b.idle ? ' idle' : ''}${b.kind==='muster'?' muster':''}" data-city="${esc(city.id)}" data-prod-city="${esc(city.id)}" transform="translate(0 ${city.defenseMax ? 45 : 25})"><rect x="${f(-bw / 2)}" y="-9" width="${f(bw)}" height="18"/>${b.kind==='muster'?`<path class="muster-flag" d="M${f(-bw/2-7)} 12V-15l13 4-13 4"/>`:""}<text y="4">${esc(t)}</text></g>`; })() : '';
    // 성 기본 정보 줄(사용자 2026-10-11 "성에 총 병력수·내구도 등 기본 정보 — 코삼·문명처럼"): 병력(내 성 = 성 안 예비병, 남의 성 = 모름 '?') · 내구
    const iw = Math.max(w + 14, 78), infoY = def !== null ? 19 : 15;
    const info = city.defenseMax || Number.isFinite(city.troops) ? `<g class="cinfo" transform="translate(0 ${infoY})"><rect class="ci-bg" x="${f(-iw / 2)}" y="0" width="${f(iw)}" height="13.5" rx="1.5"/>`
      + `<image href="${symUrl('resources','troops')}" x="${f(-iw / 2 + 3)}" y="1.6" width="16" height="16"/><text class="ci-t" x="${f(-iw / 2 + 21)}" y="10.2">${Number.isFinite(city.troops) ? troopLabel(city.troops) : '?'}</text>`
      + (city.defenseMax ? `<image href="${symUrl('actions','garrison')}" x="${f(iw / 2 - 37)}" y="1.6" width="16" height="16"/><text class="ci-t${def !== null && def < 0.5 ? ' low' : ''}" x="${f(iw / 2 - 19)}" y="10.2">${Math.round(city.defense ?? 0)}</text>` : '') + '</g>' : '';
    // 2026-10-14 이름표 자리(사용자 "성 이름이 성의 어느 방향에 어느 정도 붙어 있는지 · 글자 크기 · 색을 레퍼런스 보고"): 바탕에 그려 넣은 성이면
    // 그려진 성벽 아래끝 가운데(world.cityLabelAt, 바탕 그림 px)에 띠 위쪽이 살짝 걸치게 — 솔 시안 04b 의 업 · RTK14 처럼 성에 붙인다. 아니면 예전 자리(칸 가운데 아래)
    const labelAt = world?.cityLabelAt?.[city.id], ribH = city.kind === 'minor' ? 21 : 24;
    const lx = labelAt ? minX - size + layout.ox - world.ring * wkx + labelAt[0] * wkx : c.x;
    const ly = labelAt ? minY - size + layout.oy - world.ring * wky + labelAt[1] * wky + (globalThis.document?.documentElement?.dataset.ui==='kit'&&new URLSearchParams(globalThis.location?.search??'').get('panel')!=='v1'?0:ribH * 0.32) : c.y + size * (city.kind === 'minor' ? 1.35 : 1.7);
    const nameLen = String(city.name ?? '').length, ribW = ribH * (nameLen > 1 ? 3.55 : 2.6);
    // 2026-10-14 성 소유 표시(사용자 "성이 딱 봐도 중립인지, 점령된 상태인지, 누구 성인지 알 수 있게 — 레퍼런스 보고"):
    // 삼국지14 = 이름 옆 세력색 표 + 영토 색, 토탈워 삼국 = 세력 깃발 판, Old World = 세력색 경계선 → 이름 띠를 소유 세력색 먹으로(중립 = 무채색 먹),
    // 띠 왼쪽 끝에 세력 문장 원판(중립 = 회색 원판 '中'), 점령 중이면 원판 둘레에 끊긴 고리. 영토 색 · 경계는 hud-ink.css '성 소유 표시'
    const ownTone = KIT_TONE[city.factionId], sealR = ribH * 0.6, sealX = -ribW / 2 + sealR * 0.15, occupying = !!(city.occupation?.stage && city.occupation.stage !== 'NORMAL');
    const seal = !labelAt ? '' : city.factionId && FACTION[city.factionId] ? `<g class="seal${occupying ? ' occupying' : ''}" transform="translate(${f(sealX)} 0)"><image href="/assets/ui-v3/emblems/${esc(city.factionId)}.png" x="${f(-sealR)}" y="${f(-sealR)}" width="${f(sealR * 2)}" height="${f(sealR * 2)}"/>${occupying ? `<image class="occ" href="/assets/ui-v3/emblems/occupied-ring.png" x="${f(-sealR * 1.22)}" y="${f(-sealR * 1.22)}" width="${f(sealR * 2.44)}" height="${f(sealR * 2.44)}"/>` : ''}</g>`
      : `<g class="seal neutral" transform="translate(${f(sealX)} 0)"><image href="/assets/ui-v3/emblems/neutral.png" x="${f(-sealR)}" y="${f(-sealR)}" width="${f(sealR * 2)}" height="${f(sealR * 2)}"/></g>`; // 닷토리 C3 중립 문장(구름, 짐승 없음)
    const ribbon = labelAt ? `<image class="rib${ownTone ? ' owned' : ' unowned'}" href="/assets/ui-v3/ink/ribbon-${nameLen > 1 ? 2 : 1}${ownTone ? '-' + ownTone : ''}.png" x="${f(-ribW / 2)}" y="${f(-ribH / 2)}" width="${f(ribW)}" height="${f(ribH)}"/>` : '';
    if (opts.compactLabels) occupied.push({x:lx-iw/2-22,y:ly-50,w:iw+44,h:city.defenseMax?108:88});
    const status = city.besieged ? '포위' : city.unrest === 'CHAOS' ? '혼란' : city.unrest === 'UNREST' ? '불안' : city.occupation && city.occupation.stage && city.occupation.stage !== 'NORMAL' ? '점령' : '';
    if(opts.unitMarkers){
      plates.push(`<g class="w-cityplate c190-cityplate${city.attackable?' attackable':''}" data-city="${esc(city.id)}" data-current-target="${[city.center,...(city.gates??[])].includes(hl.side?.tile)}" data-camera-tile="${esc(city.center)}" transform="translate(${f(lx)} ${f(ly)})" style="--fc:${fs.color}"><g class="c269-city-label">${cityBand(city,b,globalThis.document?.documentElement?.dataset.ui==='kit')}</g></g>`);
      continue;
    }
    plates.push(`<g class="w-cityplate${city.attackable?' attackable':''}${city.kind === 'minor' ? ' minor' : ''}${city.neutral ? ' neutral' : ''}" data-city="${esc(city.id)}" data-camera-tile="${esc(city.center)}" transform="translate(${f(lx)} ${f(ly)}) scale(.88)" style="--fc:${fs.color}">
      ${kit?.cityPlate ? `<image class="plate-art" href="${esc(kit.cityPlate)}" x="${f(-w / 2 - 5)}" y="-13.5" width="${f(w + 10)}" height="27" preserveAspectRatio="none"/>` : ''}${(() => { const fl = kit?.cityFlag?.[KIT_TONE[city.factionId] ?? 'grey']; return fl ? `<g class="cflag" transform="translate(${f(labelAt ? sealX - sealR - 7 : -w / 2 - 12)} -50)"><image href="${esc(fl)}" x="-8" y="0" width="17" height="58"/>${/^F\d\d$/.test(city.factionId ?? '') ? `<image href="/assets/ui-v3/emblems/${esc(city.factionId)}.png" x="-4.6" y="9" width="10" height="10"/>` : ''}</g>` : ''; })()}
      ${ribbon}${seal}<rect class="bg" x="${f(-w / 2)}" y="-12" width="${f(w)}" height="24"/><g class="crest" transform="translate(${f(-w / 2 + 2)} 0)"><rect x="-9" y="-9" width="18" height="18" transform="rotate(45)"/><text y="4.5">${esc(fs.glyph)}</text></g>
      <text class="name" x="${f(kit?.cityPlate ? 0 : 9)}" y="5.5">${name}</text>${def !== null ? `<rect class="def-bg" x="${f(-w / 2 + 16)}" y="14" width="${f(w - 22)}" height="3"/><rect class="def" x="${f(-w / 2 + 16)}" y="14" width="${f((w - 22) * def)}" height="3"/>` : ''}
      ${status ? `<g class="st" transform="translate(${f(w / 2 + 4)} -6)"><rect x="0" y="-9" width="34" height="17"/><text x="17" y="4">${status}</text></g>` : ''}${info}${badge}</g>`);
  }

  // C196: small ink stepping stones on the actual crossing boundary. No assets.
  for(const [a,b] of model.fords??[]){const p=C(a),q=C(b),x=(p.x+q.x)/2,y=(p.y+q.y)/2,angle=Math.atan2(q.y-p.y,q.x-p.x)*180/Math.PI;
    svg+=`<g class="w-ford" pointer-events="none" aria-label="여울 — 건널 수 있는 강 경계" transform="translate(${f(x)} ${f(y)}) rotate(${f(angle)})"><title>여울 — 건널 수 있는 강 경계</title><path d="M-11 0H11" stroke="#d6c9ae" stroke-width="5" stroke-linecap="round"/><path d="M-9 -1l3 1m4 -1l3 1m4 -1l3 1" fill="none" stroke="#292521" stroke-width="3.5" stroke-linecap="round"/></g>`;
  }
  svg += '<g class="w-fire-ground" pointer-events="none" aria-hidden="true"></g>';
  // C408: same map-coordinate paper above terrain + people, below all unit/city plates.
  // The original SVG root is the camera group; no viewport-sized filtering pass.
  if(opts.unitsLod&&mapFiguresEnabled())svg+=`<g class="c408-people" ${occlusionEnabled()?`data-occlusion="${esc(JSON.stringify(occlusionPieces(painting)))}"`:""} pointer-events="none" aria-hidden="true"></g><defs><filter id="c409-ink" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation=".08"/><feColorMatrix type="saturate" values=".5"/><feComponentTransfer><feFuncR type="linear" slope=".74" intercept=".11"/><feFuncG type="linear" slope=".74" intercept=".11"/><feFuncB type="linear" slope=".72" intercept=".10"/></feComponentTransfer></filter><pattern id="c408-paper" width="64" height="64" patternUnits="userSpaceOnUse"><image href="/assets/ui-kit/own/paper/c408/grain.webp" width="64" height="64"/></pattern></defs><g class="c408-cover" pointer-events="none" aria-hidden="true" style="mix-blend-mode:multiply"><rect width="${f(W)}" height="${f(H)}" fill="#e6d9bc" opacity=".10"/><rect width="${f(W)}" height="${f(H)}" fill="url(#c408-paper)" opacity=".62"/></g>`;
  svg += `<g class="w-plates">${plates.join('')}</g>`; // 성 이름판은 부대 아래(부대를 누르기 쉽게)
  // 부대 — 무리 그림(있으면) + 장수 깃발판(얼굴·병력) + 옥벽 고리
  const units = (model.units ?? []).filter((u) => u.count !== 0 || u.prevCount).map(u=>kit291?{...u,markerPriority:unitPriority291(u,model.units,hl.attack??[])}:u);
  const labelOffsets = new Map();
  if (opts.compactLabels && !opts.troopFormations && !opts.unitMarkers) {
    // Reserve selected banners first; keep every portrait tethered to its actual tile.
    for (const u of [...units].sort((a,b)=>Number(!!b.active)-Number(!!a.active))) {
      const c=C(u.tileId), scale=u.active?1:.82, w=Math.max(70,String(u.name??'').length*12+20)*scale, h=72*scale;
      let best=null;
      for (let row=0;row<6;row++) for (const dx of [0,-size*1.6,size*1.6,-size*3.2,size*3.2]) {
        const dy=-size*1.5-row*h, box={x:c.x+dx-w/2,y:c.y+dy-32*scale,w,h};
        const hits=occupied.filter(b=>overlaps(box,b)).length, score=hits*10000+Math.hypot(dx,dy+size*1.5);
        if (!best || score<best.score) best={dx,dy,scale,box,score};
      }
      occupied.push(best.box);labelOffsets.set(u.id,best);
    }
    units.sort((a,b)=>Number(!!a.active)-Number(!!b.active));
  }
  const stack = {}, cityCenters = new Set((model.cities ?? []).map((c) => c.center));
  const cityTiles=new Set((model.cities??[]).flatMap(c=>[c.center,...(c.gates??[])]));
  const displayOffsets=opts.unitMarkers?unitCityOffsets(model.cities,C,size):{};
  // 그리는 순서: 위쪽 칸 먼저 → 아래쪽 칸, 성 안 부대는 맨 뒤. 성 안 부대는 깃발판만 있어서 옆 칸 병사 무리에 가리면 숫자만 남는다(2026-10-12)
  if (!opts.compactLabels) units.sort((a, b) => Number(cityCenters.has(a.tileId)) - Number(cityCenters.has(b.tileId)) || C(a.tileId).y - C(b.tileId).y);
  for (const u of units) {
    const n = (stack[u.tileId] = (stack[u.tileId] ?? -1) + 1), c = C(u.tileId), x = c.x + (opts.compactLabels?0:n * size * 0.42), y = c.y + (opts.compactLabels?0:n * size * 0.16);
    const label=labelOffsets.get(u.id);
    const inCity = opts.unitsLod?lodInCity(u,model.cities):(opts.unitMarkers?cityTiles:cityCenters).has(u.tileId), fs = FACTION[u.factionId] ?? NEUTRAL, art = inCity||u.remembered ? null : opts.unitArt?.[troopKey(u)];
    const sample=opts.troopFormations?sampleTroop({...u,displayOffsets},{x,y},C):null;
    const formation=opts.troopFormations&&!u.remembered?troopLayout(u,inCity,sample):null,footprint=formation?.bounds;
    // 병사 무리: 세력 색 천을 두른 무리를 칸 위에 크게(시안 final-map-v2). 발끝이 칸 가운데 조금 아래에 오게 놓는다
    const sq = inCity||u.remembered ? null : opts.squadArt?.[troopKey(u)]?.[KIT_TONE[u.factionId] ?? 'grey'], sqW = size * 3.3, sqH = sq ? sqW * sq.size[1] / sq.size[0] : 0;
    const ratio = u.maxCount ? Math.max(0, Math.min(1, (u.count ?? 0) / u.maxCount)) : 1;
    const lost = Number.isFinite(u.prevCount) && u.prevCount > u.count ? u.prevCount - u.count : 0;
    const flip = u.faceLeft ? ' scale(-1 1)' : '';
    const badges = [u.morale === 'ROUTING' ? '潰' : u.morale === 'SHAKEN' ? '搖' : '', u.formation === 'BROKEN' ? '崩' : u.formation === 'DISORDERED' ? '亂' : '', u.braced ? '守' : '', u.platformState === 'DEPLOYED' ? '전' : '', ...(u.status ?? []).map((s) => STATUS_GLYPH[s.kind ?? s] ?? '')].filter(Boolean);
    const cls = `w-unit${u.feelHit?' feel-hit':''}${u.feelHit?.rout?' feel-rout':''}${u.active ? ' active' : ''}${u.moved ? ' moved' : ''}${u.ready ? ' ready' : ''}${u.enemy ? ' enemy' : ''}${lost ? ' hit' : ''}${u.crisis ? ' crisis' : ''}${u.bond ? ' bonded' : ''}`;
    const offset=displayOffsets[u.tileId]??{x:0,y:0};
    svg += `<g class="${cls}" ${u.remembered?`data-memory-tile="${esc(u.tileId)}" data-tile="${esc(u.tileId)}"`:`data-unit="${esc(u.id)}"`} data-camera-tile="${esc(u.tileId)}" data-display-offsets="${esc(JSON.stringify(displayOffsets))}"${footprint?` data-troop-anchor="1" data-troop-head="${formation.headTop}" data-troop-top="${footprint.top}" data-troop-left="${footprint.left}" data-troop-right="${footprint.right}" data-troop-bottom="${footprint.bottom}"`:''} data-x="${f(x)}" data-y="${f(y)}" transform="translate(${f(sample?.pos.x??x+offset.x)} ${f(sample?.pos.y??y+offset.y)})" style="--fc:${fs.color}">
      ${footprint?`<g visibility="hidden" pointer-events="none"><rect data-troop-project="origin" width=".01" height=".01"/><rect data-troop-project="x" x="1" width=".01" height=".01"/><rect data-troop-project="y" y="1" width=".01" height=".01"/></g>`:''}
      <ellipse class="shadow" cx="0" cy="${f(size * 0.3)}" rx="${f(size * 0.72)}" ry="${f(size * 0.25)}"/>
      ${!u.enemy?`<ellipse class="ink-pick-ring" cx="0" cy="10" rx="25" ry="10"/>`:""}
      ${u.active ? `<ellipse class="bi" cx="0" cy="${f(size * 0.3)}" rx="${f(size * 0.8)}" ry="${f(size * 0.3)}"/><ellipse class="bi-in" cx="0" cy="${f(size * 0.3)}" rx="${f(size * 0.64)}" ry="${f(size * 0.22)}"/>` : !u.enemy && u.moved ? `<ellipse class="bi done" cx="0" cy="${f(size * 0.3)}" rx="${f(size * 0.8)}" ry="${f(size * 0.3)}" pathLength="100"/>` : ''}
      ${u.crisis ? `<ellipse class="crisis-ring" cx="0" cy="${f(size * 0.3)}" rx="${f(size * 0.9)}" ry="${f(size * 0.34)}"/>` : ''}
      ${opts.troopFormations&&!u.remembered ? `<ellipse class="w-troops-hit" cx="0" cy="10" rx="22" ry="12"/>` : sq ? `<image class="squad big" href="${esc(sq.src)}" x="${f(-sqW / 2)}" y="${f(size * 0.62 - sqH)}" width="${f(sqW)}" height="${f(sqH)}"${flip ? ` transform="${flip.trim()}"` : ''}/>` : art ? `<image class="squad" href="${esc(art)}" x="${f(-size * 1.15)}" y="${f(-size * 1.55)}" width="${f(size * 2.3)}" height="${f(size * 2.3)}"${flip ? ` transform="${flip.trim()}"` : ''}/>` : ''}
      ${label?`<path class="w-label-tether" d="M0 0L${f(label.dx)} ${f(label.dy+30*label.scale)}" fill="none" stroke="${fs.color}" stroke-width="1.5" pointer-events="none"/>`:""}<g class="plate plate-top${inCity ? ' in-city' : ''}" ${u.remembered?`data-memory-tile="${esc(u.tileId)}" data-tile="${esc(u.tileId)}"`:`data-unit="${esc(u.id)}"`} transform="${opts.unitsLod&&mapFiguresEnabled()&&!inCity&&!u.remembered?`translate(0 0)`:footprint?`translate(0 ${f(troopPlateY(formation.headTop))})`:label?`translate(${f(label.dx)} ${f(label.dy)}) scale(${label.scale})`:`translate(${inCity ? f(size * 1.3) : 0} ${f(inCity ? -size * 0.4 : -size * (sq ? 2.2 : art ? 1.55 : 1.05))})`}">
        ${opts.unitsLod&&!inCity&&!u.remembered ? lodUnitMarker(u,size) : opts.unitMarkers||u.remembered ? unitMarker(u) : `        <path class="pole" d="M0 14V${f(inCity ? size * 0.7 : size * (sq ? 1.15 : 1))}"/>
        ${/^F\d\d$/.test(u.factionId ?? '') ? `<g class="banner" transform="translate(-1 21)"><path class="cloth" d="M0 0H-17V22L-12.5 18L-8.5 22L-4.5 18L0 22Z"/><image href="/assets/ui-v3/emblems/${esc(u.factionId)}.png" x="-15" y="1" width="13" height="13"/></g>` : ''}
        ${u.tacticReady?`<g class="w-tactic-ready${u.tacticNew?' fresh':''}" transform="translate(29 5)"><rect x="-7" y="-8" width="16" height="17"/><text x="1" y="5">전</text></g>`:''}${u.active?'<g class="w-selected"><rect x="15" y="-24" width="28" height="14" rx="2"/><text x="29" y="-14">선택</text></g>':''}<g class="std" transform="scale(.82)"><g class="count k" transform="translate(0 27)"><path class="kplate" d="M-31 0L-25 -11.5H25L31 0L25 11.5H-25Z"/><text y="3.4">${troopLabel(u.count)}</text><rect class="bar-bg" x="-20" y="5.8" width="40" height="2.6"/><rect class="bar" x="-20" y="5.8" width="${f(40 * ratio)}" height="2.6"/></g>${u.ready ? '<path class="rglow" d="M-17.5 -20.5H17.5V11L0 21.5L-17.5 11Z"/>' : ''}<path class="frame" d="M-16 -19H16V10L0 19.5L-16 10Z"/>
        ${u.portrait ? faceImage(u.portrait, 'w-face-shield') : `<text class="initial" y="7">${esc(String(u.name ?? '').slice(0, 1))}</text>`}
        <g class="troop" transform="translate(-19 -19)"><rect x="-7" y="-7" width="14" height="14" transform="rotate(45)"/><text y="4">${TROOP_GLYPH[troopKey(u)] ?? '兵'}</text></g>
        ${badges.map((b, i) => `<g class="badge" transform="translate(22 ${-13 + i * 15})"><rect x="-7" y="-7" width="14" height="14"/><text y="4">${b}</text></g>`).join('')}
        </g><text class="uname" y="-23">${esc(u.name)}</text>`}
      </g>
      ${u.attack?.feel&&u.attack.charge?'<g class="feel-hooves" fill="#24251e"><ellipse cx="-16" cy="10" rx="3" ry="1.5"/><ellipse cx="-6" cy="14" rx="3" ry="1.5"/><ellipse cx="3" cy="9" rx="3" ry="1.5"/></g>':''}
      ${u.feelHit?feelInkMarkup({...u.feelHit,age:u.feelHit.elapsed}):''}
      ${lost&&(!u.feelHit||u.feelHit.elapsed<(globalThis.document?.documentElement?.dataset.ui==='kit'?900:320)) ? `<text class="dmg ink-damage${u.feelHit?' feel-damage':''}${u.heavyLoss?' heavy':''}"${u.feelHit?` data-feel-event="${esc(u.feelHit.eventId)}"`:''} style="--damage-size:${globalThis.document?.documentElement?.dataset.ui==='kit'?40:u.feelHit?(u.feelHit.counter?23:28):Math.min(34,19+lost/60)}px${u.feelHit?`;animation-delay:-${Math.max(0,u.feelHit.elapsed)}ms`:''}" y="${globalThis.document?.documentElement?.dataset.ui==='kit'?-48:f(-size * 2.6)}">${u.lossLabel ? esc(u.lossLabel) + ' ' : ''}−${troopLabel(lost)}${u.feelHit?.cause?`<tspan class="feel-cause" dx="5">${esc(u.feelHit.cause)}</tspan>`:''}</text>` : ''}
    </g>`;
  }
  svg += '<g class="w-fire-layer" pointer-events="none" aria-hidden="true"></g><g class="w-ink-fx" pointer-events="none" aria-hidden="true"></g>';
  // C159: existing bitmap effects on public map tiles; decorations never intercept clicks.
  for(const fx of model.fx??[]){if(!fx.to)continue;const a=C(fx.from??fx.to),z=C(fx.to),delay=Math.max(0,fx.elapsed??0),duration=fx.duration??1100;
   if(delay>=duration)continue;
   if(fx.kind==='feel-bow'){
    svg+=`<g class="feel-arrows" pointer-events="none" transform="translate(${f(a.x)} ${f(a.y+8)})">${Array.from({length:7},(_,i)=>`<path d="M-7 ${i*2-6}h7" style="--fly-x:${f(z.x-a.x)}px;--fly-y:${f(z.y-a.y)}px;animation-duration:${duration}ms;animation-delay:-${delay}ms"/>`).join('')}</g>`;continue;
   }
   const arrow=fx.kind==='volley',tactic=fx.kind==='tactic',x=arrow?(a.x+z.x)/2:z.x,y=arrow?(a.y+z.y)/2:z.y+8,angle=Math.atan2(z.y-a.y,z.x-a.x)*180/Math.PI;
   svg+=`<g class="w-map-fx ${esc(fx.kind)}" style="animation-duration:${duration}ms;animation-delay:-${delay}ms" transform="translate(${f(x)} ${f(y)})">`;
   if(tactic)svg+=`<ellipse class="tactic-ring" rx="29" ry="15"/><ellipse class="tactic-ring inner" rx="22" ry="10"/>`;
   else svg+=`<image href="/assets/ui-v3/units-ink/fx-${arrow?'arrow':'clash'}.png" x="${arrow?-28:-25}" y="${arrow?-4:-25}" width="${arrow?56:50}" height="${arrow?8:50}"${arrow?` transform="rotate(${f(angle)})"`:''}/>`;
   if(fx.label)svg+=`<text class="effect-label" y="-28">${esc(fx.label)}</text>`;
   svg+='</g>';
  }
  return svg + renderMapPreview({blocked:hl.blocked,blockedTextInBand:hl.blockedTextInBand},layout) + '</svg>';
}

// 부대 이동: 다시 그린 뒤 지난 자리에서 새 자리로 미끄러지게(Web Animations). 순간이동 거리(12칸 이상)는 건너뜀.
const lastPos = new Map();
export function animateUnits(root, {duration = 420} = {}) {
  const seen = new Set();
  for (const g of root?.querySelectorAll?.('g.w-unit[data-unit]') ?? []) {
    const id = g.dataset.unit, x = Number(g.dataset.x), y = Number(g.dataset.y), prev = lastPos.get(id);
    seen.add(id); lastPos.set(id, {x, y});
    if (g.hasAttribute('data-troop-anchor') || !prev || (prev.x === x && prev.y === y) || Math.hypot(prev.x - x, prev.y - y) > 600 || !g.animate) continue;
    g.animate([{transform: `translate(${prev.x}px, ${prev.y}px)`}, {transform: `translate(${x}px, ${y}px)`}], {duration, easing: 'cubic-bezier(.35,.1,.25,1)'});
  }
  for (const id of [...lastPos.keys()]) if (!seen.has(id)) lastPos.delete(id);
}

// Keep a partially visible nameplate readable while panning. Fully offscreen
// cities stay offscreen, and the city's map/camera anchor never moves.
export function cityLabelEdgeShift(box,port,padding=8){
 if(box.right<=port.left||box.left>=port.right||box.bottom<=port.top||box.top>=port.bottom)return 0;
 if(box.width>port.right-port.left-2*padding)return 0;
 return Math.max(port.left+padding-box.left,Math.min(0,port.right-padding-box.right));
}

// C281: screen-space layout, independent of zoom and the tilted map projection.
export function readableMapFont(font,verticalScale){
 return Math.max(font,12/Math.max(.001,verticalScale));
}
const c281Intersects=(a,b,gap=6)=>a.left<b.right+gap&&a.right>b.left-gap&&a.top<b.bottom+gap&&a.bottom>b.top-gap;
export function mapLabelPlacement(box,occupied,port){
 const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
 const candidates=[{x:0,y:0}];
 for(let row=1;row<=occupied.length+2;row++)for(const side of [0,-1,1])candidates.push({x:side*(box.width+8),y:-row*(box.height+8)});
 for(const p of candidates){
  p.x=clamp(box.left+p.x,port.left+8,port.right-box.width-8)-box.left;
  p.y=clamp(box.top+p.y,port.top+8,port.bottom-box.height-8)-box.top;
  const moved={left:box.left+p.x,right:box.right+p.x,top:box.top+p.y,bottom:box.bottom+p.y};
  if(!occupied.some(b=>c281Intersects(moved,b)))return {...p,box:moved};
 }
 return {x:0,y:0,box};
}
export function forecastPlacement(width,height,box,targets){
 const w=Math.min(box.width,width-16),h=Math.min(box.height,height-16);
 const points=[{left:(width-w)/2,top:height-h-16},{left:8,top:78},{left:width-w-8,top:78},{left:8,top:height-h-8},{left:width-w-8,top:height-h-8}];
 const cost=p=>targets.reduce((n,t)=>n+Math.max(0,Math.min(p.left+w,t.right+12)-Math.max(p.left,t.left-12))*Math.max(0,Math.min(p.top+h,t.bottom+12)-Math.max(p.top,t.top-12)),0);
 return points.map(p=>({...p,top:Math.max(8,Math.min(p.top,height-h-8))})).sort((a,b)=>cost(a)-cost(b))[0];
}
export function markerScreenMatrix292(m,x,y){
 const det=m.a*m.d-m.b*m.c;if(!Number.isFinite(det)||Math.abs(det)<1e-12)return null;
 return [m.d/det,-m.b/det,-m.c/det,m.a/det,x,y];
}
export function syncMapReadability(svg,port,dynamicOnly=false){
 if(!svg||!port||typeof getComputedStyle!=='function')return;
 const root=globalThis.document?.documentElement;
 if(root?.dataset.ui==='kit'){
  const markers=[...svg.querySelectorAll('[data-c292-marker]')];let project=null;
  if(markers.length){
   const box=svg.viewBox.baseVal,source=[{x:box.x,y:box.y},{x:box.x+box.width,y:box.y},{x:box.x+box.width,y:box.y+box.height},{x:box.x,y:box.y+box.height}],probes=svg.ownerDocument.createElementNS('http://www.w3.org/2000/svg','g');
   probes.setAttribute('opacity','0');probes.setAttribute('pointer-events','none');
   for(const point of source){const probe=svg.ownerDocument.createElementNS('http://www.w3.org/2000/svg','rect');for(const [key,value] of Object.entries({x:point.x-.005,y:point.y-.005,width:.01,height:.01}))probe.setAttribute(key,String(value));probes.append(probe);}svg.append(probes);
   const target=[...probes.children].map(n=>{const r=n.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};});probes.remove();project=screenProjection291(source,target);
  }
  for(const marker of markers){
   const x=Number(marker.dataset.x),y=Number(marker.dataset.y),eps=.01,p=project?.({x,y}),px=project?.({x:x+eps,y}),py=project?.({x,y:y+eps});
   const m=p&&px&&py?{a:(px.x-p.x)/eps,b:(px.y-p.y)/eps,c:(py.x-p.x)/eps,d:(py.y-p.y)/eps}:marker.parentElement.getScreenCTM(),matrix=m&&markerScreenMatrix292(m,x,y);if(!matrix)continue;
   const dx=Number(marker.dataset.dx),dy=Number(marker.dataset.dy),angle=marker.dataset.c292Marker==='arrow'?Math.atan2(m.b*dx+m.d*dy,m.a*dx+m.c*dy)*180/Math.PI:0;
   marker.setAttribute('transform',`matrix(${matrix.join(' ')}) rotate(${angle})`);
  }
 }
 if(root&&root.dataset.placeNames===undefined){try{root.dataset.placeNames=globalThis.localStorage?.getItem('sg.placeNames.v1')==='off'?'off':'on';}catch{root.dataset.placeNames='on';}}
 // The existing LOD still decides which text exists/is visible. Only raise its size.
 const readableTexts=[...svg.querySelectorAll(dynamicOnly?'.c462-w-targets text,.c462-interaction text:not(.c285-place-name text),.c292-target text,.w-side text,.w-route-blocked text,.c260-path-cost text,.c291-route-chip text,.c279-path-risk text':'text:not(.loss):not(.effect-label):not(.c285-place-name text):not(.c291-memory text)')];
 const visibleTexts=readableTexts.filter(text=>text.getClientRects().length&&getComputedStyle(text).visibility!=='hidden');
 for(const text of visibleTexts){
  if(text.dataset.c281Font===undefined)text.dataset.c281Font=text.style.getPropertyValue('font-size');
  text.style.removeProperty('font-size');
  if(text.dataset.c281Font)text.style.setProperty('font-size',text.dataset.c281Font,'important');
 }
 const fontWrites=visibleTexts.map(text=>({text,m:text.getScreenCTM(),font:parseFloat(getComputedStyle(text).fontSize)}));
 for(const {text,m,font} of fontWrites)if(m&&font>0)text.style.setProperty('font-size',`${readableMapFont(font,Math.hypot(m.c,m.d))}px`,'important');
 if(dynamicOnly){syncOverlays291(svg,port);syncScreenSurfaces291(svg,port);return;}
 const r=port.getBoundingClientRect(),bounds={left:Math.max(0,r.left),top:Math.max(0,r.top),right:Math.min(globalThis.innerWidth??r.right,r.right),bottom:Math.min(globalThis.innerHeight??r.bottom,r.bottom)},occupied=[];
 const labels=[...svg.querySelectorAll('.w-cityplate>.c153-label-art,.w-unit>.plate-top>.c153-label-art')];
 labels.sort((a,b)=>Number(!!b.closest('.w-unit.active'))-Number(!!a.closest('.w-unit.active')));
 for(const art of labels){
  if(art.querySelector('.c289-city,.c291-marker,.c291-memory'))continue;
  let content=art.querySelector(':scope>.c281-label-content');
  if(!content){content=art.ownerDocument.createElementNS('http://www.w3.org/2000/svg','g');content.classList.add('c281-label-content');while(art.firstChild)content.append(art.firstChild);art.append(content);}
  content.removeAttribute('transform');
  art.querySelector(':scope>.c281-label-line')?.remove();
  const box=content.getBoundingClientRect(),m=art.getScreenCTM();
  if(!m||!box.width||box.right<bounds.left||box.left>bounds.right||box.bottom<bounds.top||box.top>bounds.bottom)continue;
  const p=mapLabelPlacement(box,occupied,bounds);occupied.push(p.box);
  const det=m.a*m.d-m.b*m.c;if(!det||!p.x&&!p.y)continue;
  const x=(m.d*p.x-m.c*p.y)/det,y=(m.a*p.y-m.b*p.x)/det;
  content.setAttribute('transform',`translate(${x} ${y})`);
  const line=art.ownerDocument.createElementNS('http://www.w3.org/2000/svg','path');
  line.setAttribute('class','c281-label-line');line.setAttribute('d',`M0 0L${x} ${y}`);line.setAttribute('stroke','currentColor');line.setAttribute('stroke-width','1');line.setAttribute('pointer-events','none');art.prepend(line);
 }
 syncOverlays291(svg,port);
 syncCityLabels289(svg,port);
 syncOverlays291(svg,port);
 syncPlaceNames(svg,port);
 syncScreenSurfaces291(svg,port);
}
export function syncPlaceNames(svg,port){
 if(typeof svg?.querySelector==='function'&&!svg.querySelector('.c285-place-name,.c285-capital'))return;
 for(const crown of svg.querySelectorAll('.c285-capital')){
  if(crown.closest?.('.c289-city'))continue;
  const m=crown.parentElement?.getScreenCTM?.();if(!m)continue;
  const w=12/Math.hypot(m.a,m.b),h=12/Math.hypot(m.c,m.d);
  if(!Number.isFinite(w)||!Number.isFinite(h))continue;
  crown.setAttribute('width',String(w));crown.setAttribute('height',String(h));crown.setAttribute('x',String((18-w)/2));crown.setAttribute('y',String(-h-2));
 }
 const occupied=[...svg.querySelectorAll('.w-cityplate,.w-unit>.plate-top,.w-site,.w-supply,.w-side,.w-c186-facing,.c279-path-risk,.w-supply-warning,.c264-supply-warning')].filter(n=>typeof n.getBoundingClientRect==='function'&&getComputedStyle(n).display!=='none'&&getComputedStyle(n).visibility!=='hidden').map(n=>n.getBoundingClientRect()).filter(b=>b.width&&b.height);
 const far=svg.classList.contains('zoom-far'),scale=Number.parseFloat(svg.style.width)/Number(svg.viewBox?.baseVal?.width)||1;
 const placeGroups=[...svg.querySelectorAll('.c285-place-name')];
 for(const group of placeGroups)group.style.visibility='visible';
 const placeMatrices=placeGroups.map(group=>({group,m:group.getScreenCTM?.()}));
 const placed=[];
 for(const {group,m} of placeMatrices){
  const text=group.querySelector?.('text');if(!m||!text)continue;
  const det=m.a*m.d-m.b*m.c;if(!det)continue;
  // Cancel camera tilt and zoom locally; translation still follows the map.
  group.style.transformBox='view-box';
  const kit=globalThis.document?.documentElement?.dataset.ui==='kit';
  text.style.fontSize=`${group.dataset.kind==='faction'?20:group.dataset.kind==='province'?(kit?(far?18:16):34):14}px`;
  const angle=/rotate\(([^)]+)\)/.exec(text.getAttribute('transform')??'');
  text.setAttribute('transform',`matrix(${m.d/det} ${-m.b/det} ${-m.c/det} ${m.a/det} 0 0) rotate(${Number(angle?.[1])||0})`);
  group.style.opacity=String(kit?(group.dataset.kind==='faction'?(far&&svg.classList.contains('mode-faction')?.8:0):group.dataset.kind==='province'?(scale/2.1<1.5?.8:0):svg.dataset.terrainLens==='true'&&!far?.8:0):placeNameOpacity(group.dataset.kind,far,scale));
  if(kit)group.style.setProperty('--c291-place-opacity',group.style.opacity);
  placed.push(group);
 }
 const placeBoxes=placed.map(group=>({group,box:group.getBoundingClientRect()})),bounds=port.getBoundingClientRect();
 for(const {group,box} of placeBoxes){
  if(box.right<bounds.left||box.left>bounds.right||box.bottom<bounds.top||box.top>bounds.bottom||occupied.some(b=>c281Intersects(box,b,globalThis.document?.documentElement?.dataset.ui==='kit'?16:8)))group.style.visibility='hidden';
  else if(Number(group.style.opacity)>0)occupied.push(box);
 }
}
export function syncCityLabelEdges(map,port){
 if(!map||!port)return;
 const bounds=port.getBoundingClientRect();
 for(const label of map.querySelectorAll('.c269-city-label')){
  if(label.querySelector('.c289-city'))continue;
  const plate=label.closest('.w-cityplate'),matrix=plate.getScreenCTM();
  if(!matrix?.a)continue;
  const old=Number(label.dataset.edgeShift)||0;
  const box=label.getBoundingClientRect();
  const original={left:box.left-old*matrix.a,right:box.right-old*matrix.a,top:box.top,bottom:box.bottom,width:box.width};
  const shift=cityLabelEdgeShift(original,bounds)/matrix.a;
  if(shift!==old){label.setAttribute('transform',`translate(${shift} 0)`);label.dataset.edgeShift=String(shift);}
 }
 syncCityLabels289(map,port);
}

// C289: all sizes and displacements below are screen pixels. Public model only.
export function cityLabelStage289(z,previous){
 if(previous==='far'&&z<.83)return 'far';
 if(previous==='near'&&z>=1.42)return 'near';
 if(previous==='base'){if(z<.67)return 'far';if(z>=1.58)return 'near';return 'base';}
 return z<.75?'far':z>=1.5?'near':'base';
}
export function cityLabelInfo289(city,badge){
 const known=FACTION[city.factionId],neutral=city.neutral===true||city.factionId===null;
 const state=city.remembered?'기록':city.besieged?'포위 중':city.own&&badge?.idle?'생산 대기':null;
 return {width:Math.min(224,(city.capital?162:126)+Math.max(0,String(city.name??'').length-4)*20),
  glyph:known?.glyph??'',color:known?.color??(neutral?'#77786D':'#62655E'),owner:known?.name??(neutral?'중립':'소유 미확인'),
  seal:known?null:neutral?'neutral':'unknown',
  summary:state??(!city.remembered&&Number.isFinite(city.troops)?`수비 ${troopLabel(city.troops)}`:'수비 미상'),
  state,important:!!(city.own||city.besieged||city.capital)};
}
function cityLabel289(city,badge){
 const p=cityLabelInfo289(city,badge),root='/assets/ui-kit/own/map-v2/';
 const cityMark464='<svg class="c464-city-symbol" viewBox="0 0 20 24" aria-hidden="true"><path d="M3 22V9H1V6h4V3h3V0h4v3h3v3h4v3h-2v13h-5v-8H8v8ZM5 10v3h2v-3Zm8 0v3h2v-3Z"/></svg>';
 const sealMark=p.seal==='unknown'?'<span class="c289-seal-question" aria-hidden="true">?</span>':p.seal==='neutral'?'<svg class="c289-neutral-mark" viewBox="0 0 20 20" aria-hidden="true"><path d="M7 6h3v3H7zm4 3h3v3h-3zm-4 3h3v3H7z"/></svg>':city.capital?esc(p.glyph):cityMark464;
 const icon=(name,title,cls='')=>name==='capital'?`<svg class="c289-icon ${cls}" viewBox="0 0 20 20" role="img" aria-label="수도"><title>수도</title><path d="M2 2h2v2h12V2h2v3l2 2H0l2-2ZM3 9h14l2 9h-7v-4a2 2 0 0 0-4 0v4H1Z"/></svg>`:`<img class="c289-icon ${cls}" src="${root}${name}.webp" title="${title}" alt="${title}"/>`;
 const relation=['HOSTILE','ALLIED'].includes(city.relation)?`<img class="c289-relation" src="${symUrl('diplomacy',city.relation==='ALLIED'?'alliance':'hostile')}" title="${city.relation==='ALLIED'?'동맹':'적대'}" alt="${city.relation==='ALLIED'?'동맹':'적대'}"/>`:'';
 const status=city.remembered?`<img class="c289-status" src="${symUrl('global','records')}" title="기록" alt="기록"/>`:city.besieged?icon('siege','포위 중','c289-status'):city.own&&badge?.idle?`<img class="c289-status" src="${symUrl('actions','wait')}" title="생산 대기" alt="생산 대기"/>`:'';
 return `<g class="c289-city" data-important="${p.important}" data-capital="${!!city.capital}" data-warning="${!!city.besieged}" data-own="${!!city.own}" style="--c289-width:${p.width}px"><g class="c289-probes" opacity="0" pointer-events="none"><circle r=".01"/><circle cx="1" r=".01"/><circle cy="1" r=".01"/></g><path class="c289-leader"/><foreignObject class="c284-city-plate${city.besieged?' threatened':''}" x="${-p.width/2}" y="8" width="${p.width}" height="${city.capital?37:32}"><div xmlns="http://www.w3.org/1999/xhtml" class="c284-city-material" title="${esc(city.name)} · ${esc(p.summary)}"><div class="c289-row"><span class="c289-seal" style="background-color:${p.color}" title="${esc(p.owner)}">${sealMark}</span><b class="name">${esc(city.name)}</b>${city.capital?icon('capital','수도','c285-capital'):''}</div><div class="c289-subrow"><span class="c289-summary">${esc(p.summary)}</span><span class="c289-submarks">${relation}${status}</span></div></div></foreignObject><g class="c289-dot"><rect x="-6" y="8" width="12" height="12" fill="${p.color}"/><title>${esc(city.name)} · ${esc(p.owner)}</title></g></g>`;
}
const overlap289=(a,b)=>a.left<b.right+4&&a.right>b.left-4&&a.top<b.bottom+4&&a.bottom>b.top-4;
export function cityLabelPlacement289(box,occupied,port,important=false){
 const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
 const fits=b=>b.left>=port.left+8&&b.right<=port.right-8&&b.top>=port.top+8&&b.bottom<=port.bottom-8&&!occupied.some(o=>overlap289(b,o));
 const dx=clamp(Math.max(port.left+8-box.left,Math.min(0,port.right-8-box.right)),-48,48);
 // A single alternative anchor, then fold the secondary line, then the seal.
 const alternative=-Math.sqrt(48*48-dx*dx);
 for(const [y,fold] of [[0,false],[alternative,false],[alternative,true]]){
  const b={left:box.left+dx,right:box.right+dx,top:box.top+y,bottom:box.top+y+(fold?30:box.bottom-box.top)};
  if(fits(b))return {x:dx,y,fold,hidden:false,box:b};
 }
 return {x:dx,y:0,fold:true,hidden:!important,box:{...box,left:box.left+dx,right:box.right+dx,bottom:box.top+30}};
}
let cityLabelObserver289,cityLabelContext289;
export function cityLabelPriority362({selected,target,besieged,capital}){
 return Number(!!selected)*100+Number(!!target)*40+Number(!!besieged)*20+Number(!!capital)*10;
}
export function syncCityLabels289(map,port){
 const svg=map.matches?.('svg')?map:map.querySelector?.('svg');
 if(!svg||!svg.querySelector('.c289-city'))return;
 cityLabelContext289={map,port};
 if(!cityLabelObserver289&&globalThis.MutationObserver&&globalThis.document?.body){
  cityLabelObserver289=new MutationObserver(records=>{if(records.some(r=>r.target.id==='city-quick')){const c=cityLabelContext289;syncCityLabels289(c.map,c.port);}});
  cityLabelObserver289.observe(document.body,{subtree:true,attributes:true,attributeFilter:['hidden','data-city']});
 }
 // The existing camera starts at 2.1 (world.js START_ZOOM); recommendations
 // define that default view as z=1, rather than changing the camera itself.
 const baseline=new URLSearchParams(globalThis.location?.search??'').get('hud')==='old'?1.7:2.1;
 const z=(Number.parseFloat(svg.style.width)/Number(svg.viewBox?.baseVal?.width)||baseline)/baseline;
 const stage=cityLabelStage289(z,svg.dataset.c289Stage);svg.dataset.c289Stage=stage;
 const bounds=port.getBoundingClientRect(),occupied=[];
 for(const n of svg.querySelectorAll('.w-unit .plate-top,.w-order-end,.c243-path-end')){const r=n.getBoundingClientRect();if(r.width&&r.height)occupied.push(r);}
 for(const n of globalThis.document?.querySelectorAll('.c236-command-list,.c236-objectives,.nb-selected,.city-quick,.c248-lens-key,.w-mini')??[]){const r=n.getBoundingClientRect();if(r.width&&r.height&&getComputedStyle(n).visibility!=='hidden')occupied.push(r);}
 const quick=globalThis.document?.querySelector('#city-quick:not([hidden])')?.getAttribute('data-city');
 const labels=[...svg.querySelectorAll('.c289-city')];
 const priority=n=>{const p=n.closest('.w-cityplate');return cityLabelPriority362({selected:!!quick&&p?.dataset.city===quick||p?.classList.contains('selected'),target:p?.dataset.currentTarget==='true',besieged:n.dataset.warning==='true',capital:n.dataset.capital==='true'});};
 labels.sort((a,b)=>priority(b)-priority(a));
 for(const group of labels){
  group.removeAttribute('transform');
  const probes=[...group.querySelectorAll('.c289-probes circle')].map(n=>{const r=n.getBoundingClientRect();return {x:(r.left+r.right)/2,y:(r.top+r.bottom)/2};});
  if(probes.length!==3)continue;
  const [o,xp,yp]=probes,m={a:xp.x-o.x,b:xp.y-o.y,c:yp.x-o.x,d:yp.y-o.y};
  const det=m.a*m.d-m.b*m.c;if(!det)continue;
  const plate=group.closest('.w-cityplate'),selected=plate?.dataset.city===quick||plate?.classList.contains('selected');
  group.dataset.selected=String(!!selected);group.dataset.stage=stage;group.dataset.hidden='false';
  group.dataset.fold=String(stage==='far'||!(group.dataset.important==='true'||selected));
  // Invert the full affine projection, including tilt, without moving map anchors.
  let inverse=`matrix(${m.d/det} ${-m.b/det} ${-m.c/det} ${m.a/det} 0 0)`;
  group.setAttribute('transform',inverse);
  const fo=group.querySelector('foreignObject'),width=(stage==='far'?Math.min(148,Number.parseFloat(group.style.getPropertyValue('--c289-width'))-4*11):Number.parseFloat(group.style.getPropertyValue('--c289-width')))*(Number.isFinite(globalThis.innerWidth)?globalThis.innerWidth/1672:1);
  const plateHeight464=(group.dataset.capital==='true'?37:32)*(Number.isFinite(globalThis.innerHeight)?globalThis.innerHeight/941:1);
  fo.setAttribute('width',String(width));fo.setAttribute('x',String(-width/2));fo.setAttribute('height',String(plateHeight464));
  // getScreenCTM omits CSS perspective. Local probes remove skew; measuring the
  // resulting box also cancels the remaining perspective over the plate's area.
  const measured=fo.getBoundingClientRect(),height=Number(fo.getAttribute('height'));
  if(measured.width>0&&measured.height>0){inverse+=` scale(${width/measured.width} ${height/measured.height})`;group.setAttribute('transform',inverse);}
  const box=fo.getBoundingClientRect();
  if(box.right<bounds.left||box.left>bounds.right||box.bottom<bounds.top||box.top>bounds.bottom)continue;
  const p=cityLabelPlacement289(box,occupied,bounds,!!(selected||plate?.dataset.currentTarget==='true'||group.dataset.warning==='true'));
  if(p.fold){group.dataset.fold='true';fo.setAttribute('height',String(plateHeight464));}
  group.dataset.hidden=String(p.hidden);
  group.setAttribute('transform',`${inverse} translate(${p.x} ${p.y})`);
  if(!p.hidden&&(p.x||p.y||p.fold)){
   const r=fo.getBoundingClientRect(),h=Number(fo.getAttribute('height'));
   if(r.width&&r.height)group.setAttribute('transform',`${inverse} translate(${p.x} ${p.y}) scale(${width/r.width} ${h/r.height})`);
  }
  const line=group.querySelector('.c289-leader');line.setAttribute('d',p.x||p.y?`M${-p.x} ${-p.y}L0 8`:'');
  if(!p.hidden)occupied.push(p.box);
 }
}

// Screen-pixel counter sizes, independent of map zoom/tilt. No state changes.
export function syncOverlays291(svg,port){
 if(globalThis.document?.documentElement?.dataset.ui!=='kit')return;
 const z=(parseFloat(svg.style.width)/Number(svg.viewBox.baseVal.width)||2.1)/2.1;
 const stage=cityLabelStage289(z,svg.dataset.c291Stage),far=stage==='far';svg.dataset.c291Stage=stage;svg.classList.toggle('c291-far-map',far);
 const occupied=[...svg.querySelectorAll('.c289-city[data-selected="true"] foreignObject,.c289-city[data-warning="true"] foreignObject,.w-cityplate[data-current-target="true"] foreignObject')].map(n=>n.getBoundingClientRect()).filter(r=>r.width&&r.height),bounds=port.getBoundingClientRect(),clusters=[];
 const markers=[...svg.querySelectorAll('.c291-marker,.c291-memory')].sort((a,b)=>Number(b.dataset.priority==='true')-Number(a.dataset.priority==='true')||Number(!!b.querySelector('.selected'))-Number(!!a.querySelector('.selected')));
 const rows=markers.map(marker=>{const parent=marker.parentElement,important=marker.dataset.priority==='true'||!!marker.closest('.attack-target')||!!marker.querySelector('.selected');return {marker,parent,detail:unitMarkerDetail291({z,far,important}),badge:marker.querySelector('.c291-cluster')};});
 for(const {marker,parent,detail,badge} of rows){marker.style.display='';marker.classList.toggle('c291-strategic',detail.strategic);marker.classList.toggle('c291-far',detail.compact);if(badge)badge.textContent='';parent.querySelector(':scope>.c291-connector')?.remove();}
 const projected=rows.map(row=>({...row,probes:[...row.parent.querySelectorAll(':scope>.c291-probes circle')].map(n=>{const r=n.getBoundingClientRect();return {x:(r.left+r.right)/2,y:(r.top+r.bottom)/2};})}));
 const valid=[];
 for(const row of projected){const {marker,probes}=row;if(probes.length!==3)continue;const [o,x,y]=probes,m={a:x.x-o.x,b:x.y-o.y,c:y.x-o.x,d:y.y-o.y},det=m.a*m.d-m.b*m.c;if(!det)continue;const transform=`matrix(${m.d/det} ${-m.b/det} ${-m.c/det} ${m.a/det} 0 0)`;marker.setAttribute('transform',transform);valid.push({...row,m,det,transform});}
 const faces=valid.map(row=>({...row,r:row.marker.querySelector('.c291-face')?.getBoundingClientRect()}));
 for(const row of faces){const {marker,r,detail}=row;if(r?.width&&r.height)row.transform+=` scale(${detail.face/r.width} ${detail.face/r.height})`;marker.setAttribute('transform',row.transform);}
 const boxes=faces.map(row=>({...row,box:row.marker.querySelector('.c291-unit')?.getBoundingClientRect()??row.marker.getBoundingClientRect()}));
 for(const {marker,parent,detail,badge,box,m,det,transform} of boxes){
  if(detail.strategic&&!markers.some(n=>n.dataset.faction===marker.dataset.faction&&n.querySelector('.selected'))){const found=clusters.find(c=>c.faction===marker.dataset.faction&&Math.hypot(c.box.left-box.left,c.box.top-box.top)<32);if(found&&badge){marker.style.display='none';found.count++;found.node.querySelector('.c291-cluster').textContent=String(found.count);continue;}if(badge)clusters.push({node:marker,box,faction:marker.dataset.faction,count:1});}
  const shift=unitPlacement291(box,occupied,bounds);occupied.push(shift.box);
  if(shift.x||shift.y){marker.setAttribute('transform',transform+` translate(${shift.x} ${shift.y})`);const line=svg.ownerDocument.createElementNS('http://www.w3.org/2000/svg','path');line.setAttribute('class','c291-connector');line.setAttribute('d',`M0 0L${(m.d*shift.x-m.c*shift.y)/det} ${(m.a*shift.y-m.b*shift.x)/det}`);line.setAttribute('fill','none');line.setAttribute('stroke','#CAC5B8');line.setAttribute('stroke-width','1');line.setAttribute('vector-effect','non-scaling-stroke');line.setAttribute('pointer-events','none');parent.prepend(line);}
 }
 const sites=[...svg.querySelectorAll('.c291-site')].map(site=>({site,disc:site.querySelector('.c264-site-disc'),name:site.querySelector('.name')}));
 for(const {disc} of sites)disc.removeAttribute('transform');
 const siteWrites=sites.map(row=>({...row,b:row.disc.getBoundingClientRect(),m:row.site.getScreenCTM?.()}));
 for(const {disc,name,b,m} of siteWrites){
  if(!m||!b.width||!b.height)continue;const det=m.a*m.d-m.b*m.c;if(!det)continue;
  const transform=`matrix(${m.d/det} ${-m.b/det} ${-m.c/det} ${m.a/det} 0 0)`;disc.setAttribute('transform',transform);if(name)name.setAttribute('transform',transform);
 }
 for(const chip of svg.querySelectorAll('.c291-route-chip,.c291-route-warning')){
  const base=(chip.dataset.anchor??chip.getAttribute('transform').split(' scale(')[0]);chip.dataset.anchor=base;chip.setAttribute('transform',base);
  const warning=chip.classList.contains('c291-route-warning'),r=chip.querySelector(warning?'svg':'rect')?.getBoundingClientRect();if(r?.width&&r.height)chip.setAttribute('transform',base+` scale(${(warning?18:140)/r.width} ${(warning?18:28)/r.height})`);
 }
 // Route annotations yield to the target and the already placed public tags.
 const routeOccupied=[...svg.querySelectorAll('.c289-city foreignObject,.c291-marker,.c291-memory,.c243-path-end circle,.c292-target-corners')].map(n=>n.getBoundingClientRect()).filter(r=>r.width&&r.height);
 for(const chip of svg.querySelectorAll('.c291-route-warning,.c291-route-chip,.c279-path-risk')){
  const base=chip.dataset.c362Base??chip.getAttribute('transform');
  if(chip.classList.contains('c279-path-risk'))chip.dataset.c362Base=base;
  chip.setAttribute('transform',base);
  const box=chip.getBoundingClientRect();if(!box.width||!box.height||box.right<bounds.left||box.left>bounds.right||box.bottom<bounds.top||box.top>bounds.bottom)continue;
  const shift=routeLabelPlacement362(box,routeOccupied,bounds),m=chip.getScreenCTM?.(),det=m&&m.a*m.d-m.b*m.c;
  if(det&&(shift.x||shift.y))chip.setAttribute('transform',base+` translate(${(m.d*shift.x-m.c*shift.y)/det} ${(m.a*shift.y-m.b*shift.x)/det})`);
  routeOccupied.push(chip.getBoundingClientRect());
 }
 // Paths stay on the ground. Suppress only the crossing pixels under readable tags.
 let mask=svg.querySelector('#c291-route-mask');
 if(!mask){mask=svg.ownerDocument.createElementNS('http://www.w3.org/2000/svg','mask');mask.id='c291-route-mask';mask.setAttribute('maskUnits','userSpaceOnUse');svg.querySelector('defs').append(mask);}
  const m=svg.getScreenCTM?.(),det=m?m.a*m.d-m.b*m.c:0;
 if(det){
  const local=(x,y)=>({x:(m.d*(x-m.e)-m.c*(y-m.f))/det,y:(m.a*(y-m.f)-m.b*(x-m.e))/det});
  mask.innerHTML='<rect width="100%" height="100%" fill="white"/>'+[...svg.querySelectorAll('.c291-marker foreignObject,.c289-city')].map(n=>{const b=n.getBoundingClientRect(),pts=[[b.left-4,b.top-4],[b.right+4,b.top-4],[b.right+4,b.bottom+4],[b.left-4,b.bottom+4]].map(([x,y])=>local(x,y));return `<path fill="black" d="M${pts.map(p=>`${p.x} ${p.y}`).join('L')}Z"/>`;}).join('');
  for(const path of svg.querySelectorAll('.w-path,.w-order'))path.setAttribute('mask','url(#c291-route-mask)');
  svg.querySelector('.c291-route-arrows')?.remove();
  const route=svg.querySelector('.w-path'),scale=Math.hypot(m.a,m.b)||1;
  if(route?.getTotalLength){
   const arrow=svg.ownerDocument.createElementNS('http://www.w3.org/2000/svg','path'),length=route.getTotalLength(),pieces=[];
   for(let d=24/scale;d<length&&pieces.length<1000;d+=24/scale){const a=route.getPointAtLength(Math.max(0,d-1)),b=route.getPointAtLength(d),angle=Math.atan2(b.y-a.y,b.x-a.x),c=Math.cos(angle),s=Math.sin(angle),w=4/scale;pieces.push(`M${b.x-c*w+s*w} ${b.y-s*w-c*w}L${b.x} ${b.y}L${b.x-c*w-s*w} ${b.y-s*w+c*w}`);}
   arrow.setAttribute('class','c291-route-arrows');arrow.setAttribute('d',pieces.join(''));arrow.setAttribute('mask','url(#c291-route-mask)');route.after(arrow);
  }
 }
 for(const ring of svg.querySelectorAll('.c243-path-end circle')){
  ring.removeAttribute('transform');const r=ring.getBoundingClientRect(),x=ring.getAttribute('cx'),y=ring.getAttribute('cy');if(r.width&&r.height)ring.setAttribute('transform',`translate(${x} ${y}) scale(${24/r.width} ${24/r.height}) translate(${-Number(x)} ${-Number(y)})`);
 }
}
export function unitPlacement291(box,occupied,bounds){
 const points=[[0,0],[0,-48],[-48,0],[48,0],[0,48]];
 for(const [x,y] of points){const b={left:box.left+x,right:box.right+x,top:box.top+y,bottom:box.bottom+y};if(b.left<bounds.left||b.right>bounds.right||b.top<bounds.top||b.bottom>bounds.bottom)continue;if(!occupied.some(o=>c281Intersects(b,o,4)))return {x,y,box:b};}
 return {x:0,y:0,box};
}

export function routeLabelPlacement362(box,occupied,bounds){
 const w=box.right-box.left,h=box.bottom-box.top;
 const candidates=[[0,0]];
 for(const d of [24,48,72,96])candidates.push([0,-d],[0,d],[d,0],[-d,0],[d,-d],[-d,-d],[d,d],[-d,d]);
 for(const [dx,dy] of candidates){
  const left=Math.max(bounds.left+8,Math.min(bounds.right-8-w,box.left+dx)),top=Math.max(bounds.top+8,Math.min(bounds.bottom-8-h,box.top+dy));
  const b={left,right:left+w,top,bottom:top+h};
  if(!occupied.some(o=>overlap289(b,o)))return {x:left-box.left,y:top-box.top,box:b};
 }
 return {x:0,y:0,box};
}

// R2: project the public world masks into a screen SVG. Paint spacing and fog
// feather are then CSS pixels, including the map's CSS perspective and zoom.
export function screenProjection291(source,target){
 const rows=[];
 for(let i=0;i<4;i++){const {x,y}=source[i],u=target[i].x,v=target[i].y;
  rows.push([x,y,1,0,0,0,-u*x,-u*y,u],[0,0,0,x,y,1,-v*x,-v*y,v]);
 }
 for(let c=0;c<8;c++){
  let pivot=c;for(let r=c+1;r<8;r++)if(Math.abs(rows[r][c])>Math.abs(rows[pivot][c]))pivot=r;
  if(Math.abs(rows[pivot][c])<1e-10)return null;
  [rows[c],rows[pivot]]=[rows[pivot],rows[c]];const divisor=rows[c][c];
  for(let k=c;k<=8;k++)rows[c][k]/=divisor;
  for(let r=0;r<8;r++)if(r!==c){const gain=rows[r][c];for(let k=c;k<=8;k++)rows[r][k]-=gain*rows[c][k];}
 }
 const h=rows.map(r=>r[8]);
 return ({x,y})=>{const w=h[6]*x+h[7]*y+1;return {x:(h[0]*x+h[1]*y+h[2])/w,y:(h[3]*x+h[4]*y+h[5])/w};};
}
export function screenPath291(path,project){
 return path.replace(/([ML])(-?[\d.]+)[ ,](-?[\d.]+)/g,(_,op,x,y)=>{const p=project({x:Number(x),y:Number(y)});return `${op}${p.x.toFixed(3)} ${p.y.toFixed(3)}`;});
}
export function inkFogDefs291(id){
 // C351: existing opaque cloud artwork, tinted to v16 paper (sample median #B9A489).
 // Keep cloud contours, alpha and masks; no terrain or live-state data enters it.
 return `<defs><filter id="${id}-tone" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncR type="linear" slope=".14" intercept=".70"/><feFuncG type="linear" slope=".14" intercept=".64"/><feFuncB type="linear" slope=".14" intercept=".54"/></feComponentTransfer></filter><pattern id="${id}-cloud" width="720" height="720" patternUnits="userSpaceOnUse"><rect width="720" height="720" fill="#C4B59B"/><image href="/assets/ui-v3/hud/map-cloud-sea.jpg" width="720" height="720" filter="url(#${id}-tone)"/></pattern></defs>`;
}
export function screenSurfaceMarkup291({danger='',fog='',holes='',route='',bounds,width,height}){
 // A single union fill: overlapping threats never multiply alpha. The second
 // path is only the screen-anchored hatch. Fog's opaque world core stays intact.
 return `${inkFogDefs291('c291-screen-ink')}<defs><pattern id="c291-screen-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M4 0V8" stroke="#B64F45" stroke-width="1"/></pattern><filter id="c291-screen-feather" filterUnits="userSpaceOnUse" x="0" y="0" width="${width}" height="${height}" color-interpolation-filters="sRGB"><feMorphology operator="dilate" radius="8"/><feGaussianBlur stdDeviation="4"/></filter><clipPath id="c291-screen-port"><rect x="${bounds.left}" y="${bounds.top}" width="${Math.max(0,bounds.right-bounds.left)}" height="${Math.max(0,bounds.bottom-bounds.top)}"/></clipPath><mask id="c291-screen-labels" maskUnits="userSpaceOnUse" x="0" y="0" width="${width}" height="${height}"><rect width="${width}" height="${height}" fill="white"/>${holes}${route?`<path d="${route}" fill="none" stroke="black" stroke-width="10" stroke-linejoin="round"/>`:''}</mask></defs><g clip-path="url(#c291-screen-port)"><g mask="url(#c291-screen-labels)">${fog?`<mask id="c291-screen-fog-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="${width}" height="${height}"><path d="${fog}" fill="white" filter="url(#c291-screen-feather)"/></mask><rect class="c291-screen-fog" width="${width}" height="${height}" fill="url(#c291-screen-ink-cloud)" mask="url(#c291-screen-fog-mask)"/>`:''}${danger?`<g class="c291-screen-danger"><path class="c291-screen-fill" d="${danger}" fill="#B64F45" fill-opacity=".15"/><path d="${danger}" fill="url(#c291-screen-hatch)"/></g>`:''}</g></g>`;
}
export function syncScreenSurfaces291(svg,port){
 if(globalThis.document?.documentElement?.dataset.ui!=='kit')return;
 const doc=svg.ownerDocument,width=globalThis.innerWidth,height=globalThis.innerHeight;
 let screen=doc.querySelector('.c291-screen-surfaces');
 const danger=svg.classList.contains('c291-far-map')?'':svg.querySelector('.c291-danger-fill')?.getAttribute('d')??'',fog=svg.querySelector('#w-m-fog>path')?.getAttribute('d')??'';
 if(!danger&&!fog){screen?.remove();return;}
 const box=svg.viewBox.baseVal,W=box.width,H=box.height;
 let probes=svg.querySelector('.c291-screen-probes');
 const source=[{x:0,y:0},{x:W,y:0},{x:W,y:H},{x:0,y:H}];
 if(!probes){probes=doc.createElementNS('http://www.w3.org/2000/svg','g');probes.setAttribute('class','c291-screen-probes');probes.setAttribute('visibility','hidden');probes.setAttribute('pointer-events','none');probes.innerHTML=source.map(p=>`<circle cx="${p.x}" cy="${p.y}" r=".001"/>`).join('');svg.append(probes);}
 const target=[...probes.children].map(n=>{const r=n.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};}),project=screenProjection291(source,target);
 if(!project)return;
 if(!screen){screen=doc.createElementNS('http://www.w3.org/2000/svg','svg');screen.setAttribute('class','c291-screen-surfaces');screen.setAttribute('aria-hidden','true');doc.body.append(screen);}
 screen.setAttribute('viewBox',`0 0 ${width} ${height}`);
 const holes=[...svg.querySelectorAll('.w-unit,.w-cityplate,.w-site,.c291-route-chip,.c291-route-warning,.c279-path-risk')].map(n=>{const r=n.getBoundingClientRect();return r.width&&r.height?`<rect x="${r.left-3}" y="${r.top-3}" width="${r.width+6}" height="${r.height+6}" fill="black"/>`:'';}).join('');
 const route=[...svg.querySelectorAll('.w-path,.w-order')].map(n=>screenPath291(n.getAttribute('d')??'',project)).join('');
 screen.innerHTML=screenSurfaceMarkup291({danger:screenPath291(danger,project),fog:screenPath291(fog,project),holes,route,bounds:port.getBoundingClientRect(),width,height});
}
