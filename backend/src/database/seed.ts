import bcrypt from "bcrypt";
import { pool, rows, run, transaction, audit } from "./connection.js";
const password = process.env.SEED_PASSWORD;
if (!password || password.length < 10)
  throw new Error(
    "Set SEED_PASSWORD to a local demonstration password of at least 10 characters.",
  );
const date = (days: number) =>
  new Date(Date.now() + days * 86400000)
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");
try {
  const existing = await rows(pool, "SELECT id FROM users LIMIT 1");
  if (existing.length)
    throw new Error(
      "Seed only runs on an empty database. Existing data was left untouched.",
    );
  const hash = await bcrypt.hash(password, 12);
  await transaction(async (db) => {
    for (const [code, name] of [
      ["CSE", "Computer Science & Engineering"],
      ["IT", "Information Technology"],
      ["ECE", "Electronics & Communication"],
      ["EEE", "Electrical Engineering"],
      ["ME", "Mechanical Engineering"],
      ["CE", "Civil Engineering"],
    ])
      await run(db, "INSERT INTO branches(code,name) VALUES(?,?)", [
        code,
        name,
      ]);
    const admin = await run(
      db,
      "INSERT INTO users(name,email,password_hash,role) VALUES('Placement Office','admin@seek.test',?,'admin')",
      [hash],
    );
    const companies = [
      ["Northstar Labs", "Product engineering"],
      ["Meridian Systems", "Enterprise technology"],
      ["Arc & Co.", "Design & technology"],
      ["Vector Mobility", "Automotive"],
      ["Fieldwork Analytics", "Data & analytics"],
      ["Forma Infrastructure", "Construction"],
    ];
    for (let i = 0; i < companies.length; i++) {
      const c = await run(
        db,
        "INSERT INTO companies(name,industry,description) VALUES(?,?,?)",
        [
          ...companies[i],
          `Illustrative campus recruitment partner for the SEEK demonstration dataset.`,
        ],
      );
      const u = await run(
        db,
        "INSERT INTO users(name,email,password_hash,role,status) VALUES(?,?,?,'recruiter',?)",
        [
          [
            "Riya Mehta",
            "Karan Shah",
            "Maya Bose",
            "Arjun Rao",
            "Sara Thomas",
            "Dev Kapoor",
          ][i],
          i === 0 ? "recruiter@seek.test" : `recruiter${i + 1}@seek.test`,
          hash,
          i === 5 ? "pending" : "active",
        ],
      );
      const r = await run(
        db,
        "INSERT INTO recruiters(user_id,company_id,designation) VALUES(?,?,?)",
        [u.insertId, c.insertId, "Campus Talent Partner"],
      );
      if (i < 5)
        await run(
          db,
          "INSERT INTO placement_drives(company_id,created_by_recruiter_id,title,start_date,end_date) VALUES(?,?,?,?,?)",
          [
            c.insertId,
            r.insertId,
            `${companies[i][0]} · Class of ${new Date().getUTCFullYear() + 1}`,
            date(-3).slice(0, 10),
            date(60).slice(0, 10),
          ],
        );
    }
    const year = new Date().getUTCFullYear() + 1;
    const names = [
      "Aarav Sharma",
      "Ananya Iyer",
      "Kabir Singh",
      "Diya Nair",
      "Ishaan Patel",
      "Meera Joshi",
      "Rohan Das",
      "Tara Menon",
    ];
    for (let i = 0; i < names.length; i++) {
      const u = await run(
        db,
        "INSERT INTO users(name,email,password_hash,role) VALUES(?,?,?,'student')",
        [
          names[i],
          i === 0 ? "student@seek.test" : `student${i + 1}@seek.test`,
          hash,
        ],
      );
      await run(
        db,
        "INSERT INTO students(user_id,enrollment,branch_id,cgpa,backlogs,graduation_year,resume_url,phone,skills) VALUES(?,?,?,?,?,?,?,?,?)",
        [
          u.insertId,
          `SEEK${year}${String(i + 1).padStart(3, "0")}`,
          i === 0 ? 1 : (i % 6) + 1,
          [8.72, 9.12, 7.8, 8.1, 6.4, 8.6, 7.2, 9.4][i],
          i === 4 ? 2 : 0,
          year,
          "https://example.com/resume",
          "",
          i === 0
            ? "React, TypeScript, SQL, Python"
            : "Communication, problem solving",
        ],
      );
    }
    const jobs = [
      ["Software Engineer", "Bengaluru", 12, 18, 7.5, 1],
      ["Frontend Engineer", "Bengaluru", 10, 16, 7, 1],
      ["Graduate Engineer Trainee", "Hyderabad", 7, 10, 6.5, 2],
      ["Product Design Intern", "Remote", 4, 6, 7, 3],
      ["Embedded Systems Engineer", "Pune", 9, 14, 8, 4],
      ["Data Analyst", "Mumbai", 8, 12, 7.5, 5],
      ["Research Engineer", "Bengaluru", 18, 24, 9, 1],
      ["Backend Engineering Intern", "Remote", 5, 8, 7, 2],
    ];
    for (let i = 0; i < jobs.length; i++) {
      const [title, location, min, max, cgpa, r] = jobs[i];
      const result = await run(
        db,
        `INSERT INTO jobs(drive_id,created_by_recruiter_id,title,description,location,employment_type,ctc_min,ctc_max,min_cgpa,max_backlogs,graduation_year,application_deadline,status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?, 'published')`,
        [
          r,
          r,
          title,
          `Build useful products with a collaborative team. You will work on real projects, learn from experienced mentors, and take ownership of well-defined problems.\n\nWhat you will do\n• Design and deliver reliable, thoughtful solutions.\n• Collaborate with engineering, product and design teams.\n• Write clear documentation and communicate your decisions.\n\nWhat we look for\nStrong fundamentals, curiosity, and a willingness to learn. Personal projects and practical experience are welcome.\n\nSelection process\nApplication review → technical assessment → team interview → offer.`,
          location,
          String(title).includes("Intern") ? "Internship" : "Full-time",
          min,
          max,
          cgpa,
          0,
          year,
          date(i + 8),
        ],
      );
      for (const b of i === 4 ? [3, 4] : i === 3 ? [] : [1, 2, 3])
        await run(db, "INSERT INTO job_branches VALUES(?,?)", [
          result.insertId,
          b,
        ]);
    }
    for (const [s, j, status] of [
      [1, 1, "interview"],
      [1, 3, "shortlisted"],
      [1, 4, "applied"],
      [2, 1, "selected"],
      [3, 5, "offered"],
      [4, 5, "applied"],
      [6, 4, "offered"],
      [7, 2, "applied"],
    ])
      await run(
        db,
        "INSERT INTO applications(student_id,job_id,status) VALUES(?,?,?)",
        [s, j, status],
      );
    await run(
      db,
      "INSERT INTO interviews(application_id,recruiter_id,round_number,type,scheduled_at,location) VALUES(1,1,1,'Technical interview',?,'Campus · Interview room 204')",
      [date(2)],
    );
    for (const [a, ctc, status] of [
      [5, 12, "accepted"],
      [7, 6, "pending"],
    ])
      await run(
        db,
        "INSERT INTO offers(application_id,ctc,joining_date,response_deadline,status) VALUES(?,?,?,?,?)",
        [a, ctc, date(90).slice(0, 10), date(10), status],
      );
    await audit(
      db,
      admin.insertId,
      "demo.seeded",
      "user",
      admin.insertId,
      "Illustrative people and companies. Not real placement outcomes.",
    );
  });
  console.log(
    "Seed complete: 8 students, 6 companies, 8 jobs. Demo accounts: student@seek.test, recruiter@seek.test, admin@seek.test. Password is your SEED_PASSWORD.",
  );
} finally {
  await pool.end();
}
