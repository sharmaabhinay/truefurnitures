import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { FiX, FiChevronLeft, FiChevronRight, FiExternalLink, FiCheck, FiLoader } from "react-icons/fi";
import { AButton } from "@/components/admin/ui";
export type PreviewImage = { url: string; name: string };

export function ImagePreview({ images, index, onIndexChange, onClose, onPick }: {
  images: PreviewImage[]; index: number | null; onIndexChange: (index: number) => void; onClose: () => void; onPick?: (image: PreviewImage) => void;
}) {
  const current = index === null ? undefined : images[index];
  const move = (delta: number) => { if (index !== null && images.length) onIndexChange((index + delta + images.length) % images.length); };
  return <Dialog.Root open={Boolean(current)} onOpenChange={(open) => { if (!open) onClose(); }}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-[1300] bg-foreground/90" />
      <Dialog.Content aria-describedby={undefined} className="fixed inset-2 sm:inset-6 z-[1301] flex flex-col rounded-lg border border-analytics-border bg-analytics-canvas text-analytics-text p-3 sm:p-5 outline-none" onKeyDown={(e) => { if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); move(e.key === "ArrowLeft" ? -1 : 1); } }}>
        <div className="flex justify-between items-center gap-3 pb-3">
          <Dialog.Title className="text-sm font-semibold truncate">{current?.name}</Dialog.Title>
          <AButton variant="ghost" onClick={onClose} aria-label="Close image preview" title="Close preview"><FiX /></AButton>
        </div>
        {current && <PreviewCanvas key={current.url} image={current} />}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
          <div className="flex gap-2 items-center">
            <AButton variant="ghost" disabled={images.length < 2} onClick={() => move(-1)} aria-label="Previous image" title="Previous image"><FiChevronLeft /></AButton>
            <span className="text-xs tabular-nums">{index === null ? 0 : index + 1} / {images.length}</span>
            <AButton variant="ghost" disabled={images.length < 2} onClick={() => move(1)} aria-label="Next image" title="Next image"><FiChevronRight /></AButton>
          </div>
          <div className="flex gap-2">
            {current && <AButton variant="ghost" title="Open original" aria-label="Open original image" onClick={() => window.open(current.url, "_blank", "noopener,noreferrer")}><FiExternalLink /></AButton>}
            {current && onPick && <AButton onClick={() => onPick(current)}><FiCheck className="inline mr-2" />Use this file</AButton>}
          </div>
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
function PreviewCanvas({ image }: { image: PreviewImage }) {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  return <div className="relative flex-1 min-h-0 flex items-center justify-center overflow-hidden">
    {state === "loading" && <FiLoader aria-label="Loading image" className="absolute size-6 animate-spin" />}
    {state === "error" ? <p className="text-sm text-analytics-muted">This image could not be loaded.</p> : <img src={image.url} alt={image.name} className="h-full w-full object-contain" onLoad={() => setState("ready")} onError={() => setState("error")} />}
  </div>;
}
export function PreviewThumbnail({ src, name, className }: { src: string; name: string; className: string }) {
  const [open, setOpen] = useState(false);
  return <><AButton variant="ghost" className="!p-0 !border-0 block h-full w-full" aria-label={`Preview ${name}`} onClick={() => setOpen(true)}><img src={src} alt={name} className={className} /></AButton><ImagePreview images={[{ url: src, name }]} index={open ? 0 : null} onIndexChange={() => undefined} onClose={() => setOpen(false)} /></>;
}