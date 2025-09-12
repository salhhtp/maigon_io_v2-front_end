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

import readline from 'readline';
import https from 'https';
import process from 'process';

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://cqvufndxjakdbmbjhwlx.supabase.co';
const ADMIN_KEY = process.env.ADMIN_MANAGEMENT_KEY || 'admin_key_2024';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
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
    
    let password = '';
    const handleData = (char) => {
      char = char + '';
      
      switch (char) {
        case '\n':
        case '\r':
        case '\u0004':
          stdin.setRawMode(false);
          stdin.pause();
          stdout.write('\n');
          stdin.removeListener('data', handleData);
          resolve(password);
          break;
        case '\u0003':
          process.exit();
          break;
        case '\u007f': // Backspace
          if (password.length > 0) {
            password = password.slice(0, -1);
            stdout.write('\b \b');
          }
          break;
        default:
          password += char;
          stdout.write('*');
          break;
      }
    };
    
    stdin.on('data', handleData);
  });
}

async function makeRequest(path, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    const url = new URL(SUPABASE_URL);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: `/functions/v1/${path}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY || ''}`,
      }
    };

    const req = https.request(options, (res) => {
      let responseBody = '';
      
      res.on('data', (chunk) => {
        responseBody += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(responseBody);
          resolve({ status: res.statusCode, data: response });
        } catch (error) {
          console.error('Failed to parse response:', responseBody);
          reject(new Error(`Invalid JSON response: ${responseBody}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error('Request failed:', error.message);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

async function createAdminUser() {
  console.log('\n🔧 Create Super Admin User');
  console.log('==============================');
  
  try {
    const email = await question('Email address: ');
    const password = await hiddenQuestion('Password: ');
    const firstName = await question('First name: ');
    const lastName = await question('Last name: ');
    const company = await question('Company (optional): ');

    console.log('\n📤 Creating admin user...');

    const response = await makeRequest('admin-user-management', {
      action: 'create',
      email,
      password,
      firstName,
      lastName,
      company: company || 'Admin',
      adminKey: ADMIN_KEY
    });

    if (response.status === 201) {
      console.log('\n✅ Admin user created successfully!');
      console.log(`📧 Email: ${email}`);
      console.log(`👤 Name: ${firstName} ${lastName}`);
      console.log(`🏢 Company: ${company || 'Admin'}`);
      console.log(`🔐 Role: admin`);
      console.log(`🚀 Can Sign In: Yes`);
      console.log(`📧 Email Confirmed: Yes`);
      console.log('\n🎉 The admin user can now sign in to the application immediately!');
      console.log(`🔗 Try signing in at: ${SUPABASE_URL.replace('supabase.co', 'supabase.co').replace('https://', 'https://').replace('.supabase.co', '')}/signin`);
    } else if (response.status === 409) {
      console.log('\n⚠️  User already exists!');
      console.log(`📧 Email: ${email}`);
      if (response.data.user) {
        console.log(`🔐 Role: ${response.data.user.role}`);
        console.log(`🆔 ID: ${response.data.user.id}`);
      }
      console.log('\n💡 Try using a different email address.');
    } else {
      console.error('\n❌ Error creating admin user:');
      console.error(response.data?.error || 'Unknown error');
      if (response.data?.details) {
        console.error('Details:', response.data.details);
      }
    }

  } catch (error) {
    console.error('\n💥 Failed to create admin user:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Make sure the admin-user-management function is deployed');
    console.error('2. Check that ADMIN_MANAGEMENT_KEY matches in Supabase secrets');
    console.error('3. Verify SUPABASE_SERVICE_ROLE_KEY is set in Supabase secrets');
  }
}

async function listAdminUsers() {
  console.log('\n👥 Admin Users List');
  console.log('====================');
  
  try {
    const response = await makeRequest('admin-user-management', {
      action: 'list',
      adminKey: ADMIN_KEY
    });

    if (response.status === 200) {
      const users = response.data.admin_users;
      
      if (users.length === 0) {
        console.log('📭 No admin users found.');
        console.log('💡 Run "npm run admin:create" to create one.');
        return;
      }

      console.log(`\n📊 Found ${users.length} admin user(s):\n`);
      
      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.first_name} ${user.last_name}`);
        console.log(`   📧 Email: ${user.email}`);
        console.log(`   🏢 Company: ${user.company}`);
        console.log(`   📅 Created: ${new Date(user.created_at).toLocaleDateString()}`);
        console.log(`   ✅ Active: ${user.is_active ? 'Yes' : 'No'}`);
        console.log(`   🔗 Auth Linked: ${user.auth_linked ? 'Yes' : 'No'}`);
        console.log(`   🚀 Can Sign In: ${user.can_sign_in ? 'Yes' : 'No'}`);
        console.log(`   📧 Email Confirmed: ${user.email_confirmed ? 'Yes' : 'No'}`);
        
        if (!user.can_sign_in) {
          console.log(`   ⚠️  Status: Cannot sign in - auth user not properly created`);
        } else {
          console.log(`   🎉 Status: Ready to sign in!`);
        }
        console.log('');
      });

      // Summary
      const readyUsers = users.filter(u => u.can_sign_in).length;
      const brokenUsers = users.filter(u => !u.can_sign_in).length;
      
      console.log(`📈 Summary:`);
      console.log(`   ✅ Ready to sign in: ${readyUsers}`);
      if (brokenUsers > 0) {
        console.log(`   ⚠️  Need fixing: ${brokenUsers}`);
        console.log(`   💡 Tip: Delete and recreate users that cannot sign in`);
      }
      
    } else {
      console.error('\n❌ Error fetching admin users:');
      console.error(`Status: ${response.status}`);
      console.error(response.data?.error || 'Unknown error');
      if (response.data?.details) {
        console.error('Details:', response.data.details);
      }
    }

  } catch (error) {
    console.error('\n💥 Failed to fetch admin users:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Make sure the admin-user-management function is deployed');
    console.error('2. Check that ADMIN_MANAGEMENT_KEY is set in Supabase secrets');
    console.error('3. Verify your environment variables are correct');
    console.error('\nEnvironment check:');
    console.error(`   SUPABASE_URL: ${SUPABASE_URL ? 'Set' : 'Missing'}`);
    console.error(`   ADMIN_KEY: ${ADMIN_KEY ? 'Set' : 'Missing'}`);
    console.error(`   SUPABASE_ANON_KEY: ${process.env.VITE_SUPABASE_ANON_KEY ? 'Set' : 'Missing'}`);
  }
}

