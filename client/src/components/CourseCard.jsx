import { Link } from "react-router-dom";

export default function CourseCard({ course, locations = [], tees = [] }) {
  const location = locations.length > 0 ? locations[0] : {};
  const city = location.city || "-";
  const state = location.state || "-";
  const country = location.country || "-";
  const locationString = `${city}, ${state}, ${country}`;

  const holes = tees.length > 0 && tees[0].number_of_holes
    ? `${tees[0].number_of_holes} Holes`
    : "- Holes";

  return (
    <Link to={`/courses/${course.id}`} className="card-link">
      <div className="card course-card">
        <h3 className="course-name">{course.course_name || "-"}</h3>
        <h5 className="course-location">{locationString}</h5>
        <p className="course-holes-tag">{holes}</p>
      </div>
    </Link>
  );
}
