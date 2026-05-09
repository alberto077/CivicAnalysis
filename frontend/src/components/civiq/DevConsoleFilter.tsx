"use client";

import { useEffect } from "react";

const NOISY_WARNING_FRAGMENTS = [
  "params are being enumerated. `params` is a Promise",
  "The keys of `searchParams` were accessed directly. `searchParams` is a Promise",
];

export function DevConsoleFilter() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    const originalError = console.error;

    console.error = (...args: unknown[]) => {
      const firstArg = args[0];
      if (
        typeof firstArg === "string" &&
        NOISY_WARNING_FRAGMENTS.some((fragment) =>
          firstArg.includes(fragment),
        )
      ) {
        return;
      }
      originalError(...args);
    };

    return () => {
      console.error = originalError;
    };
  }, []);

  return null;
}
