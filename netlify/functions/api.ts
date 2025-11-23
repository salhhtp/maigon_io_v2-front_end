import serverless from "serverless-http";

import { createServer } from "../../server";

// Ensure the function is bundled as ESM so import.meta is available
export const config = {
  nodeModuleFormat: "esm" as const,
};

export const handler = serverless(createServer());
