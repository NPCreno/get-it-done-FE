"use client";
import { useSyncExternalStore } from "react";
import { X } from "lucide-react";
import { useAppearance } from "@/hooks/useAppearance";
import { previewLabel } from "@/lib/appearance";
import { endPreview, getPreview, getServerPreview, subscribePreview } from "@/lib/themePreview";

/**
 * RD-2 dev theme preview chip (plan 52-0 §4): "Preview: Calm · Dark ×", bottom-left, while a
 * `?theme=`/`?mode=` preview is on in this tab. Rendered only in development builds (the root
 * layout's AppearanceSync checks `NODE_ENV`), and the store is always empty in production.
 */
export default function ThemePreviewChip() {
  const preview = useSyncExternalStore(subscribePreview, getPreview, getServerPreview);
  const appearance = useAppearance();
  if (!preview) return null;
  const label = previewLabel(appearance);
  return (
    <div
      role="status"
      className="fixed bottom-4 left-16 z-[100] flex items-center gap-1 rounded-full border border-th-line bg-th-card py-1 pl-3 pr-1 font-ui text-xs font-bold text-th-ink shadow-md"
    >
      <span>{label}</span>
      <button
        type="button"
        onClick={endPreview}
        aria-label="End theme preview"
        className="grid size-7 place-items-center rounded-full text-th-ink2 hover:bg-th-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-th-focus"
      >
        <X aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}
