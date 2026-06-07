"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { WifiOff } from "lucide-react";

/**
 * A calm offline notice for travel — "you're abroad and the signal dropped" is
 * the core use case. Stays out of the way until the connection goes, then
 * reassures that nothing's lost. Driven by the browser's online/offline events;
 * needs no backend.
 */
export function OfflineBar() {
  const [offline, setOffline] = React.useState(false);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOffline(!navigator.onLine);
    const update = () => setOffline(!navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return (
    <AnimatePresence>
      {offline && (
        <motion.div
          initial={{ y: "-100%" }}
          animate={{ y: 0 }}
          exit={{ y: "-100%" }}
          transition={{ type: "spring", stiffness: 420, damping: 36 }}
          role="status"
          aria-live="polite"
          className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 bg-ink/95 px-4 py-2 text-center text-xs font-medium text-paper shadow-soft backdrop-blur"
        >
          <WifiOff size={14} strokeWidth={2} className="shrink-0" />
          <span className="text-balance">
            You&apos;re offline — your changes are saved here and sync when
            you&apos;re back.
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
