const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/** Generates a request reference such as AF-20260731-AB12CD. */
export function generateRequestReference(date = new Date()): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");

  let suffix = "";
  const cryptoObj = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  if (cryptoObj?.getRandomValues) {
    const bytes = new Uint8Array(6);
    cryptoObj.getRandomValues(bytes);
    for (const byte of bytes) suffix += ALPHABET[byte % ALPHABET.length];
  } else {
    for (let i = 0; i < 6; i += 1) {
      suffix += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    }
  }

  return `AF-${yyyy}${mm}${dd}-${suffix}`;
}
