import test from 'node:test';
import assert from 'node:assert/strict';
import {entries} from '../src/data.js';
import {plantCategories,animalCategories,emptyFacets,matchesFacets} from '../src/taxonomy.js';
import {filterEntries} from '../src/logic.js';
import {findComparisonOptions} from '../src/compare-picker.js';
import {enclosureFits,reverseMatch,plantCandidate} from '../src/habitat-matching.js';
test('multi-select taxonomic categories OR within a facet and AND between independent facets',()=>{
 const f=emptyFacets();f.categories=['ferns','mosses'];
 const plants=filterEntries(entries,{kind:'plant',facets:f});
 assert.ok(plants.some(e=>e.latin==='Taxiphyllum barbieri'));assert.ok(plants.some(e=>e.latin==='Nephrolepis exaltata'));
 f.placements=['wood-epiphyte'];const result=filterEntries(entries,{kind:'plant',facets:f});
 assert.ok(result.some(e=>e.latin==='Taxiphyllum barbieri'));assert.ok(!result.some(e=>e.latin==='Nephrolepis exaltata'));
 assert.equal(plantCategories.length,8);assert.ok(animalCategories.some(c=>c[0]==='turtles'));
});
test('multiple habitats remain separate from climate and are searchable independently',()=>{
 const snake=entries.find(e=>e.latin==='Pantherophis guttatus');assert.ok(snake.animal.habitats.includes('arboreal'));assert.ok(snake.animal.habitats.includes('terrestrial'));
 assert.ok(!snake.animal.habitats.includes('dry'));
 const f=emptyFacets();f.habitats=['arboreal','terrestrial'];assert.equal(matchesFacets(snake,f),true);
 f.climates=['dry'];assert.equal(matchesFacets({...snake,animal:{...snake.animal,climates:[]}},f),false);
});
test('comparison option search uses six bounded results and can restrict to the catalog search',()=>{
 assert.equal(findComparisonOptions(entries).items.length,6);
 const source=filterEntries(entries,{query:'Pantherophis guttatus'});
 const result=findComparisonOptions(entries,{resultsOnly:true},source);assert.equal(result.total,1);assert.equal(result.items[0].latin,'Pantherophis guttatus');
 assert.ok(findComparisonOptions(entries,{kind:'plant',query:'Fittonia'}).items.every(e=>e.kind==='plant'));
});
test('reverse search respects floor area, height, body data, ventilation and thermal gradient',()=>{
 const dimensions=[45,45,60];assert.equal(enclosureFits(dimensions,[40,30,70]),false);assert.equal(enclosureFits(dimensions,[30,40,50]),true);assert.equal(enclosureFits(dimensions,null),null);
 const e={kind:'reptile',temp:[22,26],humidity:[60,80],animal:{habitats:['arboreal'],climates:['humid'],minEnclosureCm:[40,40,60],adultSizeCm:[10,12],ventilation:'source-backed airflow requirement',thermalGradient:{coolAir:[22,24],baskingSurface:[28,30]}}};
 const c={dimensions,temp:[22,26],humidity:[70,90],habitats:['arboreal'],ventilated:true,thermalGradient:true};
 assert.equal(reverseMatch(e,c).status,'review-candidate');
 assert.equal(reverseMatch({...e,animal:{...e.animal,minEnclosureCm:[60,60,90]}},c).status,'different');
 assert.equal(reverseMatch({...e,animal:{...e.animal,ventilation:null}},c).status,'insufficient');
 assert.equal(reverseMatch({...e,temp:null},c).status,'insufficient');
 assert.equal(reverseMatch(e,{...c,thermalGradient:false}).status,'different');
});
test('plant matching never declares safe cohabitation based on shared numeric ranges',()=>{
 const animal={temp:[22,26],humidity:[60,80]};const plant={temp:[20,28],humidity:[70,90],toxicity:'독성 보고'};
 assert.equal(plantCandidate(animal,plant).status,'risk');
 assert.equal(plantCandidate(animal,{...plant,toxicity:'자료 불충분'}).status,'review-candidate');
 assert.equal(plantCandidate(animal,{...plant,humidity:null}).status,'insufficient');
});
test('attached photographs retain photographer, license, original source and file hashes',()=>{
 for(const e of entries.filter(e=>e.photo)){
  assert.ok(e.photo.photographer);assert.ok(e.photo.license);assert.match(e.photo.sourcePage,/^https:\/\//);assert.match(e.photo.licenseUrl,/^https:\/\//);assert.match(e.photo.sha256,/^[a-f0-9]{64}$/);assert.ok(!e.image.includes('/images/'));assert.ok(!e.tile);
 }
});
test('45×45×60 high-humidity arboreal example uses source-specific adult constraints',()=>{
 const c={dimensions:[45,45,60],temp:[22,28],humidity:[70,90],habitats:['arboreal'],ventilated:true,thermalGradient:true};
 const mourning=entries.find(e=>e.latin==='Lepidodactylus lugubris');const crested=entries.find(e=>e.latin==='Correlophus ciliatus');
 assert.equal(reverseMatch(mourning,c).status,'review-candidate');
 assert.equal(reverseMatch(crested,c).status,'different');
 assert.ok(crested.animal.minEnclosureCm[2]>60);
 assert.ok(reverseMatch(mourning,c).reasons.some(r=>r.includes('개체수')));
});
test('reverse plant search requires sourced mature height and exposes toxicity reports',()=>{
 const c={dimensions:[45,45,60],temp:[22,28],humidity:[70,90]};
 const plant={kind:'plant',temp:[20,28],humidity:[60,90],plant:{sizeClass:'large',finalHeightCm:null},taxonomyCategories:[],toxicity:'독성 보고'};
 assert.equal(reverseMatch(plant,c).status,'insufficient');
 assert.equal(reverseMatch({...plant,plant:{...plant.plant,finalHeightCm:[80,120]}},c).status,'different');
 const candidate=reverseMatch({...plant,plant:{...plant.plant,finalHeightCm:[10,20]}},c);
 assert.equal(candidate.status,'review-candidate');assert.ok(candidate.reasons.some(r=>r.includes('독성')));
});
