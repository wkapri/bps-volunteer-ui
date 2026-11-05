import { Fragment, useState } from "react";
import type { VolunteerEvent } from "../data";
import { STATUS_META } from "../data";
import { fullDate, shortDate } from "../lib/format";
import { StatusBadge } from "./StatusBadge";

const MAX_DATES_SHOWN = 3;

export function EventsGrid({ events }: { events: VolunteerEvent[] }) {
  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <section className="section" aria-labelledby="events-heading">
      <div className="section__head">
        <h2 id="events-heading">Upcoming events</h2>
      </div>

      {sorted.length === 0 ? (
        <p className="empty">No upcoming events right now — check back soon.</p>
      ) : (
        <ul className="events-grid">
          {sorted.map((event) => (
            <li key={event.id}>
              <EventCard event={event} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function EventCard({ event }: { event: VolunteerEvent }) {
  const [imgOk, setImgOk] = useState(true);
  const multi = event.dates && event.dates.length > 1 ? event.dates : null;
  const when = multi ? multi.map(shortDate).join("; ") : fullDate(event.date);
  const label = `${event.title}, ${when}, ${STATUS_META[event.status].label}, ${event.filled} of ${event.capacity} spots filled`;

  return (
    <a
      className="card"
      href={event.signupUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${label}. Opens SignUpGenius.`}
    >
      <div className="card__media" aria-hidden="true">
        {event.imageUrl && imgOk ? (
          <img src={event.imageUrl} alt="" loading="lazy" onError={() => setImgOk(false)} />
        ) : (
          <img src={`${import.meta.env.BASE_URL}event-default.svg`} alt="" />
        )}
      </div>
      <div className="card__body">
        <h3 className="card__title">{event.title}</h3>
        {multi ? (
          <p className="card__date" title={multi.map(shortDate).join("; ")}>
            {multi.slice(0, MAX_DATES_SHOWN).map((d, i, shown) => (
              <Fragment key={d}>
                {i > 0 && " "}
                <span className="card__date-item">
                  {shortDate(d)}
                  {i < shown.length - 1 ? " ·" : ""}
                </span>
              </Fragment>
            ))}
            {multi.length > MAX_DATES_SHOWN && (
              <>
                {" "}
                <span className="card__date-item card__date-more">+{multi.length - MAX_DATES_SHOWN} more</span>
              </>
            )}
          </p>
        ) : (
          <p className="card__date">{fullDate(event.date)}</p>
        )}
        <div className="card__status">
          <StatusBadge status={event.status} size="sm" />
          <span className="card__count">
            <strong>{event.filled}</strong>/{event.capacity} ({event.fillPct}%)
          </span>
        </div>
        {event.description && <p className="card__desc">{event.description}</p>}
      </div>
    </a>
  );
}
