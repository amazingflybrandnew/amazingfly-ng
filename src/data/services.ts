import {
  Banknote,
  BedDouble,
  FileCheck2,
  Plane,
  ShieldCheck,
  Stamp,
  Syringe,
  type LucideIcon,
} from "lucide-react";

export type ServiceStatus = "Available" | "Request and quotation" | "Assistance service";

export type Service = {
  slug: string;
  name: string;
  shortDescription: string;
  introduction: string;
  icon: LucideIcon;
  benefits: string[];
  whoItIsFor: string[];
  whatYouReceive: string[];
  initialRequirements: string[];
  processSteps: { title: string; description: string }[];
  faqs: { question: string; answer: string }[];
  ctaLabel: string;
  disclaimer: string;
  status: ServiceStatus;
  featured?: boolean;
};

export const services: Service[] = [
  {
    slug: "visa-assistance",
    name: "Visa Assistance",
    shortDescription:
      "Destination-specific guidance, document checklists and application review handled by real people.",
    introduction:
      "Amazingfly Travels supports Nigerian travellers through every stage of a visa application, from understanding the requirements of your destination to reviewing your documents before submission.",
    icon: Stamp,
    featured: true,
    ctaLabel: "Begin Visa Assistance",
    status: "Available",
    benefits: [
      "Destination-specific guidance for your travel purpose",
      "Document checklist support tailored to your application",
      "Application review before you submit",
      "Human assistance from start to finish",
      "Progress updates once the request system is introduced",
    ],
    whoItIsFor: [
      "Travellers applying for a tourist, study, business or visit visa",
      "First-time applicants who are unsure of the requirements",
      "Applicants who want their documents reviewed before submission",
    ],
    whatYouReceive: [
      "A written checklist for your destination and visa category",
      "Guidance on how each document should be prepared and presented",
      "A review of your compiled application",
      "Direct support from an Amazingfly Travels team member",
    ],
    initialRequirements: [
      "Valid international passport",
      "Intended destination and travel purpose",
      "Preferred travel dates",
      "Supporting documents relevant to your visa category",
    ],
    processSteps: [
      { title: "Choose a Service", description: "Tell us the destination and visa category you need help with." },
      { title: "Submit Your Request", description: "Share your travel details so we understand your application." },
      { title: "Receive Guidance", description: "We send a checklist, guidance and a review of your documents." },
      { title: "Complete Processing", description: "Complete payment and proceed with your application." },
    ],
    faqs: [
      {
        question: "Do you guarantee that my visa will be approved?",
        answer:
          "No. Amazingfly Travels provides visa application assistance. The final decision always rests with the embassy, consulate or immigration authority.",
      },
      {
        question: "Which destinations do you support?",
        answer:
          "Guidance is prepared per destination. Share your intended country and travel purpose when you start a request and we will confirm what we can support.",
      },
      {
        question: "Can you review documents I have already prepared?",
        answer: "Yes. Application review is part of the service, whether you are starting fresh or already have documents.",
      },
    ],
    disclaimer:
      "Amazingfly Travels provides visa application assistance but does not guarantee visa approval.",
  },
  {
    slug: "flights",
    name: "Flight Requests",
    shortDescription:
      "Send us your route and dates and receive a quotation prepared by the Amazingfly Travels team.",
    introduction:
      "Flight support at Amazingfly Travels currently operates through a request-and-quotation process. You share your travel plan and our team responds with the available options.",
    icon: Plane,
    ctaLabel: "Request a Quote",
    status: "Request and quotation",
    benefits: [
      "Route and date options prepared for you",
      "Support for flight reservations required for visa applications",
      "A single point of contact for changes and questions",
      "No need to compare booking sites on your own",
    ],
    whoItIsFor: [
      "Travellers who need a flight reservation for a visa application",
      "Travellers who prefer human assistance over self-service booking",
      "Families or groups travelling together",
    ],
    whatYouReceive: [
      "A written quotation for your requested route",
      "Guidance on reservation timing for visa purposes",
      "Support through to ticket issuance once you confirm",
    ],
    initialRequirements: [
      "Departure and destination cities",
      "Preferred travel dates and trip type",
      "Number of travellers",
      "Passport name details as written in the passport",
    ],
    processSteps: [
      { title: "Choose a Service", description: "Select flight support and tell us your route." },
      { title: "Submit Your Request", description: "Share dates, traveller count and passport name details." },
      { title: "Receive a Quotation", description: "We respond with the options and pricing available at that time." },
      { title: "Complete Processing", description: "Confirm your preferred option and complete payment." },
    ],
    faqs: [
      {
        question: "Can I see live fares on Amazingfly.ng?",
        answer:
          "Not at this stage. Amazingfly.ng does not display live fares. Every price is confirmed in a quotation prepared for your specific request.",
      },
      {
        question: "Can you provide a flight reservation for a visa application?",
        answer: "Yes. Tell us that the reservation is for a visa application when you submit your request.",
      },
      {
        question: "How long does a quotation take?",
        answer: "Turnaround depends on the route and the time of day. Our team will confirm timing when your request is received.",
      },
    ],
    disclaimer:
      "Amazingfly.ng does not display live fares or availability. All flight pricing is confirmed in a quotation after your request is reviewed.",
  },
  {
    slug: "hotels",
    name: "Hotel Requests",
    shortDescription:
      "Share your destination and stay dates and receive a hotel quotation from our team.",
    introduction:
      "Hotel support at Amazingfly Travels also operates through a request-and-quotation process, including reservations required as part of a visa application.",
    icon: BedDouble,
    ctaLabel: "Request a Quote",
    status: "Request and quotation",
    benefits: [
      "Accommodation options matched to your destination and budget range",
      "Support for hotel reservations required for visa applications",
      "Assistance with amendments before your stay",
    ],
    whoItIsFor: [
      "Travellers who need a hotel reservation for a visa application",
      "Travellers unfamiliar with accommodation options at their destination",
      "Business travellers who want the arrangements handled for them",
    ],
    whatYouReceive: [
      "A written quotation with the options available for your dates",
      "Guidance on reservation documents for visa purposes",
      "Confirmation support once you select an option",
    ],
    initialRequirements: [
      "Destination city",
      "Check-in and check-out dates",
      "Number of guests and rooms",
      "Any budget range or location preference",
    ],
    processSteps: [
      { title: "Choose a Service", description: "Select hotel support and tell us your destination." },
      { title: "Submit Your Request", description: "Share your dates, guest count and preferences." },
      { title: "Receive a Quotation", description: "We respond with options and pricing available at that time." },
      { title: "Complete Processing", description: "Confirm your choice and complete payment." },
    ],
    faqs: [
      {
        question: "Does Amazingfly.ng show live hotel availability?",
        answer:
          "No. Availability and pricing are confirmed in a quotation prepared after we review your request.",
      },
      {
        question: "Can you arrange a reservation for a visa application?",
        answer: "Yes. Mention that the reservation is for a visa application when you send your request.",
      },
    ],
    disclaimer:
      "Amazingfly.ng does not display live hotel availability or pricing. All hotel arrangements are confirmed by quotation.",
  },
  {
    slug: "travel-insurance",
    name: "Travel Insurance",
    shortDescription:
      "Guidance on travel insurance suited to your trip, with cover and pricing confirmed after your request.",
    introduction:
      "Many embassies require travel insurance as part of a visa application. Amazingfly Travels helps you understand the cover you need and arranges a policy through the appropriate provider.",
    icon: ShieldCheck,
    ctaLabel: "Start a Request",
    status: "Request and quotation",
    benefits: [
      "Guidance on the cover typically required by your destination",
      "Help understanding policy terms before you commit",
      "One point of contact for questions about your policy",
    ],
    whoItIsFor: [
      "Travellers whose visa application requires insurance",
      "Travellers who want medical or trip cover while abroad",
      "Anyone unsure which level of cover is appropriate",
    ],
    whatYouReceive: [
      "An explanation of the cover options relevant to your trip",
      "Confirmation of available policies and final pricing after your request",
      "Support through to policy documents once you confirm",
    ],
    initialRequirements: [
      "Destination and travel dates",
      "Traveller ages",
      "Any cover requirement stated by the embassy",
    ],
    processSteps: [
      { title: "Choose a Service", description: "Select travel insurance support." },
      { title: "Submit Your Request", description: "Share your trip details and any embassy requirement." },
      { title: "Receive Guidance", description: "We confirm the available policies, coverage and final pricing." },
      { title: "Complete Processing", description: "Complete payment so the policy can be arranged." },
    ],
    faqs: [
      {
        question: "Is a policy issued immediately?",
        answer:
          "No. Available policies, coverage and final pricing are confirmed after you submit a request. Nothing is issued automatically.",
      },
      {
        question: "Will the policy meet my embassy requirement?",
        answer: "Share the requirement with us and we will confirm which of the available options match it.",
      },
    ],
    disclaimer:
      "Available policies, coverage and final pricing are confirmed after you submit a request. Amazingfly Travels does not issue policies automatically and is not the insurance underwriter.",
  },
  {
    slug: "proof-of-funds",
    name: "Proof of Funds Guidance",
    shortDescription:
      "Guidance on organising and presenting genuine, verifiable financial documentation.",
    introduction:
      "Financial documentation is one of the most common reasons an application is questioned. Amazingfly Travels helps you organise and present the genuine financial records you already have.",
    icon: Banknote,
    ctaLabel: "Start a Request",
    status: "Assistance service",
    benefits: [
      "Clarity on the financial documents typically requested",
      "Guidance on how statements and letters should be presented",
      "A review of your documentation before submission",
    ],
    whoItIsFor: [
      "Applicants who need to demonstrate their financial standing",
      "Applicants relying on a sponsor",
      "Anyone unsure how to arrange their financial records",
    ],
    whatYouReceive: [
      "A checklist of the financial documents relevant to your application",
      "Guidance on structure, dating and supporting letters",
      "A review of the documents you compile",
    ],
    initialRequirements: [
      "Destination and visa category",
      "Genuine bank statements or sponsor documentation",
      "Employment or business documentation where relevant",
    ],
    processSteps: [
      { title: "Choose a Service", description: "Select proof of funds guidance." },
      { title: "Submit Your Request", description: "Tell us your destination and situation." },
      { title: "Receive Guidance", description: "We provide a checklist and review your documentation." },
      { title: "Complete Processing", description: "Complete payment and finalise your documentation." },
    ],
    faqs: [
      {
        question: "Can you create or adjust bank statements?",
        answer:
          "No. We assist with organising and presenting genuine, verifiable documentation only. We do not fabricate, inflate or misrepresent financial information.",
      },
      {
        question: "How much do I need to show?",
        answer:
          "Requirements vary by destination and visa category. We explain what is typically expected for your specific application.",
      },
    ],
    disclaimer:
      "Amazingfly Travels assists customers with organising and presenting genuine, verifiable financial documentation. We do not fabricate, inflate or misrepresent financial information.",
  },
  {
    slug: "police-character-certificate",
    name: "Police Character Certificate",
    shortDescription:
      "Assistance with understanding and completing the police character certificate process.",
    introduction:
      "A police character certificate is often required for immigration, study and employment abroad. Amazingfly Travels assists you with the process, requirements and paperwork.",
    icon: FileCheck2,
    ctaLabel: "Start a Request",
    status: "Assistance service",
    benefits: [
      "A clear explanation of the process and what is required",
      "Support preparing the paperwork correctly",
      "Someone to answer your questions along the way",
    ],
    whoItIsFor: [
      "Applicants for immigration, study or employment abroad",
      "Travellers whose destination requires a character certificate",
    ],
    whatYouReceive: [
      "A requirement checklist",
      "Guidance through each stage of the process",
      "Follow-up support while your certificate is being processed",
    ],
    initialRequirements: [
      "Valid means of identification",
      "Passport data page",
      "Purpose of the certificate and destination country",
    ],
    processSteps: [
      { title: "Choose a Service", description: "Select police character certificate assistance." },
      { title: "Submit Your Request", description: "Share your details and the purpose of the certificate." },
      { title: "Receive Guidance", description: "We explain the process and confirm the applicable fees." },
      { title: "Complete Processing", description: "Complete payment and proceed with the application." },
    ],
    faqs: [
      {
        question: "Are you part of the Nigeria Police Force?",
        answer:
          "No. Amazingfly Travels is an independent travel documentation business. We assist applicants; we are not a government agency and we do not issue certificates.",
      },
      {
        question: "How long does it take?",
        answer: "Timelines are set by the issuing authority. We will share the expected timeline when your request is reviewed.",
      },
    ],
    disclaimer:
      "Amazingfly Travels is not the Nigeria Police Force or any government agency. We provide assistance with the application process only and cannot influence issuance or timelines.",
  },
  {
    slug: "yellow-fever-card",
    name: "Yellow Fever Card Assistance",
    shortDescription:
      "Assistance with the yellow fever vaccination card process required by many destinations.",
    introduction:
      "Several destinations require a valid yellow fever vaccination card on arrival. Amazingfly Travels assists you with understanding the requirement and completing the process correctly.",
    icon: Syringe,
    ctaLabel: "Start a Request",
    status: "Assistance service",
    benefits: [
      "Clarity on whether your destination requires the card",
      "Guidance on the correct process and documentation",
      "Support with timing so your card is valid before travel",
    ],
    whoItIsFor: [
      "Travellers to destinations that require proof of yellow fever vaccination",
      "Travellers renewing or replacing an existing card",
    ],
    whatYouReceive: [
      "Confirmation of the requirement for your destination",
      "A step-by-step explanation of the process",
      "Support until your documentation is in order",
    ],
    initialRequirements: [
      "Passport data page",
      "Destination and travel dates",
      "Any existing vaccination record",
    ],
    processSteps: [
      { title: "Choose a Service", description: "Select yellow fever card assistance." },
      { title: "Submit Your Request", description: "Share your destination and travel dates." },
      { title: "Receive Guidance", description: "We explain the process and applicable official fees." },
      { title: "Complete Processing", description: "Complete payment and proceed with the process." },
    ],
    faqs: [
      {
        question: "Do you issue the yellow fever card?",
        answer:
          "No. Cards are issued by the authorised health authorities. Amazingfly Travels assists you with the process only.",
      },
      {
        question: "How early should I start?",
        answer: "Start well ahead of your travel date, as validity rules and appointment availability vary.",
      },
    ],
    disclaimer:
      "Amazingfly Travels is not the NCDC, Port Health Services or any other government agency. We provide assistance with the process only and do not issue vaccination cards.",
  },
];

export const getService = (slug: string) => services.find((service) => service.slug === slug);

export const serviceSlugs = services.map((service) => service.slug);
