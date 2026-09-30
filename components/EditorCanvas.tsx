'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Pipette,
  Paintbrush,
  Move,
  RotateCw,
  Eye,
  Sparkles,
  MousePointer,
} from 'lucide-react';
import {
  TextLayer,
  drawRealisticText,
  inpaintRegion,
  drawBoundingBox,
  samplePixelColor,
} from '@/lib/canvas-renderer';

interface EditorCanvasProps {
  imageSrc: string | null;
  layers: TextLayer[];
  selectedLayerId: string | null;
  onSelectLayer: (id: string | null) => void;
  onUpdateLayer: (layer: TextLayer, actionLabel?: string) => void;
  splitView: boolean;
  splitPosition: number;
  onSplitPositionChange: (pos: number) => void;
  eyedropperTarget: 'color' | 'outlineColor' | 'shadowColor' | 'backgroundColor' | null;
  onPickColor: (hex: string) => void;
  isEraserMode: boolean;
  eraserSize: number;
  onApplyManualEraserPatch?: (x: number, y: number, radius: number) => void;
  showOriginalHold: boolean;
  isStylePickerActive?: boolean;
  onPickStyleFromLayer?: (sourceLayer: TextLayer) => void;
}

export function EditorCanvas({
  imageSrc,
  layers,
  selectedLayerId,
  onSelectLayer,
  onUpdateLayer,
  splitView,
  splitPosition,
  onSplitPositionChange,
  eyedropperTarget,
  onPickColor,
  isEraserMode,
  eraserSize,
  showOriginalHold,
  isStylePickerActive = false,
  onPickStyleFromLayer,
}: EditorCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const baseImageRef = useRef<HTMLImageElement | null>(null);

  // Viewport transforms (Pan & Zoom)
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // Layer Interaction State
  const [hoveredLayerId, setHoveredLayerId] = useState<string | null>(null);
  const [isDraggingLayer, setIsDraggingLayer] = useState(false);
  const [activeHandle, setActiveHandle] = useState<string | null>(null); // 'move' | 'nw' | 'ne' | 'se' | 'sw' | 'rotate'
  const [layerDragStart, setLayerDragStart] = useState<{
    mouseX: number;
    mouseY: number;
    initialBox: TextLayer['box'];
    initialRotation: number;
  } | null>(null);

  // Inline canvas direct text editing
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);

  // Manual Eraser Strokes
  const [isPaintingEraser, setIsPaintingEraser] = useState(false);

  // Hovered color preview for eyedropper
  const [eyedropperPreview, setEyedropperPreview] = useState<{
    color: string;
    x: number;
    y: number;
  } | null>(null);

  // Split-slider drag state
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);

  // Load image
  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageSrc;
    img.onload = () => {
      baseImageRef.current = img;
      setImageDimensions({ width: img.width, height: img.height });
      // Fit to container
      if (containerRef.current) {
        const cWidth = containerRef.current.clientWidth - 48;
        const cHeight = containerRef.current.clientHeight - 48;
        const scale = Math.min(cWidth / img.width, cHeight / img.height, 1);
        setZoom(scale > 0 ? scale : 1);
        setPan({
          x: Math.round((containerRef.current.clientWidth - img.width * scale) / 2),
          y: Math.round((containerRef.current.clientHeight - img.height * scale) / 2),
        });
      }
    };
  }, [imageSrc]);

  // Main Render Loop
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = baseImageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    canvas.width = img.width;
    canvas.height = img.height;

    // 1. Draw base image
    ctx.drawImage(img, 0, 0);

    // If "Hold to see Original" is active, stop here
    if (showOriginalHold) return;

    // If Split View is active, render edited version onto temporary canvas
    if (splitView) {
      const editedCanvas = document.createElement('canvas');
      editedCanvas.width = img.width;
      editedCanvas.height = img.height;
      const editedCtx = editedCanvas.getContext('2d');
      if (editedCtx) {
        // Draw original on edited canvas
        editedCtx.drawImage(img, 0, 0);

        // Step 1: Inpaint original text regions
        layers.forEach((layer) => {
          if (layer.visible && layer.inpaintOriginal) {
            inpaintRegion(editedCtx, img.width, img.height, layer);
          }
        });

        // Step 2: Draw new realistic text
        layers.forEach((layer) => {
          if (layer.visible) {
            drawRealisticText(editedCtx, img.width, img.height, layer);
          }
        });

        // Clip edited canvas to right side of split position
        const splitX = img.width * splitPosition;
        ctx.save();
        ctx.beginPath();
        ctx.rect(splitX, 0, img.width - splitX, img.height);
        ctx.clip();
        ctx.drawImage(editedCanvas, 0, 0);
        ctx.restore();

        // Draw Split Divider Line
        ctx.save();
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 3;
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(splitX, 0);
        ctx.lineTo(splitX, img.height);
        ctx.stroke();

        // Split Knob Handle
        ctx.fillStyle = '#06b6d4';
        ctx.beginPath();
        ctx.arc(splitX, img.height / 2, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(splitX, img.height / 2, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    } else {
      // Standard View: Inpaint & Render text directly
      layers.forEach((layer) => {
        if (layer.visible && layer.inpaintOriginal) {
          inpaintRegion(ctx, img.width, img.height, layer);
        }
      });

      layers.forEach((layer) => {
        if (layer.visible) {
          drawRealisticText(ctx, img.width, img.height, layer);
        }
      });
    }

    // Render interactive selection bounding boxes (if not in split view or holding original)
    if (!showOriginalHold) {
      layers.forEach((layer) => {
        if (layer.visible) {
          const isSelected = layer.id === selectedLayerId;
          const isHovered = layer.id === hoveredLayerId && !isSelected;
          if (isSelected || isHovered) {
            drawBoundingBox(ctx, img.width, img.height, layer, isSelected, isHovered);
          }
        }
      });
    }
  }, [
    layers,
    selectedLayerId,
    hoveredLayerId,
    splitView,
    splitPosition,
    showOriginalHold,
  ]);

  // Re-render whenever layers, selection, or image change
  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Convert mouse screen coordinates to canvas image pixel coordinates
  const screenToCanvasCoords = (clientX: number, clientY: number) => {
    if (!containerRef.current || !canvasRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const localX = clientX - rect.left - pan.x;
    const localY = clientY - rect.top - pan.y;
    return {
      x: localX / zoom,
      y: localY / zoom,
    };
  };

  // Check which layer or handle is under mouse
  const hitTest = (canvasX: number, canvasY: number) => {
    const img = baseImageRef.current;
    if (!img) return { layer: null, handle: null };

    // Check selected layer handles first
    if (selectedLayerId) {
      const selected = layers.find((l) => l.id === selectedLayerId);
      if (selected) {
        const x = (selected.box.xmin / 1000) * img.width;
        const y = (selected.box.ymin / 1000) * img.height;
        const w = ((selected.box.xmax - selected.box.xmin) / 1000) * img.width;
        const h = ((selected.box.ymax - selected.box.ymin) / 1000) * img.height;

        // Check top rotation handle
        const rotHandleY = y - 18;
        const rotHandleX = x + w / 2;
        if (Math.hypot(canvasX - rotHandleX, canvasY - rotHandleY) < 14) {
          return { layer: selected, handle: 'rotate' };
        }

        // Check corners
        const tolerance = 12;
        if (Math.hypot(canvasX - x, canvasY - y) < tolerance) return { layer: selected, handle: 'nw' };
        if (Math.hypot(canvasX - (x + w), canvasY - y) < tolerance) return { layer: selected, handle: 'ne' };
        if (Math.hypot(canvasX - (x + w), canvasY - (y + h)) < tolerance) return { layer: selected, handle: 'se' };
        if (Math.hypot(canvasX - x, canvasY - (y + h)) < tolerance) return { layer: selected, handle: 'sw' };

        // Inside selected box
        if (canvasX >= x && canvasX <= x + w && canvasY >= y && canvasY <= y + h) {
          return { layer: selected, handle: 'move' };
        }
      }
    }

    // Check all layers in reverse order (topmost first)
    for (let i = layers.length - 1; i >= 0; i--) {
      const layer = layers[i];
      if (!layer.visible) continue;
      const x = (layer.box.xmin / 1000) * img.width;
      const y = (layer.box.ymin / 1000) * img.height;
      const w = ((layer.box.xmax - layer.box.xmin) / 1000) * img.width;
      const h = ((layer.box.ymax - layer.box.ymin) / 1000) * img.height;

      if (canvasX >= x && canvasX <= x + w && canvasY >= y && canvasY <= y + h) {
        return { layer, handle: 'move' };
      }
    }

    return { layer: null, handle: null };
  };

  // Mouse Down Event Handler
  const handleMouseDown = (e: React.MouseEvent) => {
    const { x, y } = screenToCanvasCoords(e.clientX, e.clientY);
    const img = baseImageRef.current;
    if (!img) return;

    // Eyedropper tool click
    if (eyedropperTarget) {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const color = samplePixelColor(ctx, x, y);
          onPickColor(color);
        }
      }
      return;
    }

    // Style picker click: sample style from clicked text layer
    if (isStylePickerActive) {
      const { layer } = hitTest(x, y);
      if (layer && onPickStyleFromLayer) {
        onPickStyleFromLayer(layer);
        return;
      }
    }

    // Split view divider drag check
    if (splitView) {
      const splitCanvasX = img.width * splitPosition;
      if (Math.abs(x - splitCanvasX) < 18 / zoom) {
        setIsDraggingSplit(true);
        return;
      }
    }

    // Eraser tool manual patch
    if (isEraserMode) {
      setIsPaintingEraser(true);
      performEraserStamp(x, y);
      return;
    }

    // Pan with middle click or space key or if clicking on empty area with alt
    if (e.button === 1 || e.altKey || e.shiftKey) {
      setIsPanning(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    // Layer hit test
    const { layer, handle } = hitTest(x, y);

    if (layer) {
      onSelectLayer(layer.id);
      setIsDraggingLayer(true);
      setActiveHandle(handle);
      setLayerDragStart({
        mouseX: x,
        mouseY: y,
        initialBox: { ...layer.box },
        initialRotation: layer.rotationAngle || 0,
      });
    } else {
      // Clicked outside any layer -> start canvas pan or deselect
      onSelectLayer(null);
      setIsPanning(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  // Mouse Move Event Handler
  const handleMouseMove = (e: React.MouseEvent) => {
    const { x, y } = screenToCanvasCoords(e.clientX, e.clientY);
    const img = baseImageRef.current;

    // Eyedropper preview update
    if (eyedropperTarget && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        const color = samplePixelColor(ctx, x, y);
        setEyedropperPreview({ color, x: e.clientX, y: e.clientY });
      }
      return;
    }

    // Split view drag
    if (isDraggingSplit && img) {
      const newPos = Math.max(0.05, Math.min(0.95, x / img.width));
      onSplitPositionChange(newPos);
      return;
    }

    // Painting manual eraser
    if (isEraserMode && isPaintingEraser) {
      performEraserStamp(x, y);
      return;
    }

    // Canvas panning
    if (isPanning) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
      return;
    }

    // Layer handle dragging (move, resize, rotate)
    if (isDraggingLayer && layerDragStart && selectedLayerId && img) {
      const selected = layers.find((l) => l.id === selectedLayerId);
      if (!selected) return;

      const deltaX = x - layerDragStart.mouseX;
      const deltaY = y - layerDragStart.mouseY;

      // Delta in 0-1000 scale
      const deltaScaleX = (deltaX / img.width) * 1000;
      const deltaScaleY = (deltaY / img.height) * 1000;

      const { initialBox } = layerDragStart;

      if (activeHandle === 'move') {
        const newXmin = Math.max(0, Math.min(1000 - (initialBox.xmax - initialBox.xmin), initialBox.xmin + deltaScaleX));
        const newYmin = Math.max(0, Math.min(1000 - (initialBox.ymax - initialBox.ymin), initialBox.ymin + deltaScaleY));
        const width = initialBox.xmax - initialBox.xmin;
        const height = initialBox.ymax - initialBox.ymin;

        onUpdateLayer({
          ...selected,
          box: {
            xmin: Math.round(newXmin),
            ymin: Math.round(newYmin),
            xmax: Math.round(newXmin + width),
            ymax: Math.round(newYmin + height),
          },
        });
      } else if (activeHandle === 'se') {
        onUpdateLayer({
          ...selected,
          box: {
            ...selected.box,
            xmax: Math.max(selected.box.xmin + 40, Math.round(initialBox.xmax + deltaScaleX)),
            ymax: Math.max(selected.box.ymin + 20, Math.round(initialBox.ymax + deltaScaleY)),
          },
        });
      } else if (activeHandle === 'rotate') {
        const centerX = ((initialBox.xmin + initialBox.xmax) / 2 / 1000) * img.width;
        const centerY = ((initialBox.ymin + initialBox.ymax) / 2 / 1000) * img.height;
        const angleRad = Math.atan2(y - centerY, x - centerX);
        let degrees = (angleRad * 180) / Math.PI + 90;
        if (degrees > 180) degrees -= 360;
        if (degrees < -180) degrees += 360;
        onUpdateLayer({
          ...selected,
          rotationAngle: Math.round(degrees * 10) / 10,
        });
      }
      return;
    }

    // Hover state update
    if (!isDraggingLayer && !isPanning && !isEraserMode && !eyedropperTarget) {
      const { layer } = hitTest(x, y);
      setHoveredLayerId(layer?.id || null);
    }
  };

  // Mouse Up
  const handleMouseUp = () => {
    setIsPanning(false);
    setIsDraggingLayer(false);
    setActiveHandle(null);
    setLayerDragStart(null);
    setIsDraggingSplit(false);
    setIsPaintingEraser(false);
  };

  // Perform Manual Eraser Stamp (blends surrounding color over target)
  const performEraserStamp = (canvasX: number, canvasY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const radius = eraserSize || 16;
    ctx.save();
    ctx.beginPath();
    ctx.arc(canvasX, canvasY, radius, 0, Math.PI * 2);
    // Find background color of selected layer or sample nearby
    const bgColor = selectedLayerId
      ? layers.find((l) => l.id === selectedLayerId)?.backgroundColor || '#202020'
      : samplePixelColor(ctx, canvasX - radius - 2, canvasY);

    ctx.fillStyle = bgColor;
    ctx.filter = 'blur(4px)';
    ctx.fill();
    ctx.restore();
  };

  // Zoom controls
  const handleZoomIn = () => setZoom((z) => Math.min(4, Math.round((z + 0.15) * 100) / 100));
  const handleZoomOut = () => setZoom((z) => Math.max(0.2, Math.round((z - 0.15) * 100) / 100));
  const handleFitToScreen = () => {
    const img = baseImageRef.current;
    if (!img || !containerRef.current) return;
    const cWidth = containerRef.current.clientWidth - 48;
    const cHeight = containerRef.current.clientHeight - 48;
    const scale = Math.min(cWidth / img.width, cHeight / img.height, 1);
    setZoom(scale > 0 ? scale : 1);
    setPan({
      x: Math.round((containerRef.current.clientWidth - img.width * scale) / 2),
      y: Math.round((containerRef.current.clientHeight - img.height * scale) / 2),
    });
  };

  // Wheel zoom with Ctrl or trackpad pinch
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      setZoom((z) => Math.max(0.2, Math.min(4, z * zoomFactor)));
    } else {
      // Pan with two finger scroll
      setPan((p) => ({
        x: p.x - e.deltaX,
        y: p.y - e.deltaY,
      }));
    }
  };

  // Double-click to trigger direct in-place editing
  const handleDoubleClick = (e: React.MouseEvent) => {
    const { x, y } = screenToCanvasCoords(e.clientX, e.clientY);
    const { layer } = hitTest(x, y);
    if (layer) {
      onSelectLayer(layer.id);
      setInlineEditingId(layer.id);
    }
  };

  // Determine cursor
  const getCursor = () => {
    if (isStylePickerActive) return 'crosshair';
    if (eyedropperTarget) return 'crosshair';
    if (isEraserMode) return 'cell';
    if (isPanning) return 'grabbing';
    if (activeHandle === 'rotate') return 'grab';
    if (activeHandle === 'se' || activeHandle === 'nw') return 'nwse-resize';
    if (activeHandle === 'move') return 'move';
    if (hoveredLayerId) return 'pointer';
    return 'default';
  };

  const inlineEditingLayer = inlineEditingId ? layers.find((l) => l.id === inlineEditingId) : null;

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onDoubleClick={handleDoubleClick}
      onWheel={handleWheel}
      className="relative flex-1 h-full w-full bg-slate-950 overflow-hidden select-none flex items-center justify-center"
      style={{ cursor: getCursor() }}
    >
      {/* Subtle Grid Background */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
          backgroundSize: '32px 32px',
        }}
      />

      {/* Floating Canvas Transform Wrapper */}
      <div
        className="absolute transition-transform duration-75 origin-top-left"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
        }}
      >
        <canvas
          ref={canvasRef}
          className="shadow-2xl shadow-black/80 rounded-sm border border-slate-800/80 bg-slate-900"
        />
      </div>

      {/* In-Place Real-Time Floating Editor on Double-Click */}
      {inlineEditingLayer && imageDimensions.width > 0 && (
        <div
          className="absolute z-40 animate-fade-in"
          style={{
            left: pan.x + (inlineEditingLayer.box.xmin / 1000) * imageDimensions.width * zoom,
            top: pan.y + (inlineEditingLayer.box.ymin / 1000) * imageDimensions.height * zoom,
            width: Math.max(160, ((inlineEditingLayer.box.xmax - inlineEditingLayer.box.xmin) / 1000) * imageDimensions.width * zoom),
            minHeight: Math.max(48, ((inlineEditingLayer.box.ymax - inlineEditingLayer.box.ymin) / 1000) * imageDimensions.height * zoom),
            transform: `rotate(${inlineEditingLayer.rotationAngle || 0}deg)`,
            transformOrigin: 'top left',
          }}
        >
          <div className="relative">
            <textarea
              autoFocus
              value={inlineEditingLayer.currentText}
              onChange={(e) => {
                onUpdateLayer({ ...inlineEditingLayer, currentText: e.target.value }, 'Typed text on canvas');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape' || (e.key === 'Enter' && !e.shiftKey)) {
                  e.preventDefault();
                  setInlineEditingId(null);
                }
              }}
              onBlur={() => setInlineEditingId(null)}
              className="w-full bg-slate-950/95 border-2 border-cyan-400 rounded-lg p-2.5 text-center text-sm font-bold shadow-2xl focus:outline-none resize-none ring-4 ring-cyan-500/20"
              style={{
                fontFamily: inlineEditingLayer.fontFamily,
                color: inlineEditingLayer.color,
              }}
            />
            <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-cyan-400 font-semibold bg-slate-900/90 px-2 py-0.5 rounded-full border border-cyan-800/60 pointer-events-none whitespace-nowrap shadow-lg">
              Press Enter or click outside to finish
            </span>
          </div>
        </div>
      )}

      {/* Eyedropper Magnifier Preview Tooltip */}
      {eyedropperTarget && eyedropperPreview && (
        <div
          className="fixed pointer-events-none z-50 transform -translate-x-1/2 -translate-y-12 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/95 border border-slate-700 shadow-xl"
          style={{ left: eyedropperPreview.x, top: eyedropperPreview.y }}
        >
          <div
            className="w-5 h-5 rounded-full border border-white shadow-inner"
            style={{ backgroundColor: eyedropperPreview.color }}
          />
          <span className="text-xs font-mono font-bold text-white uppercase">
            {eyedropperPreview.color}
          </span>
        </div>
      )}

      {/* Floating HUD Controls */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-800 px-3 py-1.5 rounded-full shadow-2xl z-20">
        <button
          onClick={handleZoomOut}
          title="Zoom Out"
          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <span className="text-xs font-mono text-slate-400 min-w-12 text-center">
          {Math.round(zoom * 100)}%
        </span>

        <button
          onClick={handleZoomIn}
          title="Zoom In"
          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <div className="w-px h-4 bg-slate-800 mx-1" />

        <button
          onClick={handleFitToScreen}
          title="Fit to Screen"
          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-full transition-colors flex items-center gap-1 text-xs"
        >
          <Maximize2 className="w-4 h-4" />
          <span className="hidden sm:inline">Fit</span>
        </button>
      </div>

      {/* Split Slider Hint badge */}
      {splitView && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-slate-900/90 backdrop-blur border border-cyan-500/40 px-3 py-1 rounded-full text-xs font-medium text-cyan-300 shadow-lg flex items-center gap-2 pointer-events-none">
          <span className="text-slate-400">Original</span>
          <div className="w-3 h-0.5 bg-cyan-400" />
          <span className="text-cyan-300 font-bold">Edited (Drag divider to compare)</span>
        </div>
      )}
    </div>
  );
}
