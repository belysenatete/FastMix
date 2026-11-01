// FastMix on Railway: the website, the worker API, the job processor, Postgres, Redis and an audio bucket.
// Apply with `railway config plan` then `railway config apply` (see README "Deploying to Railway").
// Secrets are never written here: INTERNAL_API_SECRET is a shared variable and the rest use preserve(),
// so their values are set once in the Railway dashboard and kept on every apply.
import { type BuildConfig, bucket, defineRailway, github, postgres, preserve, project, redis, ref, service } from "railway/iac";

const REPO = "belysenatete/FastMix";

export default defineRailway((ctx) => {
  const db = postgres("postgres");
  const cache = redis("redis");
  const audio = bucket("audio", { region: "iad" });

  const storage = {
    S3_BUCKET: ref(audio, "BUCKET"),
    S3_ENDPOINT_URL: ref(audio, "ENDPOINT"),
    S3_PUBLIC_ENDPOINT_URL: ref(audio, "ENDPOINT"),
    S3_ACCESS_KEY: ref(audio, "ACCESS_KEY_ID"),
    S3_SECRET_KEY: ref(audio, "SECRET_ACCESS_KEY"),
    S3_REGION: ref(audio, "REGION"),
    S3_ADDRESSING_STYLE: "virtual",
  };
  const shared = {
    DATABASE_URL: db.env.DATABASE_URL,
    REDIS_URL: cache.env.REDIS_URL,
    INTERNAL_API_SECRET: ctx.shared.INTERNAL_API_SECRET,
    ALERT_WEBHOOK_URL: preserve(),
  };
  // The worker image builds from the repository root so it can carry database/ for migrations.
  const workerBuild: BuildConfig = { builder: "DOCKERFILE", dockerfilePath: "worker/Dockerfile", watchPatterns: ["/worker/**", "/database/**"] };

  const api = service("api", {
    source: github(REPO, { branch: "main" }),
    build: workerBuild,
    deploy: {
      // "::" listens on IPv6 too, which Railway's private network uses.
      startCommand: "uvicorn app.api:app --host :: --port 8000",
      preDeployCommand: ["python -m app.release"],
      healthcheckPath: "/health",
      healthcheckTimeout: 60,
      restartPolicyType: "ON_FAILURE",
      restartPolicyMaxRetries: 10,
    },
    env: {
      ...shared,
      ...storage,
      PORT: "8000",
      WEB_ORIGIN: "https://${{web.RAILWAY_PUBLIC_DOMAIN}}",
      S3_CORS_ORIGINS: "https://${{web.RAILWAY_PUBLIC_DOMAIN}}",
      ROEX_ENABLED: "true",
      FASTMIX_PREVIEWS_PER_DAY: "40",
    },
  });

  const processor = service("processor", {
    source: github(REPO, { branch: "main" }),
    build: workerBuild,
    deploy: {
      startCommand: "python -m app.worker",
      restartPolicyType: "ALWAYS",
    },
    env: {
      ...shared,
      ...storage,
      ROEX_API_KEY: preserve(),
    },
  });

  const web = service("web", {
    source: github(REPO, { branch: "main", rootDirectory: "web" }),
    build: { builder: "RAILPACK", watchPatterns: ["/web/**"] },
    deploy: { restartPolicyType: "ON_FAILURE", restartPolicyMaxRetries: 10 },
    env: {
      DATABASE_URL: db.env.DATABASE_URL,
      INTERNAL_API_SECRET: ctx.shared.INTERNAL_API_SECRET,
      WORKER_API_URL: "http://${{api.RAILWAY_PRIVATE_DOMAIN}}:8000",
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: preserve(),
      CLERK_SECRET_KEY: preserve(),
      ALERT_WEBHOOK_URL: preserve(),
    },
  });

  return project("FastMix", { resources: [web, api, processor, db, cache, audio] });
});
