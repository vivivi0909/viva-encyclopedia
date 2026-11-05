import {filterEntries} from './logic.js';
export function findComparisonOptions(entries,{kind='all',group='all',query='',resultsOnly=false,page=1}={},catalogResults=[]){
 const source=resultsOnly?catalogResults:entries;
 const matches=filterEntries(source.filter(e=>e.kind!=='vivarium'),{kind,group,query});
 const pages=Math.max(1,Math.ceil(matches.length/6));const current=Math.max(1,Math.min(pages,Number(page)||1));
 return {items:matches.slice((current-1)*6,current*6),total:matches.length,page:current,pages};
}
