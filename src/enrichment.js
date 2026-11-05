import naturalRecords from '../research/verified-natural-history.json' with {type:'json'};
import plantRecords from '../research/verified-plant-details.json' with {type:'json'};
import careDetails from '../research/verified-care-details.json' with {type:'json'};
import reproduction from '../research/reproduction-facts.json' with {type:'json'};
import amphibianCare from '../research/verified-amphibian-care.json' with {type:'json'};
import evidence from '../research/evidence.json' with {type:'json'};
import {plantDimensionCm} from './plant-traits.js';
import {factList,sourceStatistic} from './fact-labels.js';
const rawIndex=new Map(evidence.map(r=>[r.latin,r]));
const vocab=(record,section)=>Object.values(record?.sections?.[section]?.keywords||{}).flat();
const stats=(record,section)=>record?.sections?.[section]?.statistics||[];
const joinStatistics=values=>values.map(sourceStatistic).filter(Boolean).map(r=>r.label+': '+r.value).join(' / ')||null;
const unique=values=>[...new Set(values.filter(Boolean))];
const plantDrainage={wellDraining:'원자료 재배 가이드: 배수가 잘되는 배지',moistureRetentive:'원자료 재배 가이드: 보습성 배지',excellentDrainage:'원자료 재배 가이드: 배수가 매우 잘되는 배지',waterloggingTolerant:'원자료 재배 가이드에 물고임 내성 기록; 정체수 사육을 권장한다는 의미 아님'};
const watering={topWatering:'위에서 물주기',bottomWatering:'저면 관수',misting:'분무',immersion:'담가 물주기'};

