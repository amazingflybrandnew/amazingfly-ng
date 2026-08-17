export const VISA_HOTEL_RESERVATION_SLUG = "visa-hotel-reservation";
export const VISA_HOTEL_RESERVATION_CATEGORY = "visa_hotel_reservation";

/**
 * Internal service type deliberately avoids the word "hotel" so the existing
 * checkout server treats the ₦15,000 charge as a visa/travel service fee, not
 * as payment for the accommodation itself. Customer-facing views decorate it
 * back to the public product name.
 */
export const VISA_HOTEL_RESERVATION_INTERNAL_SERVICE_TYPE = "Visa Accommodation Reservation";
export const VISA_HOTEL_RESERVATION_PUBLIC_NAME = "Visa Hotel Reservation";
export const VISA_HOTEL_RESERVATION_FEE_NGN = 15_000;

export function isVisaHotelReservationServiceType(value: string | null | undefined): boolean {
  const normalized = (value ?? "").trim().toLowerCase();
  return (
    normalized === VISA_HOTEL_RESERVATION_INTERNAL_SERVICE_TYPE.toLowerCase() ||
    normalized === VISA_HOTEL_RESERVATION_PUBLIC_NAME.toLowerCase()
  );
}
