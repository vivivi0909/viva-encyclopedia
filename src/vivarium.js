// Moisture, climate and land/water structure are overlapping design axes,
// not species-specific husbandry ranges or mutually exclusive habitats.
const references={
 humidity:{sourceUrl:'https://reptifiles.com/crested-gecko-care/crested-gecko-temperatures-humidity/',sourceTitle:'ReptiFiles · 크레스티드 게코의 분무·건조 주기',scope:'특정 종의 습도 관리 사례. 수치·급여·장비를 다른 종이나 환경 유형 전체에 적용하지 않음',reviewedAt:'2026-11-06'},
 substrate:{sourceUrl:'https://reptifiles.com/crested-gecko/care-guide/crested-gecko-substrate-options',sourceTitle:'ReptiFiles · 보습성 바닥재와 배수층',scope:'크레스티드 게코의 배지·배수 사례. 입자 섭취 위험과 성장 단계 조건은 종별 원문 확인',reviewedAt:'2026-11-06'},
 dry:{sourceUrl:'https://reptifiles.com/leopard-gecko/care-guide/leopard-gecko-lighting-heating-humidity',sourceTitle:'ReptiFiles · 건조한 생활 공간과 습식 은신처',scope:'레오파드 게코의 온도 구배·환기·국소 습도 사례. 모든 건조 환경 동물의 사육 지침이 아님',reviewedAt:'2026-11-06'},
 seasonal:{sourceUrl:'https://www.caudata.org/cc/species/Triturus/T_marmoratus.shtml',sourceTitle:'Caudata Culture · 마블뉴트의 계절·성장 단계별 환경',scope:'특정 뉴트의 계절별 관리 사례. 모든 온대종에 냉각·동면·수생 생활을 적용하지 않음',reviewedAt:'2026-11-05'},
 water:{sourceUrl:'https://tropica.com/en/guide/',sourceTitle:'Tropica · 수생식물과 수조 관리',scope:'수생식물·수조 관리 참고. 팔루다리움의 모든 동물·수질·수역 구조에 대한 검증 자료는 아님',reviewedAt:'2026-11-06'},
};

