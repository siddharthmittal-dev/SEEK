import { useState, useEffect, lazy, Suspense, type FormEvent } from "react";
import {
  Routes,
  Route,
  Link,
  NavLink,
  useNavigate,
  useLocation,
  Navigate,
} from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  GraduationCap,
  BriefcaseBusiness,
  LayoutDashboard,
  CalendarDays,
  FileText,
  UserRound,
  LogOut,
  Menu,
  X,
  Building2,
  ChartNoAxesCombined,
  ShieldCheck,
  ScrollText,
  Plus,
  Eye,
  EyeOff,
  ChevronRight,
} from "lucide-react";
import { motion } from "framer-motion";
import { api, initials } from "./api";
import { Field, State, useData } from "./ui";
const Orbit = lazy(() => import("./Orbit"));
import {
  Dashboard,
  Jobs,
  Applications,
  Interviews,
  Offers,
  Profile,
  Drives,
  PostJob,
  Admin,
  Company,
} from "./views";
export const home = (role: string) =>
  `/${role}/${role === "admin" ? "analytics" : "dashboard"}`;
function Brand() {
  return (
    <Link className="brand" to="/" aria-label="SEEK home">
      <svg width="27" height="27" viewBox="0 0 28 28" aria-hidden="true">
        <path
          d="M4 23 23 4M4 4h19v19M4 13l10 10"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        />
      </svg>
      <span>
        seek<span className="brand-dot">.</span>
      </span>
    </Link>
  );
}
function Landing() {
  const { data } = useData("/public");
  return (
    <div className="landing">
      <header>
        <Brand />
        <nav>
          <a href="#how">How SEEK works</a>
          <a href="#portals">For your campus</a>
          <Link to="/auth/login">
            Sign in <ArrowUpRight size={16} />
          </Link>
        </nav>
      </header>
      <main>
        <section className="hero">
          <div className="hero-copy">
            <h1>
              Your next chapter.
              <br />
              Starts here.
            </h1>
            <p>
              One campus. A world of possibilities. Find your fit, meet your
              future team, and turn ambition into an offer.
            </p>
            <div className="hero-actions">
              <Link className="button primary" to="/auth/register">
                Find your opportunity <ArrowRight size={17} />
              </Link>
              <Link className="text-link" to="/auth/login">
                Enter your workspace <ArrowUpRight size={16} />
              </Link>
            </div>
            <div className="hero-note">
              <span className="live-dot" />
              Student Employment & Employer Connect
            </div>
          </div>
          <div className="hero-art">
            <Suspense fallback={<div className="orbit" />}>
              <Orbit />
            </Suspense>
            <div className="orbit-caption">
              <span>Potential, connected.</span>
              <span>Campus → Career</span>
            </div>
          </div>
        </section>
        <section id="how" className="landing-process">
          <h2>A clearer path forward.</h2>
          <div className="steps">
            <div>
              <span>Discover</span>
              <p>
                Opportunities that match your branch, academics, and graduation
                year.
              </p>
            </div>
            <ChevronRight />
            <div>
              <span>Connect</span>
              <p>
                Apply once. Follow every shortlist, interview, and decision in
                one place.
              </p>
            </div>
            <ChevronRight />
            <div>
              <span>Begin</span>
              <p>Review your offer and take the next step with confidence.</p>
            </div>
          </div>
        </section>
        <section id="portals" className="portals">
          <div>
            <h2>
              Three perspectives.
              <br />
              One placement journey.
            </h2>
            <p>Built around the people who make campus recruitment happen.</p>
            {data && (
              <p className="dataset-note">
                Current database: {data.jobs} open jobs across {data.companies}{" "}
                companies. Initial records are illustrative demo data.
              </p>
            )}
          </div>
          <div className="portal-list">
            {[
              [
                GraduationCap,
                "Students",
                "Your opportunities, applications, and next steps.",
                "student",
              ],
              [
                BriefcaseBusiness,
                "Recruiters",
                "Meet emerging talent. Build your next team.",
                "recruiter",
              ],
              [
                ShieldCheck,
                "Placement teams",
                "Keep your entire placement season in view.",
                "admin",
              ],
            ].map(([Icon, title, desc, role]: any) => (
              <Link
                key={role}
                to={
                  role === "admin"
                    ? "/auth/login"
                    : `/auth/register?role=${role}`
                }
              >
                <Icon size={21} />
                <div>
                  <h3>{title}</h3>
                  <p>{desc}</p>
                </div>
                <ArrowUpRight size={20} />
              </Link>
            ))}
          </div>
        </section>
      </main>
      <footer>
        <Brand />
        <span>From potential to possibility.</span>
        <span>Campus recruitment, thoughtfully connected.</span>
      </footer>
    </div>
  );
}
function Auth({ onLogin }: { onLogin: (u: any) => void }) {
  const nav = useNavigate(),
    location = useLocation();
  const registration = location.pathname.endsWith("register");
  const [role, setRole] = useState(
    new URLSearchParams(location.search).get("role") === "recruiter"
      ? "recruiter"
      : "student",
  );
  const [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [visible, setVisible] = useState(false);
  const { data: branches } = useData("/branches");
  useEffect(() => {
    setError("");
    setMessage("");
  }, [registration]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const d = Object.fromEntries(new FormData(e.currentTarget));
    try {
      if (registration) {
        const r = await api("/auth/register", "POST", { ...d, role });
        setMessage(r.message);
      } else {
        const user = await api("/auth/login", "POST", d);
        onLogin(user);
        nav(home(user.role));
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-page">
      <div className="auth-story">
        <Brand />
        <div>
          <h1>
            Good things
            <br />
            are ahead.
          </h1>
          <p>
            Your talent deserves the right opportunity.
            <br />
            Let’s bring the two together.
          </p>
          <div className="auth-path">
            <span>Campus</span>
            <div />
            <ArrowRight size={20} />
            <span>Career</span>
          </div>
        </div>
        <small>SEEK · Student Employment & Employer Connect</small>
      </div>
      <main className="auth-form">
        <Link className="back" to="/">
          Back to SEEK <ArrowUpRight size={15} />
        </Link>
        <h2>
          {registration ? "Make your next move." : "Your next step awaits."}
        </h2>
        <p>
          {registration
            ? "Create your SEEK account."
            : "Sign in to your placement workspace."}
        </p>
        {message ? (
          <div className="notice success" role="status">
            {message}
            <Link to="/auth/login" className="button primary">
              Continue to sign in <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          <form onSubmit={submit}>
            {registration && (
              <>
                <div className="tabs">
                  {["student", "recruiter"].map((r) => (
                    <button
                      key={r}
                      type="button"
                      className={role === r ? "active" : ""}
                      onClick={() => setRole(r)}
                    >
                      {r === "student" ? "I’m a student" : "I’m a recruiter"}
                    </button>
                  ))}
                </div>
                <Field label="Full name">
                  <input
                    name="name"
                    required
                    maxLength={100}
                    autoComplete="name"
                  />
                </Field>
              </>
            )}
            <Field label="Email address">
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@college.edu"
              />
            </Field>
            <Field
              label="Password"
              hint={
                registration ? "At least 10 characters; maximum 72." : undefined
              }
            >
              <div className="password">
                <input
                  name="password"
                  type={visible ? "text" : "password"}
                  required
                  minLength={registration ? 10 : 1}
                  maxLength={72}
                  autoComplete={
                    registration ? "new-password" : "current-password"
                  }
                />
                <button
                  type="button"
                  aria-label={visible ? "Hide password" : "Show password"}
                  onClick={() => setVisible(!visible)}
                >
                  {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </Field>
            {registration &&
              (role === "student" ? (
                <>
                  <Field label="Enrollment number">
                    <input name="enrollment" required maxLength={40} />
                  </Field>
                  <div className="form-grid">
                    <Field label="Branch">
                      <select name="branch_id" required>
                        <option value="">Choose branch</option>
                        {branches?.map((b: any) => (
                          <option key={b.id} value={b.id}>
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
                        defaultValue={new Date().getFullYear() + 1}
                        required
                      />
                    </Field>
                  </div>
                </>
              ) : (
                <>
                  <Field label="Company name">
                    <input name="company_name" required maxLength={100} />
                  </Field>
                  <Field label="Industry">
                    <input name="industry" required maxLength={100} />
                  </Field>
                  <Field label="Designation">
                    <input name="designation" required maxLength={100} />
                  </Field>
                  <p className="form-hint">
                    Recruiter accounts require approval from the placement
                    office.
                  </p>
                </>
              ))}
            {error && (
              <p className="notice error" role="alert">
                {error}
              </p>
            )}
            <button className="button primary full" disabled={busy}>
              {busy
                ? "Please wait…"
                : registration
                  ? "Create account"
                  : "Sign in"}
              <ArrowRight size={17} />
            </button>
          </form>
        )}
        <p className="auth-switch">
          {registration ? "Already have an account?" : "New to SEEK?"}{" "}
          <Link to={registration ? "/auth/login" : "/auth/register"}>
            {registration ? "Sign in" : "Create an account"}
          </Link>
        </p>
        <div className="demo-hint">
          Trying the project? Demo account details are in the included setup
          guide. All sample companies and profiles are fictional.
        </div>
      </main>
    </div>
  );
}
const studentNav = [
  ["dashboard", "Overview", LayoutDashboard],
  ["jobs", "Opportunities", BriefcaseBusiness],
  ["applications", "Applications", FileText],
  ["interviews", "Interviews", CalendarDays],
  ["offers", "Offers", ShieldCheck],
  ["profile", "My profile", UserRound],
];
const recruiterNav = [
  ["dashboard", "Overview", LayoutDashboard],
  ["drives", "Recruitment drives", Building2],
  ["jobs", "Job listings", BriefcaseBusiness],
  ["applications", "Applicants", FileText],
  ["interviews", "Interviews", CalendarDays],
  ["offers", "Offers", ShieldCheck],
  ["company", "Company profile", Building2],
];
const adminNav = [
  ["analytics", "Overview", ChartNoAxesCombined],
  ["recruiters", "Recruiter approvals", ShieldCheck],
  ["students", "Students", GraduationCap],
  ["companies", "Companies", Building2],
  ["drives", "Recruitment drives", CalendarDays],
  ["jobs", "Job listings", BriefcaseBusiness],
  ["applications", "Applications", FileText],
  ["branches", "Branches", GraduationCap],
  ["audit-logs", "Audit trail", ScrollText],
];
function Workspace({
  user,
  setUser,
}: {
  user: any;
  setUser: (u: any) => void;
}) {
  const [open, setOpen] = useState(false),
    [revision, setRevision] = useState(0),
    [toast, setToast] = useState("");
  const location = useLocation();
  const nav = useNavigate();
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 5000);
    return () => clearTimeout(id);
  }, [toast]);
  const refresh = (text = "Changes saved") => {
    setRevision((r) => r + 1);
    setToast(text);
  };
  const items =
    user.role === "student"
      ? studentNav
      : user.role === "recruiter"
        ? recruiterNav
        : adminNav;
  const props = { user, revision, refresh };
  return (
    <div className="workspace">
      <aside className={open ? "sidebar open" : "sidebar"}>
        <div className="sidebar-brand">
          <Brand />
          <button
            className="mobile-only icon-button"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          >
            <X />
          </button>
        </div>
        <div className="workspace-label">
          <span className="workspace-symbol">
            <GraduationCap size={19} />
          </span>
          <div>
            <strong>Campus workspace</strong>
            <small>
              {user.role === "admin"
                ? "Placement office"
                : user.role === "student"
                  ? "Student portal"
                  : "Recruiter portal"}
            </small>
          </div>
        </div>
        <nav aria-label="Workspace">
          {items.map(([path, label, Icon]: any) => (
            <NavLink key={path} to={`/${user.role}/${path}`}>
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        {user.role === "recruiter" && (
          <Link className="button sidebar-create" to="/recruiter/post-job">
            <Plus size={16} />
            Post a new job
          </Link>
        )}
        <div className="sidebar-bottom">
          <p>
            Great beginnings
            <br />
            start with a connection.
          </p>
          <span>SEEK · Class of {new Date().getFullYear() + 1}</span>
          <div className="account">
            <span className="avatar">{initials(user.name)}</span>
            <div>
              <strong>{user.name}</strong>
              <small>
                {user.role === "admin"
                  ? "Administrator"
                  : user.role === "recruiter"
                    ? "Talent partner"
                    : "Student"}
              </small>
            </div>
            <button
              aria-label="Sign out"
              className="icon-button"
              onClick={async () => {
                try {
                  await api("/auth/logout", "POST");
                  setUser(null);
                  nav("/auth/login");
                } catch (e: any) {
                  setToast(e.message);
                }
              }}
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      {open && <div className="mobile-scrim" onClick={() => setOpen(false)} />}
      <div className="main-area">
        <header className="topbar">
          <button
            className="mobile-only icon-button"
            aria-label="Open navigation"
            onClick={() => setOpen(true)}
          >
            <Menu />
          </button>
          <span>
            Workspace <ChevronRight size={13} />{" "}
            {(items.find(([p]) =>
              location.pathname.includes("/" + p),
            )?.[1] as string) || "Post a job"}
          </span>
          <span className="season">
            <span className="live-dot" />
            Placement season {new Date().getFullYear()}–
            {String(new Date().getFullYear() + 1).slice(2)}
          </span>
        </header>
        <main className="canvas">
          <Routes>
            <Route path="dashboard" element={<Dashboard {...props} />} />
            <Route path="jobs" element={<Jobs {...props} />} />
            <Route
              path="jobs/:jobId/applicants"
              element={<Applications {...props} />}
            />
            <Route path="applications" element={<Applications {...props} />} />
            <Route
              path="applications/:applicationId"
              element={<Applications {...props} />}
            />
            <Route path="interviews" element={<Interviews {...props} />} />
            <Route path="offers" element={<Offers {...props} />} />
            <Route
              path="profile"
              element={
                user.role === "student" ? (
                  <Profile {...props} />
                ) : (
                  <Navigate to={home(user.role)} />
                )
              }
            />
            <Route path="drives" element={<Drives {...props} />} />
            <Route
              path="company"
              element={
                user.role === "recruiter" ? (
                  <Company {...props} />
                ) : (
                  <Navigate to={home(user.role)} />
                )
              }
            />
            <Route
              path="post-job"
              element={
                user.role === "recruiter" ? (
                  <PostJob {...props} />
                ) : (
                  <Navigate to={home(user.role)} />
                )
              }
            />
            {[
              "analytics",
              "recruiters",
              "students",
              "companies",
              "audit-logs",
              "branches",
            ].map((p) => (
              <Route
                key={p}
                path={p}
                element={
                  user.role === "admin" ? (
                    <Admin {...props} page={p} />
                  ) : (
                    <Navigate to={home(user.role)} />
                  )
                }
              />
            ))}
            <Route path="*" element={<Navigate to={home(user.role)} />} />
          </Routes>
        </main>
        <footer className="workspace-footer">
          <span>SEEK / Campus to career</span>
          <span>
            Sample data is illustrative. Your changes are saved to MySQL.
          </span>
        </footer>
      </div>
      {toast && (
        <div className="toast" role="status">
          {toast}
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
export default function App() {
  const [user, setUser] = useState<any>(null),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    const ended = () => setUser(null);
    window.addEventListener("seek-session-ended", ended);
    api("/me")
      .then(setUser)
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => window.removeEventListener("seek-session-ended", ended);
  }, []);
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route
        path="/auth/*"
        element={
          user ? <Navigate to={home(user.role)} /> : <Auth onLogin={setUser} />
        }
      />
      {["student", "recruiter", "admin"].map((role) => (
        <Route
          key={role}
          path={`/${role}/*`}
          element={
            loading ? (
              <State loading>
                <span />
              </State>
            ) : !user ? (
              <Navigate to="/auth/login" />
            ) : user.role !== role ? (
              <Navigate to={home(user.role)} />
            ) : (
              <Workspace user={user} setUser={setUser} />
            )
          }
        />
      ))}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
