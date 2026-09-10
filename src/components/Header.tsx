export function Header() {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Crest />
        <div className="site-header__text">
          <p className="site-header__org">Beecroft Public School P&amp;C</p>
          <h1 className="site-header__title">Volunteer Dashboard</h1>
          <p className="site-header__tag">Canteen roster &amp; upcoming events</p>
        </div>
      </div>
    </header>
  );
}

function Crest() {
  return (
    <img
      className="crest"
      src={`${import.meta.env.BASE_URL}crest.png`}
      alt="Beecroft Public School crest"
      width={58}
      height={58}
    />
  );
}
