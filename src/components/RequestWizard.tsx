import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useSessionQuery } from "@/components/AccountShell";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  FileUp,
  Loader2,
  Sparkles,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { generateRequestReference } from "@/lib/request-reference";
import { ACCEPTED_UPLOAD_TYPES, COUNTRIES, MAX_UPLOAD_BYTES } from "@/lib/travel-options";
import {
  HERO_SLUG_TO_CATEGORY,
  SERVICE_CATEGORIES,
  buildSections,
  findCategory,
  isCoreField,
  type DocumentRequirement,
  type Question,
  type Section,
  type ServiceCategory,
} from "@/lib/service-forms";
import { createDocumentUploadUrl, submitTravelRequest } from "@/lib/travel-request.functions";
import {
  ACTIVE_CATALOGUE,
  ITINERARY_NOTE,
  LONG_STAY_QUOTE_MESSAGE,
  PROCESSING_FAQ,
  catalogueDisplayPrice,
  needsCustomQuote,
  packageDestinations,
  packagesFor,
  type CatalogueCategory,
  type CatalogueItem,
} from "@/lib/catalogue/visa-catalogue";
import { findCategoryGroup } from "@/lib/catalogue/service-categories";
import { getPublicPackages } from "@/lib/packages.functions";
import { useQuery } from "@tanstack/react-query";

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

type Answers = Record<string, string>;

const selectClass =
  "flex h-11 w-full appearance-none rounded-xl border border-input bg-background/80 px-3 py-2 text-sm text-foreground outline-none transition focus:border-sky/60 focus:ring-4 focus:ring-sky/15 disabled:opacity-60";

const CONTACT_VALUE: Record<string, "whatsapp" | "phone" | "email"> = {
  WhatsApp: "whatsapp",
  "Phone call": "phone",
  Email: "email",
};

