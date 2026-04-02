"use client";

import { signIn } from "next-auth/react";

export default function LoginButton({ callbackUrl }: { callbackUrl: string }) {
  return (
    <button
      type="button"
      onClick={() => signIn("authentik", { callbackUrl })}
      className="w-full rounded-lg bg-red-700 hover:bg-red-600 text-white font-semibold px-4 py-3 transition-colors"
    >
      Continuar
    </button>
  );
}
