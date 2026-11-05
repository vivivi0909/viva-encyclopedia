"""Export a standalone HTML preview, optionally packaged for download."""
from pathlib import Path
import argparse,base64,json,re,mimetypes,zipfile
parser=argparse.ArgumentParser()
parser.add_argument('--output',type=Path,required=True)
parser.add_argument('--external-photos',action='store_true',help='Keep full catalog in HTML, load credited species photos from original public URLs')
parser.add_argument('--zip-output',type=Path,help='Package index.html and Korean opening instructions in a ZIP download')
args=parser.parse_args()
root=Path(__file__).resolve().parents[1]/'dist'
html=(root/'index.html').read_text()
js_path=re.search(r'<script[^>]*src="\./([^\"]+)"[^>]*></script>',html).group(1)
css_path=re.search(r'<link[^>]*href="\./([^\"]+\.css)"[^>]*>',html).group(1)
js=(root/js_path).read_text();css=(root/css_path).read_text();images={}
project=root.parent
media={**json.loads((project/'src/catalog/inat-media.json').read_text()),**json.loads((project/'src/catalog/media.json').read_text())}
urls={r['image']:r['downloadUrl'] for r in media.values()}
def embed_photo(match):
 relative=match.group(2);image=root/relative.removeprefix('./')
 if not image.exists():raise FileNotFoundError(relative)
 if image.name not in images:
  images[image.name]=urls[relative] if args.external_photos and relative in urls else 'data:'+mimetypes.guess_type(image.name)[0]+';base64,'+base64.b64encode(image.read_bytes()).decode()
 return '__vivaImages['+json.dumps(image.name)+']'
js=re.sub(r'''(["'`])(\./photos/[^"'`]+)\1''',embed_photo,js)
assert './photos/' not in js,'unbundled photo path remains'
js='const __vivaImages='+json.dumps(images)+';'+js
favicon='data:image/svg+xml;base64,'+base64.b64encode((root/'favicon.svg').read_bytes()).decode()
html=html.replace('./favicon.svg',favicon)
html=re.sub(r'<script[^>]*src="\./[^\"]+"[^>]*></script>',lambda m:'<script type="module">'+js.replace('</script','<\\/script')+'</script>',html)
html=re.sub(r'<link[^>]*href="\./[^\"]+\.css"[^>]*>',lambda m:'<style>'+css+'</style>',html)
args.output.write_text(html)
print(f'Offline preview: {args.output.name} ({args.output.stat().st_size:,} bytes)')
if args.zip_output:
 instructions='''VIVA 도감 미리보기 열기

1. ZIP 파일을 PC에 다운로드합니다.
2. ZIP 파일을 압축 해제합니다.
3. 압축을 푼 폴더의 index.html을 Chrome 또는 Edge에서 엽니다.
   필요하면 파일을 우클릭 → 연결 프로그램 → Chrome/Edge를 선택하세요.

채팅 앱의 파일 미리보기는 HTML을 웹사이트 대신 소스 코드로 보여줄 수 있습니다.
채팅 미리보기나 텍스트 편집기가 아닌 웹 브라우저에서 여세요.
사진을 외부 원본에서 불러오는 버전은 인터넷 연결이 필요합니다.
모바일 파일 미리보기는 HTML 실행을 지원하지 않을 수 있어 PC 사용을 권장합니다.
모바일에서 일반 웹 주소로 접속하려면 별도의 정적 사이트 배포가 필요합니다.
이 ZIP을 만드는 작업은 사이트를 게시하지 않습니다.
'''
 with zipfile.ZipFile(args.zip_output,'w',compression=zipfile.ZIP_DEFLATED) as archive:
  archive.writestr('index.html',html.encode('utf-8'))
  archive.writestr('START_HERE.txt',instructions.encode('utf-8-sig'))
 print(f'Download package: {args.zip_output.name} ({args.zip_output.stat().st_size:,} bytes)')
