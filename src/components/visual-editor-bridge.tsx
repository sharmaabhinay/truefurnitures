import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";

/** Active only inside the same-origin admin preview; normal storefront clicks are untouched. */
export function VisualEditorBridge() {
  const pathname = useRouterState({ select: state => state.location.pathname });
  useEffect(() => {
    if (window.parent === window || new URLSearchParams(window.location.search).get("sectionPreview") !== "1") return;
    document.documentElement.dataset.tfVisualEditor = "true";
    let highlighted: Element | null = null;
    const highlight = (element: Element | null) => {
      highlighted?.removeAttribute("data-tf-selected");
      highlighted = element;
      highlighted?.setAttribute("data-tf-selected", "true");
    };
    const select = (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      const target = event.target instanceof Element ? event.target : null;
      const image = target?.closest<HTMLElement>("[data-editor-image]");
      const section = target?.closest<HTMLElement>("[data-page-section]");
      const node = target?.closest<HTMLElement>("[data-editor-node]");
      highlight(image ?? node ?? section ?? null);
      window.parent.postMessage({
        kind: "tf-editor-select",
        sectionId: image?.dataset.editorSection ?? section?.dataset.pageSection ?? null,
        imageKey: image?.dataset.editorImage ?? null,
        imageSrc: image?.getAttribute("src") ?? null,
        imageAlt: image?.getAttribute("alt") ?? null,
        node: node?.dataset.editorNode ?? null,
      }, window.location.origin);
    };
    const receive = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== window.parent || event.data?.kind !== "tf-editor-highlight") return;
      const { sectionId, imageKey, node } = event.data;
      const elements = document.querySelectorAll<HTMLElement>("[data-editor-image], [data-page-section], [data-editor-node]");
      const match = [...elements].find(element => imageKey
        ? element.dataset.editorImage === imageKey
        : node ? element.dataset.editorNode === node
          : element.dataset.pageSection === sectionId && !element.dataset.editorImage && !element.dataset.editorNode);
      highlight(match ?? null);
      match?.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    };
    document.addEventListener("click", select, true);
    window.addEventListener("message", receive);
    return () => {
      document.removeEventListener("click", select, true);
      window.removeEventListener("message", receive);
      highlighted?.removeAttribute("data-tf-selected");
      delete document.documentElement.dataset.tfVisualEditor;
    };
  }, [pathname]);
  return null;
}
