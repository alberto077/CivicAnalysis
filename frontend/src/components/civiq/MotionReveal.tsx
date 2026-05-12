"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { startTransition, useEffect, useState, type ReactNode } from "react";

const ease = [0.22, 1, 0.36, 1] as const;

type MotionRevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
} & Omit<HTMLMotionProps<"div">, "children" | "initial" | "animate">;

/**
 * Framer Motion applies different initial props on the server vs client, which breaks hydration.
 * We render a static div for SSR + the first client paint, then swap to motion.div after commit.
 * (A noop `useSyncExternalStore` with divergent server/client snapshots can trigger
 * "state update on a component that hasn't mounted yet" during hydration.)
 */
export function MotionReveal({
  children,
  className = "",
  delay = 0,
  ...rest
}: MotionRevealProps) {
  const [motionReady, setMotionReady] = useState(false);

  useEffect(() => {
    startTransition(() => setMotionReady(true));
  }, []);

  if (!motionReady) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-72px", amount: 0.15 }}
      transition={{ duration: 0.58, ease, delay }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export const staggerContainer = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.09, delayChildren: 0.06 },
  },
};

export const staggerItem = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.52, ease },
  },
};
