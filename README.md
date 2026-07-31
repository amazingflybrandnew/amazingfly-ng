# Amazingfly Journey Hub

amazingfly.ng
Build the first-stage public website foundation for Amazingfly Travels.

NAMING RULES

Use these names consistently:

- Business and customer-facing brand name: Amazingfly Travels

- Website and digital platform name: Amazingfly.ng

- Technical project identifier: amazingfly-ng

Do not replace all occurrences of one name with the other.

Use “Amazingfly Travels” when referring to the business and services.

Use “Amazingfly.ng” when referring to the website, platform, domain, browser title and digital experience.

PROJECT PURPOSE

Amazingfly Travels is an all-in-one travel documentation, visa assistance and travel booking support business designed primarily for Nigerian travellers.

Amazingfly.ng will help customers request:

- Visa Assistance

- Flight Reservations and Bookings

- Hotel Reservations

- Travel Insurance

- Proof of Funds Guidance

- Police Character Certificate Assistance

- Yellow Fever Card Assistance

This is only the public website foundation.

Do not build backend functionality during this task.

BRANDING

Use the uploaded Amazingfly logo as the official logo.

Do not redraw, recolour, crop, stretch or distort the uploaded logo.

Use the logo in:

- Desktop header

- Mobile header

- Footer

- Favicon where possible

Use the alt text:

Amazingfly Travels logo

WEBSITE COLOURS

The website interface must use only:

- Deep blue

- Bright orange

- White

Do not use purple, pink, coral, red or gradients in the website interface.

The uploaded logo may remain in its original colours, but the surrounding website design must remain blue, orange and white.

Use:

- White for the main background

- Deep blue for headings, navigation, footer and secondary buttons

- Orange for primary buttons, important links, icons and highlights

DESIGN DIRECTION

The website should feel:

- Professional

- Premium

- Trustworthy

- Modern

- Clear

- Travel-focused

- Easy to navigate

- Suitable for Nigerian travellers

Use generous white space.

Avoid:

- Excessive animation

- Crowded layouts

- Fake testimonials

- Fake statistics

- Fake prices

- Fake bookings

- Guaranteed visa approval claims

- Generic travel-blog styling

RESPONSIVE HEADER

Create a reusable responsive header containing:

- Amazingfly logo

- Home

- Services dropdown

- About

- Contact

- Start a Request button

The Services dropdown should contain:

- Visa Assistance

- Flights

- Hotels

- Travel Insurance

- Proof of Funds Guidance

- Police Character Certificate

- Yellow Fever Card Assistance

Use:

- White header background

- Blue navigation text

- Orange Start a Request button

Create a working mobile navigation menu.

HOMEPAGE

Build the following homepage sections.

1. HERO SECTION

Headline:

Travel Documents, Visas and Bookings Made Easier

Supporting text:

Amazingfly Travels helps Nigerian travellers access professional visa assistance, travel documentation support, flight and hotel services, travel insurance and other essential travel services through Amazingfly.ng.

Primary button:

Start a Request

Secondary button:

Explore Services

Use a clean travel-related visual area that does not overpower the text.

2. TRUST HIGHLIGHTS

Create four trust points:

- Expert Application Support

- Secure Document Handling

- Clear Service Process

- Human Support When You Need It

Do not claim that customer documents are already stored securely in a database because no backend has been built yet.

3. SERVICES SECTION

Create service cards for:

- Visa Assistance

- Flight Requests

- Hotel Requests

- Travel Insurance

- Proof of Funds Guidance

- Police Character Certificate

- Yellow Fever Card Assistance

Each card should contain:

- Appropriate icon

- Service name

- Short description

- Learn More button

- Start a Request or Request a Quote button

Generate all service cards from one reusable service data file or configuration object.

Do not duplicate the service card component seven times.

Use “Request a Quote” for Flights and Hotels.

4. HOW IT WORKS

Show these four steps:

1. Choose a Service

2. Submit Your Request

3. Receive Guidance or a Quotation

4. Complete Payment and Processing

State clearly that Flights and Hotels will initially operate through a request-and-quotation process.

5. WHY CHOOSE AMAZINGFLY TRAVELS

Highlight:

- Travel support designed for Nigerian travellers

- Multiple travel services in one place

- Professional human assistance

- Clear and transparent service process

- Destination-specific guidance

- WhatsApp, email and phone support

6. VISA ASSISTANCE FEATURE

Present Visa Assistance as the main service.

Include:

- Destination-specific guidance

- Document checklist support

- Application review

- Human assistance

