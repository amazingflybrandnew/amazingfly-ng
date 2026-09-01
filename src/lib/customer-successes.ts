export type CustomerSuccess = {
  id: string;
  title: string;
  description?: string | null;
  image_url: string;
  display_order: number;
};

export async function getCustomerSuccesses(): Promise<CustomerSuccess[]> {
  return [];
}
