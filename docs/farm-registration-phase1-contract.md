# 필지 등록 Phase 1 계약

> Phase 2의 실제 서버 API 연결은 [farm-registration-phase2-api.md](./farm-registration-phase2-api.md)를 참고한다.

Phase 1은 참조 프로젝트의 상세 검색을 현재 TanStack Start 구조에 추가하기 위한 도메인 경계를 정의한다. 외부 API 실호출과 화면 변경은 Phase 2와 Phase 3에서 진행한다.

## 검색 요청

모든 필지 검색 입력은 `farmParcelSearchRequestSchema`로 서버 경계에서 검증한다.

| 모드 | 필수값 | 선택값 | 제한 |
| --- | --- | --- | --- |
| `RADIUS` | `lat`, `lng`, `representativeAddress` | `radiusMeters` | 반경 기본 50m, 최대 1000m |
| `POINT` | `lat`, `lng`, `representativeAddress` | 없음 | 대한민국 유효 좌표 범위 |
| `PNU` | `pnu` | 없음 | 숫자 19자리 |
| `REGION` | `bjdCode`, `landCodes` | `minAreaSquareMeter`, `maxAreaSquareMeter` | 법정동코드 10자리, 면적 0 이상 |

농경지 분류 코드는 `01` 논, `02` 밭, `03` 과수, `04` 시설, `06` 비경지다. 중복 코드는 계약 파싱 시 제거한다. 최대 면적이 최소 면적보다 작으면 요청을 거부한다.

## 통합 결과

`FarmParcelCandidate`는 참조 프로젝트의 법정동주소·원본 응답과 현재 프로그램의 경계·지적 메타데이터를 함께 보존한다.

- 식별: `farmMapId`, `pnu`
- 주소: `representativeAddress`, `legalDongAddress`
- 토지: `landCategory`, `cropLandType`
- 면적: `areaSquareMeter`, `cultivatedAreaSquareMeter`, `cultivationRatio`
- 품질: `cadastralMatchRate`, `aerialPhotoYear`, `updatedYear`
- 지도: `geometry`, `centroid`
- 추적: `source`, `raw`

현재 지도에서 사용하는 `FarmMapParcel`은 `FarmParcelCandidate`를 확장하고 유효한 중심좌표를 필수로 요구한다.

## 응답 정규화

`normalizeFarmMapPayload`는 FarmMap의 `columnType=ENG`와 `columnType=KOR` 응답을 동일한 결과로 변환한다. 영문 필드 `pnu`, `stdg_addr`, `clsf_nm`, `area`와 한글 필드 `대표PNU`, `법정동주소`, `분류명`, `면적`을 모두 처리한다.

공급자가 `status.result=F`를 반환하면 원인을 포함한 오류를 발생시킨다. 정상 응답에 `status`가 생략된 경우에도 `output.farmmapData.data`가 있으면 처리한다.

## 환경 변수

FarmMap과 행정표준코드 키는 브라우저로 전달하지 않는다.

- 기존: `FARMMAP_API_KEY`, `FARMMAP_API_DOMAIN`
- Phase 2 추가: `STANDARD_REGION_API_KEY`
- 선택 재정의: `FARMMAP_API_BASE_URL`, `STANDARD_REGION_BASE_URL`

로컬 변수 이름은 `.env.example`을 기준으로 관리한다. 실제 키 값은 `.env` 또는 배포 환경의 서버 비밀 변수에만 둔다.
