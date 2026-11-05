"""Extract bounded factual fields from cached, subject-matched public guides.

Ranges retain measurement roles. A mean and a peak never become a range.
Full prose and photographs are not redistributed. Retail guides remain labeled
reference material, not an independently validated minimum-enclosure standard.
"""
import argparse,datetime,hashlib,json,re
from pathlib import Path
from bs4 import BeautifulSoup
ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--directories',type=Path,nargs='+',required=True);args=parser.parse_args()
labels={'ambient':'사육장 평균 공기','coolSide':'서늘한 구역 · 측정 대상 원문 확인','coolAir':'서늘한 공기','coolHide':'서늘한 은신처','warmHide':'따뜻한 은신처','warmAir':'따뜻한 공기','night':'야간','basking':'가열 지점 · 측정 대상 원문 확인','baskingSurface':'가열 표면','unspecified':'원문 온도 · 측정 구역 확인'}
out={};rejected=[]
def plain(node):return ' '.join(node.get_text(' ',strip=True).split())
def segments(content):
 sections={};key='intro'
 for node in content.children:
  if not getattr(node,'name',None):continue
  if node.name=='h2':
   h=plain(node).lower();key='temperature' if re.search(r'temperatur|heating',h) else 'humidity' if 'humidity' in h else 'substrate' if re.search(r'substrate|bedding',h) else 'decor' if re.search(r'décor|decor|enrichment',h) else 'food' if re.search(r'\beat\b|food|feeding|diet',h) else 'housing' if re.search(r'space|housing|enclosure|tank',h) else 'lighting' if re.search(r'uvb|lighting',h) else 'handling' if re.search(r'handl',h) else 'other'
   continue
  sections.setdefault(key,[]).extend([plain(n) for n in node.select('p,li')] if node.name not in ['p','li'] else [plain(node)])
 return sections
def temp_facts(paragraphs):
 result=[]
 for paragraph in paragraphs:
  for sentence in re.split(r'(?<=[.!?])\s+',paragraph):
   previous=0;skip_until=0
   for m in re.finditer(r'(\d+(?:\.\d+)?)(?:\s*[-–]\s*(\d+(?:\.\d+)?))?\s*°\s*([CF])',sentence):
    if m.start()<skip_until:continue
    start=max(sentence.rfind(',',0,m.start())+1,sentence.rfind(';',0,m.start())+1,previous)
    end=min([p for p in [sentence.find(',',m.end()),sentence.find(';',m.end())] if p>=0] or [len(sentence)])
    context=sentence[start:end].lower();role='unspecified'
    if re.search(r'night',context):role='night'
    elif re.search(r'cool.*hide',context):role='coolHide'
    elif re.search(r'warm.*hide',context):role='warmHide'
    elif re.search(r'basking',context):role='baskingSurface' if 'surface' in context else 'basking'
    elif re.search(r'cool',context):role='coolAir' if 'air' in context else 'coolSide'
    elif re.search(r'ambient|average.*(?:air|temperature)|air.*temperature|daytime.*air',context):role='ambient'
    elif re.search(r'warm.*air',context):role='warmAir'
    values=[float(m[1])]+([float(m[2])] if m[2] else [])
    if any(v<0 or v>160 for v in values):continue
    c=[round((v-32)*5/9,1) for v in values] if m[3]=='F' else values
    # Keep source Celsius if dual units are present; reject contradictory pairs.
    following=re.match(r'\s*\(?\s*(\d+(?:\.\d+)?)(?:\s*[-–]\s*(\d+(?:\.\d+)?))?\s*°C',sentence[m.end():]) if m[3]=='F' else None
    if following:
     published=[float(following[1])]+([float(following[2])] if following[2] else [])
     if len(c)!=len(published) or any(abs(a-b)>2 for a,b in zip(c,published)):continue
     c=published
     skip_until=m.end()+following.end()
    previous=max(skip_until,m.end())
    prefix=sentence[start:m.start()].lower()
    qualifier='lower_limit' if re.search(r'no lower than|as low as|at least|minimum|not.*below',prefix) else 'upper_limit' if re.search(r'no higher than|no more than|not.*exceed|maximum|up to',prefix) else 'range' if len(c)==2 else 'reference_point'
    record={'role':role,'values':c,'unit':'°C','qualifier':qualifier,'sourceValues':values,'sourceUnit':'°'+m[3]}
    if not any(r['role']==role and r['values']==c for r in result):result.append(record)
 return result
