export default function RoundCard({
  round,
  onEdit,
  onDelete,
  showActions = true,
}) {
  const formatValue = (val) => val ?? "-";
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

  const teeName = round.tee_name || "default";
  const par = round.par ?? null;

  return (
    <div className="card">
      {/* Header */}
      <div className="roundcard-header">
        <div className="roundcard-header-text">
          <h3 className="roundcard-course-name">{round.course_name || "-"}</h3>
          <h5 className="roundcard-city">{round.city || "-"}</h5>
          <div className="roundcard-header-info">
            <span className={`tee-tag tee-${teeName.toLowerCase()}`}>{teeName}</span>
            <span className="round-date">{formatDate(round.date)}</span>
          </div>
        </div>

        {showActions && (
          <div className="roundcard-button-group">
            <button onClick={() => onEdit(round.id)} className="btn-edit btn">Edit</button>
            <button onClick={() => onDelete(round.id)} className="btn-cancel btn">Delete</button>
          </div>
        )}
      </div>

      {/* Info Grid */}
      <div className="grid grid-3 margin-top-16">
        <div className="roundcard-info-row"><strong>To Par:</strong> {formatToPar(round.score, par)}</div>
        <div className="roundcard-info-row"><strong>Score:</strong> {formatValue(round.score)}</div>
        <div className="roundcard-info-row"><strong>Par:</strong> {formatValue(par)}</div>
        <div className="roundcard-info-row"><strong>FIR:</strong> {formatValue(round.fir_hit)}</div>
        <div className="roundcard-info-row"><strong>GIR:</strong> {formatValue(round.gir_hit)}</div>
        <div className="roundcard-info-row"><strong>Putts:</strong> {formatValue(round.putts)}</div>
        <div className="roundcard-info-row"><strong>Penalties:</strong> {formatValue(round.penalties)}</div>
      </div>

      {round.notes && <div className="roundcard-notes margin-top-8"><strong>Notes:</strong> {round.notes}</div>}
    </div>
  );
}