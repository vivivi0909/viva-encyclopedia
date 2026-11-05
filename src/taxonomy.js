// Taxon, habitat position and climate are independent, extensible facets.
export const plantCategories=[
 ['foliage','관엽식물'],['ferns','양치·석송류'],['mosses','이끼류'],['vines-epiphytes','덩굴·착생식물'],['bromeliads','브로멜리아류'],['orchids','난초류'],['aquatic-plants','수생·반수생식물'],['carnivorous','식충식물']
];
export const plantPlacements=[['wall','벽면·배경용'],['foreground','바닥·전경용'],['midground','중경·포인트용'],['background-large','후경·대형 식재용'],['wood-epiphyte','유목·착생용'],['waterside','수변·수중용']];
export const animalCategories=[['lizards','도마뱀류'],['snakes','뱀류'],['frogs','개구리·두꺼비류'],['salamanders','도롱뇽·뉴트류'],['isopods','등각류'],['arachnids','거미·전갈류'],['insects','곤충류'],['molluscs','달팽이·연체동물'],['aquatic-inverts','수생 무척추동물'],['turtles','거북류'],['caecilians','무족영원류']];
export const habitatPositions=[['arboreal','수목성'],['terrestrial','지상성'],['fossorial','굴파기·지중성'],['semiaquatic','반수생'],['aquatic','수생']];
export const climateTypes=[['dry','건조·반건조 환경'],['humid','습윤 환경'],['temperate','온대·계절형']];
export const isAnimal=e=>!['plant','vivarium'].includes(e.kind);
export const categoryLabels=Object.fromEntries([...plantCategories,...animalCategories]);
export const habitatLabels=Object.fromEntries([...habitatPositions,...climateTypes]);
const genera=(name,list)=>list.split(' ').includes(name);
export function plantTypes(e){
 const g=e.latin.split(' ')[0],types=[];
 if(genera(g,'Nephrolepis Adiantum Asplenium Platycerium Davallia Phlebodium Pteris Selaginella Lycopodium Microsorum Bolbitis Ceratopteris Azolla Salvinia')||e.group==='양치식물')types.push('ferns');
 if(genera(g,'Taxiphyllum Vesicularia Leucobryum Sphagnum Hypnum Dicranum Thuidium Riccardia Marchantia Fissidens'))types.push('mosses');
 if(e.group==='덩굴식물'||genera(g,'Hoya Dischidia Epipremnum Scindapsus Rhaphidophora')||e.latin==='Ficus pumila')types.push('vines-epiphytes');
 if(genera(g,'Tillandsia Guzmania Vriesea Neoregelia Cryptanthus Aechmea Billbergia Ananas Dyckia'))types.push('bromeliads');
 if(genera(g,'Phalaenopsis Dendrobium Cattleya Cymbidium Paphiopedilum Ludisia Macodes Vanilla Oncidium Miltonia Brassia Masdevallia Pleione Epidendrum'))types.push('orchids');
 if(e.group==='수생·습지식물')types.push('aquatic-plants');
 if(e.group==='식충식물')types.push('carnivorous');
 if(!types.length&&['관엽식물','열대식물','고무나무','야자','다육식물','선인장'].includes(e.group))types.push('foliage');
 return types;
}
export function animalTypes(e){
 const mapping={'도마뱀':['lizards'],'뱀':['snakes'],'개구리':['frogs'],'도롱뇽':['salamanders'],'등각류':['isopods'],'거미':['arachnids'],'전갈':['arachnids'],'곤충':['insects'],'거북':['turtles'],'무족영원':['caecilians']};
 const result=[...mapping[e.group]||[]];
 // Coastal terrestrial isopods are not automatically classified as aquatic.
 return result;
}
export const emptyFacets=()=>({categories:[],placements:[],habitats:[],climates:[],temperatures:[],humidities:[],lights:[],growthRates:[],difficulties:[],sizes:[],planting:[],activities:[],diets:[],bioactive:[],cohabitation:[],enclosures:[]});
export const temperatureOptions=[['cool','서늘함 (0–18°C)'],['mild','온화함 (18–24°C)'],['warm','따뜻함 (24–30°C)'],['hot','고온 (30–45°C)'],['unknown','수치 확인 필요']];
export const humidityOptions=[['low','낮음 (0–40%)'],['medium','보통 (40–70%)'],['high','높음 (70–100%)'],['unknown','수치 확인 필요']];
const ranges={temperatures:{cool:[0,18],mild:[18,24],warm:[24,30],hot:[30,45]},humidities:{low:[0,40],medium:[40,70],high:[70,100]}};
const any=(selected,values)=>!selected?.length||selected.some(v=>(values?.length?values:['unknown']).includes(v));
export function matchesFacets(e,facets){
 if(!facets)return true;
 if(!any(facets.categories,e.taxonomyCategories)||!any(facets.placements,e.plant?.placements)||!any(facets.habitats,e.animal?.habitats)||!any(facets.climates,e.animal?.climates))return false;
 for(const [key,value] of [['temperatures',e.temp],['humidities',e.humidity]])if(facets[key]?.length&&!facets[key].some(option=>option==='unknown'?!Array.isArray(value):Array.isArray(value)&&ranges[key][option]&&Math.max(value[0],ranges[key][option][0])<=Math.min(value[1],ranges[key][option][1])))return false;
 const fields={lights:[e.plant?.lightClass],growthRates:[e.plant?.growthRate],difficulties:[e.difficulty],sizes:[e.plant?.sizeClass||e.animal?.sizeClass],planting:e.plant?.plantingMethods,activities:e.animal?.activities,diets:e.animal?.diets,bioactive:[e.animal?.bioactiveStatus],cohabitation:[e.animal?.cohabitationStatus],enclosures:[e.animal?.enclosureClass]};
 return Object.entries(fields).every(([key,values])=>any(facets[key],values?.filter(Boolean)));
}
