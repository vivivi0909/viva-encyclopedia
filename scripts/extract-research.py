from pathlib import Path
import json,csv,re,collections,subprocess,html
from read_xlsx import read_xlsx
root=Path(__file__).resolve().parents[1];base=Path(__import__('os').environ.get('VIVA_RESEARCH_ROOT','/tmp/viva-research'))
out=[]
# Facts only from a published iNaturalist/Reptile Database export. Retain exact taxon links.
rows=read_xlsx(base/'reptile_taxonomy/Reptiles_iNat_ID.xlsx')[1:]
taxa={re.match('[A-Z][a-z]+ [a-z][a-z-]+',r.get('A','')).group():r for r in rows if re.match('[A-Z][a-z]+ [a-z][a-z-]+',r.get('A',''))}
fix={'Paroedura stumpffi':'Paroedura stumpffii','Lepidothyris fernandi':'Mochlus fernandi','Laudakia stellio':'Stellagama stellio','Gerrhosaurus major':'Broadleysaurus major','Orthriophis taeniurus':'Elaphe taeniura','Ctenosaura defensor':'Cachryx defensor'}
seen=set();missing=[]
for line in (root/'research/reptile-candidates.txt').read_text().splitlines():
 line=line.strip()
 if line.startswith('['):group,subgroup=line[1:-1].split('|');continue
 if not line or line.startswith('#'):continue
 name=fix.get(line,line)
 if name not in taxa:missing.append(line);continue
 if name in seen:continue
 seen.add(name);r=taxa[name]
 out.append({'kind':'reptile','latin':name,'group':group,'subgroup':subgroup,'common':r.get('D','').split('\n')[0].strip(),'origin':r.get('K','').split('\n')[0].strip(),'reproduction':r.get('I','').strip(),'family':r.get('F','').split(',')[0].strip(),'source':r.get('P','').strip() or 'https://reptile-database.reptarium.cz/species?genus='+name.split()[0]+'&species='+name.split()[1],'aliases':[line] if name!=line else [],'evidence':'reptile-taxonomy','careBasis':'학명·분류 대조 / 종별 사육 수치 미검증'})
# Trade records establish recorded live captive-source commercial imports, NOT current legality.
taxfile=sorted((base/'amphibian_taxonomy').glob('amphib_names*'))[-1]
aw=list(csv.DictReader(taxfile.open(),delimiter='\t'));canonical={};aliases={}
for r in aw:
 name=r['genus']+' '+r['species'];canonical[name]=r;aliases[name]=name
 for field in ['gaa_name','synonymies','itis_names']:
  for old in re.findall(r'\b[A-Z][a-z]+ [a-z][a-z-]+\b',r[field]):aliases.setdefault(old,name)
# Keep established historic names searchable after taxonomic revisions.
for old,new in {'Litoria caerulea':'Pelodryas caerulea','Ranoidea caerulea':'Pelodryas caerulea','Cynops orientalis':'Hypselotriton orientalis','Cynops cyanurus':'Hypselotriton cyanurus'}.items():
 if new in canonical:aliases[old]=new
count=collections.Counter();oldnames=collections.defaultdict(set);orders={}
with (base/'amphibian_trade/data/cleaned/harmonized_amphibian_LEMIS_1999_to_2021.csv').open() as f:
 for r in csv.DictReader(f):
  if r['description']!='LIV' or r['purpose']!='T' or r['source'] not in ['C','F']:continue
  old=r['genus_aw']+' '+r['species_aw'];name=aliases.get(old)
  if not name or name in ['Lithobates catesbeianus','Aquarana catesbeiana','Rana catesbeiana','Xenopus laevis','Rhinella marina']:continue
  count[name]+=1;oldnames[name].add(old);orders[name]=canonical[name]['order']
for order,limit,group in [('Anura',80,'개구리'),('Caudata',30,'도롱뇽'),('Gymnophiona',2,'무족영원')]:
 names=sorted([n for n in count if orders[n]==order],key=lambda n:(-count[n],n))[:limit]
 for name in names:
  r=canonical[name]
  out.append({'kind':'amphibian','latin':name,'group':group,'subgroup':r['family'],'family':r['family'],'common':r['common_name'],'origin':r['isocc'],'conservation':r['iucn'],'source':r['uri/guid'],'aliases':sorted(oldnames[name]),'evidence':'amphibian-trade','tradeRecords':count[name],'careBasis':'생체·사육원산(C/F) 상업 거래 기록 / 사육 수치 미검증'})
# Described accepted species only: exclude sp., cf., morphs, strains and provisional identities.
isopods=json.load((base/'isopod-taxonomy/data/isopods.json').open())['records']
for r in isopods:
 if r['record_type']!='form' or not r['is_described'] or r['taxon_status']!='accepted':continue
 name=r['genus']+' '+r['species']
 if not re.fullmatch('[A-Z][a-z]+ [a-z][a-z-]+',name):continue
 out.append({'kind':'arthropod','latin':name,'group':'등각류','subgroup':r['family'],'family':r['family'],'common':r.get('common_name',''),'origin':r.get('origin_region',''),'size':r['adult_size_mm'],'temperature_c':r['temperature_c'],'humidityText':r['humidity'],'difficultyRaw':r['difficulty'],'source':'https://www.gbif.org/species/'+str(r['gbif_id']),'evidence':'isopod-hobby','careBasis':'취미 사육자 합의 기본값 · 개별 계통 측정치 아님'})
