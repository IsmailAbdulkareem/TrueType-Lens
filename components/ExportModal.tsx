'use client';

import React, { useState } from 'react';
import { X, Download, Copy, Check, FileImage, ShieldCheck, Sparkles } from 'lucide-react';
import { TextLayer, drawRealisticText, inpaintRegion } from '@/lib/canvas-renderer';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string | null;
  layers: TextLayer[];
}

export function ExportModal({ isOpen, onClose, imageSrc, layers }: ExportModalProps) {
  const [format, setFormat] = useState<'png' | 'jpeg' | 'webp'>('png');
  const [quality, setQuality] = useState<number>(0.95);
  const [copied, setCopied] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  if (!isOpen || !imageSrc) return null;

  // Render full-resolution final canvas
  const generateExportBlob = async (): Promise<{ blob: Blob; dataUrl: string } | null> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = imageSrc;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }

        // Draw original base image
        ctx.drawImage(img, 0, 0);

        // Inpaint original text regions
        layers.forEach((layer) => {
          if (layer.visible && layer.inpaintOriginal) {
            inpaintRegion(ctx, img.width, img.height, layer);
          }
        });

        // Draw new realistic text
        layers.forEach((layer) => {
          if (layer.visible) {
            drawRealisticText(ctx, img.width, img.height, layer);
          }
        });

        const mime = `image/${format}`;
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const dataUrl = canvas.toDataURL(mime, quality);
              resolve({ blob, dataUrl });
            } else {
              resolve(null);
            }
          },
          mime,
          quality
        );
      };
    });
  };

  // Download Handler
  const handleDownload = async () => {
    setIsExporting(true);
    try {
      const result = await generateExportBlob();
      if (!result) return;
      const link = document.createElement('a');
      link.href = result.dataUrl;
      link.download = `truetype-edited-${Date.now()}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      onClose();
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Copy to Clipboard Handler
  const handleCopyClipboard = async () => {
    try {
      const result = await generateExportBlob();
      if (!result) return;
      if (navigator.clipboard && (window as any).ClipboardItem) {
        // ClipboardItem requires image/png
        const pngBlob =
          format === 'png'
            ? result.blob
            : await (await fetch(result.dataUrl)).blob();
        await navigator.clipboard.write([
          new ClipboardItem({
            'image/png': pngBlob,
          }),
        ]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100">Export Realistic Image</h3>
              <p className="text-[11px] text-slate-400">Export at full original photographic resolution</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* Format selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              File Format
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'png', label: 'PNG', desc: 'Lossless & Crisp' },
                { id: 'jpeg', label: 'JPEG', desc: 'Photo Compact' },
                { id: 'webp', label: 'WebP', desc: 'Modern Web' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFormat(f.id as any)}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    format === f.id
                      ? 'bg-cyan-950/40 border-cyan-500 text-cyan-300 font-bold shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <span className="block text-sm">{f.label}</span>
                  <span className="text-[10px] text-slate-500 font-normal">{f.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quality slider (for JPEG / WebP) */}
          {format !== 'png' && (
            <div className="space-y-1.5 p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Quality</span>
                <span className="font-mono text-cyan-400">{Math.round(quality * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.6"
                max="1.0"
                step="0.05"
                value={quality}
                onChange={(e) => setQuality(parseFloat(e.target.value))}
                className="w-full accent-cyan-400"
              />
            </div>
          )}

          {/* Resolution Badge */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-slate-400">
            <span className="flex items-center gap-1.5 text-[11px]">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Grain & perspective blended at 100% native scale</span>
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center gap-2">
          <button
            onClick={handleCopyClipboard}
            className="flex-1 py-2.5 px-3 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400">Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-400" />
                <span>Copy Image</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownload}
            disabled={isExporting}
            className="flex-1 py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 active:scale-98 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Exporting...' : 'Download File'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
