#!/usr/bin/env node

import { parseArgs } from "node:util";
import { createAdmin, deleteAdmin, listAdmins } from "./cli/admin";
import {
  createOrgAdmin,
  deleteOrgAdmin,
  listOrgAdmins,
} from "./cli/orgAdmin";
import { createUser, deleteUser, listUsers } from "./cli/user";

type CommandHandler = (args: Record<string, any>) => Promise<void> | void;

const optionsDefinition = {
  email: { type: "string" as const },
  password: { type: "string" as const },
  org: { type: "string" as const },
  plan: { type: "string" as const },
  "contracts-limit": { type: "string" as const },
  "documents-limit": { type: "string" as const },
  "seats-limit": { type: "string" as const },
  company: { type: "string" as const },
  "first-name": { type: "string" as const },
  "last-name": { type: "string" as const },
  admins: { type: "boolean" as const },
  debug: { type: "boolean" as const },
  "non-interactive": { type: "boolean" as const },
  help: { type: "boolean" as const },
  h: { type: "boolean" as const },
} as const;

function printHelp() {
  console.log(`
Maigon Management CLI
======================

Usage:
  npx tsx scripts/manage.ts <group> <command> [options]

Groups & Commands:
  admin      create | list | delete | help
  org-admin  create | list | delete | help
  user       create | list | delete | help

Common Options:
  --email <email>                 Target email address
  --password <password>           Specify password (otherwise prompted)
  --first-name <name>             First name
  --last-name <name>              Last name
  --company <company>             Company name
  --org <organization_id>         Organization identifier (org/user commands)
  --plan <plan_key>               Plan key (user commands, default free_trial)
  --non-interactive               Fail instead of prompting for missing info

Examples:
  npx tsx scripts/manage.ts admin create --email admin@example.com
  npx tsx scripts/manage.ts org-admin list --org 123
  npx tsx scripts/manage.ts user delete --email user@example.com
`);
}

function commandNotFound(domain: string | undefined, action: string | undefined) {
  if (!domain) {
    console.error("No command group provided. See --help for usage.");
  } else if (!action) {
    console.error(`No command provided for group "${domain}".`);
  } else {
    console.error(`Unknown command "${domain} ${action}".`);
  }
  printHelp();
}

async function routeCommand(domain?: string, action?: string, args: Record<string, any> = {}) {
  if (args.help || args.h) {
    printHelp();
    return;
  }

  const registry: Record<string, Record<string, CommandHandler>> = {
    admin: {
      create: createAdmin,
      list: listAdmins,
      delete: deleteAdmin,
      help: () => printHelp(),
    },
    "org-admin": {
      create: createOrgAdmin,
      list: listOrgAdmins,
      delete: deleteOrgAdmin,
      help: () => printHelp(),
    },
    user: {
      create: createUser,
      list: listUsers,
      delete: deleteUser,
      help: () => printHelp(),
    },
  };

  if (!domain || !action) {
    commandNotFound(domain, action);
    return;
  }

  const group = registry[domain];
  const handler = group?.[action];
  if (!handler) {
    commandNotFound(domain, action);
    return;
  }

  await handler(args);
}

async function main() {
  const { positionals, values } = parseArgs({
    options: optionsDefinition,
    allowPositionals: true,
  });

  const [domain, action] = positionals;
  await routeCommand(domain, action, values);
}

main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
