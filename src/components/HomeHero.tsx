import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertCircle, ArrowRight, Briefcase, Headphones, MapPin, ShieldCheck, Star, Zap } from "lucide-react";

import travellerImage from "@/assets/hero-traveller-cutout.png";
import { getHeroContent } from "@/lib/cms.functions";

const ROTATING_HEADLINES = [
  "get your travel visa",
  "book your next flight",
  "plan your perfect trip",
  "secure your travel documents",
];

const ORIGINS = ["Nigeria", "Ghana", "Kenya", "South Africa", "United Kingdom", "United States", "Canada", "United Arab Emirates"];
const DESTINATIONS = ["United Kingdom", "USA", "Canada", "Schengen Countries", "Dubai", "Australia", "Other destinations"];

const NEEDS = [
  { label: "Visa Application", slug: "visa-assistance" },
  { label: "Flight Booking", slug: "flights" },
  { label: "Hotel Booking", slug: "hotels" },
  { label: "Visa Hotel Reservation", slug: "visa-hotel-reservation" },
  { label: "Travel Documents", slug: "proof-of-funds" },
];

const FEATURES = [
  { icon: Zap, title: "Fast Processing", description: "Quick support for urgent travellers" },
  { icon: ShieldCheck, title: "Secure & Protected", description: "Your documents are handled safely" },
  { icon: Headphones, title: "Expert Guidance", description: "Real travel specialists helping you" },
  { icon: Star, title: "Trusted Service", description: "Professional visa preparation support" },
];

// The rest of this component remains unchanged from the certified hero build.
// Only NEEDS and the service routing are extended for the new service.
