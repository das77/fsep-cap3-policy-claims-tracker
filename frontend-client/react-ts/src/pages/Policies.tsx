import { useEffect, useState, type SubmitEvent } from "react";
import api from "../api";
import { getErrorMessage } from "../errorMessage";
import StatusBadge from "../StatusBadge";
import {
  POLICY_STATUS_LABELS,
  POLICY_STATUS_TONE,
  POLICY_STATUSES,
  POLICY_TYPE_LABELS,
  POLICY_TYPES,
} from "../policyMeta";
import type { PaginatedPolicies, Policy, PolicyStatus, PolicyType } from "../types";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

export default function Policies() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [pagination, setPagination] = useState<PaginatedPolicies["pagination"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [type, setType] = useState<PolicyType | "">("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [refreshIndex, setRefreshIndex] = useState(0);

  const [showNewPolicyForm, setShowNewPolicyForm] = useState(false);
  const [formPolicyNumber, setFormPolicyNumber] = useState("");
  const [formHolderName, setFormHolderName] = useState("");
  const [formType, setFormType] = useState<PolicyType>("auto");
  const [formPremium, setFormPremium] = useState("");
  const [formStatus, setFormStatus] = useState<PolicyStatus>("active");
  const [formEffectiveDate, setFormEffectiveDate] = useState("");
  const [formExpirationDate, setFormExpirationDate] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Debounce the search box so it doesn't fire a request on every keystroke.
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    let cancelled = false;

    async function loadPolicies() {
      setLoading(true);
      setError(null);

      try {
        const response = await api.get<PaginatedPolicies>("/policies", {
          params: {
            type: type || undefined,
            search: debouncedSearch || undefined,
            page,
            limit: 10,
          },
        });
        if (!cancelled) {
          setPolicies(response.data.policies);
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

    loadPolicies();

    return () => {
      cancelled = true;
    };
  }, [type, debouncedSearch, page, refreshIndex]);

  function resetForm() {
    setFormPolicyNumber("");
    setFormHolderName("");
    setFormType("auto");
    setFormPremium("");
    setFormStatus("active");
    setFormEffectiveDate("");
    setFormExpirationDate("");
    setFormError(null);
  }

  async function handleCreatePolicy(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      await api.post("/policies", {
        policyNumber: formPolicyNumber,
        holderName: formHolderName,
        type: formType,
        premium: Number(formPremium),
        status: formStatus,
        effectiveDate: formEffectiveDate,
        expirationDate: formExpirationDate,
      });
      resetForm();
      setShowNewPolicyForm(false);
      setType("");
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

  async function handleDelete(policyId: string) {
    setDeletingId(policyId);
    setDeleteError(null);

    try {
      await api.delete(`/policies/${policyId}`);
      setConfirmingDeleteId(null);
      setRefreshIndex((index) => index + 1);
    } catch (err) {
      setDeleteError(getErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="page policies-page">
      <header className="page-header">
        <h1>Policies</h1>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setShowNewPolicyForm((shown) => !shown)}
        >
          {showNewPolicyForm ? "Cancel" : "New Policy"}
        </button>
      </header>

      {showNewPolicyForm && (
        <form className="card new-policy-form" onSubmit={handleCreatePolicy}>
          <div className="new-policy-form-field">
            <label htmlFor="policy-number">Policy Number</label>
            <input
              id="policy-number"
              type="text"
              required
              value={formPolicyNumber}
              onChange={(event) => setFormPolicyNumber(event.target.value)}
            />
          </div>

          <div className="new-policy-form-field">
            <label htmlFor="policy-holder">Holder Name</label>
            <input
              id="policy-holder"
              type="text"
              required
              value={formHolderName}
              onChange={(event) => setFormHolderName(event.target.value)}
            />
          </div>

          <div className="new-policy-form-field">
            <label htmlFor="policy-type">Type</label>
            <select
              id="policy-type"
              required
              value={formType}
              onChange={(event) => setFormType(event.target.value as PolicyType)}
            >
              {POLICY_TYPES.map((policyType) => (
                <option key={policyType} value={policyType}>
                  {POLICY_TYPE_LABELS[policyType]}
                </option>
              ))}
            </select>
          </div>

          <div className="new-policy-form-field">
            <label htmlFor="policy-premium">Premium</label>
            <input
              id="policy-premium"
              type="number"
              min="0"
              step="0.01"
              required
              value={formPremium}
              onChange={(event) => setFormPremium(event.target.value)}
            />
          </div>

          <div className="new-policy-form-field">
            <label htmlFor="policy-status">Status</label>
            <select
              id="policy-status"
              required
              value={formStatus}
              onChange={(event) => setFormStatus(event.target.value as PolicyStatus)}
            >
              {POLICY_STATUSES.map((policyStatus) => (
                <option key={policyStatus} value={policyStatus}>
                  {POLICY_STATUS_LABELS[policyStatus]}
                </option>
              ))}
            </select>
          </div>

          <div className="new-policy-form-field">
            <label htmlFor="policy-effective-date">Effective Date</label>
            <input
              id="policy-effective-date"
              type="date"
              required
              value={formEffectiveDate}
              onChange={(event) => setFormEffectiveDate(event.target.value)}
            />
          </div>

          <div className="new-policy-form-field">
            <label htmlFor="policy-expiration-date">Expiration Date</label>
            <input
              id="policy-expiration-date"
              type="date"
              required
              value={formExpirationDate}
              onChange={(event) => setFormExpirationDate(event.target.value)}
            />
          </div>

          {formError && (
            <p role="alert" className="form-error">
              {formError}
            </p>
          )}

          <button type="submit" className="btn" disabled={submitting}>
            {submitting ? "Creating…" : "Create Policy"}
          </button>
        </form>
      )}

      <div className="policies-filters">
        <select
          aria-label="Filter by type"
          value={type}
          onChange={(event) => {
            setType(event.target.value as PolicyType | "");
            setPage(1);
          }}
        >
          <option value="">All types</option>
          {POLICY_TYPES.map((policyType) => (
            <option key={policyType} value={policyType}>
              {POLICY_TYPE_LABELS[policyType]}
            </option>
          ))}
        </select>

        <input
          type="search"
          placeholder="Search policy # or holder…"
          aria-label="Search policies"
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

      {deleteError && (
        <p role="alert" className="form-error">
          {deleteError}
        </p>
      )}

      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Policy #</th>
              <th>Holder</th>
              <th>Type</th>
              <th>Premium</th>
              <th>Status</th>
              <th>Effective</th>
              <th>Expiration</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {policies.map((policy) => (
              <tr key={policy._id}>
                <td>{policy.policyNumber}</td>
                <td>{policy.holderName}</td>
                <td>{POLICY_TYPE_LABELS[policy.type]}</td>
                <td>{currencyFormatter.format(policy.premium)}</td>
                <td>
                  <StatusBadge
                    label={POLICY_STATUS_LABELS[policy.status]}
                    tone={POLICY_STATUS_TONE[policy.status]}
                  />
                </td>
                <td>{dateFormatter.format(new Date(policy.effectiveDate))}</td>
                <td>{dateFormatter.format(new Date(policy.expirationDate))}</td>
                <td className="policies-table-actions">
                  {confirmingDeleteId === policy._id ? (
                    <span className="policy-delete-confirm">
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => handleDelete(policy._id)}
                        disabled={deletingId === policy._id}
                      >
                        {deletingId === policy._id ? "Deleting…" : "Confirm"}
                      </button>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => setConfirmingDeleteId(null)}
                        disabled={deletingId === policy._id}
                      >
                        Cancel
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => setConfirmingDeleteId(policy._id)}
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!loading && policies.length === 0 && (
              <tr>
                <td colSpan={8}>No policies found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {loading && <p>Loading policies…</p>}

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
