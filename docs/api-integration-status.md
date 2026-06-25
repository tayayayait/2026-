# API Integration Status

## KAMIS Daily Wholesale/Retail Price Update

Implemented on 2026-06-24:

- Added the KAMIS public-data daily wholesale/retail price API integration.
- Request contract:
  - endpoint: `https://apis.data.go.kr/B552845/perDay/price`
  - response type: `returnType=JSON`
  - required filters: `cond[exmn_ymd::GTE]`, `cond[exmn_ymd::LTE]`, `cond[ctgry_cd::EQ]`, `cond[item_cd::EQ]`
  - optional filters used by the app: `cond[se_cd::EQ]`, `cond[sgg_cd::EQ]`
  - `numOfRows` is capped at the documented maximum of `1000`.
- The app decodes percent-encoded service keys before passing them through `URLSearchParams`; sending an already encoded key directly produced HTTP 401 during validation.
- Farm analysis now attaches `marketPriceSummary` when a registered crop can be mapped to a KAMIS item code.
- KAMIS code workbook support:
  - KAMIS 전체 품목코드: 136개
  - 농산물 계열: 식량작물 15개, 채소류 43개 코드행, 특용작물 18개, 과일류 18개
  - 비작물 계열: 축산물 13개, 수산물 29개
- Current app crop-code mapping covers agricultural price items and common farm-name aliases:
  - 식량작물: `쌀`, `찹쌀`, `혼합곡`, `기장`, `보리쌀`, `콩`, `팥`, `녹두`, `메밀`, `고구마`, `감자`, `귀리`, `보리`, `수수`, `율무`
  - 채소류: `배추`, `양배추`, `시금치`, `상추`, `얼갈이배추`, `갓`, `연근`, `우엉`, `수박`, `참외`, `오이`, `호박`, `토마토`, `딸기`, `무`, `당근`, `열무`, `건고추`, `풋고추`, `붉은고추`, `피마늘`, `양파`, `파`, `생강`, `고춧가루`, `가지`, `미나리`, `깻잎`, `부추`, `피망`, `파프리카`, `멜론`, `깐마늘(국산)`, `깐마늘(수입)`, `양상추`, `청경채`, `케일`, `콩나물`, `절임배추`, `알배기배추`, `브로콜리`, `방울토마토`
  - 특용작물: `참깨`, `들깨`, `땅콩`, `느타리버섯`, `팽이버섯`, `새송이버섯`, `호두`, `아몬드`, `양송이버섯`, `표고버섯`, `국화`, `카네이션`, `장미`, `백합`, `글라디올러스`, `튜울립`, `거베라`, `안개꽃`
  - 과일류: `사과`, `배`, `복숭아`, `포도`, `감귤`, `단감`, `바나나`, `참다래`, `파인애플`, `오렌지`, `자몽`, `레몬`, `체리`, `건포도`, `건블루베리`, `망고`, `블루베리`, `아보카도`
  - 주요 별칭: `벼` -> `쌀`, `고추` -> `풋고추`, `마늘` -> `피마늘`, `대파`/`쪽파` -> `파`, `청양고추`/`꽈리고추`/`오이맛고추` -> `풋고추`, `애호박`/`단호박`/`쥬키니` -> `호박`, `샤인머스켓`/`캠벨얼리`/`거봉`/`델라웨어`/`MBA` -> `포도`
- Farm registration crop support:
  - selectable crops: `감귤`, `감자`, `고추`, `벼`, `배`, `사과`, `파`, `포도`
  - all selectable crops resolve to a KAMIS item code.
  - default lookup is the latest 30 days.
  - if the latest 30 days return zero rows, the app retries once with a 365-day lookback and marks the price source as `FALLBACK`.
  - fallback prices are shown as previous survey references, not current price-trend signals.
- The risk detail screen now shows a `KAMIS 도·소매 가격` card between work-condition evidence and pesticide safety criteria.
- The unified dashboard now includes a fourth `KAMIS 가격 신호` card.
- AI reports receive KAMIS price context as reference evidence only. The report explicitly treats it as wholesale/retail surveyed price, not farm-gate revenue.
- Required server-only environment variable:
  - preferred: `KAMIS_DAILY_PRICE_API_KEY`
  - fallback: `PUBLIC_DATA_SERVICE_KEY`

Current limitations:

- KAMIS requires item codes. The app uses explicit crop-to-item mapping and does not guess unmatched crop names.
- KAMIS also exposes livestock and fisheries item codes, but the farm crop-price signal maps only agricultural item groups.
- Regional prices are available only for KAMIS survey regions. The current Jeonbuk mapping covers `전주(3511)` and `군산(3512)`; other Jeonbuk regions fall back to nationwide prices.
- Some seasonal crops can return empty recent data. The app falls back to the latest 365-day survey result when available and labels it as fallback reference data.
- Prices are KAMIS middle-wholesale and retail survey prices, not farmer settlement prices.

Phase 1 correction on 2026-06-24:

- KAMIS daily price lookup now fetches all pages when `totalCount` exceeds the 1000-row page limit.
- This fixes stale "latest price" summaries for high-volume items where the newest survey rows are returned after page 1.
- Live validation for potato returned the latest survey date `20260622` after pagination.

Phase 2 regression coverage on 2026-06-24:

- The daily price contract test now covers `totalCount=1371` with `numOfRows=1000` and verifies page 2 retrieval.
- The market-price summary behavior test verifies that the latest date and wholesale kg price can come from page 2, not only page 1.

Phase 3 UI placement on 2026-06-24:

- The farm risk detail screen now includes an execution summary card that combines KAMIS price trend with PERS pesticide safety status.
- The summary treats KAMIS as a price signal only and keeps the existing warning that it is not a farm-gate settlement price.

Phase 4 empty-state correction on 2026-06-24:

- The previous fixed-data PERS/KAMIS preview was removed from the empty dashboard state.
- PERS/KAMIS decision UI is now shown only through registered-farm analysis surfaces, so empty users do not see sample pesticide or price values.

Phase 5 dashboard integration on 2026-06-24:

- Registered-farm dashboard analysis now reuses the same execution summary card used by the risk detail screen.
- The dashboard summary combines live KAMIS price context with PERS pesticide safety context before the individual weather, risk, and market cards.

Phase 6 report integration on 2026-06-24:

- AI report generation now receives the same combined PERS/KAMIS execution summary used by the dashboard and risk detail screen.
- Gemini prompts and local fallback reports both include the execution summary before the separate KAMIS and PERS evidence sections.

## PERS Pesticide Registration SVC01 Update

Implemented on 2026-06-24:

- The pesticide registration integration is scoped to the PERS `농약등록정보` API only.
- Request contract:
  - endpoint: `http://psis.rda.go.kr/openApi/service.do`
  - list service: `serviceCode=SVC01`
  - response type: `serviceType=AA001`
  - exact crop matching: `cropCheck=Y`
  - default similar pest matching: `similarFlag=N`
  - `displayCount` is capped at the official maximum of `50`.
- The normalizer now preserves the official SVC01 fields used by farmers:
  - `pestiBrandName`, `pestiKorName`, `compName`
  - `cropName`, `diseaseWeedName`, `useName`
  - `pestiUse`, `dilutUnit`, `useSuittime`, `useNum`
  - `engName`, `cmpaItmNm`, `indictSymbl`, `applyFirstRegDate`
  - `pestiCode`, `diseaseUseSeq`, `cropCd`, `cropLrclCd`, `cropLrclNm`
