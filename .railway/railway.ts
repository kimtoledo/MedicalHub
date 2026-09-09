import { defineRailway, preserve, project, service } from "railway/iac";

// Last resort for a per-service CaC repo. Prefer one .railway file for the
// project and drop this if you later combine services into that file.
export const partial = "api";

export default defineRailway(() => {
  const api = service("api", {
    build: "npm run build --workspace @dentra/api",
    start: "npm run start --workspace @dentra/api",
    healthcheck: "/v1/health",
    regions: {
      "asia-southeast1-eqsg3a": 1,
    },
    variables: {
      NODE_ENV: preserve(),
      DATABASE_URL: preserve(),
      BETTER_AUTH_SECRET: preserve(),
      BETTER_AUTH_URL: preserve(),
      NEXT_PUBLIC_APP_URL: preserve(),
      CORS_ORIGINS: preserve(),
    },
    // builder from CaC: "NIXPACKS"
  });
  return project("MedicalHub", {
    resources: [api],
  });
});
