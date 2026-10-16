export function selectionRect(x,y,endX,endY){return {left:Math.min(x,endX),top:Math.min(y,endY),width:Math.abs(endX-x),height:Math.abs(endY-y)};}
export function rectangleSelection(rect,units){return units.filter(u=>u.eligible&&u.x>=rect.left&&u.x<=rect.left+rect.width&&u.y>=rect.top&&u.y<=rect.top+rect.height).map(u=>u.id).sort();}
export function toggleSelection(ids,id){return ids.includes(id)?ids.filter(x=>x!==id):[...ids,id];}
export function cycleTileUnit(units,tile,current){const ids=units.filter(u=>u.tileId===tile).map(u=>u.armyId).sort();return ids.length?ids[(ids.indexOf(current)+1)%ids.length]:null;}
export function targetTile(target,armies,cities){return target.closest('[data-unit]')?armies[target.closest('[data-unit]').dataset.unit]?.tileId:target.closest('[data-tile]')?.dataset.tile??cities[target.closest('[data-city]')?.dataset.city]?.tileId;}
