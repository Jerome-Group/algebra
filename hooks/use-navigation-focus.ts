import { useCallback, useLayoutEffect, useRef, useState } from "react";

type FocusRequest = { heading: string; scroll: "top" | "target" };

export function useNavigationFocus() {
  const pending = useRef<number | null>(null);
  const active = useRef<FocusRequest | null>(null);
  const [request, setRequest] = useState<FocusRequest | null>(null);
  const cancel = useCallback(function cancelPending() {
    if (pending.current !== null) cancelAnimationFrame(pending.current);
    pending.current = null;
    active.current = null;
    document.removeEventListener("focusin", cancelPending);
  }, []);
  useLayoutEffect(() => cancel, [cancel]);
  useLayoutEffect(() => {
    if (!request || active.current !== request) return;
    pending.current = requestAnimationFrame(() => {
      cancel();
      const target = document.getElementById(request.heading);
      target?.focus({ preventScroll: true });
      if (request.scroll === "target")
        target?.scrollIntoView({ block: "start" });
      else window.scrollTo({ top: 0 });
    });
  }, [request, cancel]);

  return useCallback(
    (
      heading: string,
      options: { scroll: "top" | "target" } = { scroll: "top" },
    ) => {
      cancel();
      const request = { heading, scroll: options.scroll };
      active.current = request;
      // A reader moving focus after navigation takes precedence over its default.
      document.addEventListener("focusin", cancel);
      setRequest(request);
    },
    [cancel],
  );
}
