"""Download licensed photo candidates for visual review; never auto-select.

Input: JSON array with latin, aliases and photo (existing metadata) fields.
Candidates stay outside the catalog until a reviewer explicitly chooses a photo.
"""
import argparse,datetime,hashlib,json,re
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.parse import urlencode,urlparse
from inaturalist_photos import fetch
from commons_photos import API,request,reusable_photo,image_extension

def collect_commons(entry,folder):
 accepted={entry['latin'].casefold(),*(s.casefold() for s in entry.get('aliases',[]) if re.fullmatch('[A-Z][a-z]+ [a-z][a-z-]+',s))}
 query={'action':'query','format':'json','generator':'search','gsrsearch':'"'+entry['latin']+'" filetype:bitmap','gsrnamespace':6,'gsrlimit':12,'prop':'imageinfo|categories','iiprop':'url|extmetadata','iiurlwidth':1000,'cllimit':100}
 candidates=[]
 try:
  pages=json.loads(request(API+'?'+urlencode(query))).get('query',{}).get('pages',{})
  for page in sorted(pages.values(),key=lambda p:p.get('index',999)):
   title=page.get('title','').replace('_',' ').casefold()
   categories={c['title'].replace('_',' ').removeprefix('Category:').casefold() for c in page.get('categories',[])}
   if not any(name in title or name in categories for name in accepted):continue
   record=reusable_photo(page,entry['latin'])
   if not record or record['sourcePage']==entry.get('photo',{}).get('sourcePage'):continue
   raw=request(record['downloadUrl'])
   if len(raw)>8_000_000:continue
   filename=str(page['pageid'])+image_extension(raw)
   (folder/filename).write_bytes(raw)
   record.update(candidateFile=str(folder/filename),sha256=hashlib.sha256(raw).hexdigest(),identificationBasis='Scientific name in Wikimedia file title or exact species category; visually reviewed framing; not independent biological identification')
   candidates.append(record)
   if len(candidates)>=3:break
  return {'latin':entry['latin'],'candidates':candidates}
 except Exception as error:
  return {'latin':entry['latin'],'candidates':candidates,'error':str(error)}

def collect(entry,folder):
 accepted={entry['latin'].casefold(),*(s.casefold() for s in entry.get('aliases',[]) if re.fullmatch('[A-Z][a-z]+ [a-z][a-z-]+',s))}
 query={'taxon_name':entry['latin'],'photos':'true','photo_license':'cc0,cc-by,cc-by-sa','quality_grade':'research,needs_id,casual','order_by':'votes','order':'desc','per_page':12}
 candidates=[]
 try:
  observations=json.loads(fetch('https://api.inaturalist.org/v1/observations?'+urlencode(query),True))
  for observation in observations.get('results',[]):
   actual=observation.get('taxon',{}).get('name','')
   if actual.casefold() not in accepted:continue
   if observation.get('quality_grade')!='research' and (observation.get('community_taxon_id')!=observation.get('taxon',{}).get('id') or observation.get('num_identification_agreements',0)<1):continue
   if re.search(r'AI.generated|Midjourney|DALL.E|Stable.Diffusion|roadkill|dead on road|deceased|specimen in alcohol',observation.get('description') or '',re.I):continue
   for photo in observation.get('photos',[]):
    code=photo.get('license_code')
    if code not in ['cc0','cc-by','cc-by-sa']:continue
    source='https://www.inaturalist.org/photos/'+str(photo['id'])
    if source==entry.get('photo',{}).get('sourcePage'):continue
    url=photo.get('url','').replace('/square.','/large.')
    if urlparse(url).hostname not in ['inaturalist-open-data.s3.amazonaws.com','static.inaturalist.org']:continue
    raw=fetch(url)
    if raw.startswith(b'\xff\xd8\xff'):ext='.jpg'
    elif raw.startswith(b'\x89PNG\r\n\x1a\n'):ext='.png'
    elif raw[:4]==b'RIFF' and raw[8:12]==b'WEBP':ext='.webp'
    else:continue
    filename=str(photo['id'])+ext
    (folder/filename).write_bytes(raw)
    candidates.append({'latin':entry['latin'],'matchedTaxon':actual,'candidateFile':str(folder/filename),'title':entry['latin']+' — iNaturalist observation photograph','photographer':photo.get('attribution_name') or photo.get('attribution') or observation['user']['login'],'attribution':photo.get('attribution',''),'license':{'cc0':'CC0-1.0','cc-by':'CC BY 4.0','cc-by-sa':'CC BY-SA 4.0'}[code],'licenseUrl':'https://creativecommons.org/publicdomain/zero/1.0/' if code=='cc0' else 'https://creativecommons.org/licenses/'+code[3:]+'/4.0/','sourcePage':source,'observationPage':observation['uri'],'downloadUrl':url,'sha256':hashlib.sha256(raw).hexdigest(),'modifications':'iNaturalist large-size derivative; no VIVA image editing','retrievedAt':datetime.date.today().isoformat(),'identificationBasis':('research-grade observation' if observation.get('quality_grade')=='research' else 'community-supported captive/casual observation; not research-grade')+'; exact species or stored scientific synonym matches'})
    break
   if len(candidates)>=3:break
  return {'latin':entry['latin'],'candidates':candidates}
 except Exception as error:
  return {'latin':entry['latin'],'candidates':candidates,'error':str(error)}

if __name__=='__main__':
 parser=argparse.ArgumentParser()
 parser.add_argument('--species-file',type=Path,required=True)
 parser.add_argument('--directory',type=Path,required=True)
 parser.add_argument('--provider',choices=['inaturalist','commons'],default='inaturalist')
 args=parser.parse_args();args.directory.mkdir(parents=True,exist_ok=True)
 entries=json.loads(args.species_file.read_text());results=[]
 with ThreadPoolExecutor(max_workers=3) as pool:
  for result in pool.map(lambda entry:(collect_commons if args.provider=='commons' else collect)(entry,args.directory),entries):
   results.append(result)
   (args.directory/'candidates.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
   if len(results)%10==0:print('Photo candidate searches:',len(results),'/',len(entries),flush=True)
 print('Ready for visual review:',len(results),'species;',sum(len(r['candidates']) for r in results),'candidate photographs',flush=True)