async function deleteAdminUser(email) {
  if (!email) {
    email = await question('Email address to delete: ');
  }

  const confirm = await question(`⚠️  Are you sure you want to delete admin user "${email}"? (yes/no): `);
  
  if (confirm.toLowerCase() !== 'yes') {
    console.log('❌ Operation cancelled.');
    return;
  }

  try {
    console.log('\n🗑️  Deleting admin user...');

    const response = await makeRequest('admin-user-management', {
      action: 'delete',
      email,
      adminKey: ADMIN_KEY
    });

    if (response.status === 200) {
      console.log('\n✅ Admin user deleted successfully!');
      console.log(`📧 Email: ${email}`);
      console.log('🧹 Both auth user and profile have been removed.');
    } else {
      console.error('\n❌ Error deleting admin user:');
      console.error(`Status: ${response.status}`);
      console.error(response.data?.error || 'Unknown error');
      if (response.data?.details) {
        console.error('Details:', response.data.details);
      }
    }

  } catch (error) {
    console.error('\n💥 Failed to delete admin user:', error.message);
  }
}

function showHelp() {
  console.log('\n🔧 Admin User Management CLI');
  console.log('==============================');
  console.log('\nUsage:');
  console.log('  node scripts/manage_admin.js <command> [options]');
  console.log('\nCommands:');
  console.log('  create              Create a new admin user');
  console.log('  list                List all admin users');
  console.log('  delete <email>      Delete an admin user');
  console.log('  help                Show this help message');
  console.log('\nNPM Scripts:');
  console.log('  npm run admin:create');
  console.log('  npm run admin:list');
  console.log('  npm run admin:delete');
  console.log('\nEnvironment Variables:');
  console.log('  ADMIN_MANAGEMENT_KEY  Admin management key (default: admin_key_2024)');
  console.log('  VITE_SUPABASE_URL     Supabase URL');
  console.log('  VITE_SUPABASE_ANON_KEY Supabase anonymous key');
  console.log('\nFeatures:');
  console.log('  ✅ Creates complete auth users that can sign in immediately');
  console.log('  ✅ Auto-confirms email addresses');
  console.log('  ✅ Sets up admin permissions and unlimited plans');
  console.log('  ✅ Shows sign-in status for each user');
  console.log('\n💡 Make sure to deploy the admin-user-management edge function first!');
}

async function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'create':
      await createAdminUser();
      break;
    case 'list':
      await listAdminUsers();
      break;
    case 'delete':
      await deleteAdminUser(process.argv[3]);
      break;
    case 'help':
    case '--help':
    case '-h':
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
process.on('SIGINT', () => {
  console.log('\n👋 Goodbye!');
  rl.close();
  process.exit(0);
});

// Run the main function
main().catch((error) => {
  console.error('💥 Unexpected error:', error);
  rl.close();
  process.exit(1);
});
