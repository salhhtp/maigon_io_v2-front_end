import path from "node:path";
import fs from "node:fs/promises";
import os from "node:os";
import { downloadIngestionFile } from "./storageService";
import { convertDocument } from "./cloudConvertService";

export interface BuildTemplateOptions {
  ingestionId: string;
  fileName: string;
  bucket?: string;
}

export async function buildDocxTemplateFromIngestion(
  options: BuildTemplateOptions,
): Promise<{ localPath: string; cleanup: () => Promise<void> } | null> {
  try {
    const downloaded = await downloadIngestionFile({
      ingestionId: options.ingestionId,
      fileName: options.fileName,
      bucket: options.bucket,
    });

    if (!downloaded) {
      return null;
    }

    const buffer = await fs.readFile(downloaded.localPath);
    const extension = path.extname(options.fileName).toLowerCase();
    const isDocx = extension === ".docx";

    if (isDocx) {
      return {
        localPath: downloaded.localPath,
        cleanup: async () => {
          await fs.rm(downloaded.localPath, { force: true });
        },
      };
    }

    if (process.env.CLOUDCONVERT_API_KEY) {
      const converted = await convertDocument({
        buffer,
        fileName: options.fileName,
        inputFormat: extension.replace(".", ""),
        outputFormat: "docx",
      });

      if (converted) {
        const tempPath = path.join(
          os.tmpdir(),
          `docx-template-${options.ingestionId}.docx`,
        );
        await fs.writeFile(tempPath, converted);
        await fs.rm(downloaded.localPath, { force: true });
        return {
          localPath: tempPath,
          cleanup: async () => {
            await fs.rm(tempPath, { force: true });
          },
        };
      }
    }

    await fs.rm(downloaded.localPath, { force: true });
    return null;
  } catch (error) {
    console.error("[template] Failed to build DOCX template", error);
    return null;
  }
}
