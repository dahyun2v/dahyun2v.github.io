const FORMAT='sangoku-combat-calculator';
const VERSION=1;
const EPSILON=1e-9;

function invariant(condition,message){if(!condition)throw new Error(message);}
function id(value,label){invariant(typeof value==='string'&&/^[A-Za-z0-9._:-]+$/.test(value),`${label} must be a stable ID`);return value;}
function resultId(value,label){invariant(typeof value==='string'&&/^[A-Za-z0-9._:/-]+$/.test(value),`${label} must be a stable result ID`);return value;}
function uint(value,label){invariant(Number.isInteger(value)&&value>=0,`${label} must be a non-negative integer`);return value;}
function finite(value,label){invariant(Number.isFinite(value),`${label} must be finite`);return value;}
function nonnegative(value,label){finite(value,label);invariant(value>=0,`${label} must be non-negative`);return value;}
function bounded(value,min,max,label){finite(value,label);invariant(value>=min&&value<=max,`${label} must be in ${min}..${max}`);return value;}
function own(object,key){return Object.hasOwn(object,key);}
function clone(value){return structuredClone(value);}
function same(a,b){return JSON.stringify(a)===JSON.stringify(b);}
function clamp(value,min,max){return Math.max(min,Math.min(max,value));}
function clean(value){return Math.abs(value)<EPSILON?0:value;}
function abilityFactor(value){return 0.5+bounded(value,0,100,'abilityValue')/100;}

function normalizeUnit(input,index){
  invariant(input&&typeof input==='object',`unit ${index} is required`);
  const unitId=id(input.unitId,`unit ${index} unitId`);
  const maxPersonnel=uint(input.maxPersonnel,`maxPersonnel:${unitId}`);
  invariant(maxPersonnel>0,`maxPersonnel must be positive:${unitId}`);
  const activePersonnel=uint(input.activePersonnel,`activePersonnel:${unitId}`);
  const woundedPersonnel=uint(input.woundedPersonnel,`woundedPersonnel:${unitId}`);
  const deadPersonnel=uint(input.deadPersonnel,`deadPersonnel:${unitId}`);
  invariant(activePersonnel+woundedPersonnel+deadPersonnel<=maxPersonnel,`PERSONNEL_TOTAL_EXCEEDS_MAX:${unitId}`);
  const maxHp=nonnegative(input.maxHp,`maxHp:${unitId}`);
  invariant(maxHp===activePersonnel*2,`MAX_HP_ACTIVE_MISMATCH:${unitId}`);
  const currentHp=nonnegative(input.currentHp,`currentHp:${unitId}`);
  invariant(currentHp<=maxHp,`CURRENT_HP_EXCEEDS_MAX:${unitId}`);
  if(activePersonnel===0)invariant(currentHp===0,`ZERO_ACTIVE_REQUIRES_ZERO_HP:${unitId}`);
  const moraleMin=uint(input.moraleMin??0,`moraleMin:${unitId}`);
  const moraleMax=uint(input.moraleMax??100,`moraleMax:${unitId}`);
  invariant(moraleMin<moraleMax,`INVALID_MORALE_RANGE:${unitId}`);
  const morale=uint(input.morale,`morale:${unitId}`);
  invariant(morale>=moraleMin&&morale<=moraleMax,`MORALE_OUT_OF_RANGE:${unitId}`);
  const defenseCommand=bounded(input.defenseCommand??0,0,100,`defenseCommand:${unitId}`);
  const moraleRetention=bounded(input.moraleRetention??0,0,100,`moraleRetention:${unitId}`);
  const personnelLossRemainder=bounded(input.personnelLossRemainder??0,0,1-EPSILON,`personnelLossRemainder:${unitId}`);
  const woundedRemainder=bounded(input.woundedRemainder??0,0,1-EPSILON,`woundedRemainder:${unitId}`);
  invariant(typeof input.routePending==='boolean',`routePending must be boolean:${unitId}`);
  if(activePersonnel===0||currentHp===0)invariant(input.routePending===false,`INCAPACITATED_CANNOT_ROUTE:${unitId}`);
  else if(morale===moraleMin)invariant(input.routePending===true,`MORALE_MIN_REQUIRES_ROUTE_PENDING:${unitId}`);
  return {unitId,maxPersonnel,activePersonnel,woundedPersonnel,deadPersonnel,currentHp,maxHp,morale,moraleMin,moraleMax,defenseCommand,moraleRetention,personnelLossRemainder,woundedRemainder,routePending:input.routePending};
}

