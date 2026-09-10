import { Banner } from "./components/Banner";
import { CanteenRow } from "./components/CanteenRow";
import { DashboardSkeleton } from "./components/Skeleton";
import { EventsGrid } from "./components/EventsGrid";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { relativeAge } from "./lib/format";
import { useVolunteerData } from "./lib/useVolunteerData";

export function App() {
  const state = useVolunteerData();
  const { status, data, stale, refresh } = state;

  return (
    <div className="app">
      <Header />

      <main className="app__main">
        {status === "error" && !data && (
          <Banner tone="error" onRetry={refresh}>
            Couldn’t load volunteer data. You can still{" "}
            <a href="https://www.signupgenius.com" target="_blank" rel="noopener noreferrer">
              open SignUpGenius directly
            </a>
            .
          </Banner>
        )}

        {status === "error" && data && (
          <Banner tone="warn" onRetry={refresh}>
            Couldn’t refresh just now — showing the last data we have.
          </Banner>
        )}

        {status !== "error" && stale && data && (
          <Banner tone="warn">Volunteer numbers last updated {relativeAge(data.generatedAt)}.</Banner>
        )}

        {status === "loading" && !data ? (
          <DashboardSkeleton />
        ) : data ? (
          <>
            <CanteenRow canteen={data.canteen} />
            <EventsGrid events={data.events} />
          </>
        ) : null}
      </main>

      <Footer data={data} />
    </div>
  );
}
