import { useCallback, useEffect, useRef } from "react";

export function useNavigationFocus() {
  const pending = useRef<number | null>(null);
  const cancel = useCallback(function cancelPending() {
    if (pending.current !== null) cancelAnimationFrame(pending.current);
    pending.current = null;
    document.removeEventListener("focusin", cancelPending);
  }, []);
  useEffect(() => cancel, [cancel]);

  return useCallback(
    (heading: string) => {
      cancel();
      // A reader moving focus after navigation takes precedence over its default.
      document.addEventListener("focusin", cancel);
      pending.current = requestAnimationFrame(() => {
        cancel();
        document.getElementById(heading)?.focus({ preventScroll: true });
        window.scrollTo({ top: 0 });
      });
    },
    [cancel],
  );
}
