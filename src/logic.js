import {matchesFacets,isAnimal} from './taxonomy.js';
export function filterEntries(entries, {kind='all',query='',group='all',subgroup='all',difficulty='all',environment='all',favoritesOnly=false,favorites=[],facets=null}={}) {
 const q=query.normalize('NFKC').trim().toLocaleLowerCase();
 return entries.filter(e=>(kind==='all'||kind==='animal'&&isAnimal(e)||e.kind===kind)&&(group==='all'||e.group===group)&&(subgroup==='all'||e.subgroup===subgroup)&&(difficulty==='all'||e.difficulty===difficulty)&&(environment==='all'||e.environment===environment)&&(!favoritesOnly||favorites.includes(e.id))&&matchesFacets(e,facets)&&(!q||[e.name,e.latin,e.group,e.subgroup,e.family,e.environment,...e.aliases||[]].join(' ').normalize('NFKC').toLocaleLowerCase().includes(q)));
}
export function validRange(value){return Array.isArray(value)&&value.length===2&&value.every(Number.isFinite)&&value[0]<=value[1];}
export function formatRange(value,unit=''){return validRange(value)?value.join('–')+unit:'확인 필요';}
export function overlap(a,b){
 if(!validRange(a)||!validRange(b))return null;
 const min=Math.max(a[0],b[0]),max=Math.min(a[1],b[1]);
 return min<=max?[min,max]:null;
}
export function compareEnvironment(a,b){
 const missing=[];
 for(const [key,label] of [['temp','온도'],['humidity','습도']])for(const e of [a,b])if(!validRange(e[key]))missing.push(e.name+' '+label);
 if(a.comparisonEligible===false||b.comparisonEligible===false)missing.push('종별 검증이 필요한 참고값');
 if((a.tempRole||'ambient')!==(b.tempRole||'ambient'))missing.push('온도 측정 구역이 달라 직접 비교할 수 없음');
 const temperature=overlap(a.temp,b.temp),humidity=overlap(a.humidity,b.humidity);
 return {temperature,humidity,missing,status:missing.length?'insufficient':temperature&&humidity?'overlap':'different',compatible:!missing.length&&!!temperature&&!!humidity};
}
export function paginate(entries,page=1,pageSize=24){
 const size=[24,48,96].includes(Number(pageSize))?Number(pageSize):24;
 const totalPages=Math.max(1,Math.ceil(entries.length/size));
 const current=Math.max(1,Math.min(totalPages,Math.floor(Number(page))||1));
 return {items:entries.slice((current-1)*size,current*size),page:current,pageSize:size,totalPages,total:entries.length};
}
export function readFavorites(storage,validIds){
 try{const value=JSON.parse(storage.getItem('viva-favorites')||'[]');return Array.isArray(value)?[...new Set(value.filter(id=>validIds.includes(id)))]:[];}catch{return [];}
}
