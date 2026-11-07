export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function requireThat(
  test: unknown,
  message: string,
  status = 400,
): asserts test {
  if (!test) throw new HttpError(status, message);
}
export function eligibility(
  student: any,
  job: any,
  branches: number[],
  alreadyApplied = false,
  placed = false,
  now = new Date(),
): string[] {
  const reasons: string[] = [];
  if (!student.resume_url) reasons.push("Add a resume URL to your profile");
  if (student.cgpa < job.min_cgpa)
    reasons.push(`Minimum CGPA is ${job.min_cgpa}`);
  if (student.backlogs > job.max_backlogs)
    reasons.push(`Maximum ${job.max_backlogs} active backlogs`);
  if (branches.length && !branches.includes(student.branch_id))
    reasons.push("Your branch is not eligible");
  if (student.graduation_year !== job.graduation_year)
    reasons.push(`For the graduating class of ${job.graduation_year}`);
  if (
    job.status !== "published" ||
    job.drive_status === "closed" ||
    job.drive_status === "cancelled"
  )
    reasons.push("Applications are closed");
  if (new Date(job.application_deadline.replace(" ", "T") + "Z") <= now)
    reasons.push("Application deadline has passed");
  if (alreadyApplied) reasons.push("Already applied");
  if (placed)
    reasons.push(
      "An accepted offer makes you ineligible under the single-offer policy",
    );
  return reasons;
}
export const transitions: Record<string, string[]> = {
  applied: ["shortlisted", "rejected"],
  shortlisted: ["interview", "selected", "rejected"],
  interview: ["selected", "rejected"],
  selected: ["rejected"],
  rejected: [],
  withdrawn: [],
  offered: [],
};
export function canTransition(from: string, to: string) {
  return (transitions[from] || []).includes(to);
}
