/** Loading placeholders matching the real layout (DESIGN.md §7.4). */
export function DashboardSkeleton() {
  return (
    <div aria-hidden="true" className="skeleton">
      <section className="section">
        <div className="section__head">
          <div className="sk sk--heading" />
        </div>
        <ul className="canteen-row">
          {Array.from({ length: 5 }).map((_, i) => (
            <li key={i}>
              <div className="tile sk-tile">
                <div className="sk sk--line sk--sm" />
                <div className="sk sk--pill" />
                <div className="sk sk--line sk--xs" />
              </div>
            </li>
          ))}
        </ul>
      </section>
      <section className="section">
        <div className="section__head">
          <div className="sk sk--heading" />
        </div>
        <ul className="events-grid">
          {Array.from({ length: 3 }).map((_, i) => (
            <li key={i}>
              <div className="card sk-card">
                <div className="sk sk--media" />
                <div className="card__body">
                  <div className="sk sk--line" />
                  <div className="sk sk--line sk--sm" />
                  <div className="sk sk--pill" />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
