export function createRng(seed = 1) {
  let value = (Number(seed) >>> 0) || 1;
  return {
    next() { value = (Math.imul(1664525, value) + 1013904223) >>> 0; return value / 4294967296; },
    state() { return value; },
    restore(nextState) { if(!Number.isInteger(nextState) || nextState<0 || nextState>0xffffffff)throw new Error('난수 진행값이 올바르지 않습니다.'); value = nextState; },
  };
}
