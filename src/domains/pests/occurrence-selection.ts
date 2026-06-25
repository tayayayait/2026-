import type { NcpmsPest } from "../../integrations/ncpms/disease";
import type {
  RdaPestOccurrence,
  RdaPestOccurrenceListOptions,
} from "../../integrations/rda/pest-occurrence";

export type OccurrenceAttachmentKind =
  | "PDF"
  | "IMAGE"
  | "HWP"
  | "DOCUMENT"
  | "SPREADSHEET"
  | "OTHER";

export interface OccurrenceAttachment {
  fileName: string;
  fileUrl: string;
  kind: OccurrenceAttachmentKind;
  canPreview: boolean;
}

export const selectPestOccurrenceSearchOptions = (
  crop: string,
  pests: Pick<NcpmsPest, "name">[],
): RdaPestOccurrenceListOptions => {
  const firstPestName = pests.find((pest) => pest.name.trim().length > 0)?.name.trim();

  return {
    sType: "sCntntsSj",
    sText: firstPestName || crop,
    pageNo: 1,
  };
};

export const selectVisiblePestOccurrences = (
  occurrences: RdaPestOccurrence[],
  limit = 3,
): RdaPestOccurrence[] => occurrences.slice(0, Math.max(0, limit));

const getExtension = (fileName: string, fileUrl: string) => {
  const target = fileName || fileUrl.split("?")[0] || "";
  const match = target.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1] || "";
};

const inferFileNameFromUrl = (fileUrl: string) => {
  try {
    const url = new URL(fileUrl);
    const pathName = url.pathname.split("/").filter(Boolean).at(-1);
    return pathName ? decodeURIComponent(pathName) : "";
  } catch {
    const pathName = fileUrl.split("?")[0]?.split("/").filter(Boolean).at(-1);
    return pathName ? decodeURIComponent(pathName) : "";
  }
};

const getAttachmentKind = (extension: string): OccurrenceAttachmentKind => {
  if (extension === "pdf") return "PDF";
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(extension)) return "IMAGE";
  if (["hwp", "hwpx"].includes(extension)) return "HWP";
  if (["doc", "docx", "ppt", "pptx"].includes(extension)) return "DOCUMENT";
  if (["xls", "xlsx", "csv"].includes(extension)) return "SPREADSHEET";
  return "OTHER";
};

export const normalizeOccurrenceAttachment = (
  occurrence: Pick<RdaPestOccurrence, "fileUrl" | "fileName" | "title">,
): OccurrenceAttachment | null => {
  const fileUrl = occurrence.fileUrl?.trim();
  if (!fileUrl) return null;

  const fileName =
    occurrence.fileName?.trim() ||
    inferFileNameFromUrl(fileUrl) ||
    `${occurrence.title.trim() || "발생정보"} 첨부파일`;
  const kind = getAttachmentKind(getExtension(fileName, fileUrl));

  return {
    fileName,
    fileUrl,
    kind,
    canPreview: kind === "PDF" || kind === "IMAGE",
  };
};
