"""Build the offline catalog from reviewed evidence; never invent missing climate data.

Input: research/evidence.json (frozen facts), sources.json (retrieval + commit pins).
Plant derivative data: CC BY-NC-SA 4.0; see research/plantfolio-LICENSE.txt.
"""
from pathlib import Path
import json,re,collections
ROOT=Path(__file__).resolve().parents[1]
KO={
'Monstera deliciosa':'몬스테라 델리시오사','Monstera adansonii':'몬스테라 아단소니','Fittonia albivenis':'피토니아','Epipremnum aureum':'스킨답서스','Nephrolepis exaltata':'보스턴 고사리','Taxiphyllum barbieri':'자바모스','Adiantum raddianum':'아디안텀','Asplenium nidus':'아스플레니움 니두스','Platycerium bifurcatum':'박쥐란','Davallia fejeensis':'넉줄고사리','Phlebodium aureum':'블루스타 고사리','Selaginella kraussiana':'셀라지넬라 크라우시아나','Ficus pumila':'푸밀라 고무나무','Ficus elastica':'인도 고무나무','Ficus lyrata':'떡갈 고무나무','Ficus benjamina':'벤자민 고무나무','Ficus microcarpa':'대만 고무나무','Pilea peperomioides':'필레아 페페로미오이데스','Pilea cadierei':'필레아 카디에레이','Pilea involucrata':'필레아 인볼루크라타','Soleirolia soleirolii':'솔레이롤리아','Chlorophytum comosum':'접란','Dracaena trifasciata':'산세베리아','Zamioculcas zamiifolia':'금전수','Spathiphyllum wallisii':'스파티필름','Anthurium andraeanum':'안스리움','Alocasia macrorrhizos':'알로카시아 마크로리조스','Alocasia amazonica':'알로카시아 아마조니카','Alocasia zebrina':'알로카시아 제브리나','Alocasia cucullata':'알로카시아 쿠쿨라타','Peperomia obtusifolia':'페페로미아 옵투시폴리아','Peperomia caperata':'페페로미아 카페라타','Peperomia argyreia':'수박 페페로미아','Hoya carnosa':'호야 카르노사','Hoya kerrii':'하트 호야','Hedera helix':'아이비','Dischidia nummularia':'디시디아 누뮬라리아','Syngonium podophyllum':'싱고니움','Tradescantia zebrina':'달개비 제브리나','Ceropegia woodii':'러브체인','Aloe vera':'알로에 베라','Crassula ovata':'염좌','Haworthiopsis attenuata':'하월시아 아테누아타','Echeveria elegans':'엘레강스 에케베리아','Sedum morganianum':'청옥','Lithops lesliei':'리톱스 레슬리에이','Dionaea muscipula':'파리지옥','Drosera capensis':'케이프 끈끈이주걱','Sarracenia purpurea':'사라세니아 푸르푸레아','Nepenthes alata':'네펜데스 알라타','Tillandsia ionantha':'틸란드시아 이오난타','Phalaenopsis amabilis':'호접란 아마빌리스','Paphiopedilum insigne':'파피오페딜룸 인시그네',
'Correlophus ciliatus':'크레스티드 게코','Correlophus sarasinorum':'사라시노룸 게코','Rhacodactylus auriculatus':'가고일 게코','Rhacodactylus leachianus':'리키에너스 게코','Mniarogekko chahoua':'차화 게코','Eurydactylodes agricolae':'아그리콜라 게코','Eublepharis macularius':'레오파드 게코','Hemitheconyx caudicinctus':'아프리칸 팻테일 게코','Phelsuma grandis':'자이언트 데이 게코','Phelsuma klemmeri':'클레머리 데이 게코','Lygodactylus williamsi':'일렉트릭 블루 게코','Lepidodactylus lugubris':'모닝 게코','Gekko gecko':'토케이 게코','Paroedura picta':'마다가스카르 그라운드 게코','Nephrurus levis':'레비스 납테일 게코','Uroplatus phantasticus':'사타닉 리프테일 게코','Tiliqua scincoides':'블루텅 스킨크','Tiliqua gigas':'인도네시안 블루텅 스킨크','Tiliqua rugosa':'싱글백 스킨크','Tribolonotus gracilis':'레드아이 크로커다일 스킨크','Corucia zebrata':'솔로몬 프리헨사일테일 스킨크','Pogona vitticeps':'비어디드 드래곤','Pogona henrylawsoni':'랭킨스 드래곤','Chlamydosaurus kingii':'목도리 도마뱀','Intellagama lesueurii':'오스트레일리안 워터드래곤','Physignathus cocincinus':'차이니즈 워터드래곤','Furcifer pardalis':'팬서 카멜레온','Chamaeleo calyptratus':'베일드 카멜레온','Trioceros jacksonii':'잭슨 카멜레온','Anolis carolinensis':'그린 아놀','Anolis sagrei':'브라운 아놀','Basiliscus plumifrons':'그린 바실리스크','Iguana iguana':'그린 이구아나','Salvator merianae':'아르헨티나 블랙앤화이트 테구','Varanus acanthurus':'애키 모니터','Varanus prasinus':'그린 트리 모니터','Varanus macraei':'블루 트리 모니터','Varanus exanthematicus':'사바나 모니터','Ouroborus cataphractus':'아르마딜로 도마뱀','Python regius':'볼 파이톤','Pantherophis guttatus':'콘 스네이크','Lampropeltis californiae':'캘리포니아 킹스네이크','Lampropeltis getula':'커먼 킹스네이크','Lampropeltis alterna':'그레이밴드 킹스네이크','Lampropeltis triangulum':'밀크 스네이크','Heterodon nasicus':'웨스턴 호그노즈','Pituophis catenifer':'고퍼 스네이크','Antaresia childreni':'칠드런스 파이톤','Antaresia maculosa':'스포티드 파이톤','Morelia viridis':'그린 트리 파이톤','Morelia spilota':'카펫 파이톤','Boa imperator':'커먼 보아','Boa constrictor':'보아 콘스트릭터','Acrantophis dumerili':'듀메릴 보아','Epicrates cenchria':'브라질리언 레인보우 보아','Eryx colubrinus':'케냐 샌드보아','Dasypeltis scabra':'아프리칸 에그이터','Testudo hermanni':'헤르만 육지거북','Testudo graeca':'그리스 육지거북','Testudo marginata':'마지나타 육지거북','Testudo horsfieldii':'러시안 육지거북','Centrochelys sulcata':'설카타 육지거북','Stigmochelys pardalis':'레오파드 육지거북','Chelonoidis carbonarius':'레드풋 육지거북','Chelonoidis denticulatus':'옐로풋 육지거북','Sternotherus odoratus':'커먼 머스크 터틀','Sternotherus carinatus':'레이저백 머스크 터틀','Kinosternon baurii':'세줄 머드 터틀','Mauremys reevesii':'남생이','Mauremys japonica':'일본 돌거북','Geoemyda spengleri':'스펭글러 산거북','Cuora amboinensis':'암보이나 상자거북','Terrapene carolina':'캐롤라이나 상자거북','Chrysemys picta':'페인티드 터틀',
'Pelodryas caerulea':'화이트 트리프록','Ranoidea caerulea':'화이트 트리프록','Agalychnis callidryas':'레드아이 트리프록','Trachycephalus resinifictrix':'아마존 밀크프록','Ceratophrys cranwelli':'크랜웰 팩맨프록','Ceratophrys ornata':'오네이트 팩맨프록','Ceratophrys cornuta':'수리남 혼드프록','Pyxicephalus adspersus':'아프리칸 불프록','Dendrobates tinctorius':'팅크토리우스 독화살개구리','Dendrobates auratus':'아우라투스 독화살개구리','Dendrobates leucomelas':'루코멜라스 독화살개구리','Phyllobates terribilis':'골든 독화살개구리','Ranitomeya imitator':'이미테이터 독화살개구리','Oophaga pumilio':'딸기 독화살개구리','Theloderma corticale':'베트남 모시프록','Dyscophus guineti':'토마토프록 귀네티','Kaloula pulchra':'아시안 페인티드프록','Lepidobatrachus laevis':'버짓프록','Ambystoma mexicanum':'아홀로틀','Ambystoma tigrinum':'타이거 살라만더','Ambystoma maculatum':'스포티드 살라만더','Ambystoma opacum':'마블 살라만더','Salamandra salamandra':'파이어 살라만더','Pleurodeles waltl':'스페니시 립드뉴트','Cynops pyrrhogaster':'일본 불배영원','Hypselotriton orientalis':'차이니즈 파이어벨리 뉴트','Neurergus kaiseri':'카이저 뉴트','Triturus marmoratus':'마블 뉴트','Tylototriton shanjing':'엠페러 뉴트','Hymenochirus boettgeri':'아프리칸 드워프프록','Bombina orientalis':'무당개구리',
'Porcellio laevis':'데어리 카우 등각류','Armadillidium vulgare':'공벌레','Armadillidium maculatum':'제브라 등각류','Armadillidium klugii':'클루기 등각류','Armadillidium gestroi':'게스트로이 등각류','Porcellionides pruinosus':'파우더 등각류','Trichorhina tomentosa':'드워프 화이트 등각류','Porcellio hoffmannseggii':'호프만세기 등각류','Porcellio expansus':'엑스판서스 등각류','Cubaris murina':'쿠바리스 무리나','Armadillo officinalis':'아르마딜로 오피시날리스','Brachypelma hamorii':'멕시칸 레드니 타란툴라','Tliltocatl albopilosus':'컬리헤어 타란툴라','Grammostola pulchripes':'차코 골든니 타란툴라','Chromatopelma cyaneopubescens':'그린보틀블루 타란툴라','Lasiodora parahybana':'살몬핑크 버드이터','Acanthoscurria geniculata':'브라질리언 화이트니 타란툴라','Pterinochilus murinus':'오렌지 바분 타란툴라','Poecilotheria metallica':'구티 사파이어 타란툴라'}
GENUS_KO={'Philodendron':'필로덴드론','Anthurium':'안스리움','Alocasia':'알로카시아','Monstera':'몬스테라','Peperomia':'페페로미아','Hoya':'호야','Begonia':'베고니아','Calathea':'칼라테아','Goeppertia':'고에페르티아','Ficus':'피쿠스','Pilea':'필레아','Dracaena':'드라세나','Tillandsia':'틸란드시아','Echeveria':'에케베리아','Haworthia':'하월시아','Nephrolepis':'네프로레피스','Armadillidium':'아르마딜리디움','Porcellio':'포르켈리오','Phelsuma':'펠수마','Uroplatus':'우로플라투스','Varanus':'바라누스','Lampropeltis':'람프로펠티스','Ranitomeya':'라니토메야','Mantella':'만텔라','Tylototriton':'틸로토트리톤','Ceratophrys':'케라토프리스'}
GROUP_MAP={'Low Maintenance':'관엽식물','Aroids':'열대식물','Ferns':'양치식물','Palms':'야자','Succulents':'다육식물','Cacti':'선인장','Flowering':'꽃식물','Prayer Plants':'열대식물','Vines & Trailing':'덩굴식물','Ficus & Fig':'고무나무','Specialty':'관엽식물','Aquatic & Bog':'수생·습지식물','Carnivorous':'식충식물','Epiphytes & Moss':'이끼·착생식물','Alpine':'고산식물','Trees':'정원수','Shrubs':'관목','Perennials':'정원 초화','Annuals':'한해살이 초화','Vines & Climbers':'덩굴식물','Groundcovers & Grasses':'지피·그라스'}
LIGHT={'lowIndirect':'약한 간접광','mediumIndirect':'중간 간접광','brightIndirect':'밝은 간접광','strongDirect':'강한 직사광','outdoorFullSun':'야외 양지','outdoorPartialSun':'야외 반양지','outdoorShade':'야외 그늘'}
HUMIDITY={'low':'낮음 · 원자료 수치 없음','medium':'보통 · 원자료 수치 없음','high':'높음 · 원자료 수치 없음','veryHigh':'매우 높음 · 원자료 수치 없음'}
DRAIN={'excellentDrainage':'매우 높은 배수성','wellDraining':'양호한 배수성','moistureRetentive':'보수성 있는 배지','waterloggingTolerant':'침수에 적응한 배지'}
REGULATION='국내 사육·수입 가능 여부 미확인. 구매 전에 현행 생태계교란종·유입주의종·멸종위기종·CITES 규정과 합법적인 인공번식 출처를 확인하세요. 야생 채집이나 방생을 하지 마세요.'
records=json.loads((ROOT/'research/evidence.json').read_text());catalog=[]
for r in records:
 latin=r['latin'];genus,epithet=latin.split();kind=r['kind']
 name=KO.get(latin) or ((GENUS_KO[genus]+' '+epithet) if genus in GENUS_KO else latin)
 e={'id':latin.lower().replace(' ','-'),'kind':kind,'name':name,'latin':latin,'group':r.get('group',''),'subgroup':r.get('subgroup',''),'family':r.get('family',''),'aliases':list(dict.fromkeys([r.get('common',''),*r.get('aliases',[])])),'difficulty':'자료 확인','temp':r.get('temp'),'humidity':r.get('humidity'),'environment':'종별 확인','light':'종별 조명 조건 확인','size':r.get('size','종별 성체 크기 확인'),'origin':r.get('origin','출처에서 분포 확인'),'image':None,'source':r['source'],'evidenceId':r['evidence'],'careBasis':r['careBasis'],'conservation':r.get('conservation',''),'regulation':REGULATION,'reviewedAt':'2026-11-05','comparisonEligible':False}
 e['summary']=f'{name} ({latin})의 분류와 사육 참고 자료입니다. '+('사육 환경 수치는 확인된 출처에 있는 값만 표시합니다.' if kind!='plant' else '재배 장소와 광량을 먼저 확인하고 배지의 실제 건조 상태에 맞춰 관리하세요.')
 e['care']=['도입 전 종별 성체 크기·먹이·주야 온도 구배·필요한 조명을 확인하고 사육장을 준비합니다.','분리 사육으로 상태를 관찰하고 온도·체중·섭식·배변 기록을 남깁니다.','종별 검증 수치가 없는 항목은 일반값으로 추정하지 말고 상세 출처와 전문 사육 자료를 추가 확인합니다.']
 e['caution']='기초 분류 자료를 확보한 항목이며 세부 사육 조건은 추가 검토가 필요합니다. '+REGULATION
 if kind=='reptile':
  e['size']='성체 크기 · 공간 추가 확인'
  if e['group']=='거북':e['care'][1]='수생·반수생 종은 수질과 완전히 마른 일광욕 공간을, 육지거북은 성체 공간·먹이 섬유질·UVB를 별도로 검토합니다.'
  if e['group']=='뱀':e['care'][1]='탈출 방지 구조와 은신처를 마련하고 먹이의 종류·크기·빈도는 종과 나이에 맞춰 확인합니다.'
  if e['group']=='도마뱀':e['care'][1]='지상성·수상성 생활 방식과 UVB·국소 가열 요구가 서로 다르므로 종별로 확인합니다.'
 elif kind=='amphibian':
  e['tradeRecords']=r['tradeRecords'];e['care'][0]='출처 연구에 생체·사육 원산(C/F) 상업 거래 기록이 있습니다. 이는 현재 국내 유통·허가 또는 인공번식 성공을 보장하지 않습니다.'
  e['care'][1]='양서류는 수질·피부 오염·온도에 민감합니다. 종에 맞는 깨끗한 물을 준비하고 이동 전후 검역을 지킵니다.'
  e['care'][2]='개구리·도롱뇽의 생활사와 계절 변화, 수생·육생 단계를 확인하고 과열·건조·질병 전파를 예방합니다.'
 elif kind=='arthropod' and e['group']=='등각류':
  mt=re.fullmatch(r'(\d+)\s*[-–]\s*(\d+)',r['temperature_c'])
  e['temp']=[int(mt[1]),int(mt[2])] if mt else None
  e['humidityLabel']='원자료 정성 지침 · 수치 없음' if not e['humidity'] else '취미 합의 기본값';e['sourceHumidity']=r['humidityText']
  e['difficulty']={'beginner':'쉬움','intermediate':'보통','advanced':'어려움'}.get(r['difficultyRaw'],'자료 확인')
  e['environment']='육상 낙엽층'
  e['care']=['원자료는 취미 사육자 합의에 따른 기본값입니다. 계통과 생활 환경에 맞는 별도 확인이 필요합니다.','육상 등각류는 종별 건조 내성과 환기 요구를 고려해 수분 구배와 은신처를 구성합니다.','낙엽·부후목·칼슘 요구와 먹이 종류를 확인하고 먹이 잔여물과 과밀을 관리합니다.']
  if genus in ['Ligia','Tylos','Deto']:
   e['environment']='해안·기수 환경';e['care'][1]='해안성 종입니다. 염분·젖은 피난처·환기 등 서식지 조건을 확인해야 하며 일반 육상 등각류 통에 그대로 적용하지 않습니다.'
  if genus=='Ligidium':e['environment']='습윤 낙엽층'
  e['caution']='온도는 종별 계통 검증치가 아닌 취미 가이드 기본값입니다. 원자료 습도 지침: '+r['humidityText']+' / '+REGULATION
 elif kind=='arthropod':
  e['difficulty']='어려움';e['environment']='종별 확인';e['comparisonEligible']=bool(e['temp'] and e['humidity'])
  e['care']=['수상성·지상성·버로우 생활 방식에 맞춰 구조를 만들고 낙상과 탈출을 예방합니다.','탈피 중에는 살아 있는 먹이를 제거하고 적절한 은신처와 물을 제공합니다.','온습도는 공개 취미 가이드 값이며 환기·바닥재 수분·주야 변화와 함께 확인합니다.']
  e['caution']='거미는 물림·독성·자극모 등의 위험이 있어 관찰 위주로 관리하고 맨손 취급하지 마세요. '+REGULATION
 elif kind=='plant':
  cat=r['categoryRaw'];group=cat.split(' - ')[-1];e['group']=GROUP_MAP.get(group,'구근식물' if cat=='Bulbs' else '재배식물');e['subgroup']=genus;e['sourceRecord']=r['sourceId']
  e['light']=LIGHT.get(r['lightPreference'],'원자료 확인');e['humidityLabel']=HUMIDITY[r['humidityPreference']];e['comparisonEligible']=bool(r.get('speciesSpecific') and e['temp'] and e['humidity'])
  e['environment']='일반 실내'
  if cat.startswith('Outdoor') or cat=='Bulbs':e['environment']='야외·계절형'
  if 'Succulents' in cat or 'Cacti' in cat:e['environment']='건조형'
  if cat.startswith('Houseplants') and r['humidityPreference'] in ['high','veryHigh']:e['environment']='열대형'
  if 'Aquatic' in cat:e['environment']='수생·습지형'
  if 'Carnivorous' in cat:e['environment']='식충·전용 배지'
  if 'Epiphytes' in cat:e['environment']='착생·통풍형'
  if 'Alpine' in cat:e['environment']='서늘한 고산형'
  e['size']='성숙 크기와 재배 공간 확인';e['hardinessZones']=r['hardinessZones'];e['categoryRaw']=cat
  e['care']=[f'광량: {e["light"]}. 실내·야외 환경과 계절 변화에 맞춰 서서히 적응시킵니다.',f'배지 조건: {DRAIN.get(r["drainagePreference"],"원자료 확인")}. 달력의 고정 주기보다 실제 배지 수분을 확인해 관수합니다.','원자료의 온도는 재배 선호 범위이며 내한 한계나 사육 동물과의 합사 가능 범위가 아닙니다.']
  if 'Carnivorous' in cat:e['care'][1]='식충식물은 종류별로 물의 염류·휴면·비료 요구가 다릅니다. 전용 배지와 저염류 물, 관수 방식을 추가 확인합니다.'
  if 'Aquatic' in cat:e['care'][1]='수생·습지 식물은 완전 수중 재배 가능 여부와 수상엽 적응을 구분하고 수질·광량·뿌리 환경을 확인합니다.'
  toxic=r['plantToxicity'];e['toxicity']={'toxic':'독성 보고','mildlyToxic':'자극·약한 독성 보고','nonToxic':'원자료상 반려동물 비독성 분류','unknown':'독성 자료 불충분'}[toxic]
  e['caution']=e['toxicity']+'. 개·고양이 비독성 분류가 파충류·양서류의 섭취 안전성을 보장하지 않습니다. 살충제 잔류와 성숙 크기를 확인하세요. '+('속·품종군 가이드를 대표 종에 연결한 자료이므로 개별 종에 그대로 적용하지 마세요.' if not r['speciesSpecific'] else '원자료는 전문가 감수가 아닌 커뮤니티 데이터입니다.')
  e['license']='CC BY-NC-SA 4.0';e['sourceDataUrl']='https://github.com/Luminoid/plantfolio-common-plants/blob/'+next(s['commit'] for s in json.loads((ROOT/'research/sources.json').read_text()) if s['id']=='plantfolio')+'/dist/common_plants.json'

 if r.get('humidityEvidence'):
  e['climateEvidence']={'humidity':{'statement':r['humidityEvidence'],'sourceUrl':e.get('sourceDataUrl',e['source']),'recordId':r.get('sourceId',r['latin']),'reviewedAt':'2026-11-05'}}
 catalog.append(e)
assert len({e['latin'] for e in catalog})==len(catalog),'duplicate scientific names'
counts=collections.Counter(e['kind'] for e in catalog)
for kind,n in {'reptile':200,'amphibian':100,'arthropod':100,'plant':300}.items():assert counts[kind]>=n,(kind,counts[kind])
(ROOT/'src/catalog/expanded.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n')
print(dict(counts),'total',len(catalog))
