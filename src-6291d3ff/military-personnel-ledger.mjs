// 32 §§1,9,10,13: explicit battle-loss classification, recovery, located stocks,
// transport departure/arrival, and shared-capacity consumption. Independent
// canonical boundary; do not keep a second writable copy in the legacy world.
// Food/time/safety, qualified special support, path/ETA/load and authorization
// are caller-owned verified inputs. No recovery rate or casualty split formula.
import {validateBattleEndSnapshot} from './combat-battle-result.mjs';
import {validateTransportCapacity,consumeTransportReservation} from './military-capacity.mjs';
import {invariant,jsonData,shape,unique,id,amount,clone,canonical,equal,truth,checkedAdd,commandReceipt} from './contract-data.mjs';
const bases=new Set(['BT01','BT02','BT03','BT04']);
function identity(value){shape(value,['baseTroopId','specialTroopId']);invariant(bases.has(value.baseTroopId)&&(value.specialTroopId===null||id(value.specialTroopId)),'INVALID_FORMATION_IDENTITY');}
const total=state=>[...state.formations.map(f=>f.field),...state.lots.map(l=>l.count),...state.transports.filter(t=>t.status==='IN_TRANSIT').map(t=>t.count)]
  .reduce((a,b)=>checkedAdd(a,b),0);
