import { describe, expect, test } from "bun:test";
import {
  POLICE_CERTIFICATE_DIASPORA_PRICE_NGN,
  POLICE_CERTIFICATE_NIGERIA_PRICE_NGN,
  calculateProofOfFundsFee,
  proofOfFundsRate,
} from "./service-pricing";

describe("service pricing", () => {
  test("keeps police certificate prices at the approved amounts", () => {
    expect(POLICE_CERTIFICATE_NIGERIA_PRICE_NGN).toBe(50_000);
    expect(POLICE_CERTIFICATE_DIASPORA_PRICE_NGN).toBe(145_000);
  });

  test("matches proof-of-funds banks without case sensitivity", () => {
    expect(proofOfFundsRate("gtbank")).toBe(4.5);
    expect(proofOfFundsRate(" GLOBUS ")).toBe(3.5);
    expect(proofOfFundsRate("Unknown Bank")).toBeNull();
  });

  test("calculates proof-of-funds fees and rejects invalid amounts", () => {
    expect(calculateProofOfFundsFee(1_000_000, "Zenith")).toEqual({
      bank: "Zenith",
      rate: 4.5,
      fee: 45_000,
    });
    expect(calculateProofOfFundsFee(0, "Zenith")).toBeNull();
  });
});
