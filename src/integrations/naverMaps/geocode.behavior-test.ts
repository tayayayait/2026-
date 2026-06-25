import { geocodeAddress } from "./geocode";
import { readFileSync } from "node:fs";

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

const requestedUrls: string[] = [];
const response = await geocodeAddress("전주시", {
  clientId: "configured-but-not-subscribed",
  clientSecret: "configured-but-not-subscribed",
  fetcher: async (input) => {
    const url = String(input);
    requestedUrls.push(url);
    if (url.includes("naveropenapi.apigw.ntruss.com")) {
      return Response.json(
        {
          error: {
            errorCode: "210",
            message: "Permission Denied",
            details: "A subscription to the API is required.",
          },
        },
        { status: 401 },
      );
    }

    return Response.json([
      {
        lat: "35.8237631",
        lon: "127.1472805",
        display_name: "전주시, 전북특별자치도, 대한민국",
        address: {
          city: "전주시",
          state: "전북특별자치도",
          country: "대한민국",
          country_code: "kr",
        },
      },
    ]);
  },
});

assert(requestedUrls.length === 2, "Naver permission failure must trigger one fallback request");
assert(
  requestedUrls[1]?.startsWith("https://nominatim.openstreetmap.org/search?"),
  "address fallback must use the Nominatim search endpoint",
);
assert(response.status === "OK", "fallback geocoding status mismatch");
assert(response.addresses.length === 1, "fallback geocoding result count mismatch");
assert(
  response.addresses[0]?.roadAddress === "전북특별자치도 전주시",
  "fallback result must normalize Korean address order",
);
assert(response.addresses[0]?.x === "127.1472805", "fallback longitude mismatch");
assert(response.addresses[0]?.y === "35.8237631", "fallback latitude mismatch");

const formPanelSource = readFileSync(
  new URL("../../components/farm-registration-form-panel.tsx", import.meta.url),
  "utf8",
);
assert(
  formPanelSource.includes("OpenStreetMap"),
  "address search UI must display OpenStreetMap attribution for fallback results",
);

console.log("address geocoding fallback behavior tests passed");
