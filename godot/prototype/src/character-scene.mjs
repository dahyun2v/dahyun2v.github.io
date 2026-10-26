const SCHEMA='first3-character-scene-candidate-v1';
const VERSION=1;
const COMMON_CHOICE_IDS=new Set(['A_GUARD_NORTHWEST_NOW','B_WITHDRAW_TO_COMMON_SAFE_TILE']);
const UNIQUE_CHOICE_ID='C_REGISTER_TWO_RESPONSES';
const FINAL_ORDER_STATUS={HOLD:'HOLDING',MOVE:'COMPLETED'};

function clone(value){return structuredClone(value);}
function object(value){return value!==null&&typeof value==='object'&&!Array.isArray(value);}
function stableId(value){return typeof value==='string'&&/^[A-Za-z0-9._:-]+$/.test(value);}
function unique(values){return new Set(values).size===values.length;}
function sameSet(a,b){return Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&[...a].sort().every((value,index)=>value===[...b].sort()[index]);}

function validationError(errors,condition,code){if(!condition)errors.push(code);}
function choices(definition){return definition?.scene?.choices??[];}

export function validateCharacterSceneDefinition(definition,publicProjection=null){
  const errors=[],warnings=[];
  validationError(errors,object(definition),'DEFINITION_REQUIRED');
  if(!object(definition))return {valid:false,errors,warnings,contentFingerprint:null};
  validationError(errors,definition.schema===SCHEMA,'SCHEMA_MISMATCH');
  validationError(errors,definition.version===VERSION,'VERSION_MISMATCH');
  validationError(errors,object(definition.actorBindings),'ACTOR_BINDINGS_REQUIRED');
  validationError(errors,object(definition.scene)&&stableId(definition.scene.sceneId),'SCENE_ID_INVALID');
  const sceneChoices=choices(definition);
  validationError(errors,sceneChoices.length===3,'THREE_CHOICES_REQUIRED');
  const ids=sceneChoices.map(choice=>choice?.choiceId);
  validationError(errors,ids.every(stableId)&&unique(ids),'CHOICE_IDS_INVALID_OR_DUPLICATE');
  validationError(errors,COMMON_CHOICE_IDS.size===ids.filter(id=>COMMON_CHOICE_IDS.has(id)).length,'COMMON_CHOICES_MISSING');
  validationError(errors,ids.includes(UNIQUE_CHOICE_ID),'UNIQUE_CANDIDATE_MISSING');
  for(const choice of sceneChoices){
    if(!object(choice))continue;
    validationError(errors,Array.isArray(choice.automaticRewards)&&choice.automaticRewards.length===0,`AUTOMATIC_REWARD_FORBIDDEN:${choice.choiceId??'UNKNOWN'}`);
    if(COMMON_CHOICE_IDS.has(choice.choiceId)){
      validationError(errors,choice.kind==='COMMON_COMMAND',`COMMON_CHOICE_KIND_INVALID:${choice.choiceId}`);
      validationError(errors,choice.implementationState==='available_in_i1_as_separate_orders',`COMMON_CHOICE_STATE_INVALID:${choice.choiceId}`);
      validationError(errors,Array.isArray(choice.intents)&&choice.intents.length===2,`COMMON_INTENTS_INVALID:${choice.choiceId}`);
      for(const intent of choice.intents??[]){
        validationError(errors,stableId(intent.armyId),`ARMY_ID_INVALID:${choice.choiceId}`);
        validationError(errors,['MOVE','HOLD'].includes(intent.orderType),`ORDER_TYPE_INVALID:${choice.choiceId}`);
        if(intent.orderType==='MOVE')validationError(errors,typeof intent.destinationTileId==='string',`MOVE_DESTINATION_REQUIRED:${choice.choiceId}`);
      }
    }
    if(choice.choiceId===UNIQUE_CHOICE_ID){
      validationError(errors,choice.kind==='UNIQUE_ACTION_CANDIDATE','UNIQUE_CHOICE_KIND_INVALID');
      validationError(errors,choice.implementationState==='not_implemented_candidate','UNIQUE_CHOICE_MUST_BE_UNSUPPORTED');
    }
  }
  validationError(errors,definition.actorBindings?.comparisonOnlyMiZhu?.officerId===null,'MIZHU_FORMAL_ID_FORBIDDEN');
  validationError(errors,definition.actorBindings?.comparisonOnlyMiZhu?.initialRosterMember===false,'MIZHU_INITIAL_ROSTER_FORBIDDEN');
  if(publicProjection!==null){
    validationError(errors,object(publicProjection),'PUBLIC_PROJECTION_INVALID');
    if(object(publicProjection)){
      validationError(errors,object(publicProjection.ownCities),'PUBLIC_OWN_CITIES_REQUIRED');
      validationError(errors,object(publicProjection.ownArmies),'PUBLIC_OWN_ARMIES_REQUIRED');
    }
  }
  if(definition.globalRules?.rewardPolicy===undefined)warnings.push('REWARD_POLICY_NOT_DESCRIBED');
  return {
    valid:errors.length===0,
    errors,
    warnings,
    contentFingerprint:errors.length?null:`${definition.schema}:${definition.version}:${definition.scene.sceneId}`,
  };
}

