import { useEffect, useState, type SubmitEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../api";
import { getErrorMessage } from "../errorMessage";
import { useAuth } from "../useAuth";
import StatusBadge from "../StatusBadge";
import { CLAIM_STATUSES, CLAIM_STATUS_LABELS, CLAIM_STATUS_TONE } from "../claimStatus";
import type { Claim, ClaimStatus, Policy, User } from "../types";

/** GET /claims/:id always populates `policy` and `assignedTo`. */
interface ClaimDetailData extends Omit<Claim, "policy" | "assignedTo"> {
  policy: Policy;
  assignedTo: User;
}

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });
const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default function ClaimDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [claim, setClaim] = useState<ClaimDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusValue, setStatusValue] = useState<ClaimStatus | "">("");
  const [statusError, setStatusError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const [noteText, setNoteText] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);
  const [addingNote, setAddingNote] = useState(false);

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadClaim() {
      setLoading(true);
      setError(null);

      try {
        const response = await api.get<{ claim: ClaimDetailData }>(`/claims/${id}`);
        if (!cancelled) {
          setClaim(response.data.claim);
          setStatusValue(response.data.claim.status);
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

    loadClaim();

    return () => {
      cancelled = true;
    };
  }, [id]);

  function authorName(authorId: string): string {
    if (claim?.assignedTo._id === authorId) return claim.assignedTo.name;
    if (user?._id === authorId) return user.name;
    return "Unknown user";
  }

  async function handleUpdateStatus() {
    if (!claim || !statusValue || statusValue === claim.status) return;

    setUpdatingStatus(true);
    setStatusError(null);

    try {
      const response = await api.put<{ claim: Claim }>(`/claims/${claim._id}`, {
        status: statusValue,
      });
      setClaim((current) => (current ? { ...current, status: response.data.claim.status } : current));
    } catch (err) {
      setStatusError(getErrorMessage(err));
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function handleAddNote(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!claim) return;

    setAddingNote(true);
    setNoteError(null);

    try {
      const response = await api.post<{ claim: Claim }>(`/claims/${claim._id}/notes`, {
        text: noteText,
      });
      setClaim((current) => (current ? { ...current, notes: response.data.claim.notes } : current));
      setNoteText("");
    } catch (err) {
      setNoteError(getErrorMessage(err));
    } finally {
      setAddingNote(false);
    }
  }

  async function handleDelete() {
    if (!claim) return;

    setDeleting(true);
    setDeleteError(null);

    try {
      await api.delete(`/claims/${claim._id}`);
      navigate("/claims");
    } catch (err) {
      setDeleteError(getErrorMessage(err));
      setDeleting(false);
    }
  }

  return (
    <section className="page claim-detail-page">
      <Link to="/claims" className="claim-detail-back">
        ← Back to Claims
      </Link>

      {loading && <p>Loading claim…</p>}

      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}

      {claim && (
        <>
          <header className="page-header">
            <h1>{claim.claimNumber}</h1>
            {!confirmingDelete ? (
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => setConfirmingDelete(true)}
              >
                Delete Claim
              </button>
            ) : (
              <div className="claim-delete-confirm">
                <span>Delete this claim?</span>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? "Deleting…" : "Confirm Delete"}
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setConfirmingDelete(false)}
                  disabled={deleting}
                >
                  Cancel
                </button>
              </div>
            )}
          </header>

          {deleteError && (
            <p role="alert" className="form-error">
              {deleteError}
            </p>
          )}

          <dl className="card claim-detail-fields">
            <div>
              <dt>Policy</dt>
              <dd>
                {claim.policy.policyNumber} — {claim.policy.holderName}
              </dd>
            </div>
            <div>
              <dt>Amount</dt>
              <dd>{claim.amount != null ? currencyFormatter.format(claim.amount) : "—"}</dd>
            </div>
            <div>
              <dt>Incident Date</dt>
              <dd>{dateFormatter.format(new Date(claim.incidentDate))}</dd>
            </div>
            <div>
              <dt>Assigned To</dt>
              <dd>{claim.assignedTo.name}</dd>
            </div>
            <div>
              <dt>Filed</dt>
              <dd>{dateFormatter.format(new Date(claim.createdAt))}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                <StatusBadge
                  label={CLAIM_STATUS_LABELS[claim.status]}
                  tone={CLAIM_STATUS_TONE[claim.status]}
                />
              </dd>
            </div>
          </dl>

          <h2>Description</h2>
          <p className="claim-description">{claim.description}</p>

          <h2>Update Status</h2>
          <div className="claim-status-update">
            <select
              aria-label="Update status"
              value={statusValue}
              onChange={(event) => setStatusValue(event.target.value as ClaimStatus)}
            >
              {CLAIM_STATUSES.map((claimStatus) => (
                <option key={claimStatus} value={claimStatus}>
                  {CLAIM_STATUS_LABELS[claimStatus]}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleUpdateStatus}
              disabled={updatingStatus || statusValue === claim.status}
            >
              {updatingStatus ? "Updating…" : "Update"}
            </button>
          </div>
          {statusError && (
            <p role="alert" className="form-error">
              {statusError}
            </p>
          )}

          <h2>Notes</h2>
          <ul className="claim-notes">
            {claim.notes.map((note, index) => (
              // Notes have no id of their own — createdAt + index is stable within a render.
              <li key={`${note.createdAt}-${index}`} className="card claim-note">
                <div className="claim-note-meta">
                  <span className="claim-note-author">
                    {authorName(typeof note.author === "string" ? note.author : note.author._id)}
                  </span>
                  <span className="claim-note-date">
                    {dateTimeFormatter.format(new Date(note.createdAt))}
                  </span>
                </div>
                <p>{note.text}</p>
              </li>
            ))}
            {claim.notes.length === 0 && <li className="claim-note-empty">No notes yet.</li>}
          </ul>

          <form className="add-note-form" onSubmit={handleAddNote}>
            <label htmlFor="new-note">Add a note</label>
            <textarea
              id="new-note"
              required
              rows={3}
              value={noteText}
              onChange={(event) => setNoteText(event.target.value)}
            />
            {noteError && (
              <p role="alert" className="form-error">
                {noteError}
              </p>
            )}
            <button type="submit" className="btn btn-primary" disabled={addingNote}>
              {addingNote ? "Adding…" : "Add Note"}
            </button>
          </form>
        </>
      )}
    </section>
  );
}
