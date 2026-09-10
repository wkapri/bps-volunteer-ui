/**
 * The `data.json` contract between `bps-volunteer-cron` (producer) and
 * `bps-volunteer-ui` (consumer). Canonical description: DESIGN.md section 4.
 *
 * This file is the UI's mirror of the schema owned by bps-volunteer-cron.
 * Keep it in sync with schema/data.schema.json.
 */

export type Status = "green" | "amber" | "red" | "closed";

export interface CanteenShift {
  label: string;
  capacity: number;
  filled: number;
}

/** An open (or closed) canteen day. Closed days carry only date/weekday/status. */
export type CanteenDay =
  | {
      date: string; // ISO date, Sydney
      weekday: string;
      status: "green" | "amber" | "red";
      capacity: number;
      filled: number;
      fillPct: number;
      deepLink: string; // SignUpGenius, anchored to this date
      shifts: CanteenShift[];
      note?: string; // e.g. "canteen event day"
    }
  | {
      date: string;
      weekday: string;
      status: "closed";
      note?: string;
    };

export interface Canteen {
  signupId: number | null;
  title: string | null;
  signupUrl: string;
  days: CanteenDay[]; // empty => between terms
}

export interface VolunteerEvent {
  id: number;
  title: string;
  date: string; // ISO date, Sydney (v1: one event = one date)
  description: string | null;
  imageUrl: string | null;
  signupUrl: string;
  status: "green" | "amber" | "red";
  capacity: number;
  filled: number;
  fillPct: number;
  capacityNote?: string;
  /** present only in sample fixtures for entirely made-up events */
  _synthetic?: boolean;
}

export interface Diagnostics {
  canteenSource?: "public-sheet" | "key-api";
  eventsFetched?: number;
  warnings?: string[];
}

export interface VolunteerData {
  generatedAt: string; // ISO 8601 with Sydney offset; last SUCCESSFUL build
  timezone: "Australia/Sydney";
  schemaVersion: 1;
  canteen: Canteen;
  events: VolunteerEvent[]; // sorted soonest-first by the UI
  diagnostics?: Diagnostics;
}

/** Status thresholds — DESIGN.md section 4.2. Same formula for canteen days and events. */
export function statusFromPct(pct: number | null): Status {
  if (pct === null) return "closed";
  if (pct < 25) return "red";
  if (pct < 75) return "amber";
  return "green";
}

export const STATUS_META: Record<Status, { icon: string; label: string }> = {
  green: { icon: "✓", label: "Well covered" },
  amber: { icon: "!", label: "Some help needed" },
  red: { icon: "✕", label: "Needs volunteers" },
  closed: { icon: "–", label: "Canteen closed" },
};
