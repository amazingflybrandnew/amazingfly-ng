import { useState } from "react";

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

  return (
    <section className="rounded-3xl border border-[#1268d8]/10 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-extrabold text-[#123c73]">
        Recent Customer Successes
      </h1>

      <p className="mt-2 text-sm text-[#5b7189]">
        Upload anonymized travel documents and receipts for the homepage showcase.
      </p>

      <div className="mt-6 grid gap-4">
        <label className="text-sm font-semibold text-[#123c73]">
          Image
          <input type="file" accept="image/png,image/jpeg,image/webp" className="mt-2 block" />
        </label>

        <input
          className="rounded-xl border p-3"
          placeholder="Service title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />

        <textarea
          className="rounded-xl border p-3"
          placeholder="Description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />

        <input
          type="number"
          className="rounded-xl border p-3"
          value={form.display_order}
          onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) })}
        />

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
          />
          Publish on homepage
        </label>

        <p className="rounded-xl bg-[#fff7ef] p-3 text-xs text-[#7a5b35]">
          Remove names, passport numbers, booking references, QR codes and payment details before publishing.
        </p>

        <button className="rounded-xl bg-[#0756c7] px-5 py-3 font-bold text-white">
          Save Customer Success
        </button>
      </div>
    </section>
  );
}
