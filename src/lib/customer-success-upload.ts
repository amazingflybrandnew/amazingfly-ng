export const CUSTOMER_SUCCESS_BUCKET = "customer-successes";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export function validateCustomerSuccessImage(file: File) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Only JPG, PNG and WEBP images are allowed.");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error("Image size must be below 5MB.");
  }

  return true;
}

export function createCustomerSuccessFileName(file: File) {
  const extension = file.name.split(".").pop() || "jpg";
  return `${crypto.randomUUID()}.${extension}`;
}
