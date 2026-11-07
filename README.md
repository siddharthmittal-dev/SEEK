# SEEK — Student Employment & Employer Connect

A working, local campus recruitment application built from the supplied phase-wise plan. Includes student, recruiter and placement-office portals, a twelve-table MySQL schema, server-side eligibility, recruitment workflows and database-backed analytics.

## Start here

- **On this computer:** open `http://127.0.0.1:3001`. The local preview uses the configured database on port 3307. The adjacent `Start-SEEK.ps1` helper can restart this prepared environment.
- **On another computer:** follow [docs/setup.md](docs/setup.md). Install Node.js 22.13+ and MySQL 8.0.16+ (8.4 LTS tested), configure `backend/.env`, run migrations and seed data.
- **Demo accounts:** `student@seek.test`, `recruiter@seek.test`, `admin@seek.test`. On this prepared computer their password is `SeekCampus2027!`. A fresh setup uses the value you choose for `SEED_PASSWORD`.

These are local demonstration credentials, not real user accounts. Database credentials and JWT signing secrets are generated independently and excluded from the source archive.

## Included

| Student                         | Recruiter                                   | Placement office                  |
| ------------------------------- | ------------------------------------------- | --------------------------------- |
| Registration and profile        | Registration with approval                  | Recruiter approval and suspension |
| Resume URL and academic details | Company profile                             | Student account management        |
| Job search and filters          | Create/edit/close drives                    | Company and drive oversight       |
| Eligibility explanations        | Multi-step job creation, drafts and editing | Job monitoring and closure        |
| Apply and withdraw              | Review applicants and move stages           | Branch creation                   |
| Interviews and feedback         | Schedule/reschedule interviews              | Placement and CTC statistics      |
| Accept/decline offers           | Select candidates and create offers         | CSV export and audit trail        |

## Commands

```sh
npm ci
npm run db:migrate
npm run db:seed
npm run dev
```

Development serves React on port 5173 and proxies `/api` to Express on port 3001. For the single-port application:

```sh
npm run build
npm start
```

Open `http://localhost:3001`. Set `APP_ORIGIN=http://localhost:3001` when using production mode. Local development permits both localhost and 127.0.0.1 on 3001/5173.

## Project guide

- [Setup and troubleshooting](docs/setup.md)
- [Architecture, schema and workflow](docs/project_details.md)
- [Viva preparation](docs/explanation_for_viva.md)
- [SQL demonstrations](docs/queries.sql)
- [Test evidence and limitations](docs/verification.md)
- [Design system](DESIGN.md)

## Technical scope

React 19, Vite, TypeScript, React Router, Tailwind CSS, Lucide, Framer Motion, Three.js (landing page only), Express 5, MySQL via `mysql2`, raw parameterized SQL, bcrypt, JWT in an HttpOnly cookie, Zod, Helmet and authentication rate limiting. Dependencies are pinned by `package-lock.json`.

The source archive intentionally excludes dependencies, `.env`, portable MySQL binaries and database files. It includes built frontend/backend output for convenience, but source remains authoritative.

No GitHub repository or hosted deployment was created. No SMS, email, external HRMS, resume hosting, AI ranking, or payment functionality is included.
