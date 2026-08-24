import { describe, expect, test } from "bun:test";
import {
  formatMoney,
  normalizePaymentStatus,
  paymentStatusLabel,
} from "./payment-status";

describe("payment status helpers", () => {
  test("normalizes current and legacy payment states", () => {
    expect(normalizePaymentStatus("payment_received")).toBe("payment_received");
    expect(normalizePaymentStatus("paid")).toBe("payment_received");
    expect(normalizePaymentStatus("failed")).toBe("payment_failed");
    expect(normalizePaymentStatus("unknown")).toBe("pending_payment");
  });

  test("uses consistent customer-facing labels", () => {
    expect(paymentStatusLabel("successful")).toBe("Payment Received");
    expect(paymentStatusLabel("refund_requested")).toBe("Refund Requested");
  });

  test("formats confirmed and unconfirmed amounts safely", () => {
    expect(formatMoney(null)).toBe("To be confirmed");
    expect(formatMoney(50_000, "NGN")).toContain("50,000");
  });
});
