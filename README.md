# SPKInstan

**SPKInstan** ([spkinstan.my.id](https://spkinstan.my.id)) is a self-service LegalTech web application built to simplify how independent professionals create formal project agreements. Instead of editing messy Word templates from scratch or hiring expensive legal counsel for routine projects, users can generate clean, structured, and ready-to-sign Indonesian legal documents in minutes.

## What Problem Does It Solve?

Many freelancers and small studios skip formal contracts because drafting them takes too much time or feels overly intimidating—leaving them vulnerable to scope creep, delayed payments, or unverified project handovers. SPKInstan bridges this gap by turning standard legal clauses into a fast, guided form with instant document output.

## Target Users

- **Freelancers & Solopreneurs:** Web/mobile developers, UI/UX designers, graphic designers, copywriters, and digital marketers.
- **Micro-Agencies & Creative Studios:** Small teams that need standardized client agreements without enterprise legal overhead.
- **Consultants & Project Vendors:** Independent professionals who require formal work orders and handover sign-offs from clients.

## Key Features

- **Guided Contract Builder:** Input project scope, timelines, payment milestones, and party details through a straightforward, mobile-friendly form.
- **Real-Time Live Preview:** Inspect the formatted legal document dynamically as you fill in the fields before finalizing.
- **Core Project Lifecycle Templates:** Supports essential Indonesian business documents:
  - **SPK (*Surat Perintah Kerja*):** Work Order / Service Agreement.
  - **NDA (*Non-Disclosure Agreement*):** Confidentiality agreement for sensitive project data.
  - **BAST (*Berita Acara Serah Terima*):** Official project completion and handover report.
- **Zero-Friction & Pay-Per-Use:** No bloated monthly SaaS subscriptions—users can draft immediately and unlock/download documents on demand via integrated payment processing (Mayar).
- **Print & PDF-Ready Output:** Clean typography and formal document structure ready for digital signatures or physical printing.

---

## Tech Stack

- **Framework:** [Next.js](https://nextjs.org) (App Router)
- **Styling:** Tailwind CSS
- **Typography:** [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) with [Geist](https://vercel.com/font)
- **Payments:** Mayar Payment Gateway

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.
