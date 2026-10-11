const $=selector=>document.querySelector(selector);
const saveKey='sangoku-g24-pilot-token-v1';
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
let token=null,step='NONE',busy=false;
function updateButtons(){
  for(const action of ['start','load'])$(`#${action}`).disabled=busy;
  $('#charge').disabled=busy||step!=='START';$('#advance').disabled=busy||step!=='CHARGED';$('#save').disabled=busy||step==='NONE';
}
async function request(action,requestToken=token){
  const result=await fetch('/api/g24-pilot',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action,token:requestToken})});
  const body=await result.json();if(!result.ok)throw new Error(body.error??'요청 실패');return body;
}
function draw(data){
  token=data.token;
  const troopLabel={cavalry:'기병'}[data.unit.troopType]??data.unit.troopType;
  const statusLabel={READY:'대기'}[data.unit.status]??data.unit.status;
  $('#summary').textContent=`${data.unit.name} · ${troopLabel} · ${data.unit.tileId} · tick ${data.tick} · ${statusLabel}`;
  $('#identity').textContent=data.identityLine;
  $('#major').textContent=`시험 능력: 무용 ${data.majorAbilities['무용']} · 지휘 ${data.majorAbilities['지휘']} · 지략 ${data.majorAbilities['지략']} (전투 계산은 기존 5/20)`;
  $('#growth').textContent=`성장 장부: Lv.${data.growth.level}, XP ${data.growth.xp}/${data.growth.xpToNext}, 고유특기 Rank ${data.growth.coreRank} (효과 꺼짐)`;
  const outcomeLabel={SUCCEEDED:'성공',FAILED:'실패',CANCELLED:'취소'}[data.combat.chargeOutcome]??data.combat.chargeOutcome;
  $('#combat').textContent=data.combat.chargeOutcome===null?'공개 전투 결과: 대기 중':`공개 전투 결과: ${outcomeLabel} · 기력 ${data.combat.stamina} · 재사용 가능 tick ${data.combat.chargeNextAvailableTick}`;
  $('#abilities').innerHTML=`<ul>${data.abilities.map(item=>`<li>${escapeHtml(item.name)}: ${item.value===null?'미확인':escapeHtml(item.value)}</li>`).join('')}</ul>`;
  updateButtons();
}
async function act(action){
  if(busy)return;
  busy=true;updateButtons();
  try{
    const requestToken=action==='load'?localStorage.getItem(saveKey):token;
    if(action==='load'&&!requestToken)throw new Error('저장된 장료 파일럿이 없습니다.');
    const data=await request(action,requestToken);
    if(action==='start')step='START';if(action==='charge')step='CHARGED';if(action==='advance')step='ADVANCED';
    if(action==='load')step=data.growth.trainingCompletions>0?'TRAINED':data.chargePending?'CHARGED':data.tick>=4?'ADVANCED':'START';
    if(action==='save')localStorage.setItem(saveKey,token);
    draw(data);
    $('#notice').textContent=action==='save'?'비공개 저장 완료':action==='load'?'저장 복원 완료':action==='advance'?'전투 결과까지 4틱 진행 완료':action==='charge'?'공통 돌격 명령 예약 완료':'시험 시작 완료';
  }catch(error){$('#notice').textContent=error.message;}
  finally{busy=false;updateButtons();}
}
for(const action of ['start','charge','advance','save','load'])$(`#${action}`).addEventListener('click',()=>act(action));