const profiles=[
 {id:'tropical',name:'열대 비바리움',latin:'Tropical vivarium',group:'열대형',axis:'기후 중심',tags:['열대형','습도 주기','수직 식재'],humidity:'식재·대상 생물별 수분 관리',
  summary:'열대 식생의 층과 가지 구조를 표현하는 환경. 열대라는 이름만으로 항상 덥고 축축한 환경을 뜻하지 않습니다.',
  moisture:'분무 뒤 표면이 마르는 정도와 뿌리층 수분을 따로 살핍니다. 습계·반습계 설계와 조합할 수 있습니다.',
  substrate:'보습성만 높이지 말고 공극과 배수를 확보합니다. 배수층에 고인 물을 점검·제거할 수 있게 만듭니다.',
  ventilation:'식재가 통풍구를 막지 않도록 하고 분무 뒤 공기 순환과 표면 건조를 확인합니다.',
  planting:'성숙 크기와 광환경에 맞춰 지피·중경·착생 식재를 나눕니다. 열대식물이라는 이유만으로 동물과의 안전성을 보장하지 않습니다.',
  care:['식물의 뿌리 수분과 사육장 공기 습도를 별도로 관찰합니다.','가지·유목은 성체의 무게를 고려해 고정하고 정비 공간을 남깁니다.','생물 도입 전 온도 구배·환기·배수 상태를 실제로 측정합니다.'],refs:['humidity','substrate']},
 {id:'humid',name:'습계 비바리움',latin:'Humid vivarium',group:'습계',axis:'수분 관리 중심',tags:['습계','보습성 배지','환기·배수'],aliases:['습윤형','습윤 비바리움','습식 비바리움'],humidity:'촉촉한 구역 유지 · 정체수 방지',
  summary:'촉촉한 배지와 습한 미세환경을 유지하는 구성. 높은 공기 습도와 물에 잠긴 뿌리는 구분해 관리합니다.',
  moisture:'배지의 촉촉함을 관찰하며 보수합니다. 사육장 전체를 늘 젖게 하거나 바닥을 물에 잠기게 하는 방식과 구분합니다.',
  substrate:'뿌리에 필요한 공극을 남기고 물이 쌓이는 위치를 확인합니다. 배수층을 설치해도 자동으로 과습이 해결되지는 않습니다.',
  ventilation:'습도 유지를 위해 환기구를 모두 막지 않습니다. 정체된 물·공기와 곰팡이 발생 위치를 점검합니다.',
  planting:'습한 배지에 적응한 식물을 종별로 고릅니다. 이끼·양치류도 건조 내성과 물고임 내성이 서로 다릅니다.',
  care:['배지 속 수분과 잎 표면의 젖음, 공기 습도를 구분해 확인합니다.','고인 배수는 제거하고 급수량을 조절합니다.','온도와 광량은 습계라는 이름이 아닌 대상 생물의 자료에 맞춥니다.'],refs:['substrate','humidity']},
 {id:'semi-humid',name:'반습계 비바리움',latin:'Semi-humid vivarium',group:'반습계',axis:'수분 관리 중심',tags:['반습계','습도 구배','젖음·건조 주기'],aliases:['반습윤형','반습윤 비바리움','중습형'],humidity:'촉촉한 피난처와 마르는 표면',
  summary:'촉촉한 구역과 상대적으로 마른 구역을 함께 두는 구성. 공간의 습도 구배와 급수 후 건조 주기를 나눠 계획합니다.',
  moisture:'전체를 고르게 적시기보다 대상 생물에 맞는 촉촉한 피난처를 두고, 다른 구역의 표면은 마를 수 있게 설계합니다.',
  substrate:'보습 구역과 배수·통기가 좋은 구역을 구분합니다. 공기 습도가 내려갔다고 뿌리층까지 말랐다고 판단하지 않습니다.',
  ventilation:'급수 후 건조 속도를 관찰하고 분무량과 환기를 함께 조정합니다. 피난처까지 완전히 말리지 않도록 확인합니다.',
  planting:'습한 뿌리층이 필요한 식물과 건조 주기를 견디는 식물을 위치별로 구분합니다. 한 배지에 무조건 섞지 않습니다.',
  care:['습한 구역과 상대적으로 마른 구역을 각각 관찰·측정합니다.','촉촉한 은신처와 급수 후 마르는 표면을 구분해 관리합니다.','반습계의 공통 온습도 숫자를 정하지 않고 대상 종의 관리 주기를 확인합니다.'],refs:['humidity','dry']},
 {id:'semi-arid',name:'반건조 비바리움',latin:'Semi-arid vivarium',group:'반건조형',axis:'수분 관리 중심',tags:['반건조형','건조한 생활 공간','국소 보습'],aliases:['반건계','반건조계'],humidity:'건조한 생활 공간 · 국소 보습 검토',
  summary:'건조한 생활 공간을 중심으로 필요한 곳에만 수분을 제공하는 구성. 반습계와 이름이 비슷해도 수분 관리의 중심이 다릅니다.',
  moisture:'주 생활 공간을 건조하게 유지하면서 종별로 필요한 물과 습식 피난처를 따로 검토합니다.',
  substrate:'배수와 통기가 좋은 바닥을 계획합니다. 모래·흙의 재료와 입자 크기는 섭취 위험·굴파기 습성에 맞춰 정합니다.',
  ventilation:'국소 보습이 사육장 전체의 지속적인 축축함으로 이어지지 않도록 환기와 물의 이동을 살핍니다.',
  planting:'건조 주기에 맞는 식물을 검토하되 가시·수액·독성·동물에 의한 파손과 식물 뿌리의 관수 요구를 함께 확인합니다.',
  care:['주 생활 공간과 습식 피난처의 상태를 따로 확인합니다.','전체 공기 온도와 가열 표면 온도, 서늘한 피난처를 구분합니다.','반건조라는 명칭만으로 특정 도마뱀·뱀을 적합종으로 지정하지 않습니다.'],refs:['dry']},
 {id:'arid',name:'건조 비바리움',latin:'Arid vivarium',group:'건조형',axis:'수분 관리 중심',tags:['건조형','온도 구배','피난처'],humidity:'건조 중심 · 물·습식 은신처는 종별 확인',
  summary:'건조한 지형과 은신 공간을 표현하는 구성. 가열 지점과 서늘한 피난처를 나누며, 건조형도 물이 전혀 필요 없는 환경은 아닙니다.',
  moisture:'대상 종이 필요로 하는 음수와 국소 습도 요구를 별도로 확인합니다. 전체 바닥을 일괄적으로 젖게 하지 않습니다.',
  substrate:'굴이 무너지지 않는지, 돌이 움직이지 않는지 점검하고 재료의 섭취·먼지·피부 자극 위험을 확인합니다.',
  ventilation:'열과 습기가 특정 구역에 갇히지 않도록 환기합니다. 가열 장치에는 적절한 온도조절기와 보호 구조를 갖춥니다.',
  planting:'건조 환경 식물도 관수와 뿌리 공간이 필요합니다. 가시·수액·섭식 위험과 동물의 굴파기 행동을 고려합니다.',
  care:['대상 종의 가열 지점·서늘한 구역·야간 조건을 각각 확인합니다.','건조한 바닥과 필요한 습식 은신처를 구분해 점검합니다.','모래를 포함한 바닥재는 자연스러운 외형보다 종별 안전성을 먼저 검토합니다.'],refs:['dry']},
 {id:'temperate',name:'온대 비바리움',latin:'Temperate vivarium',group:'온대형',axis:'기후·계절 중심',tags:['온대형','계절 변화','단계별 관리'],humidity:'계절·대상 종·생활 단계별 확인',aliases:['온대림','온대 숲 비바리움'],
  summary:'온대의 숲바닥과 계절 변화를 참고하는 구성. 온대종도 출신 지역과 생활 단계가 달라 하나의 온습도 범위로 묶지 않습니다.',
  moisture:'계절·성장 단계에 따라 필요한 수분이 달라질 수 있습니다. 습계·반습계·육상·반수생 구성을 대상 종에 맞게 선택합니다.',
  substrate:'낙엽층과 은신 공간을 계획하고, 육상·수생 단계가 바뀌는 생물은 배지와 수역을 구분합니다.',
  ventilation:'계절별 실내 온도 변화와 환기를 함께 관찰합니다. 냉각이 필요한 종인지 확인하고 밀폐로 습도만 올리지 않습니다.',
  planting:'계절성·휴면·성숙 크기와 실내 조명 적응을 확인합니다. 야외 온대 식물이 실내에서 연중 같은 조건으로 자란다고 가정하지 않습니다.',
  care:['종·출신 계통·성장 단계별 사육 자료를 먼저 확인합니다.','계절성 조명·냉각은 해당 종에서 필요한 경우에만 전문 자료에 따라 계획합니다.','온대형이라는 이유로 동면을 강제하거나 야생 생물을 채집해 넣지 않습니다.'],refs:['seasonal']},
 {id:'paludarium',name:'팔루다리움',latin:'Paludarium',group:'팔루다리움',axis:'육지·물 구조 중심',tags:['팔루다리움','육역·수역','수질 관리'],humidity:'수역과 육역을 따로 관리',
  summary:'육지와 물이 이어지는 환경. 습계라는 수분 분류와 별개로 물의 깊이·수질·육지 접근성을 계획해야 합니다.',
  moisture:'수중·수변·육상 식재 구역의 수분 요구를 구분합니다. 육역까지 항상 물에 잠기지 않도록 높이와 배수를 점검합니다.',
  substrate:'수생식물용 배지와 육상 식물의 뿌리층을 구분하고 물의 이동·누수·정비 동선을 확인합니다.',
  ventilation:'수면 위 공기 순환과 물의 흐름을 따로 확인합니다. 높은 공기 습도만으로 수질과 수중 산소 조건을 판단하지 않습니다.',
  planting:'완전 수중·반수생·육상 식물의 생장점 위치를 구분합니다. 수중 재배체의 수상 적응 여부도 확인합니다.',
  water:'물 순환·여과와 생물 도입 전 수질 관리 계획을 세웁니다. 수역의 깊이·유속·물 밖으로 나오는 구조는 대상 종별로 확인합니다.',
  care:['생물 도입 전에 누수와 정비 접근성을 점검합니다.','수온과 공기 온도, 수질과 공기 습도를 별도로 측정합니다.','수영 능력과 물 밖으로 나올 수 있는 경사를 검토해 익사 위험을 줄입니다.'],refs:['water','seasonal']},
];

