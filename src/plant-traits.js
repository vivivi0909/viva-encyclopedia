import records from '../research/verified-plant-traits.json' with {type:'json'};
const propagation={'Layering':'layering','Stem Cutting':'stemCuttings','Leaf Cutting':'leafCuttings','Division':'division','Seed':'seeds','Spores':'spores','Offsets':'offsets'};
export function plantDimensionCm(values,dimension='Height'){
 const text=(values||[]).join(' '),section=text.match(new RegExp(dimension+':\\s*(.*?)(?=Height:|Width:|$)','i'));
 if(!section&&/(?:Height|Width):/i.test(text))return null;
 const value=section?section[1]:text;if(/[<>]/.test(value))return null;
 const parts=value.matchAll(/(\d+(?:\.\d+)?)\s*ft\.?\s*(\d+(?:\.\d+)?)\s*in\.?/g);
 const nums=[...parts].map(m=>Math.round((Number(m[1])*30.48+Number(m[2])*2.54)*10)/10);
 return nums.length>=2?[Math.min(...nums),Math.max(...nums)]:null;
}
export function withPlantTraits(e){
 const r=records[e.latin];if(!r||!e.plant)return e;
 const f=r.facts;const growth={'Rapid':'fast','Medium':'moderate','Slow':'slow'}[f['Growth Rate']?.[0]];
 const methods=f['Recommended Propagation Strategy']?.map(v=>propagation[v]).filter(Boolean)||e.plant.propagationMethods;
 const height=plantDimensionCm(f.Height||f.Dimensions);
 const climbing=!!f['Climbing Method']?.length;
 const placements=[...e.plant.placements];
 if(height){if(height[1]<=30)placements.push('foreground','midground');else if(height[1]<=100)placements.push('midground');else placements.push('background-large');}
 const form=(f['Habit/Form']||[]).join(' ');if(/ground cover/i.test(form))placements.push('foreground');if(climbing)placements.push('wall');if(/epiphyt/i.test(form))placements.push('wood-epiphyte');if(e.taxonomyCategories.includes('aquatic-plants'))placements.push('waterside');
 return {...e,plantSource:r,plant:{...e.plant,placements:[...new Set(placements)],placementBasis:e.plant.placementBasis||(placements.length?'NC Extension 성숙 높이·생육형태의 공간 계획 예시. 개별 비바리움 적합성·동물과의 안전성 판정이 아님':null),growthRate:growth||e.plant.growthRate,propagationMethods:methods,finalHeightCm:height,sizeClass:height?(height[1]<=30?'small':height[1]<=100?'medium':'large'):e.plant.sizeClass,plantingMethods:[...new Set([...e.plant.plantingMethods,...climbing?['climbing']:[]])]}};
}
