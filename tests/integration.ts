// Run only against a dedicated database whose name ends in _test; this creates isolated fixtures.
import assert from "node:assert/strict";
import { app } from "../backend/src/app.js";
import {
  pool,
  rows,
  run,
  transaction,
} from "../backend/src/database/connection.js";
import { config } from "../backend/src/config.js";
assert.ok(
  config.db.database.endsWith("_test"),
  "Integration tests require DB_NAME ending in _test",
);
const server = app.listen(0, "127.0.0.1");
await new Promise<void>((r) => server.once("listening", r));
const port = (server.address() as any).port;
const origin = "http://localhost:5173";
let assertions = 0;
async function request(
  path: string,
  method = "GET",
  data?: any,
  cookie = "",
  expected = 200,
) {
  const r = await fetch(`http://127.0.0.1:${port}/api${path}`, {
    method,
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: data ? JSON.stringify(data) : undefined,
  });
  const body = await r.json();
  assert.equal(
    r.status,
    expected,
    `${method} ${path}: ${JSON.stringify(body)}`,
  );
  assertions++;
  return {
    body,
    cookie: r.headers.get("set-cookie")?.split(";")[0] || cookie,
    headers: r.headers,
  };
}
const pass = process.env.SEED_PASSWORD!,
  suffix = Date.now();
const future = (days: number) =>
  new Date(Date.now() + days * 86400000).toISOString();
