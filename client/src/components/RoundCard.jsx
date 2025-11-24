import { useMemo } from "react";
import "../css/Card.css";

export default function RoundCard({
  round,
  tees = [],
  showAdvanced = false,
  onEdit,
  onDelete,
  showActions = true, // NEW PROP
}) {
  // Tee
  const tee = useMemo(() => tees.find((t) => t.id === round.course_tee), [
    round.course_tee,
    tees,
  ]);
  const teeName = tee?.name || "default";

  // Formatters
  const formatValue = (val) =>
    val !== null && val !== undefined && val !== "" ? val : "-";

  const formatToPar = (score, par) => {
    if (score === null || par === null) return "-";
    const diff = score - par;
    return diff > 0 ? `+${diff}` : diff.toString();
  };

  const formatDate = (dateStr) =>
    !dateStr
      ? "-"
      : new Date(dateStr).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });

  // Use the par passed in from the round (already corrected for combined mode)
  const par = round.par ?? round.course_par ?? tee?.par ?? null;

  return (
    <div className="card">
      {/* Header */}
      <div className="card-header">
        <div className="card-left-header">
          <h3>{round.course_name || "-"}</h3>

          <div className="card-header-info">
            <span className={`tee-tag tee-${teeName.toLowerCase()}`}>
              {teeName}
            </span>
            <span className="round-date">{formatDate(round.date)}</span>
          </div>
        </div>

        {/* Edit/Delete - only render if showActions is true */}
        {showActions && (
          <div className="button-group">
            <button onClick={() => onEdit(round.id)} className="button edit-button">
              Edit
            </button>
            <button
              onClick={() => onDelete(round.id)}
              className="button delete-button"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Info Grid */}
      <div className="card-info-grid">
        <div className="card-info-row">
          <strong>To Par:</strong> {formatToPar(round.score, par)}
        </div>

        <div className="card-info-row">
          <strong>Score:</strong> {formatValue(round.score)}
        </div>
        
        <div className="card-info-row">
          <strong>Par:</strong> {formatValue(par)}
        </div>

        {showAdvanced && (
          <>
            <div className="card-info-row">
              <strong>FIR Hit:</strong> {formatValue(round.FIR_hit)}
            </div>

            <div className="card-info-row">
              <strong>GIR Hit:</strong> {formatValue(round.GIR_hit)}
            </div>

            <div className="card-info-row">
              <strong>Putts:</strong> {formatValue(round.putts)}
            </div>

            <div className="card-info-row">
              <strong>Penalties:</strong> {formatValue(round.penalties)}
            </div>
          </>
        )}
      </div>

      {/* Notes */}
      {round.notes && (
        <div className="card-notes">
          <strong>Notes:</strong> {round.notes}
        </div>
      )}
    </div>
  );
}