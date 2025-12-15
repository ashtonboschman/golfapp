import React, { memo } from "react";
import BinaryNullToggle from "./BinaryNullToggle";

const HoleCard = memo(({
  hole,
  par,
  score,
  fir_hit,
  gir_hit,
  putts,
  penalties,
  hasAdvanced,
  onChange,
}) => {
  return (
    <div className="card hole-card">
      <div className="hole-header">Hole {hole}</div>

      {/* Always render base row */}
      <div className="hole-card-grid">
        <div className="hole-field">
          <label className="form-label">Par:</label>
          <input
            className="hole-card-input"
            type="number"
            name="Par"
            value={par ?? ""}
            min="0"
            disabled
          />
        </div>

        <div className="hole-field">
          <label className="form-label">Score:</label>
          <input
            className="hole-card-input"
            type="number"
            name="Score"
            value={score ?? ""}
            onChange={(e) => onChange(hole, "score", e.target.value)}
            min="0"
          />
        </div>
      </div>

      {/* Advanced stats only */}
      {hasAdvanced && (
        <>
          <div className="hole-card-grid">
            <div className="hole-field">
              <label className="form-label">FIR:</label>
              <BinaryNullToggle
                value={fir_hit}
                onChange={(val) => onChange(hole, "fir_hit", val)}
                disabled={par === 3}
              />
            </div>

            <div className="hole-field">
              <label className="form-label">Putts:</label>
              <input
                className="hole-card-input"
                type="number"
                name="Putts"
                value={putts ?? ""}
                onChange={(e) => onChange(hole, "putts", e.target.value)}
                min="0"
              />
            </div>
          </div>

          <div className="hole-card-grid">
            <div className="hole-field">
              <label className="form-label">GIR:</label>
              <BinaryNullToggle
                value={gir_hit}
                onChange={(val) => onChange(hole, "gir_hit", val)}
              />
            </div>

            <div className="hole-field">
              <label className="form-label">Penalties:</label>
              <input
                className="hole-card-input"
                type="number"
                name="Penalties"
                value={penalties ?? ""}
                onChange={(e) => onChange(hole, "penalties", e.target.value)}
                min="0"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
});

export default HoleCard;