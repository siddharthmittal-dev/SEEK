# Setup

## Prepared local environment

The current computer has a project-local MySQL 8.4.13 instance in the workspace's `work` directory. It listens only on `127.0.0.1:3307`; no Windows service or system-wide database installation was created. `backend/.env` contains the local application connection and a randomly generated signing secret. Keep this file private.

The app is served at **http://127.0.0.1:3001**. If it stops, run the adjacent `Start-SEEK.ps1` in PowerShell. This machine-specific helper starts the existing database and built application; it does not reset any data.

| Role          | Email               | Local demonstration password |
| ------------- | ------------------- | ---------------------------- |
| Student       | student@seek.test   | SeekCampus2027!              |
| Recruiter     | recruiter@seek.test | SeekCampus2027!              |
| Administrator | admin@seek.test     | SeekCampus2027!              |

Additional seeded students use `student2@seek.test` through `student8@seek.test`; recruiters use `recruiter2@seek.test` through `recruiter6@seek.test`. Recruiter 6 begins pending. The seed uses a single explicitly configured demo password, and is never run automatically by the web server.

## Clean setup on another computer

1. Install Node.js 22.13+ and MySQL 8.0.16+ (8.4 LTS recommended and tested). Alternatively use the included Docker Compose service if Docker is already available.
2. Extract the project into a folder and open a terminal there.
3. Create an empty MySQL database and a scoped account in your MySQL administration session:

```sql
CREATE DATABASE seek CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'seek'@'localhost' IDENTIFIED BY 'choose-a-strong-database-password';
GRANT ALL PRIVILEGES ON seek.* TO 'seek'@'localhost';
```

4. Copy `backend/.env.example` to `backend/.env`. Set DB_HOST, DB_PORT (normally 3306), DB_NAME, DB_USER and DB_PASSWORD. Generate a secret using `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` and put the result in JWT_SECRET. Set SEED_PASSWORD to a demonstration password with at least 10 characters. Do not commit `.env`.
5. Install and initialize:

```sh
npm ci
npm run db:migrate
npm run db:seed
npm run build
npm start
```

6. Visit `http://localhost:3001` and sign in with a seed account and your chosen SEED_PASSWORD. To develop with hot reload instead, use `npm run dev` and visit `http://localhost:5173`.

Docker alternative: export DB_PASSWORD and MYSQL_ROOT_PASSWORD in your shell, then run `docker compose up -d mysql`. Set DB_PORT=3306, DB_USER=seek and the same DB_PASSWORD in the backend environment. The Compose database binds only to loopback and persists in a named volume. The app itself runs via Node. The Docker path is provided but was not executed during verification.

## Testing

`npm test` runs database-independent business-rule tests. For integration tests, create a **separate** database named `seek_test`, grant the local application user permission to it, and set DB_NAME=seek_test in the test terminal. Never use your real records database for integration tests.

PowerShell:

```powershell
$env:DB_NAME='seek_test'
npm run db:migrate
npm run db:seed
npm run test:integration
Remove-Item Env:DB_NAME
```

POSIX shell:

```sh
DB_NAME=seek_test npm run db:migrate
DB_NAME=seek_test npm run db:seed
DB_NAME=seek_test npm run test:integration
```

Integration tests refuse names that do not end in `_test`. They create uniquely named fixtures and preserve them for inspection; repeated runs add fixtures. Seed runs only on an empty database. To repeat from a clean state, create a fresh dedicated database ending in `_test`; do not delete a database containing valuable records.

## Administrator creation

Set ADMIN_EMAIL, ADMIN_NAME and ADMIN_PASSWORD in a private shell environment, then run `npm run admin:create`. This inserts an administrator and an audit event. The public registration form permits only students and recruiters. Existing administrator records can be suspended through a controlled database administration procedure; there is no public administrator signup or password-reset flow.

## Troubleshooting

| Symptom                       | Resolution                                                                                                |
| ----------------------------- | --------------------------------------------------------------------------------------------------------- |
| Cannot connect / ECONNREFUSED | Start MySQL; verify DB_HOST and DB_PORT. The prepared copy uses 3307, a fresh setup normally uses 3306.   |
| Access denied                 | Match the MySQL user/password and host grant to the environment.                                          |
| JWT_SECRET error              | Set at least 32 random characters. Restart Express after changing the environment.                        |
| Pending account               | Sign in as the administrator and approve the recruiter.                                                   |
| Ineligible for every job      | Complete the resume URL and academic profile; check graduation year, branch and single-offer policy.      |
| Request origin rejected       | Use the documented localhost URL or set APP_ORIGIN to the exact browser origin, then restart.             |
| Blank page / old assets       | Run the build and reload. Express serves `frontend/dist`; development uses Vite.                          |
| Seed refuses to run           | It protects existing records. Use a new empty database for another demonstration dataset.                 |
| Session ended                 | Sessions expire after one hour. Sign in again. Logout invalidates all existing sessions for that account. |
| Duplicate interview round     | Each application can have only one row for a given round number; edit the existing interview.             |

All API timestamps are stored in UTC. The UI displays them in the browser's local timezone. Forms convert local date/time input to UTC. CTC is annualized in ₹ lakhs, including internships.

## Before using real campus information

Use a fresh database without sample accounts. Set a unique secret, remove seed passwords from the environment, and restrict database grants to runtime needs after schema installation. Keep the app local unless you separately configure HTTPS, secure production cookies, a single allowed APP_ORIGIN, backups and deployment access. This handoff does not claim public-hosting readiness or an independent security audit.
