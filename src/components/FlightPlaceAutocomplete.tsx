import { useState } from "react";
import { MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";

const AIRPORTS: Record<string, string> = {
  LOS: "Los Angeles International Airport",
  LHR: "London Heathrow Airport",
  JFK: "John F. Kennedy International Airport",
  DXB: "Dubai International Airport",
  CDG: "Paris Charles de Gaulle Airport",
  AMS: "Amsterdam Airport Schiphol",
  FRA: "Frankfurt Airport",
  IST: "Istanbul Airport",
  YYZ: "Toronto Pearson International Airport",
  SYD: "Sydney Kingsford Smith Airport",
};

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
  const [query, setQuery] = useState(value);
  const code = query.trim().toUpperCase();
  const airportName = code.length === 3 ? AIRPORTS[code] : undefined;

  return (
    <div className="relative">
      <Input
        id={id}
        value={query}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(event) => {
          const next = event.target.value.toUpperCase();
          setQuery(next);
          onValueChange(/^[A-Z]{3}$/.test(next) ? next : "");
        }}
      />
      <MapPin className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-soft" />
      {airportName && (
        <div className="mt-1 text-sm font-medium text-navy">
          {airportName} ({code})
        </div>
      )}
    </div>
  );
}
