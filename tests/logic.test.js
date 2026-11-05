import test from 'node:test';
import assert from 'node:assert/strict';
import {entries,catalogCounts,sources} from '../src/data.js';
import {filterEntries,compareEnvironment,overlap,readFavorites,paginate,formatRange} from '../src/logic.js';
test('minimum counts use distinct binomial species, never morphs or duplicate IDs',()=>{
 for(const [kind,min] of Object.entries({reptile:200,amphibian:100,arthropod:100,plant:300})){
  const species=entries.filter(e=>e.kind===kind);assert.ok(species.length>=min);
  assert.equal(new Set(species.map(e=>e.latin)).size,species.length);
  for(const e of species)assert.match(e.latin,/^[A-Z][a-z]+ [a-z][a-z-]+$/);
 }
 assert.equal(new Set(entries.map(e=>e.id)).size,entries.length);
 assert.equal(new Set(entries.map(e=>e.latin)).size,entries.length);
 assert.equal(catalogCounts.vivarium,3);
});
test('requested reptile, amphibian and arthropod sections are present',()=>{
 for(const [kind,groups] of [['reptile',['도마뱀','뱀','거북']],['amphibian',['개구리','도롱뇽','무족영원']],['arthropod',['등각류','거미']]])for(const group of groups)assert.ok(entries.some(e=>e.kind===kind&&e.group===group));
 for(const group of ['열대식물','양치식물','선인장','다육식물','수생·습지식물'])assert.ok(entries.some(e=>e.kind==='plant'&&e.group===group));
});
test('all entries have source links, provenance, care fields and honest climate data',()=>{
 for(const e of entries){
  assert.ok(e.care.length>=3);assert.match(e.source,/^https?:\/\//);
  assert.ok(e.careBasis);
  for(const key of ['temp','humidity'])assert.ok(e[key]===null||Array.isArray(e[key])&&e[key].length===2&&e[key].every(Number.isFinite)&&e[key][0]<=e[key][1],`${e.latin}: ${key}`);
  if(!e.image)assert.ok(e.evidenceId);
 }
 for(const s of sources){assert.match(s.commit,/^[a-f0-9]{40}$/);assert.equal(s.retrievedAt,'2026-11-05');}
});
test('Korean, English, scientific and historic-name search combine with taxonomic filters',()=>{
 assert.ok(filterEntries(entries,{query:'  MONSTERA  '}).some(e=>e.id==='monstera'));
 assert.equal(filterEntries(entries,{kind:'reptile',group:'뱀',query:'볼 파이톤'})[0].latin,'Python regius');
 assert.equal(filterEntries(entries,{kind:'amphibian',query:'Ranoidea caerulea'})[0].id,'whites-tree-frog');
 assert.ok(filterEntries(entries,{kind:'arthropod',group:'등각류',subgroup:'Armadillidiidae'}).length>5);
 assert.equal(filterEntries(entries,{query:'존재하지않는종'}).length,0);
 assert.deepEqual(filterEntries(entries,{favoritesOnly:true,favorites:['monstera','crested-gecko'],kind:'plant'}).map(e=>e.id),['monstera']);
});
test('pagination covers the entire catalog exactly once and clamps invalid pages',()=>{
 const ids=[];const n=paginate(entries).totalPages;
 for(let i=1;i<=n;i++)ids.push(...paginate(entries,i).items.map(e=>e.id));
 assert.deepEqual(ids,entries.map(e=>e.id));
 assert.equal(paginate(entries,-10).page,1);
 assert.equal(paginate(entries,999).page,n);
 assert.equal(paginate(entries,1,48).items.length,48);
 assert.equal(paginate([],999).page,1);assert.equal(paginate([],999).items.length,0);
});
test('comparison distinguishes missing and unverified values from incompatibility',()=>{
 const get=id=>entries.find(e=>e.id===id);
 const r=compareEnvironment(get('fittonia'),get('crested-gecko'));
 assert.equal(r.status,'overlap');assert.deepEqual(r.temperature,[22,26]);assert.deepEqual(r.humidity,[65,80]);
 assert.equal(compareEnvironment(get('java-moss'),get('leopard-gecko')).status,'different');
 const snake=entries.find(e=>e.latin==='Python regius');
 assert.equal(compareEnvironment(snake,get('fittonia')).status,'insufficient');
 const base={...get('fittonia'),comparisonEligible:false};
 assert.equal(compareEnvironment(base,get('crested-gecko')).status,'insufficient');
 assert.equal(overlap(null,[20,30]),null);assert.deepEqual(overlap([20,24],[24,28]),[24,24]);
 assert.equal(formatRange(null,' °C'),'확인 필요');
});
test('favorites recover from corrupt or unavailable storage',()=>{
 for(const value of ['bad','{}','null','123'])assert.deepEqual(readFavorites({getItem:()=>value},['a']),[]);
 assert.deepEqual(readFavorites({getItem:()=>'["a","a","unknown",3]'},['a']),['a']);
 assert.deepEqual(readFavorites({getItem(){throw Error('blocked');}},['a']),[]);
});
