import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import { getErrorMessage } from "../errorMessage";
import { useAuth } from "../useAuth";
import type { ClaimStatus, DashboardStats, Policy } from "../types";

const CLAIM_STATUS_LABELS: Record<ClaimStatus, string> = {
  submitted: "Submitted",
  "under-review": "Under Review",
  approved: "Approved",
  denied: "Denied",
  closed: "Closed",
};

const CLAIM_STATUS_COLORS: Record<ClaimStatus, string> = {
  submitted: "#3b82f6",
  "under-review": "#f59e0b",
  approved: "#22c55e",
  denied: "#dc2626",
  closed: "#6b7280",
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
});

function policyNumber(policy: DashboardStats["recentClaims"][number]["policy"]): string {
  return typeof policy === "string" ? policy : (policy as Policy).policyNumber;
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      setLoading(true);
      setError(null);

      try {
        const response = await api.get<DashboardStats>("/dashboard");
        if (!cancelled) {
          setStats(response.data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(getErrorMessage(err));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadStats();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!user) return null;

  const maxStatusCount = stats
    ? Math.max(1, ...Object.values(stats.claimsByStatus))
    : 1;

  return (
    <section className="dashboard-page">
      <header className="dashboard-header">
        <h1>Welcome, {user.name}</h1>
        <button type="button" onClick={logout}>
          Log out
        </button>
      </header>

      {loading && <p>Loading dashboard…</p>}

      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}

      {stats && (
        <>
          <div className="stat-cards">
            <div className="stat-card">
              <span className="stat-card-label">Total Claims</span>
              <span className="stat-card-value">{stats.totalClaims}</span>
            </div>
            <div className="stat-card">
              <span className="stat-card-label">Total Policies</span>
              <span className="stat-card-value">{stats.totalPolicies}</span>
            </div>
            <div className="stat-card">
              <span className="stat-card-label">Total Users</span>
              <span className="stat-card-value">{stats.totalUsers}</span>
            </div>
            <div className="stat-card">
              <span className="stat-card-label">Total Claim Amount</span>
              <span className="stat-card-value">
                {currencyFormatter.format(stats.totalClaimAmount)}
              </span>
            </div>
          </div>

          <h2>Claims by Status</h2>
          <div className="status-chart">
            {Object.entries(stats.claimsByStatus).map(([status, count]) => (
              <div className="status-chart-row" key={status}>
                <span className="status-chart-label">
                  {CLAIM_STATUS_LABELS[status as ClaimStatus] ?? status}
                </span>
                <div className="status-chart-track">
                  <div
                    className="status-chart-bar"
                    style={{
                      width: `${(count / maxStatusCount) * 100}%`,
                      background: CLAIM_STATUS_COLORS[status as ClaimStatus],
                    }}
                  />
                </div>
                <span className="status-chart-count">{count}</span>
              </div>
            ))}
          </div>

          <h2>Recent Claims</h2>
          <table className="recent-claims-table">
            <thead>
              <tr>
                <th>Claim #</th>
                <th>Policy</th>
                <th>Status</th>
                <th>Amount</th>
                <th>Filed</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentClaims.map((claim) => (
                <tr key={claim._id}>
                  <td>
                    <Link to={`/claims/${claim._id}`}>{claim.claimNumber}</Link>
                  </td>
                  <td>{policyNumber(claim.policy)}</td>
                  <td>{CLAIM_STATUS_LABELS[claim.status]}</td>
                  <td>
                    {claim.amount != null ? currencyFormatter.format(claim.amount) : "—"}
                  </td>
                  <td>{dateFormatter.format(new Date(claim.createdAt))}</td>
                </tr>
              ))}
              {stats.recentClaims.length === 0 && (
                <tr>
                  <td colSpan={5}>No claims yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}
