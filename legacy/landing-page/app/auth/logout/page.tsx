"use client";

import { useEffect } from "react";

export default function LandingLogoutPage() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.location.replace("/");
    }
  }, []);

  return null;
}
