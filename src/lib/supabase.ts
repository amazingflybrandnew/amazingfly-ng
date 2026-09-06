import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://etfvjtyrsmcsawsdxqgq.supabase.co";

const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "sb_publishable_IIDrQA_BipbdMztErmCzzg_LaaWkARk";

export const supabase = createClient(supabaseUrl, supabasePublishableKey);