function normalizeUnits(inputs){
  invariant(Array.isArray(inputs)&&inputs.length>0,'units must be a non-empty array');
  const units={};
  for(let index=0;index<inputs.length;index++){
    const unit=normalizeUnit(inputs[index],index);
    invariant(!own(units,unit.unitId),`DUPLICATE_UNIT:${unit.unitId}`);
    units[unit.unitId]=unit;
  }
  return Object.fromEntries(Object.entries(units).sort(([a],[b])=>a.localeCompare(b)));
}

function assignResultIds(items){
  const byAction=new Map();
  for(const item of items){
    if(!byAction.has(item.actionInstanceId))byAction.set(item.actionInstanceId,[]);
    byAction.get(item.actionInstanceId).push(item);
  }
  const result=[];
  for(const actionInstanceId of [...byAction.keys()].sort()){
    const actionItems=byAction.get(actionInstanceId).sort((a,b)=>a.targetRef.localeCompare(b.targetRef));
    invariant(new Set(actionItems.map(item=>item.targetRef)).size===actionItems.length,`DUPLICATE_ACTION_TARGET:${actionInstanceId}`);
    const actors=new Set(actionItems.map(item=>item.actorRef));
    invariant(actors.size===1,`ACTION_ACTOR_MISMATCH:${actionInstanceId}`);
    for(let index=0;index<actionItems.length;index++)result.push({...actionItems[index],resultId:`${actionInstanceId}/${actionItems[index].targetRef}/${index}`});
  }
  return result;
}

function normalizeAttacks(inputs=[]){
  invariant(Array.isArray(inputs),'attacks must be an array');
  return assignResultIds(inputs.map((input,index)=>{
    invariant(input&&typeof input==='object',`attack ${index} is required`);
    return {
      kind:'ATTACK',
      actorRef:id(input.actorRef,`attack ${index} actorRef`),
      actionInstanceId:id(input.actionInstanceId,`attack ${index} actionInstanceId`),
      targetRef:id(input.targetRef,`attack ${index} targetRef`),
      coefficient:nonnegative(input.coefficient,`attack ${index} coefficient`),
      abilityValue:bounded(input.abilityValue,0,100,`attack ${index} abilityValue`),
      directProtectionRate:bounded(input.directProtectionRate??0,0,0.4,`attack ${index} directProtectionRate`),
    };
  })).sort((a,b)=>a.actionInstanceId.localeCompare(b.actionInstanceId)||a.resultId.localeCompare(b.resultId));
}

function normalizeSupports(inputs=[]){
  invariant(Array.isArray(inputs),'supports must be an array');
  return assignResultIds(inputs.map((input,index)=>{
    invariant(input&&typeof input==='object',`support ${index} is required`);
    return {
      kind:'SUPPORT',
      actorRef:id(input.actorRef,`support ${index} actorRef`),
      actionInstanceId:id(input.actionInstanceId,`support ${index} actionInstanceId`),
      targetRef:id(input.targetRef,`support ${index} targetRef`),
      hpHealCoefficient:nonnegative(input.hpHealCoefficient??0,`support ${index} hpHealCoefficient`),
      recoveryAbility:bounded(input.recoveryAbility??0,0,100,`support ${index} recoveryAbility`),
      woundedHealLimit:uint(input.woundedHealLimit??0,`support ${index} woundedHealLimit`),
      moraleBase:uint(input.moraleBase??0,`support ${index} moraleBase`),
      moraleRecoveryAbility:bounded(input.moraleRecoveryAbility??0,0,100,`support ${index} moraleRecoveryAbility`),
    };
  })).sort((a,b)=>a.actionInstanceId.localeCompare(b.actionInstanceId)||a.resultId.localeCompare(b.resultId));
}

