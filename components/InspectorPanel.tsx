'use client';

import React, { useState } from 'react';
import {
  Type,
  Palette,
  Camera,
  Layers,
  Sparkles,
  Pipette,
  RotateCw,
  Sliders,
  Eye,
  Trash2,
  Copy,
  ChevronDown,
  Info,
  Maximize2,
  ShieldAlert,
  Flame,
} from 'lucide-react';
import { TextLayer } from '@/lib/canvas-renderer';
import { TypographyStyle, extractStylesFromLayers, applyStyleToLayer, findNearestStyle } from '@/lib/style-transfer';

interface InspectorPanelProps {
  selectedLayer: TextLayer | null;
  layers: TextLayer[];
  onUpdateLayer: (layer: TextLayer, actionLabel?: string) => void;
  onDeleteLayer: (id: string) => void;
  onDuplicateLayer: (layer: TextLayer) => void;
  onStartEyedropper: (target: 'color' | 'outlineColor' | 'shadowColor' | 'backgroundColor') => void;
  activeEyedropper: string | null;
  onTriggerAiInpaint: (instructions: string) => void;
  isAiInpainting: boolean;
  onStartStylePicker: () => void;
  isStylePickerActive: boolean;
}

const POPULAR_FONTS = [
  { name: 'Inter', category: 'Clean Sans-Serif', cssFamily: 'Inter, sans-serif' },
  { name: 'Montserrat', category: 'Modern Geometric Sans', cssFamily: 'Montserrat, sans-serif' },
  { name: 'Oswald', category: 'Condensed Display', cssFamily: 'Oswald, sans-serif' },
  { name: 'Playfair Display', category: 'Elegant Editorial Serif', cssFamily: '"Playfair Display", serif' },
  { name: 'Cinzel', category: 'Luxury Roman Serif', cssFamily: 'Cinzel, serif' },
  { name: 'Space Grotesk', category: 'Tech & Modernist', cssFamily: '"Space Grotesk", sans-serif' },
  { name: 'Rubik', category: 'Rounded Friendly Sans', cssFamily: 'Rubik, sans-serif' },
  { name: 'Caveat', category: 'Handwritten / Script', cssFamily: 'Caveat, cursive' },
  { name: 'Courier Prime', category: 'Typewriter Monospace', cssFamily: '"Courier Prime", monospace' },
  { name: 'Impact', category: 'Bold Heavy Headline', cssFamily: 'Impact, sans-serif' },
  { name: 'Arial', category: 'Standard Sans', cssFamily: 'Arial, sans-serif' },
  { name: 'Georgia', category: 'Standard Serif', cssFamily: 'Georgia, serif' },
];

const BLEND_MODES: Array<{ value: GlobalCompositeOperation; label: string; desc: string }> = [
  { value: 'source-over', label: 'Normal (Opaque)', desc: 'Standard decals, stickers, sharp billboards' },
  { value: 'multiply', label: 'Multiply (Ink / Print)', desc: 'Natural ink on paper, t-shirts, wood, chalk' },
  { value: 'screen', label: 'Screen (Glow / Neon)', desc: 'Illuminated signs, light bulbs, screens' },
  { value: 'overlay', label: 'Overlay (Textured)', desc: 'Blends into underlying lighting & shadows' },
  { value: 'soft-light', label: 'Soft Light (Subtle)', desc: 'Delicate tint matching background' },
];

