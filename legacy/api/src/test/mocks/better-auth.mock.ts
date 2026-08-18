export function betterAuth(): unknown {
  return {
    api: {
      getSession: () => Promise.resolve(null),
    },
  };
}