function collectResultIds(attacks,supports){
  const actionKinds=new Map(),resultIds=new Set();
  for(const item of [...attacks,...supports]){
    invariant(!resultIds.has(item.resultId),`DUPLICATE_CALCULATOR_RESULT:${item.resultId}`);resultIds.add(item.resultId);
    if(actionKinds.has(item.actionInstanceId))invariant(actionKinds.get(item.actionInstanceId)===item.kind,`MIXED_ACTION_KIND:${item.actionInstanceId}`);
    else actionKinds.set(item.actionInstanceId,item.kind);
  }
  return resultIds;
}

function validateEligibility(state,attacks,supports){
  for(const item of [...attacks,...supports]){
    invariant(own(state.units,item.actorRef),`UNKNOWN_CALCULATOR_ACTOR:${item.actorRef}`);
    invariant(own(state.units,item.targetRef),`UNKNOWN_CALCULATOR_TARGET:${item.targetRef}`);
    const actor=state.units[item.actorRef],target=state.units[item.targetRef];
    invariant(actor.activePersonnel>0&&actor.currentHp>0,`CALCULATOR_ACTOR_INCAPACITATED:${item.actorRef}`);
    if(item.kind==='ATTACK')invariant(target.activePersonnel>0&&target.currentHp>0,`ATTACK_TARGET_INCAPACITATED:${item.targetRef}`);
  }
}

function distributeFloat(total,items,weightOf){
  const shares=new Map(items.map(item=>[item.resultId,0]));
  if(total===0||items.length===0)return shares;
  const weighted=items.filter(item=>weightOf(item)>0);
  const weightTotal=weighted.reduce((sum,item)=>sum+weightOf(item),0);
  if(weightTotal===0)return shares;
  let assigned=0;
  for(let index=0;index<weighted.length;index++){
    const item=weighted[index];
    const value=index===weighted.length-1?clean(total-assigned):clean(total*weightOf(item)/weightTotal);
    shares.set(item.resultId,value);assigned+=value;
  }
  return shares;
}

function apportionInteger(total,items,weightOf,capOf=()=>Infinity){
  uint(total,'apportion total');
  const values=new Map(items.map(item=>[item.resultId,0]));
  if(total===0||items.length===0)return values;
  const weightTotal=items.reduce((sum,item)=>sum+Math.max(0,weightOf(item)),0);
  invariant(weightTotal>0,'INTEGER_APPORTIONMENT_HAS_NO_WEIGHT');
  const ranked=[];
  let assigned=0;
  for(const item of items){
    const quota=total*Math.max(0,weightOf(item))/weightTotal;
    const base=Math.min(capOf(item),Math.floor(quota));
    values.set(item.resultId,base);assigned+=base;
    ranked.push({item,fraction:quota-Math.floor(quota)});
  }
  ranked.sort((a,b)=>b.fraction-a.fraction||a.item.resultId.localeCompare(b.item.resultId));
  while(assigned<total){
    let progressed=false;
    for(const {item} of ranked){
      if(values.get(item.resultId)<capOf(item)){values.set(item.resultId,values.get(item.resultId)+1);assigned++;progressed=true;if(assigned===total)break;}
    }
    invariant(progressed,'INTEGER_APPORTIONMENT_CAPACITY_MISMATCH');
  }
  return values;
}

function groupByTarget(items){
  const groups=new Map();
  for(const item of items){if(!groups.has(item.targetRef))groups.set(item.targetRef,[]);groups.get(item.targetRef).push(item);}
  return [...groups.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([targetRef,group])=>[targetRef,group.sort((a,b)=>a.resultId.localeCompare(b.resultId))]);
}

