import careRecords from '../research/verified-care.json' with {type:'json'};
import {validRange} from './logic.js';
export function withCare(e){
 const c=careRecords[e.latin];if(!c||!e.animal)return e;
 const p=c.profile;const role=p.ambient?'ambient':p.coolAir?'cool_air':p.coolHide?'cool_hide':null;
 const temp=p.ambient||p.coolAir||p.coolHide;
 const minimum=c.minimumEnclosureCm;
 const adult=c.adultSizeCm;
 return {...e,careBasis:c.scope==='group'?'속·종군 공통 가이드 참고값':'종별 PDF 환경 자료 · 측정 구역 구분',temp:validRange(e.temp)?e.temp:temp||null,tempRole:validRange(e.temp)?e.tempRole||'ambient':role,tempLabel:validRange(e.temp)?e.tempLabel||'기본 온도':{ambient:'평균 공기 온도',cool_air:'서늘한 구역',cool_hide:'서늘한 은신처'}[role]||'구역별 온도 아래 참조',humidity:c.humidity||e.humidity,difficulty:c.difficulty||e.difficulty,environment:e.environment==='종별 확인'?(c.habitats.includes('arboreal')?'수목 환경':c.climates.includes('dry')?'건조·반건조 환경':c.habitats.includes('aquatic')?'수생 환경':'종별 사육 환경'):e.environment,careRecord:c,comparisonEligible:c.scope!=='group'&&!!(c.humidity&&(validRange(e.temp)||temp)),animal:{...e.animal,habitats:c.habitats,climates:c.climates,habitatSources:[c.sourceUrl],activities:c.activities,diets:c.diets,adultSizeCm:adult,sizeClass:adult?(adult[1]<=15?'small':adult[1]<=40?'medium':'large'):null,lifespanYears:c.lifespanYears,minEnclosureCm:minimum,minEnclosureScope:c.minimumEnclosureScope||null,minEnclosureSource:c.minimumEnclosureSource||c.sourceUrl,recommendedEnclosureCm:null,enclosureClass:minimum?(Math.max(...minimum)<=45?'compact':Math.max(...minimum)<=90?'medium':'large'):null,uvb:c.uvbTarget?'원자료 UVI 목표 '+c.uvbTarget.join('–')+' · 설치 거리·메시·노출 위치는 원문과 측정기로 확인':null,ventilation:c.ventilation,thermalGradient:p.baskingSurface&&(p.coolAir||p.coolHide||p.ambient)?p:null,climateProfile:p,cohabitationStatus:'review-required'}};
}
