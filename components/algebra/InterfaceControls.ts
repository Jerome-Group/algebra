export function visibleElements() {
  return [
    ...document.querySelectorAll<HTMLElement | SVGElement>(
      ".algebra-app button, .algebra-app input, .algebra-app a, .algebra-app summary, .algebra-app [role=button]",
    ),
  ].filter((el) => {
    if (!el.getClientRects().length || el.closest("[hidden]")) return false;
    for (
      let ancestor = el.parentElement;
      ancestor;
      ancestor = ancestor.parentElement
    ) {
      if (
        ancestor instanceof HTMLDetailsElement &&
        !ancestor.open &&
        !ancestor.querySelector(":scope > summary")?.contains(el)
      )
        return false;
    }
    return true;
  });
}
function readableText(el: HTMLElement | SVGElement) {
  const copy = el.cloneNode(true) as Element;
  for (const math of copy.querySelectorAll(".katex")) {
    const tex = math.querySelector("annotation")?.textContent;
    if (tex) math.replaceWith(`$${tex}$`);
  }
  return copy.textContent?.replace(/\s+/g, " ").trim();
}
export function describe(el: HTMLElement | SVGElement, index: number) {
  return {
    id: `element-${index}`,
    kind: el.tagName.toLowerCase(),
    label:
      el.getAttribute("aria-label") ||
      el.getAttribute("title") ||
      readableText(el) ||
      el.getAttribute("placeholder") ||
      el.tagName,
    value: el instanceof HTMLInputElement ? el.value : undefined,
    disabled: el instanceof HTMLButtonElement ? el.disabled : false,
    href: el instanceof HTMLAnchorElement ? el.href : undefined,
  };
}
