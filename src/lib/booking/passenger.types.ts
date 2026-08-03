/**
 * Client-safe passenger + booking-contact contracts.
 * Shared by the passenger details form and the server function validator.
 */
import { z } from "zod";

export const PASSENGER_TITLES = ["mr", "ms", "mrs", "miss", "dr"] as const;
export const PASSENGER_GENDERS = ["m", "f"] as const;

export const TITLE_LABELS: Record<(typeof PASSENGER_TITLES)[number], string> = {
  mr: "Mr",
  ms: "Ms",
  mrs: "Mrs",
  miss: "Miss",
  dr: "Dr",
};

export const GENDER_LABELS: Record<(typeof PASSENGER_GENDERS)[number], string> = {
  m: "Male",
  f: "Female",
};

export const contactSchema = z.object({
  fullName: z.string().trim().min(2, "Enter the booking contact name").max(120),
  email: z.string().trim().email("Enter a valid email address").max(255),
  phone: z.string().trim().min(7, "Enter a reachable phone number").max(32),
  country: z.string().trim().min(2, "Enter your country or nationality").max(80),
});

export const passengerSchema = z.object({
  title: z.enum(PASSENGER_TITLES),
  firstName: z.string().trim().min(2, "First name is required").max(80),
  middleName: z.string().trim().max(80).optional().or(z.literal("")),
  lastName: z.string().trim().min(2, "Last name is required").max(80),
  dateOfBirth: z.string().trim().min(8, "Date of birth is required").max(10),
  gender: z.enum(PASSENGER_GENDERS),
  nationality: z.string().trim().min(2, "Nationality is required").max(80),
  passportNumber: z.string().trim().max(40).optional().or(z.literal("")),
  passportCountry: z.string().trim().max(80).optional().or(z.literal("")),
  passportExpiry: z.string().trim().max(10).optional().or(z.literal("")),
});

export type BookingContact = z.infer<typeof contactSchema>;
export type BookingPassenger = z.infer<typeof passengerSchema>;

export const savePassengersSchema = z.object({
  request_id: z.string().uuid(),
  contact: contactSchema,
  passengers: z.array(passengerSchema).min(1).max(9),
  passportRequired: z.boolean().default(false),
});

/** Extra passport validation only applied when the airline requires documents. */
export function validatePassengers(
  passengers: BookingPassenger[],
  passportRequired: boolean,
): string | null {
  const base = z.array(passengerSchema).safeParse(passengers);
  if (!base.success) return base.error.issues[0]?.message ?? "Please complete every traveller.";
  if (!passportRequired) return null;
  for (const [index, passenger] of passengers.entries()) {
    if (!passenger.passportNumber || !passenger.passportCountry || !passenger.passportExpiry) {
      return `Traveller ${index + 1}: passport number, issuing country and expiry date are required for this flight.`;
    }
  }
  return null;
}

export function emptyPassenger(): BookingPassenger {
  return {
    title: "mr",
    firstName: "",
    middleName: "",
    lastName: "",
    dateOfBirth: "",
    gender: "m",
    nationality: "Nigeria",
    passportNumber: "",
    passportCountry: "",
    passportExpiry: "",
  };
}

export function passengerFullName(passenger: BookingPassenger): string {
  return [
    TITLE_LABELS[passenger.title],
    passenger.firstName,
    passenger.middleName,
    passenger.lastName,
  ]
    .filter(Boolean)
    .join(" ");
}
