import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Building2, Loader2, MapPin, Plane } from "lucide-react";

import { Input } from "@/components/ui/input";
import { getFlightPlaceSuggestions } from "@/lib/travel-api/place-suggestions.functions";
import type { FlightPlaceSuggestion } from "@/lib/travel-api/flights.server";

export function FlightPlaceAutocomplete({
  id,
  value,
  placeholder,
  onValueChange,
}: {
  id: string;
  value: string;
  placeholder: string;
  onValueChange: (iataCode: string) => void;
}) {
  const suggest = useServerFn(getFlightPlaceSuggestions);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const requestRef = useRef(0);
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<FlightPlaceSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (value && /^[A-Z]{3}$/.test(value) && !query.includes(`(${value})`)) setQuery(value);
    // The visible label intentionally remains after a suggestion is selected.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    const raw = query.trim();
    if (raw.length < 2 || (value && query.includes(`(${value})`))) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    const requestId = ++requestRef.current;
    setLoading(true);
    const timer = window.setTimeout(async () => {
      const result = await suggest({ data: { query: raw } });
      if (requestId !== requestRef.current) return;
      setSuggestions(result.ok ? result.suggestions : []);
      setLoading(false);
      setOpen(true);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query, suggest, value]);

  const select = (place: FlightPlaceSuggestion) => {
    const city = place.cityName || place.name;
    setQuery(
      place.type === "city"
        ? `${place.name} (${place.iataCode}) — all airports`
        : `${city} — ${place.name} (${place.iataCode})`,
    );
    onValueChange(place.iataCode);
    setOpen(false);
    setSuggestions([]);
  };

  return (
    <div ref={rootRef} className="relative">
      <Input
        id={id}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={`${id}-suggestions`}
        value={query}
        placeholder={placeholder}
        autoComplete="off"
        onFocus={() => setOpen(suggestions.length > 0)}
        onChange={(event) => {
          const next = event.target.value;
          setQuery(next);
          onValueChange(/^[A-Za-z]{3}$/.test(next.trim()) ? next.trim().toUpperCase() : "");
          setOpen(true);
        }}
      />
      {loading ? (
        <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-navy-soft" />
      ) : (
        <MapPin className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-soft" />
      )}
      {open && (suggestions.length > 0 || loading) ? (
        <div
          id={`${id}-suggestions`}
          role="listbox"
          className="absolute z-50 mt-2 max-h-80 w-full overflow-y-auto rounded-2xl border border-navy/10 bg-white p-2 shadow-xl"
        >
          {suggestions.map((place) => (
            <button
              key={place.id}
              type="button"
              role="option"
              aria-selected={value === place.iataCode}
              className="flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left hover:bg-sky-tint focus:bg-sky-tint focus:outline-none"
              onClick={() => select(place)}
            >
              {place.type === "city" ? (
                <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-orange" />
              ) : (
                <Plane className="mt-0.5 h-4 w-4 shrink-0 text-orange" />
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-navy">
                  {place.type === "city"
                    ? `${place.name} — all airports`
                    : `${place.cityName || place.name} — ${place.name}`}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {place.iataCode}{place.countryCode ? ` · ${place.countryCode}` : ""}
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
