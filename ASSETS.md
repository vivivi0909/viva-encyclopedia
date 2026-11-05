# 실제 사진과 출처

AI 생성 이미지는 사용하지 않습니다. 이전의 생성 이미지 4개와 식물 배경 그림은 앱 및 배포 자산에서 제거했습니다.

## 종별 실제 사진

- `src/catalog/media.json`: Wikimedia Commons 사진 메타데이터
- `src/catalog/inat-media.json`: iNaturalist의 재사용 허가된 연구 등급 또는 커뮤니티 식별로 뒷받침된 사육·재배 관찰 사진 메타데이터
- `public/photos/`: 다운로드한 실제 사진 파일

사진별로 촬영자(또는 원출처의 저작자 표시), 제목, 원문 페이지, 라이선스 및 라이선스 링크, 다운로드 URL, 변경 사항, 확인일, 파일 SHA-256을 기록합니다. Commons의 파일 제목·설명·분류에 학명이 일치하거나 iNaturalist의 연구 등급 관찰 종이 학명·확인된 이명과 일치한 경우만 연결합니다. 이 절차는 모든 사진을 전문가가 독립 재동정했다는 의미는 아닙니다.

허용한 사진 라이선스는 CC0·퍼블릭 도메인·CC BY·CC BY-SA입니다. 권리 정보가 없는 사진이나 all rights reserved 사진은 사용하지 않습니다. 출처의 AI 생성·그림·지도 표시가 감지되는 파일도 제외합니다. 재사용 권리를 확인하지 못한 종은 사진 수집 대기로 남깁니다. 다른 종의 사진이나 생성 이미지로 대체하지 않습니다.

등록 사진의 상세 화면에는 촬영자·출처·라이선스·변경 사항을 표시합니다. 일부 파일은 출처에서 이미 축소한 파생 이미지입니다. VIVA에서 이미지 내용을 생성하거나 바꾸지 않았습니다. 사진을 다시 배포할 때는 각 사진의 BY/SA 조건을 유지하세요.

## 메인 실제 사진

`research/hero-photo.json`에 자세한 출처를 기록했습니다.

- 촬영자: linolafett
- 원작: Grass 01, https://www.deviantart.com/linolafett/art/Grass-01-434853879
- 이용 조건: CC0-1.0
- 제공 파일: scikit-image v0.24.0의 `skimage/data/grass.png`
- 원 제공자가 자르고 흑백 변환한 실제 촬영 사진을 그대로 사용
- 이용 조건 확인: https://github.com/scikit-image/scikit-image/blob/v0.24.0/skimage/data/_fetchers.py#L470-L486

이 사진은 특정 도감 종의 식별 사진으로 표시하지 않고 메인 배경으로만 사용합니다. 인터페이스 아이콘과 로고는 코드로 그린 UI 요소입니다.

## 수집 도구와 재현

```bash
python3 scripts/commons_photos.py --workers 4
python3 scripts/inaturalist_photos.py
```

네트워크 접근이 필요하며 라이선스·종 일치를 확인하지 못하면 건너뜁니다. 종별 출처 기록은 사이트 동작에 포함되고 사진 원본 파일은 정적 자산으로 배포됩니다. 결과는 `research/photo-import-report.json`, `research/inaturalist-import-report.json`에서 확인합니다. 가져온 사진의 품질·구도·식별은 추가 검토할 수 있습니다.

후속 보완에서는 연구 등급 사진이 없는 종에 한해, 종 수준의 커뮤니티 식별과 동의 기록이 있는 사육·재배 관찰 사진도 확인했습니다. 해당 기록은 `identificationBasis`에 연구 등급 사진과 구분되어 있으며 상세 화면에 표시합니다. 최종 생물 사진 연결 수는 704종이고 생성 이미지 사용 수는 0입니다.
