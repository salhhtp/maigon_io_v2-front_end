// Temporary script to clear all authentication-related storage
// Run this in browser console if needed

console.log('🧹 Clearing all authentication storage...');

// Clear localStorage
Object.keys(localStorage).forEach(key => {
  if (key.includes('supabase') || key.includes('auth') || key.includes('sb-')) {
    console.log('Removing localStorage:', key);
    localStorage.removeItem(key);
  }
});

// Clear sessionStorage
Object.keys(sessionStorage).forEach(key => {
  if (key.includes('supabase') || key.includes('auth') || key.includes('sb-')) {
    console.log('Removing sessionStorage:', key);
    sessionStorage.removeItem(key);
  }
});

// Clear cookies
document.cookie.split(";").forEach(function(c) { 
  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
});

console.log('✅ Auth storage cleared! Refresh the page.');
