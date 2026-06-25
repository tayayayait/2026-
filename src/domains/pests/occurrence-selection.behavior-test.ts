import {
  normalizeOccurrenceAttachment,
  selectPestOccurrenceSearchOptions,
  selectVisiblePestOccurrences,
} from "./occurrence-selection";

const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};

const pestSearch = selectPestOccurrenceSearchOptions("벼", [{ name: "도열병" }]);

assert(pestSearch.sType === "sCntntsSj", "occurrence search should target title");
assert(pestSearch.sText === "도열병", "occurrence search should prefer first pest name");
assert(pestSearch.pageNo === 1, "occurrence search should default to first page");

const cropSearch = selectPestOccurrenceSearchOptions("고추", []);
assert(cropSearch.sText === "고추", "occurrence search should fall back to crop name");

const visible = selectVisiblePestOccurrences(
  [
    { id: "1", title: "첫 번째", registeredAt: "2026-06-18" },
    { id: "2", title: "두 번째", registeredAt: "2026-06-17" },
    { id: "3", title: "세 번째", registeredAt: "2026-06-16" },
    { id: "4", title: "네 번째", registeredAt: "2026-06-15" },
  ],
  3,
);

assert(visible.length === 3, "visible occurrences should be limited");
assert(visible[0]?.title === "첫 번째", "visible occurrences should preserve API order");

const pdfAttachment = normalizeOccurrenceAttachment({
  title: "도열병 발생정보",
  fileName: "notice.pdf",
  fileUrl: "https://example.test/files/notice.pdf?download=1",
});

assert(pdfAttachment?.kind === "PDF", "PDF attachment kind mismatch");
assert(Boolean(pdfAttachment?.canPreview), "PDF attachment should be previewable");
assert(pdfAttachment?.fileName === "notice.pdf", "explicit attachment file name mismatch");

const hwpAttachment = normalizeOccurrenceAttachment({
  title: "잎집무늬마름병 발생정보",
  fileUrl: "https://example.test/files/%EC%9E%8E%EC%A7%91%EB%AC%B4%EB%8A%AC.hwp",
});

assert(hwpAttachment?.kind === "HWP", "HWP attachment kind mismatch");
assert(!hwpAttachment?.canPreview, "HWP attachment should not be browser-previewable");
assert(hwpAttachment?.fileName === "잎집무늬.hwp", "URL-derived attachment file name mismatch");

const missingAttachment = normalizeOccurrenceAttachment({
  title: "첨부 없는 발생정보",
  fileUrl: " ",
});
assert(missingAttachment === null, "missing attachment URL should return null");

console.log("pest occurrence selection behavior tests passed");