- Progress updates once the request system is introduced

Display this disclaimer:

Amazingfly Travels provides visa application assistance but does not guarantee visa approval.

Button:

Begin Visa Assistance

7. OTHER TRAVEL SERVICES

Explain that customers can also request:

- Flight reservations

- Hotel reservations

- Travel insurance

- Police Character Certificates

- Yellow Fever Cards

- Proof of Funds document guidance

8. FINAL CALL TO ACTION

Headline:

Start Your Travel Request Today

Supporting text:

Choose the service you need and let the Amazingfly Travels team guide you through the next steps on Amazingfly.ng.

Button:

Start a Request

REUSABLE SERVICE PAGES

Create one reusable ServicePage component.

Do not create seven unrelated page layouts.

Create one central service configuration containing:

- slug

- name

- short description

- full introduction

- benefits

- initial requirements

- process steps

- frequently asked questions

- primary call-to-action label

- disclaimer

- service status

Create these service routes:

- /services/visa-assistance

- /services/flights

- /services/hotels

- /services/travel-insurance

- /services/proof-of-funds

- /services/police-character-certificate

- /services/yellow-fever-card

Each service page should include:

- Service title and introduction

- Service overview

- Who the service is for

- What the customer receives

- Initial requirements

- Simple process

- Frequently asked questions

- Primary action button

- Contact Support button

- Relevant disclaimer

FLIGHTS AND HOTELS

Use:

Request a Quote

Do not display:

- Live fares

- Live hotel availability

- Fake reservations

- Fake booking confirmations

- Fabricated prices

TRAVEL INSURANCE

State that available policies, coverage and final pricing will be confirmed after the customer submits a request.

Do not claim automatic policy issuance.

PROOF OF FUNDS

Display this policy clearly:

Amazingfly Travels assists customers with organising and presenting genuine, verifiable financial documentation. We do not fabricate, inflate or misrepresent financial information.

POLICE CHARACTER CERTIFICATE AND YELLOW FEVER CARD

Present these as assistance services.

Do not claim to be the Nigeria Police Force, NCDC, Port Health Services or another government agency.

ADDITIONAL PAGES

Create:

- /

- /about

- /contact

- /request

- /privacy-policy

- /terms

- /refund-policy

- /disclaimer

The /request page should only be a temporary placeholder containing:

Request submission will be available shortly. Please contact Amazingfly Travels for immediate assistance.

Do not create a working form yet.

ABOUT PAGE

Explain the Amazingfly Travels mission and the purpose of Amazingfly.ng.

CONTACT PAGE

Include placeholders for:

- Phone

- WhatsApp

- Email

- Office address

- Business hours

- Social media links

Do not invent contact details.

FOOTER

Create a reusable footer containing:

- Amazingfly Travels

- Amazingfly.ng

- Short business description

- Service links

- Company links

- Contact placeholders

- WhatsApp placeholder

- Email placeholder

- Privacy Policy

- Terms

- Refund Policy

- Disclaimer

Use a deep blue footer background with white text and limited orange highlights.

WEBSITE METADATA

Set the website name to:

Amazingfly.ng

Homepage browser title:

Amazingfly.ng | Amazingfly Travels

Homepage meta description:

Amazingfly Travels helps Nigerian travellers with visa assistance, travel documentation, flights, hotels, travel insurance and other essential travel services through Amazingfly.ng.

TECHNICAL RULES

- Build only the public website.

- Keep the code modular.

- Reuse components.

- Do not duplicate service pages.

- Do not install unnecessary packages.

- Do not connect Supabase.

- Do not create database tables.

- Do not build authentication.

- Do not create an admin dashboard.

- Do not create a customer dashboard.

- Do not build request forms.

- Do not integrate Paystack.

- Do not integrate APIs.

- Do not create Edge Functions.

- Do not create fake customer data.

- Do not expose secret keys.

- Do not redesign anything outside this task.

- Make all pages fully responsive.

- Ensure every navigation link works.

Before completing the task, test:

- Desktop navigation

- Mobile navigation

- Homepage buttons

- All seven service routes

- About page

- Contact page

- Request placeholder page

- Policy-page routes

- Footer links

- Mobile responsiveness

- No broken routes

- No console errors

After completing the task, report only:

1. Pages and routes created

2. Reusable components created

3. Files created or modified

4. Packages installed

5. Tests completed

6. Any unresolved issue

Do not continue to backend development.

Stop after completing this task.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://fly-nigeria-guide.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/5f3d5e05-f5ad-477a-a670-c3ccb274331c).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
