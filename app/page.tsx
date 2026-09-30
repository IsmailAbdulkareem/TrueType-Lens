'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Navbar } from '@/components/Navbar';
import { EditorCanvas } from '@/components/EditorCanvas';
import { InspectorPanel } from '@/components/InspectorPanel';
import { LayersSidebar } from '@/components/LayersSidebar';
import { ExportModal } from '@/components/ExportModal';
import { SAMPLE_IMAGES, SampleImage } from '@/lib/sample-images';
import { TextLayer } from '@/lib/canvas-renderer';
import { TypographyStyle, extractStylesFromLayers, applyStyleToLayer } from '@/lib/style-transfer';
import { useHistory } from '@/hooks/use-history';
import { Upload, Sparkles, Image as ImageIcon, AlertCircle } from 'lucide-react';

export default function HomePage() {
  // Main Image state - Default to first high-res sample
  const defaultSample = SAMPLE_IMAGES[0];
  const [imageSrc, setImageSrc] = useState<string | null>(() => defaultSample.generateSvgDataUri());
  const [currentSampleId, setCurrentSampleId] = useState<string>(defaultSample.id);

  // Layers state & Undo/Redo History
  const [layers, setLayers] = useState<TextLayer[]>(() =>
    defaultSample.presetTexts.map((pt) => ({
      id: pt.id,
      originalText: pt.text,
      currentText: pt.suggestedNewText,
      box: {
        ymin: pt.box_2d[0],
        xmin: pt.box_2d[1],
        ymax: pt.box_2d[2],
        xmax: pt.box_2d[3],
      },
      fontFamily: pt.fontFamily,
      fontSize: 0,
      fontWeight: pt.fontWeight,
      fontStyle: pt.fontStyle || 'normal',
      textAlign: 'center',
      textTransform: 'none',
      letterSpacing: pt.letterSpacing || 2,
      lineHeight: 1.15,
      color: pt.color,
      opacity: 1,
      hasOutline: !!pt.outlineColor,
      outlineColor: pt.outlineColor || '#000000',
      outlineWidth: pt.outlineWidth || 2,
      hasShadow: !!pt.shadowColor,
      shadowColor: pt.shadowColor || 'transparent',
      shadowBlur: pt.shadowBlur || 4,
      shadowOffsetX: 2,
      shadowOffsetY: 2,
      blendMode: (pt.blendMode as GlobalCompositeOperation) || 'source-over',
      cameraBlur: pt.cameraBlur || 0.4,
      filmGrain: pt.filmGrain || 10,
      rotationAngle: pt.rotationAngle || 0,
      perspectiveSkewX: 0,
      perspectiveSkewY: 0,
      inpaintOriginal: true,
      inpaintPadding: 10,
      inpaintFeather: 8,
      backgroundColor: pt.backgroundColor,
      visible: true,
    }))
  );

  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(() => defaultSample.presetTexts[0]?.id || null);

  const {
    canUndo,
    canRedo,
    undo: historyUndo,
    redo: historyRedo,
    pushState,
    resetHistory,
    currentAction,
  } = useHistory([]);

  // Split View & Compare
  const [splitView, setSplitView] = useState<boolean>(false);
  const [splitPosition, setSplitPosition] = useState<number>(0.5);
  const [showOriginalHold, setShowOriginalHold] = useState<boolean>(false);

  // Eyedropper & Eraser & Style Dropper Tools
  const [eyedropperTarget, setEyedropperTarget] = useState<
    'color' | 'outlineColor' | 'shadowColor' | 'backgroundColor' | null
  >(null);
  const [isEraserMode, setIsEraserMode] = useState<boolean>(false);
  const [eraserSize, setEraserSize] = useState<number>(20);
  const [isStylePickerActive, setIsStylePickerActive] = useState<boolean>(false);

  // AI Operation States
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isAiInpainting, setIsAiInpainting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'info' | 'success' | 'error' } | null>(
    null
  );

  // Modals & File Input
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Show temporary toast
  const showToast = useCallback((text: string, type: 'info' | 'success' | 'error' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  // Convert Sample to Canvas Layers
  const loadSample = useCallback(
    (sample: SampleImage) => {
      const dataUri = sample.generateSvgDataUri();
      setImageSrc(dataUri);
      setCurrentSampleId(sample.id);

      const initialLayers: TextLayer[] = sample.presetTexts.map((pt) => ({
        id: pt.id,
        originalText: pt.text,
        currentText: pt.suggestedNewText,
        box: {
          ymin: pt.box_2d[0],
          xmin: pt.box_2d[1],
          ymax: pt.box_2d[2],
          xmax: pt.box_2d[3],
        },
        fontFamily: pt.fontFamily,
        fontSize: 0, // auto
        fontWeight: pt.fontWeight,
        fontStyle: pt.fontStyle || 'normal',
        textAlign: 'center',
        textTransform: 'none',
        letterSpacing: pt.letterSpacing || 2,
        lineHeight: 1.15,
        color: pt.color,
        opacity: 1,
        hasOutline: !!pt.outlineColor,
        outlineColor: pt.outlineColor || '#000000',
        outlineWidth: pt.outlineWidth || 2,
        hasShadow: !!pt.shadowColor,
        shadowColor: pt.shadowColor || 'transparent',
        shadowBlur: pt.shadowBlur || 4,
        shadowOffsetX: 2,
        shadowOffsetY: 2,
        blendMode: (pt.blendMode as GlobalCompositeOperation) || 'source-over',
        cameraBlur: pt.cameraBlur || 0.4,
        filmGrain: pt.filmGrain || 10,
        rotationAngle: pt.rotationAngle || 0,
        perspectiveSkewX: 0,
        perspectiveSkewY: 0,
        inpaintOriginal: true,
        inpaintPadding: 10,
        inpaintFeather: 8,
        backgroundColor: pt.backgroundColor,
        visible: true,
      }));

      setLayers(initialLayers);
      setSelectedLayerId(initialLayers[0]?.id || null);
      resetHistory(initialLayers, `Loaded ${sample.title}`);
      setSplitView(false);
      showToast(`Loaded ${sample.title} demo`, 'info');
    },
    [resetHistory, showToast]
  );

  // Undo / Redo Handlers
  const handleUndo = useCallback(() => {
    const prev = historyUndo();
    if (prev) {
      setLayers(prev);
      if (selectedLayerId && !prev.find((l) => l.id === selectedLayerId)) {
        setSelectedLayerId(prev[0]?.id || null);
      }
      showToast('Undone', 'info');
    }
  }, [historyUndo, selectedLayerId, showToast]);

  const handleRedo = useCallback(() => {
    const next = historyRedo();
    if (next) {
      setLayers(next);
      if (selectedLayerId && !next.find((l) => l.id === selectedLayerId)) {
        setSelectedLayerId(next[0]?.id || null);
      }
      showToast('Redone', 'info');
    }
  }, [historyRedo, selectedLayerId, showToast]);

  // Delete layer callback
  const deleteLayer = useCallback(
    (id: string) => {
      setLayers((prev) => {
        const nextLayers = prev.filter((l) => l.id !== id);
        pushState(nextLayers, 'Deleted layer');
        return nextLayers;
      });
      if (selectedLayerId === id) {
        setSelectedLayerId(null);
      }
    },
    [selectedLayerId, pushState]
  );

  // Upload handler
  const handleFileUpload = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) {
        showToast('Please upload an image file (PNG, JPG, WebP)', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          setImageSrc(result);
          setLayers([]);
          resetHistory([], 'Uploaded Image');
          setSelectedLayerId(null);
          setSplitView(false);
          showToast('Image loaded! Click "Scan Text with AI" to detect text.', 'success');
        }
      };
      reader.readAsDataURL(file);
    },
    [resetHistory, showToast]
  );

  // Clipboard paste support (Ctrl+V image)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            handleFileUpload(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handleFileUpload]);

  // Drag and drop image onto page
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Keyboard shortcut listener (Ctrl+Z for Undo, Ctrl+Y for Redo, Delete, Space)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;

      // Undo / Redo shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (!isInput) {
          e.preventDefault();
          if (e.shiftKey) {
            handleRedo();
          } else {
            handleUndo();
          }
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        if (!isInput) {
          e.preventDefault();
          handleRedo();
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (!isInput && selectedLayerId) {
          deleteLayer(selectedLayerId);
        }
      } else if (e.code === 'Space' && !e.repeat && !isInput) {
        setShowOriginalHold(true);
      } else if (e.key === 'Escape') {
        setEyedropperTarget(null);
        setIsEraserMode(false);
        setIsStylePickerActive(false);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setShowOriginalHold(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedLayerId, handleUndo, handleRedo, deleteLayer]);

  // AI Scan with Gemini
  const handleScanWithAi = async () => {
    if (!imageSrc) return;
    setIsScanning(true);
    showToast('Gemini is analyzing typography, fonts, colors & background...', 'info');

    try {
      const response = await fetch('/api/analyze-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: imageSrc,
        }),
      });

      let data: any = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok || !data?.detectedTextElements) {
        const errorMsg =
          data?.error ||
          'AI service is currently in high demand. We placed an editable text box on your image for you!';
        showToast(errorMsg, 'info');
        addLayer();
        return;
      }

      if (data.fallback) {
        showToast('AI service in high demand. Placed a smart text box for you to edit!', 'info');
      }

      const elements = data.detectedTextElements;
      if (elements.length === 0) {
        showToast('No text detected. Added a text layer for you!', 'info');
        addLayer();
        return;
      }

      // Convert Gemini results to TextLayer objects
      const newLayers: TextLayer[] = elements.map((elem: any, idx: number) => {
        const box = elem.box_2d || [200, 200, 300, 800];
        return {
          id: `ai-text-${Date.now()}-${idx}`,
          originalText: elem.text || 'Detected Text',
          currentText: elem.text || 'Detected Text',
          box: {
            ymin: Math.max(0, Math.min(950, box[0])),
            xmin: Math.max(0, Math.min(950, box[1])),
            ymax: Math.max(50, Math.min(1000, box[2])),
            xmax: Math.max(50, Math.min(1000, box[3])),
          },
          fontFamily: elem.fontFamily || 'Montserrat',
          fontSize: 0,
          fontWeight: elem.fontWeight || '700',
          fontStyle: elem.fontStyle || 'normal',
          textAlign: 'center',
          textTransform: 'none',
          letterSpacing: elem.letterSpacing ?? 2,
          lineHeight: 1.15,
          color: elem.color || '#FFFFFF',
          opacity: 1,
          hasOutline: !!elem.outlineColor && (elem.outlineWidth ?? 0) > 0,
          outlineColor: elem.outlineColor || '#000000',
          outlineWidth: elem.outlineWidth || 2,
          hasShadow: !!elem.shadowColor,
          shadowColor: elem.shadowColor || 'transparent',
          shadowBlur: elem.shadowBlur || 4,
          shadowOffsetX: 2,
          shadowOffsetY: 2,
          blendMode: (elem.blendMode as GlobalCompositeOperation) || 'source-over',
          cameraBlur: elem.cameraBlur ?? 0.5,
          filmGrain: elem.filmGrain ?? 10,
          rotationAngle: elem.rotationAngle || 0,
          perspectiveSkewX: elem.perspectiveSkewX || 0,
          perspectiveSkewY: 0,
          inpaintOriginal: true,
          inpaintPadding: 10,
          inpaintFeather: 8,
          backgroundColor: elem.backgroundColor || '#202020',
          visible: true,
        };
      });

      setLayers(newLayers);
      setSelectedLayerId(newLayers[0]?.id || null);
      pushState(newLayers, `Auto-detected ${newLayers.length} text layers`);
      showToast(`Detected ${newLayers.length} text elements with matched typography!`, 'success');
    } catch (err: any) {
      console.warn('Scan warning:', err);
      showToast('AI service is temporarily busy. Added a text box for you to edit now!', 'info');
      addLayer();
    } finally {
      setIsScanning(false);
    }
  };

  // AI Generative Neural Inpaint (fallback / full synthesis)
  const handleTriggerAiInpaint = async (instructions: string) => {
    const layer = layers.find((l) => l.id === selectedLayerId);
    if (!layer || !imageSrc) return;

    setIsAiInpainting(true);
    showToast('Synthesizing photorealistic edit with Gemini...', 'info');

    try {
      const response = await fetch('/api/inpaint-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: imageSrc,
          originalText: layer.originalText,
          newText: layer.currentText,
          instructions,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.imageUrl) {
        throw new Error(data.error || 'Generative inpaint could not complete.');
      }

      // Update image with the generated image
      setImageSrc(data.imageUrl);
      // Mark layer as healed so canvas doesn't double-render
      updateLayer(
        {
          ...layer,
          inpaintOriginal: false,
        },
        'Applied AI Neural Inpaint'
      );
      showToast('AI Neural Replacement generated successfully!', 'success');
    } catch (err: any) {
      console.error('AI inpaint error:', err);
      showToast(
        `${err.message || 'Generative inpaint failed'}. Our pixel-perfect Canvas Engine is actively rendering your edit with matched font & grain.`,
        'info'
      );
    } finally {
      setIsAiInpainting(false);
    }
  };

  // Add new layer with optional matching typography style
  const addLayer = (presetStyle?: TypographyStyle) => {
    const newId = `custom-text-${Date.now()}`;
    // If no style provided, check if existing styles can be inherited
    const detected = extractStylesFromLayers(layers);
    const styleToUse = presetStyle || (detected.length > 0 ? detected[0] : null);

    const newLayer: TextLayer = {
      id: newId,
      originalText: '',
      currentText: 'NEW TEXT',
      box: {
        ymin: 450,
        xmin: 250,
        ymax: 550,
        xmax: 750,
      },
      fontFamily: styleToUse?.fontFamily || 'Montserrat',
      fontSize: 0,
      fontWeight: styleToUse?.fontWeight || '700',
      fontStyle: styleToUse?.fontStyle || 'normal',
      textAlign: 'center',
      textTransform: styleToUse?.textTransform || 'none',
      letterSpacing: styleToUse?.letterSpacing ?? 2,
      lineHeight: 1.15,
      color: styleToUse?.color || '#FFFFFF',
      opacity: 1,
      hasOutline: styleToUse?.hasOutline ?? false,
      outlineColor: styleToUse?.outlineColor || '#000000',
      outlineWidth: styleToUse?.outlineWidth ?? 2,
      hasShadow: styleToUse?.hasShadow ?? true,
      shadowColor: styleToUse?.shadowColor || 'rgba(0,0,0,0.5)',
      shadowBlur: styleToUse?.shadowBlur ?? 4,
      shadowOffsetX: 2,
      shadowOffsetY: 2,
      blendMode: styleToUse?.blendMode || 'source-over',
      cameraBlur: styleToUse?.cameraBlur ?? 0.4,
      filmGrain: styleToUse?.filmGrain ?? 10,
      rotationAngle: 0,
      perspectiveSkewX: 0,
      perspectiveSkewY: 0,
      inpaintOriginal: false,
      inpaintPadding: 8,
      inpaintFeather: 6,
      backgroundColor: styleToUse?.backgroundColor || '#1E1E1E',
      visible: true,
    };

    const nextLayers = [...layers, newLayer];
    setLayers(nextLayers);
    setSelectedLayerId(newId);
    pushState(nextLayers, `Added new text layer (${newLayer.fontFamily})`);
    showToast(
      styleToUse
        ? `Added text with matching ${styleToUse.fontFamily} style!`
        : 'New text layer added! Drag handles on canvas to move or resize.',
      'info'
    );
  };

  // Duplicate layer
  const duplicateLayer = (layer: TextLayer) => {
    const dupId = `dup-text-${Date.now()}`;
    const dup: TextLayer = {
      ...layer,
      id: dupId,
      box: {
        ymin: Math.min(950, layer.box.ymin + 40),
        xmin: Math.min(950, layer.box.xmin + 40),
        ymax: Math.min(1000, layer.box.ymax + 40),
        xmax: Math.min(1000, layer.box.xmax + 40),
      },
    };
    const nextLayers = [...layers, dup];
    setLayers(nextLayers);
    setSelectedLayerId(dupId);
    pushState(nextLayers, 'Duplicated layer');
  };

  // Update layer with undo/redo recording
  const updateLayer = (updated: TextLayer, actionLabel: string = 'Updated layer') => {
    const nextLayers = layers.map((l) => (l.id === updated.id ? updated : l));
    setLayers(nextLayers);

    // Debounce for live typing or drag sliders
    const isDebounced =
      actionLabel.includes('text') ||
      actionLabel.includes('Typed') ||
      actionLabel.includes('size') ||
      actionLabel.includes('Padding');

    pushState(nextLayers, actionLabel, isDebounced ? 250 : 0);
  };

  // Toggle visibility
  const toggleVisibility = (id: string) => {
    const nextLayers = layers.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l));
    setLayers(nextLayers);
    pushState(nextLayers, 'Toggled layer visibility');
  };

  // Eyedropper handler
  const handleStartEyedropper = (
    target: 'color' | 'outlineColor' | 'shadowColor' | 'backgroundColor' = 'color'
  ) => {
    setEyedropperTarget(target);
    setIsStylePickerActive(false);
    showToast(`Click anywhere on the image to sample ${target}`, 'info');
  };

  const handlePickColor = (hex: string) => {
    if (!eyedropperTarget || !selectedLayerId) {
      setEyedropperTarget(null);
      return;
    }
    const layer = layers.find((l) => l.id === selectedLayerId);
    if (layer) {
      updateLayer(
        {
          ...layer,
          [eyedropperTarget]: hex,
        },
        `Sampled ${eyedropperTarget} color`
      );
      showToast(`Sampled color ${hex} applied!`, 'success');
    }
    setEyedropperTarget(null);
  };

  // Style Dropper handler (Click any text on image to transfer its style)
  const handleStartStylePicker = () => {
    setIsStylePickerActive(true);
    setEyedropperTarget(null);
    showToast('Click any text on the image to copy and transfer its complete typography style!', 'info');
  };

  const handlePickStyleFromLayer = (sourceLayer: TextLayer) => {
    if (!selectedLayerId) {
      setSelectedLayerId(sourceLayer.id);
      setIsStylePickerActive(false);
      return;
    }

    const targetLayer = layers.find((l) => l.id === selectedLayerId);
    if (!targetLayer) return;

    const sourceStyle = extractStylesFromLayers([sourceLayer])[0];
    if (sourceStyle) {
      const updated = applyStyleToLayer(targetLayer, sourceStyle);
      updateLayer(updated, `Transferred style from "${sourceLayer.currentText}"`);
      showToast(`Transferred ${sourceStyle.fontFamily} typography style to active layer!`, 'success');
    }
    setIsStylePickerActive(false);
  };

  const selectedLayer = layers.find((l) => l.id === selectedLayerId) || null;

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans"
    >
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFileUpload(e.target.files[0]);
          }
        }}
      />

      {/* Top Navbar */}
      <Navbar
        onUploadClick={() => fileInputRef.current?.click()}
        onSelectSample={loadSample}
        onScanWithAi={handleScanWithAi}
        isScanning={isScanning}
        onOpenExport={() => setIsExportOpen(true)}
        splitView={splitView}
        onToggleSplitView={() => setSplitView((s) => !s)}
        onReset={() => {
          const sample = SAMPLE_IMAGES.find((s) => s.id === currentSampleId) || defaultSample;
          loadSample(sample);
        }}
        hasImage={!!imageSrc}
        layerCount={layers.length}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        historyAction={currentAction}
      />

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-bounce-subtle pointer-events-none">
          <div
            className={`px-4 py-2 rounded-xl text-xs font-semibold shadow-2xl flex items-center gap-2 border backdrop-blur-md ${
              toastMessage.type === 'error'
                ? 'bg-rose-950/90 text-rose-200 border-rose-700/80 shadow-rose-950'
                : toastMessage.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-200 border-emerald-700/80 shadow-emerald-950'
                : 'bg-slate-900/90 text-cyan-300 border-cyan-800/80 shadow-cyan-950'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Main Studio Workspace */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Left Layers & Tools Sidebar */}
        <LayersSidebar
          layers={layers}
          selectedLayerId={selectedLayerId}
          onSelectLayer={setSelectedLayerId}
          onAddLayer={addLayer}
          onToggleVisibility={toggleVisibility}
          onDeleteLayer={deleteLayer}
          isEraserMode={isEraserMode}
          onToggleEraserMode={() => setIsEraserMode((e) => !e)}
          eraserSize={eraserSize}
          onEraserSizeChange={setEraserSize}
          onStartEyedropper={() => handleStartEyedropper('color')}
          isEyedropperActive={!!eyedropperTarget}
          onHoldOriginalStart={() => setShowOriginalHold(true)}
          onHoldOriginalEnd={() => setShowOriginalHold(false)}
          showOriginalHold={showOriginalHold}
          onScanWithAi={handleScanWithAi}
          isScanning={isScanning}
        />

        {/* Center Canvas Viewport */}
        <EditorCanvas
          imageSrc={imageSrc}
          layers={layers}
          selectedLayerId={selectedLayerId}
          onSelectLayer={setSelectedLayerId}
          onUpdateLayer={updateLayer}
          splitView={splitView}
          splitPosition={splitPosition}
          onSplitPositionChange={setSplitPosition}
          eyedropperTarget={eyedropperTarget}
          onPickColor={handlePickColor}
          isEraserMode={isEraserMode}
          eraserSize={eraserSize}
          showOriginalHold={showOriginalHold}
          isStylePickerActive={isStylePickerActive}
          onPickStyleFromLayer={handlePickStyleFromLayer}
        />

        {/* Right Inspector & Photorealism Panel */}
        <InspectorPanel
          selectedLayer={selectedLayer}
          layers={layers}
          onUpdateLayer={updateLayer}
          onDeleteLayer={deleteLayer}
          onDuplicateLayer={duplicateLayer}
          onStartEyedropper={handleStartEyedropper}
          activeEyedropper={eyedropperTarget}
          onTriggerAiInpaint={handleTriggerAiInpaint}
          isAiInpainting={isAiInpainting}
          onStartStylePicker={handleStartStylePicker}
          isStylePickerActive={isStylePickerActive}
        />
      </main>

      {/* Full-Res Export Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        imageSrc={imageSrc}
        layers={layers}
      />
    </div>
  );
}
