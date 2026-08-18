"use client";

import { useReportWebVitals } from "next/web-vitals";

export const WebVitalsReporter = () => {
  useReportWebVitals((metric) => {
    void fetch("/api/web-vitals", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(metric),
      keepalive: true,
    });
  });

  return null;
};