function closed(reasonCode,validation=null){
  return {eligible:false,status:'CLOSED',reasonCode,validation:validation?clone(validation):null,publicSituation:null,choices:[]};
}

function publicChoice(choice){
  if(choice.choiceId===UNIQUE_CHOICE_ID){
    return {
      choiceId:choice.choiceId,
      label:choice.label,
      kind:choice.kind,
      supportState:'UNSUPPORTED_CANDIDATE',
      opportunityCost:choice.opportunityCost,
    };
  }
  return {
    choiceId:choice.choiceId,
    label:choice.label,
    kind:choice.kind,
    supportState:'SUPPORTED_COMMON_COMMANDS',
    opportunityCost:choice.opportunityCost,
  };
}

export function offerCharacterScene(definition,publicProjection){
  const validation=validateCharacterSceneDefinition(definition,publicProjection);
  if(!validation.valid)return closed('INVALID_DEFINITION_OR_PROJECTION',validation);
  const factionId=definition.actorBindings.returnAnchor.requiredFactionId;
  if(publicProjection.factionId!==factionId)return closed('WRONG_FACTION');
  const strategist=definition.actorBindings.strategist;
  const city=publicProjection.ownCities[strategist.requiredCityId];
  if(!city)return closed('REQUIRED_CITY_MISSING');
  if(city.ownerFactionId!==strategist.requiredFactionId||city.governorId!==strategist.officerId)return closed('STRATEGIST_OR_CITY_BINDING_MISSING');
  if(!publicProjection.officers?.[strategist.officerId])return closed('STRATEGIST_MISSING');
  for(const bindingName of ['returnAnchor','mobileReserve']){
    const binding=definition.actorBindings[bindingName],army=publicProjection.ownArmies[binding.armyId];
    if(!army)return closed(`REQUIRED_ARMY_MISSING:${binding.armyId}`);
    if(army.factionId!==binding.requiredFactionId||army.commanderId!==binding.officerId)return closed(`ARMY_BINDING_MISMATCH:${binding.armyId}`);
    if(army.tileId!==binding.baselineTileId)return closed(`ARMY_NOT_AT_SCENE_START:${binding.armyId}`);
    if(army.currentOrder!==null)return closed(`ARMY_ALREADY_ORDERED:${binding.armyId}`);
  }
  const threat=publicProjection.publicThreat;
  if(!object(threat))return closed('PUBLIC_THREAT_NOT_IMPLEMENTED');
  if(!Array.isArray(threat.possibleLaneIds))return closed('PUBLIC_THREAT_LANES_NOT_PROVIDED');
  const laneIds=definition.scene.mapBindings.lanes.map(lane=>lane.laneId);
  if(!sameSet(threat.possibleLaneIds,laneIds))return closed('PUBLIC_THREAT_LANES_MISMATCH');
  if(threat.approachLaneKnown!==false)return closed(threat.approachLaneKnown===true?'THREAT_LANE_ALREADY_KNOWN':'PUBLIC_THREAT_OBSERVATION_STATE_MISSING');
  return {
    eligible:true,
    status:'OPEN',
    reasonCode:null,
    sceneId:definition.scene.sceneId,
    factionId,
    title:definition.scene.title,
    characterQuestion:definition.scene.characterQuestion,
    publicSituation:clone(definition.scene.publicSituation),
    choices:definition.scene.choices.map(publicChoice),
  };
}

export function compileCharacterSceneChoice(definition,sceneOffer,choiceId){
  const validation=validateCharacterSceneDefinition(definition);
  if(!validation.valid)return {status:'INVALID_DEFINITION',choiceId,reasonCode:validation.errors[0]??'INVALID_DEFINITION',commands:[]};
  if(!sceneOffer?.eligible||sceneOffer.sceneId!==definition.scene.sceneId)return {status:'SCENE_NOT_OPEN',choiceId,reasonCode:sceneOffer?.reasonCode??'SCENE_NOT_OPEN',commands:[]};
  const choice=definition.scene.choices.find(item=>item.choiceId===choiceId);
  if(!choice)return {status:'UNKNOWN_CHOICE',choiceId,reasonCode:'UNKNOWN_CHOICE',commands:[]};
  if(choiceId===UNIQUE_CHOICE_ID){
    return {
      status:'UNSUPPORTED_CANDIDATE',
      choiceId,
      reasonCode:'G03_PREPARED_RESPONSE_NOT_IMPLEMENTED',
      commands:[],
      automaticRewards:[],
    };
  }
  const commands=choice.intents.map(intent=>{
    const command={armyId:intent.armyId,type:intent.orderType,factionId:sceneOffer.factionId};
    if(intent.orderType==='MOVE')command.destinationTileId=intent.destinationTileId;
    return command;
  });
  return {
    status:'COMMON_COMMAND_PROPOSAL',
    choiceId,
    reasonCode:null,
    commands,
    completionPolicy:'ALL_COMMAND_RESULTS_REQUIRED',
    automaticRewards:[],
  };
}

