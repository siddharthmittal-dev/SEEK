import { useState, useEffect, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowUpRight,
  ArrowRight,
  Search,
  MapPin,
  Clock3,
  Check,
  Plus,
  Download,
  ExternalLink,
  SlidersHorizontal,
  CalendarDays,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import { motion } from "framer-motion";
import { api, ctc, day, time, initials, utc } from "./api";
import {
  useData,
  State,
  Heading,
  Panel,
  Badge,
  Empty,
  Field,
  Drawer,
  Table,
} from "./ui";
type Props = { user: any; revision: number; refresh: (s?: string) => void };
const range = (j: any) =>
  `${ctc(j.ctc_min)}–${Number(j.ctc_max).toLocaleString("en-IN")} LPA`;
function Logo({ name }: { name: string }) {
  return <span className="company-logo">{initials(name)}</span>;
}
function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: any;
  sub: string;
}) {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{sub}</small>
    </div>
  );
}
function ApplicationTable({
  data,
  role,
  action,
}: {
  data: any[];
  role: string;
  action?: (a: any) => void;
}) {
  return data.length ? (
    <Table
      heads={[
        role === "student" ? "Opportunity" : "Candidate",
        "Company / role",
        "Applied",
        "Stage",
        "",
      ]}
    >
      {data.map((a) => (
        <tr key={a.id}>
          <td>
            <strong>{role === "student" ? a.title : a.student_name}</strong>
            <small>
              {role === "student" ? range(a) : `${a.branch} · ${a.cgpa} CGPA`}
            </small>
          </td>
          <td>{role === "student" ? a.company : a.title}</td>
          <td className="numeric muted">{day(a.applied_at)}</td>
          <td>
            <Badge status={a.status} />
          </td>
          <td>
            {action && (
              <button className="text-link" onClick={() => action(a)}>
                View <ArrowUpRight size={14} />
              </button>
            )}
          </td>
        </tr>
      ))}
    </Table>
  ) : (
    <Empty title="Your next chapter is waiting">
      Applications will appear here once you apply to a role.
    </Empty>
  );
}
export function Dashboard(p: Props) {
  const { data: me, error } = useData("/me", p.revision),
    { data: jobs } = useData("/jobs", p.revision),
    { data: applications } = useData("/applications", p.revision),
    { data: interviews } = useData("/interviews", p.revision),
    { data: offers } = useData("/offers", p.revision);
  if (!me || !jobs || !applications || !interviews || !offers)
    return (
      <State error={error} loading={!error}>
        <span />
      </State>
    );
  const student = p.user.role === "student",
    eligible = jobs.filter((j: any) => j.eligibility_reasons?.length === 0),
    upcoming = interviews
      .filter(
        (i: any) =>
          i.status === "scheduled" && utc(i.scheduled_at) > new Date(),
      )
      .sort((a: any, b: any) => a.scheduled_at.localeCompare(b.scheduled_at));
  const base = "/" + p.user.role;
  return (
    <>
      <Heading
        title={`Make your next move, ${p.user.name.split(" ")[0]}.`}
        description={
          student
            ? "A little progress today. A new possibility tomorrow."
            : "Your next great hire starts with a good connection."
        }
        action={
          <Link
            className="button primary"
            to={base + (student ? "/jobs" : "/post-job")}
          >
            {student ? "Explore opportunities" : "Post a job"}
            <ArrowUpRight size={17} />
          </Link>
        }
      />
      <div className="stats">
        <Stat
          label={student ? "Your applications" : "Total applicants"}
          value={applications.length.toString().padStart(2, "0")}
          sub="Across recruitment drives"
        />
        <Stat
          label={student ? "Eligible opportunities" : "Published jobs"}
          value={(student
            ? eligible.length
            : jobs.filter((j: any) => j.status === "published").length
          )
            .toString()
            .padStart(2, "0")}
          sub={student ? "Matched to your profile" : "Open to campus talent"}
        />
        <Stat
          label="Upcoming interviews"
          value={upcoming.length.toString().padStart(2, "0")}
          sub={
            upcoming.length
              ? `Next: ${day(upcoming[0].scheduled_at)}`
              : "Your calendar is clear"
          }
        />
        <Stat
          label={student ? "Offers received" : "Offers extended"}
          value={offers.length.toString().padStart(2, "0")}
          sub={`${offers.filter((o: any) => o.status === "accepted").length} accepted`}
        />
      </div>
      <div className="dashboard-columns">
        <div>
          <Panel
            title={
              student ? "Your application journey" : "Your recruitment pipeline"
            }
            to={base + "/applications"}
          >
            <div className="pipeline">
              {[
                "applied",
                "shortlisted",
                "interview",
                "selected",
                "offered",
              ].map((s, i) => (
                <div key={s}>
                  <div className="pipeline-top">
                    <span
                      className={
                        applications.some((a: any) => a.status === s)
                          ? "stage-dot filled"
                          : "stage-dot"
                      }
                    >
                      {applications.filter((a: any) => a.status === s).length}
                    </span>
                    {i < 4 && <span className="stage-line" />}
                  </div>
                  <span>
                    {s === "applied"
                      ? "Applied"
                      : s === "interview"
                        ? "Interview"
                        : s === "offered"
                          ? "Offer"
                          : s[0].toUpperCase() + s.slice(1)}
                  </span>
                </div>
              ))}
            </div>
            <ApplicationTable
              data={applications.slice(0, 3)}
              role={p.user.role}
            />
          </Panel>
          <Panel
            title={student ? "Worth a closer look" : "Your latest job listings"}
            to={base + "/jobs"}
          >
            {(student ? eligible : jobs).slice(0, 3).map((j: any) => (
              <Link to={base + "/jobs"} className="opportunity-row" key={j.id}>
                <Logo name={j.company} />
                <div>
                  <strong>{j.title}</strong>
                  <small>
                    {j.company} <span>·</span> {j.location}
                  </small>
                </div>
                <span className="numeric">{range(j)}</span>
                <ArrowUpRight size={16} />
              </Link>
            ))}
            {!(student ? eligible : jobs).length && (
              <Empty
                title={
                  student
                    ? "No matches just yet"
                    : "Post your first opportunity"
                }
              >
                {student
                  ? "Complete your profile or browse all opportunities."
                  : "Create a drive and share your first job with campus."}
              </Empty>
            )}
          </Panel>
        </div>
        <div>
          <Panel title="Up next" to={base + "/interviews"}>
            {upcoming.length ? (
              upcoming.slice(0, 2).map((i: any) => (
                <div className="upcoming" key={i.id}>
                  <div className="date-block">
                    <strong>{utc(i.scheduled_at).getDate()}</strong>
                    <span>
                      {utc(i.scheduled_at).toLocaleString("en", {
                        month: "short",
                      })}
                    </span>
                  </div>
                  <div>
                    <Badge status="scheduled" />
                    <h3>{i.type}</h3>
                    <p>
                      {i.company} · Round {i.round_number}
                    </p>
                    <small>
                      <Clock3 size={13} />
                      {time(i.scheduled_at)}
                    </small>
                    <small>
                      <MapPin size={13} />
                      {i.location}
                    </small>
                  </div>
                </div>
              ))
            ) : (
              <Empty title="Room for what’s next">
                Scheduled interviews will appear here.
              </Empty>
            )}
          </Panel>
          {student ? (
            <Panel
              title="Your profile"
              to="/student/profile"
              link="Edit profile"
            >
              <div className="profile-summary">
                <span className="avatar large">{initials(me.name)}</span>
                <h3>{me.name}</h3>
                <p>{me.profile.branch_name}</p>
                <small>
                  Class of {me.profile.graduation_year} ·{" "}
                  {me.profile.enrollment}
                </small>
                <div className="profile-numbers">
                  <div>
                    <strong>{Number(me.profile.cgpa).toFixed(2)}</strong>
                    <span>CGPA / 10</span>
                  </div>
                  <div>
                    <strong>{me.profile.backlogs}</strong>
                    <span>Active backlogs</span>
                  </div>
                </div>
                <div className="resume-state">
                  <CheckCircle2 size={15} />
                  {me.profile.resume_url
                    ? "Resume linked"
                    : "Add your resume to apply"}
                </div>
              </div>
            </Panel>
          ) : (
            <Panel
              title="Your company"
              to="/recruiter/company"
              link="Edit profile"
            >
              <div className="profile-summary">
                <Logo name={me.profile.company} />
                <h3>{me.profile.company}</h3>
                <p>{me.profile.industry}</p>
                <small>{me.profile.designation}</small>
              </div>
            </Panel>
          )}
          <div className="quiet-note">
            <span>Every application is a beginning.</span>
            <p>
              Keep your profile current, prepare for your conversations, and
              make the most of what’s ahead.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
export function Jobs(p: Props) {
  const { data: jobs, error } = useData("/jobs", p.revision),
    { data: branches } = useData("/branches");
  const [search, setSearch] = useState(""),
    [type, setType] = useState("All types"),
    [only, setOnly] = useState(false),
    [selected, setSelected] = useState<any>(null),
    [busy, setBusy] = useState(false),
    [issue, setIssue] = useState(""),
    [company, setCompany] = useState("All companies"),
    [branch, setBranch] = useState(""),
    [cgpa, setCgpa] = useState(""),
    [deadline, setDeadline] = useState("");
  const student = p.user.role === "student";
  const filtered = jobs?.filter(
    (j: any) =>
      (j.title + " " + j.company + " " + j.location)
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (type === "All types" || j.employment_type === type) &&
      (!only || j.eligibility_reasons?.length === 0) &&
      (company === "All companies" || j.company === company) &&
      (!branch ||
        !j.branch_ids.length ||
        j.branch_ids.includes(Number(branch))) &&
      (!cgpa || j.min_cgpa <= Number(cgpa)) &&
      (!deadline || j.application_deadline.slice(0, 10) <= deadline),
  );
  async function act(path: string, method: string, data?: any) {
    setBusy(true);
    setIssue("");
    try {
      await api(path, method, data);
      setSelected(null);
      p.refresh(
        method === "POST"
          ? "Application submitted. Your next chapter is underway."
          : "Job updated",
      );
    } catch (e: any) {
      setIssue(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Heading
        title={
          student ? "Find your next beginning." : "Opportunities, in motion."
        }
        description={
          student
            ? "Explore campus opportunities. Find the one that feels like you."
            : "Manage roles, review applicants, and build your future team."
        }
        action={
          !student && p.user.role === "recruiter" ? (
            <Link to="/recruiter/post-job" className="button primary">
              <Plus size={16} />
              Post a job
            </Link>
          ) : undefined
        }
      />
      <div className="filter-bar">
        <div className="search">
          <Search size={17} />
          <input
            aria-label="Search opportunities"
            placeholder="Search roles, companies, or locations"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          aria-label="Employment type"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option>All types</option>
          <option>Full-time</option>
          <option>Internship</option>
        </select>
        <select
          aria-label="Company"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        >
          <option>All companies</option>
          {Array.from(new Set<string>(jobs?.map((j: any) => j.company))).map(
            (c) => (
              <option key={c}>{c}</option>
            ),
          )}
        </select>
        {student && (
          <label className="checkbox">
            <input
              type="checkbox"
              checked={only}
              onChange={(e) => setOnly(e.target.checked)}
            />
            Eligible for me
          </label>
        )}
      </div>
      <details className="more-filters">
        <summary>
          <SlidersHorizontal size={14} /> Academic & deadline filters
        </summary>
        <div className="form-grid">
          <Field label="Eligible branch">
            <select value={branch} onChange={(e) => setBranch(e.target.value)}>
              <option value="">All branches</option>
              {branches?.map((b: any) => (
                <option key={b.id} value={b.id}>
                  {b.code}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Maximum required CGPA">
            <input
              type="number"
              min={0}
              max={10}
              step="0.1"
              value={cgpa}
              onChange={(e) => setCgpa(e.target.value)}
            />
          </Field>
          <Field label="Deadline on or before">
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </Field>
        </div>
      </details>
      <State error={error} loading={!jobs}>
        <div className="list-meta">
          <span>{filtered?.length} opportunities</span>
          <span>Newest first</span>
        </div>
        <div className="job-grid">
          {filtered?.map((j: any) => (
            <motion.article
              layout
              initial={{ opacity: 1 }}
              className="job-card"
              key={j.id}
            >
              <div className="job-card-top">
                <Logo name={j.company} />
                <span>{j.company}</span>
                {student ? (
                  <span
                    className={`eligibility ${j.eligibility_reasons.length ? "muted" : ""}`}
                  >
                    {j.eligibility_reasons.length ? (
                      j.eligibility_reasons[0] === "Already applied" ? (
                        "Applied"
                      ) : (
                        "Review criteria"
                      )
                    ) : (
                      <>
                        <Check size={13} />
                        Eligible
                      </>
                    )}
                  </span>
                ) : (
                  <Badge status={j.status} />
                )}
              </div>
              <h2>
                <button
                  onClick={() => {
                    setSelected(j);
                    setIssue("");
                  }}
                >
                  {j.title}
                </button>
              </h2>
              <div className="job-location">
                <MapPin size={14} />
                {j.location}
                <span>·</span>
                {j.employment_type}
              </div>
              <div className="job-pay">
                {range(j)}
                <small>Annual CTC</small>
              </div>
              <div className="job-criteria">
                <span>{Number(j.min_cgpa).toFixed(1)}+ CGPA</span>
                <span>Class of {j.graduation_year}</span>
                <span>
                  {j.branch_ids.length
                    ? j.branch_ids
                        .map(
                          (b: number) =>
                            branches?.find((x: any) => x.id === b)?.code,
                        )
                        .join(", ")
                    : "All branches"}
                </span>
              </div>
              <div className="job-card-footer">
                <span>
                  <Clock3 size={13} />
                  Closes {day(j.application_deadline)}
                </span>
                <button
                  onClick={() => {
                    setSelected(j);
                    setIssue("");
                  }}
                >
                  View role <ArrowUpRight size={16} />
                </button>
              </div>
            </motion.article>
          ))}
        </div>
        {filtered?.length === 0 && (
          <Empty title="No opportunities match these filters">
            Try another search or broaden your filters.
          </Empty>
        )}
      </State>
      {selected && (
        <Drawer title="Opportunity details" close={() => setSelected(null)}>
          <div className="job-detail">
            <Logo name={selected.company} />
            <p>{selected.company}</p>
            <h3>{selected.title}</h3>
            <p>
              <MapPin size={15} />
              {selected.location} · {selected.employment_type}
            </p>
            <div className="detail-pay">
              {range(selected)}
              <small>Annual cost to company</small>
            </div>
            <h4>About this opportunity</h4>
            <p className="prewrap">{selected.description}</p>
            <h4>Eligibility</h4>
            <ul className="criteria-list">
              <li>
                Minimum CGPA <b>{selected.min_cgpa}</b>
              </li>
              <li>
                Maximum backlogs <b>{selected.max_backlogs}</b>
              </li>
              <li>
                Graduating class <b>{selected.graduation_year}</b>
              </li>
              <li>
                Apply by <b>{time(selected.application_deadline)}</b>
              </li>
            </ul>
            {student &&
              (selected.eligibility_reasons.length ? (
                <div className="notice">
                  <strong>Before you can apply</strong>
                  <ul>
                    {selected.eligibility_reasons.map((x: string) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                  <Link to="/student/profile">
                    Review your profile <ArrowUpRight size={13} />
                  </Link>
                </div>
              ) : (
                <div className="notice success">
                  <Check size={17} />
                  Your profile meets the eligibility criteria.
                </div>
              ))}
            {issue && (
              <p className="notice error" role="alert">
                {issue}
              </p>
            )}
            <div className="drawer-actions">
              {student ? (
                <button
                  className="button primary full"
                  disabled={busy || selected.eligibility_reasons.length > 0}
                  onClick={() => act(`/jobs/${selected.id}/apply`, "POST")}
                >
                  {busy ? "Submitting…" : "Submit application"}
                  <ArrowRight size={16} />
                </button>
              ) : (
                <>
                  {p.user.role === "recruiter" && (
                    <Link
                      className="button"
                      to={`/recruiter/post-job?edit=${selected.id}`}
                    >
                      Edit job
                    </Link>
                  )}
                  <Link
                    className="button primary"
                    to={`/${p.user.role}/applications?job=${selected.id}`}
                  >
                    View applicants <ArrowUpRight size={16} />
                  </Link>
                  <button
                    className="button"
                    disabled={busy}
                    onClick={() =>
                      act(`/jobs/${selected.id}`, "PATCH", {
                        status:
                          selected.status === "published"
                            ? "closed"
                            : "published",
                      })
                    }
                  >
                    {selected.status === "published"
                      ? "Close job"
                      : "Publish job"}
                  </button>
                </>
              )}
            </div>
          </div>
        </Drawer>
      )}
    </>
  );
}
export function Applications(p: Props) {
  const { data, error } = useData("/applications", p.revision),
    params = useParams();
  const [stage, setStage] = useState("all"),
    [search, setSearch] = useState(""),
    [selected, setSelected] = useState<any>(null),
    [issue, setIssue] = useState(""),
    [busy, setBusy] = useState(false);
  const job = params.jobId || new URLSearchParams(location.search).get("job");
  const filtered = data?.filter(
    (a: any) =>
      (stage === "all" || a.status === stage) &&
      (!job || a.job_id === Number(job)) &&
      (!params.applicationId || a.id === Number(params.applicationId)) &&
      (a.title + " " + a.student_name + " " + a.company)
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const transition: Record<string, string[]> = {
    applied: ["shortlisted", "rejected"],
    shortlisted: ["selected", "rejected"],
    interview: ["selected", "rejected"],
    selected: ["rejected"],
  };
  async function update(status: string) {
    setBusy(true);
    setIssue("");
    try {
      await api(`/applications/${selected.id}`, "PATCH", { status });
      p.refresh("Application updated");
      setSelected(null);
    } catch (e: any) {
      setIssue(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Heading
        title={
          p.user.role === "student"
            ? "Every step, in one place."
            : "Meet your next great hire."
        }
        description={
          p.user.role === "student"
            ? "Track your applications from that first click to your final offer."
            : "Review campus talent and move the right people forward."
        }
      />
      <div className="filter-bar">
        <div className="search">
          <Search size={17} />
          <input
            aria-label="Search applications"
            placeholder="Search applications"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          aria-label="Application stage"
          value={stage}
          onChange={(e) => setStage(e.target.value)}
        >
          {[
            "all",
            "applied",
            "shortlisted",
            "interview",
            "selected",
            "offered",
            "rejected",
            "withdrawn",
          ].map((s) => (
            <option key={s} value={s}>
              {s === "all" ? "All stages" : s[0].toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
      </div>
      <State error={error} loading={!data}>
        <Panel title={`${filtered?.length || 0} applications`}>
          <ApplicationTable
            data={filtered || []}
            role={p.user.role}
            action={(a) => {
              setSelected(a);
              setIssue("");
            }}
          />
        </Panel>
      </State>
      {selected && (
        <Drawer title="Application" close={() => setSelected(null)}>
          <div className="job-detail">
            <Badge status={selected.status} />
            <h3>{selected.title}</h3>
            <p>{selected.company}</p>
            <ul className="criteria-list">
              <li>
                Candidate <b>{selected.student_name}</b>
              </li>
              <li>
                Branch <b>{selected.branch}</b>
              </li>
              <li>
                CGPA <b>{selected.cgpa}</b>
              </li>
              <li>
                Applied <b>{day(selected.applied_at)}</b>
              </li>
            </ul>
            {selected.resume_url && (
              <a
                className="button"
                href={selected.resume_url}
                target="_blank"
                rel="noreferrer"
              >
                Open resume <ExternalLink size={15} />
              </a>
            )}
            {p.user.role !== "student" && (
              <>
                <h4>Move this application forward</h4>
                <div className="action-stack">
                  {(transition[selected.status] || []).map((s) => (
                    <button
                      className="button"
                      disabled={busy}
                      key={s}
                      onClick={() => update(s)}
                    >
                      {s === "shortlisted"
                        ? "Shortlist candidate"
                        : s === "selected"
                          ? "Select candidate"
                          : "Reject application"}
                      <ArrowRight size={15} />
                    </button>
                  ))}
                  {["shortlisted", "interview"].includes(selected.status) && (
                    <Link className="button primary" to="/recruiter/interviews">
                      Schedule an interview <CalendarDays size={15} />
                    </Link>
                  )}
                  {selected.status === "selected" && (
                    <Link className="button primary" to="/recruiter/offers">
                      Create an offer <ArrowRight size={15} />
                    </Link>
                  )}
                </div>
              </>
            )}
            {p.user.role === "student" &&
              ["applied", "shortlisted", "interview"].includes(
                selected.status,
              ) && (
                <button
                  disabled={busy}
                  className="button danger"
                  onClick={() => update("withdrawn")}
                >
                  Withdraw application
                </button>
              )}
            {issue && (
              <p className="notice error" role="alert">
                {issue}
              </p>
            )}
          </div>
        </Drawer>
      )}
    </>
  );
}
function FormDrawer({
  title,
  close,
  onSave,
  children,
}: {
  title: string;
  close: () => void;
  onSave: (d: any) => Promise<void>;
  children: React.ReactNode;
}) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <Drawer title={title} close={close}>
      <form
        className="drawer-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          const data = Object.fromEntries(new FormData(e.currentTarget));
          try {
            await onSave(data);
            close();
          } catch (e: any) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {children}
        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
        <button className="button primary full" disabled={busy}>
          {busy ? "Saving…" : "Save changes"}
          <Check size={16} />
        </button>
      </form>
    </Drawer>
  );
}
export function Interviews(p: Props) {
  const { data, error } = useData("/interviews", p.revision),
    { data: apps } = useData("/applications", p.revision);
  const [edit, setEdit] = useState<any>(null);
  const recruiter = p.user.role === "recruiter";
  return (
    <>
      <Heading
        title="Good conversations ahead."
        description="Your interview schedule, round details, and everything you need to prepare."
        action={
          recruiter ? (
            <button className="button primary" onClick={() => setEdit({})}>
              <Plus size={16} />
              Schedule interview
            </button>
          ) : undefined
        }
      />
      <State error={error} loading={!data}>
        {data?.length ? (
          <div className="interview-list">
            {data.map((i: any) => (
              <article className="interview-card" key={i.id}>
                <div className="date-block">
                  <strong>{utc(i.scheduled_at).getDate()}</strong>
                  <span>
                    {utc(i.scheduled_at).toLocaleString("en", {
                      month: "short",
                    })}
                  </span>
                </div>
                <div className="interview-info">
                  <Badge status={i.status} />
                  <h2>{i.type}</h2>
                  <p>
                    {i.company} · {i.title}
                  </p>
                  <small>
                    {recruiter ? `${i.student_name} · ` : ""}Round{" "}
                    {i.round_number}
                  </small>
                  {i.feedback && (
                    <p className="feedback">Feedback: {i.feedback}</p>
                  )}
                </div>
                <div className="interview-time">
                  <span>
                    <Clock3 size={15} />
                    {time(i.scheduled_at)}
                  </span>
                  <span>
                    <MapPin size={15} />
                    {i.location}
                  </span>
                  {recruiter && (
                    <button className="text-link" onClick={() => setEdit(i)}>
                      Update round <ArrowUpRight size={14} />
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <Panel title="Your schedule">
            <Empty title="A little space before your next step">
              Scheduled interviews will appear here.
            </Empty>
          </Panel>
        )}
      </State>
      {edit && (
        <FormDrawer
          title={edit.id ? "Update interview" : "Schedule interview"}
          close={() => setEdit(null)}
          onSave={async (d) => {
            await api(
              edit.id ? `/interviews/${edit.id}` : "/interviews",
              edit.id ? "PATCH" : "POST",
              {
                ...d,
                scheduled_at: d.scheduled_at
                  ? new Date(String(d.scheduled_at)).toISOString()
                  : undefined,
              },
            );
            p.refresh("Interview saved");
          }}
        >
          {!edit.id ? (
            <>
              <Field label="Application">
                <select name="application_id" required>
                  <option value="">Choose a shortlisted candidate</option>
                  {apps
                    ?.filter((a: any) =>
                      ["shortlisted", "interview"].includes(a.status),
                    )
                    .map((a: any) => (
                      <option key={a.id} value={a.id}>
                        {a.student_name} · {a.title}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label="Round number">
                <input
                  type="number"
                  name="round_number"
                  min={1}
                  max={20}
                  defaultValue={1}
                  required
                />
              </Field>
              <Field label="Interview type">
                <input
                  name="type"
                  placeholder="Technical interview"
                  required
                  maxLength={100}
                />
              </Field>
            </>
          ) : (
            <>
              <Field label="Status">
                <select name="status" defaultValue={edit.status}>
                  <option>scheduled</option>
                  <option>completed</option>
                  <option>cancelled</option>
                </select>
              </Field>
              <Field label="Feedback">
                <textarea
                  name="feedback"
                  defaultValue={edit.feedback || ""}
                  maxLength={5000}
                />
              </Field>
            </>
          )}
          <Field
            label={edit.id ? "Reschedule (optional)" : "Date & time"}
            hint="Times use your device’s local timezone."
          >
            <input
              type="datetime-local"
              name="scheduled_at"
              required={!edit.id}
            />
          </Field>
          <Field label="Meeting link or location">
            <input
              name="location"
              defaultValue={edit.location || ""}
              required
              maxLength={500}
            />
          </Field>
        </FormDrawer>
      )}
    </>
  );
}
export function Offers(p: Props) {
  const { data, error } = useData("/offers", p.revision),
    { data: apps } = useData("/applications", p.revision);
  const [open, setOpen] = useState(false),
    [issue, setIssue] = useState(""),
    [busy, setBusy] = useState<number | null>(null);
  return (
    <>
      <Heading
        title="A new chapter, on paper."
        description="Review compensation, joining dates, and the opportunities ahead."
        action={
          p.user.role === "recruiter" ? (
            <button className="button primary" onClick={() => setOpen(true)}>
              <Plus size={16} />
              Create an offer
            </button>
          ) : undefined
        }
      />
      {issue && (
        <p className="notice error" role="alert">
          {issue}
        </p>
      )}
      <State error={error} loading={!data}>
        {data?.length ? (
          <div className="job-grid">
            {data.map((o: any) => (
              <article className="offer-card" key={o.id}>
                <div className="job-card-top">
                  <Logo name={o.company} />
                  <span>{o.company}</span>
                  <Badge status={o.status} />
                </div>
                <h2>{o.title}</h2>
                {p.user.role !== "student" && <p>{o.student_name}</p>}
                <div className="offer-ctc">
                  {ctc(o.ctc)} <small>LPA</small>
                </div>
                <ul className="criteria-list">
                  <li>
                    Joining date <b>{day(o.joining_date)}</b>
                  </li>
                  <li>
                    Respond by <b>{time(o.response_deadline)}</b>
                  </li>
                </ul>
                {p.user.role === "student" &&
                  o.status === "pending" &&
                  (utc(o.response_deadline) > new Date() ? (
                    <div className="offer-actions">
                      {["accepted", "declined"].map((s) => (
                        <button
                          key={s}
                          className={
                            "button " + (s === "accepted" ? "primary" : "")
                          }
                          disabled={busy === o.id}
                          onClick={async () => {
                            setBusy(o.id);
                            setIssue("");
                            try {
                              await api(`/offers/${o.id}`, "PATCH", {
                                status: s,
                              });
                              p.refresh(`Offer ${s}`);
                            } catch (e: any) {
                              setIssue(e.message);
                            } finally {
                              setBusy(null);
                            }
                          }}
                        >
                          {s === "accepted" ? "Accept offer" : "Decline"}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="muted">Response deadline has passed.</p>
                  ))}
              </article>
            ))}
          </div>
        ) : (
          <Panel title="Offers">
            <Empty title="Something worth working toward">
              Your offers will appear here when a recruiter extends one.
            </Empty>
          </Panel>
        )}
      </State>
      {open && (
        <FormDrawer
          title="Create an offer"
          close={() => setOpen(false)}
          onSave={async (d) => {
            await api("/offers", "POST", {
              ...d,
              response_deadline: new Date(
                String(d.response_deadline),
              ).toISOString(),
            });
            p.refresh("Offer created");
          }}
        >
          <Field label="Selected candidate">
            <select name="application_id" required>
              <option value="">Choose a candidate</option>
              {apps
                ?.filter((a: any) => a.status === "selected")
                .map((a: any) => (
                  <option key={a.id} value={a.id}>
                    {a.student_name} · {a.title}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Annual CTC (₹ lakhs)">
            <input
              name="ctc"
              type="number"
              step="0.01"
              min={0}
              max={999999}
              required
            />
          </Field>
          <Field label="Joining date">
            <input name="joining_date" type="date" required />
          </Field>
          <Field label="Response deadline">
            <input name="response_deadline" type="datetime-local" required />
          </Field>
          <p className="form-hint">
            SEEK follows a single accepted-offer policy. Accepting an offer
            stops further applications.
          </p>
        </FormDrawer>
      )}
    </>
  );
}
export function Profile(p: Props) {
  const { data: me, error } = useData("/me", p.revision),
    { data: branches } = useData("/branches");
  const [busy, setBusy] = useState(false),
    [issue, setIssue] = useState("");
  return (
    <>
      <Heading
        title="Put your best self forward."
        description="A complete profile helps the right opportunities find you."
      />
      <State error={error} loading={!me}>
        {me && (
          <form
            className="profile-form"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setIssue("");
              try {
                await api(
                  "/profile",
                  "PUT",
                  Object.fromEntries(new FormData(e.currentTarget)),
                );
                p.refresh("Your profile is up to date");
              } catch (e: any) {
                setIssue(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <section className="form-section">
              <div>
                <h2>The person behind the profile</h2>
                <p>Your name and contact details.</p>
              </div>
              <div className="form-fields">
                <Field label="Full name">
                  <input
                    name="name"
                    defaultValue={me.name}
                    required
                    maxLength={100}
                  />
                </Field>
                <Field label="Email address">
                  <input value={me.email} disabled />
                </Field>
                <Field label="Phone">
                  <input
                    name="phone"
                    defaultValue={me.profile.phone || ""}
                    maxLength={30}
                    type="tel"
                  />
                </Field>
              </div>
            </section>
            <section className="form-section">
              <div>
                <h2>Your academic foundation</h2>
                <p>
                  Eligibility is checked against these details every time you
                  apply. Enter accurate information.
                </p>
              </div>
              <div className="form-fields">
                <Field label="Enrollment number">
                  <input value={me.profile.enrollment} disabled />
                </Field>
                <div className="form-grid">
                  <Field label="Branch">
                    <select
                      name="branch_id"
                      defaultValue={me.profile.branch_id}
                    >
                      {branches?.map((b: any) => (
                        <option value={b.id} key={b.id}>
                          {b.code}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Graduation year">
                    <input
                      name="graduation_year"
                      type="number"
                      min={2020}
                      max={2100}
                      defaultValue={me.profile.graduation_year}
                      required
                    />
                  </Field>
                  <Field label="CGPA (out of 10)">
                    <input
                      name="cgpa"
                      type="number"
                      min={0}
                      max={10}
                      step="0.01"
                      defaultValue={me.profile.cgpa}
                      required
                    />
                  </Field>
                  <Field label="Active backlogs">
                    <input
                      name="backlogs"
                      type="number"
                      min={0}
                      max={30}
                      defaultValue={me.profile.backlogs}
                      required
                    />
                  </Field>
                </div>
              </div>
            </section>
            <section className="form-section">
              <div>
                <h2>Show what you can do</h2>
                <p>
                  Share a public link to your resume. Check that recruiters can
                  open it without requesting access.
                </p>
              </div>
              <div className="form-fields">
                <Field label="Resume URL">
                  <input
                    name="resume_url"
                    type="url"
                    defaultValue={me.profile.resume_url || ""}
                    maxLength={1000}
                    placeholder="https://…"
                  />
                </Field>
                <Field label="Skills">
                  <textarea
                    name="skills"
                    defaultValue={me.profile.skills || ""}
                    maxLength={500}
                    placeholder="React, SQL, communication…"
                  />
                </Field>
              </div>
            </section>
            {issue && (
              <p className="notice error" role="alert">
                {issue}
              </p>
            )}
            <div className="form-end">
              <button className="button primary" disabled={busy}>
                {busy ? "Saving…" : "Save profile"}
                <Check size={16} />
              </button>
            </div>
          </form>
        )}
      </State>
    </>
  );
}
export function Company(p: Props) {
  const { data: me, error } = useData("/me", p.revision);
  const [issue, setIssue] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <>
      <Heading
        title="Introduce your team."
        description="Help students understand the company behind the opportunity."
      />
      <State error={error} loading={!me}>
        {me && (
          <form
            className="profile-form"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setIssue("");
              try {
                await api(
                  "/company",
                  "PUT",
                  Object.fromEntries(new FormData(e.currentTarget)),
                );
                p.refresh("Company updated");
              } catch (e: any) {
                setIssue(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <section className="form-section">
              <div>
                <h2>Your company</h2>
                <p>This information accompanies your campus opportunities.</p>
              </div>
              <div className="form-fields">
                <Field label="Company name">
                  <input
                    name="name"
                    defaultValue={me.profile.company}
                    required
                    maxLength={100}
                  />
                </Field>
                <Field label="Industry">
                  <input
                    name="industry"
                    defaultValue={me.profile.industry}
                    required
                    maxLength={100}
                  />
                </Field>
                <Field label="Website">
                  <input
                    name="website"
                    type="url"
                    defaultValue={me.profile.website || ""}
                    maxLength={1000}
                  />
                </Field>
                <Field label="About the company">
                  <textarea
                    name="description"
                    defaultValue={me.profile.description || ""}
                    maxLength={5000}
                  />
                </Field>
                {issue && <p className="notice error">{issue}</p>}
                <button className="button primary" disabled={busy}>
                  {busy ? "Saving…" : "Save company"}
                </button>
              </div>
            </section>
          </form>
        )}
      </State>
    </>
  );
}
export function Drives(p: Props) {
  const { data, error } = useData("/drives", p.revision);
  const [open, setOpen] = useState<any>(null),
    [issue, setIssue] = useState(""),
    [busy, setBusy] = useState<number | null>(null);
  return (
    <>
      <Heading
        title="Bring your campus plans together."
        description="Organize opportunities into clear, focused recruitment drives."
        action={
          p.user.role === "recruiter" ? (
            <button className="button primary" onClick={() => setOpen({})}>
              <Plus size={16} />
              Create drive
            </button>
          ) : undefined
        }
      />
      {issue && <p className="notice error">{issue}</p>}
      <State error={error} loading={!data}>
        <Panel title="Recruitment drives">
          {data?.length ? (
            <Table
              heads={["Drive", "Company", "Dates", "Jobs", "Status", "Action"]}
            >
              {data.map((d: any) => (
                <tr key={d.id}>
                  <td>
                    <strong>{d.title}</strong>
                  </td>
                  <td>{d.company}</td>
                  <td className="numeric">
                    {day(d.start_date)} – {day(d.end_date)}
                  </td>
                  <td className="numeric">{d.jobs}</td>
                  <td>
                    <Badge status={d.status} />
                  </td>
                  <td>
                    {d.status === "active" && p.user.role === "recruiter" && (
                      <button className="text-link" onClick={() => setOpen(d)}>
                        Edit
                      </button>
                    )}{" "}
                    {d.status === "active" && (
                      <button
                        className="text-link"
                        disabled={busy === d.id}
                        onClick={async () => {
                          setBusy(d.id);
                          setIssue("");
                          try {
                            await api(`/drives/${d.id}`, "PATCH", {
                              status: "closed",
                            });
                            p.refresh("Drive and its jobs closed");
                          } catch (e: any) {
                            setIssue(e.message);
                          } finally {
                            setBusy(null);
                          }
                        }}
                      >
                        Close drive
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </Table>
          ) : (
            <Empty title="Your first drive starts here">
              Create a drive, then add opportunities to it.
            </Empty>
          )}
        </Panel>
      </State>
      {open && (
        <FormDrawer
          title={
            open.id ? "Edit recruitment drive" : "Create a recruitment drive"
          }
          close={() => setOpen(null)}
          onSave={async (d) => {
            await api(
              open.id ? "/drives/" + open.id : "/drives",
              open.id ? "PUT" : "POST",
              d,
            );
            p.refresh("Recruitment drive saved");
          }}
        >
          <Field label="Drive title">
            <input
              name="title"
              defaultValue={open.title || ""}
              required
              maxLength={150}
              placeholder="Graduate hiring · Class of 2027"
            />
          </Field>
          <Field label="Start date">
            <input
              name="start_date"
              type="date"
              defaultValue={open.start_date || ""}
              required
            />
          </Field>
          <Field label="End date">
            <input
              name="end_date"
              type="date"
              defaultValue={open.end_date || ""}
              required
            />
          </Field>
        </FormDrawer>
      )}
    </>
  );
}
export function PostJob(p: Props) {
  const { data: drives, error } = useData("/drives", p.revision),
    { data: branches } = useData("/branches");
  const [step, setStep] = useState(0),
    [d, setD] = useState<any>({
      title: "",
      drive_id: "",
      description: "",
      location: "",
      employment_type: "Full-time",
      ctc_min: 6,
      ctc_max: 12,
      min_cgpa: 7,
      max_backlogs: 0,
      graduation_year: new Date().getFullYear() + 1,
      branch_ids: [],
      application_deadline: "",
      status: "published",
    }),
    [issue, setIssue] = useState(""),
    [busy, setBusy] = useState(false);
  const nav = useNavigate();
  const editId = new URLSearchParams(location.search).get("edit");
  useEffect(() => {
    if (editId)
      api("/jobs/" + editId)
        .then((j) => {
          const date = utc(j.application_deadline);
          setD({
            ...j,
            application_deadline: new Date(
              date.getTime() - date.getTimezoneOffset() * 60000,
            )
              .toISOString()
              .slice(0, 16),
          });
        })
        .catch((e) => setIssue(e.message));
  }, [editId]);
  const input = (key: string, type = "text", extra: any = {}) => (
    <input
      type={type}
      value={d[key]}
      onChange={(e) => setD({ ...d, [key]: e.target.value })}
      required
      {...extra}
    />
  );
  return (
    <>
      <Heading
        title="Open a door for someone."
        description="Create a thoughtful opportunity for your next campus hire."
      />
      <State error={error} loading={!drives}>
        <div className="post-layout">
          <ol className="form-steps">
            {[
              "The opportunity",
              "Compensation",
              "Who can apply",
              "Review & publish",
            ].map((s, i) => (
              <li
                key={s}
                className={step === i ? "active" : step > i ? "done" : ""}
              >
                {step > i ? (
                  <Check size={16} />
                ) : (
                  <span className="step-number">{i + 1}</span>
                )}
                {s}
              </li>
            ))}
          </ol>
          <form
            className="post-form"
            onSubmit={async (e) => {
              e.preventDefault();
              setIssue("");
              if (step < 3) {
                setStep(step + 1);
                return;
              }
              setBusy(true);
              try {
                await api(
                  editId ? "/jobs/" + editId : "/jobs",
                  editId ? "PUT" : "POST",
                  {
                    ...d,
                    application_deadline: new Date(
                      d.application_deadline,
                    ).toISOString(),
                  },
                );
                p.refresh(
                  editId ? "Opportunity updated" : "Opportunity created",
                );
                nav("/recruiter/jobs");
              } catch (e: any) {
                setIssue(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {step === 0 && (
              <>
                <h2>Start with the opportunity.</h2>
                <Field label="Recruitment drive">
                  <select
                    value={d.drive_id}
                    required
                    onChange={(e) => setD({ ...d, drive_id: e.target.value })}
                  >
                    <option value="">Choose an active drive</option>
                    {drives
                      ?.filter((x: any) => x.status === "active")
                      .map((x: any) => (
                        <option key={x.id} value={x.id}>
                          {x.title}
                        </option>
                      ))}
                  </select>
                </Field>
                {!drives?.some((x: any) => x.status === "active") && (
                  <p>
                    <Link to="/recruiter/drives">
                      Create an active drive first.
                    </Link>
                  </p>
                )}
                <Field label="Job title">
                  {input("title", "text", { maxLength: 150 })}
                </Field>
                <Field label="Location">
                  {input("location", "text", {
                    maxLength: 100,
                    placeholder: "Bengaluru, Remote…",
                  })}
                </Field>
                <Field label="Job description">
                  <textarea
                    value={d.description}
                    required
                    rows={9}
                    minLength={1}
                    maxLength={10000}
                    onChange={(e) =>
                      setD({ ...d, description: e.target.value })
                    }
                    placeholder="Responsibilities, skills, and what candidates can expect…"
                  />
                </Field>
              </>
            )}
            {step === 1 && (
              <>
                <h2>Make the value clear.</h2>
                <Field label="Employment type">
                  <select
                    value={d.employment_type}
                    onChange={(e) =>
                      setD({ ...d, employment_type: e.target.value })
                    }
                  >
                    <option>Full-time</option>
                    <option>Internship</option>
                  </select>
                </Field>
                <div className="form-grid">
                  <Field label="Minimum CTC (₹ lakhs / year)">
                    {input("ctc_min", "number", {
                      min: 0,
                      max: 999999,
                      step: ".01",
                    })}
                  </Field>
                  <Field label="Maximum CTC (₹ lakhs / year)">
                    {input("ctc_max", "number", {
                      min: d.ctc_min,
                      max: 999999,
                      step: ".01",
                    })}
                  </Field>
                </div>
                <p className="form-hint">
                  Use annualized compensation for internships too, so students
                  can compare opportunities consistently.
                </p>
              </>
            )}
            {step === 2 && (
              <>
                <h2>Define the right fit.</h2>
                <div className="form-grid">
                  <Field label="Minimum CGPA">
                    {input("min_cgpa", "number", {
                      min: 0,
                      max: 10,
                      step: ".01",
                    })}
                  </Field>
                  <Field label="Maximum backlogs">
                    {input("max_backlogs", "number", { min: 0, max: 30 })}
                  </Field>
                  <Field label="Graduation year">
                    {input("graduation_year", "number", {
                      min: 2020,
                      max: 2100,
                    })}
                  </Field>
                </div>
                <fieldset>
                  <legend>Eligible branches</legend>
                  <p className="form-hint">
                    Leave all unchecked to allow every branch.
                  </p>
                  <div className="branch-options">
                    {branches?.map((b: any) => (
                      <label className="checkbox" key={b.id}>
                        <input
                          type="checkbox"
                          checked={d.branch_ids.includes(b.id)}
                          onChange={(e) =>
                            setD({
                              ...d,
                              branch_ids: e.target.checked
                                ? [...d.branch_ids, b.id]
                                : d.branch_ids.filter(
                                    (id: number) => id !== b.id,
                                  ),
                            })
                          }
                        />
                        {b.code}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <Field label="Application deadline">
                  {input("application_deadline", "datetime-local")}
                </Field>
              </>
            )}
            {step === 3 && (
              <>
                <h2>Ready for its next chapter.</h2>
                <div className="review-job">
                  <h3>{d.title}</h3>
                  <p>
                    {d.location} · {d.employment_type}
                  </p>
                  <div className="detail-pay">{range(d)}</div>
                  <ul className="criteria-list">
                    <li>
                      Minimum CGPA <b>{d.min_cgpa}</b>
                    </li>
                    <li>
                      Maximum backlogs <b>{d.max_backlogs}</b>
                    </li>
                    <li>
                      Graduation year <b>{d.graduation_year}</b>
                    </li>
                    <li>
                      Branches{" "}
                      <b>
                        {d.branch_ids.length
                          ? branches
                              ?.filter((b: any) => d.branch_ids.includes(b.id))
                              .map((b: any) => b.code)
                              .join(", ")
                          : "All branches"}
                      </b>
                    </li>
                    <li>
                      Deadline{" "}
                      <b>{new Date(d.application_deadline).toLocaleString()}</b>
                    </li>
                  </ul>
                  <p className="prewrap">{d.description}</p>
                </div>
                <Field label="Publication">
                  <select
                    value={d.status}
                    onChange={(e) => setD({ ...d, status: e.target.value })}
                  >
                    <option value="published">Publish now</option>
                    <option value="draft">Save as draft</option>
                  </select>
                </Field>
              </>
            )}
            {issue && (
              <p className="notice error" role="alert">
                {issue}
              </p>
            )}
            <div className="form-navigation">
              {step > 0 && (
                <button
                  type="button"
                  className="button"
                  onClick={() => setStep(step - 1)}
                >
                  Back
                </button>
              )}
              <button className="button primary" disabled={busy}>
                {busy
                  ? "Saving…"
                  : step === 3
                    ? d.status === "draft"
                      ? "Save draft"
                      : "Publish opportunity"
                    : "Continue"}
                <ArrowRight size={16} />
              </button>
            </div>
          </form>
        </div>
      </State>
    </>
  );
}
function exportCSV(data: any[]) {
  const fields = Object.keys(data[0] || {});
  const safe = (v: any) => {
    let text = String(v ?? "");
    if (/^[=+@\-\t\r]/.test(text)) text = "'" + text;
    return '"' + text.replaceAll('"', '""') + '"';
  };
  const csv = [fields, ...data.map((row) => fields.map((k) => row[k]))]
    .map((row) => row.map(safe).join(","))
    .join("\r\n");
  const url = URL.createObjectURL(
    new Blob(["\uFEFF" + csv], { type: "text/csv" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "seek-placement-report.csv";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function Admin(p: Props & { page: string }) {
  const endpoint = p.page === "audit-logs" ? "audit" : p.page;
  const { data, error } = useData(
    p.page === "branches" ? "/branches" : `/admin/${endpoint}`,
    p.revision,
  );
  const [search, setSearch] = useState(""),
    [issue, setIssue] = useState(""),
    [open, setOpen] = useState(false),
    [busy, setBusy] = useState<number | null>(null);
  useEffect(() => {
    setSearch("");
    setIssue("");
  }, [p.page]);
  async function update(kind: string, id: number, status: string) {
    setBusy(id);
    setIssue("");
    try {
      await api(`/admin/${kind}/${id}`, "PATCH", { status });
      p.refresh("Account status updated");
    } catch (e: any) {
      setIssue(e.message);
    } finally {
      setBusy(null);
    }
  }
  if (p.page === "analytics")
    return (
      <>
        <Heading
          title="The bigger picture, made clear."
          description="Follow your campus placement season with numbers grounded in real records."
          action={
            data ? (
              <button
                className="button"
                onClick={() => exportCSV(data.branches)}
              >
                <Download size={16} />
                Export report
              </button>
            ) : undefined
          }
        />
        <State error={error} loading={!data}>
          {data && (
            <>
              <div className="stats">
                <Stat
                  label="Registered students"
                  value={data.totals.students}
                  sub={`${data.totals.placed} with accepted offers`}
                />
                <Stat
                  label="Placement rate"
                  value={`${data.totals.students ? ((data.totals.placed / data.totals.students) * 100).toFixed(1) : "0"}%`}
                  sub="Unique placed / registered students"
                />
                <Stat
                  label="Median accepted CTC"
                  value={
                    data.ctc.median === null
                      ? "—"
                      : `${ctc(data.ctc.median)} LPA`
                  }
                  sub={
                    data.ctc.max === null
                      ? "No accepted offers"
                      : `Highest ${ctc(data.ctc.max)} LPA`
                  }
                />
                <Stat
                  label="Live opportunities"
                  value={data.totals.jobs}
                  sub={`${data.totals.drives} active recruitment drives`}
                />
              </div>
              {data.totals.pending > 0 && (
                <Link to="/admin/recruiters" className="approval-callout">
                  <ShieldIcon />
                  <div>
                    <strong>
                      {data.totals.pending} recruiter{" "}
                      {data.totals.pending === 1 ? "is" : "are"} waiting for
                      approval
                    </strong>
                    <span>
                      Review company details to open their campus workspace.
                    </span>
                  </div>
                  <span>
                    Review requests <ArrowRight size={16} />
                  </span>
                </Link>
              )}
              <div className="analytics-grid">
                <Panel title="Placement by branch">
                  <div className="bar-chart">
                    {data.branches.map((b: any) => (
                      <div className="bar-row" key={b.code}>
                        <span>{b.code}</span>
                        <div>
                          <i
                            style={{
                              width: `${b.students ? (b.placed / b.students) * 100 : 0}%`,
                            }}
                          />
                        </div>
                        <strong>
                          {b.students
                            ? ((b.placed / b.students) * 100).toFixed(0)
                            : 0}
                          %
                        </strong>
                        <small>
                          {b.placed} / {b.students}
                        </small>
                      </div>
                    ))}
                    <p>
                      Accepted offers · percentage of registered students in
                      each branch
                    </p>
                  </div>
                </Panel>
                <Panel title="Season at a glance">
                  <div className="summary-list">
                    {[
                      ["Active recruiters", data.totals.recruiters],
                      ["Applications received", data.totals.applications],
                      ["Students placed", data.totals.placed],
                      [
                        "Average accepted CTC",
                        data.ctc.average === null
                          ? "—"
                          : `${ctc(data.ctc.average)} LPA`,
                      ],
                    ].map(([l, v]) => (
                      <div key={l}>
                        <span>{l}</span>
                        <strong>{v}</strong>
                      </div>
                    ))}
                  </div>
                </Panel>
              </div>
              <Panel title="Company participation">
                <Table
                  heads={["Company", "Jobs", "Applications", "Accepted offers"]}
                >
                  {data.companies.map((c: any) => (
                    <tr key={c.name}>
                      <td>
                        <strong>{c.name}</strong>
                      </td>
                      <td className="numeric">{c.jobs}</td>
                      <td className="numeric">{c.applications}</td>
                      <td className="numeric">{c.accepted}</td>
                    </tr>
                  ))}
                </Table>
              </Panel>
              <AuditPreview revision={p.revision} />
            </>
          )}
        </State>
      </>
    );
  const titles: Record<string, [string, string]> = {
    recruiters: [
      "Open the door to new partners.",
      "Review recruiter accounts before they can access your campus.",
    ],
    students: [
      "Your campus talent, together.",
      "Student profiles, academics, and account access.",
    ],
    companies: [
      "The teams building futures.",
      "Companies participating in your campus placement program.",
    ],
    "audit-logs": [
      "A clear record of every action.",
      "The latest 500 account, application, and recruitment events.",
    ],
    branches: [
      "Every discipline, represented.",
      "Manage the branches used in student profiles and job eligibility.",
    ],
  };
  const filtered = Array.isArray(data)
    ? data.filter((r: any) =>
        Object.values(r).join(" ").toLowerCase().includes(search.toLowerCase()),
      )
    : [];
  return (
    <>
      <Heading
        title={titles[p.page][0]}
        description={titles[p.page][1]}
        action={
          p.page === "branches" ? (
            <button className="button primary" onClick={() => setOpen(true)}>
              <Plus size={16} />
              Add branch
            </button>
          ) : undefined
        }
      />
      <div className="filter-bar">
        <div className="search">
          <Search size={17} />
          <input
            aria-label="Search records"
            placeholder="Search this list"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      {issue && <p className="notice error">{issue}</p>}
      <State error={error} loading={!data}>
        <Panel
          title={`${filtered.length} ${p.page === "audit-logs" ? "events" : p.page}`}
        >
          {!filtered.length ? (
            <Empty title="Nothing matches your search" />
          ) : p.page === "recruiters" ? (
            <Table heads={["Recruiter", "Company", "Status", "Actions"]}>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td>
                    <strong>{r.name}</strong>
                    <small>{r.email}</small>
                  </td>
                  <td>
                    {r.company}
                    <small>{r.designation}</small>
                  </td>
                  <td>
                    <Badge status={r.status} />
                  </td>
                  <td>
                    <div className="inline-actions">
                      {r.status !== "active" && (
                        <button
                          disabled={busy === r.id}
                          className="button small"
                          onClick={() => update("recruiters", r.id, "active")}
                        >
                          Approve
                        </button>
                      )}
                      {r.status === "pending" && (
                        <button
                          disabled={busy === r.id}
                          className="text-link"
                          onClick={() => update("recruiters", r.id, "rejected")}
                        >
                          Reject
                        </button>
                      )}
                      {r.status === "active" && (
                        <button
                          disabled={busy === r.id}
                          className="text-link"
                          onClick={() =>
                            update("recruiters", r.id, "suspended")
                          }
                        >
                          Suspend
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </Table>
          ) : p.page === "students" ? (
            <Table
              heads={[
                "Student",
                "Branch",
                "CGPA",
                "Graduation",
                "Status",
                "Action",
              ]}
            >
              {filtered.map((s) => (
                <tr key={s.id}>
                  <td>
                    <strong>{s.name}</strong>
                    <small>
                      {s.enrollment} · {s.email}
                    </small>
                  </td>
                  <td>{s.branch}</td>
                  <td className="numeric">{Number(s.cgpa).toFixed(2)}</td>
                  <td className="numeric">{s.graduation_year}</td>
                  <td>
                    <Badge status={s.status} />
                  </td>
                  <td>
                    <button
                      disabled={busy === s.id}
                      className="text-link"
                      onClick={() =>
                        update(
                          "students",
                          s.id,
                          s.status === "active" ? "suspended" : "active",
                        )
                      }
                    >
                      {s.status === "active" ? "Suspend" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </Table>
          ) : p.page === "companies" ? (
            <Table heads={["Company", "Industry", "Drives", "Website"]}>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td>
                    <strong>{c.name}</strong>
                  </td>
                  <td>{c.industry}</td>
                  <td className="numeric">{c.drives}</td>
                  <td>
                    {c.website ? (
                      <a href={c.website} target="_blank" rel="noreferrer">
                        Visit <ExternalLink size={13} />
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </Table>
          ) : p.page === "branches" ? (
            <Table heads={["Code", "Branch"]}>
              {filtered.map((b) => (
                <tr key={b.id}>
                  <td className="numeric">{b.code}</td>
                  <td>{b.name}</td>
                </tr>
              ))}
            </Table>
          ) : (
            <AuditTable data={filtered} />
          )}
        </Panel>
      </State>
      {open && (
        <FormDrawer
          title="Add an academic branch"
          close={() => setOpen(false)}
          onSave={async (d) => {
            await api("/admin/branches", "POST", d);
            p.refresh("Branch added");
          }}
        >
          <Field label="Branch code">
            <input name="code" required maxLength={12} />
          </Field>
          <Field label="Branch name">
            <input name="name" required maxLength={100} />
          </Field>
        </FormDrawer>
      )}
    </>
  );
}
function ShieldIcon() {
  return <CheckCircle2 size={23} />;
}
function AuditTable({ data }: { data: any[] }) {
  return (
    <Table heads={["Action", "Performed by", "Record", "Time"]}>
      {data.map((a) => (
        <tr key={a.id}>
          <td>
            {a.action.replaceAll(".", " · ")}
            {a.details && <small>{a.details}</small>}
          </td>
          <td>{a.actor}</td>
          <td>
            {a.entity_type} #{a.entity_id}
          </td>
          <td className="numeric">{time(a.created_at)}</td>
        </tr>
      ))}
    </Table>
  );
}
function AuditPreview({ revision }: { revision: number }) {
  const { data } = useData("/admin/audit", revision);
  return (
    <Panel title="Recent activity" to="/admin/audit-logs">
      <AuditTable data={data?.slice(0, 4) || []} />
    </Panel>
  );
}
