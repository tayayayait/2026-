import {
  buildOpenApiUrl,
  createOpenApiError,
  ensureOpenApiSuccess,
  parseKoreanOpenApiEnvelope,
  readServerEnv,
} from ".";

const endpoint: string = buildOpenApiUrl("https://api.data.go.kr/openapi/example", {
  serviceKey: "encoded-key",
  pageNo: 1,
  numOfRows: 100,
  type: "json",
});

const envValue: string = readServerEnv(
  { source: "KMA", names: ["PUBLIC_DATA_SERVICE_KEY"] },
  { PUBLIC_DATA_SERVICE_KEY: "test-key" },
);

const jsonEnvelope = parseKoreanOpenApiEnvelope({
  response: {
    header: {
      resultCode: "00",
      resultMsg: "NORMAL_CODE",
    },
  },
});

const xmlEnvelope = parseKoreanOpenApiEnvelope(
  "<resultCode>03</resultCode><resultMsg>NODATA_ERROR</resultMsg>",
);

ensureOpenApiSuccess("KMA", jsonEnvelope);

const error = createOpenApiError("RDA", "11", "인증키 누락 또는 오류");
const recoverable: boolean = error.recoverable;

void endpoint;
void envValue;
void xmlEnvelope;
void recoverable;
