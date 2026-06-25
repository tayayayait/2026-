import {
  buildNcpmsDiseaseDetailUrl,
  buildNcpmsInsectInfoDetailUrl,
  buildNcpmsNaturalEnemyDetailUrl,
  buildNcpmsIntegratedSearchUrl,
  buildNcpmsWeedDetailUrl,
  normalizeNcpmsSearchXml,
  normalizeNcpmsWeedDetailXml,
  selectNcpmsCropSearchResult,
} from "./disease";
import {
  buildNcpmsPredictionMetadataUrl,
  normalizeNcpmsPredictionMetadataXml,
} from "./prediction-map";
import {
  buildNcpmsPhotoCandidatesUrl,
  buildNcpmsPhotoCropsUrl,
  buildNcpmsPhotoSectionsUrl,
  normalizeNcpmsPhotoCandidates,
  normalizeNcpmsPhotoCrops,
  normalizeNcpmsPhotoSections,
} from "./photo-search";
import { readNcpmsDevProxyApiKey, rewriteNcpmsDevProxyPath } from "./dev-proxy";

const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};

const searchUrl = buildNcpmsIntegratedSearchUrl("test-key", { startPoint: 10 });
assert(
  searchUrl.startsWith("http://ncpms.rda.go.kr/npmsAPI/service?"),
  "NCPMS search endpoint mismatch",
);
assert(searchUrl.includes("apiKey=test-key"), "NCPMS search URL must include apiKey");
assert(searchUrl.includes("serviceCode=SVC16"), "NCPMS search URL must use SVC16");
assert(searchUrl.includes("startPoint=10"), "NCPMS search URL must include startPoint");

const diseaseUrl = buildNcpmsDiseaseDetailUrl("test-key", "D000001");
assert(diseaseUrl.includes("serviceCode=SVC05"), "NCPMS disease detail URL must use SVC05");
assert(diseaseUrl.includes("sickKey=D000001"), "NCPMS disease detail URL must include sickKey");

const weedUrl = buildNcpmsWeedDetailUrl("test-key", "W000001");
assert(weedUrl.includes("serviceCode=SVC10"), "NCPMS weed detail URL must use SVC10");
assert(weedUrl.includes("weedsKey=W000001"), "NCPMS weed detail URL must include weedsKey");

const insectInfoUrl = buildNcpmsInsectInfoDetailUrl("test-key", "I000002");
assert(insectInfoUrl.includes("serviceCode=SVC08"), "NCPMS insect info detail URL must use SVC08");
assert(insectInfoUrl.includes("insectKey=I000002"), "NCPMS insect info detail URL must include insectKey");

const naturalEnemyUrl = buildNcpmsNaturalEnemyDetailUrl("test-key", "I000003");
assert(naturalEnemyUrl.includes("serviceCode=SVC15"), "NCPMS natural enemy detail URL must use SVC15");
assert(naturalEnemyUrl.includes("insectKey=I000003"), "NCPMS natural enemy detail URL must include insectKey");

const predictionUrl = buildNcpmsPredictionMetadataUrl("test-key");
assert(predictionUrl.includes("serviceCode=SVC31"), "NCPMS prediction URL must use SVC31");
assert(
  predictionUrl.includes("serviceType=AA001"),
  "NCPMS prediction URL must include serviceType",
);
assert(
  !predictionUrl.includes("cropList="),
  "NCPMS prediction metadata URL must not send the client-only cropList filter",
);

const devProxyPath = rewriteNcpmsDevProxyPath(
  "/api/ncpms-proxy?apiKey=&serviceCode=SVC31",
  "dev-key",
);
const devProxyUrl = new URL(`http://localhost${devProxyPath}`);
assert(devProxyUrl.pathname === "/npmsAPI/service", "dev proxy must target NCPMS service");
assert(devProxyUrl.searchParams.get("apiKey") === "dev-key", "dev proxy must inject apiKey");
assert(
  devProxyUrl.searchParams.get("serviceType") === "AA001",
  "dev proxy must force the AJAX service type",
);
assert(
  readNcpmsDevProxyApiKey({ NCPMS_API_KEY: "server-key", VITE_NCPMS_API_KEY: "public-key" }) ===
    "server-key",
  "dev proxy must prefer the server-only NCPMS key",
);
assert(
  readNcpmsDevProxyApiKey({ VITE_NCPMS_API_KEY: "legacy-public-key" }) === "legacy-public-key",
  "dev proxy should support the legacy public env key for local compatibility",
);

