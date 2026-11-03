// Creates (once) the Paddle sandbox notification destination for FastMix's webhook and stores its signing secret
// in credentials.md (PADDLE_WEBHOOK_SECRET) and web/.env.local. Also copies the sandbox keys into web/.env.local.
// Never prints a secret. Run from Windows: node brand/payments/paddle-webhook.cjs https://<site>/api/billing/webhook
const fs = require("fs");
const CREDENTIALS = "D:/FastMix/credentials.md";
const ENV_LOCAL = "D:/FastMix/web/.env.local";
const destination = process.argv[2];
if (!destination) { console.error("Pass the webhook URL"); process.exit(1); }
const creds = fs.readFileSync(CREDENTIALS, "utf8");
const read = (name, text = creds) => (text.match(new RegExp(`^${name}=(.+)$`, "m")) || [])[1]?.trim();
const key = read("PADDLE_API_KEY");
const events = ["subscription.created", "subscription.updated", "subscription.activated", "subscription.canceled", "subscription.past_due", "subscription.paused", "subscription.resumed", "subscription.trialing", "transaction.completed"];

async function call(method, path, body) {
  const r = await fetch("https://sandbox-api.paddle.com" + path, { method, headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: body && JSON.stringify(body) });
  const j = await r.json();
  if (!r.ok) throw new Error(`${method} ${path}: ${r.status} ${j.error?.code}`);
  return j.data;
}

function setLine(file, name, value) {
  let text = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  const line = `${name}=${value}`;
  text = new RegExp(`^${name}=.*$`, "m").test(text) ? text.replace(new RegExp(`^${name}=.*$`, "m"), line) : `${text.replace(/\s*$/, "")}\n${line}\n`;
  fs.writeFileSync(file, text);
}

(async () => {
  const existing = (await call("GET", "/notification-settings")).find((n) => n.destination === destination);
  const setting = existing ?? await call("POST", "/notification-settings", { description: "FastMix webhook", type: "url", destination, subscribed_events: events, api_version: 1, include_sensitive_fields: false, traffic_source: "all" });
  if (existing) await call("PATCH", `/notification-settings/${existing.id}`, { subscribed_events: events, active: true });
  if (!read("PADDLE_WEBHOOK_SECRET")) {
    // Add the secret under the Paddle (sandbox) heading in credentials.md.
    const text = fs.readFileSync(CREDENTIALS, "utf8");
    const updated = text.replace(/^(PADDLE_CLIENT_TOKEN=.*)$/m, `$1\nPADDLE_WEBHOOK_SECRET=${setting.endpoint_secret_key}`);
    fs.writeFileSync(CREDENTIALS, updated === text ? `${text.replace(/\s*$/, "")}\nPADDLE_WEBHOOK_SECRET=${setting.endpoint_secret_key}\n` : updated);
  }
  const secret = read("PADDLE_WEBHOOK_SECRET", fs.readFileSync(CREDENTIALS, "utf8"));
  setLine(ENV_LOCAL, "PADDLE_API_KEY", key);
  setLine(ENV_LOCAL, "PADDLE_WEBHOOK_SECRET", secret);
  setLine(ENV_LOCAL, "NEXT_PUBLIC_PADDLE_CLIENT_TOKEN", read("PADDLE_CLIENT_TOKEN"));
  setLine(ENV_LOCAL, "NEXT_PUBLIC_PADDLE_ENV", "sandbox");
  console.log(`notification setting ${setting.id} → ${destination} (${existing ? "existing" : "created"}), ${events.length} events; secret stored`);
})().catch((e) => { console.error(e.message); process.exit(1); });
