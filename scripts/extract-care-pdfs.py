from pathlib import Path
import json,re,hashlib
root=Path(__file__).resolve().parents[1];records=json.load(open('/tmp/viva-pdf-records.json'));catalog=json.load(open(root/'research/evidence.json'));names={e['latin'] for e in catalog}
fix={'Chelonoidis carbonaria':'Chelonoidis carbonarius','Geochelone sulcata':'Centrochelys sulcata'};out={};issues=[]
def temp(line):
 m=re.search(r'(\d{2,3}(?:\.\d+)?)\s*(?:[-–]\s*(\d{2,3}(?:\.\d+)?))?\s*°?F',line,re.I)
 if not m:return None
 f=[float(m[1]),float(m[2] or m[1])];c=[round((v-32)*5/9,1) for v in f]
 cm=re.search(r'(\d{1,2}(?:\.\d+)?)\s*(?:[-–]\s*(\d{1,2}(?:\.\d+)?))?\s*°?C',line,re.I)
 if cm and any(abs(c[i]-float(cm[i+1] or cm[1]))>2 for i in [0,1]):issues.append({'line':line.strip(),'reason':'Celsius/Fahrenheit disagreement'});return None
 return c
for r in records:
 t=r.get('text','');header=' '.join(t[:650].split());matches=[n for n in names if n in header]
 for old,new in fix.items():
  if old in header:matches.append(new)
 if len(set(matches))!=1:continue
 latin=matches[0];label=r['label']
 if 'Northern Emerald' in label and latin!='Corallus caninus':issues.append({'label':label,'reason':'downloaded PDF species differs from link label'});continue
 if latin=='Tiliqua scincoides' and 'Northern Blue' not in label:continue
 if latin=='Tiliqua gigas' and not label.startswith('Indonesian'):continue
 if latin=='Terrapene carolina' and not label.startswith('Eastern'):continue
 profile={};facts=[]
 scope='group' if re.search(r'\([A-Z][a-z]+ spp?\.?\)',header) else 'species'
 for line in t.splitlines():
  value=temp(line)
  if not value:continue
  ll=line.lower()
  role='coolHide' if 'cool hide' in ll else 'warmHide' if 'warm hide' in ll else 'baskingSurface' if 'basking surface' in ll or 'basking' in ll else 'coolAir' if any(w in ll for w in ['cool side','cool zone','cool end','cool hide']) else 'warmAir' if 'warm side' in ll else 'ambient' if any(w in ll for w in ['average air','daytime air','ambient temperature']) else None
  if role and role not in profile and (':' in line or 'temperature' in ll):profile[role]=value;facts.append({'label':role,'range':value,'unit':'°C','statement':line.strip()})
 # Only take explicit ranges next to a humidity statement; preserve source wording for context.
 sections=list(re.finditer(r'\n(?:Water\s*&\s*)?Humidity\s*\n',t,re.I))
 h=t[sections[0].end():sections[0].end()+1500] if sections else ''
 hm=re.search(r'(\d{2})\s*[-–]\s*(\d{2})\s*%',h)
 humidity=[int(hm[1]),int(hm[2])] if hm else None
 if hm:facts.append({'label':'humidity','range':humidity,'unit':'%','statement':' '.join(h[max(0,hm.start()-60):hm.end()+70].split())})
 # Prefer published metric enclosure dimensions when a single line provides them.
 enclosure=None;enclosure_line=None
 for line in t.splitlines():
  if not re.search(r'enclosure|terrarium|aquarium|tank',line,re.I):continue
  metric=re.search(r'(\d+(?:\.\d+)?)\s*[LWH]?\s*[x×]\s*(\d+(?:\.\d+)?)\s*[LWH]?\s*[x×]\s*(\d+(?:\.\d+)?)\s*(?:[LWH]\s*)?cm',line,re.I)
  imperial=re.search(r'(\d+(?:\.\d+)?)\s*([’\'”\"])\s*[LWH]?\s*[x×]\s*(\d+(?:\.\d+)?)\s*([’\'”\"])\s*[LWH]?\s*[x×]\s*(\d+(?:\.\d+)?)\s*([’\'”\"])',line)
  if metric:enclosure=[float(metric[i]) for i in [1,2,3]]
  elif imperial:enclosure=[round(float(imperial[i])* (30.48 if imperial[i+1] in ["'",'’'] else 2.54),1) for i in [1,3,5]]
  if enclosure:enclosure_line=line.strip();break
 intro=' '.join(t[:2000].split());adult=None
 size=re.search(r'(\d+(?:\.\d+)?)\s*(?:[-–]\s*(\d+(?:\.\d+)?))?\s*[”\"]\s*(?:long|lizards|snakes|geckos)',intro,re.I)
 if size:adult=[round(float(size[i] or size[1])*2.54,1) for i in [1,2]]
 habitats=[];climates=[]
 if re.search('semi-arboreal',t[:4500],re.I):habitats+=['arboreal','terrestrial']
 elif re.search(r'\barboreal\b',t[:4500],re.I):habitats+=['arboreal']
 if re.search(r'\b(?:terrestrial|ground-dwelling|land based)\b',t[:4500],re.I):habitats+=['terrestrial']
 if re.search(r'\b(?:fossorial|burrowing lizards|burrowing snakes)\b',t[:2000],re.I):habitats+=['fossorial']
 if re.search(r'semi-aquatic|semiaquatic',t[:4500],re.I):habitats+=['semiaquatic','terrestrial','aquatic']
 elif re.search(r'\baquatic\b',t[:1800],re.I):habitats+=['aquatic']
 if re.search(r'\b(?:arid|semiarid|semi-arid|deserts?)\b',intro,re.I):climates+=['dry']
 if re.search(r'\b(?:rainforests?|humid forests?)\b',intro,re.I):climates+=['humid']
 diets=[key for key,pattern in [('insectivore','insectivor'),('carnivore','carnivor'),('herbivore','herbivor'),('omnivore','omnivor')] if re.search(pattern,t[:5000],re.I)]
 activities=[key for key,pattern in [('day','diurnal'),('night','nocturnal'),('twilight','crepuscular')] if re.search(pattern,t[:5500],re.I)]
 ventilation='충분한 환기가 필요함 · 원자료 사육장 지침 확인' if re.search('good ventilation|well.ventilated|well ventilated',t,re.I) else None
 lifespan=re.search(r'(\d+)\s*(?:[-–]\s*(\d+))?\s*year',intro,re.I)
 life=[int(lifespan[1]),int(lifespan[2] or lifespan[1])] if lifespan else None
 difficulty=re.search(r'Difficulty:\s*(Beginner|Intermediate|Advanced)',t)
 enclosure and facts.append({'label':'minimumEnclosureCm','range':enclosure,'unit':'cm (W×D×H)','statement':enclosure_line})
 if latin=='Tribolonotus gracilis':habitats=['terrestrial','fossorial']
 if latin in ['Chrysemys picta','Clemmys guttata']:habitats=[x for x in habitats if x!='terrestrial']
 uvb=re.search(r'UVI\s+(?:of\s+)?(\d(?:\.\d+)?)\s*[-–]\s*(\d(?:\.\d+)?)',t)
 out[latin]={'scope':scope,'uvbTarget':[float(uvb[1]),float(uvb[2])] if uvb else None,'sourceUrl':r['url'],'sourceIndex':'https://reptifiles.com/care-sheets','sourceTitle':label.split('Care Sheet')[0].strip(),'reviewedAt':'2026-11-05','profile':profile,'humidity':humidity,'minimumEnclosureCm':enclosure,'adultSizeCm':adult,'lifespanYears':life,'habitats':sorted(set(habitats)),'climates':climates,'activities':activities,'diets':diets,'ventilation':ventilation,'difficulty':{'Beginner':'쉬움','Intermediate':'보통','Advanced':'어려움'}.get(difficulty[1]) if difficulty else None,'facts':facts,'caution':'출처의 종·아종과 개체 연령, 계절별 주기를 확인하세요. 가열 지점과 서늘한 구역을 구분하고 원자료 전체 지침을 함께 검토해야 합니다.'}
(root/'research/verified-care.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n');(root/'research/care-import-issues.json').write_text(json.dumps(issues,ensure_ascii=False,indent=2)+'\n')
print('Species with source-matched care facts:',len(out));print('With enclosure+body+ventilation:',sum(bool(x['minimumEnclosureCm'] and x['adultSizeCm'] and x['ventilation']) for x in out.values()));print('PDF consistency issues rejected:',len(issues))
