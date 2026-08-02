/**
 * Client-side store for the flight a customer has selected.
 * Persisted to localStorage so the selection survives navigation to /request.
 * No payment or booking side effects — this only prepares the selection.
 */

import { useSyncExternalStore } from "react";
import type { FlightResult } from "./flight.types";

const STORAGE_KEY = "amazingfly.selected-flight";

export type SelectedFlight = FlightResult & { selectedAt: string };

let current: SelectedFlight | null = null;
let hydrated = false;
const listeners = new Set<() => void>();

function readStorage(): SelectedFlight | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SelectedFlight) : null;
  } catch {
    return null;
  }
}

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  if (!hydrated) {
    hydrated = true;
    current = readStorage();
  }
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): SelectedFlight | null {
  if (!hydrated) {
    hydrated = true;
    current = readStorage();
  }
  return current;
}

function getServerSnapshot(): SelectedFlight | null {
  return null;
}

export function selectFlight(flight: FlightResult) {
  current = { ...flight, selectedAt: new Date().toISOString() };
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    } catch {
      /* storage unavailable — keep in-memory only */
    }
  }
  hydrated = true;
  emit();
}

export function clearSelectedFlight() {
  current = null;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
  hydrated = true;
  emit();
}

export function useSelectedFlight(): SelectedFlight | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
