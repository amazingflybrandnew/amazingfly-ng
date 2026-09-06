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
    .from("testimonials")
    .insert({
      name: data.title,
      quote: data.description ?? "",
      image_url: data.image_url,
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
    .from("testimonials")
    .select("id, name, quote, image_url, display_order")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((item) => ({
    id: item.id,
    title: item.name,
    description: item.quote,
    image_url: item.image_url ?? "",
    display_order: item.display_order ?? 0,
  }));
}

export async function deleteCustomerSuccessRecord(id: string) {
  const { error } = await supabase
    .from("testimonials")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
