import type { Canteen, CanteenDay } from "../data";
import { STATUS_META } from "../data";
import { dayMonth, weekdayShort } from "../lib/format";
import { useHorizontalWheelScroll } from "../lib/useHorizontalWheelScroll";
import { StatusBadge } from "./StatusBadge";

export function CanteenRow({ canteen }: { canteen: Canteen }) {
  const [scrollerRef, scrollerNodeRef] = useHorizontalWheelScroll<HTMLUListElement>();

  const scrollBy = (dir: 1 | -1) => {
    const el = scrollerNodeRef.current;
    if (!el) return;
    const tile = el.querySelector<HTMLElement>("li");
    const step = tile ? tile.offsetWidth + 12 : 160;
    el.scrollBy({ left: dir * step * 3, behavior: "smooth" });
  };

  return (
    <section className="section" aria-labelledby="canteen-heading">
      <div className="section__head">
        <h2 id="canteen-heading">Canteen</h2>
        {canteen.title && <p className="section__sub">{canteen.title}</p>}
        {canteen.days.length > 0 && (
          <div className="row-nav" aria-hidden="true">
            <button type="button" className="row-nav__btn" onClick={() => scrollBy(-1)} tabIndex={-1}>
              ‹
            </button>
            <button type="button" className="row-nav__btn" onClick={() => scrollBy(1)} tabIndex={-1}>
              ›
            </button>
          </div>
        )}
      </div>

      {canteen.days.length === 0 ? (
        <p className="empty">
          Next term’s canteen roster isn’t open yet. It’ll appear here once it’s published on
          SignUpGenius.
        </p>
      ) : (
        <ul className="canteen-row" ref={scrollerRef}>
          {canteen.days.map((day) => (
            <li key={day.date}>
              <CanteenDayTile day={day} signupUrl={canteen.signupUrl} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CanteenDayTile({ day, signupUrl }: { day: CanteenDay; signupUrl: string }) {
  if (day.status === "closed") {
    return (
      <div className="tile tile--closed" aria-label={`${day.weekday} ${dayMonth(day.date)}, canteen closed`}>
        <TileHeader day={day} />
        <span className="tile__closed-label">{STATUS_META.closed.icon} Canteen closed</span>
        {day.note && <span className="tile__note">{day.note}</span>}
      </div>
    );
  }

  const label = `${day.weekday} ${dayMonth(day.date)}, ${STATUS_META[day.status].label}, ${day.filled} of ${day.capacity} shift spots filled`;

  return (
    <a
      className={`tile tile--${day.status}`}
      href={day.deepLink || signupUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${label}. Opens SignUpGenius.`}
    >
      <TileHeader day={day} />
      <StatusBadge status={day.status} size="sm" />
      <span className="tile__count">
        <strong>{day.filled}</strong>/{day.capacity} filled
      </span>
      {day.note && <span className="tile__note">{day.note}</span>}
    </a>
  );
}

function TileHeader({ day }: { day: CanteenDay }) {
  return (
    <span className="tile__date">
      <span className="tile__weekday">{weekdayShort(day.date)}</span>
      <span className="tile__daymonth">{dayMonth(day.date)}</span>
    </span>
  );
}
