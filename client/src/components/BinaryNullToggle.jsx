export default function BinaryNullToggle({ value, onChange, disabled = false }) {
  const handleClick = (val) => {
    if (!disabled) onChange(value === val ? null : val);
  };

  return (
    <div className="binary-null-toggle">
      <button
        type="button"
        className={value === 0 ? "active-false" : ""}
        onClick={() => handleClick(0)}
        disabled={disabled}
      >
        X
      </button>
      <button
        type="button"
        className={value === 1 ? "active-true" : ""}
        onClick={() => handleClick(1)}
        disabled={disabled}
      >
        ✓
      </button>
    </div>
  );
}