"""Collect short, species-matched factual fields; never infer husbandry values.

Research-only dependency: beautifulsoup4 (not needed to build or run the site).
HTML is cached outside the repository. Only structured facts and provenance are saved.
"""
import argparse,datetime,hashlib,json,re,threading,time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request,urlopen
from bs4 import BeautifulSoup

ROOT=Path(__file__).resolve().parents[1]
DAY=datetime.date.today().isoformat()
LOCK=threading.Lock();LAST=[0.0];CACHED_ONLY=False
PLANT_FIELDS={'Genus','Species','Family','Life Cycle','Recommended Propagation Strategy','Country Or Region Of Origin','Climbing Method','Plant Type','Woody Plant Leaf Characteristics','Habit/Form','Growth Rate','Maintenance','Texture','Light','Soil Texture','Soil pH','Soil Drainage','USDA Plant Hardiness Zone','Height','Width','Dimensions','Landscape Location','Landscape Theme','Design Feature','Problems','Poison Severity','Poison Toxic Principle','Causes Contact Dermatitis','Poison Part','Resistance To Challenges','Attracts','Leaf Color','Leaf Feel','Leaf Type','Leaf Arrangement','Leaf Shape','Leaf Margin'}
SECTIONS=['geographic_range','habitat','physical_description','development','reproduction','lifespan_longevity','behavior','communication_perception','food_habits','predation','ecosystem_roles','economic_importance_negative']

def fetch(url,cache):
 target=cache/(hashlib.sha256(url.encode()).hexdigest()+'.html')
 if target.exists():return target.read_bytes()
 if CACHED_ONLY:raise FileNotFoundError('source not present in local research cache')
 with LOCK:
  delay=.4-(time.monotonic()-LAST[0])
  if delay>0:time.sleep(delay)
  LAST[0]=time.monotonic()
 for attempt in range(3):
  try:
   with urlopen(Request(url,headers={'User-Agent':'VivaEncyclopedia/1.0 (species facts reference research)'}),timeout=22) as response:raw=response.read()
   target.write_bytes(raw);return raw
  except HTTPError as error:
   if error.code not in [429,502,503,504] or attempt==2:raise
   time.sleep(min(45,max(5,int(error.headers.get('Retry-After','5')))))

def extract(entry,provider,cache,old_plants):
 names=[entry['latin'],*[n for n in entry.get('aliases',[]) if re.fullmatch('[A-Z][a-z]+ [a-z][a-z-]+',n) and n!=entry['latin']]][:3]
 errors=[]
 for name in names:
  url=('https://animaldiversity.org/accounts/'+name.replace(' ','_')+'/' if provider=='adw' else old_plants.get(entry['latin'],{}).get('sourceUrl') if name==entry['latin'] and entry['latin'] in old_plants else 'https://plants.ces.ncsu.edu/plants/'+name.lower().replace(' ','-')+'/')
  try:
   raw=fetch(url,cache);soup=BeautifulSoup(raw,'html.parser')
   title=soup.title.get_text(' ',strip=True) if soup.title else ''
   if name.casefold() not in title.casefold():errors.append('scientific name absent from source title');continue
   provenance={'latin':entry['latin'],'matchedScientificName':name,'sourceUrl':url,'sourceTitle':title,'reviewedAt':DAY,'sourceSha256':hashlib.sha256(raw).hexdigest(),'scope':'Natural history, not captive husbandry' if provider=='adw' else 'Botanical facts; outdoor dimensions and hardiness are not enclosure temperature requirements'}
   updated=re.search(r'Last updated:\s*(\d{4}-\d{2}-\d{2})',raw.decode('utf-8',errors='replace'))
   if updated:provenance['sourceUpdatedAt']=updated[1]
   if provider=='plants':
    facts={}
    for dt in soup.select('dt'):
     key=' '.join(dt.get_text(' ',strip=True).rstrip(':').split())
     if key not in PLANT_FIELDS:continue
     for dd in dt.find_next_siblings():
      if dd.name!='dd':break
      value=' '.join(dd.get_text(' ',strip=True).split())
      if value and value not in facts.setdefault(key,[]):facts[key].append(value)
    if not facts:errors.append('no structured botanical facts');continue
    return {**provenance,'facts':facts}
   sections={}
   for section_id in SECTIONS:
    heading=soup.find(id=section_id)
    if not heading:continue
    section=heading.find_parent('section')
    if not section:continue
    keywords={}
    for ul in section.select('ul.keywords'):
     label=ul.select_one('.keywords-header');label=label.get_text(' ',strip=True) if label else section_id
     values=[]
     for item in ul.find_all('li',recursive=False):
      if 'keywords-header' in item.get('class',[]):continue
      links=item.select('a.gloss-link')
      texts=[a.get_text(' ',strip=True) for a in links] if links else [item.get_text(' ',strip=True)]
      values.extend(v for v in texts if v and len(v)<120)
     values=list(dict.fromkeys(values))
     if values:keywords[label]=values
    statistics=[]
    for row in section.select('dl.data-list > div'):
     dt=row.find('dt');dd=row.find('dd')
     if not dt or not dd:continue
     label=' '.join(dt.get_text(' ',strip=True).split())
     for a in dd.select('a'):a.decompose()
     value=' '.join(dd.get_text(' ',strip=True).split())
     if value and len(value)<200:statistics.append({'label':label,'value':value})
    if keywords or statistics:sections[section_id]={'keywords':keywords,'statistics':statistics}
   if not sections:errors.append('no structured natural-history facts');continue
   return {**provenance,'sections':sections}
  except Exception as error:errors.append(str(error))
 return {'latin':entry['latin'],'errors':errors}

if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--provider',choices=['adw','plants'],required=True)
 parser.add_argument('--catalog',type=Path,default=ROOT/'research/evidence.json')
 parser.add_argument('--cache-directory',type=Path,required=True);parser.add_argument('--cached-only',action='store_true');args=parser.parse_args();CACHED_ONLY=args.cached_only
 args.cache_directory.mkdir(parents=True,exist_ok=True)
 entries=[e for e in json.loads(args.catalog.read_text()) if (e['kind']=='plant' if args.provider=='plants' else e['kind'] not in ['plant','vivarium'])]
 output=ROOT/'research'/('verified-natural-history.json' if args.provider=='adw' else 'verified-plant-details.json')
 records=json.loads(output.read_text()) if output.exists() else {};failures=[]
 old=json.loads((ROOT/'research/verified-plant-traits.json').read_text())
 with ThreadPoolExecutor(max_workers=3) as pool:
  for i,result in enumerate(pool.map(lambda entry:extract(entry,args.provider,args.cache_directory,old),entries),1):
   if result.get('sourceUrl'):records[result['latin']]=result
   else:failures.append(result)
   if i%20==0:
    temporary=output.with_suffix('.tmp');temporary.write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n');temporary.replace(output)
    print(args.provider,'reviewed',i,'/',len(entries),'source-matched records',len(records),flush=True)
 output.write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n')
 (ROOT/'research'/('natural-history-import-report.json' if args.provider=='adw' else 'plant-detail-import-report.json')).write_text(json.dumps({'reviewedAt':DAY,'total':len(records),'cachedOnly':args.cached_only,'failures':failures},ensure_ascii=False,indent=2)+'\n')
 print(args.provider,'complete:',len(records),'species with structured facts',flush=True)
