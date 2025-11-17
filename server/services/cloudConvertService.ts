import CloudConvert from "cloudconvert";

type ConvertOptions = {
  buffer: Buffer;
  fileName: string;
  inputFormat: string;
  outputFormat: string;
};

const API_KEY = process.env.CLOUDCONVERT_API_KEY;

let client: CloudConvert | null = null;

function getClient() {
  if (!API_KEY) {
    return null;
  }
  if (!client) {
    client = new CloudConvert(API_KEY);
  }
  return client;
}

export async function convertDocument(options: ConvertOptions): Promise<Buffer | null> {
  const cloudConvert = getClient();
  if (!cloudConvert) {
    return null;
  }

  try {
    const job = await cloudConvert.jobs.create({
      tasks: {
        "import-file": {
          operation: "import/base64",
          file: options.buffer.toString("base64"),
          filename: options.fileName,
        },
        "convert-file": {
          operation: "convert",
          input: ["import-file"],
          input_format: options.inputFormat,
          output_format: options.outputFormat,
        },
        "export-file": {
          operation: "export/url",
          input: ["convert-file"],
          inline: false,
          archive_multiple_files: false,
        },
      },
    });

    if (!job.id) {
      throw new Error("CloudConvert job missing identifier");
    }

    const completedJob = await cloudConvert.jobs.wait(job.id);
    const exportTask = completedJob.tasks?.find((task) =>
      task.name === "export-file" && task.status === "finished",
    );

    const file = exportTask?.result?.files?.[0];
    if (!file?.url) {
      throw new Error("CloudConvert export file missing");
    }

    const response = await fetch(file.url);
    if (!response.ok) {
      throw new Error(`Failed to download converted file (${response.status})`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error("[cloudconvert] Conversion failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
