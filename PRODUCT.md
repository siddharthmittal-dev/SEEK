# SEEK

Student Employment & Employer Connect is a local college recruitment application for students, approved recruiters, and placement administrators. Its primary journey is profile → eligibility → application → shortlist → interview → selection → offer → acceptance.

The user explicitly chose to preserve React + Vite + TypeScript, Express + TypeScript, and MySQL instead of adapting the backend to Sites. Do not deploy this project to Sites or replace its relational database without a new request.

The supplied plan pins a near-black zinc palette, warm amber accents, Inter/Geist text, JetBrains Mono figures, subtle borders, and restrained motion. Resume links only; no file hosting, payments, candidate ranking, or external messages. All bundled students, recruiters, companies, and placement records are fictional demonstration data. Real records live only in the configured MySQL database.

Eligibility requires a resume, CGPA threshold, allowed backlogs, eligible branch (empty mapping means all), matching graduation year, published job in active drive, future deadline, no prior application, and no accepted offer. The single-offer placement policy applies server-side. Administrators are created by a controlled CLI; public registration cannot create an administrator.

This is an academic local application. It is not represented as an audited production deployment. The seed must be replaced before using real campus records.
