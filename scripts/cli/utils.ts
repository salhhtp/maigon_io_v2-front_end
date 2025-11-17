import { createInterface } from "node:readline";
import { stdin as input, stdout as output } from "node:process";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from project root
config({ path: path.resolve(__dirname, "../../.env") });

export const SUPABASE_URL =
  process.env.SUPABASE_SERVICE_URL ||
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  "";
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  "";

if (!SUPABASE_URL) {
  throw new Error(
    "Missing Supabase URL. Set SUPABASE_SERVICE_URL or VITE_SUPABASE_URL in your .env file.",
  );
}
if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "Missing Supabase service role key. Set SUPABASE_SERVICE_ROLE_KEY in your .env file.",
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export function isInteractive(): boolean {
  return process.stdin.isTTY ?? false;
}

export async function prompt(
  question: string,
  options: { defaultValue?: string } = {},
): Promise<string> {
  if (!isInteractive()) {
    if (options.defaultValue !== undefined) {
      return options.defaultValue;
    }
    throw new Error(
      `Missing required value for "${question}" and cannot prompt in non-interactive mode.`,
    );
  }

  const rl = createInterface({ input, output });
  const answer: string = await new Promise((resolve) =>
    rl.question(
      options.defaultValue
        ? `${question} (${options.defaultValue}): `
        : `${question}: `,
      resolve,
    ),
  );
  rl.close();

  if (!answer && options.defaultValue) {
    return options.defaultValue;
  }
  return answer.trim();
}

export async function promptHidden(question: string): Promise<string> {
  if (!isInteractive()) {
    return "";
  }

  return await new Promise((resolve) => {
    const rl = createInterface({ input, output });
    const buffer: string[] = [];

    const cleanup = () => {
      input.setRawMode(false);
      input.pause();
      input.removeListener("data", handleData);
      rl.close();
    };

    function handleData(char: Buffer) {
      const character = char.toString();
      switch (character) {
        case "\n":
        case "\r":
        case "\u0004":
          process.stdout.write("\n");
          cleanup();
          resolve(buffer.join(""));
          break;
        case "\u0003":
          process.stdout.write("\n");
          cleanup();
          process.exit(1);
          break;
        case "\u007f":
          buffer.pop();
          process.stdout.clearLine(0);
          process.stdout.cursorTo(0);
          process.stdout.write(`${question}: ${"*".repeat(buffer.length)}`);
          break;
        default:
          buffer.push(character);
          process.stdout.write("*");
          break;
      }
    }

    process.stdout.write(`${question}: `);
    input.setRawMode(true);
    input.resume();
    input.on("data", handleData);
  });
}

export function generatePassword(length = 16): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  return Array.from({ length }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length)),
  ).join("");
}

export function formatTable<T extends Record<string, unknown>>(
  rows: T[],
  columns: Array<{ key: keyof T; label: string }>,
) {
  if (!rows.length) {
    console.log("No records found.");
    return;
  }

  const table = rows.map((row) => {
    const formatted: Record<string, unknown> = {};
    columns.forEach(({ key, label }) => {
      formatted[label] = row[key];
    });
    return formatted;
  });

  console.table(table);
}

export function printError(message: string) {
  console.error(`❌ ${message}`);
}

export function printSuccess(message: string) {
  console.log(`✅ ${message}`);
}

export function normalizeEmail(email?: string | null): string | null {
  if (!email) return null;
  return email.trim().toLowerCase();
}

export async function findAuthUserByEmail(email: string) {
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 100 });
  if (error) throw error;
  return data?.users?.find((user) => user.email?.toLowerCase() === email.toLowerCase()) ?? null;
}

export function toISODate(date?: string | null): string | null {
  if (!date) return null;
  try {
    return new Date(date).toISOString();
  } catch {
    return null;
  }
}

export function uuid(): string {
  return crypto.randomUUID();
}

export type CLIArgs = {
  [key: string]: string | boolean | undefined;
};
