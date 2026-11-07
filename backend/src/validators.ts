import { z } from "zod";
const text = (max = 100) => z.string().trim().min(1).max(max);
const integer = z.coerce.number().int().nonnegative();
const year = z.coerce.number().int().min(2020).max(2100);
export const url = z
  .string()
  .trim()
  .url()
  .max(1000)
  .refine((s) => /^https?:\/\//i.test(s), "Use an http or https URL");
export const register = z.object({
  name: text(),
  email: z
    .email()
    .max(190)
    .transform((s) => s.toLowerCase()),
  password: z
    .string()
    .min(10)
    .max(72)
    .refine(
      (s) => Buffer.byteLength(s, "utf8") <= 72,
      "Password must be at most 72 UTF-8 bytes",
    ),
  role: z.enum(["student", "recruiter"]),
  enrollment: text(40).optional(),
  branch_id: integer.optional(),
  graduation_year: year.optional(),
  company_name: text().optional(),
  industry: text().optional(),
  designation: text().optional(),
});
export const profile = z.object({
  name: text(),
  phone: z.string().trim().max(30),
  skills: z.string().trim().max(500),
  cgpa: z.coerce.number().min(0).max(10),
  backlogs: integer.max(30),
  branch_id: integer.positive(),
  graduation_year: year,
  resume_url: z.union([url, z.literal("")]),
});
export const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (s) =>
      !isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s,
    "Use a valid date",
  );
export const datetime = z
  .string()
  .datetime({ offset: true })
  .transform((s) => new Date(s).toISOString().slice(0, 19).replace("T", " "));
export const drive = z
  .object({ title: text(150), start_date: date, end_date: date })
  .refine((v) => v.end_date >= v.start_date, "End date must follow start date");
export const job = z
  .object({
    drive_id: integer.positive(),
    title: text(150),
    description: text(10000),
    location: text(),
    employment_type: z.enum(["Full-time", "Internship"]),
    ctc_min: z.coerce.number().min(0).max(999999),
    ctc_max: z.coerce.number().min(0).max(999999),
    min_cgpa: z.coerce.number().min(0).max(10),
    max_backlogs: integer.max(30),
    graduation_year: year,
    application_deadline: datetime,
    status: z.enum(["draft", "published"]),
    branch_ids: z.array(integer.positive()).max(20),
  })
  .refine(
    (v) => v.ctc_max >= v.ctc_min,
    "Maximum CTC must be at least minimum CTC",
  )
  .refine(
    (v) =>
      new Date(v.application_deadline.replace(" ", "T") + "Z") > new Date(),
    "Deadline must be in the future",
  );
export const interview = z
  .object({
    application_id: integer.positive(),
    round_number: integer.positive().max(20),
    type: text(),
    scheduled_at: datetime,
    location: text(500),
  })
  .refine(
    (v) => new Date(v.scheduled_at.replace(" ", "T") + "Z") > new Date(),
    "Interview must be in the future",
  );
export const offer = z
  .object({
    application_id: integer.positive(),
    ctc: z.coerce.number().min(0).max(999999),
    joining_date: date,
    response_deadline: datetime,
  })
  .refine(
    (v) => new Date(v.response_deadline.replace(" ", "T") + "Z") > new Date(),
    "Response deadline must be in the future",
  )
  .refine(
    (v) => v.joining_date >= v.response_deadline.slice(0, 10),
    "Joining date must follow the response deadline",
  );
