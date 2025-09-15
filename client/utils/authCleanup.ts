// Utility to clear any leftover authentication data
// This helps fix issues where users appear logged in when they shouldn't be

export const clearAuthData = () => {
  try {
    // Clear the specific auth key
    localStorage.removeItem("maigon_current_user");
    
    // Also clear any other auth-related keys that might exist
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes("maigon") || key.includes("auth") || key.includes("user"))) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    console.log("Auth data cleared successfully");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn("Could not clear auth data:", errorMessage);
  }
};

// Function to check if we should clear auth data on initialization
export const shouldClearAuthOnInit = () => {
  // Add logic here to determine when to clear auth data
  // For now, return false to avoid disrupting normal functionality
  return false;
};
