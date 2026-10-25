// C268 shared symbols. Index snapshot is verified against sym/index.json by test-style-c268.
export const SYM_FAMILIES = {"resources":["food","learning","production","renown","reserve","troops"],"global":["city","diplomacy","faction","help","map","officers","records","settings"],"actions":["attack","build","cancel","confirm","garrison","move","negotiate","next-turn","recruit","tactic","undo","wait"],"status":["done","formation-broken","formation-disordered","formation-ordered","locked","morale-broken","morale-shaken","morale-steady","ready","supply-cut","supply-full","supply-low"],"troops":["bow","cavalry","spear","sword"],"terrain":["coast","ferry","forest","mountain","plain","river","road","wall"],"lenses":["danger","faction","hide","move","supply","terrain"],"diplomacy":["alliance","friendly","hostile","negotiation","neutral","own"],"reports":["asleep","awaken","built","captured","envoy","event","lost","major-event"],"controls":["check","close","collapse","expand","info","next","prev","search","sort","warning"]};
const symEscape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function symUrl(family,name){
 if(!Object.hasOwn(SYM_FAMILIES,family)||!SYM_FAMILIES[family].includes(name)){console.warn(`[sym] Unknown icon: ${family}/${name}`);return null;}
 return `/assets/ui-kit/own/sym/${family}/${name}.webp`;
}
/** Decorative image next to a visible label, or labelled image for icon-only controls. */
export function symImg(family,name,{size='md',label='',paper=false,className=''}={}){
 const url=symUrl(family,name),step=['xs','sm','md','lg','xl'].includes(size)?size:'md';
 if(!url)return `<span class="sg-sym-fallback">${symEscape(label||name)}</span>`;
 const markup = `<img class="sg-sym sg-sym-${step}${paper?' sg-sym-paper':''}${className?' '+symEscape(className):''}" src="${url}" alt="${symEscape(label)}"${label?'':' aria-hidden="true"'}>`;
 return paper ? `<span class="sg-sym sg-sym-${step} sg-sym-mask" style="--sg-symbol:url('${url}')"${label?` role="img" aria-label="${symEscape(label)}"`:' aria-hidden="true"'}></span>` : markup;
}
