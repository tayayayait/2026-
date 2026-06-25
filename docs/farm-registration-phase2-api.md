# 필지 등록 Phase 2 API

Phase 2는 Phase 1의 검색 계약을 실제 서버 통합에 연결한다. 화면 연결 결과는 [Phase 3 UI](./farm-registration-phase3-ui.md)를 참고한다.

## 단일 검색 진입점

TanStack 서버 함수 `searchFarmParcelCandidates`가 네 검색 모드를 처리한다.

- `RADIUS`: 기존 FarmMap 반경 조회
- `POINT`: 기존 FarmMap 좌표 조회
- `PNU`: PNU 19자리 상세 조회
- `REGION`: 법정동코드와 농경지 분류 또는 면적 조건 조회

좌표 검색의 `parcels`와 상세 검색의 결과는 모두 `FarmParcelCandidateSearchResult.candidates`로 반환한다.

## PNU 생성

`buildParcelPnu`는 다음 순서로 19자리 PNU를 생성한다.

1. 법정동코드 10자리
2. 일반번지 `1` 또는 산번지 `2`
3. 본번 4자리
4. 부번 4자리

본번은 1~9999, 부번은 0~9999만 허용한다.

## 행정표준코드

- 엔드포인트: `StanReginCd/getStanReginCdList`
- 요청: `ServiceKey`, `type=json`, `pageNo`, `numOfRows`, `flag=Y`
- 주소 검색 선택값: `locatadd_nm`
- 서버 함수: `searchStandardRegionCodes`, `getStandardRegionTree`
- 응답: JSON과 XML 모두 정규화
- 계층: `SIDO`, `SIGUNGU`, `EUP_MYEON_DONG`, `RI`

API 키는 `STANDARD_REGION_API_KEY`를 우선하고, 없으면 기존 `PUBLIC_DATA_SERVICE_KEY`를 사용한다. 두 값 모두 서버에서만 읽는다.

공급자 서버는 명시적인 `Accept` 헤더가 포함되면 HTTP 500을 반환하므로 해당 헤더를 전송하지 않는다.

## FarmMap 상세 검색

### PNU

- 엔드포인트: `getFarmmapDataSeachPnu.do`
- 요청: `apiKey`, `domain`, `pnu`, `columnType=KOR`

### 법정동·분류

- 엔드포인트: `getFarmmapDataSeachBjdAndLandCode.do`
- 요청: `apiKey`, `domain`, `bjdCd`, `landCd`, `mapType=farmmap`, `apiVersion=v2`, `columnType=KOR`
- 분류가 여러 개면 코드별 요청을 병렬 실행하고 PNU 기준으로 중복을 제거한다.

### 면적

- 엔드포인트: `getFarmmapDataSeachAnalysisBaseAttr.do`
- 요청: `bjdCd`, `landCd`, `fromBaseArea`, `toBaseArea`, `columnType=KOR`
- 분석 응답에서 추출된 전체 PNU를 PNU 상세조회로 완성한다.
- 2026-06-22 현재 공급자 면적 분석 엔드포인트가 HTML 404 페이지를 반환하므로, 실패 시 법정동·경지 조회 결과의 정규화 면적을 로컬에서 필터링한다. 실검증 결과는 [Phase 4 문서](./farm-registration-phase4-validation.md)를 참고한다.

## 오류와 제한

- 공급자 HTTP 오류와 `status.result=F`는 성공 결과로 취급하지 않는다.
- 행정표준코드 전체 목록은 페이지당 1000건, 최대 30페이지로 제한한다.
- 면적 검색의 PNU 상세조회는 앱에서 개수 상한을 두지 않는다. 공급자 응답·쿼터·타임아웃이 실제 반환 범위를 결정한다.
- 외부 API 키·도메인·쿼터 상태에 따라 실호출 결과가 달라질 수 있다.
