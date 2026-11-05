import zipfile,xml.etree.ElementTree as E
NS={'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
def read_xlsx(path):
 with zipfile.ZipFile(path) as z:
  strings=[''.join(e.itertext()) for e in E.fromstring(z.read('xl/sharedStrings.xml')).findall('m:si',NS)]
  rows=[]
  for row in E.fromstring(z.read('xl/worksheets/sheet1.xml')).findall('.//m:row',NS):
   out={}
   for c in row.findall('m:c',NS):
    v=c.find('m:v',NS)
    if v is not None:out[''.join(filter(str.isalpha,c.attrib['r']))]=strings[int(v.text)] if c.attrib.get('t')=='s' else v.text
   rows.append(out)
  return rows
