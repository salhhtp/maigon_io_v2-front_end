import serverless from "serverless-http";

import { createServer } from "../../server";

// Ensure the function is bundled as ESM so import.meta is available
export const config = {
  nodeModuleFormat: "esm" as const,
};

const binaryTypes = [
  "application/pdf",
  "application/octet-stream",
  "application/zip",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export const handler = serverless(createServer(), {
  binary: binaryTypes,
});
