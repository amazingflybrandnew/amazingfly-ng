/** Converts common customer phone formats into Duffel's required E.164 shape. */
export function normalizeBookingPhone(value: unknown, countryHint?: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) throw new Error("A booking contact phone number is required by the airline.");
  if (raw.startsWith("+")) {
    const normalized = `+${raw.slice(1).replace(/\D/g, "")}`;
    if (/^\+[1-9]\d{7,14}$/.test(normalized)) return normalized;
  }
  if (raw.startsWith("00")) {
    const normalized = `+${raw.slice(2).replace(/\D/g, "")}`;
    if (/^\+[1-9]\d{7,14}$/.test(normalized)) return normalized;
  }

  const digits = raw.replace(/\D/g, "");
  const country = String(countryHint ?? "").trim().toUpperCase();
  if ((country === "NG" || country === "NIGERIA") && /^0\d{10}$/.test(digits)) {
    return `+234${digits.slice(1)}`;
  }
  if (/^234\d{10}$/.test(digits)) return `+${digits}`;
  throw new Error("Enter the booking phone number with its country code, for example +234…");
}