const predictionMetadata = normalizeNcpmsPredictionMetadataXml(`
<service>
  <kncrListData>
    <item>
      <kncrCode>FC010101</kncrCode>
      <kncrNm>${encodeURIComponent("논벼")}</kncrNm>
    </item>
  </kncrListData>
  <pestModelByKncrList>
    <item>
      <kncrCode>FC010101</kncrCode>
      <kncrNm>${encodeURIComponent("논벼")}</kncrNm>
      <dbyhsMdlCode>1000000013</dbyhsMdlCode>
      <dbyhsMdlNm>${encodeURIComponent("잎도열병")}</dbyhsMdlNm>
      <fieldCode> RB_IR </fieldCode>
      <drveCycle>1</drveCycle>
      <nowDrveDatetm>2026062012</nowDrveDatetm>
      <drveBeginMon>5</drveBeginMon>
      <drveBeginDe>1</drveBeginDe>
      <drveEndMon>9</drveEndMon>
      <drveEndDe>30</drveEndDe>
      <pestConfigStr>${encodeURIComponent(
        "경보!+@+!방제가 필요함!+@+!FF0000|주의!+@+!예찰이 필요함!+@+!FFCC00",
      )}</pestConfigStr>
    </item>
  </pestModelByKncrList>
</service>
`);

assert(predictionMetadata.crops.length === 1, "prediction metadata crop count mismatch");
assert(predictionMetadata.crops[0]?.name === "논벼", "prediction crop name must be decoded");
assert(predictionMetadata.models.length === 1, "prediction metadata model count mismatch");
assert(predictionMetadata.models[0]?.name === "잎도열병", "prediction model name mismatch");
assert(predictionMetadata.models[0]?.fieldCode === "RB_IR", "prediction field code mismatch");
assert(
  predictionMetadata.models[0]?.riskLevels.length === 2,
  "prediction risk level count mismatch",
);
assert(predictionMetadata.models[0]?.riskLevels[0]?.name === "경보", "risk level name mismatch");
assert(predictionMetadata.models[0]?.riskLevels[0]?.color === "#FF0000", "risk color mismatch");

const photoSectionsUrl = buildNcpmsPhotoSectionsUrl("test-key");
assert(photoSectionsUrl.includes("serviceCode=SVC11"), "photo sections URL must use SVC11");

const photoCropsUrl = buildNcpmsPhotoCropsUrl("test-key", {
  cropSectionCode: "1",
  startPoint: 11,
});
assert(photoCropsUrl.includes("serviceCode=SVC12"), "photo crops URL must use SVC12");
assert(photoCropsUrl.includes("cropSectionCode=1"), "photo crops URL needs cropSectionCode");
assert(photoCropsUrl.includes("startPoint=11"), "photo crops URL needs startPoint");

const photoCandidatesUrl = new URL(
  buildNcpmsPhotoCandidatesUrl("test-key", {
    cropCode: "FC010101",
    categoryCode: "18604",
    partName: "잎",
    pestName: "도열병",
    startPoint: 21,
  }),
);
assert(photoCandidatesUrl.searchParams.get("serviceCode") === "SVC13", "candidate URL mismatch");
assert(photoCandidatesUrl.searchParams.get("cropCode") === "FC010101", "crop code mismatch");
assert(photoCandidatesUrl.searchParams.get("categoryCode") === "18604", "growth stage mismatch");
assert(photoCandidatesUrl.searchParams.get("partName") === "잎", "part name encoding mismatch");
assert(photoCandidatesUrl.searchParams.get("pestName") === "도열병", "pest name encoding mismatch");
assert(photoCandidatesUrl.searchParams.get("startPoint") === "21", "candidate startPoint mismatch");

const weedCandidatesUrl = new URL(
  buildNcpmsPhotoCandidatesUrl("test-key", {
    cropSectionCode: "6",
    categoryCode: "18601",
    partName: "18701",
    pestName: "피",
  }),
);
assert(weedCandidatesUrl.searchParams.get("cropSectionCode") === "6", "weed section mismatch");
assert(weedCandidatesUrl.searchParams.get("cropCode") === null, "weed URL must omit cropCode");

let invalidGrowthStageRejected = false;
try {
  buildNcpmsPhotoCandidatesUrl("test-key", {
    cropCode: "FC010101",
    categoryCode: "pest" as "18601",
  });
} catch {
  invalidGrowthStageRejected = true;
}
assert(invalidGrowthStageRejected, "undocumented SVC13 categoryCode must be rejected");

