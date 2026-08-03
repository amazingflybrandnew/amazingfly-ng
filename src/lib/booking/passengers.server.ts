/**
 * Server-only passenger + booking contact storage.
 *
 * Passengers live in `public.booking_passengers`, keyed to the EXISTING
 * `service_requests` row. Contact details update the request row itself.
 */
import type { SessionUser } from "../auth.server";
import type { BookingContact, BookingPassenger } from "./passenger.types";

async function admin() {
  const { createExternalSupabaseAdmin } = await import("../external-supabase.server");
  return createExternalSupabaseAdmin();
}

export type BookingPassengerRecord = BookingPassenger & { id: string };

export type PassengerBundle = {
  contact: BookingContact | null;
  passengers: BookingPassengerRecord[];
};

function toPassenger(row: Record<string, unknown>): BookingPassengerRecord {
  return {
    id: String(row["id"]),
    title: (String(row["title"] ?? "mr") as BookingPassenger["title"]) ?? "mr",
    firstName: String(row["first_name"] ?? ""),
    middleName: row["middle_name"] ? String(row["middle_name"]) : "",
    lastName: String(row["last_name"] ?? ""),
    dateOfBirth: row["date_of_birth"] ? String(row["date_of_birth"]).slice(0, 10) : "",
    gender: (String(row["gender"] ?? "m") as BookingPassenger["gender"]) ?? "m",
    nationality: String(row["nationality"] ?? ""),
    passportNumber: row["passport_number"] ? String(row["passport_number"]) : "",
    passportCountry: row["passport_country"] ? String(row["passport_country"]) : "",
    passportExpiry: row["passport_expiry"] ? String(row["passport_expiry"]).slice(0, 10) : "",
  };
}

/** Confirms the request belongs to the signed-in customer. */
async function ownedRequest(user: SessionUser, requestId: string) {
  const supabase = await admin();
  const { data } = await supabase
    .from("service_requests")
    .select("*")
    .eq("id", requestId)
    .eq("user_id", user.id)
    .maybeSingle();
  return (data as Record<string, unknown> | null) ?? null;
}

export async function loadPassengers(
  user: SessionUser,
  requestId: string,
): Promise<PassengerBundle | null> {
  const request = await ownedRequest(user, requestId);
  if (!request) return null;

  const supabase = await admin();
  const { data, error } = await supabase
    .from("booking_passengers")
    .select("*")
    .eq("request_id", requestId)
    .order("created_at", { ascending: true });

  if (error) console.error("[passengers] load", error.message);

  const contact: BookingContact = {
    fullName: String(request["full_name"] ?? user.full_name ?? ""),
    email: String(request["email"] ?? user.email ?? ""),
    phone: String(request["phone"] ?? user.phone ?? "").replace(/^—$/, ""),
    country: String(request["contact_country"] ?? user.nationality ?? ""),
  };

  return {
    contact,
    passengers: ((data ?? []) as Record<string, unknown>[]).map(toPassenger),
  };
}

export async function savePassengers(
  user: SessionUser,
  input: { requestId: string; contact: BookingContact; passengers: BookingPassenger[] },
): Promise<{ ok: true } | { ok: false; message: string }> {
  const request = await ownedRequest(user, input.requestId);
  if (!request) return { ok: false, message: "We could not find that booking on your account." };

  const supabase = await admin();

  const contactUpdate: Record<string, unknown> = {
    full_name: input.contact.fullName,
    email: input.contact.email,
    phone: input.contact.phone,
    contact_country: input.contact.country,
    passengers_completed_at: new Date().toISOString(),
  };

  let { error: updateError } = await supabase
    .from("service_requests")
    .update(contactUpdate)
    .eq("id", input.requestId);

  // Columns not migrated yet — keep the core contact fields working.
  if (updateError?.code === "42703" || updateError?.code === "PGRST204") {
    ({ error: updateError } = await supabase
      .from("service_requests")
      .update({
        full_name: input.contact.fullName,
        email: input.contact.email,
        phone: input.contact.phone,
      })
      .eq("id", input.requestId));
  }
  if (updateError) {
    console.error("[passengers] contact update", updateError.message);
    return { ok: false, message: "We could not save your contact details." };
  }

  await supabase.from("booking_passengers").delete().eq("request_id", input.requestId);

  const rows = input.passengers.map((passenger) => ({
    request_id: input.requestId,
    title: passenger.title,
    first_name: passenger.firstName,
    middle_name: passenger.middleName || null,
    last_name: passenger.lastName,
    date_of_birth: passenger.dateOfBirth || null,
    gender: passenger.gender,
    nationality: passenger.nationality,
    passport_number: passenger.passportNumber || null,
    passport_country: passenger.passportCountry || null,
    passport_expiry: passenger.passportExpiry || null,
  }));

  let { error } = await supabase.from("booking_passengers").insert(rows);

  // Older/leaner passenger tables may not have every optional column yet.
  if (error && (error.code === "42703" || error.code === "PGRST204")) {
    const minimal = rows.map((row) => ({
      request_id: row.request_id,
      first_name: row.first_name,
      last_name: row.last_name,
    }));
    ({ error } = await supabase.from("booking_passengers").insert(minimal));
  }

  if (error) {
    console.error("[passengers] insert", error.code, error.message, error.details);
    return {
      ok: false,
      message: `We could not save the traveller details (${error.message}).`,
    };
  }


  await supabase.from("request_updates").insert({
    request_id: input.requestId,
    status: "passenger_details",
    message: `Traveller details saved for ${input.passengers.length} passenger(s)`,
  });

  return { ok: true };
}
