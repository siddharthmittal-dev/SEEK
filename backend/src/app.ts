import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";
import {
  pool,
  rows,
  run,
  transaction,
  audit,
  type DB,
} from "./database/connection.js";
import {
  HttpError,
  requireThat,
  eligibility,
  canTransition,
} from "./domain.js";
import * as v from "./validators.js";

export const app = express();
app.disable("x-powered-by");
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        "script-src": ["'self'"],
        "img-src": ["'self'", "data:"],
        "connect-src": ["'self'"],
        "style-src": ["'self'", "'unsafe-inline'"],
      },
    },
  }),
);
app.use(express.json({ limit: "32kb" }));
app.use(cookieParser());
const origins = new Set([
  config.origin,
  ...(!config.production
    ? [
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        "http://127.0.0.1:3001",
        "http://localhost:3001",
      ]
    : []),
]);
app.use("/api", (req, res, next) => {
  res.set("Cache-Control", "no-store");
  if (
    !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
    (!req.headers.origin || !origins.has(req.headers.origin))
  )
    return next(new HttpError(403, "Request origin is not allowed."));
  next();
});
app.get("/api/health", async (_req, res) => {
  await pool.query("SELECT 1");
  res.json({ ok: true, database: "MySQL" });
});
app.get("/api/branches", async (_req, res) =>
  res.json(await rows(pool, "SELECT * FROM branches ORDER BY code")),
);
app.get("/api/public", async (_req, res) =>
  res.json(
    (
      await rows(
        pool,
        `SELECT (SELECT COUNT(*) FROM jobs WHERE status='published' AND application_deadline>UTC_TIMESTAMP()) AS jobs,(SELECT COUNT(*) FROM companies) AS companies,(SELECT COUNT(*) FROM students) AS students`,
      )
    )[0],
  ),
);
const authLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many attempts. Try again in 15 minutes." },
});
const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: config.production,
  path: "/api",
  maxAge: 60 * 60 * 1000,
};
const session = (res: Response, user: any) =>
  res.cookie(
    "seek_session",
    jwt.sign(
      { sub: String(user.id), version: user.token_version },
      config.secret,
      { expiresIn: "1h", issuer: "seek", audience: "seek-web" },
    ),
    cookieOptions,
  );