- Farm risk analysis first requests exact crop and pest registration data. If the exact pest query returns no rows, it retries once with PERS similar pest matching.
- The risk detail screen now labels the panel as `등록농약 안전사용기준` and shows usage method, dilution or 10a usage, PHI, use-count limit, action mechanism, active ingredient, company, product name, and target pest.
- Because this phase uses only PERS `농약등록정보`, the app does not assert registration-cancellation status. The screen explicitly tells users to verify the product label and field conditions before spraying.
- Required server-only environment variable:
  - `PERS_API_KEY`

Phase 1 correction on 2026-06-24:

- PERS safe-use string parsing now extracts numbers from provider text such as `수확7일전` and `3회 이내`.
- This fixes PHI classification input for the growth-stage safety check.
- Live validation for potato returned parsed PHI values after the fix.

Phase 2 regression coverage on 2026-06-24:

- The PERS contract test now covers provider text such as `수확7일전` and `4회`.
- The pesticide safe-use behavior test now covers PHI boundary classification for `결실기` and `개화기`.

Phase 3 UI placement on 2026-06-24:

- The farm risk detail screen now surfaces a combined execution summary before the detailed weather, KAMIS, PERS, and pest-monitoring cards.
- The summary highlights when current growth-stage PHI restrictions make registered pesticides unusable, while still requiring product-label and registration-cancellation checks before spraying.

Phase 4 empty-state correction on 2026-06-24:

- Fixed PERS sample pesticide data was removed from the empty dashboard state.
- PERS SVC01 pesticide safety status is now exposed only from farm-specific analysis results.

Phase 5 dashboard integration on 2026-06-24:

- Dashboard live-summary mapping now preserves `pesticideRecommendations` so PERS safety status can be shown on the registered-farm home dashboard.
- If PERS context is unavailable, the dashboard falls back to the existing individual analysis cards instead of inventing pesticide guidance.

Phase 6 report integration on 2026-06-24:

- Report generation now passes the PERS/KAMIS execution summary through the server input schema instead of relying only on separate reference sections.
- Local fallback reports retain the same safety caveats for PERS registration status and KAMIS non-farm-gate prices.

## NCPMS Growth-Stage Filter Update

Implemented on 2026-06-23:

- Replaced the local generic growth-stage labels with the documented NCPMS SVC13 codes:
  - `18601` 유묘기
  - `18602` 생육초기
  - `18603` 생육중기
  - `18604` 개화기
  - `18605` 결실기
- Farm registration requires an explicit stage selection and stores the stable provider code in `farms.growth_stage_code`.
- Existing labels that cannot be mapped exactly remain `null` and are shown as `생육단계 재선택 필요`; the application does not guess between 생육초기 and 생육중기.
- The farm risk screen passes `farmId` to the NCPMS photo-search route.
- Photo search resolves the registered crop against live SVC11/SVC12 results and sends the registered or user-selected stage as SVC13 `categoryCode`.
- Weed searches omit `categoryCode` because the documented stage filter applies to crop photo searches.
- The UI identifies the active source as `NCPMS SVC13` and exposes the applied crop and stage filters.
- Unsupported `categoryCode` strings are rejected by both the server validator and the NCPMS URL builder.

Boundary:

- SVC16 integrated pest search accepts crop name but not the SVC13 growth-stage `categoryCode`; the dashboard pest candidate list therefore remains crop-based.
- NCPMS does not provide a numeric risk weight for these stage codes. The application's stage-sensitivity contribution remains an explicitly labeled internal policy and is omitted when no official stage code is stored.

## Current Phase

Phase 7 implemented consent-based foreground browser notifications, severity settings, bounded retry, and delivery audit records. The Phase 1-7 Supabase schema is deployed; background push remains unavailable.

## Regional Operations Screen Removal

Updated on 2026-06-23:

- Removed the `지역 운영` navigation entry from the shared desktop and mobile app shell.
- Retired `/admin` and `/admin/rentals` as user-facing screens. Both routes redirect to `/`.
- The regional aggregation and rental-center route code is no longer loaded by those retired routes.
- Existing Supabase migration history for regional read access remains documented as historical infrastructure state.

## Rental Office Recommendation Screen

Implemented on 2026-06-22:

- Preserves the provider's machine names instead of exposing only coarse internal types such as `TRACTOR` or `OTHER`.
- Groups matched machines by rental office so one office is rendered once with all relevant inventory categories.
- Supports 10km, 30km, and 50km straight-line distance filters, machine filtering, and recommendation/distance sorting.
- Separates work-based machine guidance from rental-office discovery in the interface.
- Displays the selected farm and rental offices together on a map with a rental-specific legend.
- Preserves `institutionNm`, `instt_code`, and `referenceDate` from the nationwide standard rental API.
- Supports every documented request parameter, including office/contact/location filters, all inventory fields, institution metadata, and `xml`/`json` response types.
- Parses both XML and JSON response bodies through the same rental-row normalization path.
- Preserves all nine provider inventory categories separately and uses category-aware work matching. Coarse `OTHER` matching no longer recommends harvest equipment for unrelated work.
- Treats `etcRentHoldCo` as free-form holding information, not a numeric holding count. Provider text is preserved without summing model numbers.
- Applies the selected machine to both the office list and each office card, and exposes the active filter with an explicit reset action.
- Labels nationwide standard counts as holdings that require an availability inquiry. Holdings are never presented as live rentable quantities.
- Classifies ODCloud text containing `불가` before text containing `가능` to prevent false availability.

Current limitations:

- Distances are Haversine straight-line distances, not road travel distances or travel times.
- The nationwide standard API does not provide reservations, live remaining stock, fees, opening hours, or model-level inventory.
- ODCloud machine status can be shown only when its office row can be matched to a nationwide standard rental-office record.
- Inventory request parameters are exact provider query values. The UI's "has inventory" filter is therefore applied to normalized response rows rather than sending a fabricated range query.

## Added Integration Primitives

- `src/integrations/openapi/url-builder.ts`
  - Builds encoded request URLs with typed parameter values.
- `src/integrations/openapi/environment.ts`
  - Reads required and optional server-side environment variables.
  - Supports multiple accepted env names for the same provider.
- `src/integrations/openapi/result-codes.ts`
  - Normalizes Korean OpenAPI result codes for public data, KMA, and RDA-style APIs.
  - Converts non-success result codes into `OpenApiIntegrationError`.
- `src/integrations/openapi/envelope.ts`
  - Extracts `resultCode` and `resultMsg` from JSON or XML response envelopes.
- `src/integrations/openapi/xml.ts`
  - Extracts simple XML rows and tag values for NCPMS and Nongsaro APIs.

## Connected Clients

- KMA forecast client now uses:
  - `PUBLIC_DATA_SERVICE_KEY`
  - common URL builder
  - common result-code success check
- Naver geocode client now accepts both:
  - `NAVER_CLIENT_ID` / `NAVER_CLIENT_SECRET`
  - `NAVER_MAPS_KEY_ID` / `NAVER_MAPS_KEY`
- FarmMap-style address search now uses the same provider split as the official FarmMap web UI when keys are configured:
  - parcel address: `VWORLD_API_KEY`
  - road address and coordinates: `JUSO_ROAD_API_KEY` + `JUSO_COORD_API_KEY`, or the shared `JUSO_API_KEY`