function isVisible(question: Question | DocumentRequirement, answers: Answers) {
  if (!question.showIf) return true;
  return question.showIf.equals.includes(answers[question.showIf.id] ?? "");
}

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
  const [categoryId, setCategoryId] = useState<string>("");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [docs, setDocs] = useState<UploadedDoc[]>([]);
  const [confirmAccurate, setConfirmAccurate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);
  const navigate = useNavigate();
  const { data: session } = useSessionQuery();
  const topRef = useRef<HTMLDivElement>(null);

  // Carry the homepage hero selections in.
  useEffect(() => {
    if (initialService) {
      const mapped = HERO_SLUG_TO_CATEGORY[initialService];
      if (mapped) setCategoryId((prev) => prev || mapped);
    }
    setAnswers((prev) => ({
      ...prev,
      ...(initialFrom && !prev["origin_country"] ? { origin_country: initialFrom } : {}),
      ...(initialFrom && !prev["country_of_residence"]
        ? { country_of_residence: initialFrom }
        : {}),
      ...(initialFrom && !prev["passport_country"] ? { passport_country: initialFrom } : {}),
      ...(initialTo && !prev["destination_country"] ? { destination_country: initialTo } : {}),
    }));
  }, [initialFrom, initialTo, initialService]);

  const category = useMemo(() => findCategory(categoryId), [categoryId]);

  // Packages come from the admin-managed catalogue; the bundled list is the
  // fallback so the wizard still works if the table is unreachable.
  const fetchPackages = useServerFn(getPublicPackages);
  const packagesQuery = useQuery({
    queryKey: ["packages", "public"],
    queryFn: () => fetchPackages(),
    staleTime: 5 * 60_000,
  });
  const packages = useMemo<CatalogueItem[]>(
    () => (packagesQuery.data && packagesQuery.data.length ? packagesQuery.data : ACTIVE_CATALOGUE),
    [packagesQuery.data],
  );

  const catalogueItem = useMemo<CatalogueItem | undefined>(() => {
    const direct = packages.find((item) => item.id === answers["catalogue_id"]);
    if (direct) return direct;
    const documentService = answers["document_service"] ?? "";
    const byDocument: Record<string, string> = {
      "Police character certificate": "police-character-certificate",
      "Proof of funds": "proof-of-funds-support",
      "Travel insurance": "travel-insurance-cover",
      "Yellow fever card": "yellow-fever-card-support",
    };
    const mapped = byDocument[documentService];
    return mapped ? packages.find((item) => item.id === mapped) : undefined;
  }, [answers, packages]);

  const requiresQuote = false;
  const sections: Section[] = useMemo(() => (category ? buildSections(category) : []), [category]);
  const documents = useMemo(
    () => (category ? category.documents.filter((d) => isVisible(d, answers)) : []),
    [category, answers],
  );

  // Fixed-price catalogue services continue into a payment step after review.
  const payableService = Boolean(
  catalogueItem && (catalogueItem.price ?? 0) > 0
);

  const stepLabels = useMemo(
    () => ["Service", ...sections.map((s) => s.title), "Documents", "Review"],
    [sections],
  );
  const progressLabels = useMemo(
    () => (payableService ? [...stepLabels, "Payment"] : stepLabels),
    [stepLabels, payableService],
  );
  const totalSteps = stepLabels.length;
  const documentsStep = sections.length + 1;
  const reviewStep = documentsStep + 1;


  const set = (id: string, value: string) => setAnswers((prev) => ({ ...prev, [id]: value }));

  function validateStep(index: number): boolean {
    const next: Record<string, string> = {};
    if (index === 0 && !categoryId) {
      next["category"] = "Please choose the service you need.";
    }
    const section = sections[index - 1];
    if (index >= 1 && index <= sections.length && section) {
      for (const question of section.questions) {
        if (!isVisible(question, answers)) continue;
        const value = (answers[question.id] ?? "").trim();
        if (question.required && !value) {
          next[question.id] = `Please provide your ${question.label.toLowerCase()}.`;
        }
        if (question.type === "email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          next[question.id] = "Please enter a valid email address.";
        }
      }
    }
    if (index === reviewStep && !confirmAccurate) {
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
    goTo(Math.min(step + 1, totalSteps - 1));
  }

  function chooseCategory(next: ServiceCategory) {
    setCategoryId(next.id);
    setErrors({});
    setDocs([]);
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
    if (!category) return;
    if (!validateStep(reviewStep)) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      const dynamicAnswers = sections
        .flatMap((section) => section.questions)
        .filter((question) => isVisible(question, answers))
        .filter((question) => !isCoreField(question.id))
        .filter((question) => question.id !== "duration_of_stay")
        .map((question) => ({
          id: question.id,
          question: question.label,
          answer: (answers[question.id] ?? "").trim(),
        }))
        .filter((entry) => entry.answer);

      const durationOfStay = (answers["duration_of_stay"] ?? "").trim();
      if (category.id === "visa" && durationOfStay) {
        dynamicAnswers.push({
          id: "duration_of_stay",
          question: "Duration of stay",
          answer: durationOfStay,
        });
      }

      const contactChoice = answers["preferred_contact"] ?? "WhatsApp";
      const result = await sendRequest({
        data: {
          request_reference: reference,
          service_type: catalogueItem?.name ?? category.name,
          service_slug: category.serviceSlug,
          service_category: category.id,
          origin_country: (answers["origin_country"] ?? "").trim(),
          destination_country: (answers["destination_country"] ?? "").trim(),
          travel_purpose: (answers["travel_purpose"] ?? "").trim() || null,
          travel_date: answers["travel_date"] || null,
          return_date: answers["return_date"] || null,
          traveller_count: Number(answers["traveller_count"]) || 1,
          request_details: `${category.name} request via Amazingfly.ng.`,
          answers: dynamicAnswers,
          full_name: (answers["full_name"] ?? "").trim(),
          email: (answers["email"] ?? "").trim(),
          phone: (answers["phone"] ?? "").trim(),
          whatsapp: (answers["whatsapp"] ?? "").trim() || null,
          country_of_residence: (answers["country_of_residence"] ?? "").trim() || null,
          nationality: (answers["origin_country"] ?? "").trim() || null,
          preferred_contact: CONTACT_VALUE[contactChoice] ?? "whatsapp",
          passport_number: (answers["passport_number"] ?? "").trim() || null,
          passport_country: (answers["passport_country"] ?? "").trim() || null,
          date_of_birth: answers["date_of_birth"] || null,
          passport_issue_date: answers["passport_issue_date"] || null,
          passport_expiry_date: answers["passport_expiry_date"] || null,
          documents: docs
            .filter((d) => d.status === "done")
            .map((d) => ({
              document_type: d.documentType,
              file_url: d.path,
              file_name: d.fileName,
              file_size: d.fileSize,
            })),
          catalogue_id: catalogueItem?.id ?? null,
          amount: catalogueItem && !requiresQuote ? catalogueItem.price : null,
          currency: "NGN",
          requires_quote: requiresQuote,
          consent_to_contact: true as const,
        },
      });

      if (!result.ok) {
        setSubmitError(
          "We could not submit your request at the moment. Please try again, or contact Amazingfly Travels directly.",
        );
        return;
      }
      // Priced services already have a pending payment transaction, so send the
      // customer straight to the payment panel instead of a dead-end screen.
      if (result.payable || payableService) {
        const target = `/requests/${result.requestId}`;
        if (session?.user) {
          void navigate({ to: "/requests/$id", params: { id: result.requestId } });
        } else {
          // The wizard is public: sign in (or create an account with the same
          // email) first, then land straight on the payment panel.
          void navigate({ to: "/auth", search: { redirect: target } });
        }
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

  if (submittedRef) return <Confirmation reference={submittedRef} quoteOnly={requiresQuote} />;

  const activeSection = step >= 1 && step <= sections.length ? sections[step - 1] : undefined;

  return (
    <div ref={topRef} className="mx-auto max-w-3xl">
      <ProgressBar labels={progressLabels} step={step} />


      <div className="glass-card mt-6 rounded-3xl p-6 md:p-10">
        <div key={`${categoryId}-${step}`} className="animate-in fade-in slide-in-from-right-4 duration-300">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-coral">
            Step {step + 1} of {totalSteps}
          </p>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-navy md:text-3xl">
            {step === 0
              ? "What do you need help with?"
              : step === documentsStep
                ? "Required Documents"
                : step === reviewStep
                  ? "Review & Submit"
                  : (activeSection?.title ?? "")}
          </h2>

          {step > 0 && category ? (
            <p className="mt-3 flex items-start gap-2 rounded-2xl border border-border/60 bg-white/60 p-4 text-sm text-muted-foreground">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-coral" aria-hidden="true" />
              <span>
                Based on your selected service (<strong className="text-navy">{category.name}</strong>
                ), we need the following information.
              </span>
            </p>
          ) : null}

          <div className="mt-8 grid gap-6">
            {step === 0 ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Choose a service and we will only ask the questions that matter for it.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {SERVICE_CATEGORIES.map((item) => {
                    const active = item.id === categoryId;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => chooseCategory(item)}
                        className={`rounded-2xl border p-5 text-left transition duration-300 hover:-translate-y-0.5 hover:shadow-lg ${
                          active
                            ? "border-coral/60 bg-white/90 shadow-lg ring-2 ring-coral/30"
                            : "border-border/70 bg-white/60 hover:border-sky/60"
                        }`}
                      >
                        <span className="flex items-center justify-between gap-3">
                          <span className="text-base font-bold text-navy">{item.name}</span>
                          {active ? <Check className="h-4 w-4 text-coral" /> : null}
                        </span>
                        <span className="mt-1.5 block text-sm leading-relaxed text-muted-foreground">
                          {item.tagline}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {errors["category"] ? (
                  <p className="text-sm font-medium text-destructive">{errors["category"]}</p>
                ) : null}
              </>
            ) : null}

            {activeSection ? (
              <>
                {activeSection.description ? (
                  <p className="text-sm text-muted-foreground">{activeSection.description}</p>
                ) : null}
                <QuestionGrid
                  questions={activeSection.questions.filter((q) => isVisible(q, answers))}
                  answers={answers}
                  errors={errors}
                  onChange={set}
                />
                {catalogueItem ? (
                  <CataloguePanel item={catalogueItem} requiresQuote={requiresQuote} />
                ) : null}
              </>
            ) : null}

            {step === documentsStep ? (
              <>
                <p className="text-sm text-muted-foreground">
                  These are the documents we need for a {category?.name.toLowerCase()}. Files are
                  uploaded to secure, private storage — never upload card or payment details.
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  {documents.map((doc) => (
                    <UploadTile
                      key={doc.value}
                      documentType={doc.value}
                      label={doc.required ? `${doc.label} *` : doc.label}
                      {...(doc.hint ? { hint: doc.hint } : {})}
                      onFiles={handleFiles}
                    />
                  ))}
                </div>
                <DocList docs={docs} onRemove={(id) => setDocs((p) => p.filter((d) => d.id !== id))} />
              </>
            ) : null}

            {step === reviewStep ? (
              <>
                <SummaryBlock
                  title="Selected service"
                  rows={[
                    ["Service", category?.name ?? "—"],
                    ...(catalogueItem
                      ? ([
                          ["Selected", catalogueItem.name],
                          [
                            "Price",
                             catalogueDisplayPrice(catalogueItem),
                          ],
                          ["Processing time", catalogueItem.processingTime],
                        ] as Array<[string, string]>)
                      : []),
                  ]}
                  onEdit={() => goTo(0)}
                />
                {sections.map((section, index) => (
                  <SummaryBlock
                    key={section.title}
                    title={section.title}
                    rows={section.questions
                      .filter((q) => isVisible(q, answers))
                      .map((q) => [q.label, answers[q.id] ?? ""] as [string, string])}
                    onEdit={() => goTo(index + 1)}
                  />
                ))}
                <SummaryBlock
                  title="Uploaded documents"
                  rows={
                    docs.filter((d) => d.status === "done").length
                      ? docs
                          .filter((d) => d.status === "done")
                          .map(
                            (d) => [d.documentType.replace(/_/g, " "), d.fileName] as [string, string],
                          )
                      : [["Documents", "None uploaded"]]
                  }
                  onEdit={() => goTo(documentsStep)}
                />

                <div>
                  <label className="flex items-start gap-3 text-sm leading-relaxed text-muted-foreground">
                    <Checkbox
                      className="mt-0.5"
                      checked={confirmAccurate}
                      onCheckedChange={(checked) => setConfirmAccurate(checked === true)}
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

          {step < totalSteps - 1 ? (
            <Button type="button" size="lg" onClick={handleNext}>
              Continue <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button type="button" size="lg" disabled={submitting} onClick={handleSubmit}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                  {payableService ? "Preparing payment…" : "Submitting…"}
                </>
              ) : payableService ? (
                <>
                  Continue to Payment <ArrowRight className="ml-2 h-4 w-4" />
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

function QuestionGrid({
  questions,
  answers,
  errors,
  onChange,
}: {
  questions: Question[];
  answers: Answers;
  errors: Record<string, string>;
  onChange: (id: string, value: string) => void;
}) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {questions.map((question) => (
        <div key={question.id} className={question.half ? "md:col-span-1" : "md:col-span-2"}>
          <QuestionField
            question={question}
            value={answers[question.id] ?? ""}
            error={errors[question.id]}
            onChange={onChange}
          />
        </div>
      ))}
    </div>
  );
}

function QuestionField({
  question,
  value,
  error,
  onChange,
}: {
  question: Question;
  value: string;
  error?: string | undefined;
  onChange: (id: string, value: string) => void;
}) {
  const common = {
    value,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(question.id, e.target.value),
  };

  if (question.type === "radio") {
    return (
      <div>
        <span className="text-sm font-semibold text-navy">
          {question.label}
          {question.required ? <span className="ml-1 text-coral">*</span> : null}
        </span>
        <RadioGroup
          className="mt-2 flex flex-wrap gap-4"
          value={value}
          onValueChange={(next) => onChange(question.id, next)}
        >
          {(question.options ?? []).map((option) => (
            <label
              key={option}
              className="flex cursor-pointer items-center gap-2 rounded-xl border border-border/60 bg-white/60 px-3 py-2 text-sm text-navy transition hover:border-sky/60"
            >
              <RadioGroupItem value={option} />
              {option}
            </label>
          ))}
        </RadioGroup>
        {error ? <p className="mt-2 text-sm font-medium text-destructive">{error}</p> : null}
      </div>
    );
  }

  return (
    <Field label={question.label} required={question.required} error={error} hint={question.hint}>
      {question.type === "textarea" ? (
        <Textarea rows={4} placeholder={question.placeholder ?? ""} {...common} />
      ) : question.type === "select" ? (
        <select
          className={selectClass}
          value={value}
          onChange={(e) => onChange(question.id, e.target.value)}
        >
          <option value="">Select an option</option>
          {(question.options ?? []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : question.type === "catalogue" ? (
        <select
          className={selectClass}
          value={value}
          onChange={(e) => onChange(question.id, e.target.value)}
        >
          <option value="">Select a service</option>
          {catalogueGroups("visa").map((group) => (
            <optgroup key={group.country} label={group.country}>
              {group.options.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} — {catalogueDisplayPrice(item)}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      ) : question.type === "country" ? (
        <select
          className={selectClass}
          value={value}
          onChange={(e) => onChange(question.id, e.target.value)}
        >
          <option value="">Select country</option>
          {COUNTRIES.map((country) => (
            <option key={country} value={country}>
              {country}
            </option>
          ))}
        </select>
      ) : (
        <Input
          type={question.type === "number" ? "number" : question.type}
          {...(question.min !== undefined ? { min: question.min } : {})}
          {...(question.max !== undefined ? { max: question.max } : {})}
          placeholder={question.placeholder ?? ""}
          {...common}
        />
      )}
    </Field>
  );
}

function ProgressBar({ labels, step }: { labels: string[]; step: number }) {
  const percent = ((step + 1) / labels.length) * 100;
  return (
    <div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/70">
        <div
          className="h-full rounded-full bg-gradient-to-r from-sky via-lavender to-coral transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
      <ol className="mt-4 hidden flex-wrap justify-between gap-2 md:flex">
        {labels.map((label, index) => (
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
      <p className="mt-3 text-xs font-semibold text-muted-foreground md:hidden">
        {labels[step]} — step {step + 1} of {labels.length}
      </p>
    </div>
  );
}

function Field({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean | undefined;
  error?: string | undefined;
  hint?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block">
        <span className="text-sm font-semibold text-navy">
          {label}
          {required ? <span className="ml-1 text-coral">*</span> : null}
        </span>
        <div className="mt-2">{children}</div>
      </label>
      {hint ? <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p> : null}
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
            <dt className="shrink-0 text-muted-foreground">{label}:</dt>
            <dd className="min-w-0 break-words font-medium text-navy">{value || "—"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Confirmation({ reference, quoteOnly }: { reference: string; quoteOnly?: boolean }) {
  return (
    <div className="glass-card mx-auto max-w-2xl rounded-3xl p-8 md:p-12">
      <CheckCircle2 className="h-12 w-12 text-coral" aria-hidden="true" />
      <h2 className="mt-6 text-2xl font-extrabold tracking-tight text-navy md:text-3xl">
        Your travel request has been received.
      </h2>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground">
        {quoteOnly
          ? "Your application has been received. Our specialist will review and provide a quotation before payment."
          : "Our travel specialists will review your request and contact you shortly through your preferred contact method."}
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

function CataloguePanel({
  item,
  requiresQuote,
}: {
  item: CatalogueItem;
  requiresQuote: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-white/75 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-coral">
            {item.flag ? `${item.flag} ` : ""}
            {item.country}
          </p>
          <h3 className="mt-1 text-lg font-extrabold text-navy">{item.name}</h3>
        </div>
        <p className="text-lg font-extrabold text-navy">
          {requiresQuote ? "Quotation" : catalogueDisplayPrice(item)}
        </p>
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Processing time
          </dt>
          <dd className="mt-0.5 font-medium text-navy">{item.processingTime}</dd>
        </div>
        {item.validity ? (
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Validity
            </dt>
            <dd className="mt-0.5 font-medium text-navy">{item.validity}</dd>
          </div>
        ) : null}
      </dl>

      {item.includes?.length ? (
        <div className="mt-4">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Includes</p>
          <ul className="mt-1.5 grid gap-1 text-sm text-navy">
            {item.includes.map((entry) => (
              <li key={entry}>• {entry}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-4">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Required documents
        </p>
        <ul className="mt-1.5 grid gap-1 text-sm text-navy">
          {item.requirements.map((entry) => (
            <li key={entry}>• {entry}</li>
          ))}
        </ul>
      </div>

      {item.optionalDocuments?.length ? (
        <div className="mt-4">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Optional supporting documents
          </p>
          <ul className="mt-1.5 grid gap-1 text-sm text-navy">
            {item.optionalDocuments.map((entry) => (
              <li key={entry}>• {entry}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{ITINERARY_NOTE}</p>
        </div>
      ) : null}

      {requiresQuote ? (
        <p className="mt-4 rounded-xl border border-coral/30 bg-peach-tint p-3 text-sm font-medium text-navy">
          {LONG_STAY_QUOTE_MESSAGE}
        </p>
      ) : (
        <p className="mt-4 rounded-xl border border-sky/40 bg-sky-tint p-3 text-sm font-medium text-navy">
          Payment becomes available as soon as you submit this application with your documents.
        </p>
      )}

      <details className="mt-4 rounded-xl border border-border/60 bg-white/70 p-4">
        <summary className="cursor-pointer text-sm font-bold text-navy">
          Processing time & service FAQ
        </summary>
        <div className="mt-3 grid gap-3">
          {PROCESSING_FAQ.map((faq) => (
            <div key={faq.question}>
              <p className="text-sm font-semibold text-navy">{faq.question}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{faq.answer}</p>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
