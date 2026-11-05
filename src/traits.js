import evidence from '../research/evidence.json' with {type:'json'};
import editorial from '../research/editorial-traits.json' with {type:'json'};
import {plantTypes,animalTypes} from './taxonomy.js';
const index=new Map(evidence.map(e=>[e.latin,e]));
export function withTraits(e){
 const raw=index.get(e.latin)||{},tags=editorial[e.latin]||{};
 e={...e,englishName:raw.common&&raw.common!==e.latin?raw.common:null};
 if(e.kind==='plant')return {...e,taxonomyCategories:plantTypes(e),plant:{placements:tags.placements||[],plantingMethods:tags.plantingMethods||[],placementBasis:tags.note||null,growthRate:raw.growthRate||null,lightClass:raw.lightPreference||null,sizeClass:tags.sizeClass||null,finalHeightCm:null,propagationMethods:raw.propagationMethods||[],features:e.summary,plantingNotes:null,precautions:e.caution},animal:null};
 if(e.kind==='vivarium')return {...e,taxonomyCategories:[],plant:null,animal:null};
 return {...e,taxonomyCategories:animalTypes(e),plant:null,animal:{habitats:e.group==='등각류'?['terrestrial']:[],climates:[],habitatSources:e.group==='등각류'?[e.source]:[],activities:[],diets:[],adultSizeCm:null,sizeClass:null,lifespanYears:null,minEnclosureCm:null,recommendedEnclosureCm:null,enclosureClass:null,lighting:e.light,uvb:null,feeding:null,substrate:null,hides:null,behavior:null,breeding:null,lifeStages:null,bioactiveStatus:raw.bioactiveNotes?'conditional-review':'unknown',bioactiveNotes:raw.bioactiveNotes?'취미 가이드 참고(종별 위험성 검토 필요): '+raw.bioactiveNotes:null,cohabitationStatus:'review-required',cohabitationRisks:e.caution,healthNotes:null}};
}