- VWorld results are requested in EPSG:4326. Juso coordinate results are converted from EPSG:5179 to WGS84 before FarmMap lookup.
- When Naver Maps Geocoding is not configured or returns HTTP 401/403 because the application is not subscribed to the API, address search falls back to server-side OpenStreetMap Nominatim.
- The Nominatim fallback is restricted to South Korea, sends an identifying User-Agent, caches normalized queries for 24 hours, serializes requests at a maximum of one per second, and displays OpenStreetMap attribution in the address form.
- NCPMS search/detail client now reads `NCPMS_API_KEY` through the common env helper.
- RDA/Nongsaro pest occurrence client now reads:
  - `RDA_PEST_OCCURRENCE_API_KEY`
  - `NONGSARO_API_KEY`
- MAFRA agricultural-weather client reads `MAFRA_API_KEY`, retrieves dataset `Grid_20250220000000000670_1`, and selects the latest observation from the nearest available station.

## Farm Risk Detail Screen

Updated on 2026-06-23:

- Removed the redundant `분석 데이터 출처` summary card from the farm risk detail screen.
- Removed the standalone `NCPMS 병해충·잡초 상세 API 정보` card from the farm risk detail screen.
- NCPMS detail API responses may still be loaded for internal pest-monitoring context, but they are no longer rendered as a separate card on the risk detail page.
- Rows that previously showed only `정보 없음` indicated that the NCPMS detail API returned no usable text for those fields, not that the application had confirmed a zero-risk state.

## Still Not Implemented

- NCPMS general-insect `SVC08` detail lookup.
- NCPMS natural-enemy insect `SVC15` detail lookup.
- Reservation submission to individual rental-center systems.

## Supabase Deployment

Deployed to project `bpteuwiogabfvxqxzmux` on 2026-06-21:

- `20260620155059_create_farms_and_analysis_snapshots.sql`
- `20260620161243_secure_farm_ownership.sql`
- `20260620165218_create_alert_events.sql`
- `20260620171836_create_notification_delivery.sql`

The local and remote migration histories match, and `src/integrations/supabase/types.ts` was regenerated from the linked live schema after deployment.

Supabase Auth anonymous sign-in was enabled and verified on the target project because farmer sessions use `signInAnonymously()`. The project `site_url` was not changed because the production application URL has not been provided.

## Phase 3 KMA Update

Implemented:

- `fetchKmaVilageForecast`
- `fetchKmaUltraShortNowcast`
- `fetchKmaUltraShortForecast`
- `fetchKmaWeatherSnapshot`
- Legacy-compatible `fetchKmaForecast`
- KMA category normalization for:
  - `TMP`, `T1H`
  - `REH`
  - `PCP`, `RN1`
  - `POP`
  - `WSD`
  - `PTY`
  - `SKY`
  - `VEC`
- KMA text precipitation handling:
  - `강수없음`
  - `1mm 미만`, `1.0mm 미만`
  - numeric ranges
- Missing numeric value handling for `+900` and `-900` class values.
- KMA Lambert conformal conic conversion follows the official guide formula. Official workbook samples resolve to Seoul `60,127`, Gimje `59,88`, and Wanju `63,89`.
- Forecast responses are reduced to one time slice per endpoint: the nearest forecast time at or after the current KST time, or the latest available time when no future slice exists.
- Snapshot merge priority is village forecast, ultra-short forecast, then ultra-short nowcast. Nowcast values override forecast values for overlapping categories.
- A missing `PCP` or `RN1` category remains unknown. It is not converted to `0mm`, and incomplete weather snapshots are excluded from risk calculation.
- KMA base date, base time, and grid coordinates are preserved through the legacy analysis adapter and displayed on the detailed risk screen.
- Dashboard and detailed risk labels use `기상청 실황·예보` because the displayed snapshot combines nowcast and forecast endpoints.

Live KMA response validation was completed on 2026-06-18 through the farm report flow.

## Phase 4 Farm Registration Update

Implemented:

- Naver address candidate search server function.
- Maximum 5 address candidates returned to the UI.
- Jeonbuk service-area validation using address aliases and coordinate bounds.
- FarmMap internal parcel adapter contract. Phase 6L replaced the generic placeholder with the official EPIS radius-data contract.
- FarmMap lookup server function.
- FarmMap fallback parcel when `FARMMAP_API_KEY` or `FARMMAP_API_DOMAIN` is not configured.
- Farm registration UI flow:
  - address search
  - address candidate selection
  - automatic FarmMap parcel lookup
  - parcel card selection
  - manual area fallback when FarmMap area is unavailable
  - Farm parcel metadata attached to local `Farm` objects

The previous configurable placeholder endpoint and unknown field mapping were superseded by Phase 6L.

2026-06-22 live validation update:

- Standard-region search, FarmMap PNU, BJD/land-code, and point lookup were validated with current Gimje data.
- The unavailable FarmMap area-analysis path now falls back to BJD/land-code results with inclusive area filtering.
- Eup/myeon/dong searches traverse child ri codes because the FarmMap endpoint returns no rows for the parent code.
- Failed searches clear stale parcel candidates and selection state.
- Detailed evidence is recorded in [farm-registration-phase4-validation.md](./farm-registration-phase4-validation.md).

## Phase 5 Risk Scoring Update

Implemented:

- Risk score direction now matches the product spec:
  - `0-24 SAFE`
  - `25-49 WATCH`
  - `50-74 WARNING`
  - `75-100 CRITICAL`
- Higher score now means higher risk.
- `calculateRiskScore` now uses the documented weighted formula:
  - weather/environment risk: `35%`
  - pest knowledge risk: `25%`
  - surveillance risk: `20%`
  - growth-stage risk: `10%`
  - local-history risk: `10%`
- Farm analysis now passes the registered crop growth stage into risk scoring.
- Risk factor scores now represent positive risk contribution points, not deducted safety points.
- Work type strings and machine mappings were normalized to Korean UTF-8 labels.
- Added a focused behavior test for:
  - optimal rice conditions returning `SAFE`
  - severe weather plus pest candidates returning `CRITICAL`

Important limitation:

- Real surveillance and local-history APIs are still not connected. Until those sources are implemented, those two components are derived from pest count and environmental severity as a placeholder.

## Phase 6A Rental Machine API Update

Implemented:

- Public Data rental machine standard API client:
  - endpoint: `https://api.data.go.kr/openapi/tn_pubr_public_frcn_rent_info_api`
  - env: `PUBLIC_DATA_SERVICE_KEY`
  - request defaults: `pageNo=1`, `numOfRows=1000`, `type=json`
  - response normalization into the domain `Rental` model
- Standard rental inventory mapping:
  - `trctorHoldCo` -> `TRACTOR`
  - `cultvtHoldCo`, `manageHoldCo` -> `CULTIVATOR`
  - `planterHoldCo`, `transplantHoldCo` -> `PLANTER`
  - `rcepntHoldCo` -> `COMBINE`
  - remaining harvest/thresher/etc fields -> `OTHER`
