/**
 * TypeScript types for the Policy Claims Tracker API (backend-api).
 * Mirrors the JSON shapes returned by the Express/Mongoose API — see
 * ../../../docs/DESIGN.md for the source-of-truth data model.
 */

export type ObjectId = string;

// ---------------------------------------------------------------------------
// User
// ---------------------------------------------------------------------------

export type UserRole = "adjuster" | "admin";

export interface User {
  _id: ObjectId;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Policy
// ---------------------------------------------------------------------------

export type PolicyType = "auto" | "home" | "life";
export type PolicyStatus = "active" | "expired" | "cancelled";

export interface Policy {
  _id: ObjectId;
  policyNumber: string;
  holderName: string;
  type: PolicyType;
  premium: number;
  status: PolicyStatus;
  effectiveDate: string;
  expirationDate: string;
  /** A plain id on list/create/update responses; a populated User on GET /policies/:id. */
  owner: ObjectId | User;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Claim
// ---------------------------------------------------------------------------

export type ClaimStatus = "submitted" | "under-review" | "approved" | "denied" | "closed";

export interface ClaimNote {
  /** A plain id on most responses; a populated User only where explicitly noted. */
  author: ObjectId | User;
  text: string;
  createdAt: string;
}

export interface Claim {
  _id: ObjectId;
  claimNumber: string;
  /** A plain id on list responses; a populated Policy on GET /claims/:id and in dashboard.recentClaims. */
  policy: ObjectId | Policy;
  description: string;
  incidentDate: string;
  amount?: number;
  status: ClaimStatus;
  /** A plain id on list responses; a populated User on GET /claims/:id and in dashboard.recentClaims. */
  assignedTo: ObjectId | User;
  notes: ClaimNote[];
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Pagination (GET /policies, GET /claims)
// ---------------------------------------------------------------------------

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface PaginatedPolicies {
  policies: Policy[];
  pagination: Pagination;
}

export interface PaginatedClaims {
  claims: Claim[];
  pagination: Pagination;
}

// ---------------------------------------------------------------------------
// Stats & dashboard
// ---------------------------------------------------------------------------

export interface ClaimStats {
  totalClaims: number;
  totalAmount: number;
  byStatus: Record<ClaimStatus, number>;
}

export interface DashboardStats {
  totalClaims: number;
  claimsByStatus: Record<ClaimStatus, number>;
  totalPolicies: number;
  policiesByType: Record<PolicyType, number>;
  totalUsers: number;
  /** Last 5 claims, newest first, with `policy` and `assignedTo` populated. */
  recentClaims: Claim[];
  totalClaimAmount: number;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export interface RegisterResponse {
  user: User;
}

export interface LoginResponse {
  token: string;
  expiresAt: string;
  user: User;
}

export interface MeResponse {
  user: User;
}

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

export type DbConnectionState = "connected" | "connecting" | "disconnecting" | "disconnected";

export interface HealthResponse {
  status: "ok" | "error";
  db: DbConnectionState;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/** A single express-validator field error, as returned in ApiErrorResponse.errors. */
export interface ValidationFieldError {
  type: string;
  msg: string;
  path: string;
  location: string;
  value?: unknown;
}

/** Shape of every non-2xx JSON response from the API. */
export interface ApiErrorResponse {
  message?: string;
  errors?: ValidationFieldError[];
}
