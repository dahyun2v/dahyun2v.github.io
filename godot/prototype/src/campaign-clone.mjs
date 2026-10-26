// Campaign snapshots are plain data. Copy containers and preserve aliases,
// but reuse primitive strings (notably the large pool fingerprints). Native
// structuredClone serializes those strings again on every AI trial/movement.
// Keep the native contract for any future non-plain snapshot type.
const unsupported=Symbol('non-plain campaign data');
// Ownership is a synchronous transaction capability, never snapshot/save data.
// cloneCampaign itself ALWAYS copies: queries and before/after witnesses rely on it.
let ownership=null;
export function withCampaignOwnership(write){
  if(ownership)return write();
  ownership=new WeakSet();
  try{return write();}finally{ownership=null;}
}
export function campaignStateOwned(state){return !!ownership?.has(state);}
export function cloneOwnedCampaign(state){
  const next=cloneCampaign(state);ownership?.add(next);return next;
}
export function writableCampaign(state){
  return campaignStateOwned(state)?state:cloneOwnedCampaign(state);
}
// Previews may execute real resolvers. Detach an owned input and suspend the
// capability for the complete query, including nested resolver calls.
export function withCampaignPreview(state,read){
  const source=campaignStateOwned(state)?cloneCampaign(state):state;
  const previous=ownership;ownership=null;
  try{return read(source);}finally{ownership=previous;}
}
export function assertCampaignQueryState(state){
  if(campaignStateOwned(state))throw new Error('OWNED_CAMPAIGN_QUERY');
}
export function cloneCampaign(value){
  const seen=new Map();
  function copy(v){
    if(v===null||typeof v!=='object'){
      if(typeof v==='function'||typeof v==='symbol')throw unsupported;
      return v;
    }
    const prior=seen.get(v);if(prior!==undefined)return prior;
    const array=Array.isArray(v);
    if(!array){const proto=Object.getPrototypeOf(v);if(proto!==Object.prototype&&proto!==null)throw unsupported;}
    const out=array?new Array(v.length):{};seen.set(v,out);
    for(const key of Object.keys(v)){
      const value=v[key],type=typeof value;
      const item=value!==null&&(type==='object'||type==='function'||type==='symbol')?copy(value):value;
      if(key==='__proto__')Object.defineProperty(out,key,{value:item,writable:true,enumerable:true,configurable:true});
      else out[key]=item;
    }
    return out;
  }
  try{return copy(value);}catch(error){if(error!==unsupported)throw error;return structuredClone(value);}
}
