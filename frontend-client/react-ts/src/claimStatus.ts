import type { ClaimStatus } from "./types";

export const CLAIM_STATUSES: ClaimStatus[] = [
  "submitted",
  "under-review",
  "approved",
  "denied",
  "closed",
];

export const CLAIM_STATUS_LABELS: Record<ClaimStatus, string> = {
  submitted: "Submitted",
  "under-review": "Under Review",
  approved: "Approved",
  denied: "Denied",
  closed: "Closed",
};

/** Semantic tone for each status — drives both badge color and chart bar color. */
export const CLAIM_STATUS_TONE: Record<ClaimStatus, string> = {
  submitted: "info",
  "under-review": "warning",
  approved: "success",
  denied: "danger",
  closed: "neutral",
};

export const CLAIM_STATUS_COLORS: Record<ClaimStatus, string> = {
  submitted: "var(--color-info)",
  "under-review": "var(--color-warning)",
  approved: "var(--color-success)",
  denied: "var(--color-danger)",
  closed: "var(--color-neutral)",
};
