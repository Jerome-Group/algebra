export function visibleElements() {
  return [
    ...document.querySelectorAll<HTMLElement | SVGElement>(
      ".algebra-app button, .algebra-app input, .algebra-app select, .algebra-app textarea, .algebra-app a, .algebra-app summary, .algebra-app [role=button]",
    ),
  ].filter((el) => {
    if (!el.getClientRects().length || el.closest("[hidden], [inert]"))
      return false;
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
  const formControl =
    el instanceof HTMLInputElement ||
    el instanceof HTMLSelectElement ||
    el instanceof HTMLTextAreaElement;
  const labelElement = formControl ? el.labels?.[0] : undefined;
  const labelCopy = labelElement?.cloneNode(true) as HTMLElement | undefined;
  labelCopy
    ?.querySelectorAll("input, select, textarea")
    .forEach((control) => control.remove());
  const option =
    el instanceof HTMLInputElement && ["radio", "checkbox"].includes(el.type);
  const legend = option
    ? el.closest("fieldset")?.querySelector("legend")
    : undefined;
  const label = labelCopy ? readableText(labelCopy) : "";
  return {
    id: `element-${index}`,
    kind: el instanceof HTMLInputElement ? el.type : el.tagName.toLowerCase(),
    label:
      el.getAttribute("aria-label") ||
      el.getAttribute("title") ||
      (label && legend ? `${readableText(legend)}: ${label}` : label) ||
      readableText(el) ||
      el.getAttribute("placeholder") ||
      el.tagName,
    value: formControl ? el.value : undefined,
    checked: option ? el.checked : undefined,
    options:
      el instanceof HTMLSelectElement
        ? [...el.options].map((item) => ({
            value: item.value,
            label: item.text,
          }))
        : undefined,
    disabled:
      el instanceof HTMLButtonElement || formControl ? el.disabled : false,
    href: el instanceof HTMLAnchorElement ? el.href : undefined,
  };
}

export function activateControl(el: HTMLElement | SVGElement, value: unknown) {
  if (
    (el instanceof HTMLButtonElement ||
      el instanceof HTMLInputElement ||
      el instanceof HTMLSelectElement ||
      el instanceof HTMLTextAreaElement) &&
    el.disabled
  )
    throw Error("Control disabled");
  if (el instanceof HTMLAnchorElement) return { url: el.href };
  if (
    el instanceof HTMLInputElement &&
    ["radio", "checkbox"].includes(el.type)
  ) {
    el.click();
  } else if (
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    el instanceof HTMLSelectElement
  ) {
    if (typeof value !== "string" || value.length > 200)
      throw Error("Supply a value under 201 characters");
    if (
      el instanceof HTMLSelectElement &&
      ![...el.options].some((option) => option.value === value)
    )
      throw Error("Choose a listed value");
    const prototype =
      el instanceof HTMLInputElement
        ? HTMLInputElement.prototype
        : el instanceof HTMLTextAreaElement
          ? HTMLTextAreaElement.prototype
          : HTMLSelectElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, "value")!.set!.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  } else if (el instanceof HTMLElement) el.click();
  else el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  return {};
}
