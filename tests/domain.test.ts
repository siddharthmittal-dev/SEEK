import { test } from "node:test";
import assert from "node:assert/strict";
import { eligibility, canTransition } from "../backend/src/domain.js";
import { job, register, profile } from "../backend/src/validators.js";
const student = {
  cgpa: 8,
  backlogs: 0,
  branch_id: 1,
  graduation_year: 2027,
  resume_url: "https://example.com/resume",
};
const vacancy = {
  min_cgpa: 7,
  max_backlogs: 0,
  graduation_year: 2027,
  status: "published",
  drive_status: "active",
  application_deadline: "2027-10-01 12:00:00",
};
const now = new Date("2027-09-01T12:00:00Z");
test("eligible student passes all requirements", () =>
  assert.deepEqual(
    eligibility(student, vacancy, [1, 2], false, false, now),
    [],
  ));
test("empty branch mapping admits all branches", () =>
  assert.deepEqual(eligibility(student, vacancy, [], false, false, now), []));
test("all independent eligibility failures are explained", () =>
  assert.equal(
    eligibility(
      {
        ...student,
        cgpa: 6,
        backlogs: 2,
        graduation_year: 2026,
        resume_url: "",
      },
      {
        ...vacancy,
        status: "closed",
        application_deadline: "2027-01-01 00:00:00",
      },
      [2],
      true,
      true,
      now,
    ).length,
    9,
  ));
test("deadline equality is closed", () =>
  assert.ok(
    eligibility(
      student,
      { ...vacancy, application_deadline: "2027-09-01 12:00:00" },
      [],
      false,
      false,
      now,
    ).includes("Application deadline has passed"),
  ));
test("closed drive blocks published job", () =>
  assert.ok(
    eligibility(
      student,
      { ...vacancy, drive_status: "closed" },
      [],
      false,
      false,
      now,
    ).includes("Applications are closed"),
  ));
test("workflow cannot jump from applied to offered or revive rejected candidates", () => {
  assert.equal(canTransition("applied", "offered"), false);
  assert.equal(canTransition("rejected", "shortlisted"), false);
  assert.equal(canTransition("applied", "shortlisted"), true);
  assert.equal(canTransition("interview", "selected"), true);
});
test("registration cannot create an administrator", () =>
  assert.equal(
    register.safeParse({
      name: "A",
      email: "a@b.com",
      password: "a-long-password",
      role: "admin",
    }).success,
    false,
  ));
test("unsafe resume protocols are rejected", () =>
  assert.equal(
    profile.safeParse({
      name: "A",
      phone: "",
      skills: "",
      cgpa: 8,
      backlogs: 0,
      branch_id: 1,
      graduation_year: 2027,
      resume_url: "javascript:alert(1)",
    }).success,
    false,
  ));
test("job requires ordered compensation and a future deadline", () => {
  const base = {
    drive_id: 1,
    title: "Engineer",
    description: "Build tools",
    location: "Remote",
    employment_type: "Full-time",
    ctc_min: 12,
    ctc_max: 8,
    min_cgpa: 7,
    max_backlogs: 0,
    graduation_year: 2027,
    application_deadline: "2099-12-01T12:00:00Z",
    status: "published",
    branch_ids: [],
  };
  assert.equal(job.safeParse(base).success, false);
  assert.equal(job.safeParse({ ...base, ctc_max: 18 }).success, true);
  assert.equal(
    job.safeParse({
      ...base,
      ctc_max: 18,
      application_deadline: "2000-01-01T12:00:00Z",
    }).success,
    false,
  );
});
