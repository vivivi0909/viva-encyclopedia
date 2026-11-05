"""Extract additional factual fields from retained, pinned research inputs.

No unverified enclosure, humidity or temperature value is promoted into matching.
Only short facts, independently worded summaries and source provenance are saved.
"""
import argparse,datetime,hashlib,html,json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];DAY=datetime.date.today().isoformat()
parser=argparse.ArgumentParser();parser.add_argument('--pdf-records',type=Path,default=Path('/tmp/viva-pdf-records.json'));parser.add_argument('--research-root',type=Path,default=Path('/tmp/viva-research'));args=parser.parse_args()
care=json.loads((ROOT/'research/verified-care.json').read_text());evidence=json.loads((ROOT/'research/evidence.json').read_text());sources={r['id']:r for r in json.loads((ROOT/'research/sources.json').read_text())}
pdfs={r['url']:r for r in json.loads(args.pdf_records.read_text())};out={}

def section(text,name):
 match=re.search(r'\n'+name+r'\s*\n',text)
 if not match:return ''
 rest=text[match.end():]
 end=re.search(r'\n(?:Housing|Lighting & UVB|Heating|Humidity|Substrate|Décor|Decor|Food|Supplements|Water|Drinking Water|Handling)\s*\n',rest)
 return rest[:end.start()] if end else rest

def translate(text):
 words={'Hatchlings':'갓 부화한 개체','hatchlings':'갓 부화한 개체','Juveniles':'유체','juveniles':'유체','Subadults':'아성체','subadults':'아성체','Adults':'성체','adults':'성체','Babies':'어린 개체','babies':'어린 개체','Reproductive females':'번식 중인 암컷','Pregnant and postpartum females':'임신·출산 후 암컷','Insects':'곤충','insects':'곤충','vegetables':'채소','CGD':'크레스티드 게코용 완전배합식(CGD)','salad':'채소식','months old':'개월령','months':'개월','month':'개월','weeks old':'주령','weeks':'주','week':'주','years':'년','year':'년','daily':'매일','every other day':'격일','times weekly':'회/주','weekly':'주마다','up to':'이하','over':'초과','longer than':'초과','no longer than':'이하','old':'령','and':'및','every':'매','days':'일','day':'일','Feed':'급여','should be fed':'급여','fed':'급여','once':'1회','as much as they can eat':'먹을 수 있는 양','appropriately-sized insects':'체격에 맞는 크기의 곤충'}
 for old,new in sorted(words.items(),key=lambda row:-len(row[0])):text=re.sub(r'\b'+re.escape(old)+r'\b',new,text)
 return re.sub(r'(\d+)x/',r'\1회/',text.strip(' .'))

