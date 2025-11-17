# Maigon User & Admin Management CLI

The project now ships with a single TypeScript CLI (`scripts/manage.ts`) that gives you Django-like control over users, Maigon admins, and organization admins directly from the terminal.

All commands run against Supabase using the **service role key**, so no HTTP edge functions are required.

---

## 1. Prerequisites

Add the following to your `.env` file (they already exist for local development):

```env
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_SERVICE_URL=...        # or VITE_SUPABASE_URL
```

> The CLI loads the root `.env` automatically. If you are running in CI, expose these variables in the environment first.

Install dependencies if you have not already:

```bash
npm install
```

The commands are powered by `tsx`, so Node ≥18 is sufficient.

---

## 2. Available Commands

Every command follows the pattern:

```bash
npx tsx scripts/manage.ts <group> <command> [options]
```

Or via the pre-defined npm scripts:

| Shortcut Script            | Equivalent Command                                      | Description                          |
|----------------------------|-----------------------------------------------------------|--------------------------------------|
| `npm run admin:create`     | `tsx scripts/manage.ts admin create`                      | Create a Maigon super admin          |
| `npm run admin:list`       | `tsx scripts/manage.ts admin list`                        | List super admins                    |
| `npm run admin:delete`     | `tsx scripts/manage.ts admin delete --email …`            | Delete a super admin                 |
| `npm run admin:help`       | `tsx scripts/manage.ts admin help`                        | CLI usage overview                   |
| `npm run org-admin:create` | `tsx scripts/manage.ts org-admin create --org …`          | Create an org admin                  |
| `npm run org-admin:list`   | `tsx scripts/manage.ts org-admin list [--org …]`          | List org admins                      |
| `npm run org-admin:delete` | `tsx scripts/manage.ts org-admin delete --email …`        | Delete an org admin                  |
| `npm run user:create`      | `tsx scripts/manage.ts user create [options]`             | Create a standard user               |
| `npm run user:list`        | `tsx scripts/manage.ts user list [--org …] [--admins]`    | List users                           |
| `npm run user:delete`      | `tsx scripts/manage.ts user delete --email …`             | Delete a user                        |

Common options:

```
--email <email>                 Target email address
--password <password>           Provide password (otherwise prompted or generated)
--first-name <name>             First name metadata
--last-name <name>              Last name metadata
--company <company>             Company metadata
--org <organization_id>         Organization (org-admin/user commands)
  --plan <plan_key>               Plan key for users (default: free_trial)
  --contracts-limit <number>      Override contracts quota when creating users/org admins
  --documents-limit <number>      Override documents quota
  --seats-limit <number>          Override seats quota (org admins + users)
  --non-interactive               Fail if required data missing instead of prompting
```

> In interactive mode the CLI will prompt for any missing fields and mask passwords. In `--non-interactive` mode you **must** supply all required flags.

---

## 3. What Each Command Does

### Admin (`admin create` / `list` / `delete`)

- Creates Supabase auth user with email confirmed and generated password (if not provided)
- Upserts `user_profiles` row with `role = 'admin'`
- No organization is attached
- Sets `is_temporary_password = true` in auth metadata so the user must change their password after first login
- Delete command removes both auth user and profile

### Organization Admin (`org-admin create` / `list` / `delete`)

- Requires an existing organization ID (`--org <uuid>`)
- Creates auth user, assigns profile with `organization_role = 'org_admin'`
- Password is generated if not supplied
- Temporary-password flag is enabled exactly like the super-admin flow
- `--plan`, `--documents-limit`, and `--seats-limit` can optionally update the organization’s billing plan and quotas during creation
- Listing shows org name (via `organizations` join)

### User (`user create` / `list` / `delete`)

- Creates auth user and profile with `role = 'user'`
- Optional `--org` attaches the user to an organization (`organization_role = 'member'`)
- Optional `--plan` chooses from catalog (`free_trial`, `pay_as_you_go`, etc.)
- Automatically upserts `user_usage_stats` and `user_plans` records
- Sets the temporary-password flag so they must complete the Change Password flow on first sign-in
- `--contracts-limit`, `--documents-limit`, and `--seats-limit` override the assigned plan quotas when provisioning
- Listing can include admins with `--admins`

All delete commands remove the auth user first (ensuring tokens are invalidated) and then clean up the profile record. Related tables that cascade on delete (`user_usage_stats`, `user_plans`, etc.) are cleaned up automatically.

---

## 4. Example Workflows

### Create a Maigon Super Admin

```bash
npm run admin:create -- --email admin@maigon.io --first-name Ada --last-name Lovelace
```

If you omit `--password` a secure random password is printed at the end of the run. Share it out-of-band.

### Create an Organization Admin

```bash
npm run org-admin:create -- --email boss@example.com --org 6b2a6f5c-... --first-name Boss
```

This ensures the profile is set to `organization_role = 'org_admin'` for that organization.

### Create a Standard User on the Trial Plan

```bash
npm run user:create -- --email user@example.com --org 6b2a6f5c-...
```

Result:

1. Auth user created (email confirmed)
2. Profile inserted with `role = 'user'`
3. `user_usage_stats` initialized
4. `user_plans` row created using the `free_trial` plan definition
5. `is_temporary_password` metadata flag set so the user must change the password on first login

### List Users for an Organization

```bash
npm run user:list -- --org 6b2a6f5c-...
```

### Delete a User

```bash
npm run user:delete -- --email user@example.com
```

---

## 5. Tips & Safety

- **Service role access**: the CLI uses the service role key, so protect your `.env` file.
- **Dry runs**: there is no dry-run flag (yet). Double-check arguments before running delete commands.
- **Auditing**: each command prints success/error messages; wrap them in shell scripts or CI jobs as needed.
- **Extensibility**: the dispatcher is simple—add new subcommands in `scripts/manage.ts` and corresponding handlers under `scripts/cli/`.

---

## 6. Troubleshooting

| Issue | Fix |
|-------|-----|
| `Missing Supabase service role key` | Ensure `SUPABASE_SERVICE_ROLE_KEY` is in `.env` or environment |
| `Unknown plan ...` | Check `shared/plans.ts` for valid keys |
| `Organization ... not found` | Verify the organization UUID exists in `organizations` table |
| `Auth user already exists` | Delete the existing account first (`... delete --email ...`) |
| User keeps getting asked to change password | They still have the temporary flag. Have them complete the Change Password flow or clear it via Supabase Admin if resetting manually. |

Run `npm run admin:help` (or `tsx scripts/manage.ts --help`) to show the usage summary at any time.

Happy debugging and provisioning! 🎉
