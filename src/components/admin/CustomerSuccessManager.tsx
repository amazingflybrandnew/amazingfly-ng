import { useState } from "react";
import { createCustomerSuccessRecord } from "@/lib/customer-success-service";

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
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!form.title.trim() || !form.description.trim()) {
      setMessage("Please provide a title and customer story.");
      return;
    }

    try {
      setSaving(true);
      await createCustomerSuccessRecord({
        ...form,
        title: form.title.trim(),
        description: form.description.trim(),
        image_url: "",
      });

      setMessage("Customer success published successfully.");
      setForm(initialForm);
    } catch {
      setMessage("Unable to save customer success.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-3xl border border-[#1268d8]/10 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-extrabold text-[#123c73]">Recent Customer Successes</h1>
      <p className="mt-2 text-sm text-[#5b7189]">Publish verified, anonymized customer stories for the homepage showcase.</p>

      <div className="mt-6 grid gap-4">
        <input className="rounded-xl border p-3" placeholder="Service title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />

        <textarea className="rounded-xl border p-3" placeholder="Anonymized customer story" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />

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
