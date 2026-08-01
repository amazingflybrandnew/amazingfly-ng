import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, FileUp, Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { generateRequestReference } from "@/lib/request-reference";
import {
  ACCEPTED_UPLOAD_TYPES,
  CONTACT_METHODS,
  COUNTRIES,
  DOCUMENT_TYPES,
  HERO_SLUG_DEFAULTS,
  MAX_UPLOAD_BYTES,
  SERVICE_CATALOG,
  TRAVEL_PURPOSES,
  findServiceOption,
} from "@/lib/travel-options";
import {
  createDocumentUploadUrl,
  submitTravelRequest,
} from "@/lib/travel-request.functions";

const STEPS = [
  "Travel Details",
  "Personal Information",
  "Passport Information",
  "Document Upload",
  "Review & Submit",
] as const;

type UploadedDoc = {
  id: string;
  documentType: string;
  fileName: string;
  fileSize: number;
  path: string;
  progress: number;
  status: "uploading" | "done" | "error";
  error?: string;
};

type FormState = {
  serviceType: string;
  originCountry: string;
  destinationCountry: string;
  travelPurpose: string;
  travelDate: string;
  returnDate: string;
  travellerCount: string;
  notes: string;
  fullName: string;
  email: string;
  phone: string;
  whatsapp: string;
  whatsappSameAsPhone: boolean;
  countryOfResidence: string;
  nationality: string;
  preferredContact: string;
  passportNumber: string;
  passportCountry: string;
  dateOfBirth: string;
  passportIssueDate: string;
  passportExpiryDate: string;
  confirmAccurate: boolean;
};

const EMPTY: FormState = {
  serviceType: "",
  originCountry: "",
  destinationCountry: "",
  travelPurpose: "",
  travelDate: "",
  returnDate: "",
  travellerCount: "1",
  notes: "",
  fullName: "",
  email: "",
  phone: "",
  whatsapp: "",
  whatsappSameAsPhone: false,
  countryOfResidence: "",
  nationality: "",
  preferredContact: "whatsapp",
  passportNumber: "",
  passportCountry: "",
  dateOfBirth: "",
  passportIssueDate: "",
  passportExpiryDate: "",
  confirmAccurate: false,
};

const selectClass =
  "flex h-11 w-full appearance-none rounded-xl border border-input bg-background/80 px-3 py-2 text-sm text-foreground outline-none transition focus:border-sky/60 focus:ring-4 focus:ring-sky/15 disabled:opacity-60";

