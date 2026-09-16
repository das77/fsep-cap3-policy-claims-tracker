import { useEffect, useState, type SubmitEvent } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import { getErrorMessage } from "../errorMessage";
import { CLAIM_STATUSES, CLAIM_STATUS_LABELS } from "../claimStatus";
import type { Claim, ClaimStatus, PaginatedClaims, Policy } from "../types";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

function policyLabel(policy: Claim["policy"], policiesById: Map<string, Policy>): string {
  if (typeof policy !== "string") return policy.policyNumber;
  return policiesById.get(policy)?.policyNumber ?? policy;
}

export default function Claims() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [pagination, setPagination] = useState<PaginatedClaims["pagination"] | null>(null);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [status, setStatus] = useState<ClaimStatus | "">("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [refreshIndex, setRefreshIndex] = useState(0);

  const [showNewClaimForm, setShowNewClaimForm] = useState(false);
  const [formPolicy, setFormPolicy] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formIncidentDate, setFormIncidentDate] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Debounce the search box so it doesn't fire a request on every keystroke.
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    api
      .get<{ policies: Policy[] }>("/policies", { params: { limit: 100 } })
      .then((response) => setPolicies(response.data.policies))
      .catch(() => {
        // Policy names are a nice-to-have on the table; the page still works without them.
      });
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadClaims() {
      setLoading(true);
      setError(null);

      try {
        const response = await api.get<PaginatedClaims>("/claims", {
          params: {
            status: status || undefined,
            search: debouncedSearch || undefined,
            page,
            limit: 10,
          },
        });
        if (!cancelled) {
          setClaims(response.data.claims);
          setPagination(response.data.pagination);
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

    loadClaims();

    return () => {
      cancelled = true;
    };
  }, [status, debouncedSearch, page, refreshIndex]);

  const policiesById = new Map(policies.map((policy) => [policy._id, policy]));

  function resetForm() {
    setFormPolicy("");
    setFormDescription("");
    setFormIncidentDate("");
    setFormAmount("");
    setFormError(null);
  }

  async function handleCreateClaim(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      await api.post("/claims", {
        policy: formPolicy,
        description: formDescription,
        incidentDate: formIncidentDate,
        amount: formAmount ? Number(formAmount) : undefined,
      });
      resetForm();
      setShowNewClaimForm(false);
      setStatus("");
      setSearch("");
      setDebouncedSearch("");
      setPage(1);
      setRefreshIndex((index) => index + 1);
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="claims-page">
      <header className="claims-header">
        <h1>Claims</h1>
        <button
          type="button"
          onClick={() => setShowNewClaimForm((shown) => !shown)}
        >
          {showNewClaimForm ? "Cancel" : "New Claim"}
        </button>
      </header>

      {showNewClaimForm && (
        <form className="new-claim-form" onSubmit={handleCreateClaim}>
          <div className="new-claim-form-field">
            <label htmlFor="claim-policy">Policy</label>
            <select
              id="claim-policy"
              required
              value={formPolicy}
              onChange={(event) => setFormPolicy(event.target.value)}
            >
              <option value="" disabled>
                Select a policy…
              </option>
              {policies.map((policy) => (
                <option key={policy._id} value={policy._id}>
                  {policy.policyNumber} — {policy.holderName}
                </option>
              ))}
            </select>
          </div>

          <div className="new-claim-form-field">
            <label htmlFor="claim-description">Description</label>
            <input
              id="claim-description"
              type="text"
              required
              value={formDescription}
              onChange={(event) => setFormDescription(event.target.value)}
            />
          </div>

          <div className="new-claim-form-field">
            <label htmlFor="claim-incident-date">Incident Date</label>
            <input
              id="claim-incident-date"
              type="date"
              required
              value={formIncidentDate}
              onChange={(event) => setFormIncidentDate(event.target.value)}
            />
          </div>

          <div className="new-claim-form-field">
            <label htmlFor="claim-amount">Amount</label>
            <input
              id="claim-amount"
              type="number"
              min="0"
              step="0.01"
              value={formAmount}
              onChange={(event) => setFormAmount(event.target.value)}
            />
          </div>

          {formError && (
            <p role="alert" className="form-error">
              {formError}
            </p>
          )}

          <button type="submit" disabled={submitting}>
            {submitting ? "Creating…" : "Create Claim"}
          </button>
        </form>
      )}

      <div className="claims-filters">
        <select
          aria-label="Filter by status"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as ClaimStatus | "");
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          {CLAIM_STATUSES.map((claimStatus) => (
            <option key={claimStatus} value={claimStatus}>
              {CLAIM_STATUS_LABELS[claimStatus]}
            </option>
          ))}
        </select>

        <input
          type="search"
          placeholder="Search claim # or description…"
          aria-label="Search claims"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
      </div>

      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}

      <table className="claims-table">
        <thead>
          <tr>
            <th>Claim #</th>
            <th>Policy</th>
            <th>Description</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Incident Date</th>
          </tr>
        </thead>
        <tbody>
          {claims.map((claim) => (
            <tr key={claim._id}>
              <td>
                <Link to={`/claims/${claim._id}`}>{claim.claimNumber}</Link>
              </td>
              <td>{policyLabel(claim.policy, policiesById)}</td>
              <td>{claim.description}</td>
              <td>{claim.amount != null ? currencyFormatter.format(claim.amount) : "—"}</td>
              <td>{CLAIM_STATUS_LABELS[claim.status]}</td>
              <td>{dateFormatter.format(new Date(claim.incidentDate))}</td>
            </tr>
          ))}
          {!loading && claims.length === 0 && (
            <tr>
              <td colSpan={6}>No claims found.</td>
            </tr>
          )}
        </tbody>
      </table>

      {loading && <p>Loading claims…</p>}

      {pagination && pagination.pages > 1 && (
        <div className="pagination">
          <button
            type="button"
            onClick={() => setPage((current) => current - 1)}
            disabled={page <= 1}
          >
            Previous
          </button>
          <span>
            Page {pagination.page} of {pagination.pages}
          </span>
          <button
            type="button"
            onClick={() => setPage((current) => current + 1)}
            disabled={page >= pagination.pages}
          >
            Next
          </button>
        </div>
      )}
    </section>
  );
}
