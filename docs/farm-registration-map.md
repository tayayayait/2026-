# 팜맵 기반 농장 등록 지도

> 통합 검색 요청·응답은 [Phase 1 계약](./farm-registration-phase1-contract.md), 현재 화면 흐름은 [Phase 3 UI](./farm-registration-phase3-ui.md)를 참고한다.

농장 등록 화면은 농림축산식품부·EPIS FarmOpenAPI의 WMS, WFS, 데이터 API를 조합해 팜맵 농경지를 탐색하고 등록할 필지를 선택한다.

## 화면 구조

- 좌측 패널: `주소/PNU`와 `지역 조건` 탭, 법정동 계층 선택, 지번·면적·경지 구분 입력, 후보 필지 목록과 경지 유형 배지
- 전체 지도: OpenLayers 항공영상 배경, 경지 구분별 WFS 벡터 필지, 색상 범례·필터, 선택형 팜맵 WMS 경계, 지도 클릭 조회
- 하단 패널: 선택 필지 정보, 저장될 지역, 농장명·작물·생육 단계·재배면적 입력
- 초기 위치: 전북 김제 농경지 권역, 줌 14
- 주소를 검색하지 않아도 지도를 이동하거나 클릭해 필지를 조회할 수 있다.
- 주소/PNU 또는 지역 조건 결과를 선택하면 중심 좌표가 있는 필지를 지도에 표시한다.
- 최종 등록에는 중심 좌표가 있는 팜맵 필지와 농장 정보가 필요하다.
- 지도 범례에서 `논`, `밭`, `과수`, `시설` 토글을 끄면 해당 경지 유형의 WFS 벡터 필지를 숨긴다.

## 주소 및 지역 검색

- 법정동 검색은 행정표준코드 API의 `locatadd_nm` 검색 결과를 사용한다.
- 지번 검색은 법정동코드, 일반/산 구분, 본번, 부번으로 PNU를 생성한 뒤 팜맵 PNU 상세조회를 실행한다.
- PNU 19자리를 알고 있으면 직접 입력할 수 있다.
- 지역 조건 검색은 행정표준코드 계층과 팜맵의 법정동·경지 분류·면적 검색 API를 사용한다.
- 팜맵이 요청한 경지 코드와 다른 분류명을 섞어 반환하면 후단에서 요청 분류와 맞는 후보만 남긴다.
- 지도 클릭은 팜맵 좌표 조회 API를 사용한다.

## FarmOpenAPI 적용 규격

### WMS

- 엔드포인트: `farmmapApi/wms.do`
- `service=WMS`
- `version=1.1.1`
- `request=GetMap`
- `layers=farm_map_api`
- `styles=01`
- `format=image/png`
- `transparent=true`
- `srs=EPSG:3857`
- `landcd=01,02,03,04`

브라우저는 `/api/farm-map/wms` 프록시만 호출한다. API 키와 등록 도메인은 서버가 추가한다. 공식 서버 응답 지연으로 인한 간헐 타일 실패를 줄이기 위해 프록시는 15초까지 대기하고 업스트림 fetch 예외를 1회 재시도한다. 공식 WMS 스타일은 분홍 계열 raster fill을 포함하므로 항공영상 판독을 막지 않도록 기본값은 OFF이며, 사용자가 `팜맵 경계` 버튼으로 켤 수 있다.

### WFS

- 엔드포인트: `farmmapApi/wfs.do`
- `service=WFS`
- `version=2.0.0`
- `request=GetFeature`
- `typename=farm_map_api`
- `outputformat=json`
- `count=200`
- `srsname=EPSG:4326`
- BBOX: `ymin,xmin,ymax,xmax,EPSG:4326`

OpenLayers 지도에서 계산한 `xmin,ymin,xmax,ymax` 경계는 서버 프록시에서 명세의 EPSG:4326 축 순서로 변환한다. 공급자가 HTTP 200 안에 `status.result=F`를 반환하면 프록시는 HTTP 502로 정규화한다. 공식 서버 응답 지연으로 인한 간헐 조회 실패를 줄이기 위해 프록시는 15초까지 대기하고 업스트림 fetch 예외를 1회 재시도한다.

### 데이터 API

- 반경 조회: `farmmapApi/getFarmmapDataSeachRadius.do`
- 좌표 조회: `farmmapApi/getFarmmapDataSeachXY.do`
- 공통값: `mapType=farmmap`, `apiVersion=v2`, `epsg=EPSG:4326`, `columnType=ENG`

## 선택 동작

1. WFS는 현재 지도 영역에서 최대 200개 벡터 필지를 조회한다.
2. 벡터 필지 경계 색상은 `논=하늘색`, `밭=황색`, `과수=녹색`, `시설=보라색`으로 표시한다.
3. WMS는 사용자가 `팜맵 경계`를 켠 경우에만 줌 14 이상에서 공식 팜맵 raster 경계를 표시한다.
4. 벡터 경계나 필지 목록을 클릭하면 선택 필지 중심으로 이동하고 줌 16~18 범위로 자동 확대하며, PNU·분류·면적·지적일치율·갱신연도를 표시한다. 같은 필지를 다시 클릭해도 다시 확대한다.
5. 빈 지도 위치를 클릭하면 좌표 데이터 API로 해당 위치의 필지를 조회한다.
6. 주소 후보를 선택하면 반경 데이터 API를 호출하고 지도 중심을 조회 위치로 이동한다.
7. 농장 저장 시 지역은 선택 필지 주소에서 지번을 제거한 뒤 전북 주소는 `시군구 읍면동`, 그 외 주소는 `시도 시군구` 형식으로 저장한다.

## 제한사항

- 팜맵 경계는 농경지 분석 참고자료이며 법적 측량 경계가 아니다.
- 지도 렌더러는 공식 가이드 예제의 OpenLayers 런타임을 사용한다.
- 항공 배경은 Esri World Imagery이며 팜맵 데이터가 아니다.
- 팜맵 API 키와 발급 시 등록한 도메인이 일치하지 않으면 WMS/WFS/데이터 조회가 실패한다.
- 외부 API 실호출은 키·쿼터·공급자 상태에 의존하므로 자동 테스트에서는 URL 계약과 프록시 동작만 검증한다.

## 농장 ID 브라우저 호환성

- 농장 등록 ID는 브라우저의 `crypto.randomUUID()`를 우선 사용한다.
- `randomUUID()`를 지원하지 않는 브라우저나 비보안 컨텍스트에서는 `crypto.getRandomValues()` 기반 UUID v4를 생성한다.
- Web Crypto 자체를 사용할 수 없는 구형 환경에서도 등록을 막지 않도록 비암호학적 난수 기반 UUID v4를 최종 대체 경로로 사용한다. 이 ID는 인증 토큰이 아니라 농장 레코드 식별자다.
