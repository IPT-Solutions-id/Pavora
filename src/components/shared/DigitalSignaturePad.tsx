import React, { useEffect, useRef, useState } from 'react';
import { Eraser, PenLine } from 'lucide-react';

interface DigitalSignaturePadProps {
  value: string;
  onChange: (dataUrl: string) => void;
  signerLabel?: string;
}

export const DigitalSignaturePad: React.FC<DigitalSignaturePadProps> = ({
  value,
  onChange,
  signerLabel,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const [hasStroke, setHasStroke] = useState(Boolean(value));

  useEffect(() => {
    setHasStroke(Boolean(value));
    if (!value && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
  }, [value]);

  const getRelativePoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / Math.max(1, rect.width);
    const scaleY = canvas.height / Math.max(1, rect.height);
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.setPointerCapture(e.pointerId);
    const pt = getRelativePoint(e);
    ctx.strokeStyle = '#102B69';
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
    isDrawingRef.current = true;
    setHasStroke(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pt = getRelativePoint(e);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
  };

  const commitStroke = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    onChange(canvas.toDataURL('image/png'));
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
    setHasStroke(false);
    onChange('');
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 font-semibold text-[#102B69]">
          <PenLine className="w-3.5 h-3.5 text-[#1468E8]" aria-hidden="true" />
          <span>
            Area Tanda Tangan Digital{signerLabel ? ` (${signerLabel})` : ''}
          </span>
        </span>
        <button
          type="button"
          onClick={handleClear}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#64748B] hover:text-[#102B69] bg-white border border-[#E2E8F0] rounded-[4px] whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Eraser className="w-3 h-3" aria-hidden="true" />
          <span>Bersihkan Tanda Tangan</span>
        </button>
      </div>

      <div className="relative bg-white border border-[#CBD5E1] rounded-[4px] overflow-hidden">
        <canvas
          ref={canvasRef}
          width={520}
          height={160}
          data-testid="pkwt-signature-canvas"
          aria-label="Kanvas tanda tangan digital karyawan"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={commitStroke}
          onPointerCancel={commitStroke}
          onPointerLeave={commitStroke}
          className="w-full h-[140px] touch-none cursor-crosshair block"
        />
        {!hasStroke && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-[#94A3B8]">
            Goreskan tanda tangan Anda di sini menggunakan mouse atau sentuhan layar
          </div>
        )}
      </div>
    </div>
  );
};