- Count parsing supports additive public-data values such as `4+93`.
- ODCloud/KREI rental-machine detail API client:
  - endpoint: `https://api.odcloud.kr/api/15111689/v1/uddi:42e3e3ab-7818-421f-b919-ffefde2d019d`
  - env priority: `ODCLOUD_SERVICE_KEY`, then `PUBLIC_DATA_SERVICE_KEY`
  - request defaults: `page=1`, `perPage=100`, `returnType=JSON`
  - response normalization for individual machine rows
- Rental recommendation now accepts live `Rental[]` data instead of being locked to demo data.
- `farms/$farmId/machines` now requests server-side rental recommendations from live public data, with sample fallback.
- The rental-office equipment filter exposes all nine standard inventory response fields instead of deriving options only from the current work recommendation.
- Rental-office cards and equipment filtering use each office's complete normalized inventory. Work-matched equipment still determines recommendation priority, while non-matched holdings remain searchable as public holding information.
- Equipment selection uses the stable `MachineCategory` value rather than a display-name string, so the separate cultivator/manager, planter/transplanter, harvest/thresher, rice-harvest, and other fields remain distinct.
- The rental-office screen keeps recommendation-priority ordering internally and no longer exposes a separate recommendation/distance sort control.
- `admin/rentals` now loads rental centers through the server API, with sample fallback.
- Added focused contract tests for URL construction, inventory count parsing, ODCloud row normalization, and injected-rental recommendations.

Important limitations:

- ODCloud/KREI rows do not include coordinates or phone fields in the published Swagger model. They can be used for detailed machine status only after matching to a located rental center.
- Live API validation with the real key was not made part of automated tests to avoid quota-dependent test failures.

## Phase 6B Disease and Pest API Update

Implemented:

- NCPMS REST client:
  - endpoint: `http://ncpms.rda.go.kr/npmsAPI/service`
  - env: `NCPMS_API_KEY`
  - integrated search URL for `SVC16`
  - disease detail URL and parser for `SVC05`
  - insect detail URL and parser for `SVC07`
  - prediction-map metadata request for `SVC31`
- NCPMS integrated search XML normalization into the app `NcpmsPest` model.
- `searchPestsByCrop` now calls NCPMS `SVC16` when `NCPMS_API_KEY` is configured.
- Demo pest data remains as fallback when `NCPMS_API_KEY` is missing or when the crop-specific NCPMS result is empty.
- RDA/Nongsaro pest occurrence client:
  - endpoint base: `http://api.nongsaro.go.kr/service/dbyhsCccrrncInfo`
  - year operation: `dbyhsCccrrncInfoYear`
  - list operation: `dbyhsCccrrncInfoList`
  - env priority: `RDA_PEST_OCCURRENCE_API_KEY`, then `NONGSARO_API_KEY`
- Pest server functions now expose:
  - crop pest search
  - NCPMS disease detail
  - NCPMS insect detail
  - RDA occurrence years
  - RDA occurrence list search
- Added focused contract tests for NCPMS URL construction, NCPMS XML normalization, RDA URL construction, RDA year parsing, and RDA occurrence list parsing.

Important limitations:

- NCPMS `SVC31` prediction-map metadata and WMS rendering were completed in Phase 6G.
- NCPMS `SVC11`, `SVC12`, `SVC13` staged photo search was completed in Phases 6H and 6I. Farm risk candidate search continues to use `SVC16`.
- Live API validation with real service keys was not made part of automated tests to avoid quota-dependent failures.

## Phase 6C Disease and Pest UI Update

Implemented:

- Farm risk analysis now queries RDA/Nongsaro pest occurrence notices after NCPMS crop pest search.
- Occurrence search uses the first NCPMS pest candidate name when available, otherwise the crop name.
- Risk analysis response now includes:
  - `occurrenceSearch`
  - `occurrenceNotices`
- Farm risk detail screen now displays up to 3 pest occurrence notices with:
  - title
  - author/date metadata
  - attachment link when provided
- AI report generation now receives occurrence notices as supporting evidence.
- Gemini report prompt and response-schema descriptions were rewritten in valid Korean.
- Added focused behavior tests for occurrence-search selection and visible notice limiting.

Important limitations:

- Occurrence notice retrieval is read-only. It does not yet open or parse attached PDF/HWP files.
- NCPMS `SVC31` prediction-map visualization was completed in Phase 6G.

## Phase 6D Pest Detail UI Update

Implemented:

- Risk analysis now requests NCPMS detail data for the first disease/insect pest candidates.
- Detail fetch uses:
  - `SVC05` for disease details
  - `SVC07` for insect details
- Detail fetch failures do not fail the whole risk analysis response.
- Disease/insect detail responses are normalized into a screen-specific `PestDetailPanel` model.
- Farm risk detail screen now renders NCPMS detail panels with:
  - title
  - pest type
  - symptoms or damage information
  - development/ecology information
  - prevention method when provided
  - first image when provided
- AI report input now includes normalized NCPMS detail data as supporting evidence.
- Added focused behavior tests for pest detail request selection and detail normalization.

Important limitations:

- Detail panels only appear when `NCPMS_API_KEY` is configured and detail endpoints return usable data.
- Weed detail (`SVC10`) was completed in Phase 6F.
- Prediction-map visualization was completed in Phase 6G.

## Phase 6E Occurrence Attachment Update

Implemented:

- RDA/Nongsaro pest occurrence attachments are normalized from:
  - `downFile`
  - `rtnOrginlFileNm`
- Attachment normalization now derives:
  - file name
  - file type category (`PDF`, `IMAGE`, `HWP`, `DOCUMENT`, `SPREADSHEET`, `OTHER`)
  - browser preview eligibility
- Farm risk detail screen now renders occurrence attachment actions:
  - `미리보기` for browser-previewable PDF/image attachments
  - `다운로드` for all attachment types
- AI report input now includes normalized attachment file name and file type as supporting evidence.
- Added behavior tests for occurrence attachment normalization.

Important limitations:

- Attached files are linked as provided by the RDA/Nongsaro API. The app does not yet proxy, cache, virus-scan, or parse the file body.
- HWP/HWPX attachments are treated as download-only because browser preview support is not reliable.
- Prediction-map visualization was completed in Phase 6G.

## Phase 6F Weed Detail Update

Implemented:

- NCPMS weed detail integration based on the provided sample contract:
  - service code: `SVC10`
  - request parameter: `weedsKey`
  - response fields: Korean/scientific/Japanese/English names, family, shape, ecology, habitat, literature, and images
- Integrated-search detail URLs now recognize the documented plural `weedsKey` parameter.
- Farm risk analysis now requests weed details alongside disease and insect details.
- Weed detail panels display:
  - type label
  - shape and ecology
  - habitat
  - scientific name and family
  - literature
  - English/Japanese names when present
  - first image when present
- Added a server function for direct weed detail lookup.
- Added focused contract and behavior tests for `SVC10` URL construction, XML normalization, request selection, and UI-model normalization.

Important limitations:

- The provided `SVC10` sample does not include a crop name in the detail response, so weed detail panels rely on the search context for crop association and do not display a detail-response crop value.
- Live API validation with the real `NCPMS_API_KEY` remains quota- and environment-dependent.

## Phase 6G Prediction Map Update

Implemented:

- Validated the live `SVC31` response with the configured `NCPMS_API_KEY` without exposing the key.
- Confirmed the current response contains:
  - 10 crop entries in `kncrListData`
  - 54 prediction models in `pestModelByKncrList`
