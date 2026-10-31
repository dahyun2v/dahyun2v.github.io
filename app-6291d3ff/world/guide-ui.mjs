// Public guide presentation API. The browser uses the already allowed prologue
// entry point; keep the server allowlist and campaign modules untouched.
export {GUIDE_STORAGE_KEY,readGuidePreferences,saveGuidePreferences,guideAllows,
 claimGuideFirst,setGuideData,loadGuideData,guideLine,guidePortraitHtml,chooseGuide,
 guideCallName,formatGuideAddress,recordGuideCombat,mountGuideSettings,showGuideFirst,showGuideReaction,guideEndingHtml,resetGuideRun,guideCapitalThreat} from './prologue-ui.mjs';
