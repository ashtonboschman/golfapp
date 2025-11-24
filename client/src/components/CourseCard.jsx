import "../css/Card.css";

export default function CourseCard({ course, onEdit, onDelete }) {
  const teeName = course.tee_name || "default";
  const teeClass = `tee-tag tee-${teeName.toLowerCase()}`;

  const formatValue = (val) => (val !== null && val !== undefined && val !== "" ? val : "-");

  return (
    <div className="card">
      {/* Header */}
      <div className="card-header">
        <div className="card-left-header">
          <h3>{course.name || "-"}</h3>
          <div className="card-header-info">
            <span className={teeClass}>{teeName}</span>
          </div>
        </div>

        {/* Edit/Delete buttons */}
        <div className="button-group">
          <button
            onClick={() => onEdit(course.id)}
            className="button edit-button"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(course.id)}
            className="button delete-button"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Info Grid */}
      <div className="card-info-grid">
        <div className="card-info-row">
          <strong>City:</strong> {course.city || "-"}
        </div>
        <div className="card-info-row">
          <strong>Holes:</strong> {formatValue(course.holes)}
        </div>
        <div className="card-info-row">
          <strong>Par:</strong> {formatValue(course.par)}
        </div>
        <div className="card-info-row">
          <strong>Rating:</strong> {formatValue(course.rating)}
        </div>
        <div className="card-info-row">
          <strong>Slope:</strong> {formatValue(course.slope)}
        </div>
        <div className="card-info-row">
          <strong>FIR Possible:</strong> {formatValue(course.FIR_possible)}
        </div>
      </div>
    </div>
  );
}
