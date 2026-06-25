import assert from "node:assert/strict";

const pnuModule = await import("./pnu").catch(() => ({}));
const buildParcelPnu = Reflect.get(pnuModule, "buildParcelPnu");
const formatParcelLotAddress = Reflect.get(pnuModule, "formatParcelLotAddress");

assert.equal(typeof buildParcelPnu, "function", "PNU builder must be implemented");
assert.equal(
  buildParcelPnu({
    bjdCode: "4513035021",
    mainLot: "234",
    subLot: "5",
    isMountain: false,
  }),
  "4513035021102340005",
);
assert.equal(
  buildParcelPnu({
    bjdCode: "4513035021",
    mainLot: "12",
    isMountain: true,
  }),
  "4513035021200120000",
);
assert.equal(
  buildParcelPnu({ bjdCode: "45130", mainLot: "1", isMountain: false }),
  null,
  "Invalid legal-district codes must be rejected",
);
assert.equal(
  buildParcelPnu({ bjdCode: "4513035021", mainLot: "0", isMountain: false }),
  null,
  "Main lot zero must be rejected",
);

assert.equal(typeof formatParcelLotAddress, "function", "Parcel address formatter must be implemented");
assert.equal(
  formatParcelLotAddress("전북특별자치도 김제시 만경읍 만경리", "234", "5", false),
  "전북특별자치도 김제시 만경읍 만경리 234-5",
);
assert.equal(
  formatParcelLotAddress("전북특별자치도 김제시 만경읍 만경리", "12", "", true),
  "전북특별자치도 김제시 만경읍 만경리 산 12",
);

console.log("parcel PNU behavior tests passed");
