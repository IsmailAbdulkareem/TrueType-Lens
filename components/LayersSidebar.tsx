'use client';

import React, { useState } from 'react';
import {
  Plus,
  Layers,
  Eye,
  EyeOff,
  Trash2,
  Paintbrush,
  Pipette,
  Sparkles,
  HelpCircle,
  CheckCircle2,
  MousePointer,
  Wand2,
  ScanSearch,
  Bot,
  Link,
  Unlink,
  CheckSquare,
  Square,
  FolderPlus,
  FolderMinus,
} from 'lucide-react';
import { TextLayer } from '@/lib/canvas-renderer';
import { TypographyStyle, extractStylesFromLayers } from '@/lib/style-transfer';

interface LayersSidebarProps {
  layers: TextLayer[];
  selectedLayerId: string | null;
  selectedLayerIds?: string[];
  onSelectLayer: (id: string | null) => void;
  onSelectLayers?: (ids: string[]) => void;
  onGroupLayers?: (layerIds: string[]) => void;
  onUngroupLayers?: (layerId: string) => void;
  onAddLayer: (style?: TypographyStyle) => void;
  onToggleVisibility: (id: string) => void;
  onDeleteLayer: (id: string) => void;
  isEraserMode: boolean;
  onToggleEraserMode: () => void;
  eraserSize: number;
  onEraserSizeChange: (size: number) => void;
  onStartEyedropper: () => void;
  isEyedropperActive: boolean;
  onHoldOriginalStart: () => void;
  onHoldOriginalEnd: () => void;
  showOriginalHold: boolean;
  onScanWithAi: () => void;
  isScanning: boolean;
  isLensMode?: boolean;
  onToggleLensMode?: () => void;
  isChatOpen?: boolean;
  onToggleChat?: () => void;
}

