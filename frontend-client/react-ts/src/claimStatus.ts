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

export const CLAIM_STATUS_COLORS: Record<ClaimStatus, string> = {
  submitted: "#3b82f6",
  "under-review": "#f59e0b",
  approved: "#22c55e",
  denied: "#dc2626",
  closed: "#6b7280",
};
