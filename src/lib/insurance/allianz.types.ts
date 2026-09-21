/**
 * Sanlam Allianz travel insurance API — request/response contracts.
 *
 * The individual-booking payload below is transcribed directly from the sample
 * confirmed by Sanlam Allianz support, so it is authoritative. The quote
 * request/response and the API's lookup enumerations (GenderId, TitleId,
 * StateId, MaritalStatusId, plan/product ids) still need to be filled in from
 * the provider documentation — those spots are marked with TODO.
 */

/** Sanlam Allianz expects dates as `dd-MMM-yyyy`, e.g. "21-Jan-1984". */
export type AllianzDate = string;

/** Next of kin block on the individual booking payload. */
export interface AllianzNextOfKin {
  FullName: string;
  Address: string;
  Relationship: string;
  Telephone: string;
}

/**
 * Individual booking (purchase) payload.
 * `QuoteId` is produced by the preceding quote call.
 */
export interface AllianzIndividualBooking {
  QuoteId: number;
  Surname: string;
  MiddleName: string;
  FirstName: string;
  /** Lookup id — see AllianzLookups.genders. TODO: confirm value map. */
  GenderId: number;
  /** Lookup id — see AllianzLookups.titles. TODO: confirm value map. */
  TitleId: number;
  DateOfBirth: AllianzDate;
  Email: string;
  Telephone: string;
  /** Nigerian state lookup id. TODO: confirm value map. */
  StateId: number;
  Address: string;
  ZipCode: string;
  Nationality: string;
  PassportNo: string;
  /** Path returned by the document upload endpoint, or null. */
  IdentificationPath: string | null;
  Occupation: string;
  /** National Identification Number — optional (not in the API doc payload). */
  Nin?: string;
  /** Lookup id — see GetMaritalStatus. */
  MaritalStatusId: number;
  PreExistingMedicalCondition: boolean;
  /** Free text when PreExistingMedicalCondition is true; otherwise null. */
  MedicalCondition: string | null;
  NextOfKin: AllianzNextOfKin;
}

/** Booking type ids (from GetBookingType / the doc examples). */
export const ALLIANZ_BOOKING_TYPE_INDIVIDUAL = 1;
export const ALLIANZ_BOOKING_TYPE_FAMILY = 2;

/**
 * Quote request (POST /api/Quote), matching the API doc.
 * All dates are `dd-MMM-yyyy` (e.g. "14-Oct-2019") — use toAllianzDate().
 */
export interface AllianzQuoteRequest {
  DateOfBirth: AllianzDate;
  Email: string;
  Telephone: string;
  CoverBegins: AllianzDate;
  CoverEnds: AllianzDate;
  CountryId: number;
  PurposeOfTravel: string;
  TravelPlanId: number;
  BookingTypeId: number;
  IsRoundTrip: boolean;
  NoOfPeople: number;
  /** Family: 1–6 children under 18; Individual: 0. */
  NoOfChildren: number;
  /** true when the trip duration is greater than 92 days. */
  IsMultiTrip: boolean;
}

/** A normalised { id, name } row from any lookup endpoint. */
export interface AllianzLookupItem {
  id: number;
  name: string;
}

/**
 * Quote response (observed). Carries two ids: `QuoteRequestId` (integer, the
 * value the booking's `QuoteId` field expects) and `quoteId` (a GUID). It also
 * echoes the trip inputs and returns the premium (`Amount` / `AllianzPrice`).
 */
export interface AllianzQuoteResponse {
  QuoteRequestId: number;
  quoteId: string;
  ProductVariantId: string;
  Amount: number;
  AllianzPrice: string;
  CoverBegins: string;
  CoverEnds: string;
  CountryId: number;
  TravelPlanId: number;
  BookingTypeId: number;
  NoOfPeople: number;
  DiscountApplied?: number;
  [key: string]: unknown;
}

/**
 * Booking response (observed): the API returns a bare reference string, e.g.
 * "VASNGS200001123" — the policy / certificate number. Kept as a string alias
 * so callers store it directly.
 */
export type AllianzBookingResult = string;

/** Lookup tables the API references by id. TODO: populate from the doc. */
export interface AllianzLookups {
  genders: Record<number, string>;
  titles: Record<number, string>;
  states: Record<number, string>;
  maritalStatuses: Record<number, string>;
}
