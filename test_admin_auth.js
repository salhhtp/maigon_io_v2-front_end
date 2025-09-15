import https from "https";
import { config } from "dotenv";

config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const ADMIN_KEY = process.env.ADMIN_MANAGEMENT_KEY;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

console.log('🔍 Testing Admin Function Authentication');
console.log('======================================');
console.log('SUPABASE_URL:', SUPABASE_URL);
console.log('ADMIN_KEY:', ADMIN_KEY ? 'Set' : 'Missing');
console.log('ANON_KEY:', ANON_KEY ? 'Set' : 'Missing');
console.log('');

async function testAuth() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      action: "list",
      adminKey: ADMIN_KEY,
    });

    const url = new URL(SUPABASE_URL);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: `/functions/v1/admin-user-management`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
        Authorization: `Bearer ${ANON_KEY}`,
      },
    };

    console.log('📤 Making request to:', `${url.origin}/functions/v1/admin-user-management`);
    console.log('🔑 Using admin key:', ADMIN_KEY);
    console.log('🎫 Using auth bearer:', ANON_KEY ? 'Set' : 'Missing');
    console.log('');

    const req = https.request(options, (res) => {
      let responseBody = "";

      res.on("data", (chunk) => {
        responseBody += chunk;
      });

      res.on("end", () => {
        console.log('📥 Response status:', res.statusCode);
        console.log('📄 Response body:', responseBody);
        
        try {
          const response = JSON.parse(responseBody);
          resolve({ status: res.statusCode, data: response });
        } catch (error) {
          console.error("Failed to parse response:", responseBody);
          reject(new Error(`Invalid JSON response: ${responseBody}`));
        }
      });
    });

    req.on("error", (error) => {
      console.error("Request failed:", error.message);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

testAuth().catch(console.error);
