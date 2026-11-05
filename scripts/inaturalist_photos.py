"""Collect reusable, research-grade observation photos with exact taxon matching.
Limit API start rate to <= 80 requests/minute. Never use all-rights-reserved photos.
"""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor,as_completed
from urllib.request import Request,urlopen
from urllib.parse import urlencode,urlparse
from urllib.error import HTTPError,URLError
import json,re,hashlib,time,threading,datetime,argparse
ROOT=Path(__file__).resolve().parents[1]
lock=threading.Lock();last=[0.0];include_captive=False
def fetch(url,api=False):
 if api:
  with lock:
   delay=.8-(time.monotonic()-last[0])
   if delay>0:time.sleep(delay)
   last[0]=time.monotonic()
 for attempt in range(3):
  try:
   with urlopen(Request(url,headers={'User-Agent':'VivaEncyclopedia/1.0 (educational species guide)'}),timeout=25) as r:return r.read()
  except HTTPError as e:
   if e.code not in [429,502,503,504] or attempt==2:raise
   time.sleep(4+attempt*3)
def collect(e):
 accepted={e['latin'].casefold(),*(s.casefold() for s in e.get('aliases',[]) if re.fullmatch('[A-Z][a-z]+ [a-z][a-z-]+',s))}
 q={'taxon_name':e['latin'],'photos':'true','photo_license':'cc0,cc-by,cc-by-sa','quality_grade':'research,needs_id,casual' if include_captive else 'research','per_page':3}
 try:
  data=json.loads(fetch('https://api.inaturalist.org/v1/observations?'+urlencode(q),True))
  for obs in data.get('results',[]):
   actual=obs.get('taxon',{}).get('name','')
   if obs.get('quality_grade')!='research' and (obs.get('community_taxon_id')!=obs.get('taxon',{}).get('id') or obs.get('num_identification_agreements',0)<1):continue
   if actual.casefold() not in accepted:continue
   if re.search(r'AI.generated|Midjourney|DALL.E|Stable.Diffusion',obs.get('description') or '',re.I):continue
   for p in obs.get('photos',[]):
    code=p.get('license_code')
    if code not in ['cc0','cc-by','cc-by-sa']:continue
    url=p.get('url','').replace('/square.','/medium.')
    if urlparse(url).hostname not in ['inaturalist-open-data.s3.amazonaws.com','static.inaturalist.org']:continue
    raw=fetch(url)
    if raw.startswith(b'\xff\xd8\xff'):ext='.jpg'
    elif raw.startswith(b'\x89PNG\r\n\x1a\n'):ext='.png'
    elif raw[:4]==b'RIFF' and raw[8:12]==b'WEBP':ext='.webp'
    else:continue
    filename='inat-'+e['latin'].lower().replace(' ','-')+ext
    (ROOT/'public/photos'/filename).write_bytes(raw)
    return {'latin':e['latin'],'matchedTaxon':actual,'image':'./photos/'+filename,'title':e['latin']+' — iNaturalist observation photograph','photographer':p.get('attribution_name') or p.get('attribution') or obs['user']['login'],'attribution':p.get('attribution',''),'license':{'cc0':'CC0-1.0','cc-by':'CC BY 4.0','cc-by-sa':'CC BY-SA 4.0'}[code],'licenseUrl':'https://creativecommons.org/publicdomain/zero/1.0/' if code=='cc0' else 'https://creativecommons.org/licenses/'+code[3:]+'/4.0/','sourcePage':'https://www.inaturalist.org/photos/'+str(p['id']),'observationPage':obs['uri'],'downloadUrl':url,'sha256':hashlib.sha256(raw).hexdigest(),'modifications':'iNaturalist medium-size derivative; no VIVA image editing','retrievedAt':datetime.date.today().isoformat(),'identificationBasis':('research-grade observation' if obs.get('quality_grade')=='research' else 'community-supported captive/casual observation; not research-grade')+'; exact species or stored scientific synonym matches'}
  return {'latin':e['latin'],'reason':'no licensed research-grade observation photo matched'}
 except (HTTPError,URLError,ValueError,OSError) as error:return {'latin':e['latin'],'reason':str(error)}
def main():
 global include_captive
 parser=argparse.ArgumentParser();parser.add_argument('--include-captive',action='store_true');args=parser.parse_args();include_captive=args.include_captive
 manifest_path=ROOT/'src/catalog/inat-media.json';manifest=json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
 commons=json.loads((ROOT/'src/catalog/media.json').read_text());data=json.loads((ROOT/'research/evidence.json').read_text())
 pending=[e for e in data if e['latin'] not in commons and e['latin'] not in manifest];done=0;failed=[]
 with ThreadPoolExecutor(max_workers=2) as pool:
  for r in pool.map(collect,pending):
   done+=1
   if r.get('image'):
    manifest[r['latin']]=r
    temp=manifest_path.with_suffix('.tmp');temp.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n');temp.replace(manifest_path)
   else:failed.append(r)
   if done%20==0:print('iNaturalist reviewed',done,'/',len(pending),'— real photos',len(manifest),flush=True)
 (ROOT/'research/inaturalist-import-report.json').write_text(json.dumps({'total':len(manifest),'failures':failed},ensure_ascii=False,indent=2)+'\n')
 print('iNaturalist complete; reusable photographs:',len(manifest),flush=True)
if __name__=='__main__':main()
