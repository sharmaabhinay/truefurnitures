import { House, Sofa, Image, Store } from "lucide-react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";

export function PageEditorTabs() {
  return <TabsList aria-label="Website editing" className="grid h-auto w-full grid-cols-2 items-stretch gap-1 rounded-md border border-border bg-muted p-1 lg:grid-cols-4">
    {([
      ["home", "Home layout", House],
      ["product", "Product layout", Sofa],
      ["hero", "Homepage content", Image],
      ["brand", "Brand & store", Store],
    ] as const).map(([key, label, Icon]) => <TabsTrigger
      key={key}
      value={key}
      className="min-h-12 min-w-0 justify-start gap-2 rounded-sm px-3 py-3 text-left text-xs leading-snug whitespace-normal text-muted-foreground transition-colors hover:bg-background/60 hover:text-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none sm:text-sm motion-reduce:transition-none"
    >
      <Icon aria-hidden="true" className="size-4 shrink-0" />
      <span className="min-w-0 break-words">{label}</span>
    </TabsTrigger>)}
  </TabsList>;
}