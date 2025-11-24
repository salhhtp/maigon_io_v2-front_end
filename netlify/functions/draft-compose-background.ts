import type { Handler } from "@netlify/functions";
import { processDraftJob } from "../../server/routes/agent";

export const config = {
  type: "background" as const,
};

export const handler: Handler = async (event) => {
  const payload = event.body ? JSON.parse(event.body) : {};
  const jobId = payload?.jobId as string | undefined;

  if (!jobId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "jobId is required" }),
    };
  }

  try {
    await processDraftJob(jobId);
    return {
      statusCode: 200,
      body: JSON.stringify({ status: "ok" }),
    };
  } catch (error) {
    console.error("[netlify] draft compose background failed", {
      jobId,
      message: error instanceof Error ? error.message : String(error),
    });
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "compose job failed" }),
    };
  }
};