function outputForActions(records){
  const groups=new Map();
  for(const record of records.values()){
    if(!groups.has(record.actionInstanceId))groups.set(record.actionInstanceId,{actorRef:record.actorRef,kind:record.kind,records:[]});
    groups.get(record.actionInstanceId).records.push(record);
  }
  const resolverExecutions=[],coordinatorEntries=[];
  for(const actionInstanceId of [...groups.keys()].sort()){
    const group=groups.get(actionInstanceId),items=group.records.sort((a,b)=>a.resultId.localeCompare(b.resultId));
    resolverExecutions.push({actorRef:group.actorRef,actionInstanceId,results:items.map(item=>({targetRef:item.targetRef,effectValue:item.effectValue}))});
    coordinatorEntries.push({actorRef:group.actorRef,actionInstanceId,actorPostMergeState:'UNCHANGED',appliedResults:items.map(item=>({
      resultId:item.resultId,
      personnelDamage:item.personnelDamage,
      moraleDelta:item.moraleDelta,
      healedActive:item.healedActive,
      beneficialDelta:item.beneficialDelta,
      controlApplied:false,
      routePending:item.routePending,
    }))});
  }
  return {resolverExecutions,coordinatorEntries};
}

export function createCombatCalculatorState({battleId,units}={}){
  id(battleId,'battleId');
  return {schemaVersion:VERSION,battleId,units:normalizeUnits(units),processedTicks:{},processedResults:{},tickOrder:[]};
}