export function withEnrichment(entry){
 let e={...entry,enrichmentSources:[]};
 if(e.plant){
  const record=plantRecords[e.latin],raw=rawIndex.get(e.latin)||{},f=record?.facts||{};
  const soil=factList(f['Soil Texture']),drainage=factList(f['Soil Drainage'])||plantDrainage[raw.drainagePreference]||null;
  const plantingNotes=[soil?'토양·배지 성질: '+soil:null,drainage?'배수·수분 조건: '+drainage:null].filter(Boolean).join('. ')||null;
  const leafTraits=[['Leaf Color','색'],['Leaf Shape','모양'],['Leaf Type','잎 유형'],['Leaf Arrangement','배열'],['Leaf Feel','질감'],['Leaf Margin','가장자리']].filter(([key])=>f[key]?.length).map(([key,label])=>label+': '+factList(f[key])).join(' / ')||null;
  const reportedPoison=f['Poison Severity']?.length||f.Problems?.some(v=>['Poisonous to Humans','Problem for Cats','Problem for Dogs','Problem for Horses'].includes(v));
  const reportedIrritation=f['Causes Contact Dermatitis']?.includes('Yes')||f.Problems?.includes('Contact Dermatitis');
  const poison=reportedPoison?'독성 보고 · NC Extension'+(f['Poison Severity']?.length?' 분류 '+factList(f['Poison Severity']):'')+'(사람·개별 동물 대상 원문 기록; 다른 동물 위해성은 종별 확인)':reportedIrritation?'자극성 보고 · NC Extension 접촉성 피부염 기록; 동물별 접촉 위험 검토':null;
  const precautions=[poison,factList(f.Problems),f['Causes Contact Dermatitis']?.includes('Yes')?'접촉성 피부염 보고':null].filter(Boolean).join('. ')||null;
  const height=plantDimensionCm(f.Height||f.Dimensions),width=plantDimensionCm(f.Width||f.Dimensions,'Width');
  e={...e,origin:f['Country Or Region Of Origin']?.join(' · ')||e.origin,toxicity:poison||e.toxicity,plantDetails:record||null,plant:{...e.plant,soil,drainage,soilPh:factList(f['Soil pH']),sourceLight:factList(f.Light),lifeCycle:factList(f['Life Cycle']),habit:factList(f['Habit/Form']),plantType:factList(f['Plant Type']),sourceOrigin:factList(f['Country Or Region Of Origin']),sourceMaintenance:factList(f.Maintenance),leafTraits,poisonParts:factList(f['Poison Part']),poisonPrinciple:factList(f['Poison Toxic Principle']),poisonEvidence:precautions,finalWidthCm:width,finalHeightCm:height||e.plant.finalHeightCm,plantingNotes,wateringMethod:watering[raw.wateringMethod]||null}};
  if(record)e.enrichmentSources.push({...record,sourceTitle:'NC Extension · 종별 원예·배지·독성 사실',scope:'종별 식물학·원예 정보; 실내 사육장 조건 및 동물 안전성과 구분'});
  return e;
 }
 if(!e.animal)return e;
 const detail=careDetails[e.latin],nature=naturalRecords[e.latin],birth=reproduction[e.latin];let a={...e.animal};
 if(detail){
  for(const [key,value] of Object.entries(detail.fields))if(value&&(!a[key]||key==='cohabitationRisks'))a[key]=value;
  if(!a.diets.length&&detail.diets?.length)a.diets=detail.diets;
  if(!a.habitats.length&&detail.habitats?.length)a.habitats=detail.habitats;
  if(detail.cohabitationStatus==='not-recommended')a.cohabitationStatus='not-recommended';
  e.enrichmentSources.push({...detail,scope:detail.scope.startsWith('species')?'종이 일치하는 사육 자료 · 연령·원문 시점 확인':'취미 가이드 참고값 · 독립적인 종별 검증 자료 아님'});
 }
 if(nature){
  const behaviors=vocab(nature,'behavior'),habitat=vocab(nature,'habitat'),diet=vocab(nature,'food_habits'),development=vocab(nature,'development'),breeding=vocab(nature,'reproduction');
  if(!a.activities.length)a.activities=behaviors.flatMap(v=>({diurnal:['day'],nocturnal:['night'],crepuscular:['twilight']}[v]||[]));
  if(!a.diets.length)a.diets=unique(diet.flatMap(v=>['insectivore','carnivore','herbivore','omnivore','detritivore'].includes(v)?[v]:[]));
  // ADW's "terrestrial" habitat region includes arboreal animals. It is not a
  // ground-position label. Swimming and tropical location are also not inferred
  // to mean permanent aquatic life or high enclosure humidity.
  const positions=unique(behaviors.flatMap(v=>({arboreal:['arboreal'],fossorial:['fossorial'],terricolous:['terrestrial']}[v]||[])));
  if(!a.habitats.length&&positions.length){a.habitats=positions;a.habitatSources=unique([...a.habitatSources,nature.sourceUrl]);}
  if(!a.climates.length)a.climates=unique([habitat.includes('desert or dune')?'dry':null,habitat.includes('rainforest')?'humid':null,habitat.includes('temperate')?'temperate':null]);
  a.behavior||=behaviors.length?'자연사 기록: '+factList(behaviors)+'. 사육 적응·합사 가능성을 뜻하지 않음.':null;
  a.bodySizeNotes||=joinStatistics(stats(nature,'physical_description').filter(r=>/length/.test(r.label)));
  a.lifespanNotes||=joinStatistics(stats(nature,'lifespan_longevity'));
  if(!a.breeding&&breeding.length)a.breeding='자연사 기록: '+factList(breeding)+'. 사육 번식·부화 조건은 별도 확인.';
  if(!a.lifeStages&&development.length)a.lifeStages='자연사 발달 기록: '+factList(development)+'. 유생·변태기·성체에 같은 사육 조건을 적용하지 말고 단계별 전문 자료 확인.';
  const hazards=vocab(nature,'economic_importance_negative').filter(v=>['poisonous','venomous','injures humans bites or stings','causes disease in humans','causes or carries domestic animal disease'].includes(v));
  if(!a.healthNotes&&hazards.length)a.healthNotes='자연사 원문의 주의 기록: '+factList(hazards)+'. 해당 사육 개체의 독성·병원체 보유 여부를 검사한 결과는 아니므로 직접 취급·합사 전 별도 검토.';
  const title=nature.sourceTitle.match(/\(([^)]+)\)\s*\|/);if(!e.englishName&&title)e.englishName=title[1];
  e={...e,naturalHistory:nature};e.enrichmentSources.push({...nature,sourceTitle:'Animal Diversity Web · '+(e.englishName||e.latin),scope:'야생 생태·자연사 기록; 사육 온습도·사육장 규격으로 사용하지 않음'});
 }
 if(birth){
  const note='분류 원자료의 생식 방식: '+birth.modes.join(' · ')+'. 사육 번식·부화 조건은 별도 확인.';
  if(!a.breeding)a.breeding=note;
  e.enrichmentSources.push({...birth,sourceTitle:'Reptile Database 분류 스냅샷 · 생식 방식',scope:'생식 방식 사실; 번식·부화 환경 지침과 구분'});
 }
 const amphibian=amphibianCare[e.latin];
 if(amphibian){
  for(const [key,value] of Object.entries(amphibian.fields))if(value)a[key]=value;
  a.habitats=unique([...a.habitats,...amphibian.habitats]);
  a.habitatSources=unique([...a.habitatSources,...amphibian.sources.map(s=>s.sourceUrl)]);
  if(!a.diets.length)a.diets=amphibian.diets;
  if(!a.adultSizeCm&&amphibian.adultSizeCm){a.adultSizeCm=amphibian.adultSizeCm;a.sizeClass=a.adultSizeCm[1]<=15?'small':a.adultSizeCm[1]<=40?'medium':'large';}
  if(!e.temp&&amphibian.temperature)e={...e,temp:amphibian.temperature.range,tempRole:amphibian.temperature.role,tempLabel:amphibian.temperature.label,careBasis:'종별 양서류 전문 사육 자료 · 수온과 공기 온도 구분',comparisonEligible:false};
  if(amphibian.cohabitationStatus)a.cohabitationStatus=amphibian.cohabitationStatus;
  e.enrichmentSources.push(...amphibian.sources);
 }
 return {...e,animal:a,aliases:unique([...(e.aliases||[]),e.englishName])};
}
