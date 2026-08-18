export function fromNodeHeaders<T>(headers: T): T {
  return headers;
}

export function toNodeHandler() {
  return () => {
    // no-op in unit tests
  };
}