app.post("/api/auth/register", authLimit, async (req, res) => {
  const data = v.register.parse(req.body);
  const hash = await bcrypt.hash(data.password, 12);
  await transaction(async (db) => {
    if (data.role === "student")
      requireThat(
        data.enrollment && data.branch_id && data.graduation_year,
        "Enrollment, branch and graduation year are required.",
      );
    else
      requireThat(
        data.company_name && data.industry,
        "Company name and industry are required.",
      );
    const r = await run(
      db,
      "INSERT INTO users(name,email,password_hash,role,status) VALUES(?,?,?,?,?)",
      [
        data.name,
        data.email,
        hash,
        data.role,
        data.role === "student" ? "active" : "pending",
      ],
    );
    if (data.role === "student")
      await run(
        db,
        "INSERT INTO students(user_id,enrollment,branch_id,graduation_year) VALUES(?,?,?,?)",
        [r.insertId, data.enrollment, data.branch_id, data.graduation_year],
      );
    else {
      const c = await run(
        db,
        "INSERT INTO companies(name,industry) VALUES(?,?)",
        [data.company_name, data.industry],
      );
      await run(
        db,
        "INSERT INTO recruiters(user_id,company_id,designation) VALUES(?,?,?)",
        [r.insertId, c.insertId, data.designation || "Recruiter"],
      );
    }
    await audit(db, r.insertId, "account.registered", "user", r.insertId);
  });
  res
    .status(201)
    .json({
      message:
        data.role === "student"
          ? "Account created. Sign in to complete your profile."
          : "Registration received. A placement administrator must approve your account before you can sign in.",
    });
});
app.post("/api/auth/login", authLimit, async (req, res) => {
  const data = z
    .object({ email: z.email(), password: z.string().min(1).max(72) })
    .parse(req.body);
  const [user] = await rows(pool, "SELECT * FROM users WHERE email=?", [
    data.email.toLowerCase(),
  ]);
  const valid = await bcrypt.compare(
    data.password,
    user?.password_hash ||
      "$2b$12$GPv4hjw5KHvzD6JyCUwyZO1pQKNChRqAxBiPmG3Ckzp8FB2VZcNQi",
  );
  requireThat(user && valid, "Email or password is incorrect.", 401);
  requireThat(
    user.status === "active",
    `Your account is ${user.status}. Contact the placement office.`,
    403,
  );
  session(res, user);
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  });
});
app.use("/api", async (req, res, next) => {
  try {
    const token = req.cookies.seek_session;
    requireThat(token, "Sign in to continue.", 401);
    const claim = jwt.verify(token, config.secret, {
      algorithms: ["HS256"],
      issuer: "seek",
      audience: "seek-web",
    }) as jwt.JwtPayload;
    const [user] = await rows(
      pool,
      "SELECT id,name,email,role,status,token_version FROM users WHERE id=?",
      [claim.sub],
    );
    requireThat(
      user && user.status === "active" && user.token_version === claim.version,
      "Your session has ended. Sign in again.",
      401,
    );
    res.locals.user = user;
    next();
  } catch (e) {
    next(
      e instanceof HttpError
        ? e
        : new HttpError(401, "Your session has ended. Sign in again."),
    );
  }
});
app.post("/api/auth/logout", async (_req, res) => {
  await run(pool, "UPDATE users SET token_version=token_version+1 WHERE id=?", [
    res.locals.user.id,
  ]);
  res.clearCookie("seek_session", { ...cookieOptions, maxAge: undefined });
  res.json({ ok: true });
});
app.get("/api/me", async (_req, res) => {
  const user = res.locals.user;
  const [profile] =
    user.role === "student"
      ? await rows(
          pool,
          "SELECT s.*,b.code AS branch,b.name AS branch_name FROM students s JOIN branches b ON b.id=s.branch_id WHERE user_id=?",
          [user.id],
        )
      : user.role === "recruiter"
        ? await rows(
            pool,
            "SELECT r.*,c.name AS company,c.industry,c.website,c.description FROM recruiters r JOIN companies c ON c.id=r.company_id WHERE r.user_id=?",
            [user.id],
          )
        : [];
  res.json({ ...user, token_version: undefined, profile });
});
function roles(...allowed: string[]) {
  return (_req: Request, res: Response, next: NextFunction) =>
    allowed.includes(res.locals.user.role)
      ? next()
      : next(new HttpError(403, "You do not have permission for this action."));
}
async function student(db: DB, user: number, lock = false) {
  const [s] = await rows(
    db,
    `SELECT * FROM students WHERE user_id=? ${lock ? "FOR UPDATE" : ""}`,
    [user],
  );
  requireThat(s, "Student profile not found.", 404);
  return s;
}
async function recruiter(db: DB, user: number) {
  const [r] = await rows(db, "SELECT * FROM recruiters WHERE user_id=?", [
    user,
  ]);
  requireThat(r, "Recruiter profile not found.", 404);
  return r;
}
const jobSelect = `SELECT j.*,c.name AS company,c.industry,d.title AS drive,d.status AS drive_status,d.company_id FROM jobs j JOIN placement_drives d ON d.id=j.drive_id JOIN companies c ON c.id=d.company_id`;
async function jobFor(db: DB, id: number, user: any, lock = false) {
  const [j] = await rows(
    db,
    `${jobSelect} WHERE j.id=? ${lock ? "FOR UPDATE" : ""}`,
    [id],
  );
  requireThat(j, "Job not found.", 404);
  if (user.role === "recruiter") {
    const r = await recruiter(db, user.id);
    requireThat(
      j.created_by_recruiter_id === r.id,
      "This job belongs to another recruiter.",
      403,
    );
  }
  if (user.role === "student")
    requireThat(j.status !== "draft", "Job not found.", 404);
  return j;
}
async function applicationFor(db: DB, id: number, user: any, lock = false) {
  const [a] = await rows(
    db,
    `SELECT a.*,s.user_id,s.resume_url,s.cgpa,s.branch_id,u.name AS student_name,j.title,j.created_by_recruiter_id,c.name AS company FROM applications a JOIN students s ON s.id=a.student_id JOIN users u ON u.id=s.user_id JOIN jobs j ON j.id=a.job_id JOIN placement_drives d ON d.id=j.drive_id JOIN companies c ON c.id=d.company_id WHERE a.id=? ${lock ? "FOR UPDATE" : ""}`,
    [id],
  );
  requireThat(a, "Application not found.", 404);
  if (user.role === "student")
    requireThat(
      a.user_id === user.id,
      "This application belongs to another student.",
      403,
    );
  if (user.role === "recruiter") {
    const r = await recruiter(db, user.id);
    requireThat(
      a.created_by_recruiter_id === r.id,
      "This application belongs to another recruiter.",
      403,
    );
  }
  return a;
}
async function reasons(db: DB, s: any, j: any) {
  const branches = await rows(
    db,
    "SELECT branch_id FROM job_branches WHERE job_id=?",
    [j.id],
  );
  const duplicate = await rows(
    db,
    "SELECT id FROM applications WHERE job_id=? AND student_id=?",
    [j.id, s.id],
  );
  const placed = await rows(
    db,
    "SELECT o.id FROM offers o JOIN applications a ON a.id=o.application_id WHERE a.student_id=? AND o.status='accepted'",
    [s.id],
  );
  return eligibility(
    s,
    j,
    branches.map((b) => b.branch_id),
    !!duplicate.length,
    !!placed.length,
  );
}
app.put("/api/profile", roles("student"), async (req, res) => {
  const p = v.profile.parse(req.body);
  await transaction(async (db) => {
    const s = await student(db, res.locals.user.id, true);
    await run(db, "UPDATE users SET name=? WHERE id=?", [
      p.name,
      res.locals.user.id,
    ]);
    await run(
      db,
      "UPDATE students SET phone=?,skills=?,cgpa=?,backlogs=?,branch_id=?,graduation_year=?,resume_url=? WHERE id=?",
      [
        p.phone,
        p.skills,
        p.cgpa,
        p.backlogs,
        p.branch_id,
        p.graduation_year,
        p.resume_url || null,
        s.id,
      ],
    );
    await audit(db, res.locals.user.id, "profile.updated", "student", s.id);
  });
  res.json({ ok: true });
});
app.put("/api/company", roles("recruiter"), async (req, res) => {
  const d = z
    .object({
      name: z.string().trim().min(1).max(100),
      industry: z.string().trim().min(1).max(100),
      website: z.union([v.url, z.literal("")]),
      description: z.string().max(5000),
    })
    .parse(req.body);
  await transaction(async (db) => {
    const r = await recruiter(db, res.locals.user.id);
    await run(
      db,
      "UPDATE companies SET name=?,industry=?,website=?,description=? WHERE id=?",
      [d.name, d.industry, d.website || null, d.description, r.company_id],
    );
    await audit(
      db,
      res.locals.user.id,
      "company.updated",
      "company",
      r.company_id,
    );
  });
  res.json({ ok: true });
});
app.get("/api/jobs", async (req, res) => {
  const user = res.locals.user;
  let where = "j.status IN ('published','closed')",
    args: any[] = [];
  if (user.role === "recruiter") {
    where = "j.created_by_recruiter_id=?";
    args = [(await recruiter(pool, user.id)).id];
  }
  if (user.role === "admin") where = "1=1";
  const jobs = await rows(
    pool,
    `${jobSelect} WHERE ${where} ORDER BY j.created_at DESC,j.id DESC`,
    args,
  );
  const s = user.role === "student" ? await student(pool, user.id) : null;
  for (const j of jobs) {
    j.branch_ids = (
      await rows(pool, "SELECT branch_id FROM job_branches WHERE job_id=?", [
        j.id,
      ])
    ).map((b) => b.branch_id);
    if (s) j.eligibility_reasons = await reasons(pool, s, j);
  }
  res.json(jobs);
});
app.get("/api/jobs/:id", async (req, res) => {
  const j = await jobFor(pool, Number(req.params.id), res.locals.user);
  j.branch_ids = (
    await rows(pool, "SELECT branch_id FROM job_branches WHERE job_id=?", [
      j.id,
    ])
  ).map((b) => b.branch_id);
  if (res.locals.user.role === "student")
    j.eligibility_reasons = await reasons(
      pool,
      await student(pool, res.locals.user.id),
      j,
    );
  res.json(j);
});
app.post("/api/jobs", roles("recruiter"), async (req, res) => {
  const d = v.job.parse(req.body);
  const id = await transaction(async (db) => {
    const r = await recruiter(db, res.locals.user.id);
    const [drive] = await rows(
      db,
      "SELECT * FROM placement_drives WHERE id=? FOR UPDATE",
      [d.drive_id],
    );
    requireThat(
      drive &&
        drive.created_by_recruiter_id === r.id &&
        drive.status === "active",
      "Select an active drive you own.",
      403,
    );
    const x = await run(
      db,
      `INSERT INTO jobs(drive_id,created_by_recruiter_id,title,description,location,employment_type,ctc_min,ctc_max,min_cgpa,max_backlogs,graduation_year,application_deadline,status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        d.drive_id,
        r.id,
        d.title,
        d.description,
        d.location,
        d.employment_type,
        d.ctc_min,
        d.ctc_max,
        d.min_cgpa,
        d.max_backlogs,
        d.graduation_year,
        d.application_deadline,
        d.status,
      ],
    );
    for (const b of new Set(d.branch_ids))
      await run(db, "INSERT INTO job_branches VALUES(?,?)", [x.insertId, b]);
    await audit(
      db,
      res.locals.user.id,
      "job.created",
      "job",
      x.insertId,
      d.title,
    );
    return x.insertId;
  });
  res.status(201).json({ id });
});
app.patch("/api/jobs/:id", roles("recruiter", "admin"), async (req, res) => {
  const { status } = z
    .object({ status: z.enum(["published", "closed"]) })
    .parse(req.body);
  await transaction(async (db) => {
    const j = await jobFor(db, Number(req.params.id), res.locals.user, true);
    if (status === "published")
      requireThat(
        j.drive_status === "active" &&
          new Date(j.application_deadline.replace(" ", "T") + "Z") > new Date(),
        "An active drive and future deadline are required.",
      );
    await run(db, "UPDATE jobs SET status=? WHERE id=?", [status, j.id]);
    await audit(db, res.locals.user.id, `job.${status}`, "job", j.id);
  });
  res.json({ ok: true });
});
app.post("/api/jobs/:id/apply", roles("student"), async (req, res) => {
  const id = await transaction(async (db) => {
    const s = await student(db, res.locals.user.id, true);
    const j = await jobFor(db, Number(req.params.id), res.locals.user, true);
    const issues = await reasons(db, s, j);
    requireThat(!issues.length, issues.join(". "), 409);
    const a = await run(
      db,
      "INSERT INTO applications(student_id,job_id) VALUES(?,?)",
      [s.id, j.id],
    );
    await audit(
      db,
      res.locals.user.id,
      "application.submitted",
      "application",
      a.insertId,
      j.title,
    );
    return a.insertId;
  });
  res.status(201).json({ id });
});
app.get("/api/applications", async (req, res) => {
  const user = res.locals.user;
  let where = "1=1",
    args: any[] = [];
  if (user.role === "student") {
    where = "s.user_id=?";
    args = [user.id];
  }
  if (user.role === "recruiter") {
    where = "j.created_by_recruiter_id=?";
    args = [(await recruiter(pool, user.id)).id];
  }
  res.json(
    await rows(
      pool,
      `SELECT a.*,j.title,j.ctc_min,j.ctc_max,c.name AS company,u.name AS student_name,s.cgpa,s.resume_url,b.code AS branch FROM applications a JOIN jobs j ON j.id=a.job_id JOIN placement_drives d ON d.id=j.drive_id JOIN companies c ON c.id=d.company_id JOIN students s ON s.id=a.student_id JOIN users u ON u.id=s.user_id JOIN branches b ON b.id=s.branch_id WHERE ${where} ORDER BY a.applied_at DESC,a.id DESC`,
      args,
    ),
  );
});
app.patch("/api/applications/:id", async (req, res) => {
  const { status } = z
    .object({
      status: z.enum([
        "shortlisted",
        "interview",
        "selected",
        "rejected",
        "withdrawn",
      ]),
    })
    .parse(req.body);
  await transaction(async (db) => {
    const a = await applicationFor(
      db,
      Number(req.params.id),
      res.locals.user,
      true,
    );
    if (res.locals.user.role === "student")
      requireThat(
        status === "withdrawn" &&
          ["applied", "shortlisted", "interview"].includes(a.status),
        "This application cannot be withdrawn.",
      );
    else
      requireThat(
        canTransition(a.status, status),
        "This application stage change is not allowed.",
      );
    await run(db, "UPDATE applications SET status=? WHERE id=?", [
      status,
      a.id,
    ]);
    if (["withdrawn", "rejected"].includes(status))
      await run(
        db,
        "UPDATE interviews SET status='cancelled' WHERE application_id=? AND status='scheduled'",
        [a.id],
      );
    await audit(
      db,
      res.locals.user.id,
      `application.${status}`,
      "application",
      a.id,
    );
  });
  res.json({ ok: true });
});
app.get("/api/drives", roles("recruiter", "admin"), async (_req, res) => {
  const r =
    res.locals.user.role === "recruiter"
      ? await recruiter(pool, res.locals.user.id)
      : null;
  res.json(
    await rows(
      pool,
      `SELECT d.*,c.name AS company,(SELECT COUNT(*) FROM jobs j WHERE j.drive_id=d.id) AS jobs FROM placement_drives d JOIN companies c ON c.id=d.company_id ${r ? "WHERE d.created_by_recruiter_id=?" : ""} ORDER BY d.start_date DESC`,
      r ? [r.id] : [],
    ),
  );
});
app.post("/api/drives", roles("recruiter"), async (req, res) => {
  const d = v.drive.parse(req.body);
  const id = await transaction(async (db) => {
    const r = await recruiter(db, res.locals.user.id);
    const x = await run(
      db,
      "INSERT INTO placement_drives(company_id,created_by_recruiter_id,title,start_date,end_date) VALUES(?,?,?,?,?)",
      [r.company_id, r.id, d.title, d.start_date, d.end_date],
    );
    await audit(db, res.locals.user.id, "drive.created", "drive", x.insertId);
    return x.insertId;
  });
  res.status(201).json({ id });
});
app.patch("/api/drives/:id", roles("recruiter", "admin"), async (req, res) => {
  const { status } = z
    .object({ status: z.enum(["closed", "cancelled"]) })
    .parse(req.body);
  await transaction(async (db) => {
    const [d] = await rows(
      db,
      "SELECT * FROM placement_drives WHERE id=? FOR UPDATE",
      [req.params.id],
    );
    requireThat(d, "Drive not found.", 404);
    if (res.locals.user.role === "recruiter")
      requireThat(
        d.created_by_recruiter_id ===
          (await recruiter(db, res.locals.user.id)).id,
        "This drive belongs to another recruiter.",
        403,
      );
    await run(db, "UPDATE placement_drives SET status=? WHERE id=?", [
      status,
      d.id,
    ]);
    await run(db, "UPDATE jobs SET status='closed' WHERE drive_id=?", [d.id]);
    await audit(db, res.locals.user.id, `drive.${status}`, "drive", d.id);
  });
  res.json({ ok: true });
});
const scope = async (user: any) =>
  user.role === "student"
    ? { sql: "s.user_id=?", args: [user.id] }
    : user.role === "recruiter"
      ? {
          sql: "j.created_by_recruiter_id=?",
          args: [(await recruiter(pool, user.id)).id],
        }
      : { sql: "1=1", args: [] };
const joins =
  " JOIN applications a ON a.id=x.application_id JOIN students s ON s.id=a.student_id JOIN users u ON u.id=s.user_id JOIN jobs j ON j.id=a.job_id JOIN placement_drives d ON d.id=j.drive_id JOIN companies c ON c.id=d.company_id ";
for (const table of ["interviews", "offers"])
  app.get(`/api/${table}`, async (_req, res) => {
    const q = await scope(res.locals.user);
    res.json(
      await rows(
        pool,
        `SELECT x.*,j.title,c.name AS company,u.name AS student_name,a.status AS application_status FROM ${table} x ${joins} WHERE ${q.sql} ORDER BY x.id DESC`,
        q.args,
      ),
    );
  });
app.post("/api/interviews", roles("recruiter"), async (req, res) => {
  const d = v.interview.parse(req.body);
  await transaction(async (db) => {
    const a = await applicationFor(db, d.application_id, res.locals.user, true);
    requireThat(
      ["shortlisted", "interview"].includes(a.status),
      "Shortlist the application before scheduling an interview.",
    );
    const r = await recruiter(db, res.locals.user.id);
    await run(
      db,
      "INSERT INTO interviews(application_id,recruiter_id,round_number,type,scheduled_at,location) VALUES(?,?,?,?,?,?)",
      [a.id, r.id, d.round_number, d.type, d.scheduled_at, d.location],
    );
    await run(db, "UPDATE applications SET status='interview' WHERE id=?", [
      a.id,
    ]);
    await audit(
      db,
      res.locals.user.id,
      "interview.scheduled",
      "application",
      a.id,
    );
  });
  res.status(201).json({ ok: true });
});
app.patch("/api/interviews/:id", roles("recruiter"), async (req, res) => {
  const d = z
    .object({
      status: z.enum(["scheduled", "completed", "cancelled"]),
      feedback: z.string().max(5000).default(""),
      scheduled_at: v.datetime.optional(),
      location: z.string().trim().min(1).max(500).optional(),
    })
    .parse(req.body);
  await transaction(async (db) => {
    const [i] = await rows(
      db,
      "SELECT * FROM interviews WHERE id=? FOR UPDATE",
      [req.params.id],
    );
    requireThat(i, "Interview not found.", 404);
    const a = await applicationFor(db, i.application_id, res.locals.user);
    requireThat(
      !["rejected", "withdrawn"].includes(a.status),
      "This application is no longer active.",
    );
    if (d.scheduled_at)
      requireThat(
        new Date(d.scheduled_at.replace(" ", "T") + "Z") > new Date(),
        "Interview must be in the future.",
      );
    await run(
      db,
      "UPDATE interviews SET status=?,feedback=?,scheduled_at=?,location=? WHERE id=?",
      [
        d.status,
        d.feedback,
        d.scheduled_at || i.scheduled_at,
        d.location || i.location,
        i.id,
      ],
    );
    await audit(
      db,
      res.locals.user.id,
      `interview.${d.status}`,
      "interview",
      i.id,
    );
  });
  res.json({ ok: true });
});
app.post("/api/offers", roles("recruiter"), async (req, res) => {
  const d = v.offer.parse(req.body);
  await transaction(async (db) => {
    const a = await applicationFor(db, d.application_id, res.locals.user, true);
    requireThat(
      a.status === "selected",
      "Select the candidate before creating an offer.",
    );
    const [s] = await rows(db, "SELECT * FROM students WHERE id=? FOR UPDATE", [
      a.student_id,
    ]);
    const accepted = await rows(
      db,
      "SELECT o.id FROM offers o JOIN applications a ON a.id=o.application_id WHERE a.student_id=? AND o.status='accepted'",
      [s.id],
    );
    requireThat(
      !accepted.length,
      "This student has already accepted an offer.",
      409,
    );
    const o = await run(
      db,
      "INSERT INTO offers(application_id,ctc,joining_date,response_deadline) VALUES(?,?,?,?)",
      [a.id, d.ctc, d.joining_date, d.response_deadline],
    );
    await run(db, "UPDATE applications SET status='offered' WHERE id=?", [
      a.id,
    ]);
    await audit(db, res.locals.user.id, "offer.created", "offer", o.insertId);
  });
  res.status(201).json({ ok: true });
});
app.patch("/api/offers/:id", roles("student"), async (req, res) => {
  const { status } = z
    .object({ status: z.enum(["accepted", "declined"]) })
    .parse(req.body);
  await transaction(async (db) => {
    const s = await student(db, res.locals.user.id, true);
    const [o] = await rows(db, "SELECT * FROM offers WHERE id=? FOR UPDATE", [
      req.params.id,
    ]);
    requireThat(o, "Offer not found.", 404);
    await applicationFor(db, o.application_id, res.locals.user);
    requireThat(
      o.status === "pending" &&
        new Date(o.response_deadline.replace(" ", "T") + "Z") > new Date(),
      "This offer is no longer awaiting a response.",
      409,
    );
    if (status === "accepted") {
      const other = await rows(
        db,
        "SELECT o.id FROM offers o JOIN applications a ON a.id=o.application_id WHERE a.student_id=? AND o.status='accepted'",
        [s.id],
      );
      requireThat(!other.length, "You have already accepted an offer.", 409);
    }
    await run(db, "UPDATE offers SET status=? WHERE id=?", [status, o.id]);
    await audit(db, res.locals.user.id, `offer.${status}`, "offer", o.id);
  });
  res.json({ ok: true });
});
app.get("/api/admin/recruiters", roles("admin"), async (_req, res) =>
  res.json(
    await rows(
      pool,
      "SELECT r.id,u.id AS user_id,u.name,u.email,u.status,c.name AS company,r.designation FROM recruiters r JOIN users u ON u.id=r.user_id JOIN companies c ON c.id=r.company_id ORDER BY u.created_at DESC",
    ),
  ),
);
app.patch("/api/admin/recruiters/:id", roles("admin"), async (req, res) => {
  const { status } = z
    .object({ status: z.enum(["active", "rejected", "suspended"]) })
    .parse(req.body);
  await transaction(async (db) => {
    const [r] = await rows(
      db,
      "SELECT * FROM recruiters WHERE id=? FOR UPDATE",
      [req.params.id],
    );
    requireThat(r, "Recruiter not found.", 404);
    await run(
      db,
      "UPDATE users SET status=?,token_version=token_version+1 WHERE id=?",
      [status, r.user_id],
    );
    await audit(
      db,
      res.locals.user.id,
      `recruiter.${status}`,
      "recruiter",
      r.id,
    );
  });
  res.json({ ok: true });
});
app.get("/api/admin/students", roles("admin"), async (_req, res) =>
  res.json(
    await rows(
      pool,
      "SELECT s.*,u.name,u.email,u.status,b.code AS branch FROM students s JOIN users u ON u.id=s.user_id JOIN branches b ON b.id=s.branch_id ORDER BY u.name",
    ),
  ),
);
app.patch("/api/admin/students/:id", roles("admin"), async (req, res) => {
  const { status } = z
    .object({ status: z.enum(["active", "suspended"]) })
    .parse(req.body);
  await transaction(async (db) => {
    const [s] = await rows(db, "SELECT * FROM students WHERE id=?", [
      req.params.id,
    ]);
    requireThat(s, "Student not found.", 404);
    await run(
      db,
      "UPDATE users SET status=?,token_version=token_version+1 WHERE id=?",
      [status, s.user_id],
    );
    await audit(db, res.locals.user.id, `student.${status}`, "student", s.id);
  });
  res.json({ ok: true });
});
app.get("/api/admin/companies", roles("admin"), async (_req, res) =>
  res.json(
    await rows(
      pool,
      "SELECT c.*,(SELECT COUNT(*) FROM placement_drives d WHERE d.company_id=c.id) AS drives FROM companies c ORDER BY c.name",
    ),
  ),
);
app.post("/api/admin/branches", roles("admin"), async (req, res) => {
  const d = z
    .object({
      code: z.string().trim().min(1).max(12),
      name: z.string().trim().min(1).max(100),
    })
    .parse(req.body);
  await transaction(async (db) => {
    const b = await run(db, "INSERT INTO branches(code,name) VALUES(?,?)", [
      d.code.toUpperCase(),
      d.name,
    ]);
    await audit(db, res.locals.user.id, "branch.created", "branch", b.insertId);
  });
  res.status(201).json({ ok: true });
});
app.get("/api/admin/audit", roles("admin"), async (_req, res) =>
  res.json(
    await rows(
      pool,
      "SELECT a.*,u.name AS actor FROM audit_logs a JOIN users u ON u.id=a.actor_user_id ORDER BY a.id DESC LIMIT 500",
    ),
  ),
);
app.get("/api/admin/analytics", roles("admin"), async (_req, res) => {
  const [totals] = await rows(
    pool,
    `SELECT (SELECT COUNT(*) FROM students) AS students,(SELECT COUNT(*) FROM users WHERE role='recruiter' AND status='active') AS recruiters,(SELECT COUNT(*) FROM users WHERE role='recruiter' AND status='pending') AS pending,(SELECT COUNT(*) FROM placement_drives WHERE status='active') AS drives,(SELECT COUNT(*) FROM jobs WHERE status='published' AND application_deadline>UTC_TIMESTAMP()) AS jobs,(SELECT COUNT(*) FROM applications) AS applications,(SELECT COUNT(DISTINCT a.student_id) FROM offers o JOIN applications a ON a.id=o.application_id WHERE o.status='accepted') AS placed`,
  );
  const branches = await rows(
    pool,
    `SELECT b.code,b.name,COUNT(DISTINCT s.id) AS students,COUNT(DISTINCT CASE WHEN o.status='accepted' THEN s.id END) AS placed FROM branches b LEFT JOIN students s ON s.branch_id=b.id LEFT JOIN applications a ON a.student_id=s.id LEFT JOIN offers o ON o.application_id=a.id GROUP BY b.id ORDER BY b.code`,
  );
  const companies = await rows(
    pool,
    `SELECT c.name,COUNT(DISTINCT j.id) AS jobs,COUNT(DISTINCT a.id) AS applications,COUNT(DISTINCT CASE WHEN o.status='accepted' THEN o.id END) AS accepted FROM companies c LEFT JOIN placement_drives d ON d.company_id=c.id LEFT JOIN jobs j ON j.drive_id=d.id LEFT JOIN applications a ON a.job_id=j.id LEFT JOIN offers o ON o.application_id=a.id GROUP BY c.id ORDER BY applications DESC`,
  );
  const salaries = (
    await rows(
      pool,
      "SELECT ctc FROM offers WHERE status='accepted' ORDER BY ctc",
    )
  ).map((r) => Number(r.ctc));
  const n = salaries.length;
  res.json({
    totals,
    branches,
    companies,
    ctc: {
      median: n
        ? (salaries[Math.floor((n - 1) / 2)] + salaries[Math.floor(n / 2)]) / 2
        : null,
      max: n ? salaries[n - 1] : null,
      min: n ? salaries[0] : null,
      average: n ? salaries.reduce((a, b) => a + b, 0) / n : null,
    },
  });
});
app.put("/api/jobs/:id", roles("recruiter"), async (req, res) => {
  const d = v.job.parse(req.body);
  await transaction(async (db) => {
    const j = await jobFor(db, Number(req.params.id), res.locals.user, true);
    const applications = await rows(
      db,
      "SELECT id FROM applications WHERE job_id=? LIMIT 1",
      [j.id],
    );
    requireThat(
      !applications.length,
      "This job already has applications. Close it and create a new job to change its terms.",
      409,
    );
    const r = await recruiter(db, res.locals.user.id);
    const [drive] = await rows(
      db,
      "SELECT * FROM placement_drives WHERE id=? FOR UPDATE",
      [d.drive_id],
    );
    requireThat(
      drive &&
        drive.created_by_recruiter_id === r.id &&
        drive.status === "active",
      "Select an active drive you own.",
      403,
    );
    await run(
      db,
      "UPDATE jobs SET drive_id=?,title=?,description=?,location=?,employment_type=?,ctc_min=?,ctc_max=?,min_cgpa=?,max_backlogs=?,graduation_year=?,application_deadline=?,status=? WHERE id=?",
      [
        d.drive_id,
        d.title,
        d.description,
        d.location,
        d.employment_type,
        d.ctc_min,
        d.ctc_max,
        d.min_cgpa,
        d.max_backlogs,
        d.graduation_year,
        d.application_deadline,
        d.status,
        j.id,
      ],
    );
    await run(db, "DELETE FROM job_branches WHERE job_id=?", [j.id]);
    for (const b of new Set(d.branch_ids))
      await run(db, "INSERT INTO job_branches VALUES(?,?)", [j.id, b]);
    await audit(db, res.locals.user.id, "job.updated", "job", j.id);
  });
  res.json({ ok: true });
});
app.put("/api/drives/:id", roles("recruiter"), async (req, res) => {
  const d = v.drive.parse(req.body);
  await transaction(async (db) => {
    const [existing] = await rows(
      db,
      "SELECT * FROM placement_drives WHERE id=? FOR UPDATE",
      [req.params.id],
    );
    requireThat(existing, "Drive not found.", 404);
    const r = await recruiter(db, res.locals.user.id);
    requireThat(
      existing.created_by_recruiter_id === r.id,
      "This drive belongs to another recruiter.",
      403,
    );
    requireThat(
      existing.status === "active",
      "Only active drives may be edited.",
      409,
    );
    await run(
      db,
      "UPDATE placement_drives SET title=?,start_date=?,end_date=? WHERE id=?",
      [d.title, d.start_date, d.end_date, existing.id],
    );
    await audit(db, res.locals.user.id, "drive.updated", "drive", existing.id);
  });
  res.json({ ok: true });
});
app.use("/api", (_req, _res, next) =>
  next(new HttpError(404, "Endpoint not found.")),
);
const frontend = resolve(
  fileURLToPath(new URL("../../frontend/dist", import.meta.url)),
);
app.use(express.static(frontend));
app.get("/{*path}", (_req, res) =>
  res.sendFile(resolve(frontend, "index.html")),
);
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof z.ZodError)
    return res
      .status(400)
      .json({
        error: err.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      });
  if (err.code === "ER_DUP_ENTRY")
    return res
      .status(409)
      .json({
        error:
          "This email, enrollment, application, round or offer already exists.",
      });
  if (err.code === "ER_NO_REFERENCED_ROW_2")
    return res
      .status(400)
      .json({
        error: "The referenced record does not exist. Refresh and try again.",
      });
  if (err instanceof HttpError)
    return res.status(err.status).json({ error: err.message });
  console.error("Request failed:", err.code || err.name);
  return res
    .status(500)
    .json({
      error:
        "The request could not be completed. Check the server and database, then retry.",
    });
});
