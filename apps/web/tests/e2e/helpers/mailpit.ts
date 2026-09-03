const MAILPIT_API = "http://localhost:8025/api/v1";

export async function getMailpitMessages() {
  const res = await fetch(`${MAILPIT_API}/messages`);
  return res.json();
}

export async function deleteAllMailpitMessages() {
  await fetch(`${MAILPIT_API}/messages`, { method: "DELETE" });
}