for latin,c in care.items():
 if c['scope']!='species' or c['sourceUrl'] not in pdfs:continue
 r=pdfs[c['sourceUrl']];text=r['text'];food=section(text,'Food');substrate=section(text,'Substrate');decor=section(text,'(?:Décor|Decor)');supplements=section(text,'Supplements')
 fields={};diets=[]
 for key,word,label in [('insectivore','insectivor','곤충 중심 식단'),('omnivore','omnivor','식물성·동물성 먹이를 함께 이용하는 잡식 식단'),('herbivore','herbivor','식물성 먹이 중심 식단'),('carnivore','carnivor','동물성 먹이 중심 식단')]:
  if re.search(word,food,re.I):diets.append(key);fields.setdefault('feeding',[]).append(label)
 if re.search(r'crested gecko diet|\bCGD\b',food,re.I):fields.setdefault('feeding',[]).append('원문에 크레스티드 게코용 완전배합식(CGD) 급여가 명시됨')
 if re.search(r'frozen[-\s]+thawed|frozen/thawed',food,re.I):fields.setdefault('feeding',[]).append('원문은 냉동 후 해동한 먹이를 안내함')
 schedules=[]
 for line in food.splitlines():
  line=line.strip().lstrip('•- ').strip()
  if not re.match(r'(?:Hatchlings|Juveniles|Subadults|Adults|Babies|Reproductive females|Pregnant and postpartum females)\b',line):continue
  if not re.search(r'[—:]|should be fed',line):continue
  if len(line)>150:continue
  line=re.sub(r'\s+',' ',line)
  if re.search(r'\b(?:daily|day|week)\b',line,re.I):schedules.append(translate(line))
 if schedules:fields['lifeStages']='원자료의 단계별 급여 예시: '+' / '.join(schedules)
 if fields.get('feeding'):fields['feeding']='. '.join(fields['feeding'])+'. '+('단계별 빈도는 아래 성장 단계별 관리 항목 참조.' if schedules else '체형·연령별 급여량과 빈도는 원자료의 조건 확인.')
 substrate_note=None
 recipe=re.search(r'DIY[^\n]{0,40}mix[^\n]{0,190}',substrate,re.I)
 if recipe and re.search(r'topsoil|coconut|sand',recipe[0],re.I):
  parts=[]
  for key,label in [('topsoil','표토'),('coconut fiber','코코넛 섬유'),('sand','모래'),('clay','점토')]:
   if re.search(key,recipe[0],re.I):parts.append(label)
  substrate_note='원문 배합 예시에 '+', '.join(parts)+' 사용. 배합비·층 깊이·검역 조건은 종별 원문 확인.'
 elif re.search(r'fine sand or sandy soil',substrate,re.I):substrate_note='고운 모래 또는 모래질 토양. 굴파기용 층 깊이는 성별·성장 단계에 따른 원문 조건 확인.'
 elif re.search(r'layer of moistened sphagnum moss',substrate,re.I):substrate_note='수분을 머금은 물이끼층을 바닥재 예시로 제시함. 교체·위생 조건은 원문 확인.'
 elif re.search(r'moistened coconut husk or cypress mulch',substrate,re.I):substrate_note='수분을 머금은 코코넛 껍질 또는 사이프러스 멀치를 제시함.'
 elif re.search(r'drain at the bottom',substrate,re.I):substrate_note='다량의 물로 바닥재가 포화되지 않도록 바닥 배수 구조를 사용하는 방식을 제시함.'
 elif re.search(r'soil and leaf litter',substrate,re.I):substrate_note='토양과 낙엽층을 제시함. 굴파기 공간과 바닥재 깊이는 원문 확인.'
 elif re.search(r'moisture[-\s]+retentive substrate',substrate,re.I):substrate_note='보습성 바닥재를 제시함. 종류·층 깊이와 검역 후 사용 조건은 원문 확인.'
 if substrate_note:fields['substrate']=substrate_note
 structures=[]
 for pattern,label in [(r'cork','코르크 구조물'),(r'hollow logs?','속이 빈 통나무'),(r'(?:thick|sturdy) branches|branches','가지 구조물'),(r'vines','덩굴 구조물'),(r'ledges','선반·턱'),(r'(?:live|artificial) plants|foliage','식물·잎 은폐물'),(r'rock|slate','바위·판석 구조물')]:
  if re.search(pattern,decor,re.I):structures.append(label)
 if structures:fields['hides']='원문 환경 구조 예시: '+', '.join(structures)+'. 배치·고정 방법은 원문 확인.'
 if re.search(r'UVB (?:Lighting|lighting)|UVB lamp',text):fields['uvb']='원자료에 UVB 설치 지침이 있음. 필요 강도·거리·노출 위치는 종별 원문과 측정 조건 확인.'
 single_housing={'Mniarogekko chahoua','Anolis carolinensis','Rhacodactylus leachianus','Epicrates cenchria','Morelia bredli','Morelia spilota','Epicrates maurus','Morelia viridis','Eryx colubrinus','Antaresia maculosa','Chrysemys picta','Clemmys guttata'}
 males_separate={'Sauromalus ater','Correlophus ciliatus','Mochlus fernandi','Rhacodactylus auriculatus','Iguana iguana','Eublepharis macularius','Testudo horsfieldii'}
 if latin in single_housing:fields['cohabitationRisks']='원자료는 단독 사육을 권하거나 복수 개체의 스트레스·자원 경쟁·갈등을 지적함. 다른 종과의 합사 안전성도 확인된 것으로 보지 않음.'
 elif latin in males_separate:fields['cohabitationRisks']='원자료는 수컷끼리의 합사 금지·회피를 명시함. 암수 또는 암컷 조합이 안전하다는 의미는 아니며 개별 분리 사육과 위험 검토가 필요함.'
 elif latin=='Hemitheconyx caudicinctus':fields['cohabitationRisks']='원자료는 개체 간 충돌 시 심각한 부상 가능성을 경고함. 넓은 공간만으로 합사 안전성을 보장하지 않음.'
 elif latin=='Lepidodactylus lugubris':fields['cohabitationRisks']='원자료에 동종 그룹 사육 지침이 있으나, 개체수별 공간·탈출 방지·질병 관리와 다른 종에 대한 위해성을 별도로 검토해야 함.'
 health=[]
 if re.search(r'feces and urates should be removed daily',substrate,re.I):health.append('분변·요산은 매일 제거하고 오염된 바닥재를 부분 교체하는 위생 지침')
 if 'calcium' in supplements.lower():health.append('칼슘 보충 관련 지침이 있으며 제품과 용량·빈도는 해당 종의 원문 조건 확인')
 if health:fields['healthNotes']='. '.join(health)+'.'
 if fields:out[latin]={'sourceUrl':c['sourceUrl'],'sourceTitle':c['sourceTitle']+' · ReptiFiles care sheet','reviewedAt':DAY,'scope':'species husbandry; retain age and source-date qualifications','sourcePdfSha256':hashlib.sha256(Path(r['path']).with_suffix('.pdf').read_bytes()).hexdigest(),'fields':fields,'diets':diets,'cohabitationStatus':'not-recommended' if latin in single_housing else 'review-required'}

