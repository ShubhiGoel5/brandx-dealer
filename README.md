# Brand X Lucknow: dealership website, test-drive booking and lead desk

Built for "Company A, Lucknow" (brief: car dealership end-to-end website). Brand X is fictional; all data is invented except the three stock rows given in the brief.

**What works end to end**

- Model and variant pages with on-road price breakup by city from an admin price table (validity date, disclaimer, expiry handling), EMI calculator, colour switcher
- Certified used-car listing and detail pages: filters, inspection report, masked registration
- Test-drive booking by showroom, demo car and real slot (double-booking prevented by the database)
- Enquiry form with DPDP consent and opt-out; Hindi and English
- Lead inbox with auto-assignment by showroom and model, 5-minute response timer, portal CSV import
- AI buyer summary and first-reply draft with guardrails (no discounts, no invented prices), plus a manager-only used-car price band
- Admin for prices, models and used stock; roles: consultant, used-car manager, admin

See [deployment.md](deployment.md) to run, deploy and sign in. `npm test` runs 27 tests.

Stack: Next.js 15, React 19, SQLite (better-sqlite3), zod, jose, bcryptjs, Anthropic SDK (optional).
