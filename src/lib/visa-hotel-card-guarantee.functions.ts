import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const guaranteeInput = z
  .object({
    request_id: z.string().uuid(),
    card_number: z
      .string()
      .trim()
      .min(13)
      .max(24)
      .regex(/^[0-9 -]+$/, "Enter a valid card number."),
    card_holder: z.string().trim().min(2).max(120),
    expiry_month: z.string().regex(/^(0[1-9]|1[0-2])$/),
    expiry_year: z.string().regex(/^\d{2}$/),
    cvc: z.string().trim().regex(/^\d{3}$/).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    const digits = value.card_number.replace(/\D/g, "");
    if (digits.length < 13 || digits.length > 19) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["card_number"],
        message: "Card number must contain 13 to 19 digits.",
      });
    }
  });

export const submitVisaHotelCardGuarantee = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => guaranteeInput.parse(data))
  .handler(async ({ data }): Promise<
    | { ok: true; status: string; requestId: string }
    | { ok: false; message: string }
  > => {
    const { requireUser } = await import("./auth.server");
    const { user } = await requireUser();
    const { completeVisaHotelCardGuarantee } = await import(
      "./visa-hotel-card-guarantee.server"
    );

    try {
      const result = await completeVisaHotelCardGuarantee({
        requestId: data.request_id,
        userId: user.id,
        card: {
          cardNumber: data.card_number,
          cardHolder: data.card_holder,
          expiryMonth: data.expiry_month,
          expiryYear: data.expiry_year,
          cvc: data.cvc,
        },
      });

      return {
        ok: true,
        status: result.status,
        requestId: data.request_id,
      };
    } catch (error) {
      return {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "We could not register this hotel guarantee card. Please try again.",
      };
    }
  });
