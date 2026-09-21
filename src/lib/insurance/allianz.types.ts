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
 * Quote request. TODO: replace with the documented quote contract. The fields
 * below are the trip inputs a travel-insurance quote normally needs and map to
 * data we already collect in the request wizard; adjust names to the doc.
 */
export interface AllianzQuoteRequest {
  DestinationCountry: string;
  /** TODO: confirm whether a plan/product id is required at quote time. */
  TravelPlanId?: number;
  BookingTypeId?: number;
  CoverStartDate: AllianzDate;
  CoverEndDate: AllianzDate;
  TravellersCount: number;
  /** DOB(s) commonly required so the premium can be age-rated. */
  DateOfBirth?: AllianzDate;
}

/**
 * Quote response. TODO: confirm the exact fields. At minimum we expect a quote
 * id (reused as QuoteId on booking) and a premium amount.
 */
export interface AllianzQuoteResponse {
  QuoteId: number;
  Amount: number;
  Currency?: string;
  [key: string]: unknown;
}

/**
 * Booking response. TODO: confirm fields — expected to carry the policy /
 * contract number, the amount charged and a certificate URL.
 */
export interface AllianzBookingResponse {
  ContractNumber?: string;
  PolicyNumber?: string;
  Amount?: number;
  CertificateUrl?: string;
  [key: string]: unknown;
}

/** Lookup tables the API references by id. TODO: populate from the doc. */
export interface AllianzLookups {
  genders: Record<number, string>;
  titles: Record<number, string>;
  states: Record<number, string>;
  maritalStatuses: Record<number, string>;
}