try {
  const anon = await request("/me", "GET", undefined, "", 401);
  const admin = await request("/auth/login", "POST", {
    email: "admin@seek.test",
    password: pass,
  });
  const recruiter = await request("/auth/login", "POST", {
    email: "recruiter@seek.test",
    password: pass,
  });
  const other = await request("/auth/login", "POST", {
    email: "recruiter2@seek.test",
    password: pass,
  });
  await request(
    "/auth/login",
    "POST",
    { email: "student@seek.test", password: "incorrect" },
    "",
    401,
  );
  await request(
    "/auth/login",
    "POST",
    { email: "recruiter6@seek.test", password: pass },
    "",
    403,
  );
  await request(
    "/auth/login",
    "POST",
    { email: "' OR 1=1 --", password: pass },
    "",
    400,
  );
  await request(
    "/auth/register",
    "POST",
    {
      name: "Forbidden",
      email: `bad${suffix}@seek.test`,
      password: pass,
      role: "admin",
    },
    "",
    400,
  );
  await request(
    "/auth/register",
    "POST",
    {
      name: "Integration Student",
      email: `test${suffix}@seek.test`,
      password: pass,
      role: "student",
      enrollment: `T${suffix}`,
      branch_id: 1,
      graduation_year: new Date().getUTCFullYear() + 1,
    },
    "",
    201,
  );
  const student = await request("/auth/login", "POST", {
    email: `test${suffix}@seek.test`,
    password: pass,
  });
  assert.match(student.headers.get("set-cookie") || "", /HttpOnly/);
  assertions++;
  await request("/admin/analytics", "GET", undefined, student.cookie, 403);
  await request(
    "/drives",
    "POST",
    { title: "No", start_date: "2027-01-01", end_date: "2027-02-01" },
    student.cookie,
    403,
  );
  const me = (await request("/me", "GET", undefined, student.cookie)).body;
  assert.ok(!JSON.stringify(me).includes("password"));
  assertions++;
  const profile = {
    name: me.name,
    phone: "",
    skills: "TypeScript, SQL",
    cgpa: 8.5,
    backlogs: 0,
    branch_id: 1,
    graduation_year: new Date().getUTCFullYear() + 1,
    resume_url: "https://example.com/resume",
  };
  await request(
    "/profile",
    "PUT",
    { ...profile, cgpa: 11 },
    student.cookie,
    400,
  );
  await request("/profile", "PUT", profile, student.cookie);
  const d = (
    await request(
      "/drives",
      "POST",
      {
        title: `Integration ${suffix}`,
        start_date: future(0).slice(0, 10),
        end_date: future(60).slice(0, 10),
      },
      recruiter.cookie,
      201,
    )
  ).body;
  const job = {
    drive_id: d.id,
    title: "Integration Engineer",
    description: "A test role",
    location: "Remote",
    employment_type: "Full-time",
    ctc_min: 10,
    ctc_max: 15,
    min_cgpa: 7,
    max_backlogs: 0,
    graduation_year: profile.graduation_year,
    application_deadline: future(20),
    status: "published",
    branch_ids: [1],
  };
  await request("/jobs", "POST", job, other.cookie, 403);
  const j = (await request("/jobs", "POST", job, recruiter.cookie, 201)).body;
  await request(
    `/jobs/${j.id}`,
    "PATCH",
    { status: "closed" },
    other.cookie,
    403,
  );
  // Concurrent duplicate submissions must commit exactly once.
  const responses = await Promise.all(
    [1, 2].map(() =>
      fetch(`http://127.0.0.1:${port}/api/jobs/${j.id}/apply`, {
        method: "POST",
        headers: {
          Origin: origin,
          Cookie: student.cookie,
          "Content-Type": "application/json",
        },
      }),
    ),
  );
  assert.deepEqual(responses.map((r) => r.status).sort(), [201, 409]);
  assertions++;
  const apps = (
    await request("/applications", "GET", undefined, student.cookie)
  ).body;
  const a = apps.find((a: any) => a.job_id === j.id);
  assert.ok(a);
  assertions++;
  await request(
    `/applications/${a.id}`,
    "PATCH",
    { status: "selected" },
    student.cookie,
    400,
  );
  await request(
    `/applications/${a.id}`,
    "PATCH",
    { status: "selected" },
    recruiter.cookie,
    400,
  );
  await request(
    `/applications/${a.id}`,
    "PATCH",
    { status: "shortlisted" },
    other.cookie,
    403,
  );
  await request(
    `/applications/${a.id}`,
    "PATCH",
    { status: "shortlisted" },
    recruiter.cookie,
  );
  await request(
    "/interviews",
    "POST",
    {
      application_id: a.id,
      round_number: 1,
      type: "Technical",
      scheduled_at: future(2),
      location: "Room 204",
    },
    recruiter.cookie,
    201,
  );
  await request(
    "/interviews",
    "POST",
    {
      application_id: a.id,
      round_number: 1,
      type: "Technical",
      scheduled_at: future(2),
      location: "Room 204",
    },
    recruiter.cookie,
    409,
  );
  const interviews = (
    await request("/interviews", "GET", undefined, student.cookie)
  ).body;
  const i = interviews.find((i: any) => i.application_id === a.id);
  await request(
    `/interviews/${i.id}`,
    "PATCH",
    { status: "completed", feedback: "Strong fundamentals" },
    recruiter.cookie,
  );
  await request(
    `/applications/${a.id}`,
    "PATCH",
    { status: "selected" },
    recruiter.cookie,
  );
  await request(
    "/offers",
    "POST",
    {
      application_id: a.id,
      ctc: 14,
      joining_date: future(90).slice(0, 10),
      response_deadline: future(10),
    },
    recruiter.cookie,
    201,
  );
  const offers = (await request("/offers", "GET", undefined, student.cookie))
    .body;
  await request(
    `/offers/${offers[0].id}`,
    "PATCH",
    { status: "accepted" },
    student.cookie,
  );
  const j2 = (
    await request(
      "/jobs",
      "POST",
      { ...job, title: "Second integration role" },
      recruiter.cookie,
      201,
    )
  ).body;
  await request(`/jobs/${j2.id}/apply`, "POST", {}, student.cookie, 409);
  const totals = (
    await request("/admin/analytics", "GET", undefined, admin.cookie)
  ).body;
  const [actual] = await rows(
    pool,
    "SELECT COUNT(DISTINCT a.student_id) AS placed FROM offers o JOIN applications a ON a.id=o.application_id WHERE o.status='accepted'",
  );
  assert.equal(totals.totals.placed, actual.placed);
  assertions++;
  const [before] = await rows(pool, "SELECT COUNT(*) AS n FROM audit_logs");
  await assert.rejects(
    transaction(async (db) => {
      await run(
        db,
        "INSERT INTO audit_logs(actor_user_id,action,entity_type,entity_id) VALUES(1,'test.rollback','test',1)",
      );
      throw new Error("force rollback");
    }),
  );
  const [after] = await rows(pool, "SELECT COUNT(*) AS n FROM audit_logs");
  assert.equal(before.n, after.n);
  assertions++;
  await assert.rejects(
    run(pool, "UPDATE students SET cgpa=11 WHERE id=?", [me.profile.id]),
  );
  assertions++;
  const [explain] = await rows(
    pool,
    "EXPLAIN SELECT * FROM applications WHERE student_id=? AND job_id=?",
    [me.profile.id, j.id],
  );
  assert.ok(explain.key);
  assertions++;
  await request(
    "/auth/register",
    "POST",
    {
      name: "Pending partner",
      email: `partner${suffix}@seek.test`,
      password: pass,
      role: "recruiter",
      company_name: "Integration Partner",
      industry: "Software",
    },
    "",
    201,
  );
  const pending = (
    await request("/admin/recruiters", "GET", undefined, admin.cookie)
  ).body.find((r: any) => r.email === `partner${suffix}@seek.test`);
  await request(
    `/admin/recruiters/${pending.id}`,
    "PATCH",
    { status: "active" },
    student.cookie,
    403,
  );
  await request(
    `/admin/recruiters/${pending.id}`,
    "PATCH",
    { status: "active" },
    admin.cookie,
  );
  await request("/auth/login", "POST", {
    email: `partner${suffix}@seek.test`,
    password: pass,
  });
  const csrf = await fetch(`http://127.0.0.1:${port}/api/auth/logout`, {
    method: "POST",
    headers: { Origin: "https://untrusted.example", Cookie: student.cookie },
  });
  assert.equal(csrf.status, 403);
  assertions++;
  await request("/auth/logout", "POST", {}, student.cookie);
  await request("/me", "GET", undefined, student.cookie, 401);
  console.log(
    `PASS: ${assertions} API/database checks including registration, RBAC, ownership, eligibility, concurrent applications, interview, offer, analytics, rollback, constraints, SQL index, CSRF and logout.`,
  );
} finally {
  await new Promise<void>((r) => server.close(() => r()));
  await pool.end();
}
