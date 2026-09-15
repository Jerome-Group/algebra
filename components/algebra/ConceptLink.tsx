import type { ReactNode } from "react";
export function ConceptLink({
  id,
  open,
  children,
  ...props
}: {
  id: string;
  open: (id: string) => void;
  children: ReactNode;
  className?: string;
  "aria-current"?: "page";
}) {
  return (
    <a
      {...props}
      href={`#${id}`}
      onClick={(event) => {
        if (
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        )
          return;
        event.preventDefault();
        open(id);
      }}
    >
      {children}
    </a>
  );
}
