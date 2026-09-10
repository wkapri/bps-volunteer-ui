import type { VolunteerData } from "../data";
import { relativeAge, timestamp } from "../lib/format";

export function Footer({ data }: { data: VolunteerData | null }) {
  const base = import.meta.env.BASE_URL;
  return (
    <footer className="site-footer">
      <div className="site-footer__row">
        <img
          className="site-footer__logo site-footer__logo--pnc"
          src={`${base}pnc.png`}
          alt="Beecroft Public School P&C Association"
        />

        <div className="site-footer__center">
          {data && (
            <p className="site-footer__updated">
              Volunteer numbers last updated {timestamp(data.generatedAt)}{" "}
              <span className="site-footer__age">
                ({relativeAge(data.generatedAt)}, Sydney time)
              </span>
            </p>
          )}
          <nav className="site-footer__links">
            <a
              href={data?.canteen.signupUrl ?? "https://www.signupgenius.com"}
              target="_blank"
              rel="noopener noreferrer"
            >
              Canteen on SignUpGenius
            </a>
            <span aria-hidden="true">·</span>
            <a href="https://beecroft-p.schools.nsw.gov.au/" target="_blank" rel="noopener noreferrer">
              School website
            </a>
            <span aria-hidden="true">·</span>
            <a href="mailto:beecroft.pcsecretary@gmail.com">Contact the P&amp;C</a>
          </nav>
          <p className="site-footer__note">
            This dashboard is a shortcut to SignUpGenius, where all sign-ups happen. Not an official
            school system.
          </p>
        </div>

        <img
          className="site-footer__logo site-footer__logo--bps"
          src={`${base}bps.png`}
          alt="Beecroft Public School"
        />
      </div>
    </footer>
  );
}
