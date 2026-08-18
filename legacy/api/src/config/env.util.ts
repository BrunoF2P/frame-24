export const isTestEnv = process.env.NODE_ENV === 'test';

export function requireEnv(name: string, testFallback?: string): string {
  const value = process.env[name] ?? (isTestEnv ? testFallback : undefined);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function assertNotInsecure(
  name: string,
  value: string,
  blockedValues: string[],
): void {
  if (isTestEnv) return;
  if (blockedValues.includes(value)) {
    throw new Error(
      `Insecure value for ${name}. Configure a strong secret in environment variables.`,
    );
  }
}
