import { isRetiredRegionalOperationsPath } from "./admin-route";

const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};

assert(isRetiredRegionalOperationsPath("/admin"), "admin root must be treated as retired");
assert(
  isRetiredRegionalOperationsPath("/admin/rentals"),
  "admin rental path must be treated as retired",
);
assert(!isRetiredRegionalOperationsPath("/alerts"), "non-admin routes must remain active");

console.log("retired admin route behavior tests passed");
