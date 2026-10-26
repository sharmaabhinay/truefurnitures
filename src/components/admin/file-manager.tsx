import { useEffect, useMemo, useRef, useState } from "react";
import {
  FiFolder, FiFolderPlus, FiUpload, FiLink, FiFile, FiImage, FiFilm,
  FiEdit2, FiTrash2, FiCopy, FiArrowLeft, FiMove, FiCheck, FiX, FiLoader,
} from "react-icons/fi";
import { toast } from "sonner";
import { COL, fsAdd, fsDelete, fsUpdate, fsWatch } from "@/lib/db/firestore";
import { uploadToCloudinary } from "@/lib/upload";
import { uploadFromUrl } from "@/lib/upload.functions";
import { useAuth } from "@/lib/auth/auth-context";
import { AButton, AInput, AModal, ASelect, dark } from "@/components/admin/ui";
import { ImagePreview } from "@/components/admin/image-preview";

export type ManagedFile = {
  id: string;
  name: string;
  url: string;
  public_id?: string;
  kind?: string;
  size?: number;
  folder?: string;
  created_by?: string;
  created_at?: string;
};

type FolderRow = { id: string; name: string; path: string; parent: string; created_at?: string };

function formatSize(bytes?: number): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function kindOf(f: ManagedFile): "image" | "video" | "file" {
  if (f.kind === "image" || /\.(png|jpe?g|webp|gif|avif|svg)(\?|$)/i.test(f.url)) return "image";
  if (f.kind === "video" || /\.(mp4|webm|mov)(\?|$)/i.test(f.url)) return "video";
  return "file";
}

function sanitizeFolderName(name: string): string {
  return name.trim().replace(/[/\\]+/g, "-").replace(/^\.+/, "").slice(0, 60);
}

/**
 * Shared file-manager body. Used by the admin "File Manager" panel and, in
 * picker mode, by the product form to choose an image from the library.
 */
