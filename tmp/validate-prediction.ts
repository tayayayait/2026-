import { readFileSync } from "fs";
import { normalizeNcpmsPredictionMetadataXml } from "../src/integrations/ncpms/prediction-map";

const xml = readFileSync("../ncpms-svc31.xml", "utf8");
const metadata = normalizeNcpmsPredictionMetadataXml(xml);

console.log("파싱된 작물 수:", metadata.crops.length);
console.log("파싱된 예측모델 수:", metadata.models.length);
console.log("---작물 샘플---");
metadata.crops.slice(0, 5).forEach((c) => console.log(" ", c.code, c.name));
console.log("---예측모델 샘플 (위험도 등급 포함)---");
metadata.models
  .filter((m) => m.riskLevels.length > 0)
  .slice(0, 3)
  .forEach((m) => {
    console.log(" ", m.cropName, "/", m.name, "(fieldCode:", m.fieldCode + ")");
    m.riskLevels.forEach((l) =>
      console.log("    -", l.name, ":", l.description.slice(0, 40), "[" + l.color + "]"),
    );
  });
console.log("---최근 구동 모델 (lastRunAt)---");
metadata.models
  .filter((m) => m.lastRunAt)
  .slice(0, 3)
  .forEach((m) => console.log(" ", m.name, m.lastRunAt, "구동주기:" + m.driveCycle));

// 잡초/논벼 매칭 테스트
const rice = metadata.crops.find((c) => c.name.includes("논벼") || c.name === "벼");
console.log("---벼 작물 매칭---", rice ? `${rice.code} ${rice.name}` : "없음");
const riceModels = metadata.models.filter((m) => m.cropCode === rice?.code);
console.log("벼 예측모델 수:", riceModels.length);
