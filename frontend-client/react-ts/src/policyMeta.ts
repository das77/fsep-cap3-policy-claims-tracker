import type { PolicyStatus, PolicyType } from "./types";

export const POLICY_TYPES: PolicyType[] = ["auto", "home", "life"];

export const POLICY_TYPE_LABELS: Record<PolicyType, string> = {
  auto: "Auto",
  home: "Home",
  life: "Life",
};

export const POLICY_STATUSES: PolicyStatus[] = ["active", "expired", "cancelled"];

export const POLICY_STATUS_LABELS: Record<PolicyStatus, string> = {
  active: "Active",
  expired: "Expired",
  cancelled: "Cancelled",
};

/** Semantic tone for each status — drives badge color. */
export const POLICY_STATUS_TONE: Record<PolicyStatus, string> = {
  active: "success",
  expired: "neutral",
  cancelled: "danger",
};
