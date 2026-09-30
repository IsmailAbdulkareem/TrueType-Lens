'use client';

import React from 'react';
import {
  Sparkles,
  Upload,
  Download,
  Eye,
  SlidersHorizontal,
  RotateCcw,
  Undo2,
  Redo2,
  Copy,
  Layers,
  Wand2,
  Image as ImageIcon,
} from 'lucide-react';
import { SAMPLE_IMAGES, SampleImage } from '@/lib/sample-images';

interface NavbarProps {
  onUploadClick: () => void;
  onSelectSample: (sample: SampleImage) => void;
  onScanWithAi: () => void;
  isScanning: boolean;
  onOpenExport: () => void;
  splitView: boolean;
  onToggleSplitView: () => void;
  onReset: () => void;
  hasImage: boolean;
  layerCount: number;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  historyAction?: string;
}

export function Navbar({
  onUploadClick,
  onSelectSample,
  onScanWithAi,
  isScanning,
  onOpenExport,
  splitView,
  onToggleSplitView,
  onReset,
  hasImage,
  layerCount,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  historyAction,
}: NavbarProps) {
  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-4 flex items-center justify-between z-30 sticky top-0">
      {/* Brand & Title */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-teal-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
          <Wand2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-slate-100 tracking-tight text-base sm:text-lg flex items-center gap-1.5">
              TrueType <span className="text-cyan-400">Lens</span>
            </h1>
            <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase bg-cyan-950 text-cyan-400 border border-cyan-800/60 rounded-full">
              Photorealistic Text Inpainter
            </span>
          </div>
          <p className="text-xs text-slate-400 hidden md:block">
            Auto font detection, style transfer & photographic grain blending
          </p>
        </div>
      </div>

      {/* Preset Samples Selector */}
      <div className="hidden lg:flex items-center gap-1.5 bg-slate-950/70 border border-slate-800 p-1 rounded-xl">
        <span className="text-xs text-slate-400 px-2 flex items-center gap-1 font-medium">
          <ImageIcon className="w-3.5 h-3.5 text-cyan-400" /> Demo:
        </span>
        {SAMPLE_IMAGES.map((sample) => (
          <button
            key={sample.id}
            onClick={() => onSelectSample(sample)}
            className="px-2.5 py-1 text-xs rounded-lg font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            {sample.title.split(' ')[0]}
          </button>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        {/* Undo / Redo Group */}
        {hasImage && (
          <div className="flex items-center bg-slate-950/70 border border-slate-800 p-0.5 rounded-lg">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              title={`Undo (${canUndo ? 'Ctrl+Z' : 'No changes to undo'})`}
              className={`p-1.5 rounded-md transition-colors flex items-center gap-1 ${
                canUndo
                  ? 'text-slate-200 hover:text-white hover:bg-slate-800'
                  : 'text-slate-600 cursor-not-allowed'
              }`}
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <div className="w-px h-3.5 bg-slate-800 mx-0.5" />
            <button
              onClick={onRedo}
              disabled={!canRedo}
              title={`Redo (${canRedo ? 'Ctrl+Y' : 'No changes to redo'})`}
              className={`p-1.5 rounded-md transition-colors flex items-center gap-1 ${
                canRedo
                  ? 'text-slate-200 hover:text-white hover:bg-slate-800'
                  : 'text-slate-600 cursor-not-allowed'
              }`}
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Reset */}
        {hasImage && (
          <button
            onClick={onReset}
            title="Reset canvas to original"
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}

        {/* Before / After Split Slider Toggle */}
        {hasImage && (
          <button
            onClick={onToggleSplitView}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all border ${
              splitView
                ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-sm shadow-cyan-500/30'
                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Before / After</span>
          </button>
        )}

        {/* Scan with AI */}
        {hasImage && (
          <button
            onClick={onScanWithAi}
            disabled={isScanning}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all ${
              isScanning
                ? 'bg-indigo-600/50 text-indigo-200 cursor-not-allowed'
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-md shadow-indigo-500/20 active:scale-95'
            }`}
          >
            <Sparkles className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Scanning...' : 'Scan Text with AI'}</span>
          </button>
        )}

        {/* Upload Custom Image */}
        <button
          onClick={onUploadClick}
          className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors"
        >
          <Upload className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">Upload Image</span>
        </button>

        {/* Export / Download */}
        {hasImage && (
          <button
            onClick={onOpenExport}
            className="px-4 py-1.5 text-xs font-bold rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 flex items-center gap-1.5 shadow-md shadow-cyan-500/30 transition-all active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
        )}
      </div>
    </header>
  );
}
