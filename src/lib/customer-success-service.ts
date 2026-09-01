import { CUSTOMER_SUCCESS_BUCKET, createCustomerSuccessFileName, validateCustomerSuccessImage } from "./customer-success-upload";

export async function uploadCustomerSuccessImage(file: File) {
  validateCustomerSuccessImage(file);

  const fileName = createCustomerSuccessFileName(file);

  return {
    bucket: CUSTOMER_SUCCESS_BUCKET,
    path: fileName,
  };
}

export async function createCustomerSuccessRecord(data: {
  title: string;
  description?: string;
  image_url: string;
  display_order?: number;
  is_active?: boolean;
}) {
  return {
    ...data,
    display_order: data.display_order ?? 0,
    is_active: data.is_active ?? true,
  };
}

export async function deleteCustomerSuccessRecord(id: string) {
  return { id };
}
