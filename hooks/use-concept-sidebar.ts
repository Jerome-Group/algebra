import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

function containFocus(event: KeyboardEvent<HTMLDialogElement>) {
  if (event.key !== "Tab") return;
  const controls = Array.from(
    event.currentTarget.querySelectorAll<HTMLElement>(
      "button, a[href], input, select, textarea, summary, [tabindex]",
    ),
  ).filter(
    (element) =>
      element.tabIndex >= 0 &&
      !element.matches(":disabled") &&
      element.checkVisibility(),
  );
  const first = controls[0];
  const last = controls.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first?.focus();
  }
}

export function useConceptSidebar() {
  const [narrow, setNarrow] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const toggleButton = useRef<HTMLButtonElement>(null);
  const closeForNavigation = useCallback(() => {
    dialog.current?.close();
    setModalOpen(false);
  }, []);
  const dismiss = useCallback(() => {
    closeForNavigation();
    toggleButton.current?.focus();
  }, [closeForNavigation]);
  useEffect(() => {
    const media = matchMedia("(max-width: 1150px)");
    const sync = () => {
      if (!media.matches) closeForNavigation();
      setNarrow(media.matches);
    };
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [closeForNavigation]);
  useEffect(() => {
    if (!modalOpen || !narrow) return;
    const element = dialog.current;
    if (!element) return;
    element.showModal();
    element.querySelector<HTMLInputElement>("input")?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [modalOpen, narrow]);
  const toggle = useCallback(() => {
    if (!narrow) setExpanded((value) => !value);
    else if (modalOpen) dismiss();
    else setModalOpen(true);
  }, [narrow, modalOpen, dismiss]);
  const show = useCallback(() => {
    if (narrow) setModalOpen(true);
    else setExpanded(true);
  }, [narrow]);
  return {
    narrow,
    expanded,
    modalOpen,
    dialog,
    toggleButton,
    toggle,
    show,
    dismiss,
    closeForNavigation,
    containFocus,
  };
}
