export function logClient(tag: string, details: unknown) {
  if (typeof window === "undefined") return;
  console.log(`[CLIENT ${tag}]`, details);
  if (process.env.NODE_ENV !== "development") return;
  const body = {
    tag,
    details:
      details instanceof Error
        ? { name: details.name, message: details.message, stack: details.stack }
        : typeof details === "object" && details !== null
        ? details
        : String(details),
    userAgent: navigator.userAgent,
    time: new Date().toISOString(),
  };
  fetch("/api/log", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => {});
}
