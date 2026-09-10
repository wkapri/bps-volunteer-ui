import type { ReactNode } from "react";

export function Banner({
  tone,
  children,
  onRetry,
}: {
  tone: "warn" | "error";
  children: ReactNode;
  onRetry?: () => void;
}) {
  return (
    <div className={`banner banner--${tone}`} role="status">
      <span className="banner__icon" aria-hidden="true">
        {tone === "error" ? "⚠" : "ⓘ"}
      </span>
      <p className="banner__text">{children}</p>
      {onRetry && (
        <button type="button" className="banner__btn" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