export function calculateCombatTick(state,{currentTick,attacks=[],supports=[]}={}){
  validateCombatCalculatorState(state);
  const tick=uint(currentTick,'currentTick');
  const normalizedAttacks=normalizeAttacks(attacks),normalizedSupports=normalizeSupports(supports);
  invariant(normalizedAttacks.length+normalizedSupports.length>0,'calculator tick requires at least one action result');
  const resultIds=collectResultIds(normalizedAttacks,normalizedSupports);
  const input={attacks:normalizedAttacks,supports:normalizedSupports};
  const fingerprint=JSON.stringify(input),tickKey=String(tick);
  if(own(state.processedTicks,tickKey)){
    invariant(state.processedTicks[tickKey].fingerprint===fingerprint,`CONFLICTING_CALCULATOR_TICK:${tick}`);
    return {state:clone(state),output:clone(state.processedTicks[tickKey].output)};
  }
  validateEligibility(state,normalizedAttacks,normalizedSupports);
  if(state.tickOrder.length)invariant(tick>Number(state.tickOrder[state.tickOrder.length-1]),`NON_MONOTONIC_CALCULATOR_TICK:${tick}`);
  for(const resultId of resultIds)invariant(!own(state.processedResults,resultId),`CALCULATOR_RESULT_ALREADY_PROCESSED:${resultId}`);

  const next=clone(state),snapshot=clone(state.units),records=new Map(),hpContributions=[];
  const initialWounded=Object.fromEntries(Object.entries(snapshot).map(([unitId,unit])=>[unitId,unit.woundedPersonnel]));
  for(const attack of normalizedAttacks)records.set(attack.resultId,{...attack,effectValue:0,personnelDamage:0,moraleDelta:0,healedActive:0,beneficialDelta:0,routePending:false,hpDamage:0,hpHealing:0,woundedGain:0,deadGain:0});
  for(const support of normalizedSupports)records.set(support.resultId,{...support,effectValue:0,personnelDamage:0,moraleDelta:0,healedActive:0,beneficialDelta:0,routePending:false,hpDamage:0,hpHealing:0,woundedGain:0,deadGain:0});

  for(const[targetRef,items]of groupByTarget(normalizedAttacks)){
    const targetBefore=snapshot[targetRef],target=next.units[targetRef];
    const rawById=new Map(items.map(item=>[item.resultId,snapshot[item.actorRef].activePersonnel*item.coefficient*abilityFactor(item.abilityValue)*100/(100+targetBefore.defenseCommand)*(1-item.directProtectionRate)]));
    const rawTotal=[...rawById.values()].reduce((sum,value)=>sum+value,0);
    const actualDamage=clean(Math.min(rawTotal,targetBefore.currentHp));
    const hpShares=distributeFloat(actualDamage,items,item=>rawById.get(item.resultId));
    for(const item of items){records.get(item.resultId).hpDamage=hpShares.get(item.resultId);hpContributions.push({resultId:item.resultId,targetRef,hpDamage:hpShares.get(item.resultId),hpHealing:0});}
    target.currentHp=clean(clamp(targetBefore.currentHp-actualDamage,0,targetBefore.maxHp));

    const lossPool=targetBefore.personnelLossRemainder+actualDamage*0.1;
    const requestedLoss=Math.floor(lossPool+EPSILON),actualLoss=Math.min(requestedLoss,targetBefore.activePersonnel);
    target.personnelLossRemainder=actualLoss<requestedLoss?0:clean(lossPool-requestedLoss);
    const woundedPool=targetBefore.woundedRemainder+actualLoss*0.7;
    const woundedGain=Math.min(actualLoss,Math.floor(woundedPool+EPSILON)),deadGain=actualLoss-woundedGain;
    target.woundedRemainder=clean(woundedPool-woundedGain);
    const lossShares=apportionInteger(actualLoss,items,item=>hpShares.get(item.resultId));
    const woundShares=apportionInteger(woundedGain,items,item=>lossShares.get(item.resultId),item=>lossShares.get(item.resultId));
    for(const item of items){
      const record=records.get(item.resultId),loss=lossShares.get(item.resultId),wounded=woundShares.get(item.resultId);
      record.personnelDamage=loss;record.woundedGain=wounded;record.deadGain=loss-wounded;record.effectValue=loss;
    }
    target.activePersonnel-=actualLoss;target.woundedPersonnel+=woundedGain;target.deadPersonnel+=deadGain;
    target.maxHp=target.activePersonnel*2;target.currentHp=clean(Math.min(target.currentHp,target.maxHp));
    if(target.activePersonnel===0)target.currentHp=0;

    const rawMorale=targetBefore.maxHp>0?30*actualDamage/targetBefore.maxHp*100/(100+targetBefore.moraleRetention):0;
    const moraleLoss=Math.min(targetBefore.morale-targetBefore.moraleMin,Math.ceil(rawMorale-EPSILON));
    const moraleShares=apportionInteger(moraleLoss,items,item=>hpShares.get(item.resultId));
    for(const item of items)records.get(item.resultId).moraleDelta=-moraleShares.get(item.resultId);
    target.morale-=moraleLoss;
  }

  for(const[targetRef,items]of groupByTarget(normalizedSupports)){
    const target=next.units[targetRef];
    if(target.activePersonnel===0||target.currentHp===0)continue;
    const woundedRequests=new Map(items.map(item=>[item.resultId,item.woundedHealLimit]));
    const woundedTotal=Math.min(initialWounded[targetRef],target.woundedPersonnel,items.reduce((sum,item)=>sum+item.woundedHealLimit,0));
    const woundedShares=woundedTotal?apportionInteger(woundedTotal,items,item=>woundedRequests.get(item.resultId),item=>item.woundedHealLimit):new Map(items.map(item=>[item.resultId,0]));
    for(const item of items){const healed=woundedShares.get(item.resultId);records.get(item.resultId).healedActive=healed;}
    target.woundedPersonnel-=woundedTotal;target.activePersonnel+=woundedTotal;target.maxHp=target.activePersonnel*2;

    const rawHealById=new Map(items.map(item=>[item.resultId,snapshot[item.actorRef].activePersonnel*item.hpHealCoefficient*abilityFactor(item.recoveryAbility)]));
    const rawHealTotal=[...rawHealById.values()].reduce((sum,value)=>sum+value,0);
    const actualHpHealing=clean(Math.min(rawHealTotal,target.maxHp-target.currentHp));
    const hpHealShares=distributeFloat(actualHpHealing,items,item=>rawHealById.get(item.resultId));
    target.currentHp=clean(target.currentHp+actualHpHealing);

    const rawMoraleById=new Map(items.map(item=>[item.resultId,item.moraleBase*abilityFactor(item.moraleRecoveryAbility)]));
    const moraleRequest=Math.floor([...rawMoraleById.values()].reduce((sum,value)=>sum+value,0)+EPSILON);
    const moraleRecovery=Math.min(target.moraleMax-target.morale,moraleRequest);
    const moraleShares=moraleRecovery?apportionInteger(moraleRecovery,items,item=>rawMoraleById.get(item.resultId)):new Map(items.map(item=>[item.resultId,0]));
    target.morale+=moraleRecovery;
    for(const item of items){
      const record=records.get(item.resultId),hpHealing=hpHealShares.get(item.resultId),morale=moraleShares.get(item.resultId);
      record.hpHealing=hpHealing;record.moraleDelta=morale;
      record.beneficialDelta=record.healedActive+Math.ceil(hpHealing-EPSILON)+morale;
      record.effectValue=record.beneficialDelta;
      hpContributions.push({resultId:item.resultId,targetRef,hpDamage:0,hpHealing});
    }
  }

  for(const unit of Object.values(next.units)){
    if(unit.activePersonnel===0||unit.currentHp===0){unit.routePending=false;continue;}
    if(snapshot[unit.unitId].routePending){unit.routePending=true;continue;}
    if(unit.morale===unit.moraleMin){
      const cause=[...records.values()].filter(record=>record.kind==='ATTACK'&&record.targetRef===unit.unitId&&record.moraleDelta<0).sort((a,b)=>a.resultId.localeCompare(b.resultId))[0];
      invariant(cause,`ROUTE_CAUSE_RESULT_MISSING:${unit.unitId}`);cause.routePending=true;unit.routePending=true;
    }else unit.routePending=false;
  }

  const {resolverExecutions,coordinatorEntries}=outputForActions(records);
  hpContributions.sort((a,b)=>a.resultId.localeCompare(b.resultId));
  const hpContributionByResult=new Map(hpContributions.map(item=>[item.resultId,item]));
  const casualtyAllocations=[...records.values()].sort((a,b)=>a.resultId.localeCompare(b.resultId)).map(record=>({
    resultId:record.resultId,
    woundedGain:record.woundedGain,
    deadGain:record.deadGain,
    hpTracked:true,
    hpDamage:hpContributionByResult.get(record.resultId)?.hpDamage??0,
    hpHealing:hpContributionByResult.get(record.resultId)?.hpHealing??0,
    targetRef:record.targetRef,
    beforeCurrentHp:snapshot[record.targetRef].currentHp,
    beforeMaxHp:snapshot[record.targetRef].maxHp,
    afterCurrentHp:next.units[record.targetRef].currentHp,
    afterMaxHp:next.units[record.targetRef].maxHp,
  }));
  const projectionUnitIds=[...new Set([...normalizedAttacks,...normalizedSupports].map(item=>item.targetRef))].sort();
  const hpProjection={
    battleId:state.battleId,
    currentTick:tick,
    units:projectionUnitIds.map(unitId=>({unitId,beforeCurrentHp:snapshot[unitId].currentHp,beforeMaxHp:snapshot[unitId].maxHp,afterCurrentHp:next.units[unitId].currentHp,afterMaxHp:next.units[unitId].maxHp})),
  };
  const output={currentTick:tick,resolverExecutions,coordinatorEntries,casualtyAllocations,hpContributions,hpProjection};
  next.processedTicks[tickKey]={currentTick:tick,input,fingerprint,output,outputFingerprint:JSON.stringify(output),resultIds:[...resultIds].sort()};
  for(const resultId of resultIds)next.processedResults[resultId]={tickKey,inputFingerprint:fingerprint};
  next.tickOrder.push(tickKey);
  validateCombatCalculatorState(next);
  return {state:next,output:clone(output)};
}

