import { useEffect, useState } from "react";
import { FiTrash2 } from "react-icons/fi";

const MIME = "application/x-tf-trash";

/** Props to spread on any row/card that can be dragged into the trash bin. */
export function trashDragProps(id: string, label: string) {
  return {
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      e.dataTransfer.setData(MIME, id);
      e.dataTransfer.setData("text/plain", label);
      e.dataTransfer.effectAllowed = "move";
    },
  };
}

/** Floating bin that appears while an item is being dragged. */
export function TrashDropZone({ onDrop, label = "Drop here to move to trash" }: { onDrop: (id: string) => void; label?: string }) {
  const [dragging, setDragging] = useState(false);
  const [over, setOver] = useState(false);

  useEffect(() => {
    const start = (e: DragEvent) => { if (e.dataTransfer?.types.includes(MIME)) setDragging(true); };
    const end = () => { setDragging(false); setOver(false); };
    window.addEventListener("dragstart", start);
    window.addEventListener("dragend", end);
    window.addEventListener("drop", end);
    return () => {
      window.removeEventListener("dragstart", start);
      window.removeEventListener("dragend", end);
      window.removeEventListener("drop", end);
    };
  }, []);

  return (
    <div
      aria-label="Trash drop area"
      onDragOver={(e) => { if (e.dataTransfer.types.includes(MIME)) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setOver(true); } }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        const id = e.dataTransfer.getData(MIME);
        setDragging(false); setOver(false);
        if (id) onDrop(id);
      }}
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl px-6 py-5 text-[13px] font-semibold transition-all"
      style={{
        opacity: dragging ? 1 : 0,
        pointerEvents: dragging ? "auto" : "none",
        transform: `scale(${over ? 1.08 : 1})`,
        background: over ? "rgba(224,80,80,0.25)" : "#1E1E28",
        border: `2px dashed ${over ? "#E05050" : "rgba(224,80,80,0.5)"}`,
        color: "#E05050",
        boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
      }}
    >
      <FiTrash2 size={22} /> {label}
    </div>
  );
}
