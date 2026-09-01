import { useState } from "react";
import { createCustomerSuccessRecord, uploadCustomerSuccessImage } from "@/lib/customer-success-service";

type FormState = {
  title: string;
  description: string;
  display_order: number;
  is_active: boolean;
};

const initialForm: FormState = {
  title: "",
  description: "",
  display_order: 0,
  is_active: true,
};

export function CustomerSuccessManager() {
  const [form, setForm] = useState(initialForm);
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!file || !form.title) {
      setMessage("Please provide an image and service title.");
      return;
    }

    try {
      setSaving(true);
      const imageUrl = await uploadCustomerSuccessImage(file);

      await createCustomerSuccessRecord({
        ...form,
        image_url: imageUrl,
      });

      setMessage("Customer success published successfully.");
      setForm(initialForm);
      setFile(null);
    } catch {
      setMessage("Unable to save customer success.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-3xl border border-[#1268d8]/10 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-extrabold text-[#123c73]">Recent Customer Successes</h1>
      <p className="mt-2 text-sm text-[#5b7189]">Upload anonymized travel documents and receipts for the homepage showcase.</p>

      <div className="mt-6 grid gap-4">
        <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />

        <input className="rounded-xl border p-3" placeholder="Service title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />

        <textarea className="rounded-xl border p-3" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />

        <input type="number" className="rounded-xl border p-3" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) })} />

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
          Publish on homepage
        </label>

        <button disabled={saving} onClick={handleSave} className="rounded-xl bg-[#0756c7] px-5 py-3 font-bold text-white">
          {saving ? "Saving..." : "Save Customer Success"}
        </button>

        {message && <p className="text-sm text-[#123c73]">{message}</p>}
      </div>
    </section>
  );
}
