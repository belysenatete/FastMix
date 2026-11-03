// Creates FastMix's products and prices in Paddle (idempotent by product custom_data.plan_key) and prints their price IDs.
// Run from Windows (node brand/payments/paddle-catalog.cjs); sandbox API. Reads PADDLE_API_KEY from credentials.md and never prints it.
// Keep amounts in step with web/src/lib/plans.ts and EURO with EURO_COUNTRIES there.
// Reads PADDLE_API_KEY from D:/FastMix/credentials.md; never prints it.
const fs = require("fs");
const key = fs.readFileSync("D:/FastMix/credentials.md", "utf8").match(/^PADDLE_API_KEY=(.+)$/m)[1].trim();
const API = "https://sandbox-api.paddle.com";
async function call(method, path, body) {
  const r = await fetch(API + path, { method, headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: body && JSON.stringify(body) });
  const j = await r.json();
  if (!r.ok) throw new Error(`${method} ${path}: ${r.status} ${JSON.stringify(j.error)}`);
  return j.data;
}
// Euro area (incl. Bulgaria from 2026), euro-using microstates and French overseas departments/collectivities.
const EURO = ["AT","BE","BG","HR","CY","EE","FI","FR","DE","GR","IE","IT","LV","LT","LU","MT","NL","PT","SK","SI","ES","MC","AD","SM","VA","GP","MQ","GF","RE","YT","PM","BL","MF"];
const cents = (n) => String(Math.round(n * 100));
const price = (amount, interval, name) => ({
  description: name, name,
  unit_price: { amount: cents(amount), currency_code: "USD" },
  unit_price_overrides: [{ country_codes: EURO, unit_price: { amount: cents(amount), currency_code: "EUR" } }],
  tax_mode: "internal",
  ...(interval ? { billing_cycle: { interval, frequency: 1 } } : {}),
  quantity: { minimum: 1, maximum: 1 },
});
const catalog = [
  { plan: "lite", name: "FastMix Lite", description: "2 full-length tracks a month, MP3 downloads.", prices: { monthly: price(14.99, "month", "Lite monthly"), yearly: price(149, "year", "Lite yearly") } },
  { plan: "pro", name: "FastMix Pro", description: "6 full-length tracks a month, MP3 downloads.", prices: { monthly: price(34.99, "month", "Pro monthly"), yearly: price(349, "year", "Pro yearly") } },
  { plan: "artist", name: "FastMix Artist", description: "10 full-length tracks a month, MP3 and WAV downloads, priority support.", prices: { monthly: price(49.99, "month", "Artist monthly"), yearly: price(499, "year", "Artist yearly") } },
  { plan: "lifetime", name: "FastMix Lifetime", description: "One payment: 4 full-length tracks every month for life, MP3 and WAV downloads. Limited to the first 100 buyers.", prices: { once: price(249, null, "Lifetime") } },
];
(async () => {
  const existing = await call("GET", "/products?per_page=200&include=prices&status=active");
  const out = {};
  for (const item of catalog) {
    let product = existing.find((p) => p.custom_data?.plan_key === item.plan);
    if (!product) product = await call("POST", "/products", { name: item.name, description: item.description, tax_category: "standard", custom_data: { plan_key: item.plan } });
    const prices = product.prices || [];
    out[item.plan] = {};
    for (const [billing, body] of Object.entries(item.prices)) {
      let p = prices.find((x) => x.custom_data?.billing === billing && x.status === "active");
      if (!p) p = await call("POST", "/prices", { ...body, product_id: product.id, custom_data: { plan_key: item.plan, billing } });
      out[item.plan][billing] = p.id;
    }
  }
  console.log(JSON.stringify(out, null, 2));
})().catch((e) => { console.error(e.message); process.exit(1); });
