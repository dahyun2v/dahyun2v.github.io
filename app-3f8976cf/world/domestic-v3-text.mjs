// C490: verbatim content snapshot; source: docs/work-integration/20261024/naejeong-content/data/domestic-v3-ui-text.json
export default {
 "status": "초안 — 확정 아님(내정 콘텐츠 방 2026-10-24). DESIGN §15 화면 글. {중괄호} 는 값이 들어갈 자리",
 "design": "docs/work-integration/20261024/naejeong-content/UI-TEXT.md",
 "words": {
  "level": {
   "low": "낮음",
   "mid": "보통",
   "high": "높음"
  },
  "amount": {
   "small": "조금",
   "mid": "꽤",
   "large": "크게"
  },
  "security": {
   "stable": "안정",
   "uneasy": "불안",
   "chaos": "혼란"
  },
  "grade": [
   "현성",
   "군성",
   "대군",
   "주도"
  ],
  "turn": "순",
  "units": {
   "grain": "석",
   "people": "명",
   "soldier": "명",
   "gold": "금"
  }
 },
 "topBar": {
  "grain": {
   "label": "곡식",
   "value": "{grain}석",
   "sub": "{turnsLeft}순 버팀",
   "tooltip": "세력 창고 하나에 모인다. 병사가 먹고 백성을 늘리는 데 쓴다. 지금 들어오는 만큼과 나가는 만큼으로 {turnsLeft}순 버틴다.",
   "warn": "곡식이 {turnsLeft}순 뒤 바닥난다"
  },
  "gold": {
   "label": "금",
   "value": "{gold}",
   "tooltip": "서두르기 · 군량 사기 · 땅 사기에 쓴다. 백성과 시장에서 들어온다."
  },
  "learning": {
   "label": "학문",
   "value": "{learning}",
   "sub": "다음 카드까지 {left}",
   "tooltip": "백성과 서원에서 쌓인다. 문턱을 넘을 때마다 카드 세 장 중 한 장을 고른다."
  },
  "prestige": {
   "label": "인망",
   "value": "{prestige}",
   "tooltip": "인재를 부르고 사건에 쓴다. 이기고 업적을 세우면 오른다."
  },
  "soldiers": {
   "label": "병사",
   "value": "{soldiers}명",
   "tooltip": "모든 성과 부대의 병사를 더한 수. 한 명이 한 순에 곡식 1석을 먹는다."
  },
  "upkeep": {
   "label": "봉록",
   "value": "한 순 {gold}금",
   "tooltip": "병사 · 장수 · 전문인력에게 주는 금. 못 주면 사기가 떨어지고 오래가면 병사가 흩어진다.",
   "warn": "봉록이 밀렸다 — 병사 사기가 떨어진다"
  }
 },
 "cityView": {
  "title": {
   "value": "{cityName} · {grade}",
   "tooltip": "성 등급은 인구로 오른다. 등급이 오르면 성이 커지고 성벽이 늘고 특별기관 자리가 생긴다."
  },
  "people": {
   "label": "인구",
   "value": "{people}명",
   "sub": "한도 {cap}명",
   "tooltip": "백성이 세금과 병사를 낸다. 창고 곡식을 써서 저절로 는다. 한도는 땅이 먹여 살릴 수 있는 수다."
  },
  "growth": {
   "label": "성장",
   "values": {
    "on": "늘어나는 중",
    "half": "느리게 늘어남",
    "off": "멈춤"
   },
   "tooltip": "새 백성 한 명에 곡식이 든다. 방침이 곡식을 아끼면 멈춘다. 불안이면 느려지고 혼란 · 포위 중이면 멈춘다."
  },
  "capReached": {
   "value": "한도에 닿음",
   "tooltip": "땅이 넓어지면 다시 는다. 인구가 한도에 가까워지면 칸이 하나씩 붙는다. 금으로 칸을 살 수도 있다."
  },
  "security": {
   "label": "치안",
   "tooltip": {
    "cause": "까닭: {cause}",
    "effect": {
     "stable": "백성 일이 그대로 돌아간다.",
     "uneasy": "세금 · 징집 · 성장 · 생산이 절반이 된다.",
     "chaos": "세금 · 징집 · 성장 · 생산이 멈춘다. 오래가면 백성이 떠난다."
    },
    "recover": "까닭이 사라지면 한 단계씩 돌아온다. 성 안 병사가 넉넉하면 더 빨리 돌아온다."
   }
  },
  "securityCauses": {
   "siege": "포위",
   "plunder": "수탈",
   "emergencyDraft": "긴급 징병",
   "reserveBreak": "생존비축 헐기",
   "damage": "성 시설 · 성벽 피해",
   "occupation": "점령한 지 얼마 안 됨",
   "famine": "흉년",
   "plague": "역병"
  },
  "territory": {
   "label": "땅",
   "tooltip": "성이 거두는 칸. 칸마다 곡식 · 생산이 다르고 시설이 그 위에 선다."
  },
  "tile": {
   "tooltip": "{terrain} · 곡식 {grain} · 생산 {prod} · 백성 {capAdd}명을 먹여 살림"
  },
  "tileBuy": {
   "label": "땅 사기",
   "tooltip": "이웃한 빈 칸을 금으로 산다. 같은 성에서 살수록 값이 오른다.",
   "confirm": "이 칸을 {price}금에 산다"
  },
  "officerRow": {
   "label": "자리 장수",
   "empty": "빈 자리",
   "tooltip": "시설에 앉은 장수는 그 일을 빠르게 하고 전문인력을 기른다. 출진하면 그동안 멈춘다."
  },
  "emergency": {
   "label": "비상",
   "tooltip": "위급할 때만 쓰는 명령. 대가가 크다."
  },
  "trait": {
   "label": "성격",
   "tooltip": "이 성이 해 온 일로 붙는 이름. 그 일이 꽤 잘된다."
  },
  "resource": {
   "label": "특산",
   "tooltip": "이 성에서 나는 것. 수도와 길이 이어져 있으면 세력 전체가 쓴다.",
   "cut": "길이 끊겨 지금 못 씀"
  }
 },
 "facilities": {
  "hall": {
   "name": "관청",
   "line": "성의 일을 정하는 곳",
   "seat": "태수 — 생산이 빨라지고 기술자를 기른다"
  },
  "farm": {
   "name": "농지",
   "line": "곡식을 내고 백성을 더 먹여 살린다",
   "seat": "곡식이 빨라지고 농관을 기른다"
  },
  "market": {
   "name": "시장",
   "line": "금을 내고 군량을 더 많이 살 수 있게 한다",
   "seat": "금이 빨라지고 관료를 기른다"
  },
  "granary": {
   "name": "곡창",
   "line": "포위당했을 때 오래 버티게 한다"
  },
  "barracks": {
   "name": "훈련소",
   "line": "병사를 훈련해 쉽게 무너지지 않게 한다",
   "seat": "징집과 훈련이 빨라지고 군관을 기른다"
  },
  "workshop": {
   "name": "공방",
   "line": "생산을 늘리고 공성 무기를 만든다",
   "seat": "생산이 빨라지고 기술자를 기른다"
  },
  "tavern": {
   "name": "주점",
   "line": "떠돌이 인재와 소문이 모인다",
   "seat": "인망과 인재가 빨라진다"
  },
  "academy": {
   "name": "서원",
   "line": "학문을 쌓는다",
   "seat": "학문이 빨라지고 학자를 기른다"
  },
  "speedValue": {
   "label": "빨라짐",
   "tooltip": "앉은 장수의 능력이 높을수록 크다."
  },
  "specialists": {
   "label": "전문인력",
   "value": "{n}명",
   "tooltip": "장수가 머무는 동안 길러진다. 장수가 떠나도 남는다. 한 명마다 그 일이 조금 는다."
  },
  "specialistNames": {
   "farmer": "농관",
   "official": "관료",
   "artisan": "기술자",
   "officer": "군관",
   "scholar": "학자"
  },
  "sortieWarn": "이 장수가 나가면 꺼지는 것",
  "mine": {
   "name": "광산",
   "line": "철광 · 금광 · 채석장 칸에 지어 더 캔다"
  },
  "ranch": {
   "name": "목장",
   "line": "군마 산지 · 가축 칸에 지어 말을 더 기른다"
  }
 },
 "hall": {
  "title": "관청",
  "firstBuild": {
   "label": "처음 짓기",
   "line": "세력이 처음 짓는 시설은 여기서 고른다.",
   "tooltip": "한 성에서 이 시설의 전문인력이 처음 나오면 나라의 표준이 된다. 표준이 된 시설은 다른 성이 알아서 갖춘다."
  },
  "standard": {
   "label": "나라 표준",
   "line": "다른 성이 알아서 갖추는 시설",
   "badge": "표준"
  },
  "bigProject": {
   "label": "큰 사업",
   "line": "표준을 다 갖춘 뒤 생산이 하는 일. 할 일이 없으면 생산이 금이 된다."
  },
  "hurry": {
   "label": "서두르기",
   "tooltip": "남은 생산을 금으로 치르고 바로 끝낸다. 같은 성에서 다시 쓰면 값이 오른다.",
   "confirm": "{price}금으로 지금 끝낸다"
  },
  "policy": {
   "label": "방침",
   "tooltip": "비었을 때 먼저 지을 것과 곡식을 백성 늘리기에 쓸지를 정한다. 다음 정산부터 바뀐다.",
   "faction": "세력 기본 방침",
   "city": "이 성만 다르게",
   "list": {
    "balanced": {
     "name": "균형",
     "line": "곡식이 넉넉할 때만 백성을 늘린다"
    },
    "agriculture": {
     "name": "농업",
     "line": "백성을 먼저 늘린다 · 농지와 곡창을 먼저"
    },
    "commerce": {
     "name": "상업",
     "line": "시장을 먼저 짓는다"
    },
    "military": {
     "name": "군사",
     "line": "백성을 늘리지 않고 곡식을 군대에 · 훈련소와 공방을 먼저"
    },
    "delegated": {
     "name": "위임",
     "line": "전선은 군사 · 후방은 농업으로 알아서"
    }
   }
  },
  "institution": {
   "label": "특별기관",
   "line": "대군에 한 자리 · 주도에 두 자리",
   "tooltip": "이 성의 성격 · 특산 · 세력이 여는 큰 사업. 이름이 남고 효과가 크다.",
   "locked": "열리는 조건 — {need}"
  }
 },
 "barracks": {
  "title": "훈련소",
  "kinds": {
   "normal": {
    "label": "일반병",
    "tooltip": "갓 뽑은 병사. 싸우고 살아남으면 숙련병이 된다."
   },
   "veteran": {
    "label": "숙련병",
    "tooltip": "싸워 본 병사. 더 세다."
   },
   "wounded": {
    "label": "부상병",
    "tooltip": "성에서만 낫는다. 나으면 원래대로 돌아간다."
   }
  },
  "drill": {
   "label": "훈련",
   "values": {
    "low": "낮음",
    "mid": "보통",
    "high": "높음"
   },
   "tooltip": "훈련이 높으면 쉽게 무너지지 않는다. 훈련소가 낮은 병사부터 훈련한다."
  },
  "drillCap": {
   "label": "한 순에 훈련하는 병사",
   "value": "{n}명"
  },
  "sortie": {
   "label": "출진",
   "line": "병력 {n}명 · 숙련 {veteranLevel}",
   "tooltip": "숙련병이 많을수록 부대가 세다."
  },
  "emergencyDraft": {
   "label": "긴급 징병",
   "line": "지금 병사를 얻는다 · 치안이 나빠지고 한동안 징집이 멈춘다"
  }
 },
 "capture": {
  "title": "{cityName} 함락",
  "line": "어떻게 다스릴지 고른다. 고르지 않으면 세력의 점령 방침대로.",
  "rows": [
   "인구",
   "전문인력",
   "시설",
   "치안",
   "다스려지기까지",
   "그 밖"
  ],
  "cards": {
   "conciliation": {
    "name": "회유",
    "values": [
     "그대로",
     "다 남음",
     "그대로",
     "흔들림 없음",
     "1순",
     "창고 곡식을 조금 쓴다"
    ],
    "line": "백성을 달랜다"
   },
   "military": {
    "name": "군정",
    "values": [
     "조금 줄어듦",
     "절반 남음",
     "그대로",
     "불안에서 시작",
     "2순",
     "병사를 남겨 지켜야 한다"
    ],
    "line": "군대로 다스린다"
   },
   "plunder": {
    "name": "수탈",
    "values": [
     "크게 줄어듦",
     "거의 없음",
     "하나 부서짐",
     "혼란에서 시작",
     "2순",
     "곡식 · 금을 더 얻지만 등급이 내려가고 원한을 산다"
    ],
    "line": "빼앗는다"
   }
  },
  "onceButton": "이번만 바꾸기",
  "factionPolicy": {
   "label": "점령 방침",
   "tooltip": "함락할 때마다 따로 묻지 않고 이 방식으로 다스린다."
  }
 },
 "learningCards": {
  "title": "학문이 무르익었다",
  "line": "한 장을 고른다.",
  "colors": {
   "군": "군",
   "내정": "내정",
   "천하": "천하",
   "시기": "이번만"
  },
  "tier": "{tier}단계",
  "next": "다음 단계가 열린다",
  "vanish": "이번에 안 고르면 사라진다",
  "auto": "고르지 않으면 차례가 끝날 때 첫 장으로 정해진다",
  "progress": {
   "label": "다음 카드까지",
   "value": "{left}"
  },
  "eureka": {
   "toast": "깨달음 — 학문 +{n}",
   "tooltip": "처음 해 낸 일이 학문을 앞당긴다."
  }
 },
 "milestone": {
  "gradeUp": {
   "title": "{cityName} 등급 오름 — {grade}",
   "line": "성이 커지고 성벽이 늘었다."
  },
  "trait": {
   "title": "{cityName} — 성격이 붙다",
   "line": "해 온 일로 이름이 붙는다. 바꾸고 싶을 때만 고른다.",
   "auto": "기본 — {traitName}",
   "secondary": "주도가 되어 성격 하나를 더 고른다"
  },
  "standard": {
   "toast": "나라 표준 — {facility}",
   "line": "다른 성이 알아서 갖춘다."
  }
 },
 "province": {
  "label": "{province} 이점",
  "on": {
   "toast": "{province} 이점을 얻었다 — {name}",
   "tooltip": "이 주의 성을 절반 넘게 쥐어 켜졌다. 잃으면 꺼진다."
  },
  "risk": {
   "warn": "{province} 이점이 위태롭다 — 성 하나를 더 잃으면 꺼진다"
  },
  "off": {
   "toast": "{province} 이점을 잃었다"
  }
 },
 "crisis": {
  "warnBand": "{turns}순 뒤 {area} {crisisName} · 세기 {level}",
  "card": {
   "title": "조짐 — {crisisName}",
   "choose": "어떻게 대비할지 고른다",
   "none": "그대로 둔다",
   "allSee": "모든 세력이 같이 본다"
  },
  "start": {
   "toast": "{crisisName} 시작 — {area}"
  },
  "end": {
   "toast": "{crisisName} 끝 — {area}"
  },
  "enemyHint": "적의 땅이다 — 약해진 틈을 노릴 수 있다"
 },
 "emergency": {
  "reserve": {
   "name": "생존비축 헐기",
   "line": "곡식을 바로 얻는다 · 치안이 나빠지고 이 성은 한동안 자라지 않는다"
  },
  "draft": {
   "name": "긴급 징병",
   "line": "병사를 바로 얻는다 · 치안이 나빠지고 한동안 징집이 멈춘다"
  },
  "taxFree": {
   "name": "세금 면제",
   "line": "이 성 세금을 한 순 걷지 않는다 · 다음 순 치안이 한 단계 돌아온다"
  },
  "cooldown": "{turns}순 뒤 다시 쓸 수 있다"
 },
 "turnSummary": {
  "line": "곡식 {grainDelta} · 금 {goldDelta} · 인구 {peopleDelta} · 병사 {soldierDelta}",
  "risks": {
   "grainLow": "곡식이 {turns}순 뒤 바닥난다",
   "chaos": "{cityName} 혼란",
   "siege": "{cityName} 포위됨",
   "crisis": "{turns}순 뒤 {crisisName}"
  }
 },
 "armory": {
  "title": "무기고",
  "line": "세력이 함께 쓰는 무구와 말",
  "kinds": {
   "spear": {
    "label": "창",
    "unit": "자루"
   },
   "blade": {
    "label": "도검",
    "unit": "자루",
    "tooltip": "방패와 함께"
   },
   "bow": {
    "label": "활",
    "unit": "자루"
   },
   "horse": {
    "label": "말",
    "unit": "필"
   }
  },
  "tooltip": "출진 · 보충 때 병사 한 명에 무구 하나가 저절로 나간다. 기병은 말 하나. 성을 지키는 병사에게는 필요 없다.",
  "short": "{kind} 부족 — {n}명까지 나갈 수 있다",
  "make": {
   "label": "무구 제작",
   "line": "공방이 있는 성이 쉬지 않고 만든다",
   "tooltip": "모자란 종류부터 만든다. 생산과 금이 든다."
  },
  "target": {
   "label": "갖출 비율",
   "tooltip": "장수들의 병종에 맞춰 저절로 정한다."
  },
  "buyHorse": {
   "label": "말 사기",
   "tooltip": "시장에서 금으로 산다. 한 순에 살 수 있는 수는 시장 수만큼. 거듭 사면 값이 오른다.",
   "confirm": "말 {n}필을 {price}금에 산다"
  },
  "loot": {
   "toast": "무구를 거두었다 — {list}"
  }
 },
 "resources": {
  "label": "특산",
  "inTerritory": "땅 안 — 쓰는 중",
  "outTerritory": "땅 밖 — 땅이 넓어지면 쓴다",
  "blocked": "적이 밟고 있어 멈춤",
  "improve": {
   "label": "개량",
   "tooltip": "맞는 시설을 그 칸에 지으면 효과가 커진다."
  },
  "classes": {
   "strategic": {
    "label": "전략",
    "tooltip": "무구 · 말을 만든다"
   },
   "bonus": {
    "label": "보너스",
    "tooltip": "곡식 · 금 · 생산을 늘린다"
   },
   "luxury": {
    "label": "명품",
    "tooltip": "인망 · 치안 · 외교에 쓴다. 같은 명품은 하나만 센다."
   }
  },
  "quality": {
   "normal": "보통",
   "good": "좋음"
  }
 }
};
