import { type ReactNode, useEffect, useState } from "react";
import { X, ArrowUpRight, Inbox } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "./api";
export function useData(path: string, revision = 0) {
  const [result, setResult] = useState<{
    path: string;
    data: any;
    error: string;
  }>({ path: "", data: null, error: "" });
  useEffect(() => {
    let alive = true;
    api(path)
      .then((data) => {
        if (alive) setResult({ path, data, error: "" });
      })
      .catch((e) => {
        if (alive) setResult({ path, data: null, error: e.message });
      });
    return () => {
      alive = false;
    };
  }, [path, revision]);
  return result.path === path ? result : { data: null, error: "" };
}
export function State({
  error,
  loading,
  children,
}: {
  error?: string;
  loading?: boolean;
  children: ReactNode;
}) {
  if (error)
    return (
      <div className="notice error" role="alert">
        {error}
        <button onClick={() => location.reload()}>Reload page</button>
      </div>
    );
  if (loading)
    return (
      <div className="loading" role="status">
        Loading your workspace<span>•••</span>
      </div>
    );
  return <>{children}</>;
}
export function Badge({ status }: { status: string }) {
  return (
    <span className={`badge ${status}`}>
      <i />
      {status.replaceAll("_", " ")}
    </span>
  );
}
export function Heading({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
export function Empty({
  title = "Nothing here yet",
  children,
}: {
  title?: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <Inbox size={25} />
      <h3>{title}</h3>
      <p>{children || "Your updates will appear here."}</p>
    </div>
  );
}
export function Panel({
  title,
  children,
  link,
  to,
  className = "",
}: {
  title: string;
  children: ReactNode;
  link?: string;
  to?: string;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-heading">
        <h2>{title}</h2>
        {to && (
          <Link className="text-link" to={to}>
            {link || "View all"}
            <ArrowUpRight size={14} />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function Drawer({
  title,
  children,
  close,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
}) {
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const el = document.getElementById("seek-drawer")!;
    el.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "Tab") {
        const items = Array.from(
          el.querySelectorAll<HTMLElement>(
            'a,button,input,select,textarea,[tabindex="0"]',
          ),
        ).filter((e) => !e.hasAttribute("disabled"));
        const first = items[0],
          last = items.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  return (
    <div className="overlay" onClick={close}>
      <section
        id="seek-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="drawer"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="drawer-heading">
          <h2>{title}</h2>
          <button
            className="icon-button"
            aria-label="Close panel"
            onClick={close}
          >
            <X />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
export function Table({
  heads,
  children,
}: {
  heads: string[];
  children: ReactNode;
}) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {heads.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