export function getCombatCalculatorUnit(state,unitId){
  validateCombatCalculatorState(state);
  const unit=state.units[id(unitId,'unitId')];return unit?clone(unit):null;
}

export function serializeCombatCalculatorState(state){validateCombatCalculatorState(state);return JSON.stringify({format:FORMAT,version:VERSION,state});}

export function deserializeCombatCalculatorState(serialized){
  invariant(typeof serialized==='string','serialized calculator state must be a string');
  let payload;try{payload=JSON.parse(serialized);}catch{throw new Error('INVALID_COMBAT_CALCULATOR_JSON');}
  invariant(payload?.format===FORMAT,'INVALID_COMBAT_CALCULATOR_FORMAT');invariant(payload.version===VERSION,'UNSUPPORTED_COMBAT_CALCULATOR_VERSION');
  validateCombatCalculatorState(payload.state);return clone(payload.state);
}

export function validateCombatCalculatorState(state){
  invariant(state&&typeof state==='object','combat calculator state is required');
  invariant(state.schemaVersion===VERSION,'UNSUPPORTED_COMBAT_CALCULATOR_STATE_VERSION');id(state.battleId,'battleId');
  invariant(state.units&&typeof state.units==='object','calculator units are required');
  invariant(same(state.units,normalizeUnits(Object.values(state.units))),'NON_CANONICAL_CALCULATOR_UNITS');
  invariant(state.processedTicks&&typeof state.processedTicks==='object','processedTicks are required');
  invariant(state.processedResults&&typeof state.processedResults==='object','processedResults are required');
  invariant(Array.isArray(state.tickOrder)&&new Set(state.tickOrder).size===state.tickOrder.length,'invalid tickOrder');
  const claimed=new Set();let previous=-1;
  for(const tickKey of state.tickOrder){
    const record=state.processedTicks[tickKey];
    invariant(record&&tickKey===String(uint(record.currentTick,'processed currentTick')),`PROCESSED_TICK_KEY_MISMATCH:${tickKey}`);
    invariant(record.currentTick>previous,'NON_MONOTONIC_CALCULATOR_TICK_ORDER');previous=record.currentTick;
    invariant(record.fingerprint===JSON.stringify(record.input),`CALCULATOR_INPUT_FINGERPRINT_MISMATCH:${tickKey}`);
    invariant(record.outputFingerprint===JSON.stringify(record.output),`CALCULATOR_OUTPUT_FINGERPRINT_MISMATCH:${tickKey}`);
    const canonicalInput={attacks:normalizeAttacks(record.input?.attacks),supports:normalizeSupports(record.input?.supports)};
    invariant(same(record.input,canonicalInput),`NON_CANONICAL_CALCULATOR_INPUT:${tickKey}`);
    invariant(record.output?.currentTick===record.currentTick,`CALCULATOR_OUTPUT_TICK_MISMATCH:${tickKey}`);
    invariant(Array.isArray(record.resultIds)&&new Set(record.resultIds).size===record.resultIds.length,`INVALID_CALCULATOR_RESULT_IDS:${tickKey}`);
    const expectedResultIds=[...canonicalInput.attacks,...canonicalInput.supports].map(item=>item.resultId).sort();
    invariant(same(record.resultIds,expectedResultIds),`CALCULATOR_RESULT_IDS_MISMATCH:${tickKey}`);
    for(const resultId of record.resultIds){
      invariant(!claimed.has(resultId),`CALCULATOR_RESULT_CLAIMED_TWICE:${resultId}`);claimed.add(resultId);
      invariant(state.processedResults[resultId]?.tickKey===tickKey&&state.processedResults[resultId].inputFingerprint===record.fingerprint,`CALCULATOR_RESULT_LEDGER_MISMATCH:${resultId}`);
    }
  }
  invariant(Object.keys(state.processedTicks).length===state.tickOrder.length,'UNORDERED_CALCULATOR_TICK');
  for(const storedResultId of Object.keys(state.processedResults)){resultId(storedResultId,'processed resultId');invariant(claimed.has(storedResultId),`ORPHAN_CALCULATOR_RESULT:${storedResultId}`);}
  return true;
}

export const COMBAT_CALCULATOR_FORMAT=FORMAT;
export const COMBAT_CALCULATOR_VERSION=VERSION;
