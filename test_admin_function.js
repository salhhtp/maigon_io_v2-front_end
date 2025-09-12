// Quick test of the admin function
import https from 'https';

const SUPABASE_URL = 'https://cqvufndxjakdbmbjhwlx.supabase.co';
const ADMIN_KEY = 'admin_key_2024';

async function testFunction() {
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
        console.log('Response status:', res.statusCode);
        console.log('Response body:', responseBody);
        resolve({ status: res.statusCode, body: responseBody });
      });
    });

    req.on('error', (error) => {
      console.error('Request error:', error);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

testFunction().catch(console.error);
