import { useCallback, useEffect, useRef, useState } from "react";
import type { VolunteerData } from "../data";

const REFRESH_MS = 15 * 60 * 1000; // re-fetch every 15 min while the tab is open
const CACHE_KEY = "bps-volunteer-data:v1";

export type DataState =
  | { status: "loading"; data: null; stale: false; fromCache: false }
  | { status: "ready"; data: VolunteerData; stale: boolean; fromCache: boolean }
  | { status: "error"; data: VolunteerData | null; stale: boolean; fromCache: boolean; error: string };

/** Where to load data.json from: ?data= override, then build-time env, then the bundled sample. */
export function resolveDataUrl(): string {
  const override = new URLSearchParams(window.location.search).get("data");
  if (override) {
    // Allow "?data=stale" as shorthand for the fixture of that name.
    return /^https?:|^\//.test(override)
      ? override
      : `${import.meta.env.BASE_URL}fixtures/data.${override}.json`;
  }
  // `||` not `??`: an unset Actions variable comes through as "" at build time.
  return import.meta.env.VITE_DATA_URL || `${import.meta.env.BASE_URL}fixtures/data.sample.json`;
}

export function useVolunteerData(): DataState & { refresh: () => void } {
  const url = resolveDataUrl();
  const [state, setState] = useState<DataState>(() => {
    const cached = readCache();
    return cached
      ? { status: "ready", data: cached, stale: isStale(cached), fromCache: true }
      : { status: "loading", data: null, stale: false, fromCache: false };
  });
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const res = await fetch(url, { signal: ac.signal, cache: "no-cache" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as unknown;
      if (!isVolunteerData(json)) throw new Error("Unexpected data shape");
      writeCache(json);
      setState({ status: "ready", data: json, stale: isStale(json), fromCache: false });
    } catch (err) {
      if (ac.signal.aborted) return;
      const cached = readCache();
      setState({
        status: "error",
        data: cached,
        stale: cached ? isStale(cached) : false,
        fromCache: Boolean(cached),
        error: err instanceof Error ? err.message : "Failed to load",
      });
    }
  }, [url]);

  useEffect(() => {
    // load() is async — setState only runs after the fetch resolves, not synchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const timer = window.setInterval(() => void load(), REFRESH_MS);
    const onFocus = () => {
      if (document.visibilityState === "visible") void load();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      abortRef.current?.abort();
    };
  }, [load]);

  return { ...state, refresh: () => void load() };
}

const STALE_HOURS = 3;
function isStale(d: VolunteerData): boolean {
  return Date.now() - new Date(d.generatedAt).getTime() > STALE_HOURS * 3_600_000;
}

function readCache(): VolunteerData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return isVolunteerData(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeCache(d: VolunteerData): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(d));
  } catch {
    /* private mode / quota — cache is best-effort */
  }
}

function isVolunteerData(v: unknown): v is VolunteerData {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.generatedAt === "string" &&
    typeof o.canteen === "object" &&
    o.canteen !== null &&
    Array.isArray((o.canteen as Record<string, unknown>).days) &&
    Array.isArray(o.events)
  );
}
