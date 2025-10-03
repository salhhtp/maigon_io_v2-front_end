const createNativeFetch = (): typeof fetch => {
  if (typeof globalThis === "undefined" || typeof globalThis.fetch !== "function") {
    throw new Error("Fetch API is not available in the current environment");
  }

  const originalFetch = globalThis.fetch.bind(globalThis);

  return ((...args) => originalFetch(...args)) as typeof fetch;
};

const nativeFetch = createNativeFetch();

export default nativeFetch;