# Read numerical facts from public species care pages; no images, code or prose copied.
for p in sorted((base/'tarantulas/STP-2/species').glob('*.html')):
 text=p.read_text();name=re.search(r'<h1>(.*?)</h1>',text,re.S)[1].strip();name=re.sub(r'\s*\(.*','',name)
 if not re.fullmatch('[A-Z][a-z]+ [a-z][a-z-]+',name):continue
 plain=html.unescape(re.sub('<[^>]+>',' ',text));plain=re.sub(r'\s+',' ',plain)
 def interval(label):
  mt=re.search(label+r':?\s*(\d+)\s*[-–]\s*(\d+)',plain,re.I)
  return [int(mt[1]),int(mt[2])] if mt else None
 out.append({'kind':'arthropod','latin':name,'group':'거미','subgroup':'타란툴라','family':'Theraphosidae','common':'','temp':interval('Temperatura'),'humidity':interval('Wilgotność'),'source':'https://github.com/Bobereg/bobereg-tarantulas/blob/'+subprocess.check_output(['git','-C',str(base/'tarantulas'),'rev-parse','HEAD'],text=True).strip()+'/STP-2/species/'+p.name,'evidence':'tarantula-care','careBasis':'공개 취미 사육 가이드 · 전문기관 검증 아님'})
# Prefer species records over cultivars and genus aggregates. Take one record per binomial.
plants=json.load((base/'plantfolio/dist/common_plants.json').open())[1:]
choices={}
def score(r):
 s=r['commonExamples'];return (',' in s or ';' in s, bool(re.search(r"['’‘×]|\b(?:var|hybrid|cultivar)\b",s,re.I)),len(s))
for r in plants:
 match=re.match(r'^([A-Z][a-z]+ [a-z][a-z-]+)\b',r['commonExamples'])
 if not match or re.search(r'\b(?:spp|hybrid)\b|×',r['commonExamples'],re.I):continue
 name=match[1]
 if name not in choices or score(r)<score(choices[name]):choices[name]=r
# Indoor + specialty first, then garden ornamentals. Exclude crop/microgreen duplicates.
selected=sorted(choices.items(),key=lambda x:(0 if x[1]['category'].startswith(('Houseplants','Specialty')) else 1,x[1]['category'],x[0]))
selected=[(n,r) for n,r in selected if r['category'].startswith(('Houseplants','Specialty','Outdoor','Bulbs'))][:340]
for name,r in selected:
 single=not score(r)[0] and not score(r)[1]
 out.append({'kind':'plant','latin':name,'categoryRaw':r['category'],'common':r['typeName'],'origin':r['origin'],'temp':r['temperaturePreference'],'humidityPreference':r['humidityPreference'],'lightPreference':r['lightPreference'],'plantToxicity':r['plantToxicity'],'drainagePreference':r['drainagePreference'],'growthRate':r['growthRate'],'hardinessZones':r['hardinessZones'],'wateringMethod':r.get('wateringMethod'),'sourceId':r['id'],'source':'https://github.com/Luminoid/plantfolio-common-plants','evidence':'plantfolio','careBasis':'종별 재배 참고값' if single else '대표 종에 연결한 속·품종군 기본값','speciesSpecific':single})
(root/'research/evidence.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
manifest=[]
for key,folder,repo,license in [('reptile-taxonomy','reptile_taxonomy','indicwiki-iiit/Reptile-Database','학명·분류·링크 사실만 추출, 서술·사진 미사용'),('amphibian-trade','amphibian_trade','eveskew/amphibian_trade','집계 사실만 사용, 개인/거래처 정보 미포함'),('amphibian-taxonomy','amphibian_taxonomy','AmphibiaWeb/taxonomy-archive','학명·분류·분포국·보전등급 사실'),('isopod-hobby','isopod-taxonomy','Bbeierle12/isopod-research','MIT'),('tarantula-care','tarantulas','Bobereg/bobereg-tarantulas','개별 학명·온습도 사실만 사용, 서술·사진·코드 미사용'),('plantfolio','plantfolio','Luminoid/plantfolio-common-plants','CC BY-NC-SA 4.0; 파생 식물 자료에도 적용')]:
 sha=subprocess.check_output(['git','-C',str(base/folder),'rev-parse','HEAD'],text=True).strip()
 manifest.append({'id':key,'url':'https://github.com/'+repo,'commit':sha,'retrievedAt':'2026-11-05','license':license})
(root/'research/sources.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
(root/'research/plantfolio-LICENSE.txt').write_text((base/'plantfolio/LICENSE').read_text())
(root/'research/isopod-LICENSE.txt').write_text((base/'isopod-taxonomy/LICENSE').read_text())
print('Evidence counts',collections.Counter(r['kind'] for r in out));print('Omitted unmatched reptile candidates',missing)
