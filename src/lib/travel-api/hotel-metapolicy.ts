/**
 * Turns ETG `metapolicy_struct` + `metapolicy_extra_info` into readable
 * sections. Guests must meet these conditions at check-in, so they are shown
 * before booking. Pure and dependency-free; safe on client and server.
 */

export type HotelPolicySection = { title: string; items: string[] };

type Entry = Record<string, unknown>;

const SECTION_TITLES: Record<string, string> = {
  check_in_check_out: "Early check-in / late check-out",
  deposit: "Deposit at check-in",
  add_fee: "Additional fees",
  meal: "Meals",
  children_meal: "Children's meals",
  children: "Children",
  extra_bed: "Extra beds",
  cot: "Cots",
  pets: "Pets",
  parking: "Parking",
  internet: "Internet",
  shuttle: "Transfers / shuttle",
  visa: "Visa support",
  no_show: "No-show",
};

// Fields that name *what* an entry is about, in priority order.
const TYPE_FIELDS = [
  "check_in_check_out_type",
  "deposit_type",
  "fee_type",
  "meal_type",
  "pets_type",
  "internet_type",
  "shuttle_type",
  "territory_type",
  "destination_type",
];

function words(value: unknown): string {
  const text = String(value ?? "")
    .replace(/[_-]+/g, " ")
    .trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
}

function isBlank(value: unknown): boolean {
  return value === null || value === undefined || value === "" || value === "unspecified";
}

function priceText(entry: Entry): string | null {
  const amount = Number(entry["price"] ?? NaN);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const currency = String(entry["currency"] ?? "").toUpperCase();
  const unit = isBlank(entry["price_unit"]) ? "" : ` ${words(entry["price_unit"]).toLowerCase()}`;
  const method = isBlank(entry["pricing_method"])
    ? ""
    : ` (${words(entry["pricing_method"]).toLowerCase()})`;
  return `${amount.toLocaleString("en-GB")} ${currency}`.trim() + unit + method;
}

function inclusionText(value: unknown): string | null {
  if (value === "included") return "included";
  if (value === "not_included") return "not included, charged by the hotel";
  return null;
}

function describeEntry(entry: Entry): string | null {
  const parts: string[] = [];
  const typeField = TYPE_FIELDS.find((field) => !isBlank(entry[field]));
  if (typeField) parts.push(words(entry[typeField]));

  const ageStart = entry["age_start"];
  const ageEnd = entry["age_end"];
  if (!isBlank(ageStart) || !isBlank(ageEnd)) {
    parts.push(`ages ${ageStart ?? 0}–${ageEnd ?? "17"}`);
  }
  if (entry["extra_bed"] === true) parts.push("extra bed");
  if (!isBlank(entry["amount"])) parts.push(`up to ${entry["amount"]}`);
  if (!isBlank(entry["availability"])) parts.push(words(entry["availability"]).toLowerCase());
  if (!isBlank(entry["payment_type"])) {
    parts.push(`payable by ${words(entry["payment_type"]).toLowerCase()}`);
  }
  if (entry["work_area"] === true) parts.push("in work areas");

  const inclusion = inclusionText(entry["inclusion"]);
  if (inclusion) parts.push(inclusion);
  const price = priceText(entry);
  if (price) parts.push(price);

  const text = parts.filter(Boolean).join(", ");
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : null;
}

function describeSection(key: string, value: unknown): string[] {
  if (key === "visa") {
    const support = (value as Entry | null)?.["visa_support"];
    if (support === "support_enable") return ["The hotel can provide visa support documents"];
    if (support === "support_disable") return ["The hotel does not provide visa support"];
    return [];
  }
  if (key === "no_show") {
    const entry = (value ?? {}) as Entry;
    const parts = [
      isBlank(entry["availability"]) ? "" : words(entry["availability"]),
      isBlank(entry["time"]) ? "" : `after ${String(entry["time"])}`,
      isBlank(entry["day_period"]) ? "" : words(entry["day_period"]).toLowerCase(),
    ].filter(Boolean);
    return parts.length ? [parts.join(" ")] : [];
  }
  const entries = Array.isArray(value) ? value : value && typeof value === "object" ? [value] : [];
  return entries
    .map((entry) => describeEntry(entry as Entry))
    .filter((line): line is string => Boolean(line));
}

export function stripHtml(value: string): string {
  return value
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|div)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function formatHotelMetapolicy(struct: unknown, extraInfo: unknown): HotelPolicySection[] {
  const sections: HotelPolicySection[] = [];
  if (struct && typeof struct === "object") {
    for (const [key, value] of Object.entries(struct as Entry)) {
      const items = describeSection(key, value);
      if (items.length) sections.push({ title: SECTION_TITLES[key] ?? words(key), items });
    }
  }
  const extra = typeof extraInfo === "string" ? stripHtml(extraInfo) : "";
  if (extra) sections.push({ title: "Important information", items: [extra] });
  return sections;
}
