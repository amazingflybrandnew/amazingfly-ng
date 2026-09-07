import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, MapPin, Plane } from "lucide-react";
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
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<FlightPlaceSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    const text = query.trim();
    if (text.length < 3) {
      setResults([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      setLoading(true);
      const response = await suggest({ data: { query: text.toUpperCase() } });
      if (response.ok) {
        const unique = Array.from(
          new Map(response.suggestions.map((item) => [item.id, item])).values(),
        );
        setResults(unique);
      } else {
        setResults([]);
      }
      setOpen(true);
      setLoading(false);
    }, 200);

    return () => window.clearTimeout(timer);
  }, [query, suggest]);

  function select(place: FlightPlaceSuggestion) {
    setQuery(`${place.name} (${place.iataCode}) - ${place.cityName || ""}`);
    onValueChange(place.iataCode);
    setOpen(false);
  }

  return (
    <div ref={root} className="relative">
      <Input
        id={id}
        value={query}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(e) => {
          const text = e.target.value.toUpperCase();
          setQuery(text);
          onValueChange(/^[A-Z]{3}$/.test(text) ? text : "");
        }}
      />

      {loading ? (
        <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin" />
      ) : (
        <MapPin className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2" />
      )}

      {open && results.length > 0 && (
        <div className="absolute z-50 mt-2 max-h-96 w-full overflow-auto rounded-xl border border-gray-100 bg-white p-2 shadow-xl" role="listbox" aria-label="Matching airports and city codes">
          {results.map((airport) => (
            <button
              key={airport.id}
              type="button"
              role="option"
              className="flex w-full items-start gap-3 rounded-lg p-3 text-left hover:bg-gray-100"
              onClick={() => select(airport)}
            >
              <Plane className="mt-1 h-4 w-4" />
              <span className="min-w-0 flex-1">
                <span className="flex items-start justify-between gap-3">
                  <strong>{airport.name}</strong>
                  <span className="shrink-0 rounded-md bg-navy px-2 py-0.5 text-xs font-extrabold text-white">{airport.iataCode}</span>
                </span>
                <span className="block text-sm text-gray-500">
                  {airport.type === "airport" ? "Airport" : "City / metro code"}
                  {airport.cityName ? ` · ${airport.cityName}` : ""}
                  {airport.countryCode ? ` · ${airport.countryCode}` : ""}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
