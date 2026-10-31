// 32 §§2.3–2.4,4,5,11.4,13.4. Caller supplies measured integer accounting
// quanta, already resolved paths/priorities and period IDs. No load conversion,
// time period length, strategic priority, route shape or bandwidth is invented.
import {invariant,jsonData,shape,unique,id,amount,clone,equal,checkedAdd} from './contract-data.mjs';
export function validateTransportCapacity(state) {
  jsonData(state);shape(state,['format','periodId','resources','reservations']);
  invariant(state.format==='military-capacity-v1'&&id(state.periodId),'INVALID_CAPACITY_FORMAT');
  unique(state.resources,'resourceId');unique(state.reservations,'reservationId');
  const usage=new Map(state.resources.map(r=>{shape(r,['resourceId','capacity']);invariant(amount(r.capacity),'INVALID_CAPACITY');return [r.resourceId,0];}));
  for(const r of state.reservations){
    shape(r,['reservationId','payloadRef','loads','consumedBy']);invariant(id(r.payloadRef)&&(r.consumedBy===null||id(r.consumedBy)),'INVALID_CAPACITY_RESERVATION');
    unique(r.loads,'resourceId');invariant(r.loads.length>0,'EMPTY_TRANSPORT_LOAD');
    for(const load of r.loads){shape(load,['resourceId','amount']);invariant(usage.has(load.resourceId)&&amount(load.amount)&&load.amount>0,'INVALID_TRANSPORT_LOAD');usage.set(load.resourceId,checkedAdd(usage.get(load.resourceId),load.amount));}
  }
  for(const r of state.resources)invariant(usage.get(r.resourceId)<=r.capacity,`SHARED_CAPACITY_EXCEEDED:${r.resourceId}`);
  return state;
}
export function createTransportCapacity({periodId,resources}) {
  return validateTransportCapacity(clone({format:'military-capacity-v1',periodId,resources,reservations:[]}));
}
export function reserveTransportCapacity(state,request) {
  validateTransportCapacity(state);jsonData(request);shape(request,['reservationId','payloadRef','loads']);
  const previous=state.reservations.find(r=>r.reservationId===request.reservationId);
  if(previous){invariant(equal({...previous,consumedBy:null},{...request,consumedBy:null}),'RESERVATION_ID_CONFLICT');return clone(state);}
  const next=clone(state);next.reservations.push({...clone(request),consumedBy:null});return validateTransportCapacity(next);
}
export function consumeTransportReservation(state,{reservationId,payloadRef,consumerId}) {
  validateTransportCapacity(state);invariant(id(consumerId),'INVALID_RESERVATION_CONSUMER');
  const next=clone(state),reservation=next.reservations.find(r=>r.reservationId===reservationId);
  invariant(reservation&&reservation.payloadRef===payloadRef,'TRANSPORT_RESERVATION_REQUIRED');
  invariant(reservation.consumedBy===null||reservation.consumedBy===consumerId,'RESERVATION_ALREADY_CONSUMED');
  reservation.consumedBy=consumerId;return validateTransportCapacity(next);
}
export function residualTransportCapacity(state) {
  validateTransportCapacity(state);
  return state.resources.map(r=>({resourceId:r.resourceId,remaining:r.capacity-state.reservations.reduce((sum,x)=>sum+(x.loads.find(l=>l.resourceId===r.resourceId)?.amount??0),0)}));
}
export function calculateExportableFood(input) {
  jsonData(input);shape(input,['stock','civilianConsumption','survivalReserve','essentialLocalDemand']);
  invariant(Object.values(input).every(amount),'INVALID_FOOD_ACCOUNTING_INPUT');
  const protectedAmount=checkedAdd(checkedAdd(input.civilianConsumption,input.survivalReserve),input.essentialLocalDemand);
  return {exportable:Math.max(0,input.stock-protectedAmount),protectedAmount,unmetProtected:Math.max(0,protectedAmount-input.stock)};
}
export function queryOccupationNormalization(input) {
  jsonData(input);shape(input,['effectiveControl','authorityFunctional','securityAboveOperationalMinimum','basicCivilOperationAvailable','noCriticalOccupationBlocker','stableValidationSatisfied']);
  invariant(Object.values(input).every(v=>[true,false,'UNKNOWN'].includes(v)),'INVALID_NORMALIZATION_INPUT');
  const blocked=Object.keys(input).filter(k=>input[k]===false),unknown=Object.keys(input).filter(k=>input[k]==='UNKNOWN');
  return {canNormalize:blocked.length?false:unknown.length?'UNKNOWN':true,blocked,unknown};
}