function FileManagerBody({
  picker,
  accept = "all",
  onPick,
}: {
  picker?: boolean;
  accept?: "images" | "all";
  onPick?: (file: ManagedFile) => void;
}) {
  const { user } = useAuth();
  const [folders, setFolders] = useState<FolderRow[]>([]);
  const [files, setFiles] = useState<ManagedFile[]>([]);
  const [path, setPath] = useState(""); // "" = root
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkName, setLinkName] = useState("");
  const [linkBusy, setLinkBusy] = useState(false);
  const [renameTarget, setRenameTarget] = useState<ManagedFile | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [moveTarget, setMoveTarget] = useState<ManagedFile | null>(null);
  const [moveFolder, setMoveFolder] = useState("");
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  useEffect(() => {
    let ready = 0;
    const done = () => { ready += 1; if (ready === 2) setLoading(false); };
    const offFolders = fsWatch<FolderRow>(
      COL.fileFolders,
      (rows) => { setFolders(rows); done(); },
      (e) => { setErr(e.message); done(); },
    );
    const offFiles = fsWatch<ManagedFile>(
      COL.files,
      (rows) => { setFiles(rows); done(); },
      (e) => { setErr(e.message); done(); },
    );
    return () => { offFolders(); offFiles(); };
  }, []);

  const crumbs = useMemo(() => (path ? path.split("/") : []), [path]);
  const childFolders = useMemo(
    () => folders.filter((f) => f.parent === path).sort((a, b) => a.name.localeCompare(b.name)),
    [folders, path],
  );
  const visibleFiles = useMemo(() => {
    const inFolder = files.filter((f) => (f.folder ?? "") === path);
    const filtered = accept === "images" ? inFolder.filter((f) => kindOf(f) === "image") : inFolder;
    return filtered.sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")));
  }, [files, path, accept]);
  const previewFiles = visibleFiles.filter((f) => kindOf(f) === "image");

  const createFolder = async () => {
    const name = sanitizeFolderName(newFolderName);
    if (!name) return;
    const fullPath = path ? `${path}/${name}` : name;
    if (folders.some((f) => f.path === fullPath)) {
      toast.error("A folder with that name already exists here");
      return;
    }
    try {
      await fsAdd(COL.fileFolders, { name, path: fullPath, parent: path });
      setNewFolderName("");
      setNewFolderOpen(false);
      toast.success("Folder created");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create folder");
    }
  };

  const removeFolder = async (folder: FolderRow) => {
    const hasFiles = files.some((f) => (f.folder ?? "") === folder.path || (f.folder ?? "").startsWith(`${folder.path}/`));
    const hasChildren = folders.some((f) => f.parent === folder.path || f.parent.startsWith(`${folder.path}/`));
    if (hasFiles || hasChildren) {
      toast.error("Folder is not empty — move or delete its contents first");
      return;
    }
    try {
      await fsDelete(COL.fileFolders, folder.id);
      toast.success("Folder deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete folder");
    }
  };

  const uploadFiles = async (list: FileList | null) => {
    const selected = list ? Array.from(list) : [];
    if (!selected.length) return;
    setUploadPct(0);
    try {
      let doneCount = 0;
      for (const file of selected) {
        const { url, publicId } = await uploadToCloudinary(
          file,
          `file-manager${path ? `/${path}` : ""}`,
          "auto",
          (pct) => setUploadPct(Math.round(((doneCount + pct / 100) / selected.length) * 100)),
        );
        await fsAdd(COL.files, {
          name: file.name,
          url,
          public_id: publicId,
          kind: file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : "file",
          size: file.size,
          folder: path,
          created_by: user?.uid ?? null,
        });
        doneCount += 1;
      }
      toast.success(`${doneCount} file${doneCount === 1 ? "" : "s"} uploaded`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploadPct(null);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const importLink = async () => {
    const url = linkUrl.trim();
    if (!url) return;
    setLinkBusy(true);
    try {
      const res = await uploadFromUrl({ data: { url, folder: `file-manager${path ? `/${path}` : ""}` } });
      const fallbackName = decodeURIComponent(url.split("/").pop()?.split("?")[0] ?? "file").slice(0, 80) || "file";
      await fsAdd(COL.files, {
        name: linkName.trim() || fallbackName,
        url: res.url,
        public_id: res.publicId,
        kind: res.kind === "image" || res.kind === "video" ? res.kind : "file",
        size: res.size,
        folder: path,
        created_by: user?.uid ?? null,
      });
      setLinkUrl("");
      setLinkName("");
      setLinkOpen(false);
      toast.success("File imported from link");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally {
      setLinkBusy(false);
    }
  };

  const saveRename = async () => {
    if (!renameTarget) return;
    const name = renameValue.trim();
    if (!name) return;
    try {
      await fsUpdate(COL.files, renameTarget.id, { name });
      setRenameTarget(null);
      toast.success("Renamed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Rename failed");
    }
  };

  const saveMove = async () => {
    if (!moveTarget) return;
    try {
      await fsUpdate(COL.files, moveTarget.id, { folder: moveFolder });
      setMoveTarget(null);
      toast.success("File moved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Move failed");
    }
  };

  const removeFile = async (f: ManagedFile) => {
    try {
      await fsDelete(COL.files, f.id);
      toast.success("File deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const copyUrl = (f: ManagedFile) => {
    navigator.clipboard?.writeText(f.url).then(
      () => toast.success("Link copied"),
      () => toast.error("Could not copy link"),
    );
  };

  const iconBtn = "rounded-md p-1.5 transition-colors hover:bg-white/10";
  const allFolderPaths = useMemo(() => folders.map((f) => f.path).sort(), [folders]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {path && (
          <AButton variant="ghost" onClick={() => setPath(crumbs.slice(0, -1).join("/"))}>
            <span className="inline-flex items-center gap-1.5"><FiArrowLeft /> Back</span>
          </AButton>
        )}
        <AButton variant="ghost" onClick={() => setNewFolderOpen(true)}>
          <span className="inline-flex items-center gap-1.5"><FiFolderPlus /> New folder</span>
        </AButton>
        <AButton variant="ghost" onClick={() => fileInput.current?.click()} disabled={uploadPct !== null}>
          <span className="inline-flex items-center gap-1.5"><FiUpload /> Upload</span>
        </AButton>
        <AButton variant="ghost" onClick={() => setLinkOpen(true)}>
          <span className="inline-flex items-center gap-1.5"><FiLink /> Add by link</span>
        </AButton>
        <input
          ref={fileInput}
          type="file"
          multiple
          className="hidden"
          accept={accept === "images" ? "image/*" : undefined}
          onChange={(e) => uploadFiles(e.currentTarget.files)}
        />
      </div>

      {/* Breadcrumb */}
      <div className="flex flex-wrap items-center gap-1 text-[12px]" style={{ color: dark.mute }}>
        <button onClick={() => setPath("")} className="hover:underline" style={{ color: path ? dark.mute : dark.accent }}>
          All files
        </button>
        {crumbs.map((c, i) => (
          <span key={i} className="inline-flex items-center gap-1">
            <span>/</span>
            <button
              onClick={() => setPath(crumbs.slice(0, i + 1).join("/"))}
              className="hover:underline"
              style={{ color: i === crumbs.length - 1 ? dark.accent : dark.mute }}
            >
              {c}
            </button>
          </span>
        ))}
      </div>

      {uploadPct !== null && (
        <div>
          <div className="flex items-center justify-between text-[11px] mb-1" style={{ color: dark.accent }}>
            <span>Uploading…</span><span>{uploadPct}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: dark.border }}>
            <div className="h-full transition-all duration-200" style={{ width: `${uploadPct}%`, background: dark.accent }} />
          </div>
        </div>
      )}

      {err && (
        <div className="rounded-lg px-4 py-3 text-[12px]" style={{ background: "rgba(224,80,80,0.1)", color: dark.danger }}>
          {err}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-[13px]" style={{ color: dark.mute }}>
          <FiLoader className="inline animate-spin mr-2" /> Loading files…
        </div>
      ) : (
        <>
          {/* Folders */}
          {childFolders.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {childFolders.map((f) => (
                <div
                  key={f.id}
                  className="group relative rounded-xl p-4 cursor-pointer transition-colors"
                  style={{ background: dark.field, border: `1px solid ${dark.border}` }}
                  onClick={() => setPath(f.path)}
                >
                  <FiFolder className="text-2xl mb-2" style={{ color: dark.accent }} />
                  <div className="text-[13px] font-medium truncate" style={{ color: dark.text }}>{f.name}</div>
                  <button
                    aria-label={`Delete folder ${f.name}`}
                    onClick={(e) => { e.stopPropagation(); removeFolder(f); }}
                    className={`${iconBtn} absolute top-2 right-2 opacity-0 group-hover:opacity-100`}
                    style={{ color: dark.danger }}
                  >
                    <FiTrash2 />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Files */}
          {visibleFiles.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {visibleFiles.map((f) => {
                const kind = kindOf(f);
                return (
                  <div
                    key={f.id}
                    className="group rounded-xl overflow-hidden"
                    style={{ background: dark.field, border: `1px solid ${dark.border}` }}
                  >
                    <div className="relative aspect-[4/3] flex items-center justify-center" style={{ background: "#101018" }}>
                      {kind === "image" ? (
                        <AButton variant="ghost" className="!p-0 !border-0 w-full h-full" aria-label={`Preview ${f.name}`} onClick={() => setPreviewIndex(previewFiles.findIndex((image) => image.id === f.id))}>
                          <img src={f.url} alt={f.name} className="w-full h-full object-cover" loading="lazy" />
                        </AButton>
                      ) : kind === "video" ? (
                        <FiFilm className="text-3xl" style={{ color: dark.mute }} />
                      ) : (
                        <FiFile className="text-3xl" style={{ color: dark.mute }} />
                      )}
                      {picker ? (
                          <AButton variant="ghost"
                          onClick={() => onPick?.(f)}
                           className="absolute bottom-2 right-2 flex items-center justify-center gap-2 text-[12px] font-semibold"
                        >
                          <FiCheck /> Use this file
                          </AButton>
                      ) : (
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button aria-label="Copy link" title="Copy link" onClick={() => copyUrl(f)} className={iconBtn} style={{ color: dark.text, background: "rgba(0,0,0,0.5)" }}><FiCopy /></button>
                          <button aria-label="Rename" title="Rename" onClick={() => { setRenameTarget(f); setRenameValue(f.name); }} className={iconBtn} style={{ color: dark.text, background: "rgba(0,0,0,0.5)" }}><FiEdit2 /></button>
                          <button aria-label="Move to folder" title="Move to folder" onClick={() => { setMoveTarget(f); setMoveFolder(f.folder ?? ""); }} className={iconBtn} style={{ color: dark.text, background: "rgba(0,0,0,0.5)" }}><FiMove /></button>
                          <button aria-label="Delete" title="Delete" onClick={() => removeFile(f)} className={iconBtn} style={{ color: dark.danger, background: "rgba(0,0,0,0.5)" }}><FiTrash2 /></button>
                        </div>
                      )}
                    </div>
                    <div className="px-3 py-2">
                      <div className="text-[12px] font-medium truncate" style={{ color: dark.text }} title={f.name}>{f.name}</div>
                      <div className="text-[10px]" style={{ color: dark.mute }}>{formatSize(f.size)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            childFolders.length === 0 && (
              <div className="rounded-xl p-10 text-center text-[13px]" style={{ background: dark.field, color: dark.mute }}>
                <FiImage className="text-3xl mx-auto mb-2" />
                This folder is empty. Upload files or add them by link.
              </div>
            )
          )}
        </>
      )}

      {/* New folder */}
      <ImagePreview
        images={previewFiles.map((f) => ({ url: f.url, name: f.name }))}
        index={previewIndex}
        onIndexChange={setPreviewIndex}
        onClose={() => setPreviewIndex(null)}
        onPick={picker ? (image) => { const file = previewFiles.find((f) => f.url === image.url); if (file) { setPreviewIndex(null); onPick?.(file); } } : undefined}
      />
      <AModal
        open={newFolderOpen}
        onClose={() => setNewFolderOpen(false)}
        title="New folder"
        subtitle={path ? `Inside: ${path}` : "At the top level"}
        footer={
          <>
            <AButton variant="ghost" onClick={() => setNewFolderOpen(false)}>Cancel</AButton>
            <AButton onClick={createFolder}>Create folder</AButton>
          </>
        }
      >
        <AInput
          autoFocus
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") createFolder(); }}
          placeholder="e.g. Product photos"
        />
      </AModal>

      {/* Add by link */}
      <AModal
        open={linkOpen}
        onClose={() => setLinkOpen(false)}
        title="Add file by link"
        subtitle="The file is fetched from the link and stored in your library."
        footer={
          <>
            <AButton variant="ghost" onClick={() => setLinkOpen(false)}>Cancel</AButton>
            <AButton onClick={importLink} disabled={linkBusy || !linkUrl.trim()}>
              {linkBusy ? "Importing…" : "Import file"}
            </AButton>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] mb-1.5" style={{ color: dark.mute }}>File link</div>
            <AInput type="url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://example.com/photo.jpg" />
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] mb-1.5" style={{ color: dark.mute }}>Custom name (optional)</div>
            <AInput value={linkName} onChange={(e) => setLinkName(e.target.value)} placeholder="e.g. Malwa sofa — side view" />
          </div>
        </div>
      </AModal>

      {/* Rename */}
      <AModal
        open={Boolean(renameTarget)}
        onClose={() => setRenameTarget(null)}
        title="Rename file"
        footer={
          <>
            <AButton variant="ghost" onClick={() => setRenameTarget(null)}>Cancel</AButton>
            <AButton onClick={saveRename} disabled={!renameValue.trim()}>Save name</AButton>
          </>
        }
      >
        <AInput
          autoFocus
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") saveRename(); }}
        />
      </AModal>

      {/* Move */}
      <AModal
        open={Boolean(moveTarget)}
        onClose={() => setMoveTarget(null)}
        title="Move to folder"
        footer={
          <>
            <AButton variant="ghost" onClick={() => setMoveTarget(null)}>Cancel</AButton>
            <AButton onClick={saveMove}>Move file</AButton>
          </>
        }
      >
        <ASelect value={moveFolder} onChange={(e) => setMoveFolder(e.target.value)}>
          <option value="">All files (top level)</option>
          {allFolderPaths.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </ASelect>
      </AModal>
    </div>
  );
}

/** Full File Manager panel for the admin sidebar. */
export function FileManager() {
  return <FileManagerBody />;
}

/** Modal picker used by other admin forms (e.g. product images). */
export function FilePickerModal({
  open,
  onClose,
  onPick,
  accept = "images",
  title = "Choose from File Manager",
}: {
  open: boolean;
  onClose: () => void;
  onPick: (file: ManagedFile) => void;
  accept?: "images" | "all";
  title?: string;
}) {
  if (!open) return null;
  return (
    <div data-admin-modal className="fixed inset-0 z-[1100] flex items-start justify-center overflow-y-auto bg-black/70 p-3 sm:p-6" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl rounded-2xl my-4"
        style={{ background: dark.card, border: `1px solid ${dark.border}`, color: dark.text }}
      >
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b" style={{ borderColor: dark.border }}>
          <div>
            <div className="text-[15px] font-semibold">{title}</div>
            <div className="text-[11px] mt-0.5" style={{ color: dark.mute }}>
              Image library
            </div>
          </div>
          <button onClick={onClose} className="text-lg leading-none px-2" style={{ color: dark.mute }} aria-label="Close">
            <FiX />
          </button>
        </div>
        <div className="px-5 py-5">
          <FileManagerBody picker accept={accept} onPick={(f) => { onPick(f); onClose(); }} />
        </div>
      </div>
    </div>
  );
}
