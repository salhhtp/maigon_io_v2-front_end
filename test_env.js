// Quick test to check if environment variables are being loaded
import { config } from 'dotenv';

// Load .env file
config();

console.log('🔍 Environment Variable Check:');
console.log('==============================');
console.log('');
console.log('VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL ? 'Set ✅' : 'Missing ❌');
console.log('VITE_SUPABASE_ANON_KEY:', process.env.VITE_SUPABASE_ANON_KEY ? 'Set ✅' : 'Missing ❌');
console.log('ADMIN_MANAGEMENT_KEY:', process.env.ADMIN_MANAGEMENT_KEY ? 'Set ✅' : 'Missing ❌');
console.log('');

if (process.env.VITE_SUPABASE_URL) {
  console.log('📍 Supabase URL:', process.env.VITE_SUPABASE_URL);
}

if (process.env.ADMIN_MANAGEMENT_KEY) {
  console.log('🔑 Admin Key:', process.env.ADMIN_MANAGEMENT_KEY);
}

console.log('');
console.log('💡 If any are missing, check your .env file in the project root');
