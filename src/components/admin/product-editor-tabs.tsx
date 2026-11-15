import { useRef } from "react";
import { Box, Image, Layers, SlidersHorizontal, Text } from "lucide-react";
import { Button } from "@/components/ui/button";

const sections = [
  { label: "Basic", icon: Box },
  { label: "Images", icon: Image },
  { label: "Specs & Desc", icon: Text },
  { label: "Variants", icon: SlidersHorizontal },
  { label: "3D Model", icon: Layers },
];

export function ProductEditorTabs({ selected, onSelect }: { selected: number; onSelect: (index: number) => void }) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  return (
    <div role="tablist" aria-label="Product sections" className="grid shrink-0 grid-cols-6 gap-1 border-b border-analytics-border p-2 sm:flex sm:gap-2 sm:px-4">
      {sections.map(({ label, icon: Icon }, index) => (
        <Button
          key={label}
          ref={(element) => { refs.current[index] = element; }}
          type="button"
          variant="ghost"
          role="tab"
          id={`product-tab-${index}`}
          aria-selected={selected === index}
          aria-controls="product-editor-panel"
          tabIndex={selected === index ? 0 : -1}
          onClick={() => onSelect(index)}
          onKeyDown={(event) => {
            let next = index;
            if (event.key === "ArrowRight") next = (index + 1) % sections.length;
            else if (event.key === "ArrowLeft") next = (index + sections.length - 1) % sections.length;
            else if (event.key === "Home") next = 0;
            else if (event.key === "End") next = sections.length - 1;
            else return;
            event.preventDefault();
            onSelect(next);
            refs.current[next]?.focus();
          }}
          className={`h-11 min-w-0 gap-1.5 px-2 text-[11px] sm:flex-1 sm:px-3 sm:text-xs ${index < 3 ? "col-span-2" : "col-span-3"} ${selected === index ? "bg-analytics-field text-analytics-gold" : "text-analytics-muted"} hover:bg-analytics-field hover:text-analytics-text focus-visible:ring-analytics-gold`}
        >
          <Icon aria-hidden="true" className="size-3.5" />
          {label}
        </Button>
      ))}
    </div>
  );
}