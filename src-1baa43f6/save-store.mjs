// 캠페인 저장소: 브라우저는 IndexedDB 에 gzip 압축해서 저장(수백 MB까지), 없으면 기존 localStorage.
// 사용자 질문 "용량이 커지면 브라우저로 이제 못하는거아니니??"(2026-10-04) — localStorage 는 사이트당 약 5MB.
// IndexedDB 가 없는 환경(시험)에서는 지금처럼 동기로 동작한다: saveText/loadText 가 값을 바로 돌려준다.
// IndexedDB 가 있으면 Promise 를 돌려준다. 부르는 쪽은 settle() 로 두 경우를 같이 다룬다.
const DB_NAME = 'sangoku-saves', STORE = 'campaign';
const hasIdb = () => typeof indexedDB !== 'undefined' && indexedDB !== null;
const hasGzip = () => typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';
export const settle = (value, then) => (value && typeof value.then === 'function' ? value.then(then) : then(value));
export const saveMarkerKey = key => `${key}:idb`;

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
function run(mode, body) {
  return openDb().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode), result = body(tx.objectStore(STORE));
    tx.oncomplete = () => { db.close(); resolve(result?.result); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  }));
}
const gzip = text => new Response(new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'))).blob();
const gunzip = blob => new Response(blob.stream().pipeThrough(new DecompressionStream('gzip'))).text();

/** 저장. IndexedDB 가 있으면 Promise(완료 시 {bytes, chars}), 없으면 localStorage 에 바로 쓰고 {chars}. */
export function saveText(key, text) {
  if (!hasIdb()) { localStorage.setItem(key, text); return {chars: text.length}; }
  return (async () => {
    const compressed = hasGzip(), data = compressed ? await gzip(text) : text;
    await run('readwrite', store => store.put({data, compressed, chars: text.length, savedAt: Date.now()}, key));
    try { localStorage.removeItem(key); } catch {}                                   // 옛 위치의 큰 저장은 비움
    try { localStorage.setItem(saveMarkerKey(key), String(Date.now())); } catch {}     // 다른 탭에 알림(storage 이벤트)
    return {chars: text.length, bytes: compressed ? data.size : text.length * 2};
  })();
}
/** 읽기. IndexedDB 에 없으면 옛 localStorage 저장을 읽는다(첫 저장 때 옮겨짐). */
export function loadText(key) {
  if (!hasIdb()) return localStorage.getItem(key);
  return (async () => {
    let record = null;
    try { record = await run('readonly', store => store.get(key)); } catch {}
    if (record) return record.compressed ? gunzip(record.data) : record.data;
    try { return localStorage.getItem(key); } catch { return null; }
  })();
}