def humidity_facts(paragraphs):
 result=[]
 for paragraph in paragraphs:
  for m in re.finditer(r'(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?\s*%',paragraph):
   start=max(paragraph.rfind(',',0,m.start()),paragraph.rfind('.',0,m.start()))+1
   end=min([p for p in [paragraph.find(',',m.end()),paragraph.find('.',m.end())] if p>=0] or [len(paragraph)])
   context=paragraph[start:end].lower()
   role='peak' if re.search(r'spike|peak|up to',context) else 'average_day' if re.search(r'average',context) and re.search(r'daytime|during the day',context) else 'average' if re.search(r'average',context) else 'night' if re.search(r'night',context) else 'day' if re.search(r'daytime|during the day',context) else 'reference'
   values=[int(m[1])]+([int(m[2])] if m[2] else [])
   if any(v>100 for v in values):continue
   record={'role':role,'values':values,'unit':'%'}
   if record not in result:result.append(record)
 return result
def frequency(text):
 if re.search(r'every other day',text,re.I):return '격일'
 m=re.search(r'every\s+(\d+(?:\s*[-–]\s*\d+)?)\s+(days?|weeks?)',text,re.I)
 if m:return '매 '+m[1]+('일' if m[2].lower().startswith('day') else '주')
 m=re.search(r'(\d+(?:\s*[-–]\s*\d+)?)\s*x\s*/\s*(day|week)',text,re.I)
 if m:return m[1]+'회/'+('일' if m[2].lower()=='day' else '주')
 return '매일' if re.search(r'\bdaily\b',text,re.I) else None
def positive_mention(pattern,text):
 for match in re.finditer(pattern,text,re.I):
  start=max(text.rfind('.',0,match.start()),text.rfind(';',0,match.start()))+1
  end=min([p for p in [text.find('.',match.end()),text.find(';',match.end())] if p>=0] or [len(text)])
  clause=text[start:end]
  if not re.search(r"do not|don't|avoid|not recommended|should not|never|unsuitable",clause,re.I):return True
 return False
