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
  Nin: string;
  /** Lookup id — see AllianzLookups.maritalStatuses. TODO: confirm value map. */
  MaritalStatusId: number;
  PreExistingMedicalCondition: boolean;
  /** Free text when PreExistingMedicalCondition is true; otherwise null. */
  MedicalCondition: string | null;
  NextOfKin: AllianzNextOfKin;
}

/**
 * Quote request. Field names mirror the quote response the API echoes back.
 * ISO datetimes (`yyyy-mm-ddTHH:MM:SS`) are what the observed quote used for
 * dates here — note this differs from the booking payload, which uses
 * `dd-MMM-yyyy`.
 *
 * TODO: confirm the exact request path and required fields against the
 * "2. Get Quote (Individual)" request in Postman (URL + body).
 */
export interface AllianzQuoteRequest {
  ProductVariantId: string;
  DateOfBirth: string;
  Email: string;
  Telephone: string;
  CoverBegins: string;
  CoverEnds: string;
  CountryId: number;
  CountryId2?: number | null;
  PurposeOfTravel: string;
  TravelPlanId: number;
  BookingTypeId: number;
  IsRoundTrip?: boolean;
  IsLifeInsuranceIncluded?: boolean;
  PreExistingMedicalCondition?: boolean;
  MedicalCondition?: string | null;
  NoOfPeople: number;
  NoOfChildren?: number;
  IsMultiTrip?: boolean;
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