const photoSections = normalizeNcpmsPhotoSections(
  JSON.stringify({
    service: {
      startPoint: 1,
      displayCount: 10,
      totalCount: 2,
      list: [
        {
          cropSectionCode: "1",
          cropSectionName: "식량작물",
          thumbImg: "http://ncpms.rda.go.kr/image/food.jpg",
        },
        {
          cropSectionCode: "6",
          cropSectionName: "잡초      ",
          thumbImg: "https://ncpms.rda.go.kr/image/weed.jpg",
        },
      ],
    },
  }),
);
assert(photoSections.items.length === 2, "SVC11 JSON item count mismatch");
assert(photoSections.items[1]?.name === "잡초", "section name must be trimmed");
assert(
  photoSections.items[0]?.imageUrl === "https://ncpms.rda.go.kr/image/food.jpg",
  "NCPMS image URL must use HTTPS",
);

const photoCrops = normalizeNcpmsPhotoCrops(`
<service>
  <startPoint>11</startPoint>
  <displayCount>10</displayCount>
  <totalCount>18</totalCount>
  <list>
    <item>
      <cropCode>FC010101</cropCode>
      <cropName>벼</cropName>
      <thumbImg>https://example.test/rice.jpg</thumbImg>
    </item>
  </list>
</service>
`);
assert(photoCrops.items[0]?.code === "FC010101", "SVC12 crop code mismatch");
assert(photoCrops.startPoint === 11, "SVC12 startPoint mismatch");
assert(photoCrops.totalCount === 18, "SVC12 totalCount mismatch");

const emptyPhotoCrops = normalizeNcpmsPhotoCrops(
  JSON.stringify({
    service: { startPoint: 1, displayCount: 10, totalCount: 0, list: [] },
  }),
);
assert(emptyPhotoCrops.items.length === 0, "SVC12 empty JSON list must normalize to []");

const photoCandidates = normalizeNcpmsPhotoCandidates(`
<service>
  <startPoint>1</startPoint>
  <displayCount>10</displayCount>
  <totalCount>3</totalCount>
  <list>
    <item>
      <pestKey>D000001</pestKey>
      <pestName>도열병</pestName>
      <category>병생태</category>
      <thumbImg>https://example.test/disease.jpg</thumbImg>
    </item>
    <item>
      <pestKey>I000001</pestKey>
      <pestName>벼멸구</pestName>
      <category>해충생태</category>
      <thumbImg>https://example.test/insect.jpg</thumbImg>
    </item>
    <item>
      <pestKey>W000001</pestKey>
      <pestName>피</pestName>
      <category>잡초</category>
      <thumbImg>https://example.test/weed.jpg</thumbImg>
    </item>
  </list>
</service>
`);
assert(photoCandidates.items.length === 3, "SVC13 candidate count mismatch");
assert(photoCandidates.items[0]?.type === "DISEASE", "disease candidate type mismatch");
assert(photoCandidates.items[0]?.detailServiceCode === "SVC05", "disease detail mapping mismatch");
assert(photoCandidates.items[1]?.type === "INSECT", "insect candidate type mismatch");
assert(photoCandidates.items[1]?.detailServiceCode === "SVC07", "insect detail mapping mismatch");
assert(photoCandidates.items[2]?.type === "WEED", "weed candidate type mismatch");
assert(photoCandidates.items[2]?.detailServiceCode === "SVC10", "weed detail mapping mismatch");

const pests = normalizeNcpmsSearchXml(`
<document>
  <buildTime>20260618</buildTime>
  <totalCount>1</totalCount>
  <list>
    <item>
      <detailUrl>http://ncpms.rda.go.kr/npmsAPI/service?serviceCode=SVC05&amp;sickKey=D000001</detailUrl>
      <divCode>DI</divCode>
      <divName>병</divName>
      <korName>도열병</korName>
      <oprName>벼 도열병</oprName>
      <cropName>벼</cropName>
      <cropCode>FC010101</cropCode>
      <thumbImg>https://example.test/rice.jpg</thumbImg>
    </item>
  </list>
</document>
`);

assert(pests.length === 1, "NCPMS search XML should produce one pest");
assert(pests[0]?.id === "D000001", "NCPMS pest id should be extracted from detailUrl");
assert(pests[0]?.name === "도열병", "NCPMS pest name mismatch");
assert(pests[0]?.type === "DISEASE", "NCPMS pest type mismatch");
assert(pests[0]?.crop === "벼", "NCPMS pest crop mismatch");
assert(pests[0]?.imageUrl === "https://example.test/rice.jpg", "NCPMS pest image URL mismatch");

