"""Cache public care articles and index exact species matches for fact review.

Full article text remains in a temporary cache, never in application data.
"""
import argparse,datetime,hashlib,json,re,threading,time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.request import Request,urlopen
from urllib.error import HTTPError
from bs4 import BeautifulSoup
lock=threading.Lock();last=[0.0]
parser=argparse.ArgumentParser();parser.add_argument('--urls',type=Path,required=True);parser.add_argument('--catalog',type=Path,required=True);parser.add_argument('--directory',type=Path,required=True);args=parser.parse_args();args.directory.mkdir(parents=True,exist_ok=True)
entries=[e for e in json.loads(args.catalog.read_text()) if e['kind'] not in ['plant','vivarium']]
names={}
for e in entries:
 for name in [e['latin'],*e.get('aliases',[])]:
  if re.fullmatch('[A-Z][a-z]+ [a-z][a-z-]+',name):names[name]=e['latin']
def get(url):
 target=args.directory/(hashlib.sha256(url.encode()).hexdigest()+'.html')
 try:
  if target.exists():raw=target.read_bytes()
  else:
   with lock:
    delay=.45-(time.monotonic()-last[0])
    if delay>0:time.sleep(delay)
    last[0]=time.monotonic()
   with urlopen(Request(url,headers={'User-Agent':'VivaEncyclopedia/1.0 (species care reference research)'}),timeout=25) as response:raw=response.read()
   target.write_bytes(raw)
  soup=BeautifulSoup(raw,'html.parser');content=soup.select_one('.article-content .prose, .article-template__content, .article__content, .article-content .rte')
  if not content:return {'sourceUrl':url,'error':'article body not found'}
  # Introductory paragraphs identify the article subject; mentioning another
  # species later as a prey item or comparison does not identify the subject.
  intro=' '.join(p.get_text(' ',strip=True) for p in content.find_all('p',recursive=False)[:4])
  intro=intro.split('Shopping')[0][:1800]
  matched={name:latin for name,latin in names.items() if re.search(r'\b'+re.escape(name)+r'\b',intro)}
  subjects=sorted(set(matched.values()))
  if not subjects:return {'sourceUrl':url,'error':'no exact scientific-name subject in introductory paragraphs'}
  time_tag=soup.select_one('time');published=time_tag.get('datetime') if time_tag else None
  return {'sourceUrl':url,'sourceTitle':soup.title.get_text(' ',strip=True),'reviewedAt':datetime.date.today().isoformat(),'sourcePublishedAt':published,'sourceSha256':hashlib.sha256(raw).hexdigest(),'species':subjects,'matchedNames':list(matched),'scope':'species' if len(subjects)==1 else 'multi-species introductory guide','headings':[h.get_text(' ',strip=True) for h in content.select('h2,h3')]}
 except Exception as error:return {'sourceUrl':url,'error':str(error)}
results=[]
urls=list(dict.fromkeys(json.loads(args.urls.read_text())))
with ThreadPoolExecutor(max_workers=3) as pool:
 for i,result in enumerate(pool.map(get,urls),1):
  results.append(result)
  if i%20==0:
   (args.directory/'index.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n');print('Care articles reviewed:',i,'/',len(urls),'matched:',sum(bool(r.get('species')) for r in results),flush=True)
(args.directory/'index.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
print('Finished:',len(results),'articles;',len(set(s for r in results for s in r.get('species',[]))),'species matched',flush=True)
