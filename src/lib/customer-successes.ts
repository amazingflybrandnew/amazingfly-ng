import { supabase } from "./supabase";

export type CustomerSuccess = {
  id: string;
  title: string;
  description?: string | null;
  image_url: string;
  display_order: number;
};

export async function getCustomerSuccesses(): Promise<CustomerSuccess[]> {
  const { data, error } = await supabase
    .from("testimonials")
    .select("id, name, quote, image_url, display_order")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (error || !data) {
    console.error("Failed to load customer testimonials", error);
    return [];
  }

  return data.map((item) => ({
    id: item.id,
    title: item.name,
    description: item.quote,
    image_url: item.image_url || "",
    display_order: item.display_order || 0,
  }));
}