- Corrected the request contract:
  - `serviceCode=SVC31`
  - `serviceType=AA001`
  - `cropList` is a client-side filter in the provided script and is not sent to the API.
- Added metadata normalization for:
  - crop code/name
  - prediction model code/name
  - WMS field code
  - model execution cycle and latest run time
  - information period
  - risk-level name, description, and color
- Added crop matching for farm crops, including `벼`/`쌀` to NCPMS `논벼` normalization.
- Models without any generated prediction date are excluded from the screen.
- Added an HTTPS WMS image URL builder based on the current NCPMS MapServer contract.
- Farm risk analysis now returns the prediction models available for the registered crop.
- Farm risk detail screen now renders:
  - prediction model selector
  - valid date selector
  - farm-coordinate-centered NCPMS prediction image
  - farm location marker
  - model-specific risk-level legend
- Added contract and behavior tests for XML parsing, encoded Korean text, WMS parameters, crop selection, date ranges, and date clamping.

Important limitations:

- The prediction layer is a raster WMS image. The app does not receive a numeric risk value for the exact farm coordinate, so the layer is not included as a quantitative input to the AI report.
- The WMS map is rendered around the farm coordinate without a third-party road or parcel basemap.
- Live API calls remain excluded from automated tests to avoid key and external-service dependencies.

## Phase 6H NCPMS Photo Search API Update

Implemented:

- Added staged NCPMS photo-search clients:
  - `SVC11`: crop-section list
  - `SVC12`: crop list by `cropSectionCode`, including `startPoint` paging
  - `SVC13`: photo candidates by `cropCode` or weed `cropSectionCode=6`
- Added `SVC13` filters for:
  - `categoryCode`
  - `partName`
  - `pestName`
  - `startPoint`
- Added JSON-first and XML-compatible response normalization because the current live service returns JSON while the provided guide samples parse XML.
- Added normalized page metadata:
  - `startPoint`
  - `displayCount`
  - `totalCount`
- NCPMS thumbnail URLs are upgraded from HTTP to HTTPS to prevent mixed-content failures.
- Added supported detail routing:
  - `병생태` -> `SVC05`
  - `해충생태` -> `SVC07`
  - `잡초` -> `SVC10`
- Added server functions for all three search stages and normalized candidate detail lookup.
- Added focused tests for URL encoding, JSON/XML payloads, empty results, paging, category normalization, and detail routing.
- Live response validation on 2026-06-18 confirmed:
  - 6 `SVC11` crop sections
  - 18 food-crop entries from the tested `SVC12` section
  - 20 potato pest entries from the tested `SVC13` request
  - 1,651 weed entries from the unfiltered `SVC13` weed request

Important limitations:

- General insect (`곤충`) candidates require `SVC08`, and natural-enemy insect (`천적곤충`) candidates require `SVC15`. They are returned as candidates but are not incorrectly routed through `SVC07`.
- Candidate detail is available only for `SVC05`, `SVC07`, and `SVC10`.

## Phase 6I Photo Search Screen and Rental Merge Update

Implemented:

- Added `/pests/photo-search` with the complete staged flow:
  - crop section
  - crop selection
  - photo candidate
  - normalized detail information
- Weed section code `6` skips the crop-selection API and directly requests `SVC13`.
- Added candidate-name search, paging, duplicate removal, empty states, unsupported-detail states, and responsive desktop/mobile layouts.
- Candidate name, image, and selected crop are used as fallbacks when a detail API returns only an identifier or omits display fields.
- Added entry links from the farmer dashboard and farm risk screen.
- Split photo-search server functions from the general pest API module.
- Added standard rental-center and ODCloud/KREI machine-detail merge:
  - the standard API remains the source of coordinates, phone number, address, and center identity
  - ODCloud rows are matched by normalized center name and location tokens
  - matched ODCloud machine rows are appended to the standard center inventory
  - duplicate machine IDs are removed
- Sample rental data is now used only when neither public source produces usable rental centers.
- If the standard API succeeds and ODCloud fails, the application keeps the standard API result instead of replacing it with sample data.
- Fixed the `/admin/rentals` parent-route rendering so the rental-center screen is no longer hidden by the admin dashboard.
- Added focused tests for photo-search target selection, page merging, center matching, coordinate preservation, and ODCloud machine attachment.
- Browser validation on 2026-06-18 confirmed ODCloud detail machine names were rendered inside standard rental-center records.

Important limitations:

- ODCloud rows that cannot be matched to a located standard center are excluded when standard-center data exists because ODCloud does not provide reliable coordinates in the documented model.
- Public rental APIs provide inventory/status information, not a common reservation transaction endpoint. The application therefore presents inquiry actions only.

## Phase 6J Report Fallback and Integration Verification

Implemented:

- Added a report-generation domain service that returns either:
  - `GEMINI` when Gemini returns a valid structured response
  - `LOCAL_FALLBACK` when Gemini is unavailable, rejects the request, exceeds quota, or returns an unusable payload
- Replaced the unused legacy fallback with the active rules-based implementation in `src/domains/reports/fallback.ts`.
- Local fallback reports preserve risk factors, pest candidates, machine recommendations, and data-source evidence.
- Internal Gemini error text is not returned to the browser.
- Added report source status values:
  - `LIVE`
  - `EMPTY`
  - `FALLBACK`
  - `FAILED`
- Added explicit source rows for KMA, agricultural weather, NCPMS, RDA occurrence data, nationwide standard rental data, and KREI/ODCloud rental details.
- NCPMS `SVC16` demo candidates are now identified as `FALLBACK` instead of being mislabeled as a live response.
- Agricultural-weather evidence is included in both Gemini and local-fallback reports.
- Added rental evidence to reports and removed duplicate machine rows from the report output.
- Fixed the `/reports/latest` farm-loading race that previously produced `농장 정보를 찾을 수 없습니다.` on first load.
- Normalized a Supabase URL containing `/rest/v1/` to the project origin before SDK initialization.
- Replaced the non-functional rental inquiry button with a `tel:` link when a center phone number is available.

Live validation on 2026-06-18:

- KMA forecast: live response confirmed.
- NCPMS `SVC11` -> `SVC12` -> `SVC13`: live response confirmed through `식량작물` -> `논벼` -> photo candidates.
- NCPMS photo detail: candidate/image fallback confirmed when `SVC05` omitted display text.
- NCPMS `SVC16` for the tested rice report: no crop-filtered live item; demo candidates were used and correctly labeled `FALLBACK`.
- RDA pest occurrence list: request succeeded with an empty result and was labeled `EMPTY`.
- Nationwide standard rental API: live response confirmed.
- KREI/ODCloud rental details: live response and merged detailed machine names confirmed.
- Gemini: live structured report response confirmed.
- Mobile report at 390 x 844: no horizontal overflow.
- Supabase: project endpoint is reachable, but `public.farms` is absent (`PGRST205`); browser storage fallback remains active.

Automated error-path coverage:

- Gemini rejection produces a local report without leaking provider error text.
- Empty NCPMS search results preserve fallback provenance.
- Supabase REST-style URLs normalize to the project origin.

## Phase 6K MAFRA Agricultural Weather

Implemented:

