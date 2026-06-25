import type { NcpmsGrowthStageCode } from "./growth-stage";

export interface NcpmsPhotoSearchPage<T> {
  items: T[];
  startPoint: number;
  displayCount: number;
  totalCount: number;
}

export interface NcpmsPhotoSection {
  code: string;
  name: string;
  imageUrl?: string;
}

export interface NcpmsPhotoCrop {
  code: string;
  name: string;
  imageUrl?: string;
}

export type NcpmsPhotoDetailServiceCode =
  | "SVC05"
  | "SVC07"
  | "SVC08"
  | "SVC10"
  | "SVC15"
  | "UNKNOWN";

export interface NcpmsPhotoCandidate {
  id: string;
  name: string;
  category: string;
  type: "DISEASE" | "INSECT" | "WEED" | "UNKNOWN";
  detailServiceCode: NcpmsPhotoDetailServiceCode;
  detailSupported: boolean;
  imageUrl?: string;
}

export interface NcpmsPhotoCropsOptions {
  cropSectionCode: string;
  startPoint?: number;
}

export interface NcpmsPhotoCandidatesOptions {
  cropCode?: string;
  cropSectionCode?: string;
  categoryCode?: NcpmsGrowthStageCode;
  partName?: string;
  pestName?: string;
  startPoint?: number;
}