source=sources['isopod-hobby'];path=args.research_root/'isopod-taxonomy/data/isopods.json';isopods=json.loads(path.read_text())['records']
translations={
 'Coco fiber + leaf litter kept consistently damp':'코코넛 섬유와 낙엽층; 원문은 지속적인 습윤 관리를 제시함',
 'Coco fiber / topsoil base, deep hardwood leaf litter, rotten wood, cuttlebone for calcium':'코코넛 섬유 또는 표토 바탕, 두꺼운 활엽수 낙엽층, 썩은 목재, 칼슘 공급용 갑오징어뼈',
 'Coco fiber / topsoil, leaf litter, rotten wood, limestone/cuttlebone; add ventilation':'코코넛 섬유 또는 표토, 낙엽, 썩은 목재, 석회석·갑오징어뼈; 환기 추가',
 'Deep coco/topsoil, leaf litter, rotten wood, crushed limestone/oyster shell; keep humid':'깊은 코코넛 섬유·표토, 낙엽, 썩은 목재, 부순 석회석·굴껍데기; 습윤 관리',
 'Deep fine coastal sand, sparse organic matter':'깊은 고운 해안 모래와 소량의 유기물',
 'Deep sand/clay, sparse leaf litter':'깊은 모래·점토층과 소량의 낙엽',
 'Rock / brackish coastal':'바위·기수성 해안 환경을 원자료 바닥 조건으로 기록함',
 'Sandy coastal soil with leaf litter':'모래질 해안 토양과 낙엽층',
 'Sandy coastal substrate with wrack & leaf litter':'모래질 해안 바닥재, 해안 표착 유기물과 낙엽층',
 'Topsoil + sand/limestone, leaf litter, cork/wood hides; strong cross-ventilation':'표토와 모래·석회석, 낙엽, 코르크·목재 은신처; 강한 교차 환기'
}
for entry in evidence:
 if entry.get('group')!='등각류':continue
 r=next((r for r in isopods if r.get('genus','')+' '+r.get('species','')==entry['latin'] and r.get('record_type')=='form' and r.get('taxon_status')=='accepted'),None)
 if not r:continue
 fields={'substrate':translations.get(r.get('substrate')),'bodySizeNotes':'취미 가이드의 성체 크기 기본값: '+r['adult_size_mm'] if r.get('adult_size_mm') else None,'behavior':{'FULL':'몸을 완전히 공 모양으로 마는 행동이 기록됨','PARTIAL':'몸을 부분적으로 마는 행동이 기록됨','NONE':'공 모양으로 몸을 말지 않는 유형으로 기록됨'}.get(r.get('conglobation'))}
 if 'hides' in r.get('substrate',''):fields['hides']='취미 가이드에 코르크·목재 은신처가 명시됨'
 out[entry['latin']]={'sourceUrl':source['url']+'/blob/'+source['commit']+'/data/isopods.json','sourceTitle':'등각류 취미 사육 자료 · MIT','reviewedAt':DAY,'scope':'hobby consensus defaults, not independently verified species husbandry','fields':{k:v for k,v in fields.items() if v},'humidityDescription':r.get('humidity')}

