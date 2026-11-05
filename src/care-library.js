import articles from '../research/verified-care-articles.json' with {type:'json'};
import caudata from '../research/verified-caudata-care.json' with {type:'json'};
import evidence from '../research/evidence.json' with {type:'json'};
const rawIndex=new Map(evidence.map(e=>[e.latin,e]));
const temperatureLabels={ambient:'사육장 평균 공기',coolAir:'서늘한 공기',coolSide:'서늘한 구역 · 측정 대상 원문 확인'};
const temperatureRoles={ambient:'ambient',coolAir:'cool_air',coolSide:'cool_zone_reference'};
const reference=r=>({...r,scope:r.scope==='species'?'판매업체의 공개 종별 사육 참고 자료 · 독립적인 전문 검증과 구분':'여러 종 공통 참고 자료 · 개별 종 수치로 사용하지 않음'});
export function withCareLibrary(entry){
 let e={...entry};
 if(e.plant){
  const preference=rawIndex.get(e.latin)?.humidityPreference;
  const description={low:'낮은 습도 선호',medium:'보통 습도 선호',moderate:'보통 습도 선호',high:'높은 습도 선호',veryHigh:'매우 높은 습도 선호'}[preference];
  if(!e.humidity&&description)e={...e,humidityLabel:description+' · 정량 범위 미확인'};
  return e;
 }
 if(!e.animal)return e;
 let a={...e.animal};const article=articles[e.latin];
 if(article){
  for(const [key,value] of Object.entries(article.fields)){
   // Established PDF profiles keep their own climatic measurement context.
   if(e.careRecord&&['temperatureNotes','humidityNotes','careEnclosureNotes'].includes(key))continue;
   if(!a[key]&&value)a[key]=value;
  }
  if(!a.diets.length&&article.diets.length)a.diets=article.diets;
  if(!a.activities.length&&article.activities.length)a.activities=article.activities;
  if(!a.habitats.length&&article.habitats.length){a.habitats=article.habitats;a.habitatSources=[...new Set([...a.habitatSources,article.sourceUrl])];}
  if(!e.careRecord&&article.scope==='species'){
   const temperature=['ambient','coolAir','coolSide'].map(role=>article.temperatureFacts.find(f=>f.role===role&&f.values.length===2&&f.qualifier==='range')).find(Boolean);
   if(temperature)e={...e,temp:temperature.values,tempRole:temperatureRoles[temperature.role],tempLabel:temperatureLabels[temperature.role],comparisonEligible:false,careBasis:'공개 종별 사육 가이드 참고 · 온도 측정 구역·출처 확인'};
   const humidity=article.humidityFacts.find(f=>['average','average_day','reference','day'].includes(f.role)&&f.values.length===2);
   if(humidity)e={...e,humidity:humidity.values,comparisonEligible:false};
   else if(article.humidityFacts.length){
    // A mean of 50% with a 70% misting peak is not a 50–70% care range.
    const average=article.humidityFacts.find(f=>['average','average_day'].includes(f.role));
    const peak=article.humidityFacts.find(f=>f.role==='peak');
    e={...e,humidity:null,humidityLabel:[average?'평균 '+average.values.join('–')+'%':null,peak?'일시 최고 '+peak.values.join('–')+'%':null].filter(Boolean).join(' · ')||'습도 조건별 기록 · 상세 참조',comparisonEligible:false};
   }
  }
  e={...e,careArticle:article,enrichmentSources:[...e.enrichmentSources,reference(article)]};
 }
 const amphibian=caudata[e.latin];
 if(amphibian){
  for(const [key,value] of Object.entries(amphibian.fields))if(value&&!a[key])a[key]=value;
  if(!a.habitats.length&&amphibian.habitats?.length)a.habitats=amphibian.habitats;
  if(!a.diets.length&&amphibian.diets?.length)a.diets=amphibian.diets;
  if(!e.temp&&amphibian.temperature)e={...e,temp:amphibian.temperature.range,tempRole:amphibian.temperature.role,tempLabel:amphibian.temperature.label,comparisonEligible:false,careBasis:'Caudata Culture 종별 사육 문헌 · 계절·성장 단계 확인'};
  e.enrichmentSources=[...e.enrichmentSources,{...amphibian,scope:amphibian.scope==='species'?'종별 사육 참고 문헌 · 저자 관찰·원문 시점 확인':'종군 비교 자료 · 종별 차이와 동정 확인 필요'}];
 }
 return {...e,animal:a};
}
