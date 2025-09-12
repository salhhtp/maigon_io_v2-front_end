// Auto-create admin user
import https from 'https';

const SUPABASE_URL = 'https://cqvufndxjakdbmbjhwlx.supabase.co';
const ADMIN_KEY = 'admin_key_2024';

async function createAdmin() {
  const adminData = {
    action: 'create',
    email: 'admin@maigon.io',
    password: 'Admin123!',
    firstName: 'Super',
    lastName: 'Admin',
    company: 'Maigon',
    adminKey: ADMIN_KEY
  };

  const postData = JSON.stringify(adminData);
  
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
        try {
          const response = JSON.parse(responseBody);
          console.log('✅ Admin Creation Result:', response);
          resolve({ status: res.statusCode, data: response });
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

console.log('🔧 Creating working admin user...');
createAdmin().then(() => {
  console.log('🎉 Done! Check with: npm run admin:list');
}).catch(console.error);
