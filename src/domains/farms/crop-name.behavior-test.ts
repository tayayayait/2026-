import assert from "node:assert/strict";
import type { Crop } from "./types";
import { getAcceptedCropNames, matchesCropName } from "./crop-name";

const crops: Crop[] = ["감귤", "감자", "고추", "벼", "배", "사과", "파", "포도"];

crops.forEach((crop) => {
  assert.ok(
    getAcceptedCropNames(crop).includes(crop),
    `${crop}는 자기 이름을 항상 허용해야 합니다.`,
  );
  assert.equal(matchesCropName(crop, crop), true, `${crop} 정확 일치가 유지되어야 합니다.`);
});

assert.equal(matchesCropName("벼", "논벼"), true, "벼 농장은 NCPMS 논벼와 일치해야 합니다.");
assert.equal(matchesCropName("벼", "쌀"), true, "벼 농장은 기존 쌀 표기와 일치해야 합니다.");
assert.equal(matchesCropName("사과", "배"), false, "다른 작물을 추측해 연결하면 안 됩니다.");

console.log("farm crop name behavior tests passed");
