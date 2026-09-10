import type { Status } from "../data";
import { STATUS_META } from "../data";

/** Colour + icon + label. Never colour alone (DESIGN.md §7.3). */
export function StatusBadge({ status, size = "md" }: { status: Status; size?: "sm" | "md" }) {
  const { icon, label } = STATUS_META[status];
  return (
    <span className={`badge badge--${status} badge--${size}`}>
      <span className="badge__icon" aria-hidden="true">
        {icon}
      </span>
      {label}
    </span>
  );
}
