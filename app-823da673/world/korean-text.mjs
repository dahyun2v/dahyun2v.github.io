// Shared presentation grammar. Arabic integers are read as Korean numbers.
export function hasBatchim(value){
 const text=String(value??'').trim().replace(/[)\]}'".,!?]+$/g,'');
 const number=text.match(/([+-]?[\d,]+)(?:\.(\d+))?$/);
 if(number){
  const digits=(number[2]??number[1]).replace(/\D/g,'');
  if(number[2])return /[013678]$/.test(digits);
  const clean=digits.replace(/^0+/,'')||'0',last=clean.at(-1);
  if(last!=='0'||clean==='0')return /[013678]/.test(last);
  const zeros=clean.length-clean.replace(/0+$/,'').length;
  return zeros%4!==0||zeros%16!==12; // 십·백·천·만·억·경 / 조
 }
 const code=(text.at(-1)?.charCodeAt(0)??0)-0xac00;
 return code>=0&&code<=11171&&code%28>0;
}
export function particle(word,pair='이/가'){
 const [closed,open]=pair.split('/');return String(word??'')+(hasBatchim(word)?closed:open);
}
export function josa(text){
 return String(text??'').replace(/([가-힣A-Za-z0-9,]+)(이\(가\)|을\(를\)|은\(는\)|과\(와\))/g,(_,word,pair)=>particle(word,`${pair[0]}/${pair[2]}`));
}

export function displayKorean(text){
 return josa(text).replace(/경험를/g,particle('경험','을/를')).replace(/(생산\s+[\d,]+)(?:을|를)(?=\s|$)/g,(_,word)=>particle(word,'을/를'));
}
