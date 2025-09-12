// Quick test to verify secrets are working
import https from 'https';

const SUPABASE_URL = 'https://cqvufndxjakdbmbjhwlx.supabase.co';
const ADMIN_KEY = 'admin_key_2024';

async function testSecrets() {
  const postData = JSON.stringify({
    action: 'list',
    adminKey: ADMIN_KEY
  });
  
  const url = new URL(SUPABASE_URL);
  const options = {
    hostname: url.hostname,
    port: 443,
    path: `/functions/v1/admin-user-management`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY || ''}`,
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let responseBody = '';
      
      res.on('data', (chunk) => {
        responseBody += chunk;
      });
      
      res.on('end', () => {
        console.log('✅ Response status:', res.statusCode);
        console.log('📄 Response body:', responseBody);
        
        if (res.statusCode === 401) {
          console.log('❌ 401 Error - Admin key mismatch or SUPABASE_SERVICE_ROLE_KEY missing');
        } else if (res.statusCode === 500) {
          console.log('❌ 500 Error - Missing SUPABASE_SERVICE_ROLE_KEY or other config issue');
        } else if (res.statusCode === 200) {
          console.log('🎉 Success! Admin management is working correctly');
        }
        
        resolve({ status: res.statusCode, body: responseBody });
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request error:', error);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

console.log('🧪 Testing admin management function...');
console.log('🔗 URL:', SUPABASE_URL);
console.log('🔑 Admin Key:', ADMIN_KEY);
console.log('');

testSecrets().catch(console.error);
