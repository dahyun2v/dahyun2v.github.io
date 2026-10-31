import {createSettlementAudio} from '/src/settlement-audio.mjs';
import {uiButton,resourceStrip,preserveUiFocus,loadDisplayArt,facilityArtGallery} from '/src/shared-ui.mjs';
import {createDomestic,domesticCommand,serializeDomestic,deserializeDomestic,slotKey,eligibility,JOBS} from '/src/domestic-trial.mjs';
const q=s=>document.querySelector(s),esc=v=>String(v??'없음').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let inputs,contract,state=null,selected=null,epoch=0,sequence=0,busy=false;
const nonce=globalThis.crypto?.randomUUID?.()??`${Date.now()}-${Math.random().toString(36).slice(2)}`;
const displayArt=loadDisplayArt(()=>render());
const settlementAudio=createSettlementAudio();
function notify(t){q('#notice').textContent=t;}
const errors={STALE_INPUT:'화면이 변경됐습니다. 현재 현황에서 다시 선택하세요.',INSUFFICIENT_FOOD:'예약할 식량이 부족합니다.',OFFICER_ABSENT:'이 도시에 없는 장수입니다.',FOREIGN_OFFICER:'다른 세력 장수는 배치할 수 없습니다.',OFFICER_UNAVAILABLE:'현재 업무를 맡을 수 없는 장수입니다.',DUPLICATE_ASSIGNMENT:'이미 같은 업무를 맡고 있습니다.',SETTLEMENT_APPROVAL_REQUIRED:'정산 시험값 승인을 기다리고 있습니다.',TRIAL_COMMAND_LIMIT:'시험 명령 300회 한도입니다. 현재 시험을 저장하세요.'};
function act(fn){if(busy)return;try{fn();}catch(e){notify(errors[e.message]??`처리하지 못했습니다: ${e.message}`);}render();}
function command(kind,fields={},captured=epoch,revision=state?.revision){
 if(captured!==epoch||busy||!state){notify('화면이 변경됐습니다. 다시 선택하세요.');return;}
 act(()=>{if(kind==='TURN')settlementAudio.unlock();const before=state;const cmd={id:`${nonce}:${++sequence}`,expectedRevision:revision,kind,cityId:null,officerId:null,job:null,amount:null,...fields};state=domesticCommand(state,cmd,inputs,contract);if(kind==='TURN'&&state!==before)settlementAudio.play(cmd.id);notify(kind==='TURN'?'10일 정산을 완료했습니다. 아래 장부에서 근거를 확인하세요.':'업무 계획을 변경했습니다. 시험 저장으로 보관하세요.');});
}
function render(){
 q('#new').disabled=!inputs||busy;q('#load').disabled=!inputs||busy;q('#save').disabled=!state||busy;q('#turn').disabled=!state||busy||contract?.status!=='APPROVED_TRIAL';
 if(!state){q('#view').textContent='세력을 선택해 새 시험을 시작하거나 독립 시험 저장을 재개하세요.';return;}
 if(!state.cities[selected])selected=Object.keys(state.cities)[0];const city=state.cities[selected],rev=state.revision,stamp=epoch;
 const officers=Object.values(inputs.initialData.world.officers).filter(o=>!eligibility(inputs,state,selected,o.officerId));
 const report=state.reports.at(-1)?.cities.find(c=>c.cityId===selected);
 const restoreFocus=preserveUiFocus(q('#view'));
 q('#view').innerHTML=`<p>${esc(inputs.initialData.world.factions[state.faction].name)} · ${state.turn}턴 계획 · 경과 ${(state.turn-1)*10}일</p><div class="grid"><aside class="cities ui-panel"><h2>아군 도시</h2>${Object.values(state.cities).map(c=>`${uiButton({cityId:c.cityId,selected:selected===c.cityId,label:c.name+' · 식량 '+c.food+' · 인구 '+c.population})}`).join('')}</aside><section class="ui-panel"><h2>${esc(city.name)}</h2>${resourceStrip([{label:'인구',icon:'population',value:city.population},{label:'식량 재고',icon:'food',value:city.food},{label:'관리 예약',icon:'reserved',value:city.reserved}])}<p>현재 업무: ${city.task?`${esc(inputs.initialData.world.officers[city.task.officerId].name)} · ${esc(JOBS[city.task.job])}`:'배치 없음'}</p><p class="muted">현지·아군·정상 상태 장수만 선택할 수 있습니다. 야전 지휘 장수를 순간 이동시키지 않습니다. 업무는 관리 책임 기록이며 생산 보너스를 만들지 않습니다.</p><label>현지 장수 <select id="officer">${officers.map(o=>`<option value="${o.officerId}">${esc(o.name)}</option>`).join('')}</select></label><label>업무 <select id="job"><option value="FOOD">식량 관리</option><option value="CIVIL">민생 현황</option></select></label><div class="controls">${uiButton({id:'assign',label:'업무 배치 / 변경',disabled:!officers.length})}${uiButton({id:'cancel',label:'업무 취소',disabled:!city.task})}</div><label>다음 정산에 보존할 식량 <input id="reserve" type="number" min="0" step="1" max="${city.food}" value="${city.reserved}"></label>${uiButton({id:'reserve-apply',label:'예약 변경',disabled:city.task?.job!=='FOOD'})}<p class="muted">예약은 재고를 복제하지 않습니다. 소비 가능한 재고에서 제외되므로 과도한 예약은 소비 부족을 일으킬 수 있습니다. 부족은 장부에 남기며 미승인 인구 피해를 적용하지 않습니다.</p>${facilityArtGallery(displayArt)}<h3>최근 정산 근거</h3>${report?`<div class="scroll"><table><tr><th>기초</th><th>생산</th><th>필요 소비</th><th>실제 소비</th><th>부족</th><th>기말</th></tr><tr><td>${report.before}</td><td>+${report.produced}</td><td>${report.required}</td><td>−${report.consumed}</td><td>${report.shortage}</td><td>${report.after}</td></tr></table></div><p class="muted">기초 + 생산 − 실제 소비 = 기말. 예약 ${report.reserved}, 인구 변화 없음. 관리 담당 ${esc(report.officerId)} / ${esc(JOBS[report.job])}.</p>`:'아직 정산하지 않았습니다.'}</section></div>`;
 q('#view').querySelectorAll('[data-city]').forEach(n=>n.addEventListener('click',()=>{if(stamp!==epoch)return;selected=n.dataset.city;render();}));
 q('#assign').addEventListener('click',()=>command('ASSIGN',{cityId:selected,officerId:q('#officer').value,job:q('#job').value},stamp,rev));
 q('#cancel').addEventListener('click',()=>command('CANCEL',{cityId:selected},stamp,rev));
 q('#reserve-apply').addEventListener('click',()=>command('RESERVE',{cityId:selected,amount:q('#reserve').value.trim()===''?NaN:Number(q('#reserve').value)},stamp,rev));
 restoreFocus();
}
q('#new').addEventListener('click',()=>act(()=>{state=createDomestic(inputs,q('#faction').value);epoch++;selected=null;notify('독립 시험을 시작했습니다. 기존 저장은 그대로입니다.');}));
q('#load').addEventListener('click',()=>act(()=>{const f=q('#faction').value;const loaded=deserializeDomestic(globalThis.localStorage.getItem(slotKey(f)),inputs,contract,f);state=loaded;epoch++;selected=null;notify('독립 시험 저장을 재개했습니다.');}));
q('#save').addEventListener('click',()=>act(()=>{if(!state)return;globalThis.localStorage.setItem(slotKey(state.faction),serializeDomestic(state,inputs,contract));notify('현재 세력의 독립 시험 슬롯에 저장했습니다. I1/I2 저장은 그대로입니다.');}));
q('#turn').addEventListener('click',()=>{if(!state||busy)return;const rev=state.revision;command('TURN',{},epoch,rev);busy=true;q('#turn').disabled=true;globalThis.setTimeout(()=>{busy=false;render();},350);});
q('#faction').addEventListener('change',()=>{notify('세력 선택은 새 시험 시작/재개 시 적용됩니다. 현재 시험은 유지됩니다.');});
Promise.all(['/data/first3.json','/data/domestic-trial-contract.json'].map(async u=>{const r=await fetch(u);if(!r.ok)throw Error('HTTP '+r.status);return r.json();})).then(([initialData,c])=>{inputs={initialData};contract=c;q('#contract-status').textContent=c.status==='APPROVED_TRIAL'?'시험 정산: 10일 · 도시 기본 식량 4 · 인구당 소비 2. 기존 시험값이며 최종 경제 밸런스가 아닙니다.':'도시 선택·업무 배치·예약·독립 저장은 사용 가능합니다. 턴 정산은 기존 식량 시험값 승인 대기입니다.';render();}).catch(e=>{notify('초기 자료를 불러오지 못했습니다: '+e.message);});
render();