for entry in evidence:
 if entry.get('group')!='거미':continue
 for path in (args.research_root/'tarantulas/STP-2/species').glob('*.html'):
  content=path.read_text();heading=re.search(r'<h1>(.*?)</h1>',content,re.S)
  if not heading or heading[1].strip()!=entry['latin']:continue
  fields={};values={}
  for item in re.findall(r'<li>(.*?)</li>',content,re.S):
   text=' '.join(html.unescape(re.sub('<[^>]+>',' ',item)).split())
   if ':' in text:
    key,value=text.split(':',1);values[key.strip()]=value.strip()
  habitat={'Naziemny':'terrestrial','Nadrzewny':'arboreal','Podziemny':'fossorial'}.get(values.get('Typ'))
  substrate=values.get('Podłoże','')
  parts=[label for pattern,label in [('kokos','코코넛 섬유'),('torf','토탄'),('ziemi','토양'),('piask','모래')] if re.search(pattern,substrate,re.I)]
  if parts:fields['substrate']='공개 취미 가이드 바닥재: '+' · '.join(parts)+'. 깊이·수분 조건은 원문 확인.'
  minimum=re.search(r'(\d+)\s*x\s*(\d+)\s*x\s*(\d+)\s*cm',values.get('Terrarium',''),re.I)
  if minimum:fields['hobbyEnclosureNotes']='취미 가이드의 성체 규격 예시: '+' × '.join(minimum.groups())+' cm. 전문가 검증된 최소 규격으로 사용하지 않음.'
  if re.search(r'parząc\w*\s+włosk|włosk\w*\s+parząc',content):fields['healthNotes']='원문에 자극성 털 방출이 기록됨. 피부·눈·호흡기 노출 위험을 검토하고 직접 취급을 피할 필요가 있음.'
  if fields or habitat:out[entry['latin']]={'sourceUrl':entry['source'],'sourceTitle':'공개 타란툴라 취미 가이드 · 종별 원자료','reviewedAt':DAY,'scope':'hobby guide, not independently verified species husbandry','fields':fields,'habitats':[habitat] if habitat else []}
  break

# The published reptile taxonomy input already contains reproduction facts.
# Only the leading taxon-specific clause is used: later discussion may name other species.
reproduction={}
for e in evidence:
 if e['kind']!='reptile':continue
 leading=e.get('reproduction','').split(';')[0].split('. ')[0].strip().lower()
 if not re.match(r'^(?:oviparous|ovoviviparous|viviparous|parthenogenetic)',leading):continue
 modes=[label for token,label in [(r'\boviparous\b','난생'),(r'\bovoviviparous\b','난태생'),(r'\bviviparous\b','태생'),(r'\bparthenogenetic\b','단위생식')] if re.search(token,leading)]
 if modes:reproduction[e['latin']]={'modes':modes,'sourceUrl':e['source'],'sourceIndex':sources['reptile-taxonomy']['url']+'/tree/'+sources['reptile-taxonomy']['commit'],'reviewedAt':DAY}
(ROOT/'research/verified-care-details.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
(ROOT/'research/reproduction-facts.json').write_text(json.dumps(reproduction,ensure_ascii=False,indent=2)+'\n')
print('Additional care detail records:',len(out),'Reproduction fact records:',len(reproduction))