for directory in args.directories:
 for source in json.loads((directory/'index.json').read_text()):
  if not source.get('species'):continue
  raw=(directory/(hashlib.sha256(source['sourceUrl'].encode()).hexdigest()+'.html')).read_bytes()
  assert hashlib.sha256(raw).hexdigest()==source['sourceSha256']
  soup=BeautifulSoup(raw,'html.parser');content=soup.select_one('.article-content .prose, .article-template__content, .article__content, .article-content .rte')
  s=segments(content);intro=' '.join(s.get('intro',[]));food=' '.join(s.get('food',[]));sub=' '.join(s.get('substrate',[]));decor=' '.join(s.get('decor',[]));housing=' '.join(s.get('housing',[]));fields={}
  temperatures=temp_facts(s.get('temperature',[]));humidity=humidity_facts(s.get('humidity',[]))
  if temperatures:fields['temperatureNotes']=' / '.join(labels[r['role']]+': '+'–'.join(str(v) for v in r['values'])+'°C'+{'lower_limit':' (하한 참고 · 고정 목표 아님)','upper_limit':' (상한 참고 · 고정 목표 아님)','reference_point':' (단일 참고값)','range':''}[r['qualifier']] for r in temperatures)
  if humidity:fields['humidityNotes']=' / '.join({'peak':'분무 등 일시적 최고','average':'평균','average_day':'주간 평균','night':'야간','day':'주간','reference':'원문 참고'}[r['role']]+': '+'–'.join(map(str,r['values']))+'%' for r in humidity)+'. 평균·최고·주야간 값을 하나의 범위로 합치지 않음.'
  diets=[]
  for word,label in [('insectivore','곤충 중심 식단'),('carnivore','동물성 먹이 중심 식단'),('herbivore','식물성 먹이 중심 식단'),('omnivore','식물성·동물성 먹이를 함께 이용하는 잡식 식단')]:
   if re.search(r'\b(?:are|is)\s+(?:(?:primarily|strictly|obligate)\s+)?'+word[:-1]+r'(?:es?|ous)\b',food,re.I):diets.append(word);fields['feeding']=label+'. 연령·체형에 따른 먹이 크기·급여량은 원문 조건 확인.'
  if re.search(r'crested gecko diet|\bCGD\b',food,re.I):
   note=' 원문은 CGD를 가끔 제공하는 간식으로 언급함. 주식으로 해석하지 않음.' if re.search(r'(?:crested gecko diet|\bCGD\b)[^.]{0,100}(?:treat|occasional)',food,re.I) else ' 원문에 게코용 배합식(CGD) 급여 지침이 있음. 주식·간식 여부와 조성은 해당 종의 원문 확인.'
   fields['feeding']=(fields.get('feeding','')+note).strip()
  schedules=[]
  for paragraph in s.get('food',[]):
   stages=list(re.finditer(r'\b(young(?:\s+(?:frogs|lizards|geckos|snakes|turtles))?|juveniles?|adults?|hatchlings?|babies|subadults?)\b',paragraph,re.I))
   for i,m in enumerate(stages):
    portion=paragraph[m.end():stages[i+1].start() if i+1<len(stages) else len(paragraph)][:160]
    if not re.match(r'\s+(?:[a-z-]+\s+){0,3}(?:(?:should|can|must|need|only|are|will)|—|:)',portion,re.I):continue
    if not re.search(r'fed|eat|feeding|feed',portion,re.I):continue
    if re.search(r'\bif\b|depending on',portion,re.I):continue
    f=frequency(portion)
    if f:schedules.append(('성체' if m[1].lower().startswith('adult') else '아성체' if m[1].lower().startswith('subadult') else '유체·어린 개체')+': '+f)
  if schedules:fields['lifeStages']='원문 단계별 급여 예시: '+' / '.join(dict.fromkeys(schedules))+'. 크기·체형·건강 상태와 원문 적용 조건 확인.'
  ingredients=[]
  for pattern,label in [('coconut fiber','코코넛 섬유'),('sphagnum moss','물이끼'),('topsoil','표토'),('soil','토양 기반 배지'),('sand','모래'),('leaf litter','낙엽층'),('cypress mulch','사이프러스 멀치')]:
   if positive_mention(pattern,sub):ingredients.append(label)
  if ingredients:fields['substrate']='원문 바닥재 후보·성분: '+', '.join(ingredients)+'. 배합비·깊이·검역·수분 조건과 피해야 할 재료는 해당 원문 확인.'
  # These are environmental structures, not a claim that every object is a hide.
  structures=[label for pattern,label in [('branches','가지'),('cork','코르크'),('hollow logs','속 빈 통나무'),('plants|foliage','식물·잎 은폐물'),('rocks|rock piles','바위 구조물'),('ledge','선반·턱'),('hide','은신 공간'),('vines','덩굴 구조물')] if re.search(pattern,decor,re.I)]
  if structures:fields['hides']='원문 환경 구조 예시: '+', '.join(structures)+'. 탈락·붕괴·끼임을 막는 배치와 종별 공간 요구 확인.'
  light=' '.join(s.get('lighting',[]))
  if 'UVB' in light:fields['uvb']='원문에 UVB 조명 지침이 있음. 필요성·강도·거리·차광·교체 주기는 종별 원문을 확인하고 다른 종의 값을 적용하지 않음.'
  # Geometry remains a cited example; it is not silently promoted to a verified minimum.
  imperial=re.search(r'(\d+(?:\.\d+)?)\s*(["”\'’])\s*[LWH]?\s*[x×]\s*(\d+(?:\.\d+)?)\s*(["”\'’])\s*[LWH]?\s*[x×]\s*(\d+(?:\.\d+)?)\s*(["”\'’])',housing,re.I)
  if imperial:
   cm=[round(float(imperial[i])*(30.48 if imperial[i+1] in ["'",'’'] else 2.54),1) for i in [1,3,5]]
   fields['careEnclosureNotes']='공개 사육 가이드 규격 예시: '+' × '.join(map(str,cm))+' cm(원문 표기 순서). 대상 연령·개체수·방향·최소/권장 구분을 원문에서 확인해야 하며 검증된 최소 규격으로 자동 사용하지 않음.'
  life=re.search(r'\b(?:live|lifespan|life span)\b[^.!?]{0,45}?(\d+)\s*[-–]\s*(\d+)\s*years',intro,re.I)
  if life:fields['lifespanNotes']='사육 가이드의 수명 범위 기록: '+life[1]+'–'+life[2]+'년. 사육 조건과 원문 시점을 확인; 자연사 평균·최대 기록과 구분.'
  size=re.search(r'(\d+(?:\.\d+)?(?:\s*[-–]\s*\d+(?:\.\d+)?)?)\s*([”"″]|cm|mm|inches|feet)\s*(?:long|frogs|lizards|snakes|geckos|turtles|in length)',intro,re.I)
  if size:fields['bodySizeNotes']='원문 몸길이 기록: '+size[1]+{'”':'인치','"':'인치','″':'인치','inches':'인치','feet':'피트'}.get(size[2],size[2])+'. 성별·성장 단계·측정 부위는 원문 확인.'
  behaviors=[label for pattern,label in [(r'\bnocturnal\b','야행성'),(r'\bdiurnal\b','주행성'),(r'\bcrepuscular\b','박명성'),(r'\barboreal\b','수목 생활'),(r'\bterrestrial\b','지상 생활'),(r'\bburrowing\b','굴파기 생활')] if re.search(pattern,intro,re.I)]
  if behaviors:fields['behavior']='사육 가이드의 생활 특성: '+' · '.join(behaviors)+'. 개체의 취급 적응·합사 안전성은 별도 검토.'
  if re.search(r'supplement|calcium',food,re.I):fields['healthNotes']='원문에 영양 보충 관련 지침이 있음. 칼슘·비타민 제품, 용량·빈도와 연령별 조건은 원문 확인.'
  if len(source['species'])>1:
   # The link is retained as a group reference; no shared numerical parameter or
   # apparent common behavior is asserted as a verified fact for each species.
   fields={'groupCareNotes':'여러 종을 함께 다루는 입문 가이드가 있음. '+', '.join(source['species'])+'를 다루며, 공통 지침을 종별 검증값으로 간주하지 않음.'}
  record={k:source[k] for k in ['sourceUrl','sourceTitle','sourceSha256','reviewedAt','sourcePublishedAt','scope','matchedNames']}
  publication=re.search(r'"datePublished"\s*:\s*"([^"]+)"',raw.decode('utf-8',errors='replace'))
  if publication:record['sourcePublishedAt']=publication[1]
  activity=[key for key,word in [('day','diurnal'),('night','nocturnal'),('twilight','crepuscular')] if positive_mention(r'\b'+word+r'\b',intro)]
  habitats=[key for key,word in [('arboreal','arboreal'),('terrestrial','terrestrial'),('fossorial','burrowing')] if positive_mention(r'\b'+word+r'\b',intro)]
  record.update(fields=fields,temperatureFacts=temperatures if source['scope']=='species' else [],humidityFacts=humidity if source['scope']=='species' else [],diets=diets if source['scope']=='species' else [],sourceKind='retail species-care guide; factual reference, not independent expert review')
  record.update(activities=activity if source['scope']=='species' else [],habitats=habitats if source['scope']=='species' else [])
  for latin in source['species']:
   if latin not in out or (out[latin]['scope']!='species' and source['scope']=='species'):out[latin]=record
(ROOT/'research/verified-care-articles.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print('Species with referenced care articles:',len(out),'individual-species guides:',sum(r['scope']=='species' for r in out.values()))
