// FastMix's job processor on Railway. Everything else runs on Vercel (see vercel.json): the website and the
// worker API there, with Postgres, Redis and audio storage at their own providers.
// Apply with `railway config plan` then `railway config apply` (see README "Deploying").
// No secrets are written here: every value uses preserve(), so it is set once in the Railway dashboard
// (the same values as the Vercel project) and kept on every apply.
import { type BuildConfig, defineRailway, github, preserve, project, service } from "railway/iac";

const REPO = "belysenatete/FastMix";

export default defineRailway(() => {
  // The worker image builds from the repository root so it can carry database/ for migrations.
  const workerBuild: BuildConfig = { builder: "DOCKERFILE", dockerfilePath: "worker/Dockerfile", watchPatterns: ["/worker/**", "/database/**"] };

  const processor = service("processor", {
    source: github(REPO, { branch: "main" }),
    build: workerBuild,
    deploy: {
      // Brings the schema up to date and sets the bucket's CORS rule before the new processor starts.
      preDeployCommand: ["python -m app.release"],
      startCommand: "python -m app.worker",
      restartPolicyType: "ALWAYS",
    },
    env: {
      DATABASE_URL: preserve(),
      REDIS_URL: preserve(),
      S3_ENDPOINT_URL: preserve(),
      S3_PUBLIC_ENDPOINT_URL: preserve(),
      S3_ACCESS_KEY: preserve(),
      S3_SECRET_KEY: preserve(),
      S3_BUCKET: preserve(),
      S3_REGION: preserve(),
      S3_ADDRESSING_STYLE: preserve(),
      // The website's address, e.g. https://fast-mix-nate-c54c.vercel.app, so browsers may upload and play audio.
      S3_CORS_ORIGINS: preserve(),
      ROEX_API_KEY: preserve(),
      ALERT_WEBHOOK_URL: preserve(),
      ALERT_WATCHDOG_IN_PROCESSOR: "true",
    },
  });

  return project("FastMix", { resources: [processor] });
});