export function RequestWizard({
  initialService,
  initialFrom,
  initialTo,
}: {
  initialService?: string | undefined;
  initialFrom?: string | undefined;
  initialTo?: string | undefined;
}) {
  const getUploadUrl = useServerFn(createDocumentUploadUrl);
  const sendRequest = useServerFn(submitTravelRequest);

  const [reference] = useState(() => generateRequestReference());
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [docs, setDocs] = useState<UploadedDoc[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  // Carry the homepage hero selections into step 1.
  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      originCountry: prev.originCountry || initialFrom || "",
      destinationCountry: prev.destinationCountry || initialTo || "",
      nationality: prev.nationality || initialFrom || "",
      countryOfResidence: prev.countryOfResidence || initialFrom || "",
      passportCountry: prev.passportCountry || initialFrom || "",
      serviceType:
        prev.serviceType ||
        (initialService ? (HERO_SLUG_DEFAULTS[initialService] ?? "") : ""),
    }));
  }, [initialFrom, initialTo, initialService]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const serviceOption = useMemo(() => findServiceOption(form.serviceType), [form.serviceType]);

  function validateStep(index: number): boolean {
    const next: Record<string, string> = {};
    if (index === 0) {
      if (!form.serviceType) next["serviceType"] = "Please choose the service you need.";
      if (!form.originCountry) next["originCountry"] = "Please select where you are travelling from.";
      if (!form.destinationCountry) next["destinationCountry"] = "Please select your destination.";
      if (!form.travelDate) next["travelDate"] = "Please choose your intended travel date.";
      if (Number(form.travellerCount) < 1) next["travellerCount"] = "At least one traveller.";
    }
    if (index === 1) {
      if (!form.fullName.trim()) next["fullName"] = "Please enter your full name.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
        next["email"] = "Please enter a valid email address.";
      if (!form.phone.trim()) next["phone"] = "Please enter your phone number.";
      if (!form.countryOfResidence) next["countryOfResidence"] = "Please select your country of residence.";
      if (!form.nationality) next["nationality"] = "Please select your nationality.";
    }
    if (index === 4 && !form.confirmAccurate) {
      next["confirmAccurate"] = "Please confirm that your information is accurate.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function goTo(index: number) {
    setStep(index);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleNext() {
    if (!validateStep(step)) return;
    goTo(Math.min(step + 1, STEPS.length - 1));
  }

  async function handleFiles(documentType: string, fileList: FileList | null) {
    if (!fileList) return;
    for (const file of Array.from(fileList)) {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      if (file.size > MAX_UPLOAD_BYTES) {
        setDocs((prev) => [
          ...prev,
          {
            id,
            documentType,
            fileName: file.name,
            fileSize: file.size,
            path: "",
            progress: 0,
            status: "error",
            error: "File is larger than 10MB.",
          },
        ]);
        continue;
      }
      setDocs((prev) => [
        ...prev,
        {
          id,
          documentType,
          fileName: file.name,
          fileSize: file.size,
          path: "",
          progress: 0,
          status: "uploading",
        },
      ]);

      try {
        const signed = await getUploadUrl({
          data: {
            request_reference: reference,
            document_type: documentType,
            file_name: file.name,
            file_size: file.size,
          },
        });
        if (!signed.ok) throw new Error(signed.message);

        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("PUT", signed.uploadUrl, true);
          xhr.setRequestHeader("content-type", file.type || "application/octet-stream");
          xhr.upload.onprogress = (event) => {
            if (!event.lengthComputable) return;
            const progress = Math.round((event.loaded / event.total) * 100);
            setDocs((prev) => prev.map((d) => (d.id === id ? { ...d, progress } : d)));
          };
          xhr.onload = () =>
            xhr.status >= 200 && xhr.status < 300
              ? resolve()
              : reject(new Error(`Upload failed (${xhr.status})`));
          xhr.onerror = () => reject(new Error("Upload failed."));
          xhr.send(file);
        });

        setDocs((prev) =>
          prev.map((d) =>
            d.id === id ? { ...d, progress: 100, status: "done", path: signed.path } : d,
          ),
        );
      } catch (error) {
        setDocs((prev) =>
          prev.map((d) =>
            d.id === id
              ? {
                  ...d,
                  status: "error",
                  error: error instanceof Error ? error.message : "Upload failed.",
                }
              : d,
          ),
        );
      }
    }
  }

  async function handleSubmit() {
    if (!validateStep(4)) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      const result = await sendRequest({
        data: {
          request_reference: reference,
          service_type: serviceOption?.label ?? form.serviceType,
          service_slug: serviceOption?.serviceSlug ?? "visa-assistance",
          origin_country: form.originCountry,
          destination_country: form.destinationCountry,
          travel_purpose: form.travelPurpose || null,
          travel_date: form.travelDate || null,
          return_date: form.returnDate || null,
          traveller_count: Number(form.travellerCount) || 1,
          request_details:
            form.notes.trim() ||
            `${serviceOption?.label ?? "Travel request"} from ${form.originCountry} to ${form.destinationCountry}.`,
          full_name: form.fullName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          whatsapp: form.whatsappSameAsPhone ? form.phone.trim() : form.whatsapp.trim() || null,
          country_of_residence: form.countryOfResidence || null,
          nationality: form.nationality || null,
          preferred_contact: form.preferredContact as "whatsapp" | "phone" | "email",
          passport_number: form.passportNumber.trim() || null,
          passport_country: form.passportCountry || null,
          date_of_birth: form.dateOfBirth || null,
          passport_issue_date: form.passportIssueDate || null,
          passport_expiry_date: form.passportExpiryDate || null,
          documents: docs
            .filter((d) => d.status === "done")
            .map((d) => ({
              document_type: d.documentType,
              file_url: d.path,
              file_name: d.fileName,
              file_size: d.fileSize,
            })),
          consent_to_contact: true as const,
        },
      });

      if (!result.ok) {
        setSubmitError(
          "We could not submit your request at the moment. Please try again, or contact Amazingfly Travels directly.",
        );
        return;
      }
      setSubmittedRef(result.reference);
    } catch {
      setSubmitError(
        "We could not submit your request at the moment. Please check your connection and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (submittedRef) return <Confirmation reference={submittedRef} />;

  return (
    <div ref={topRef} className="mx-auto max-w-3xl">
      <ProgressBar step={step} />

      <div className="glass-card mt-6 rounded-3xl p-6 md:p-10">
        <div key={step} className="animate-in fade-in slide-in-from-right-4 duration-300">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-coral">
            Step {step + 1} of {STEPS.length}
          </p>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-navy md:text-3xl">
            {STEPS[step]}
          </h2>

          <div className="mt-8 grid gap-6">
            {step === 0 ? (
              <>
                <Field label="Service required" required error={errors["serviceType"]}>
                  <select
                    className={selectClass}
                    value={form.serviceType}
                    onChange={(e) => update("serviceType", e.target.value)}
                  >
                    <option value="">Select a service</option>
                    {SERVICE_CATALOG.map((group) => (
                      <optgroup key={group.category} label={group.category}>
                        {group.options.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </Field>

                <div className="grid gap-6 md:grid-cols-2">
                  <Field label="Travelling from" required error={errors["originCountry"]}>
                    <CountrySelect
                      value={form.originCountry}
                      onChange={(v) => update("originCountry", v)}
                    />
                  </Field>
                  <Field label="Destination" required error={errors["destinationCountry"]}>
                    <CountrySelect
                      value={form.destinationCountry}
                      onChange={(v) => update("destinationCountry", v)}
                    />
                  </Field>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <Field label="Travel purpose">
                    <select
                      className={selectClass}
                      value={form.travelPurpose}
                      onChange={(e) => update("travelPurpose", e.target.value)}
                    >
                      <option value="">Select purpose</option>
                      {TRAVEL_PURPOSES.map((purpose) => (
                        <option key={purpose} value={purpose}>
                          {purpose}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Number of travellers" error={errors["travellerCount"]}>
                    <Input
                      type="number"
                      min={1}
                      max={30}
                      value={form.travellerCount}
                      onChange={(e) => update("travellerCount", e.target.value)}
                    />
                  </Field>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <Field label="Intended travel date" required error={errors["travelDate"]}>
                    <Input
                      type="date"
                      value={form.travelDate}
                      onChange={(e) => update("travelDate", e.target.value)}
                    />
                  </Field>
                  <Field label="Return date">
                    <Input
                      type="date"
                      value={form.returnDate}
                      onChange={(e) => update("returnDate", e.target.value)}
                    />
                  </Field>
                </div>

                <Field label="Additional notes">
                  <Textarea
                    rows={4}
                    value={form.notes}
                    placeholder="Tell us anything else that helps us prepare your request."
                    onChange={(e) => update("notes", e.target.value)}
                  />
                </Field>
              </>
            ) : null}

            {step === 1 ? (
              <>
                <Field label="Full name" required error={errors["fullName"]}>
                  <Input
                    value={form.fullName}
                    autoComplete="name"
                    onChange={(e) => update("fullName", e.target.value)}
                  />
                </Field>
                <div className="grid gap-6 md:grid-cols-2">
                  <Field label="Email address" required error={errors["email"]}>
                    <Input
                      type="email"
                      value={form.email}
                      autoComplete="email"
                      onChange={(e) => update("email", e.target.value)}
                    />
                  </Field>
                  <Field label="Phone number" required error={errors["phone"]}>
                    <Input
                      type="tel"
                      value={form.phone}
                      autoComplete="tel"
                      onChange={(e) => update("phone", e.target.value)}
                    />
                  </Field>
                </div>
                <Field label="WhatsApp number">
                  <Input
                    type="tel"
                    value={form.whatsappSameAsPhone ? form.phone : form.whatsapp}
                    disabled={form.whatsappSameAsPhone}
                    onChange={(e) => update("whatsapp", e.target.value)}
                  />
                  <label className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                    <Checkbox
                      checked={form.whatsappSameAsPhone}
                      onCheckedChange={(checked) => update("whatsappSameAsPhone", checked === true)}
                    />
                    Same as my phone number
                  </label>
                </Field>
                <div className="grid gap-6 md:grid-cols-2">
                  <Field label="Country of residence" required error={errors["countryOfResidence"]}>
                    <CountrySelect
                      value={form.countryOfResidence}
                      onChange={(v) => update("countryOfResidence", v)}
                    />
                  </Field>
                  <Field label="Nationality" required error={errors["nationality"]}>
                    <CountrySelect
                      value={form.nationality}
                      onChange={(v) => update("nationality", v)}
                    />
                  </Field>
                </div>
                <Field label="Preferred contact method" required>
                  <RadioGroup
                    className="flex flex-wrap gap-4"
                    value={form.preferredContact}
                    onValueChange={(value) => update("preferredContact", value)}
                  >
                    {CONTACT_METHODS.map((method) => (
                      <label key={method.value} className="flex items-center gap-2 text-sm text-navy">
                        <RadioGroupItem value={method.value} />
                        {method.label}
                      </label>
                    ))}
                  </RadioGroup>
                </Field>
              </>
            ) : null}

            {step === 2 ? (
              <>
                <p className="rounded-xl border border-border/60 bg-white/60 p-4 text-sm text-muted-foreground">
                  Passport details are optional at this stage — you can add them later if you do not
                  have them to hand.
                </p>
                <div className="grid gap-6 md:grid-cols-2">
                  <Field label="Passport number">
                    <Input
                      value={form.passportNumber}
                      onChange={(e) => update("passportNumber", e.target.value)}
                    />
                  </Field>
                  <Field label="Passport country">
                    <CountrySelect
                      value={form.passportCountry}
                      onChange={(v) => update("passportCountry", v)}
                    />
                  </Field>
                </div>
                <div className="grid gap-6 md:grid-cols-3">
                  <Field label="Date of birth">
                    <Input
                      type="date"
                      value={form.dateOfBirth}
                      onChange={(e) => update("dateOfBirth", e.target.value)}
                    />
                  </Field>
                  <Field label="Passport issue date">
                    <Input
                      type="date"
                      value={form.passportIssueDate}
                      onChange={(e) => update("passportIssueDate", e.target.value)}
                    />
                  </Field>
                  <Field label="Passport expiry date">
                    <Input
                      type="date"
                      value={form.passportExpiryDate}
                      onChange={(e) => update("passportExpiryDate", e.target.value)}
                    />
                  </Field>
                </div>
                <UploadTile
                  documentType="passport_copy"
                  label="Upload passport bio page"
                  hint="PDF or image, up to 10MB"
                  onFiles={handleFiles}
                />
                <DocList docs={docs.filter((d) => d.documentType === "passport_copy")} onRemove={(id) => setDocs((p) => p.filter((d) => d.id !== id))} />
              </>
            ) : null}

            {step === 3 ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Files are uploaded to secure, private storage. Please do not upload card or payment
                  details.
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  {DOCUMENT_TYPES.map((type) => (
                    <UploadTile
                      key={type.value}
                      documentType={type.value}
                      label={type.label}
                      hint={type.hint}
                      onFiles={handleFiles}
                    />
                  ))}
                </div>
                <DocList docs={docs} onRemove={(id) => setDocs((p) => p.filter((d) => d.id !== id))} />
              </>
            ) : null}

            {step === 4 ? (
              <>
                <SummaryBlock
                  title="Travel information"
                  rows={[
                    ["Service", serviceOption?.label ?? "—"],
                    ["Travelling from", form.originCountry],
                    ["Destination", form.destinationCountry],
                    ["Purpose", form.travelPurpose || "—"],
                    ["Travel date", form.travelDate || "—"],
                    ["Return date", form.returnDate || "—"],
                    ["Travellers", form.travellerCount],
                    ["Notes", form.notes || "—"],
                  ]}
                  onEdit={() => goTo(0)}
                />
                <SummaryBlock
                  title="Customer information"
                  rows={[
                    ["Full name", form.fullName],
                    ["Email", form.email],
                    ["Phone", form.phone],
                    ["WhatsApp", form.whatsappSameAsPhone ? form.phone : form.whatsapp || "—"],
                    ["Country of residence", form.countryOfResidence],
                    ["Nationality", form.nationality],
                    ["Preferred contact", form.preferredContact],
                  ]}
                  onEdit={() => goTo(1)}
                />
                <SummaryBlock
                  title="Passport information"
                  rows={[
                    ["Passport number", form.passportNumber || "—"],
                    ["Passport country", form.passportCountry || "—"],
                    ["Date of birth", form.dateOfBirth || "—"],
                    ["Issue date", form.passportIssueDate || "—"],
                    ["Expiry date", form.passportExpiryDate || "—"],
                  ]}
                  onEdit={() => goTo(2)}
                />
                <SummaryBlock
                  title="Uploaded documents"
                  rows={
                    docs.filter((d) => d.status === "done").length
                      ? docs
                          .filter((d) => d.status === "done")
                          .map((d) => [d.documentType.replace(/_/g, " "), d.fileName] as [string, string])
                      : [["Documents", "None uploaded"]]
                  }
                  onEdit={() => goTo(3)}
                />

                <div>
                  <label className="flex items-start gap-3 text-sm leading-relaxed text-muted-foreground">
                    <Checkbox
                      className="mt-0.5"
                      checked={form.confirmAccurate}
                      onCheckedChange={(checked) => update("confirmAccurate", checked === true)}
                    />
                    I confirm that the information provided is accurate, and I consent to Amazingfly
                    Travels contacting me about this request.
                  </label>
                  {errors["confirmAccurate"] ? (
                    <p className="mt-2 text-sm font-medium text-destructive">
                      {errors["confirmAccurate"]}
                    </p>
                  ) : null}
                </div>

                {submitError ? (
                  <div
                    role="alert"
                    className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm font-medium text-destructive"
                  >
                    {submitError}
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-6">
          <Button
            type="button"
            variant="ghost"
            size="lg"
            disabled={step === 0 || submitting}
            onClick={() => goTo(step - 1)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>

          {step < STEPS.length - 1 ? (
            <Button type="button" size="lg" onClick={handleNext}>
              Continue <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button type="button" size="lg" disabled={submitting} onClick={handleSubmit}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…
                </>
              ) : (
                "Submit Travel Request"
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function ProgressBar({ step }: { step: number }) {
  const percent = ((step + 1) / STEPS.length) * 100;
  return (
    <div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/70">
        <div
          className="h-full rounded-full bg-gradient-to-r from-sky via-lavender to-coral transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
      <ol className="mt-4 hidden justify-between gap-2 md:flex">
        {STEPS.map((label, index) => (
          <li
            key={label}
            className={`flex items-center gap-2 text-xs font-semibold ${
              index <= step ? "text-navy" : "text-muted-foreground"
            }`}
          >
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] ${
                index < step
                  ? "bg-coral text-white"
                  : index === step
                    ? "bg-navy text-white"
                    : "bg-white/80 text-muted-foreground"
              }`}
            >
              {index < step ? <Check className="h-3.5 w-3.5" /> : index + 1}
            </span>
            {label}
          </li>
        ))}
      </ol>
    </div>
  );
}

function CountrySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select className={selectClass} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Select country</option>
      {COUNTRIES.map((country) => (
        <option key={country} value={country}>
          {country}
        </option>
      ))}
    </select>
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean | undefined;
  error?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="text-sm font-semibold text-navy">
        {label}
        {required ? <span className="ml-1 text-coral">*</span> : null}
      </Label>
      <div className="mt-2">{children}</div>
      {error ? <p className="mt-2 text-sm font-medium text-destructive">{error}</p> : null}
    </div>
  );
}

function UploadTile({
  documentType,
  label,
  hint,
  onFiles,
}: {
  documentType: string;
  label: string;
  hint?: string;
  onFiles: (documentType: string, files: FileList | null) => void;
}) {
  return (
    <label className="group flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-border bg-white/60 p-4 transition hover:border-sky/60 hover:bg-white/85">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky/15 text-navy">
        <FileUp className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-navy">{label}</span>
        {hint ? <span className="block text-xs text-muted-foreground">{hint}</span> : null}
      </span>
      <input
        type="file"
        multiple
        className="sr-only"
        accept={ACCEPTED_UPLOAD_TYPES.join(",")}
        onChange={(e) => {
          onFiles(documentType, e.target.files);
          e.target.value = "";
        }}
      />
    </label>
  );
}

function DocList({ docs, onRemove }: { docs: UploadedDoc[]; onRemove: (id: string) => void }) {
  if (!docs.length) return null;
  return (
    <ul className="grid gap-3">
      {docs.map((doc) => (
        <li key={doc.id} className="rounded-2xl border border-border/70 bg-white/75 p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-navy">{doc.fileName}</p>
              <p className="text-xs text-muted-foreground">
                {doc.documentType.replace(/_/g, " ")} · {(doc.fileSize / 1024 / 1024).toFixed(2)} MB
                {doc.status === "error" ? ` · ${doc.error}` : ""}
              </p>
            </div>
            <button
              type="button"
              aria-label={`Remove ${doc.fileName}`}
              className="rounded-lg p-2 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
              onClick={() => onRemove(doc.id)}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                doc.status === "error" ? "bg-destructive" : "bg-coral"
              }`}
              style={{ width: `${doc.status === "error" ? 100 : doc.progress}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function SummaryBlock({
  title,
  rows,
  onEdit,
}: {
  title: string;
  rows: Array<[string, string]>;
  onEdit: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-white/70 p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-navy">{title}</h3>
        <button
          type="button"
          onClick={onEdit}
          className="text-xs font-semibold text-coral underline-offset-4 hover:underline"
        >
          Edit
        </button>
      </div>
      <dl className="mt-4 grid gap-2 text-sm md:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={`${label}-${value}`} className="flex gap-2">
            <dt className="shrink-0 capitalize text-muted-foreground">{label}:</dt>
            <dd className="min-w-0 break-words font-medium text-navy">{value || "—"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Confirmation({ reference }: { reference: string }) {
  return (
    <div className="glass-card mx-auto max-w-2xl rounded-3xl p-8 md:p-12">
      <CheckCircle2 className="h-12 w-12 text-coral" aria-hidden="true" />
      <h2 className="mt-6 text-2xl font-extrabold tracking-tight text-navy md:text-3xl">
        Your travel request has been received.
      </h2>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground">
        Our travel specialists will review your request and contact you shortly through your
        preferred contact method.
      </p>
      <div className="mt-8 rounded-2xl border border-border/70 bg-white/70 p-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-coral">
          Request reference number
        </p>
        <p className="mt-2 text-2xl font-extrabold tracking-wide text-navy md:text-3xl">
          {reference}
        </p>
      </div>
      <p className="mt-6 text-sm font-semibold text-navy">
        Please save your reference for future communication.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild size="lg">
          <Link to="/track" search={{ reference }}>
            Track Request
          </Link>
        </Button>
        <Button asChild size="lg" variant="secondary">
          <Link to="/">Return Home</Link>
        </Button>
      </div>
    </div>
  );
}
