"use server";

export async function submitCheckout(): Promise<{ error?: string }> {
  return {
    error: "Checkout legado desativado. Use o fluxo de checkout do tenant.",
  };
}