export function InspectorPanel({
  selectedLayer,
  layers,
  onUpdateLayer,
  onDeleteLayer,
  onDuplicateLayer,
  onStartEyedropper,
  activeEyedropper,
  onTriggerAiInpaint,
  isAiInpainting,
  onStartStylePicker,
  isStylePickerActive,
}: InspectorPanelProps) {
  const [activeTab, setActiveTab] = useState<'text' | 'photorealism' | 'inpaint' | 'ai'>('text');
  const [aiInstructions, setAiInstructions] = useState('');

  if (!selectedLayer) {
    return (
      <aside className="w-80 border-l border-slate-800 bg-slate-900/60 p-6 flex flex-col items-center justify-center text-center select-none">
        <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mb-4 text-cyan-400">
          <Type className="w-7 h-7" />
        </div>
        <h3 className="font-semibold text-slate-200 text-sm mb-1">No Text Layer Selected</h3>
        <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
          Click on any text box on the canvas or click &quot;Scan Text with AI&quot; to detect and edit text.
        </p>
      </aside>
    );
  }

  const update = (patch: Partial<TextLayer>, actionLabel?: string) => {
    onUpdateLayer({ ...selectedLayer, ...patch }, actionLabel);
  };

  // Extract detected typography styles from the image
  const detectedStyles = extractStylesFromLayers(layers);

  // Auto match nearest style
  const handleAutoMatchNearest = () => {
    const nearest = findNearestStyle(selectedLayer.box, layers, selectedLayer.id);
    if (nearest) {
      const updated = applyStyleToLayer(selectedLayer, nearest);
      onUpdateLayer(updated, `Auto-matched style from ${nearest.name}`);
    }
  };

  const handleApplyStyle = (style: TypographyStyle) => {
    const updated = applyStyleToLayer(selectedLayer, style);
    onUpdateLayer(updated, `Applied ${style.fontFamily} style`);
  };

  return (
    <aside className="w-84 xl:w-92 border-l border-slate-800 bg-slate-900/90 flex flex-col h-full overflow-hidden select-none">
      {/* Layer Header */}
      <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400" />
          <span className="font-semibold text-xs text-slate-200 truncate">
            {selectedLayer.originalText ? `Editing: "${selectedLayer.originalText}"` : 'Text Layer'}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onDuplicateLayer(selectedLayer)}
            title="Duplicate Layer"
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDeleteLayer(selectedLayer.id)}
            title="Delete Layer"
            className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-md transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-950/60 text-xs font-medium">
        <button
          onClick={() => setActiveTab('text')}
          className={`flex-1 py-2.5 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === 'text'
              ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Type className="w-3.5 h-3.5" />
          <span>Text & Font</span>
        </button>

        <button
          onClick={() => setActiveTab('photorealism')}
          className={`flex-1 py-2.5 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === 'photorealism'
              ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          <span>Realism</span>
        </button>

        <button
          onClick={() => setActiveTab('inpaint')}
          className={`flex-1 py-2.5 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === 'inpaint'
              ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Healing</span>
        </button>

        <button
          onClick={() => setActiveTab('ai')}
          className={`flex-1 py-2.5 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === 'ai'
              ? 'border-indigo-400 text-indigo-400 bg-indigo-950/20 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI Gen</span>
        </button>
      </div>

      {/* Tab Body Scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs text-slate-300">
        {/* ================= TAB 1: TEXT & FONT ================= */}
        {activeTab === 'text' && (
          <>
            {/* New Text Input */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Replacement Text
              </label>
              <textarea
                value={selectedLayer.currentText}
                onChange={(e) => update({ currentText: e.target.value }, 'Edited text')}
                rows={2}
                placeholder="Type new text here..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 text-sm focus:outline-none focus:border-cyan-500 transition-colors font-medium resize-none"
              />
              <div className="flex items-center gap-1">
                {(['uppercase', 'capitalize', 'lowercase', 'none'] as const).map((trans) => (
                  <button
                    key={trans}
                    onClick={() => update({ textTransform: trans }, `Set text casing to ${trans}`)}
                    className={`flex-1 py-1 text-[10px] rounded border transition-colors ${
                      selectedLayer.textTransform === trans
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 font-bold'
                        : 'bg-slate-800/80 border-slate-700/80 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {trans === 'none' ? 'Default' : trans === 'uppercase' ? 'ABC' : trans === 'capitalize' ? 'Abc' : 'abc'}
                  </button>
                ))}
              </div>
            </div>

            {/* Font Detection & Style Transfer Module */}
            <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-950/40 via-slate-950 to-slate-950 border border-indigo-800/40 space-y-2.5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-indigo-300 font-bold text-[11px] uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Style Transfer & Font Matcher</span>
                </div>
                <button
                  onClick={onStartStylePicker}
                  title="Click any text on the image to sample and copy its complete typography style"
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 border transition-colors ${
                    isStylePickerActive
                      ? 'bg-indigo-500 text-white border-indigo-400 animate-pulse'
                      : 'bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-300 border-indigo-700/60'
                  }`}
                >
                  <Pipette className="w-3 h-3" />
                  <span>{isStylePickerActive ? 'Pick from Image' : 'Style Dropper'}</span>
                </button>
              </div>

              {/* Auto Match Nearest Style Button */}
              <button
                onClick={handleAutoMatchNearest}
                className="w-full py-1.5 px-3 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 active:scale-98 text-indigo-200 border border-indigo-500/40 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Auto-Match Closest Image Font</span>
              </button>

              {/* Detected Typography Profiles from Image */}
              {detectedStyles.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] text-slate-400 font-medium block">
                    Detected Fonts in Image ({detectedStyles.length}):
                  </span>
                  <div className="grid grid-cols-1 gap-1.5 max-h-36 overflow-y-auto pr-1">
                    {detectedStyles.map((style) => {
                      const isCurrent =
                        selectedLayer.fontFamily === style.fontFamily &&
                        selectedLayer.fontWeight === style.fontWeight &&
                        selectedLayer.color.toLowerCase() === style.color.toLowerCase();

                      return (
                        <div
                          key={style.id}
                          className={`p-2 rounded-lg border text-left flex items-center justify-between transition-all ${
                            isCurrent
                              ? 'bg-indigo-950/70 border-indigo-500 text-white ring-1 ring-indigo-500/50'
                              : 'bg-slate-900 hover:bg-slate-800/80 border-slate-800 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 overflow-hidden flex-1">
                            <div
                              className="w-3.5 h-3.5 rounded-full border border-slate-600 shrink-0"
                              style={{ backgroundColor: style.color }}
                            />
                            <div className="truncate flex-1">
                              <span
                                className="font-semibold text-xs block truncate text-slate-100"
                                style={{ fontFamily: style.fontFamily }}
                              >
                                {style.fontFamily} {style.fontWeight}
                              </span>
                              <span className="text-[10px] text-slate-400 block truncate">
                                {style.sourceText ? `From ${style.name}` : style.blendMode}
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={() => handleApplyStyle(style)}
                            className={`px-2 py-1 rounded text-[10px] font-bold transition-colors ${
                              isCurrent
                                ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-400/40'
                                : 'bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-300 border border-slate-700'
                            }`}
                          >
                            {isCurrent ? 'Active' : 'Apply'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Exact Color Matching */}
            <div className="space-y-2 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-cyan-400" /> Text Color Match
                </span>
                <button
                  onClick={() => onStartEyedropper('color')}
                  className={`px-2 py-1 rounded text-[11px] flex items-center gap-1 border transition-colors ${
                    activeEyedropper === 'color'
                      ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400'
                      : 'bg-slate-800 hover:bg-slate-700 text-cyan-400 border-slate-700'
                  }`}
                >
                  <Pipette className="w-3 h-3" />
                  <span>{activeEyedropper === 'color' ? 'Pick from image' : 'Eyedropper'}</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={selectedLayer.color}
                  onChange={(e) => update({ color: e.target.value })}
                  className="w-9 h-9 rounded-lg border border-slate-700 bg-transparent cursor-pointer"
                />
                <input
                  type="text"
                  value={selectedLayer.color}
                  onChange={(e) => update({ color: e.target.value })}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-100 uppercase"
                />
              </div>

              {/* Quick Preset Color Swatches */}
              <div className="flex items-center gap-1.5 pt-1">
                {[
                  selectedLayer.color,
                  '#FFFFFF',
                  '#EAE6D9',
                  '#F4D06F',
                  '#FF2A85',
                  '#00F0FF',
                  '#E63946',
                  '#1D3557',
                  '#1A1A1A',
                ].map((c, i) => (
                  <button
                    key={i}
                    onClick={() => update({ color: c })}
                    style={{ backgroundColor: c }}
                    className="w-5 h-5 rounded-full border border-slate-700 shadow-sm hover:scale-110 transition-transform"
                    title={c}
                  />
                ))}
              </div>
            </div>

            {/* Typography Selection */}
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Font Family
                </label>
                <select
                  value={selectedLayer.fontFamily}
                  onChange={(e) => update({ fontFamily: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 text-xs focus:outline-none focus:border-cyan-500 font-medium"
                >
                  {POPULAR_FONTS.map((font) => (
                    <option key={font.name} value={font.name}>
                      {font.name} — {font.category}
                    </option>
                  ))}
                </select>
              </div>

              {/* Weight & Style */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Weight</label>
                  <select
                    value={selectedLayer.fontWeight}
                    onChange={(e) => update({ fontWeight: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-slate-100 text-xs"
                  >
                    <option value="300">300 Light</option>
                    <option value="400">400 Regular</option>
                    <option value="600">600 SemiBold</option>
                    <option value="700">700 Bold</option>
                    <option value="800">800 ExtraBold</option>
                    <option value="900">900 Black</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Style</label>
                  <select
                    value={selectedLayer.fontStyle}
                    onChange={(e) => update({ fontStyle: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-slate-100 text-xs"
                  >
                    <option value="normal">Normal</option>
                    <option value="italic">Italic</option>
                  </select>
                </div>
              </div>

              {/* Letter Spacing & Line Height */}
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-400">Letter Spacing (Tracking)</span>
                    <span className="font-mono text-cyan-400">{selectedLayer.letterSpacing || 0}px</span>
                  </div>
                  <input
                    type="range"
                    min="-4"
                    max="20"
                    step="0.5"
                    value={selectedLayer.letterSpacing || 0}
                    onChange={(e) => update({ letterSpacing: parseFloat(e.target.value) })}
                    className="w-full accent-cyan-400"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-400">Font Size Scaling</span>
                    <span className="font-mono text-cyan-400">
                      {selectedLayer.fontSize > 0 ? `${selectedLayer.fontSize}px` : 'Auto-Fit'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="140"
                    value={selectedLayer.fontSize || 36}
                    onChange={(e) => update({ fontSize: parseInt(e.target.value) })}
                    className="w-full accent-cyan-400"
                  />
                </div>
              </div>
            </div>

            {/* Outline / Stroke & Shadow Accents */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              {/* Outline Toggle */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedLayer.hasOutline}
                    onChange={(e) => update({ hasOutline: e.target.checked })}
                    className="rounded accent-cyan-400"
                  />
                  <span className="font-medium text-slate-300">Stroke / Outline</span>
                </label>
                {selectedLayer.hasOutline && (
                  <button
                    onClick={() => onStartEyedropper('outlineColor')}
                    className="text-[10px] text-cyan-400 hover:underline"
                  >
                    Pick
                  </button>
                )}
              </div>

              {selectedLayer.hasOutline && (
                <div className="flex items-center gap-2 pl-4">
                  <input
                    type="color"
                    value={selectedLayer.outlineColor || '#000000'}
                    onChange={(e) => update({ outlineColor: e.target.value })}
                    className="w-7 h-7 rounded border border-slate-700 bg-transparent cursor-pointer"
                  />
                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-[10px] text-slate-400">Width:</span>
                    <input
                      type="range"
                      min="1"
                      max="12"
                      value={selectedLayer.outlineWidth || 2}
                      onChange={(e) => update({ outlineWidth: parseInt(e.target.value) })}
                      className="flex-1 accent-cyan-400"
                    />
                    <span className="font-mono text-[10px] text-slate-300">{selectedLayer.outlineWidth || 2}px</span>
                  </div>
                </div>
              )}

              {/* Shadow Toggle */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedLayer.hasShadow}
                    onChange={(e) => update({ hasShadow: e.target.checked })}
                    className="rounded accent-cyan-400"
                  />
                  <span className="font-medium text-slate-300">Drop Shadow / Glow</span>
                </label>
              </div>

              {selectedLayer.hasShadow && (
                <div className="space-y-2 pl-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={selectedLayer.shadowColor || '#000000'}
                      onChange={(e) => update({ shadowColor: e.target.value })}
                      className="w-7 h-7 rounded border border-slate-700 bg-transparent cursor-pointer"
                    />
                    <div className="flex-1 flex items-center gap-2">
                      <span className="text-[10px] text-slate-400">Blur:</span>
                      <input
                        type="range"
                        min="0"
                        max="30"
                        value={selectedLayer.shadowBlur || 4}
                        onChange={(e) => update({ shadowBlur: parseInt(e.target.value) })}
                        className="flex-1 accent-cyan-400"
                      />
                      <span className="font-mono text-[10px] text-slate-300">{selectedLayer.shadowBlur || 4}px</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* ================= TAB 2: PHOTOREALISM ================= */}
        {activeTab === 'photorealism' && (
          <div className="space-y-5">
            <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-800/40 text-cyan-200/90 text-[11px] leading-relaxed flex items-start gap-2">
              <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <span>
                To look 100% real, text must match the camera’s optical lens softness, sensor noise grain, and light interaction mode.
              </span>
            </div>

            {/* Photometric Blend Mode */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Photometric Blend Mode
              </label>
              <select
                value={selectedLayer.blendMode}
                onChange={(e) => update({ blendMode: e.target.value as any })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 text-xs focus:outline-none focus:border-cyan-500 font-medium"
              >
                {BLEND_MODES.map((mode) => (
                  <option key={mode.value} value={mode.value}>
                    {mode.label}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400">
                {BLEND_MODES.find((m) => m.value === selectedLayer.blendMode)?.desc}
              </p>
            </div>

            {/* Camera Lens Softness / Focus Blur */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="font-medium text-slate-300">Camera Lens Softness</span>
                <span className="font-mono text-cyan-400">{selectedLayer.cameraBlur || 0}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="4"
                step="0.1"
                value={selectedLayer.cameraBlur || 0}
                onChange={(e) => update({ cameraBlur: parseFloat(e.target.value) })}
                className="w-full accent-cyan-400"
              />
              <p className="text-[10px] text-slate-400">
                Removes vector sharpness to simulate optical glass diffraction.
              </p>
            </div>

            {/* Film Grain / Sensor Noise */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="font-medium text-slate-300">Sensor Noise (Film Grain)</span>
                <span className="font-mono text-cyan-400">{selectedLayer.filmGrain || 0}</span>
              </div>
              <input
                type="range"
                min="0"
                max="35"
                step="1"
                value={selectedLayer.filmGrain || 0}
                onChange={(e) => update({ filmGrain: parseInt(e.target.value) })}
                className="w-full accent-cyan-400"
              />
              <p className="text-[10px] text-slate-400">
                Adds micro-texture matching the image&apos;s ISO camera noise.
              </p>
            </div>

            {/* Opacity */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="font-medium text-slate-300">Opacity / Translucency</span>
                <span className="font-mono text-cyan-400">{Math.round((selectedLayer.opacity ?? 1) * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.02"
                value={selectedLayer.opacity ?? 1}
                onChange={(e) => update({ opacity: parseFloat(e.target.value) })}
                className="w-full accent-cyan-400"
              />
            </div>

            {/* 3D Perspective & Rotation */}
            <div className="space-y-3 pt-3 border-t border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                3D Perspective & Angle
              </span>

              {/* Rotation Angle */}
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-300">Rotation Angle</span>
                  <span className="font-mono text-cyan-400">{selectedLayer.rotationAngle || 0}°</span>
                </div>
                <input
                  type="range"
                  min="-45"
                  max="45"
                  step="0.5"
                  value={selectedLayer.rotationAngle || 0}
                  onChange={(e) => update({ rotationAngle: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-400"
                />
              </div>

              {/* Perspective Skew X */}
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-300">Horizontal Skew (Slanted Plane)</span>
                  <span className="font-mono text-cyan-400">{selectedLayer.perspectiveSkewX || 0}°</span>
                </div>
                <input
                  type="range"
                  min="-30"
                  max="30"
                  step="0.5"
                  value={selectedLayer.perspectiveSkewX || 0}
                  onChange={(e) => update({ perspectiveSkewX: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-400"
                />
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 3: HEALING & INPAINT ================= */}
        {activeTab === 'inpaint' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div>
                <span className="font-medium text-slate-200 block text-xs">Remove Original Text</span>
                <span className="text-[10px] text-slate-400">Inpaint background beneath text</span>
              </div>
              <input
                type="checkbox"
                checked={selectedLayer.inpaintOriginal}
                onChange={(e) => update({ inpaintOriginal: e.target.checked })}
                className="w-4 h-4 rounded accent-cyan-400 cursor-pointer"
              />
            </div>

            {selectedLayer.inpaintOriginal && (
              <>
                {/* Background Sample Color */}
                <div className="space-y-1.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-300">Background Fill Color</span>
                    <button
                      onClick={() => onStartEyedropper('backgroundColor')}
                      className="px-2 py-0.5 rounded text-[10px] bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 flex items-center gap-1"
                    >
                      <Pipette className="w-2.5 h-2.5" /> Sample
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={selectedLayer.backgroundColor}
                      onChange={(e) => update({ backgroundColor: e.target.value })}
                      className="w-8 h-8 rounded border border-slate-700 bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={selectedLayer.backgroundColor}
                      onChange={(e) => update({ backgroundColor: e.target.value })}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-mono font-bold text-slate-100 uppercase"
                    />
                  </div>
                </div>

                {/* Inpaint Padding */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="font-medium text-slate-300">Patch Padding</span>
                    <span className="font-mono text-cyan-400">{selectedLayer.inpaintPadding || 8}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="24"
                    value={selectedLayer.inpaintPadding || 8}
                    onChange={(e) => update({ inpaintPadding: parseInt(e.target.value) })}
                    className="w-full accent-cyan-400"
                  />
                  <p className="text-[10px] text-slate-400">Expands coverage to remove letter halos</p>
                </div>

                {/* Edge Feathering */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="font-medium text-slate-300">Edge Feathering (Smooth Seam)</span>
                    <span className="font-mono text-cyan-400">{selectedLayer.inpaintFeather || 8}px</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={selectedLayer.inpaintFeather || 8}
                    onChange={(e) => update({ inpaintFeather: parseInt(e.target.value) })}
                    className="w-full accent-cyan-400"
                  />
                  <p className="text-[10px] text-slate-400">Blurs patch border seamlessly into surroundings</p>
                </div>
              </>
            )}
          </div>
        )}

        {/* ================= TAB 4: AI NEURAL GENERATIVE ================= */}
        {activeTab === 'ai' && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-800/40 text-indigo-200 text-[11px] leading-relaxed flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <span>
                Gemini Multimodal Neural Inpainting regenerates complex folded cloth, wavy glass reflections, or textured surfaces.
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Additional AI Instructions (Optional)
              </label>
              <textarea
                value={aiInstructions}
                onChange={(e) => setAiInstructions(e.target.value)}
                placeholder="e.g. Keep the exact metallic foil sheen and shadow depth..."
                rows={3}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 text-xs focus:outline-none focus:border-indigo-500 font-medium resize-none"
              />
            </div>

            <button
              onClick={() => onTriggerAiInpaint(aiInstructions)}
              disabled={isAiInpainting || !selectedLayer.currentText.trim()}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 ${
                isAiInpainting || !selectedLayer.currentText.trim()
                  ? 'bg-indigo-900/40 text-slate-400 cursor-not-allowed border border-indigo-900/50'
                  : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-purple-500 active:scale-98 shadow-indigo-500/25'
              }`}
            >
              <Sparkles className={`w-4 h-4 ${isAiInpainting ? 'animate-spin' : ''}`} />
              <span>{isAiInpainting ? 'Synthesizing with Gemini...' : 'Run Neural AI Inpaint'}</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
