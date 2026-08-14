import { useEffect, useMemo, useState } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

/** Client-side pagination for already-fetched admin lists. */
export function usePaged<T>(rows: T[], pageSize = 20) {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  useEffect(() => {
    if (page > pages) setPage(1);
  }, [pages, page]);
  const slice = useMemo(
    () => rows.slice((page - 1) * pageSize, page * pageSize),
    [rows, page, pageSize],
  );
  return { slice, page, pages, setPage, total: rows.length };
}

export function Pager({
  page,
  pages,
  total,
  onPage,
  label = "records",
}: {
  page: number;
  pages: number;
  total: number;
  onPage: (p: number) => void;
  label?: string;
}) {
  if (total === 0) return null;
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-3 text-[12px]" style={{ color: "#888899" }}>
      <span>
        {total} {label}
        {pages > 1 ? ` · page ${page} of ${pages}` : ""}
      </span>
      {pages > 1 && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="rounded-md px-2 py-1 disabled:opacity-40"
            style={{ border: "1px solid #2A2A38", color: "#E8E8F0" }}
            aria-label="Previous page"
          ><FiChevronLeft /></button>
          <button
            onClick={() => onPage(Math.min(pages, page + 1))}
            disabled={page === pages}
            className="rounded-md px-2 py-1 disabled:opacity-40"
            style={{ border: "1px solid #2A2A38", color: "#E8E8F0" }}
            aria-label="Next page"
          ><FiChevronRight /></button>
        </div>
      )}
    </div>
  );
}

/** Styled checkbox used in admin tables. */
export function ACheck({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className="grid size-[18px] place-items-center rounded-[5px] transition-colors"
      style={{
        background: checked ? "#C8A86B" : "transparent",
        border: `1.5px solid ${checked ? "#C8A86B" : "#3A3A4A"}`,
      }}
    >
      {checked && (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      )}
    </button>
  );
}
