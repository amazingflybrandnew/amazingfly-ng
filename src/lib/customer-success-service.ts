import { supabase } from "./supabase";
import { CUSTOMER_SUCCESS_BUCKET, createCustomerSuccessFileName, validateCustomerSuccessImage } from "./customer-success-upload";

export async function uploadCustomerSuccessImage(file: File) {
  validateCustomerSuccessImage(file);

  const fileName = createCustomerSuccessFileName(file);

  const { error } = await supabase.storage
    .from(CUSTOMER_SUCCESS_BUCKET)
    .upload(fileName, file);

  if (error) throw error;

  const { data } = supabase.storage
    .from(CUSTOMER_SUCCESS_BUCKET)
    .getPublicUrl(fileName);

  return data.publicUrl;
}

export async function createCustomerSuccessRecord(data: {
  title: string;
  description?: string;
  image_url: string;
  display_order?: number;
  is_active?: boolean;
}) {
  const { data: record, error } = await supabase
    .from("customer_successes")
    .insert({
      ...data,
      display_order: data.display_order ?? 0,
      is_active: data.is_active ?? true,
    })
    .select()
    .single();

  if (error) throw error;
  return record;
}

export async function getCustomerSuccessRecords() {
  const { data, error } = await supabase
    .from("customer_successes")
    .select("*")
    .eq("is_active", true)
    .order("display_order");

  if (error) throw error;
  return data ?? [];
}

export async function deleteCustomerSuccessRecord(id: string) {
  const { error } = await supabase
    .from("customer_successes")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
