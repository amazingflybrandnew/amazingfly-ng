export const VISA_FLIGHT_RESERVATION_ID = "visa-flight-reservation";
export const VISA_FLIGHT_RESERVATION_FEE_NGN = 20_000;

export function isVisaFlightReservation(value: unknown): boolean {
  return String(value ?? "").toLowerCase() === VISA_FLIGHT_RESERVATION_ID;
}
