export async function api(path: string, method = "GET", data?: unknown) {
  const response = await fetch("/api" + path, {
    method,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  const result = await response
    .json()
    .catch(() => ({
      error:
        "The server did not return a valid response. Check that the API is running.",
    }));
  if (response.status === 401 && path !== "/auth/login")
    window.dispatchEvent(new Event("seek-session-ended"));
  if (!response.ok)
    throw new Error(result.error || "Request failed. Please try again.");
  return result;
}
export const utc = (value: string) =>
  new Date(value.includes("T") ? value : value.replace(" ", "T") + "Z");
export const day = (value: string) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(value.length === 10 ? new Date(value + "T00:00:00") : utc(value));
export const time = (value: string) =>
  new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    day: "numeric",
    month: "short",
  }).format(utc(value));
export const ctc = (n: number) =>
  `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
export const initials = (s: string) =>
  s
    .split(" ")
    .map((x) => x[0])
    .slice(0, 2)
    .join("");
