import {overlap,validRange} from './logic.js';
export function enclosureFits(actual,minimum){
 if(!Array.isArray(actual)||!Array.isArray(minimum)||actual.length!==3||minimum.length!==3||![...actual,...minimum].every(n=>Number.isFinite(n)&&n>0))return null;
 return ((actual[0]>=minimum[0]&&actual[1]>=minimum[1])||(actual[0]>=minimum[1]&&actual[1]>=minimum[0]))&&actual[2]>=minimum[2];
}
export function plantCandidate(animal,plant){
 const missing=[],risks=[];
 if(!validRange(animal.temp)||!validRange(plant.temp)||!validRange(animal.humidity)||!validRange(plant.humidity))missing.push('종별 온습도 범위');
 if(animal.tempRole&&animal.tempRole!=='ambient')missing.push('동물의 구역별 온도와 식물 재배 온도의 측정 조건 추가 확인');
 const temperature=overlap(animal.temp,plant.temp),humidity=overlap(animal.humidity,plant.humidity);
 if(missing.length)return {status:'insufficient',reasons:missing};
 if(!temperature||!humidity)return {status:'different',reasons:['온습도 공통 범위 없음']};
 if(/독성 보고|자극·약한 독성/.test(plant.toxicity||''))risks.push('식물 독성 보고: 섭취·접촉 위험 검토');
 risks.push('성체 무게·식물 파손·농약·환기·조명·물 고임을 별도로 검토해야 함');
 if(animal.tempRole&&animal.tempRole!=='ambient')risks.push('동물 온도는 구역별 값: 식물 재배 온도와 같은 의미가 아님');
 return {status:risks.some(r=>r.startsWith('식물 독성'))?'risk':'review-candidate',temperature,humidity,reasons:risks};
}
export function reverseMatch(entry,criteria){
 const missing=[],mismatch=[],reasons=[];
 for(const [field,label] of [['temp','온도'],['humidity','습도']]){
  if(!validRange(entry[field]))missing.push(label+' 범위');
  else if(criteria[field]&& !overlap(entry[field],criteria[field]))mismatch.push(label+' 범위 불일치');
 }
 if(entry.kind==='plant'){
  if(criteria.plantCategories?.length&&!criteria.plantCategories.some(k=>entry.taxonomyCategories.includes(k)))mismatch.push('식물 종류 불일치');
  if(!entry.plant?.finalHeightCm)missing.push('출처가 확인된 성숙 높이와 확장 공간');
  if(entry.plant?.finalHeightCm&&entry.plant.finalHeightCm[1]>criteria.dimensions[2])mismatch.push('원자료 성숙 높이가 사육장 높이를 초과');
  if(mismatch.length)return {status:'different',reasons:mismatch};
  return {status:missing.length?'insufficient':'review-candidate',reasons:[...missing,.../독성 보고|자극·약한 독성/.test(entry.toxicity||'')?['독성·자극성 보고가 있어 섭취·접촉 위험을 동물별로 검토해야 함']:[],'동물과의 안전성·빛·배지·식재 위치는 개별 검토 필요']};
 }
 const animal=entry.animal||{};
 if(entry.tempRole==='cool_hide')missing.push('은신처 온도와 사육장 공기 온도를 구분할 자료');
 if(criteria.habitats?.length&&!criteria.habitats.some(h=>animal.habitats?.includes(h))){if(!animal.habitats?.length)missing.push('서식 위치');else mismatch.push('서식 위치 불일치');}
 if(criteria.climates?.length&&!criteria.climates.some(c=>animal.climates?.includes(c))){if(!animal.climates?.length)missing.push('기후 조건');else mismatch.push('기후 조건 불일치');}
 const fits=enclosureFits(criteria.dimensions,animal.minEnclosureCm);
 if(fits===null)missing.push('종별 최소 사육장');else if(!fits)mismatch.push('성체 최소 사육장 규격 미충족');
 if(!animal.adultSizeCm)missing.push('성체 크기');
 if(!animal.ventilation)missing.push('종별 환기 요구');else if(!criteria.ventilated)mismatch.push('환기 조건 확인 필요');
 if(!animal.thermalGradient)missing.push('온도 구배·가열 구역 자료');else if(!criteria.thermalGradient)mismatch.push('온도 구배 제공 확인 필요');
 if(mismatch.length)return {status:'different',reasons:mismatch};
 if(missing.length)return {status:'insufficient',reasons:missing};
 reasons.push('기록된 최소 규격·서식 위치·온습도·환기·온도 구배 조건을 대조한 검토 후보');
 if(animal.minEnclosureScope)reasons.push(animal.minEnclosureScope);
 reasons.push('입력만으로 실제 장비 성능·개체 건강·합사 안전성을 확정하지 않음');
 return {status:'review-candidate',reasons};
}
