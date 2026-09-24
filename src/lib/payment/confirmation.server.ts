import type { SessionUser } from "../auth.server";
import type {
  BookingConfirmation,
  HotelSupplierReferences,
  HotelVoucherDetails,
  RateHawkSandboxDiagnostics,
} from "./verify.functions";

/** Loads customer-safe confirmation data for account pages and email attachments. */
export async function loadBookingConfirmationForUser(
  user: SessionUser,
  requestId: string,
): Promise<BookingConfirmation | null> {
  const { loadBookingReview } = await import("./checkout.server");
  const { loadPassengerSummaries } = await import("../booking/passengers.server");
  const review = await loadBookingReview(user, requestId);
  if (!review) return null;

  const bundle = await loadPassengerSummaries(user, requestId);
  let hotelSupplierReferences: HotelSupplierReferences | null = null;
  let rateHawkDiagnostics: RateHawkSandboxDiagnostics | null = null;
  let hotelVoucher: HotelVoucherDetails | null = null;

  if (review.kind === "hotel") {
    const { createExternalSupabaseAdmin } = await import("../external-supabase.server");
    const database = createExternalSupabaseAdmin();
    try {
      const { data: request } = await database
        .from("service_requests")
        .select("hotel_provider_id")
        .eq("id", requestId)
        .maybeSingle();
      const providerId = (request as { hotel_provider_id?: string | null } | null)
        ?.hotel_provider_id;
      if (providerId) {
        const { getHotelVoucherDetails } = await import("../travel-api/hotels.server");
        hotelVoucher = await getHotelVoucherDetails(providerId);
      }
    } catch (error) {
      console.error("[hotel-booking] voucher details load failed", error);
    }
    const { data: booking, error } = await database
      .from("hotel_bookings")
      .select(
        "partner_order_id, order_id, provider_reference, status, provider_status, error_message, attempts",
      )
      .eq("request_id", requestId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[hotel-booking] confirmation references load failed", error.message);
    } else if (booking) {
      const row = booking as Record<string, unknown>;
      hotelSupplierReferences = {
        partnerOrderId: String(row["partner_order_id"] ?? ""),
        orderId: row["order_id"] != null ? String(row["order_id"]) : null,
        providerReference:
          row["provider_reference"] != null ? String(row["provider_reference"]) : null,
      };

      const { isRateHawkSandbox } = await import("../ratehawk.server");
      if (isRateHawkSandbox()) {
        rateHawkDiagnostics = {
          partnerOrderId: hotelSupplierReferences.partnerOrderId,
          orderId: hotelSupplierReferences.orderId,
          status: String(row["status"] ?? ""),
          providerStatus: row["provider_status"] != null ? String(row["provider_status"]) : null,
          errorMessage: row["error_message"] != null ? String(row["error_message"]) : null,
          attempts: Number(row["attempts"] ?? 0),
        };
      }
    }
  }

  return {
    review,
    passengers: bundle?.passengers ?? [],
    contactName: bundle?.contact?.fullName ?? user.full_name ?? "",
    contactEmail: bundle?.contact?.email ?? user.email,
    hotelSupplierReferences,
    rateHawkDiagnostics,
    hotelVoucher,
  };
}
