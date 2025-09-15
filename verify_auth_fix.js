/**
 * Verification script to test authentication fix
 * Run this in browser console to verify auth behavior
 */

console.log('🧪 Authentication Fix Verification');
console.log('=====================================');

// Check current localStorage for any auth data
console.log('\n📦 Current localStorage:');
let authDataFound = false;
Object.keys(localStorage).forEach(key => {
  const isAuth = key.includes('supabase') || key.includes('sb-') || key.includes('auth') || key.includes('maigon_current_user');
  if (isAuth) {
    console.log(`🔑 AUTH DATA FOUND: ${key} = ${localStorage.getItem(key)?.substring(0, 50)}...`);
    authDataFound = true;
  }
});

// Check sessionStorage
console.log('\n📦 Current sessionStorage:');
Object.keys(sessionStorage).forEach(key => {
  const isAuth = key.includes('supabase') || key.includes('sb-') || key.includes('auth') || key.includes('maigon_current_user');
  if (isAuth) {
    console.log(`🔑 AUTH DATA FOUND: ${key} = ${sessionStorage.getItem(key)?.substring(0, 50)}...`);
    authDataFound = true;
  }
});

if (!authDataFound) {
  console.log('✅ No auth data found in storage - GOOD!');
} else {
  console.log('❌ Auth data still present - needs cleanup');
}

// Test manual cleanup
console.log('\n🧹 Testing manual cleanup...');
function clearAllAuthData() {
  let cleared = 0;
  
  Object.keys(localStorage).forEach(key => {
    if (key.includes('supabase') || key.includes('sb-') || key.includes('auth') || key.includes('maigon_current_user')) {
      localStorage.removeItem(key);
      cleared++;
    }
  });
  
  Object.keys(sessionStorage).forEach(key => {
    if (key.includes('supabase') || key.includes('sb-') || key.includes('auth') || key.includes('maigon_current_user')) {
      sessionStorage.removeItem(key);
      cleared++;
    }
  });
  
  localStorage.removeItem('maigon_current_user');
  sessionStorage.removeItem('maigon_current_user');
  
  console.log(`✅ Cleared ${cleared} auth-related items`);
  console.log('🔄 Refresh the page to test clean initialization');
}

// Make cleanup function available globally
window.clearAllAuthData = clearAllAuthData;

console.log('\n🎯 Next steps:');
console.log('1. Run clearAllAuthData() if auth data was found');
console.log('2. Refresh the page');
console.log('3. Check that app starts in public state without auto-login');
console.log('4. Test manual sign-in works correctly');

console.log('\n🏁 Test completed!');
