// Copies the Paddle settings from credentials.md into the linked Vercel project (production and preview) through
// the Vercel CLI, passing each value on stdin so it is never printed. Run from the repo root after `vercel link`.
const fs = require("fs");
const { spawnSync } = require("child_process");
const creds = fs.readFileSync("D:/FastMix/credentials.md", "utf8");
const read = (name) => (creds.match(new RegExp(`^${name}=(.+)$`, "m")) || [])[1]?.trim();
const vars = [
  ["PADDLE_API_KEY", read("PADDLE_API_KEY"), true],
  ["PADDLE_WEBHOOK_SECRET", read("PADDLE_WEBHOOK_SECRET"), true],
  ["NEXT_PUBLIC_PADDLE_CLIENT_TOKEN", read("PADDLE_CLIENT_TOKEN"), false],
  ["NEXT_PUBLIC_PADDLE_ENV", process.argv[2] || "sandbox", false],
];
// Optional names after the environment limit the run, e.g. `node vercel-env.cjs sandbox NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`.
const only = process.argv.slice(3);
for (const [name, value, sensitive] of vars.filter(([name]) => !only.length || only.includes(name))) {
  if (!value) { console.log(`${name}: missing in credentials.md, skipped`); continue; }
  for (const target of ["production", "preview"]) {
    spawnSync("npx", ["vercel", "env", "rm", name, target, "--yes"], { shell: true, stdio: "ignore" });
    // --no-sensitive/--yes: without them the CLI asks whether a public "*TOKEN*" value should be secret, and fails with no terminal.
    const args = ["vercel", "env", "add", name, target, sensitive ? "--sensitive" : "--no-sensitive", "--yes"];
    const result = spawnSync("npx", args, { input: value, shell: true, encoding: "utf8" });
    const ok = result.status === 0;
    console.log(`${name} (${target}): ${ok ? "set" : "FAILED " + (result.stderr || "").split("\n").filter((l) => /Error/i.test(l)).join(" ").replaceAll(value, "<hidden>")}`);
  }
}