function findChoice(definition,choiceId){return definition.scene.choices.find(choice=>choice.choiceId===choiceId);}
function reactionResult(definition,choice,choiceCommitGlobalTick,status,reasonCode,reactionKey){
  const reaction=choice.reactions?.[reactionKey];
  return {
    status,
    success:status==='SUCCESS',
    reasonCode,
    reaction:reaction?clone(reaction):null,
    idempotencyKey:`${definition.scene.sceneId}:${choiceCommitGlobalTick}`,
    automaticRewards:[],
    writes:['SCENE_REACTION_RECORD_ONLY'],
  };
}

function commandFailure(choice,facts){
  if(!Array.isArray(facts.commandResults))return 'COMMAND_RESULTS_MISSING';
  for(const intent of choice.intents){
    const result=facts.commandResults.find(item=>item?.armyId===intent.armyId&&item?.type===intent.orderType);
    if(!result)return `COMMAND_RESULT_MISSING:${intent.armyId}`;
    if(result.accepted!==true)return `PARTIAL_COMMAND_FAILURE:${intent.armyId}`;
    if(result.finalStatus!==FINAL_ORDER_STATUS[intent.orderType])return `PARTIAL_COMMAND_FAILURE:${intent.armyId}`;
  }
  return null;
}

function anchorFailure(definition,facts){
  const anchor=definition.actorBindings.returnAnchor;
  if(facts.returnAnchor?.ownerFactionId!==anchor.requiredFactionId||facts.returnAnchor?.occupantArmyId!==anchor.armyId)return 'RETURN_ANCHOR_LOST';
  if(facts.resolvedArmyTileIds?.[anchor.armyId]!==anchor.baselineTileId)return 'RETURN_ANCHOR_LOST';
  return null;
}

export function resolveCharacterSceneReaction(definition,facts){
  const validation=validateCharacterSceneDefinition(definition);
  if(!validation.valid)return {status:'INVALID_DEFINITION',success:false,reasonCode:validation.errors[0]??'INVALID_DEFINITION',reaction:null,idempotencyKey:null,automaticRewards:[],writes:[]};
  const choice=findChoice(definition,facts?.choiceId);
  if(!choice)return {status:'INVALID_FACTS',success:false,reasonCode:'UNKNOWN_CHOICE',reaction:null,idempotencyKey:null,automaticRewards:[],writes:[]};
  if(!Number.isSafeInteger(facts?.choiceCommitGlobalTick)||facts.choiceCommitGlobalTick<0)return {status:'INVALID_FACTS',success:false,reasonCode:'INVALID_CHOICE_COMMIT_GLOBAL_TICK',reaction:null,idempotencyKey:null,automaticRewards:[],writes:[]};
  if(choice.choiceId===UNIQUE_CHOICE_ID)return reactionResult(definition,choice,facts.choiceCommitGlobalTick,'UNSUPPORTED_CANDIDATE','FEATURE_NOT_IMPLEMENTED','failure');
  const failedCommand=commandFailure(choice,facts);
  if(failedCommand)return reactionResult(definition,choice,facts.choiceCommitGlobalTick,'FAILURE',failedCommand,'failure');
  const failedAnchor=anchorFailure(definition,facts);
  if(failedAnchor)return reactionResult(definition,choice,facts.choiceCommitGlobalTick,'FAILURE',failedAnchor,'failure');
  const moveIntent=choice.intents.find(intent=>intent.orderType==='MOVE');
  if(facts.resolvedArmyTileIds?.[moveIntent.armyId]!==moveIntent.destinationTileId)return reactionResult(definition,choice,facts.choiceCommitGlobalTick,'FAILURE','MOVE_NOT_COMPLETED','failure');
  if(choice.choiceId==='A_GUARD_NORTHWEST_NOW'){
    if(facts.firstObservedThreatLane!=='NORTHWEST'){
      const reason=facts.firstObservedThreatLane==='SOUTHWEST'?'FIRST_OBSERVED_LANE_SOUTHWEST':'THREAT_LANE_NOT_OBSERVED';
      return reactionResult(definition,choice,facts.choiceCommitGlobalTick,'FAILURE',reason,'failure');
    }
  }
  return reactionResult(definition,choice,facts.choiceCommitGlobalTick,'SUCCESS','FACTUAL_SUCCESS','success');
}