export function LayersSidebar({
  layers,
  selectedLayerId,
  selectedLayerIds = [],
  onSelectLayer,
  onSelectLayers,
  onGroupLayers,
  onUngroupLayers,
  onAddLayer,
  onToggleVisibility,
  onDeleteLayer,
  isEraserMode,
  onToggleEraserMode,
  eraserSize,
  onEraserSizeChange,
  onStartEyedropper,
  isEyedropperActive,
  onHoldOriginalStart,
  onHoldOriginalEnd,
  showOriginalHold,
  onScanWithAi,
  isScanning,
  isLensMode = false,
  onToggleLensMode,
  isChatOpen = false,
  onToggleChat,
}: LayersSidebarProps) {
  const detectedStyles = extractStylesFromLayers(layers);
  const [multiSelectMode, setMultiSelectMode] = useState(false);

  // Helper: toggle individual layer selection in multi-select
  const handleToggleLayerCheck = (layerId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onSelectLayers) return;

    let next: string[];
    if (selectedLayerIds.includes(layerId)) {
      next = selectedLayerIds.filter((id) => id !== layerId);
    } else {
      next = [...selectedLayerIds, layerId];
    }
    onSelectLayers(next);
    if (next.length > 0) {
      onSelectLayer(next[next.length - 1]);
    } else {
      onSelectLayer(null);
    }
  };

  // Helper: click a layer row
  const handleLayerClick = (layer: TextLayer, e: React.MouseEvent) => {
    if (e.shiftKey || e.ctrlKey || e.metaKey || multiSelectMode) {
      handleToggleLayerCheck(layer.id, e);
      return;
    }

    // If layer belongs to a group, select all group members together!
    if (layer.groupId) {
      const groupMemberIds = layers.filter((l) => l.groupId === layer.groupId).map((l) => l.id);
      if (onSelectLayers) {
        onSelectLayers(groupMemberIds);
      }
      onSelectLayer(layer.id);
    } else {
      if (onSelectLayers) {
        onSelectLayers([layer.id]);
      }
      onSelectLayer(layer.id);
    }
  };

  const activeSelectedLayer = layers.find((l) => l.id === selectedLayerId);
  const isSelectedLayerGrouped = Boolean(activeSelectedLayer?.groupId);
  const canGroupSelected = selectedLayerIds.length >= 2;

  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-900/90 flex flex-col h-full overflow-hidden select-none">
      {/* Top Tools Bar */}
      <div className="p-3 border-b border-slate-800 space-y-2 bg-slate-950/40">
        <div className="flex items-center gap-1.5">
          {/* Add Layer Button */}
          <button
            onClick={() => onAddLayer()}
            className="flex-1 py-1.5 px-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm shadow-cyan-500/20 transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Add Text</span>
          </button>

          {/* Box / Lens Selector Tool Button */}
          {onToggleLensMode && (
            <button
              onClick={onToggleLensMode}
              title="Select Text with Box / Lens (Drag box over any text)"
              className={`p-2 rounded-lg border transition-colors ${
                isLensMode
                  ? 'bg-cyan-500 text-slate-950 border-cyan-400 ring-2 ring-cyan-400/40'
                  : 'bg-slate-800 text-cyan-300 hover:text-white border-slate-700'
              }`}
            >
              <ScanSearch className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Quick Eyedropper Button */}
          <button
            onClick={onStartEyedropper}
            title="Pick color from image"
            className={`p-2 rounded-lg border transition-colors ${
              isEyedropperActive
                ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700'
            }`}
          >
            <Pipette className="w-3.5 h-3.5" />
          </button>

          {/* Eraser / Patch Stamp Tool */}
          <button
            onClick={onToggleEraserMode}
            title="Manual Inpaint / Eraser Brush"
            className={`p-2 rounded-lg border transition-colors ${
              isEraserMode
                ? 'bg-rose-500 text-white border-rose-400 shadow-sm shadow-rose-500/30'
                : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700'
            }`}
          >
            <Paintbrush className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Quick Style-Matched Add Button if styles exist */}
        {detectedStyles.length > 0 && (
          <button
            onClick={() => onAddLayer(detectedStyles[0])}
            className="w-full py-1.5 px-2.5 rounded-lg bg-indigo-950/70 hover:bg-indigo-900/80 text-indigo-300 border border-indigo-700/60 text-[11px] font-semibold flex items-center justify-between transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Wand2 className="w-3 h-3 text-cyan-400" />
              <span>Add in {detectedStyles[0].fontFamily}</span>
            </span>
            <span
              className="w-3 h-3 rounded-full border border-slate-600"
              style={{ backgroundColor: detectedStyles[0].color }}
            />
          </button>
        )}

        {/* Eraser Brush Size Slider (if active) */}
        {isEraserMode && (
          <div className="p-2 bg-slate-950 rounded-lg border border-rose-900/40 space-y-1">
            <div className="flex justify-between text-[10px] text-rose-300">
              <span>Eraser Brush Size</span>
              <span>{eraserSize}px</span>
            </div>
            <input
              type="range"
              min="6"
              max="60"
              value={eraserSize}
              onChange={(e) => onEraserSizeChange(parseInt(e.target.value))}
              className="w-full accent-rose-400"
            />
          </div>
        )}

        {/* Hold to Compare Button */}
        <button
          onMouseDown={onHoldOriginalStart}
          onMouseUp={onHoldOriginalEnd}
          onTouchStart={onHoldOriginalStart}
          onTouchEnd={onHoldOriginalEnd}
          className={`w-full py-1.5 px-3 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all select-none ${
            showOriginalHold
              ? 'bg-amber-500 text-slate-950 border-amber-400 ring-2 ring-amber-500/50'
              : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700 active:scale-98'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>{showOriginalHold ? 'Showing Original...' : 'Hold to View Original'}</span>
        </button>

        {/* AI Chatbot Copilot Prompt Trigger */}
        {onToggleChat && (
          <button
            onClick={onToggleChat}
            className={`w-full py-2 px-3 rounded-xl text-xs font-bold border flex items-center justify-between transition-all shadow-sm ${
              isChatOpen
                ? 'bg-gradient-to-r from-cyan-600/30 to-indigo-600/30 border-cyan-400 text-cyan-200'
                : 'bg-indigo-950/70 hover:bg-indigo-900/80 text-indigo-200 border-indigo-700/60'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Bot className="w-4 h-4 text-cyan-400" />
              <span>AI Chatbot Copilot</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
              Prompt
            </span>
          </button>
        )}
      </div>

      {/* Layers Header with Group Controls */}
      <div className="px-3 py-2 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between text-xs font-semibold text-slate-400">
        <div className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <span>Layers ({layers.length})</span>
        </div>

        {/* Multi-select toggle */}
        <button
          onClick={() => setMultiSelectMode((m) => !m)}
          title={multiSelectMode ? 'Turn off multi-select' : 'Turn on multi-select checkboxes to group layers'}
          className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors border ${
            multiSelectMode
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
              : 'text-slate-400 hover:text-slate-200 border-transparent hover:border-slate-700'
          }`}
        >
          {multiSelectMode ? 'Multi-Select On' : 'Select'}
        </button>
      </div>

      {/* GROUP LAYERS ACTION BAR (when 2+ layers selected or grouped layer active) */}
      {(canGroupSelected || isSelectedLayerGrouped) && (
        <div className="p-2 bg-gradient-to-r from-purple-950/60 to-indigo-950/60 border-b border-purple-800/40 flex items-center justify-between gap-1.5 text-xs">
          {canGroupSelected && onGroupLayers && (
            <button
              onClick={() => onGroupLayers(selectedLayerIds)}
              className="flex-1 py-1.5 px-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm shadow-purple-500/30 transition-all active:scale-95"
            >
              <Link className="w-3.5 h-3.5" />
              <span>Group ({selectedLayerIds.length}) Layers</span>
            </button>
          )}

          {isSelectedLayerGrouped && onUngroupLayers && selectedLayerId && (
            <button
              onClick={() => onUngroupLayers(selectedLayerId)}
              title="Ungroup these layers so they move independently"
              className="py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-700/60 font-semibold text-xs flex items-center justify-center gap-1 transition-all"
            >
              <Unlink className="w-3.5 h-3.5" />
              <span>Ungroup</span>
            </button>
          )}
        </div>
      )}

      {/* Layers List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {layers.length === 0 ? (
          <div className="p-4 text-center text-slate-500 space-y-2.5">
            <Layers className="w-7 h-7 mx-auto opacity-40 text-slate-400" />
            <div>
              <p className="text-xs font-semibold text-slate-300">No text layers yet</p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Double-click ANY text on the image or use the tools below:
              </p>
            </div>

            {onToggleLensMode && (
              <button
                onClick={onToggleLensMode}
                className="w-full py-2 px-3 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-700/60 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
              >
                <ScanSearch className="w-3.5 h-3.5" />
                <span>Select Text with Box / Lens</span>
              </button>
            )}

            <button
              onClick={onScanWithAi}
              disabled={isScanning}
              className="w-full py-2 px-3 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Scan All with AI</span>
            </button>
          </div>
        ) : (
          layers.map((layer) => {
            const isSelected = layer.id === selectedLayerId;
            const isMultiChecked = selectedLayerIds.includes(layer.id);
            const isGrouped = Boolean(layer.groupId);

            return (
              <div
                key={layer.id}
                onClick={(e) => handleLayerClick(layer, e)}
                className={`group flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-cyan-950/50 border-cyan-500/80 text-white shadow-sm shadow-cyan-950 ring-1 ring-cyan-500/30'
                    : isMultiChecked
                    ? 'bg-purple-950/40 border-purple-500/60 text-purple-200'
                    : isGrouped
                    ? 'bg-slate-900/90 border-purple-900/40 text-slate-300 hover:border-purple-700/50'
                    : 'bg-slate-900 hover:bg-slate-800/80 border-slate-800/90 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 overflow-hidden flex-1">
                  {/* Multi-select checkbox */}
                  {(multiSelectMode || selectedLayerIds.length > 0) && (
                    <button
                      onClick={(e) => handleToggleLayerCheck(layer.id, e)}
                      className="text-slate-400 hover:text-cyan-400 shrink-0"
                    >
                      {isMultiChecked ? (
                        <CheckSquare className="w-3.5 h-3.5 text-cyan-400" />
                      ) : (
                        <Square className="w-3.5 h-3.5 text-slate-600" />
                      )}
                    </button>
                  )}

                  {/* Layer Color Tag */}
                  <div
                    className="w-3.5 h-3.5 rounded-full border border-slate-600 shrink-0 shadow-sm"
                    style={{ backgroundColor: layer.color }}
                  />

                  {/* Text preview */}
                  <div className="truncate flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-200 block truncate">
                        {layer.currentText || '(Empty text)'}
                      </span>
                      {/* Group badge */}
                      {isGrouped && (
                        <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-0.5 shrink-0">
                          <Link className="w-2.5 h-2.5" />
                          <span>Group</span>
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 block truncate">
                      {layer.fontFamily} • {layer.rotationAngle ? `${layer.rotationAngle}°` : '0°'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                  {/* Toggle Visibility */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleVisibility(layer.id);
                    }}
                    className="p-1 text-slate-400 hover:text-white rounded"
                  >
                    {layer.visible ? (
                      <Eye className="w-3.5 h-3.5 text-cyan-400" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5 text-slate-600" />
                    )}
                  </button>

                  {/* Delete */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteLayer(layer.id);
                    }}
                    className="p-1 text-slate-400 hover:text-red-400 rounded transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Helper / Pro Tips */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60 text-[11px] text-slate-400 space-y-1">
        <div className="flex items-center gap-1 text-cyan-400 font-semibold">
          <Link className="w-3.5 h-3.5 text-purple-400" /> Group Dragging
        </div>
        <p className="text-[10px] text-slate-500 leading-tight">
          Select multiple layers with <span className="text-slate-300 font-semibold">Select</span> or <span className="text-slate-300 font-semibold">Shift+Click</span> and click <span className="text-purple-300 font-semibold">Group</span> to drag them as a single object on the canvas!
        </p>
      </div>
    </aside>
  );
}
