import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const OUTPUT_SIZE = 512;
const FRAME_SIZE = 260;

/**
 * Square crop dialog for profile pictures: drag to reposition, zoom to fill.
 * Exports a compressed JPEG so uploads stay small.
 */
export function AvatarCropper({
  file,
  open,
  pending,
  onCancel,
  onConfirm,
}: {
  file: File | null;
  open: boolean;
  pending?: boolean;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
}) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!file) {
      setImage(null);
      return;
    }
    const url = URL.createObjectURL(file);
    const element = new Image();
    element.onload = () => {
      setImage(element);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    };
    element.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Base scale makes the shorter edge exactly fill the square frame.
  const baseScale = image ? FRAME_SIZE / Math.min(image.width, image.height) : 1;
  const scale = baseScale * zoom;

  const clamp = (next: { x: number; y: number }) => {
    if (!image) return { x: 0, y: 0 };
    const maxX = Math.max(0, (image.width * scale - FRAME_SIZE) / 2);
    const maxY = Math.max(0, (image.height * scale - FRAME_SIZE) / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, next.x)),
      y: Math.min(maxY, Math.max(-maxY, next.y)),
    };
  };

  useEffect(() => {
    setOffset((current) => clamp(current));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, image]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, FRAME_SIZE, FRAME_SIZE);
    const width = image.width * scale;
    const height = image.height * scale;
    context.drawImage(
      image,
      (FRAME_SIZE - width) / 2 + offset.x,
      (FRAME_SIZE - height) / 2 + offset.y,
      width,
      height,
    );
  }, [image, scale, offset]);

  const exportCrop = () => {
    if (!image) return;
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const context = canvas.getContext("2d");
    if (!context) return;
    const ratio = OUTPUT_SIZE / FRAME_SIZE;
    const width = image.width * scale * ratio;
    const height = image.height * scale * ratio;
    context.drawImage(
      image,
      (OUTPUT_SIZE - width) / 2 + offset.x * ratio,
      (OUTPUT_SIZE - height) / 2 + offset.y * ratio,
      width,
      height,
    );
    canvas.toBlob((blob) => blob && onConfirm(blob), "image/jpeg", 0.9);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? onCancel() : undefined)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Position your photo</DialogTitle>
          <DialogDescription>
            Drag the image to reposition it and zoom until it fills the circle.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-5">
          <div
            className="relative overflow-hidden rounded-full border border-border-strong bg-muted"
            style={{ width: FRAME_SIZE, height: FRAME_SIZE }}
            onPointerDown={(event) => {
              dragRef.current = { x: event.clientX - offset.x, y: event.clientY - offset.y };
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              if (!dragRef.current) return;
              setOffset(
                clamp({
                  x: event.clientX - dragRef.current.x,
                  y: event.clientY - dragRef.current.y,
                }),
              );
            }}
            onPointerUp={() => {
              dragRef.current = null;
            }}
          >
            <canvas
              ref={canvasRef}
              width={FRAME_SIZE}
              height={FRAME_SIZE}
              className="cursor-grab touch-none active:cursor-grabbing"
            />
          </div>

          <div className="w-full max-w-xs space-y-2">
            <Label htmlFor="avatar-zoom">Zoom</Label>
            <Slider
              id="avatar-zoom"
              min={1}
              max={3}
              step={0.01}
              value={[zoom]}
              onValueChange={(value) => setZoom(value[0] ?? 1)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={exportCrop} disabled={!image || pending}>
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            Save photo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
