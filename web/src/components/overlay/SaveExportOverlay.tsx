import { LuVideo, LuX } from "react-icons/lu";
import { Button } from "../ui/button";
import { FaCompactDisc } from "react-icons/fa";
import { cn } from "@/lib/utils";
import { Trans } from "react-i18next";

type SaveExportOverlayProps = {
  className: string;
  show: boolean;
  onPreview: () => void;
  onSave: () => void;
  onCancel: () => void;
};
export default function SaveExportOverlay({
  className,
  show,
  onPreview,
  onSave,
  onCancel,
}: SaveExportOverlayProps) {
  return (
    <div className={className}>
      <div
        className={cn(
          "pointer-events-auto flex items-center justify-center gap-2 rounded-lg px-2",
          show ? "duration-500 animate-in slide-in-from-top" : "invisible",
          "mx-auto mt-5 text-center",
        )}
      >
        <Button
          className="flex items-center gap-1 text-primary"
          aria-label="Cancel"
          size="sm"
          onClick={onCancel}
        >
          <LuX />
          <Trans>ui.cancel</Trans>
        </Button>
        <Button
          className="flex items-center gap-1"
          aria-label="Preview export"
          size="sm"
          onClick={onPreview}
        >
          <LuVideo />
          <Trans>ui.dialog.export.fromTimeline.previewExport</Trans>
        </Button>
        <Button
          className="flex items-center gap-1"
          aria-label="Save export"
          variant="select"
          size="sm"
          onClick={onSave}
        >
          <FaCompactDisc />
          <Trans>ui.dialog.export.fromTimeline.saveExport</Trans>
        </Button>
      </div>
    </div>
  );
}
