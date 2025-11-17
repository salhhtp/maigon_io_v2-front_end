import type { Request, Response, NextFunction } from "express";
import express from "express";
import multer from "multer";
import crypto from "node:crypto";
import path from "node:path";
import fs from "node:fs";
import {
  uploadToStorage,
  removeLocalFile,
  DEFAULT_BUCKET,
} from "../services/storageService";
import { extractDocument } from "../services/documentExtractionService";
import {
  createIngestionRecord,
  saveExtractionResult,
  getIngestionRecord,
} from "../services/ingestionRepository";
import { getSupabaseAdminClient } from "../lib/supabaseAdmin";

const uploadDirectory = path.join(process.cwd(), "tmp", "ingestion-uploads");
fs.mkdirSync(uploadDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDirectory);
  },
  filename: (_req, file, cb) => {
    const uniquePrefix = Date.now();
    const safeName = file.originalname.replace(/\s+/g, "-");
    cb(null, `${uniquePrefix}-${safeName}`);
  },
});

const uploader = multer({ storage });

export const ingestionRouter = express.Router();

async function checkPaygAllowance(userId: string) {
  const supabase = getSupabaseAdminClient();

  const { data: planRow, error: planError } = await supabase
    .from("user_plans")
    .select("plan_type")
    .eq("user_id", userId)
    .maybeSingle<{ plan_type: string | null }>();

  if (planError) {
    console.error("[ingestion] Failed to load user plan", planError);
    return { allowed: true, balance: 0, planType: null } as const;
  }

  const planType = planRow?.plan_type ?? null;
  if (planType !== "pay_as_you_go") {
    return { allowed: true, balance: 0, planType } as const;
  }

  const { data: balanceRow, error: balanceError } = await supabase
    .from("user_payg_balances")
    .select("credits_balance")
    .eq("user_id", userId)
    .maybeSingle<{ credits_balance: number | null }>();

  if (balanceError) {
    console.error("[ingestion] Failed to load PAYG balance", balanceError);
    return { allowed: false, balance: 0, planType } as const;
  }

  const balance = balanceRow?.credits_balance ?? 0;
  return { allowed: balance > 0, balance, planType } as const;
}

ingestionRouter.post(
  "/",
  uploader.single("file"),
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.file) {
      res.status(400).json({ error: "File is required" });
      return;
    }

    const ingestionId = crypto.randomUUID();
    const contentType = req.file.mimetype || "application/octet-stream";

    try {
      console.info("[ingestion] Upload started", {
        originalName: req.file.originalname,
        size: req.file.size,
      });

      const userId = (req.body?.userId as string | undefined) ?? null;
      const userProfileId =
        (req.body?.userProfileId as string | undefined) ?? userId ?? null;

      if (userProfileId) {
        const allowance = await checkPaygAllowance(userProfileId);
        if (!allowance.allowed) {
          res.status(402).json({
            error: "payg_insufficient_credits",
            message: "No reviews remaining. Purchase additional credits to continue.",
          });
          await removeLocalFile(req.file.path);
          return;
        }
      }

      const storageResult = await uploadToStorage({
        localFilePath: req.file.path,
        originalName: req.file.originalname,
        ingestionId,
        contentType,
      });

      const ingestionRecord = await createIngestionRecord({
        ingestionId,
        storageBucket: storageResult.bucket,
        storagePath: storageResult.path,
        originalName: req.file.originalname,
        mimeType: contentType,
        fileSize: req.file.size,
        userId: userProfileId ?? undefined,
      });

      console.info("[ingestion] Upload stored", {
        ingestionId,
        bucket: storageResult.bucket,
        path: storageResult.path,
      });

      res.status(201).json({
        ingestionId,
        file: {
          originalName: req.file.originalname,
          mimeType: contentType,
          size: req.file.size,
        },
        storage: storageResult,
        status: ingestionRecord.status,
        record: ingestionRecord,
      });
    } catch (error) {
      next(error);
    } finally {
      await removeLocalFile(req.file.path);
    }
  },
);

ingestionRouter.post(
  "/:ingestionId/extract",
  async (req: Request, res: Response, next: NextFunction) => {
    const { ingestionId } = req.params;
    const bucket =
      (req.body?.bucket as string | undefined) ??
      (req.query.bucket as string | undefined) ??
      DEFAULT_BUCKET;

    try {
      console.info("[ingestion] Extraction requested", {
        ingestionId,
        bucket,
      });
      const result = await extractDocument({ ingestionId, bucket });
      const record = await saveExtractionResult({
        ingestionId,
        extraction: result,
      });

      console.info("[ingestion] Extraction completed", {
        ingestionId,
        status: record.status,
        strategy: result.strategy,
        needsOcr: result.needsOcr,
        warnings: result.warnings,
      });

      res.json({ status: record.status, ingestionId, result, record });
    } catch (error) {
      console.error("[ingestion] Extraction failed", {
        ingestionId,
        error,
      });
      next(error);
    }
  },
);

ingestionRouter.get(
  "/:ingestionId",
  async (req: Request, res: Response, next: NextFunction) => {
    const { ingestionId } = req.params;
    try {
      const record = await getIngestionRecord(ingestionId);
      if (!record) {
        res.status(404).json({ error: "Ingestion not found" });
        return;
      }
      res.json({ ingestionId, record });
    } catch (error) {
      next(error);
    }
  },
);
