import { latLngToGrid } from "./grid-converter";

const assertGrid = (
  name: string,
  coordinate: { lat: number; lng: number },
  expected: { nx: number; ny: number },
) => {
  const actual = latLngToGrid(coordinate.lat, coordinate.lng);
  if (actual.nx !== expected.nx || actual.ny !== expected.ny) {
    throw new Error(
      `${name} grid mismatch: expected ${expected.nx},${expected.ny}, got ${actual.nx},${actual.ny}`,
    );
  }
};

assertGrid("Seoul", { lat: 37.5635694444444, lng: 126.980008333333 }, { nx: 60, ny: 127 });
assertGrid("Gimje", { lat: 35.8005749999999, lng: 126.882752777777 }, { nx: 59, ny: 88 });
assertGrid("Wanju", { lat: 35.8429694444444, lng: 127.149597222222 }, { nx: 63, ny: 89 });

console.log("KMA grid converter behavior tests passed");
