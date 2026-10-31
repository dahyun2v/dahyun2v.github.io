import trial from '../../docs/design-data/officer-pack/trial-51-100-v0.1.json' with {type:'json'};

// Catalog only. Nothing in campaign creation enumerates this catalog.
export const CAMPAIGN_OFFICERS_51_100=trial.officers;
export function campaignOfficerPack(id){
 const input=trial.officers.find(o=>o.id===id);
 if(!input)throw new Error('UNKNOWN_C34_OFFICER');
 const p=structuredClone(input);
 delete p.uniqueTrait.formerName;delete p.signatureTactic.formerName;
 return {...p,status:'TRIAL',role:null,style:null,primaryClass:null,secondaryClass:null,
  classDisplay:{primary:input.primaryClass,secondary:input.secondaryClass},
  uniqueVersion:'redesign-51-100-v0.2',draftPool:[p.signatureTactic]};
}

export const C34_OFFICERS=trial.officers.map(({id,name,uniqueTrait,signatureTactic})=>({id,name,uniqueTrait,signatureTactic}));