- Connected the MAFRA open API dataset `Grid_20250220000000000670_1` documented in `기상관측현황.xls`.
- Fetches JSON pages in groups of four with a maximum of 1,000 rows per request and caches the combined rows for six hours.
- Reduces each station to its latest observation, then selects the nearest station by haversine distance from the farm coordinates.
- Exposes observation date, station name and distance, rainfall, maximum/minimum/average temperature, humidity, wind, solar radiation, and sunshine duration.
- Treats a simultaneous zero value for maximum, minimum, and average temperature plus humidity as missing core data. Valid rainfall and wind values on the same row remain available.
- Passes the live observation into risk-analysis results, Gemini prompts, local fallback reports, and source evidence.
- Removed fabricated soil moisture and soil temperature values. The source dataset has no soil fields, so soil-dependent risk and work recommendations are skipped when no real soil input exists.

Live validation on 2026-06-20:

- API result code: `INFO-000`.
- Total rows: 17,527 across 7 unique agricultural-weather station coordinates.
- Latest available observation date: `2026-06-18`.
- For the tested Gimje farm coordinates, the nearest available station was `Yeonggwanggun`, approximately 69.6 km away.
- The selected latest row contained valid rainfall and wind values, but its temperature and humidity quartet was all zero and was therefore exposed as missing.
- A cold full-dataset lookup required 18 API requests and approximately 4.3 seconds in the test environment; subsequent requests use the six-hour process cache.

Known limitation:

- The source currently exposes only seven station coordinates in the full response. A 69.6 km nearest-station distance is too coarse for field-level microclimate claims, so reports disclose the station distance and do not infer missing measurements.

## Phase 6L EPIS FarmMap

Implemented from `농식품팜맵서비스시스템_팜맵오픈API_이용자가이드.pdf`, `붙임1.팜맵오픈API 명세서_240507.xlsx`, and the supplied HTML/WFS samples:

- Uses the official radius-data endpoint `https://agis.epis.or.kr/ASD/farmmapApi/getFarmmapDataSeachRadius.do`.
- Sends `x=longitude`, `y=latitude`, `radius`, `mapType=farmmap`, `apiVersion=v2`, `epsg=EPSG:4326`, and `columnType=ENG`.
- Keeps `FARMMAP_API_KEY` and the registered `FARMMAP_API_DOMAIN` on the server. `FARMMAP_API_BASE_URL` remains an optional endpoint override for controlled test or proxy environments.
- Parses the JSONP envelope and rejects `status.result=F` with the provider error cause.
- Maps official v2 fields: `id`, `pnu`, `clsf_nm`, `ldcg_cd`, `stdg_addr`, `area`, `cad_con_ra`, `flight_ymd`, `updt_ymd`, and `geometry[].xy`.
- Converts the provider's actual `geometry[].xy` coordinate objects from UTM-K `EPSG:5179` to WGS84 using `proj4` before storing or rendering boundaries.
- Preserves PNU, land category, crop-land classification, area, cadastral match rate, update year, geometry, and centroid in the selected farm parcel.
- Displays returned parcel boundaries in the farm-registration screen. The boundary and parcel-card selections share the same state.
- Automatically selects a parcel only when exactly one candidate is returned. Multiple candidates require explicit user selection.
- Keeps the coordinate fallback and manual-area flow when credentials are incomplete or the provider call fails.
- Farm registration now exposes the FarmMap lookup state before address selection and clearly distinguishes live FarmMap parcels, coordinate fallback, and no-result states.
- Users can retry the official radius lookup at 50m, 100m, 300m, 500m, or 1000m without repeating the address search.
- Farm registration now overlays the official FarmOpenAPI WMS `farm_map_api` layer on an OpenLayers map matching the FarmMap guide runtime. Address selection performs the radius API lookup; clicking an unselected map location performs the official XY API lookup. Polygon, map, and list selections share state, and the selected FarmMap centroid is persisted as the farm location. API credentials remain server-side behind validated WMS/WFS proxies. See [farm registration map](./farm-registration-map.md).

Correction on 2026-06-25:

- Removed the UI candidate-list cap that kept only the first 30 unique FarmMap parcels after region lookup.
- Removed the area-analysis PNU detail cap that kept only the first 10 extracted PNU values.
- Region and area searches now keep every unique parcel candidate returned by the provider path, subject only to provider response size, quota, and timeout behavior.

### FarmMap map-first screen update

- Replaced the form-embedded overview map with a map-first registration workspace.
- Starts at zoom 14 over the Gimje agricultural area so the official WMS and WFS layers are active immediately.
- Uses aerial imagery by default and provides aerial/general-map and FarmMap-boundary controls.
- Allows point lookup directly from the map before address search; a verified Jeonbuk address is still required before saving.
- Corrected the WFS 2.0 request to the guide contract: `typename=farm_map_api`, `outputformat=json`, `count=200`, `srsname=EPSG:4326`, and `ymin,xmin,ymax,xmax,EPSG:4326` BBOX ordering.
- Normalizes FarmMap application-level failures returned inside HTTP 200 responses to an HTTP 502 proxy response.
- Added WFS contract, WFS proxy, and map-presentation behavior tests.

Validation on 2026-06-20:

- URL generation, JSONP parsing, official-field normalization, polygon projection, selection rules, and parcel persistence contract tests pass.
- The configured key and registered domain returned HTTP 200 with `status.result=S`.
- A 50m lookup around the tested Gimje coordinates returned 7 live parcels.
- The first validated records included PNU, crop-land classification, area, cadastral match rate, update year, and polygon geometry. Converted centroids remained within the queried farm area.
- The registration flow uses a 50m default radius because the 500m response was too large to complete within the client timeout; the provider supports up to 1,000m when explicitly requested.

## UI/UX Integrity Phase 1

Implemented:

- Removed fixed weather (`22.4℃`, humidity `65%`, wind `2.1m/s`) and fixed risk score (`65`) from the unified dashboard.
- Dashboard weather and risk cards now remain `분석 전` until the user opens the farm analysis flow.
- Replaced the unconditional `정상 연동` badge with the actual farm storage source: Supabase, browser storage, empty, or error.
- Removed automatic `SAMPLE_FARMS` injection from the farm store. Empty Supabase results now remain empty, and failed Supabase reads use only real browser-stored farms when present.
- Filters legacy `demo-farm-*` records from browser storage reads so previous sample fallback records are not presented as user farms.
- Removed fabricated alert records, including the unsupported soil-moisture alert. The alert screen now states that persisted alert generation and delivery are not connected.
- Removed sample farm aggregation, fixed regional risks, fixed rental availability rate, and fixed demand forecasts from the admin dashboard.
- Admin dashboard now shows only registered farm data and explicitly marks regional risk/demand aggregation as unavailable.
- Added KMA, agricultural-weather, NCPMS, and RDA source statuses to the farm risk screen.
- Removed claims that soil data is included in dashboard and Gemini report UI copy. The connected MAFRA dataset does not provide soil measurements.
- Corrected rental semantics:
  - nationwide standard API counts are stored as `HOLDING_COUNT`
  - holding counts use `REQUEST_ONLY` and no longer infer live availability from quantity
  - ODCloud machine rows use `RENTAL_STATUS`
  - sample fallback rows use `DEMO` and cannot display as live availability
- Rental screens now identify the upstream source and distinguish `보유 N대` from actual rental status.

Remaining limitations identified in Phase 1:

