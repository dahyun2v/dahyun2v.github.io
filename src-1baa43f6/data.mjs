export const FACTIONS = {
  F01: { id:'F01', name:'조조', color:'#d34a45', mark:'용', concept:'빨간 용의 밤의 귀족 · 악의 제국' },
  F02: { id:'F02', name:'유비', color:'#63a88b', mark:'매듭', concept:'사람을 모으는 의형제 연합' },
  F03: { id:'F03', name:'손권', color:'#3f83c5', mark:'물결', concept:'푸른 군기의 역할 협력 연합' },
};

export const TROOPS={spear:'창병',cavalry:'기병',bow:'궁병',engineer:'공병',militia:'의병',mystic:'술병'};
export async function loadInputs() {
  const responses=await Promise.all(['/data/map.json','/data/first3.json','/data/movement.json'].map(url=>fetch(url)));
  if(responses.some(r=>!r.ok))throw new Error('초기 배치 자료를 불러오지 못했습니다.');
  const [map,initialData,movementData]=await Promise.all(responses.map(r=>r.json()));
  if(map.width!==18 || map.height!==14 || map.tiles?.length!==252)throw new Error('지도 자료의 크기가 맞지 않습니다.');
  return {map,initialData,movementData};
}