const loss=state=>state.losses.reduce((sum,l)=>checkedAdd(sum,l.count),0);
export function validatePersonnelLedger(state) {
  jsonData(state);shape(state,['format','revision','initialPersonnel','formations','lots','transports','losses','battleReceipts','receipts']);
  invariant(state.format==='military-personnel-v1'&&amount(state.revision)&&amount(state.initialPersonnel),'INVALID_PERSONNEL_FORMAT');
  unique(state.formations,'formationId');unique(state.lots,'lotId');unique(state.transports,'transportId');unique(state.losses,'lossId');unique(state.battleReceipts,'battleId');unique(state.receipts,'operationId');
  for(const f of state.formations){shape(f,['formationId','nodeId','identity','field','targetStrength','specialSupportAvailable']);identity(f.identity);invariant(id(f.nodeId)&&amount(f.field)&&amount(f.targetStrength)&&f.field<=f.targetStrength&&typeof f.specialSupportAvailable==='boolean','INVALID_FORMATION');}
  for(const l of state.lots){shape(l,['lotId','kind','nodeId','identity','originFormationId','count']);identity(l.identity);invariant(['READY','WOUNDED','RECOVERED'].includes(l.kind)&&id(l.nodeId)&&amount(l.count)&&(l.originFormationId===null||id(l.originFormationId)),'INVALID_PERSONNEL_LOT');invariant(l.kind==='READY'||id(l.originFormationId),'WOUNDED_ORIGIN_REQUIRED');}
  for(const t of state.transports){
    shape(t,['transportId','sourceLotId','destination','originNodeId','destinationNodeId','identity','originFormationId','kind','count','departureAt','arrivalAt','status','reservationRef','reservedLoads']);
    identity(t.identity);invariant(state.lots.some(l=>l.lotId===t.sourceLotId)&&id(t.originNodeId)&&id(t.destinationNodeId)&&amount(t.count)&&t.count>0&&amount(t.departureAt)&&amount(t.arrivalAt)&&t.arrivalAt>t.departureAt&&['IN_TRANSIT','ARRIVED'].includes(t.status)&&id(t.reservationRef),'INVALID_PERSONNEL_TRANSPORT');
    invariant(['READY','WOUNDED','RECOVERED'].includes(t.kind)&&(t.originFormationId===null||id(t.originFormationId)),'INVALID_TRANSPORT_PROVENANCE');
    shape(t.destination,['type','id']);invariant(['FORMATION','LOT'].includes(t.destination.type)&&id(t.destination.id),'INVALID_TRANSPORT_DESTINATION');
    if(t.destination.type==='FORMATION'){
      invariant(t.kind!=='WOUNDED','WOUNDED_CANNOT_REINFORCE_FIELD');
      invariant(state.formations.some(f=>f.formationId===t.destination.id),'UNKNOWN_TRANSPORT_DESTINATION');
    }else invariant(state.lots.some(l=>l.lotId===t.destination.id),'UNKNOWN_TRANSPORT_DESTINATION');
    let reservation;try{reservation=JSON.parse(t.reservationRef);}catch{throw new Error('INVALID_TRANSPORT_RESERVATION_REF');}
    invariant(Array.isArray(reservation)&&reservation.length===2&&reservation.every(id)&&canonical(reservation)===t.reservationRef,'INVALID_TRANSPORT_RESERVATION_REF');
    unique(t.reservedLoads,'resourceId');invariant(t.reservedLoads.length>0,'INVALID_RESERVED_LOADS');
    for(const load of t.reservedLoads){shape(load,['resourceId','amount']);invariant(amount(load.amount)&&load.amount>0,'INVALID_RESERVED_LOADS');}
    const source=state.lots.find(l=>l.lotId===t.sourceLotId);
    invariant(equal(source.identity,t.identity)&&source.kind===t.kind&&source.nodeId===t.originNodeId&&source.originFormationId===t.originFormationId,'TRANSPORT_PROVENANCE_MISMATCH');
  }
  invariant(new Set(state.transports.map(t=>t.reservationRef)).size===state.transports.length,'DUPLICATE_TRANSPORT_RESERVATION');
  for(const l of state.losses){shape(l,['lossId','battleId','formationId','count']);invariant(id(l.battleId)&&id(l.formationId)&&amount(l.count),'INVALID_PERMANENT_LOSS');}
  for(const b of state.battleReceipts){
    shape(b,['battleId','request']);invariant(typeof b.request==='string','INVALID_BATTLE_RECEIPT');
    let trace;try{trace=JSON.parse(b.request);}catch{throw new Error('INVALID_BATTLE_RECEIPT');}
    shape(trace,['snapshot','allocations']);validateBattleEndSnapshot(trace.snapshot);unique(trace.allocations,'unitId');
    invariant(canonical(trace)===b.request&&trace.snapshot.battleId===b.battleId,'INVALID_BATTLE_RECEIPT');
    invariant(equal(trace.allocations.map(a=>a.unitId).sort(),trace.snapshot.units.map(u=>u.unitId).sort()),'INVALID_BATTLE_RECEIPT_COVERAGE');
    const records=state.losses.filter(l=>l.battleId===b.battleId);
    invariant(records.length===trace.allocations.length,'INVALID_LOSS_TRACE');
    for(const a of trace.allocations){
      const l=records.find(l=>l.lossId===a.lossId),u=trace.snapshot.units.find(u=>u.unitId===a.unitId);
      invariant(l&&l.formationId===a.formationId&&l.count===a.permanentLoss&&amount(a.wounded)&&amount(a.permanentLoss)&&checkedAdd(a.wounded,a.permanentLoss)===u.casualties,'INVALID_LOSS_TRACE');
    }
  }
  invariant(state.losses.every(l=>state.battleReceipts.some(b=>b.battleId===l.battleId)),'MISSING_BATTLE_RECEIPT_FOR_LOSS_TRACE');
  state.receipts.forEach((r,i)=>{commandReceipt(r,['BATTLE_CASUALTIES','RECOVERY','DEPARTURE','ARRIVAL']);invariant(r.revision===i+1,'INVALID_PERSONNEL_RECEIPT');});
  invariant(state.revision===state.receipts.length,'PERSONNEL_REVISION_MISMATCH');
  invariant(checkedAdd(total(state),loss(state))===state.initialPersonnel,'PERSONNEL_CONSERVATION');
  return state;
}
export function createPersonnelLedger({formations,lots}) {
  jsonData({formations,lots});
  const state={format:'military-personnel-v1',revision:0,initialPersonnel:0,formations:clone(formations),lots:clone(lots),transports:[],losses:[],battleReceipts:[],receipts:[]};
  state.initialPersonnel=total(state);return validatePersonnelLedger(state);
}
function transaction(state,command,kind,operation){
  validatePersonnelLedger(state);jsonData(command);invariant(id(command.operationId)&&amount(command.expectedRevision),'INVALID_PERSONNEL_COMMAND');
  const request=canonical({kind,command}),prior=state.receipts.find(r=>r.operationId===command.operationId);
  if(prior){invariant(prior.request===request,'PERSONNEL_OPERATION_CONFLICT');return {ledger:clone(state),result:clone(prior.result),replayed:true};}
  invariant(command.expectedRevision===state.revision,'STALE_PERSONNEL_REVISION');
  const next=clone(state),result=operation(next);next.revision++;next.receipts.push({operationId:command.operationId,request,revision:next.revision,result:clone(result)});
  return {ledger:validatePersonnelLedger(next),result:clone(result),replayed:false};
}
function addLot(state,lot){
  const existing=state.lots.find(l=>l.lotId===lot.lotId);
  if(existing){invariant(equal({...existing,count:0},{...lot,count:0}),'LOT_IDENTITY_CONFLICT');existing.count=checkedAdd(existing.count,lot.count);}
  else state.lots.push(clone(lot));
}
export function classifyBattleCasualties(state,command){
  jsonData(command);shape(command,['operationId','expectedRevision','snapshot','allocations']);validateBattleEndSnapshot(command.snapshot);
  return transaction(state,command,'BATTLE_CASUALTIES',next=>{
    const {snapshot,allocations}=command;
    invariant(!next.battleReceipts.some(b=>b.battleId===snapshot.battleId),'BATTLE_CASUALTIES_ALREADY_CLASSIFIED');
    unique(allocations,'unitId');invariant(new Set(allocations.map(a=>a.formationId)).size===allocations.length,'DUPLICATE_FORMATION_ALLOCATION');
    invariant(equal(allocations.map(a=>a.unitId).sort(),snapshot.units.map(u=>u.unitId).sort()),'CASUALTY_ALLOCATION_COVERAGE');
    for(const a of allocations){
      shape(a,['unitId','formationId','wounded','permanentLoss','recoveryNodeId','woundedLotId','lossId']);
      invariant(amount(a.wounded)&&amount(a.permanentLoss)&&id(a.recoveryNodeId)&&id(a.woundedLotId)&&id(a.lossId),'INVALID_CASUALTY_ALLOCATION');
      const u=snapshot.units.find(u=>u.unitId===a.unitId),f=next.formations.find(f=>f.formationId===a.formationId);
      invariant(f&&f.field===u.preBattleCount,'PRE_BATTLE_FIELD_MISMATCH');
      invariant(a.recoveryNodeId===f.nodeId,'WOUNDED_EVACUATION_REQUIRES_TRANSPORT');
      invariant(checkedAdd(a.wounded,a.permanentLoss)===u.casualties,'CASUALTY_SPLIT_MISMATCH');
      f.field=u.postBattleCount;
      addLot(next,{lotId:a.woundedLotId,kind:'WOUNDED',nodeId:a.recoveryNodeId,identity:clone(f.identity),originFormationId:f.formationId,count:a.wounded});
      invariant(!next.losses.some(l=>l.lossId===a.lossId),'LOSS_ID_CONFLICT');
      next.losses.push({lossId:a.lossId,battleId:snapshot.battleId,formationId:f.formationId,count:a.permanentLoss});
    }
    next.battleReceipts.push({battleId:snapshot.battleId,request:canonical({snapshot,allocations})});
    return {battleId:snapshot.battleId,classified:true};
  });
}
export function recoverWoundedPersonnel(state,command,adapters){
  jsonData(command);shape(command,['operationId','expectedRevision','woundedLotId','recoveredLotId','count','authorizationRef']);
  return transaction(state,command,'RECOVERY',next=>{
    const wounded=next.lots.find(l=>l.lotId===command.woundedLotId);
    invariant(wounded?.kind==='WOUNDED'&&amount(command.count)&&command.count>0&&command.count<=wounded.count&&id(command.authorizationRef),'INVALID_RECOVERY_REQUEST');
    invariant(truth(adapters,'canRecover',next,command),'RECOVERY_NOT_AUTHORIZED');
    const origin=next.formations.find(f=>f.formationId===wounded.originFormationId);
    // Identity is checked as well as origin reference; no automatic Base mixing.
    const hasRoom=origin&&origin.field<origin.targetStrength&&equal(origin.identity,wounded.identity);
    const returnable=Boolean(hasRoom)&&truth(adapters,'hasReturnRoute',next,command);
    const kind=returnable?'RECOVERED':'READY';wounded.count-=command.count;
    addLot(next,{lotId:command.recoveredLotId,kind,nodeId:wounded.nodeId,identity:clone(wounded.identity),originFormationId:wounded.originFormationId,count:command.count});
    return {lotId:command.recoveredLotId,count:command.count,kind,returnRequest:returnable?{sourceLotId:command.recoveredLotId,targetFormationId:origin.formationId}:null};
  });
}
function requireSpecialEligibility(formation,source){
  invariant(equal(formation.identity,source.identity),'PERSONNEL_IDENTITY_MISMATCH');
  if(formation.identity.specialTroopId!==null){
    const originalRecovered=source.originFormationId===formation.formationId;
    invariant(originalRecovered||formation.specialSupportAvailable,'SPECIAL_REPLACEMENT_SUPPORT_REQUIRED');
  }
}
// Capacity and personnel are staged together. Reservations can also have Food
// payloads; no second free military capacity pool is introduced.
export function dispatchPersonnelTransport(bundle,command,adapters){
  jsonData(command);shape(command,['operationId','expectedRevision','transportId','sourceLotId','destination','destinationNodeId','count','departureAt','arrivalAt','reservationId','authorizationRef']);
  validatePersonnelCapacityBundle(bundle);
  invariant(id(command.transportId)&&id(command.authorizationRef),'INVALID_TRANSPORT_ID');
  const reservationRef=canonical([bundle.capacity.periodId,command.reservationId]);
  const transportRequest={...command,reservationPeriod:bundle.capacity.periodId};
  const capacity=consumeTransportReservation(bundle.capacity,{reservationId:command.reservationId,payloadRef:command.transportId,consumerId:command.transportId});
  const result=transaction(bundle.ledger,transportRequest,'DEPARTURE',next=>{
    invariant(!next.transports.some(t=>t.transportId===command.transportId),'TRANSPORT_ID_CONFLICT');
    const source=next.lots.find(l=>l.lotId===command.sourceLotId);
    invariant(source&&amount(command.count)&&command.count>0&&command.count<=source.count,'INSUFFICIENT_PERSONNEL_STOCK');
    invariant(amount(command.departureAt)&&amount(command.arrivalAt)&&command.arrivalAt>command.departureAt,'EXPLICIT_POSITIVE_ETA_REQUIRED');
    shape(command.destination,['type','id']);invariant(id(command.destinationNodeId),'DESTINATION_NODE_REQUIRED');
    if(command.destination.type==='FORMATION'){
      const f=next.formations.find(f=>f.formationId===command.destination.id);
      invariant(f&&source.kind!=='WOUNDED'&&f.nodeId===command.destinationNodeId,'INVALID_FORMATION_DESTINATION');
      requireSpecialEligibility(f,source);
      invariant(command.count<=f.targetStrength-f.field,'TARGET_STRENGTH_EXCEEDED');
    }else{
      invariant(command.destination.type==='LOT','INVALID_TRANSPORT_DESTINATION');
      const lot=next.lots.find(l=>l.lotId===command.destination.id);
      invariant(lot&&lot.nodeId===command.destinationNodeId&&lot.kind===source.kind&&lot.originFormationId===source.originFormationId&&equal(lot.identity,source.identity),'INVALID_LOT_DESTINATION');
    }
    const reservation=capacity.reservations.find(r=>r.reservationId===command.reservationId);
    invariant(truth(adapters,'canTransport',next,command,reservation,capacity),'TRANSPORT_NOT_AUTHORIZED');
    source.count-=command.count;
    next.transports.push({transportId:command.transportId,sourceLotId:source.lotId,destination:clone(command.destination),originNodeId:source.nodeId,destinationNodeId:command.destinationNodeId,
      identity:clone(source.identity),originFormationId:source.originFormationId,kind:source.kind,count:command.count,departureAt:command.departureAt,arrivalAt:command.arrivalAt,status:'IN_TRANSIT',reservationRef,reservedLoads:clone(reservation.loads)});
    return {transportId:command.transportId,departed:true};
  });
  validatePersonnelCapacityBundle({ledger:result.ledger,capacity});
  return {...result,capacity};
}
export function arrivePersonnelTransport(state,command,adapters){
  jsonData(command);shape(command,['operationId','expectedRevision','transportId','now','authorizationRef']);
  return transaction(state,command,'ARRIVAL',next=>{
    const t=next.transports.find(t=>t.transportId===command.transportId);
    invariant(t&&t.status==='IN_TRANSIT'&&amount(command.now)&&command.now>=t.arrivalAt&&id(command.authorizationRef),'ARRIVAL_NOT_DUE_OR_ALREADY_APPLIED');
    invariant(truth(adapters,'canArrive',next,command),'ARRIVAL_NOT_AUTHORIZED');
    if(t.destination.type==='FORMATION'){
      const f=next.formations.find(f=>f.formationId===t.destination.id);
      invariant(f&&f.nodeId===t.destinationNodeId,'ARRIVAL_DISPOSITION_INPUT_REQUIRED');
      requireSpecialEligibility(f,t);
      // If other reinforcements filled the target while in transit, retain this
      // transport. No over-cap growth, deletion or invented teleport to a node.
      invariant(t.count<=f.targetStrength-f.field,'ARRIVAL_DISPOSITION_INPUT_REQUIRED');
      f.field=checkedAdd(f.field,t.count);
    }else{
      const l=next.lots.find(l=>l.lotId===t.destination.id);
      invariant(l&&l.nodeId===t.destinationNodeId&&l.kind===t.kind&&l.originFormationId===t.originFormationId&&equal(l.identity,t.identity),'ARRIVAL_DISPOSITION_INPUT_REQUIRED');
      l.count=checkedAdd(l.count,t.count);
    }
    t.status='ARRIVED';return {transportId:t.transportId,arrived:true};
  });
}
export function personnelConservation(state){validatePersonnelLedger(state);return {initial:state.initialPersonnel,living:total(state),permanentLoss:loss(state)};}
export function serializePersonnelLedger(state){return JSON.stringify(validatePersonnelLedger(state));}
export function deserializePersonnelLedger(text){invariant(typeof text==='string','INVALID_PERSONNEL_SERIALIZATION');return validatePersonnelLedger(JSON.parse(text));}

export function validatePersonnelCapacityBundle(bundle){
  validatePersonnelLedger(bundle.ledger);validateTransportCapacity(bundle.capacity);
  for(const t of bundle.ledger.transports){
    const [periodId,reservationId]=JSON.parse(t.reservationRef);
    if(periodId!==bundle.capacity.periodId)continue;
    const r=bundle.capacity.reservations.find(r=>r.reservationId===reservationId);
    invariant(r&&r.payloadRef===t.transportId&&r.consumedBy===t.transportId&&equal(r.loads,t.reservedLoads),'PERSONNEL_CAPACITY_BUNDLE_MISMATCH');
  }
  return bundle;
}
