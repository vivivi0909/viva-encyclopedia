import test from 'node:test';
import assert from 'node:assert/strict';
import {entries} from '../src/data.js';
import {withEnrichment} from '../src/enrichment.js';
import {plantDimensionCm} from '../src/plant-traits.js';
import {sourceStatistic} from '../src/fact-labels.js';
import {plantCandidate,reverseMatch} from '../src/habitat-matching.js';
import careArticles from '../research/verified-care-articles.json' with {type:'json'};
const species=latin=>entries.find(e=>e.latin===latin);

test('source-specific enrichment never fills another species or missing numeric husbandry',()=>{
 const gecko=species('Eublepharis macularius');
 const base={...gecko,temp:null,humidity:null,comparisonEligible:false,animal:{...gecko.animal,minEnclosureCm:null,adultSizeCm:null,ventilation:null,thermalGradient:null}};
 const enriched=withEnrichment(base);
 assert.equal(enriched.temp,null);assert.equal(enriched.humidity,null);assert.equal(enriched.animal.minEnclosureCm,null);assert.equal(enriched.animal.adultSizeCm,null);assert.equal(enriched.animal.ventilation,null);
 assert.ok(enriched.animal.feeding);assert.ok(enriched.enrichmentSources.length);
 const unknown=withEnrichment({...base,latin:'Unmatched example',animal:{...base.animal,feeding:null,breeding:null}});
 assert.equal(unknown.animal.feeding,null);assert.equal(unknown.animal.breeding,null);assert.deepEqual(unknown.enrichmentSources,[]);
});

test('plant height and width are parsed independently for enclosure comparison',()=>{
 const dimensions=['Height: 0 ft. 3 in. - 0 ft. 8 in.','Width: 3 ft. 0 in. - 6 ft. 0 in.'];
 assert.deepEqual(plantDimensionCm(dimensions),[7.6,20.3]);
 assert.deepEqual(plantDimensionCm(dimensions,'Width'),[91.4,182.9]);
 assert.equal(plantDimensionCm(['Width: 3 ft. 0 in. - 6 ft. 0 in.']),null);
 assert.equal(plantDimensionCm(['Height: > 6 ft. 0 in.']),null);
});

test('averages, sexes and captivity qualifiers remain separate lifespan observations',()=>{
 const female=sourceStatistic({label:'Average lifespan Sex: female Status: captivity',value:'4.9 years'});
 const wild=sourceStatistic({label:'Range lifespan Status: wild',value:'2 to 7 years'});
 assert.match(female.label,/평균.*사육 기록.*암컷/);assert.match(wild.label,/범위.*야생/);assert.equal(female.value,'4.9 년');
 const frog=species('Pelodryas caerulea');assert.equal(frog.animal.lifespanYears,null);assert.match(frog.animal.lifespanNotes,/16.0/);assert.match(frog.animal.lifespanNotes,/8.5/);
});

test('reported plant toxicity stays a risk for animal matching',()=>{
 const plant=species('Monstera deliciosa');assert.match(plant.toxicity,/독성 보고/);assert.match(plant.plant.poisonEvidence,/고양이/);
 const animal={temp:plant.temp,humidity:plant.humidity};assert.equal(plantCandidate(animal,plant).status,'risk');
 assert.equal(plantCandidate(animal,{...plant,toxicity:'자극성 보고'}).status,'risk');
});

test('water temperatures and upper limits cannot become air-temperature suitability',()=>{
 const axolotl=species('Ambystoma mexicanum'),newt=species('Pleurodeles waltl');
 assert.deepEqual(axolotl.temp,[16,18]);assert.equal(axolotl.tempRole,'water');assert.equal(axolotl.humidity,null);assert.equal(axolotl.animal.minEnclosureCm,null);
 assert.equal(newt.temp,null);assert.match(newt.animal.temperatureNotes,/21°C/);
 const forced={...axolotl,humidity:[60,90],animal:{...axolotl.animal,minEnclosureCm:[30,30,30],ventilation:'verified',thermalGradient:{},adultSizeCm:[18,35]}};
 const result=reverseMatch(forced,{dimensions:[100,60,60],temp:[16,18],humidity:[60,90],ventilated:true,thermalGradient:true});
 assert.equal(result.status,'insufficient');assert.ok(result.reasons.some(r=>r.includes('공기 온도')));
 assert.equal(reverseMatch(forced,{dimensions:[100,60,60],temp:[22,28],humidity:[60,90],ventilated:true,thermalGradient:true}).status,'insufficient');
});

test('unverified hobby cage examples stay out of minimum enclosure matching',()=>{
 const spider=species('Acanthoscurria geniculata');assert.ok(spider.animal.hobbyEnclosureNotes);assert.equal(spider.animal.minEnclosureCm,null);
 const isopod=species('Armadillidium vulgare');assert.match(isopod.animal.bodySizeNotes,/취미 가이드/);assert.equal(isopod.animal.adultSizeCm,null);
});

test('a source mean and misting peak never become a fabricated humidity range',()=>{
 const frog=species('Pelodryas caerulea'),facts=careArticles[frog.latin].humidityFacts;
 assert.ok(facts.some(f=>f.role==='average'&&f.values.length===1&&f.values[0]===50));
 assert.ok(facts.some(f=>f.role==='peak'&&f.values.length===1&&f.values[0]===70));
 assert.equal(frog.humidity,null);assert.match(frog.humidityLabel,/평균 50%.*최고 70%/);assert.equal(frog.comparisonEligible,false);
});

test('new care guides distinguish a treat and an enclosure example from staple food and verified minima',()=>{
 const gecko=species('Gekko vittatus'),basilisk=species('Basiliscus plumifrons');
 assert.match(gecko.animal.feeding,/CGD.*간식/);assert.match(gecko.animal.feeding,/주식으로 해석하지 않음/);
 assert.ok(basilisk.animal.careEnclosureNotes);assert.equal(basilisk.animal.minEnclosureCm,null);
 assert.deepEqual(basilisk.temp,[26.7,29.4]);assert.equal(basilisk.tempRole,'ambient');
 assert.ok(careArticles[basilisk.latin].temperatureFacts.some(f=>f.role==='basking'&&f.values[0]===32.2));
 const forced={...gecko,animal:{...gecko.animal,minEnclosureCm:[30,30,30],adultSizeCm:[20,25],ventilation:'verified',thermalGradient:{}}};
 assert.equal(reverseMatch(forced,{dimensions:[100,80,100],temp:gecko.temp,humidity:gecko.humidity,ventilated:true,thermalGradient:true}).status,'insufficient');
});

test('multi-species guides and qualitative plant humidity do not acquire numeric care parameters',()=>{
 for(const record of Object.values(careArticles).filter(r=>r.scope!=='species')){assert.deepEqual(record.temperatureFacts,[]);assert.deepEqual(record.humidityFacts,[]);assert.ok(record.fields.groupCareNotes);}
 const plants=entries.filter(e=>e.plant&&!e.humidity&&e.humidityLabel);assert.ok(plants.length>200);
 assert.ok(plants.every(e=>e.humidity===null&&!/\d+\s*%/.test(e.humidityLabel)));
});
