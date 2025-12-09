import "../css/CourseCard.css";

export default function CourseCard({ course, locations = [], tees = [] }) {
  // Get city from the first location (if any)
  const city = locations.length > 0 ? locations[0].city : "-";

  // Get number of holes from the first tee (if any)
  const holes = tees.length > 0 && tees[0].number_of_holes
    ? `${tees[0].number_of_holes} Holes`
    : "- Holes";

  return (
    <div className="card">
      {/* Header */}
      <div className="card-header">
        <h3>{course.course_name || "-"}</h3>
      </div>

      {/* City */}
      <div className="card-city">{city}</div>

      {/* Holes */}
      <div className="card-holes">{holes}</div>
    </div>
  );
}
