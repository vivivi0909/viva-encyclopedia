"""Download attributed real photographs from Wikimedia Commons; stop on policy denial.

Uses only files with explicit species matching and reusable CC/PD metadata.
This is a candidate selection aid, not a biological identification authority.
Existing imported records are retained. Run only after network policy is applied.
"""
import argparse,datetime,hashlib,html,json,re,time
from concurrent.futures import ThreadPoolExecutor,as_completed
from pathlib import Path
from urllib.parse import urlencode,urlparse
from urllib.request import Request,urlopen
from urllib.error import HTTPError,URLError
ROOT=Path(__file__).resolve().parents[1]
API='https://commons.wikimedia.org/w/api.php'
AGENT='VivaEncyclopedia/1.0 (educational species catalog; Wikimedia Commons attribution importer)'
BLOCKED=re.compile(r'AI.generated|artificial.intelligence|Midjourney|DALL.E|Stable.Diffusion|illustration|drawing|painting|distribution.map|range.map',re.I)
def plain(value):return html.unescape(re.sub('<[^>]+>','',str(value))).strip()
def reusable_photo(page,latin):
 infos=page.get('imageinfo',[])
 if not infos:return None
 info=infos[0];meta={k:plain(v.get('value','')) for k,v in info.get('extmetadata',{}).items()}
 license=meta.get('LicenseShortName','');license_url=meta.get('LicenseUrl','')
 if license_url.startswith('//'):license_url='https:'+license_url
 cc=bool(re.fullmatch(r'CC (?:BY(?:-SA)? [1-4]\.0|0(?: 1\.0)?)',license,re.I))
 public=license.lower()=='public domain'
 if not (cc or public):return None
 if not license_url:
  if not public:return None
  license_url='https://commons.wikimedia.org/wiki/Commons:Licensing#Public_domain'
 title=page.get('title','');description=meta.get('ImageDescription','')
 categories=' '.join(c['title'] for c in page.get('categories',[]))
 exact_categories={c['title'].replace('_',' ').removeprefix('Category:').casefold() for c in page.get('categories',[])}
 if BLOCKED.search(' '.join([title,description,categories,meta.get('Attribution','')])):return None
 if latin.casefold() not in ' '.join([title,description,categories]).replace('_',' ').casefold():return None
 # A name merely mentioned in prose (for example a comparison to another
 # monitor species) does not identify the photographed subject.
 if latin.casefold() not in title.replace('_',' ').casefold() and latin.casefold() not in exact_categories:return None
 photographer=meta.get('Artist','')
 if not photographer:return None
 image_url=info.get('thumburl') or info.get('url','')
 if urlparse(image_url).scheme!='https' or urlparse(image_url).hostname!='upload.wikimedia.org':return None
 return {'latin':latin,'title':title.removeprefix('File:'),'photographer':photographer,'license':license,'licenseUrl':license_url,'sourcePage':info.get('descriptionurl','https://commons.wikimedia.org/wiki/'+title.replace(' ','_')),'originalUrl':info.get('url'),'downloadUrl':image_url,'modifications':'Wikimedia thumbnail resizing; no VIVA image editing','retrievedAt':datetime.date.today().isoformat(),'identificationBasis':'Wikimedia title/description/category matches scientific name; not independent identification'}
def request(url):
 for attempt in range(3):
  try:
   with urlopen(Request(url,headers={'User-Agent':AGENT}),timeout=30) as response:return response.read()
  except HTTPError as error:
   if error.code not in [429,502,503,504] or attempt==2:raise
   time.sleep(min(20,int(error.headers.get('Retry-After','3'))+attempt*2))
def candidates(latin):
 params={'action':'query','format':'json','generator':'search','gsrsearch':'"'+latin+'" filetype:bitmap','gsrnamespace':6,'gsrlimit':6,'prop':'imageinfo|categories','iiprop':'url|extmetadata','iiurlwidth':900,'cllimit':100}
 payload=json.loads(request(API+'?'+urlencode(params)))
 pages=payload.get('query',{}).get('pages',{})
 return [r for p in sorted(pages.values(),key=lambda p:p.get('index',999)) if (r:=reusable_photo(p,latin))]
def image_extension(data):
 if data.startswith(b'\xff\xd8\xff'):return '.jpg'
 if data.startswith(b'\x89PNG\r\n\x1a\n'):return '.png'
 if data[:4]==b'RIFF' and data[8:12]==b'WEBP':return '.webp'
 raise ValueError('download is not a supported photograph image')
def collect(e):
 time.sleep(.15)
 try:
  options=candidates(e['latin'])
  if not options:return {'latin':e['latin'],'reason':'no reusable, identified real photograph found'}
  record=options[0];data=request(record['downloadUrl']);ext=image_extension(data)
  slug=e['latin'].lower().replace(' ','-');target=ROOT/'public/photos'/('species-'+slug+ext);target.write_bytes(data)
  record.update(image='./photos/'+target.name,sha256=hashlib.sha256(data).hexdigest())
  return record
 except (HTTPError,URLError,ValueError,OSError) as error:
  return {'latin':e['latin'],'reason':'request failed','error':str(error)}
def main():
 parser=argparse.ArgumentParser();parser.add_argument('--limit',type=int,default=845);parser.add_argument('--workers',type=int,default=4);args=parser.parse_args()
 evidence=json.loads((ROOT/'research/evidence.json').read_text());path=ROOT/'src/catalog/media.json';manifest=json.loads(path.read_text())
 inat=json.loads((ROOT/'src/catalog/inat-media.json').read_text())
 pending=[e for e in evidence if e['latin'] not in manifest and e['latin'] not in inat][:args.limit]
 failures=[];added=0;completed=0
 with ThreadPoolExecutor(max_workers=max(1,min(4,args.workers))) as executor:
  futures=[executor.submit(collect,e) for e in pending]
  for future in as_completed(futures):
   record=future.result();completed+=1
   if record.get('image'):
    manifest[record['latin']]=record;added+=1
    temp=path.with_suffix('.tmp');temp.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n');temp.replace(path)
   else:failures.append(record)
   if completed%10==0:print('Reviewed',completed,'/',len(pending),'— new real photos',added,'— total',len(manifest),flush=True)
 report={'attempted':completed,'added':added,'total':len(manifest),'failures':failures}
 (ROOT/'research/photo-import-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
 print('Imported real photographs:',added,'; retained total:',len(manifest),flush=True)
 if completed and all('403' in e.get('error','') for e in failures) and added==0:raise SystemExit(2)
if __name__=='__main__':main()
