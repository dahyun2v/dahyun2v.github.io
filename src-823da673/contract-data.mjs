// Strict, lossless JSON boundary for the new independent development kernels.
// Technical validation only; no game formulas or content defaults live here.
export const invariant = (condition, reason) => { if (!condition) throw new Error(reason); };
export const clone = value => structuredClone(value);
export const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value)
  && [Object.prototype, null].includes(Object.getPrototypeOf(value));
export const id = value => typeof value === 'string' && value.length > 0;
export const amount = value => Number.isSafeInteger(value) && value >= 0 && !Object.is(value, -0);
export function jsonData(value, ancestors = new Set()) {
  if (value === null || ['string','boolean'].includes(typeof value)) return value;
  if (typeof value === 'number') {
    invariant(Number.isFinite(value) && !Object.is(value, -0), 'NON_JSON_NUMBER'); return value;
  }
  invariant(Array.isArray(value) || isRecord(value), 'NON_JSON_VALUE');
  invariant(!ancestors.has(value), 'CYCLIC_JSON_VALUE'); ancestors.add(value);
  const keys = Reflect.ownKeys(value);
  if (Array.isArray(value)) {
    invariant(Object.getPrototypeOf(value) === Array.prototype && keys.length === value.length + 1, 'NON_JSON_ARRAY');
    for (let i=0; i<value.length; i++) invariant(Object.hasOwn(value,String(i)), 'NON_JSON_ARRAY');
  }
  for (const key of keys) {
    if (Array.isArray(value) && key === 'length') continue;
    const d = Object.getOwnPropertyDescriptor(value,key);
    invariant(typeof key === 'string' && Object.hasOwn(d,'value') && d.enumerable, 'NON_JSON_PROPERTY');
    jsonData(d.value,ancestors);
  }
  ancestors.delete(value); return value;
}
export function shape(value, keys, reason = 'INVALID_RECORD_SHAPE') {
  invariant(isRecord(value) && Object.keys(value).length === keys.length && keys.every(k => Object.hasOwn(value,k)), reason);
}
export function unique(records, key, reason = 'DUPLICATE_OR_INVALID_ID') {
  invariant(Array.isArray(records) && records.every(r => isRecord(r) && id(r[key]))
    && new Set(records.map(r => r[key])).size === records.length,reason);
}
export function frozen(value) {
  const out = clone(value);
  const freeze = v => { if (v !== null && typeof v === 'object') { Object.values(v).forEach(freeze); Object.freeze(v); } };
  freeze(out); return out;
}
export function canonical(value) {
  jsonData(value);
  const walk = v => Array.isArray(v) ? `[${v.map(walk).join(',')}]` : isRecord(v)
    ? `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${walk(v[k])}`).join(',')}}` : JSON.stringify(v);
  return walk(value);
}
export const equal = (a,b) => canonical(a) === canonical(b);
export function rule(adapters, name, ...args) {
  invariant(isRecord(adapters) && Object.hasOwn(adapters,name) && typeof adapters[name] === 'function', `INPUT_REQUIRED:${name}`);
  const result = adapters[name](...args.map(frozen));
  jsonData(result); return result;
}
export function truth(adapters,name,...args) {
  const result = rule(adapters,name,...args);
  invariant(result === true || result === false || result === 'UNKNOWN', `INVALID_RULE_RESULT:${name}`);
  invariant(result !== 'UNKNOWN',`INPUT_REQUIRED:${name}`); return result;
}
export function checkedAdd(a,b) {
  invariant(amount(a) && amount(b) && amount(a+b),'INVALID_OR_OVERFLOW_AMOUNT'); return a+b;
}

// Validate the saved command identity, without claiming cryptographic history.
export function commandReceipt(receipt,allowedKinds) {
  shape(receipt,['operationId','request','revision','result']);
  invariant(id(receipt.operationId)&&typeof receipt.request==='string'&&amount(receipt.revision)&&receipt.revision>0,'INVALID_COMMAND_RECEIPT');
  let parsed;
  try { parsed=JSON.parse(receipt.request); } catch { throw new Error('INVALID_COMMAND_RECEIPT_JSON'); }
  shape(parsed,['kind','command'],'INVALID_COMMAND_RECEIPT');
  invariant(allowedKinds.includes(parsed.kind)&&isRecord(parsed.command)&&id(parsed.command.operationId)
    &&parsed.command.operationId===receipt.operationId&&parsed.command.expectedRevision===receipt.revision-1
    &&canonical(parsed)===receipt.request,'INVALID_COMMAND_RECEIPT_BINDING');
  return parsed;
}