export const vivariumProfiles=profiles;
const newIds=new Set(['humid','semi-humid','semi-arid','temperate']);
export const additionalVivariums=profiles.filter(p=>newIds.has(p.id)).map(p=>({id:p.id,kind:'vivarium',name:p.name,latin:p.latin,group:p.group,difficulty:'자료 확인',temp:null,humidity:null,image:null,environment:p.group,light:'대상 생물의 광환경·UVB 요구에 맞춰 설계',size:'대상 생물의 성체 크기·활동 공간에 맞춰 결정',summary:p.summary,care:p.care,caution:'유형 이름만으로 생물의 적합성·합사 안전성을 판단하지 않습니다.',source:references[p.refs[0]].sourceUrl}));
export function withVivarium(e){
 if(e.kind!=='vivarium')return e;
 const p=profiles.find(p=>p.id===e.id);if(!p)return e;
 return {...e,summary:p.summary,care:p.care,aliases:[...new Set([...(e.aliases||[]),...(p.aliases||[])])],temp:null,humidity:null,tempLabel:'온도 설정',humidityLabel:p.humidity,comparisonEligible:false,careBasis:'환경 구성 가이드 · 종별 사육 수치 아님',reviewedAt:'2026-11-06',caution:'열대·온대는 기후, 습계·반습계·반건조·건조는 수분 관리, 팔루다리움은 육역·수역 구조를 설명합니다. 서로 조합할 수 있으며, 공통된 온습도나 합사 안전성을 뜻하지 않습니다.',setup:p,enrichmentSources:p.refs.map(key=>references[key])};
}
