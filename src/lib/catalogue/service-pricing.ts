export const PROOF_OF_FUNDS_BANK_RATES = {
  UBA: 4.5,
  Union: 4.5,
  Zenith: 4.5,
  GTBank: 4.5,
  Access: 4.5,
  "First Bank": 4.5,
  Ecobank: 4.5,
  Fidelity: 4.5,
  Globus: 3.5,
  Parallex: 3.5,
} as const;

export type ProofOfFundsBank = keyof typeof PROOF_OF_FUNDS_BANK_RATES;

export const PROOF_OF_FUNDS_BANKS = Object.keys(
  PROOF_OF_FUNDS_BANK_RATES,
) as ProofOfFundsBank[];

export const YELLOW_FEVER_CARD_PRICE_NGN = 25_000;

export function proofOfFundsRate(bank: string | null | undefined): number | null {
  if (!bank) return null;
  const matched = PROOF_OF_FUNDS_BANKS.find(
    (candidate) => candidate.toLowerCase() === bank.trim().toLowerCase(),
  );
  return matched ? PROOF_OF_FUNDS_BANK_RATES[matched] : null;
}

export function calculateProofOfFundsFee(
  requestedAmount: number,
  bank: string,
): { bank: ProofOfFundsBank; rate: number; fee: number } | null {
  if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) return null;
  const matched = PROOF_OF_FUNDS_BANKS.find(
    (candidate) => candidate.toLowerCase() === bank.trim().toLowerCase(),
  );
  if (!matched) return null;

  const rate = PROOF_OF_FUNDS_BANK_RATES[matched];
  const fee = Math.round(requestedAmount * (rate / 100) * 100) / 100;
  return { bank: matched, rate, fee };
}
