#!/usr/bin/env node

/**
 * Admin User Management CLI
 * Similar to Django's createsuperuser command
 *
 * Usage:
 *   node scripts/manage_admin.js create
 *   node scripts/manage_admin.js list
 *   node scripts/manage_admin.js delete <email>
 *   npm run admin:create
 *   npm run admin:list
 */

const readline = require("readline");
const https = require("https");

// Configuration
const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL || "https://cqvufndxjakdbmbjhwlx.supabase.co";
const ADMIN_KEY = process.env.ADMIN_MANAGEMENT_KEY || "admin_key_2024";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

function hiddenQuestion(prompt) {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const stdout = process.stdout;

    stdout.write(prompt);
    stdin.setRawMode(true);
    stdin.resume();

    let password = "";
    stdin.on("data", function (char) {
      char = char + "";

      switch (char) {
        case "\n":
        case "\r":
        case "\u0004":
          stdin.setRawMode(false);
          stdin.pause();
          stdout.write("\n");
          resolve(password);
          break;
        case "\u0003":
          process.exit();
          break;
        case "\u007f": // Backspace
          if (password.length > 0) {
            password = password.slice(0, -1);
            stdout.write("\b \b");
          }
          break;
        default:
          password += char;
          stdout.write("*");
          break;
      }
    });
  });
}

async function makeRequest(path, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);

    const options = {
      hostname: new URL(SUPABASE_URL).hostname,
      port: 443,
      path: `/functions/v1/${path}`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
        Authorization: `Bearer ${process.env.VITE_SUPABASE_ANON_KEY || ""}`,
      },
    };

    const req = https.request(options, (res) => {
      let responseBody = "";

      res.on("data", (chunk) => {
        responseBody += chunk;
      });

      res.on("end", () => {
        try {
          const response = JSON.parse(responseBody);
          resolve({ status: res.statusCode, data: response });
        } catch (error) {
          reject(new Error(`Invalid JSON response: ${responseBody}`));
        }
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

async function createAdminUser() {
  console.log("\n🔧 Create Super Admin User");
  console.log("=" * 30);

  try {
    const email = await question("Email address: ");
    const password = await hiddenQuestion("Password: ");
    const firstName = await question("First name: ");
    const lastName = await question("Last name: ");
    const company = await question("Company (optional): ");

    console.log("\n📤 Creating admin user...");

    const response = await makeRequest("admin-user-management", {
      action: "create",
      email,
      password,
      firstName,
      lastName,
      company: company || "Admin",
      adminKey: ADMIN_KEY,
    });

    if (response.status === 201) {
      console.log("\n✅ Admin user created successfully!");
      console.log(`📧 Email: ${email}`);
      console.log(`👤 Name: ${firstName} ${lastName}`);
      console.log(`🏢 Company: ${company || "Admin"}`);
      console.log(`🔐 Role: admin`);
      console.log("\n🎉 The admin user can now sign in to the application!");
    } else {
      console.error("\n❌ Error creating admin user:");
      console.error(response.data.error);
      if (response.data.details) {
        console.error("Details:", response.data.details);
      }
    }
  } catch (error) {
    console.error("\n💥 Failed to create admin user:", error.message);
  }
}

async function listAdminUsers() {
  console.log("\n👥 Admin Users List");
  console.log("=" * 20);

  try {
    const response = await makeRequest("admin-user-management", {
      action: "list",
      adminKey: ADMIN_KEY,
    });

    if (response.status === 200) {
      const users = response.data.admin_users;

      if (users.length === 0) {
        console.log("📭 No admin users found.");
        console.log(
          '💡 Run "node scripts/manage_admin.js create" to create one.',
        );
        return;
      }

      console.log(`\n📊 Found ${users.length} admin user(s):\n`);

      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.first_name} ${user.last_name}`);
        console.log(`   📧 Email: ${user.email}`);
        console.log(`   🏢 Company: ${user.company}`);
        console.log(
          `   📅 Created: ${new Date(user.created_at).toLocaleDateString()}`,
        );
        console.log(`   ✅ Active: ${user.is_active ? "Yes" : "No"}`);
        console.log("");
      });
    } else {
      console.error("\n❌ Error fetching admin users:");
      console.error(response.data.error);
    }
  } catch (error) {
    console.error("\n💥 Failed to fetch admin users:", error.message);
  }
}

async function deleteAdminUser(email) {
  if (!email) {
    email = await question("Email address to delete: ");
  }

  const confirm = await question(
    `⚠️  Are you sure you want to delete admin user "${email}"? (yes/no): `,
  );

  if (confirm.toLowerCase() !== "yes") {
    console.log("❌ Operation cancelled.");
    return;
  }

  try {
    console.log("\n🗑️  Deleting admin user...");

    const response = await makeRequest("admin-user-management", {
      action: "delete",
      email,
      adminKey: ADMIN_KEY,
    });

    if (response.status === 200) {
      console.log("\n✅ Admin user deleted successfully!");
      console.log(`📧 Email: ${email}`);
    } else {
      console.error("\n❌ Error deleting admin user:");
      console.error(response.data.error);
    }
  } catch (error) {
    console.error("\n💥 Failed to delete admin user:", error.message);
  }
}

function showHelp() {
  console.log("\n🔧 Admin User Management CLI");
  console.log("=" * 30);
  console.log("\nUsage:");
  console.log("  node scripts/manage_admin.js <command> [options]");
  console.log("\nCommands:");
  console.log("  create              Create a new admin user");
  console.log("  list                List all admin users");
  console.log("  delete <email>      Delete an admin user");
  console.log("  help                Show this help message");
  console.log("\nNPM Scripts:");
  console.log("  npm run admin:create");
  console.log("  npm run admin:list");
  console.log("  npm run admin:delete");
  console.log("\nEnvironment Variables:");
  console.log(
    "  ADMIN_MANAGEMENT_KEY  Admin management key (default: admin_key_2024)",
  );
  console.log("  VITE_SUPABASE_URL     Supabase URL");
  console.log("  VITE_SUPABASE_ANON_KEY Supabase anonymous key");
  console.log(
    "\n💡 Make sure to deploy the admin-user-management edge function first!",
  );
}

async function main() {
  const command = process.argv[2];

  switch (command) {
    case "create":
      await createAdminUser();
      break;
    case "list":
      await listAdminUsers();
      break;
    case "delete":
      await deleteAdminUser(process.argv[3]);
      break;
    case "help":
    case "--help":
    case "-h":
      showHelp();
      break;
    default:
      console.log('❌ Invalid command. Use "help" for usage information.');
      showHelp();
      break;
  }

  rl.close();
}

// Handle process termination
process.on("SIGINT", () => {
  console.log("\n👋 Goodbye!");
  rl.close();
  process.exit(0);
});

// Run the main function
main().catch((error) => {
  console.error("💥 Unexpected error:", error);
  rl.close();
  process.exit(1);
});
