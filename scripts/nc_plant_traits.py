"""Read botanical facts from NC Extension species pages. No photos or prose copied."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.request import Request,urlopen
from urllib.error import HTTPError,URLError
from concurrent.futures import ThreadPoolExecutor
import json,re,time
ROOT=Path(__file__).resolve().parents[1]
class Facts(HTMLParser):
 def __init__(self):super().__init__();self.tag=None;self.key=None;self.text=[];self.facts={};self.title=False;self.title_text=''
 def handle_starttag(self,tag,attrs):
  if tag=='title':self.title=True
  if tag in ['dt','dd']:self.tag=tag;self.text=[]
 def handle_data(self,data):
  if self.tag:self.text.append(data)
  if self.title:self.title_text+=data
 def handle_endtag(self,tag):
  if tag=='title':self.title=False
  if tag==self.tag:
   value=' '.join(' '.join(self.text).split())
   if tag=='dt':self.key=value.strip(':')
   elif self.key:self.facts.setdefault(self.key,[]).append(value)
   self.tag=None;self.text=[]
def get(e):
 url='https://plants.ces.ncsu.edu/plants/'+e['latin'].lower().replace(' ','-')+'/'
 try:
  raw=urlopen(Request(url,headers={'User-Agent':'VivaEncyclopedia/1.0 (educational plant catalog)'}),timeout=20).read().decode();p=Facts();p.feed(raw)
  if e['latin'].casefold() not in ' '.join(p.title_text.split()).casefold():return {'latin':e['latin'],'reason':'source title did not match exact scientific name'}
  relevant={k:v for k,v in p.facts.items() if k in ['Growth Rate','Height','Dimensions','Light','Habit/Form','Recommended Propagation Strategy','Climbing Method','Plant Type','Soil Drainage','Maintenance']}
  return {'latin':e['latin'],'sourceUrl':url,'reviewedAt':'2026-11-05','facts':relevant}
 except (HTTPError,URLError) as error:return {'latin':e['latin'],'reason':str(error)}
 finally:time.sleep(.2)
def main():
 plants=[e for e in json.loads((ROOT/'research/evidence.json').read_text()) if e['kind']=='plant'];out={};failures=[]
 with ThreadPoolExecutor(max_workers=3) as pool:
  for i,r in enumerate(pool.map(get,plants),1):
   if r.get('facts'):out[r['latin']]=r
   else:failures.append(r)
   if i%30==0:print('NC Extension reviewed',i,'/',len(plants),'— fact records',len(out),flush=True)
 (ROOT/'research/verified-plant-traits.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
 (ROOT/'research/plant-trait-report.json').write_text(json.dumps({'total':len(out),'failures':failures},ensure_ascii=False,indent=2)+'\n')
 print('Verified species pages with botanical facts:',len(out),flush=True)
if __name__=='__main__':main()
