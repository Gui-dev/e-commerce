const MAILPIT_API = "http://localhost:8025/api/v1";

export async function getMailpitMessages() {
  const res = await fetch(`${MAILPIT_API}/messages`);
  if (!res.ok) throw new Error(`Mailpit API error: ${res.status}`);
  return res.json();
}

export async function deleteAllMailpitMessages() {
  const res = await fetch(`${MAILPIT_API}/messages`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Mailpit API error: ${res.status}`);
}
