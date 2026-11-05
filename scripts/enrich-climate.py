import json,re,hashlib,subprocess
from pathlib import Path
root=Path(__file__).resolve().parents[1]
source=Path(__import__('os').environ.get('VIVA_RESEARCH_ROOT','/tmp/viva-research'))/'plantfolio'
plants={r['id']:r for r in json.load((source/'dist/common_plants.json').open())[1:]}
p=root/'research/evidence.json';evidence=json.loads(p.read_text());n=0
for e in evidence:
 if e['kind']=='plant':
  r=plants[e['sourceId']];text=r['careTips'];matches=list(re.finditer(r'(\d{2})\s*[-–]\s*(\d{2})\s*%',text))
  if matches:
   m=matches[0];lo,hi=int(m[1]),int(m[2])
   # Only numeric ranges with nearby humidity wording are eligible, not fertilizer concentrations.
   context=text[max(0,m.start()-70):min(len(text),m.end()+75)]
   if 10<=lo<=hi<=100 and re.search('humid',context,re.I):
    e['humidity']=[lo,hi];e['humidityEvidence']=context.strip();n+=1
 elif e['kind']=='arthropod' and e['group']=='등각류':
  m=re.search(r'(\d{2})\s*[-–]\s*(\d{2})\s*%',e['humidityText'])
  if m:e['humidity']=[int(m[1]),int(m[2])];e['humidityEvidence']=e['humidityText']
p.write_text(json.dumps(evidence,ensure_ascii=False,indent=2)+'\n')
print('New plant humidity ranges copied from explicit humidity statements:',n)
