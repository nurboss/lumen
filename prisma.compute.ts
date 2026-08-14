import { defineComputeConfig } from "@prisma/compute-sdk/config";

export default defineComputeConfig({
  app: {
    name: "pet-shop",
    framework: "nextjs",
    env: ".env",
  },
});