- Persisted analysis snapshots, derived alerts, and regional risk/equipment-demand metrics were implemented in Phase 4.
- A server refresh worker was implemented in Phase 6. A hosting scheduler and push-delivery channel are still not active.
- The nationwide standard rental API does not expose real-time reservations or available quantities. Users must confirm availability with the rental center.

## Live Dashboard Phase 2

Implemented:

- The unified dashboard now calls the existing `analyzeFarmRisk` server function for the most recently registered farm.
- Dashboard analysis uses React Query with a five-minute stale window and a user-controlled refresh action.
- The weather card displays live KMA temperature, humidity, wind, and rainfall values only when the KMA source status is `LIVE`.
- The risk card displays a score only when:
  - KMA weather status is `LIVE`
  - NCPMS pest status is `LIVE` or a valid `EMPTY` response
- KMA `FALLBACK`/`FAILED` values are hidden from the dashboard instead of exposing internal default values.
- NCPMS `FALLBACK`/`FAILED` results keep live weather visible but suppress the aggregate risk score.
- Added explicit dashboard states for loading, success, partial data, request failure, refresh-in-progress, and pre-analysis.
- Successful and partial responses show the analysis timestamp and the evidence note used for the dashboard calculation.
- Added behavior coverage for live KMA/NCPMS inputs, missing KMA data, NCPMS fallback data, and valid empty NCPMS results.

Limitations identified in Phase 2:

- Farm switching was implemented in Phase 3.
- Agricultural-weather and RDA occurrence source statuses remain available in the detail/report flows but do not currently change the dashboard risk score.
- The detailed risk route exposes the analysis result together with source badges.

## Explicit Missing Data and Farm Selection Phase 3

Implemented:

- Removed the internal KMA fallback values (`25℃`, humidity `60%`, rainfall `0mm`, wind `2.5m/s`) from `analyzeFarmRisk`.
- KMA request failure now returns `weather: null` and source status `FAILED`.
- A partially successful KMA response is also rejected when temperature, humidity, or wind is missing instead of converting the missing field to zero.
- Risk calculation now requires:
  - a live KMA weather object
  - an NCPMS source status of `LIVE` or valid `EMPTY`
- NCPMS `FALLBACK`/`FAILED` results preserve any live weather but return `riskResult: null`.
- The detailed risk screen now renders an explicit `위험도 계산 보류` state and never displays invented weather measurements.
- The weather detail card renders a missing-data state when KMA has no live response.
- The detailed risk screen separates KMA current work-condition judgment from MAFRA agricultural-weather daily observations, so agricultural-weather average temperature is no longer presented as a second current temperature.
- The former `농업기상 vs 기상청` comparison panel was replaced with source-role evidence: KMA for current work judgment, agricultural weather for nearby recent daily observations, and NCPMS for pest evidence.
- AI report contracts now accept nullable risk scores and weather values.
- Gemini prompts and local fallback reports explicitly state `계산 불가` and `사용 가능한 기상청 실응답 없음` when required evidence is missing.
- Machine recommendations fall back to the farm's selected work interests when no reliable risk recommendation exists.
- Added a dashboard farm selector. A valid user selection is preserved; a removed/invalid selection falls back to the first registered farm.
- Changing the selected farm changes the React Query analysis key, card content, detail link, machine recommendation link, and report link together.
- Added behavior coverage for missing KMA data, NCPMS fallback, valid empty NCPMS responses, nullable report generation, and farm-selection resolution.

Limitations identified in Phase 3:

- The selected dashboard farm is session state and is not persisted across a full page reload.
- Historical snapshot persistence, derived alerts, and regional aggregation were implemented in Phase 4.
- Scheduled background refresh remains unimplemented; a snapshot is generated when the dashboard analysis query completes.

## Persistent Analysis and Operations Phase 4

Implemented:

- Added a stable analysis snapshot model containing:
  - farm identity, region, and crop
  - nullable risk score and explicit risk level
  - live weather values when available
  - API source statuses
  - pest candidate count
  - recommended work types
  - analysis timestamp
- Dashboard analysis now saves each completed or partially completed analysis attempt.
- Snapshot persistence is local-first:
  - browser storage is updated immediately
  - Supabase `analysis_snapshots` is then upserted when the table is available
  - remote and browser records are merged by snapshot ID and sorted newest first
  - browser storage retains the latest 200 records
- Added migration `supabase/migrations/20260620155059_create_farms_and_analysis_snapshots.sql` for:
  - `public.farms`
  - `public.analysis_snapshots`
  - farm/time and region/time indexes
  - prototype RLS policies and grants
- Alert Center now derives records from the latest stored snapshot per farm:
  - `CRITICAL` and `WARNING` risk alerts
  - rainfall alerts from KMA values at 30mm or more
  - missing-data information alerts when a reliable risk score cannot be calculated
- Regional Operations now derives:
  - registered farm count
  - latest-snapshot coverage
  - critical/warning region count
  - regional average scores
  - recommended work demand by number of farms
- Removed the Phase 1 placeholder states that claimed alert and aggregate functionality was unavailable.
- Added behavior coverage for snapshot creation, missing-data snapshots, latest-per-farm selection, merge/deduplication, alert derivation, regional coverage, and work-demand aggregation.

Important limitations:

- The remote migration has not been applied. `supabase db push` reports that the local CLI is not linked to a project, so current runtime persistence falls back to browser storage.
- Generated Supabase types were not changed because the remote schema is not yet deployed. Types must be regenerated immediately after applying the migration.
- Dashboard analysis remains an immediate snapshot trigger. Phase 6 added a server refresh worker and read/unread state, but no deployed scheduler, notification delivery, or retention job is active.
- Browser fallback data is device- and browser-specific and is not shared between users.
- The initial migration's open prototype RLS policies are replaced by the Phase 5 security migration when both migrations are applied in order.

## Supabase Identity and Authorization Phase 5

Implemented:

- Removed the `mock-farmer-uuid-1234` authentication path.
- Added Supabase session bootstrap:
  - restores an existing persisted session
  - creates an anonymous Supabase user for passwordless farmer use
  - falls back to device-local storage when anonymous authentication is unavailable
- Added strict role mapping from trusted Supabase `app_metadata.role`:
  - exact `ADMIN` maps to administrator access
  - missing or unrecognized roles map to `FARMER`
  - user-controlled metadata is not used for administrator authorization
- Added `/login` for pre-provisioned administrator email/password accounts.
- Protected `/admin` and all child routes, including `/admin/rentals`, with the `ADMIN` role check.
- Added migration `20260620161243_secure_farm_ownership.sql`:
  - assigns `farms.user_id` from `auth.uid()` by default
  - links farm owners to `auth.users`
  - removes all Phase 4 prototype policies
  - revokes unauthenticated `anon` table access
  - allows farm owners to access only their farms and associated analysis snapshots
  - allows `ADMIN` users from trusted app metadata to access regional records
- Farm inserts now include the authenticated owner ID.
- Farm and analysis snapshot browser fallback keys are scoped by Supabase user ID.
- Existing Phase 4 browser records are migrated only into an anonymous farmer session, preventing administrator account switching from reading the previous device user's fallback records.
- Added behavior coverage for role mapping, anonymous identity handling, administrator authorization, real auth integration, and security migration contracts.
- Security validation:
  - `npm audit`: 0 vulnerabilities
  - `npm audit --omit=dev`: 0 vulnerabilities

Important limitations:

