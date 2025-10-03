// Utility to clear any leftover authentication data
// This helps fix issues where users appear logged in when they shouldn't be

const STORAGE_KEY_PATTERNS = [
  "maigon",
  "sb-",
  "supabase",
  "auth-token",
  "auth_token",
  "supabase.auth",
];

const clearMatchingKeys = (storage: Storage) => {
  try {
    const keysToRemove: string[] = [];

    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (!key) continue;

      const lowerKey = key.toLowerCase();
      if (STORAGE_KEY_PATTERNS.some((pattern) => lowerKey.includes(pattern))) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => storage.removeItem(key));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn("Could not clear storage keys:", errorMessage);
  }
};

export const clearAuthData = () => {
  if (typeof window === "undefined") return;

  try {
    if (window.localStorage) {
      clearMatchingKeys(window.localStorage);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn("Could not clear localStorage auth data:", errorMessage);
  }

  try {
    if (window.sessionStorage) {
      clearMatchingKeys(window.sessionStorage);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn("Could not clear sessionStorage auth data:", errorMessage);
  }

  console.log("Auth data cleared successfully");
};

// Function to check if we should clear auth data on initialization
export const shouldClearAuthOnInit = () => {
  // Add logic here to determine when to clear auth data
  // For now, return false to avoid disrupting normal functionality
  return false;
};