const insecureImagePests = normalizeNcpmsSearchXml(`
<document>
  <list>
    <item>
      <detailUrl>http://ncpms.rda.go.kr/npmsAPI/service?serviceCode=SVC07&amp;insectKey=I000001</detailUrl>
      <divName>해충</divName>
      <korName>복숭아순나방</korName>
      <cropName>사과</cropName>
      <thumbImg>http://ncpms.rda.go.kr/npmsAPI/thumbnailViewer2.mo?imageFileName=test</thumbImg>
    </item>
  </list>
</document>
`);
assert(
  Boolean(insecureImagePests[0]?.imageUrl?.startsWith("https://ncpms.rda.go.kr/")),
  "NCPMS image URL must not create browser mixed-content failures",
);

const exactCropPests = normalizeNcpmsSearchXml(
  `
<document>
  <list>
    <item><korName>배 병해충</korName><cropName>배</cropName></item>
    <item><korName>꽃양배추 병해충</korName><cropName>꽃양배추</cropName></item>
    <item><korName>담배 병해충</korName><cropName>담배</cropName></item>
    <item><korName>양파 병해충</korName><cropName>양파</cropName></item>
    <item><korName>파 병해충</korName><cropName>파</cropName></item>
  </list>
</document>
`,
  "배",
);
assert(exactCropPests.length === 1, "short crop names must not use substring matching");
assert(exactCropPests[0]?.crop === "배", "pear search must retain only the exact pear crop");

const riceAliasPests = normalizeNcpmsSearchXml(
  `<document><list><item><korName>도열병</korName><cropName>논벼</cropName></item></list></document>`,
  "벼",
);
assert(riceAliasPests.length === 1, "verified rice aliases must remain valid crop matches");

const weedPests = normalizeNcpmsSearchXml(`
<document>
  <list>
    <item>
      <detailUrl>http://ncpms.rda.go.kr/npmsAPI/service?serviceCode=SVC10&amp;weedsKey=W000001</detailUrl>
      <divName>잡초</divName>
      <korName>피</korName>
      <cropName>벼</cropName>
    </item>
  </list>
</document>
`);

assert(weedPests[0]?.id === "W000001", "NCPMS weed id should be extracted from weedsKey");
assert(weedPests[0]?.type === "WEED", "NCPMS weed type mismatch");

const liveCropSearch = selectNcpmsCropSearchResult("벼", weedPests);
assert(liveCropSearch.source === "NCPMS", "non-empty NCPMS search must retain live source");
assert(liveCropSearch.items === weedPests, "live NCPMS search items must not be replaced");

const fallbackCropSearch = selectNcpmsCropSearchResult("벼", []);
assert(
  fallbackCropSearch.source === "DEMO_FALLBACK",
  "empty NCPMS search must identify demo fallback",
);
assert(fallbackCropSearch.items.length > 0, "known demo crop must provide fallback candidates");

const weedDetail = normalizeNcpmsWeedDetailXml(
  `
<document>
  <weedsKorName>피</weedsKorName>
  <weedsScientificName>Echinochloa crus-galli</weedsScientificName>
  <weedsFamily>벼과</weedsFamily>
  <weedsJpnName>イヌビエ</weedsJpnName>
  <weedsEngName>barnyard grass</weedsEngName>
  <weedsShape><![CDATA[잎은 길고 편평하다.]]></weedsShape>
  <weedsEcology>한해살이풀</weedsEcology>
  <weedsHabitat>논과 습지</weedsHabitat>
  <literature>잡초도감</literature>
  <imageList>
    <item>
      <imageTitle>피 전체</imageTitle>
      <image>https://example.test/weed.jpg</image>
    </item>
  </imageList>
</document>
`,
  "W000001",
);

assert(weedDetail.id === "W000001", "NCPMS weed detail id mismatch");
assert(weedDetail.name === "피", "NCPMS weed detail name mismatch");
assert(weedDetail.scientificName === "Echinochloa crus-galli", "weed scientific name mismatch");
assert(weedDetail.family === "벼과", "weed family mismatch");
assert(weedDetail.shape === "잎은 길고 편평하다.", "weed shape mismatch");
assert(weedDetail.ecology === "한해살이풀", "weed ecology mismatch");
assert(weedDetail.habitat === "논과 습지", "weed habitat mismatch");
assert(weedDetail.literature === "잡초도감", "weed literature mismatch");
assert(weedDetail.imageUrls[0] === "https://example.test/weed.jpg", "weed image mismatch");

console.log("NCPMS integration contract tests passed");