- `npx supabase link --project-ref bpteuwiogabfvxqxzmux` is rejected because the currently authenticated CLI account does not have access to that project.
- The migrations are therefore not applied remotely, and live Supabase types cannot be regenerated yet.
- Anonymous sign-in must be enabled in the target Supabase Auth settings. If it is disabled, the app intentionally uses user-scoped device fallback storage.
- Administrator accounts must be created by a trusted operator and have `app_metadata.role` set to `ADMIN`. The public application does not expose administrator registration or role assignment.
- Authorization is implemented in the UI and prepared RLS migration, but production enforcement begins only after the migrations are deployed to the configured project.

## Public Regional Operations Access

Implemented:

- Removed the administrator-role gate from `/admin` and `/admin/rentals`.
- Every visitor receives the existing anonymous Supabase identity and can open the regional operations screens without an administrator account.
- Added migration `20260621120000_public_regional_operations_read.sql`:
  - allows all authenticated identities, including anonymous users, to read farms and analysis snapshots for regional aggregation
  - preserves owner/administrator restrictions for insert, update, and delete operations
  - does not grant direct `anon` table access
- Kept the administrator login route for compatibility, but it is no longer required for regional operations.

Important limitation:

- The new read policy takes effect only after the migration is applied to the target Supabase project. Until then, non-administrator visitors can open the screen but remote RLS returns only records owned by their anonymous identity.

## Persistent Alerts and Scheduled Refresh Phase 6

Implemented:

- Added a persistent `AlertEvent` domain model with `readAt` state.
- Alert synchronization is idempotent by event ID and preserves existing read state.
- Added operations for:
  - unread count
  - all/unread filtering
  - single-event read updates
  - mark-all-read updates
  - remote/local event collection merging
- Added migration `20260620165218_create_alert_events.sql`:
  - user-scoped composite primary key
  - farm and analysis snapshot references
  - severity validation
  - read timestamp
  - owner/administrator RLS
  - unauthenticated access revocation
- Added user-scoped browser fallback storage for alert events.
- Dashboard snapshot persistence now derives and synchronizes alert events immediately.
- Alert Center now displays persisted events instead of recalculating transient cards only:
  - all and unread segmented filters
  - unread totals
  - single read action
  - mark-all-read action
  - clear local/Supabase source status
- Extracted `executeFarmAnalysis` so interactive and scheduled analysis use identical KMA, MAFRA, NCPMS, RDA, and risk-calculation logic.
- Added `pnpm run analysis:refresh` server command:
  - service-role-only Supabase access
  - never-analyzed and oldest-stale target ordering
  - configurable stale threshold and batch limit
  - sequential upstream API calls
  - deterministic six-hour time-slot IDs by default
  - per-farm failure isolation
  - aggregate JSON execution result without farm names, addresses, or secrets
- Added [scheduled refresh operations](./analysis-refresh-job.md) documentation.
- Added behavior coverage for event idempotency, read-state preservation, filters, stale farm selection, partial batch failures, migration security, UI integration, and refresh runner integration.

Validation limitation:

- The command reaches its credential guard and exits with `SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required`, as expected in the current environment.
- The required tables and RLS policies are deployed, but no scheduled refresh job has been activated because a server-only service role key is not configured.
- A hosting scheduler must be configured separately after one successful manual server run.

## Consent-Based Browser Notifications Phase 7

Implemented:

- Added browser notification preferences:
  - explicit enable/disable state
  - consent timestamp
  - minimum severity: all, warning or higher, or critical only
- Browser permission is requested only from the user's notification switch action.
- Dashboard analysis and Alert Center loading attempt delivery only after prior consent; neither path requests permission automatically.
- Added delivery policy for:
  - unread events only
  - severity filtering
  - successful-delivery deduplication
  - maximum five events per trigger
  - oldest-first ordering
  - maximum three attempts
  - 1-minute and 5-minute retry delays
- Added delivery audit statuses:
  - `DELIVERED`
  - `FAILED`
  - `SKIPPED`
- Audit reasons use non-sensitive codes and do not store farm addresses, contact details, credentials, or browser tokens.
- Added migration `20260620171836_create_notification_delivery.sql`:
  - `notification_preferences`
  - `notification_delivery_logs`
  - user and alert-event composite references
  - owner/administrator RLS
  - unauthenticated access revocation
- Added user-scoped browser fallback for preferences and audit attempts.
- Added an Alert Center settings panel showing permission state and the latest delivery result.
- Added [browser notification operations](./browser-notifications.md) documentation.
- Added behavior coverage for consent gating, severity selection, read filtering, duplicate suppression, retry timing, maximum attempts, migration security, and UI integration.

Important limitations:

- This is foreground browser notification delivery, not service-worker web push. The application must be open for delivery or retry processing.
- Email, SMS, KakaoTalk, and external push providers are not connected.
- Browser permission and delivery require a supported secure browser context. Production must use HTTPS.
- Visual permission-prompt testing is blocked by the current browser-control environment and still requires manual validation.

## Crop-Agnostic Pest Monitoring Workspace

Implemented on 2026-06-23:

- Replaced the unbounded SVC16 record list with a crop-agnostic monitoring workspace for all eight registered crops.
- Grouped duplicate SVC16 rows by crop, pest type, and Korean display name while preserving scientific names, English names, aliases, and raw record counts.
- Separated crop-related catalog data, SVC31 prediction support, and the prediction map into distinct tabs.
- Removed the hard-coded `감시 필요` state from crop catalog records.
- Stopped using the number of crop catalog records as observed pest evidence in risk scoring.
- Kept weather-only risk available when the crop catalog request falls back or fails.
- Centralized verified crop-name aliases, including `벼`/`논벼`/`쌀`, without guessing unrelated crop matches.
- Reset prediction selection by farm and crop, and reject iframe pest-list events for a different crop code.
- Normalized NCPMS image assets to HTTPS and replaced large missing-image cards with compact type-icon fallbacks.
- Added [pest monitoring workspace](./pest-monitoring-workspace.md) semantics and regression guidance.

## Next Phase

1. Apply all pending Supabase migrations, including public regional read access.
2. Configure server-only secrets and run `pnpm run analysis:refresh` manually.
3. Configure a non-overlapping hourly hosting schedule and retention policies for snapshots and audit logs.
4. Validate public read and owner-only write RLS behavior against the deployed project before production traffic.
5. Add a service worker and push subscription backend only if notifications must arrive while the app is closed.

## NCPMS Prediction Iframe Proxy Fix (2026-06-23)

- Fixed the local Vite `/api/ncpms-proxy` rewrite so NCPMS SVC31 AJAX calls receive `NCPMS_API_KEY` upstream.
- Kept the browser-facing iframe request keyless; the key is injected only by the local proxy or server proxy.
- Added CORS headers to the NCPMS proxy so the iframe can run with `sandbox="allow-scripts"` without `allow-same-origin`.
- Removed the unused Google Maps script from the SVC31 prediction iframe path, eliminating the `NoApiKeys`, `SensorNotRequired`, and non-async Google Maps warnings for that path.
- The prediction map flow uses NCPMS SVC31 metadata first, then the official NCPMS OpenLayers SDK creates a MapServer/WMS overlay with the model `fieldCode`.
- React selection state now uses `dbyhsMdlCode`, matching the SDK select value; `fieldCode` is not used as the UI selection ID.
