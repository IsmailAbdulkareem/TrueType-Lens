export interface TextLayer {
  id: string;
  originalText: string;
  currentText: string;
  // Bounding box in normalized coordinates (0 to 1000)
  box: {
    ymin: number;
    xmin: number;
    ymax: number;
    xmax: number;
  };
  // Original physical box of the text on the scanned image (stays locked so inpaint doesn't uncover old text)
  originalBox?: {
    ymin: number;
    xmin: number;
    ymax: number;
    xmax: number;
  };
  // Group ID for grouped layers that move together
  groupId?: string;
  // Typography
  fontFamily: string;
  fontSize: number; // in px relative to rendered image height
  fontWeight: string;
  fontStyle: 'normal' | 'italic';
  textAlign: 'left' | 'center' | 'right';
  textTransform: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  letterSpacing: number; // in px
  lineHeight: number; // multiplier, e.g. 1.2

  // Color & Appearance
  color: string; // hex
  opacity: number; // 0 to 1

  // Outline / Stroke
  hasOutline: boolean;
  outlineColor: string;
  outlineWidth: number;

  // Shadow / Glow
  hasShadow: boolean;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;

  // Photorealism & Camera simulation
  blendMode: GlobalCompositeOperation;
  cameraBlur: number; // px blur (0 to 5)
  filmGrain: number; // grain intensity (0 to 40)
  
  // 3D Geometry
  rotationAngle: number; // degrees (-180 to 180)
  perspectiveSkewX: number; // degrees (-45 to 45)
  perspectiveSkewY: number; // degrees (-45 to 45)

  // Background Inpainting (Removing original text)
  inpaintOriginal: boolean;
  inpaintPadding: number; // px padding around box
  inpaintFeather: number; // px edge blur
  backgroundColor: string; // sampled or detected background color
  backgroundTextureType?: string;

  // Visibility & Lock
  visible: boolean;
  locked?: boolean;
}

export interface RenderOptions {
  splitPosition?: number; // 0 to 1 for Before/After split slider, null for standard view
  showBoundingBoxes?: boolean;
  selectedLayerId?: string | null;
  hoveredLayerId?: string | null;
  showOriginalOnly?: boolean;
}

/**
 * Inpaints and removes the original text region from the canvas image.
 * Uses targetBox (originalBox if moved) to ensure the original printed text
 * stays permanently erased and never reveals double text when moved.
 * Runs in microseconds with zero browser freeze.
 */
export function inpaintRegion(
  ctx: CanvasRenderingContext2D,
  imageWidth: number,
  imageHeight: number,
  layer: TextLayer
) {
  if (!layer.inpaintOriginal) return;

  // ALWAYS inpaint the original printed location on the photo
  const targetBox = layer.originalBox || layer.box;
  const rawPad = typeof layer.inpaintPadding === 'number' ? layer.inpaintPadding : 4;
  const feather = Math.max(1, typeof layer.inpaintFeather === 'number' ? layer.inpaintFeather : 2);

  const rawH = ((targetBox.ymax - targetBox.ymin) / 1000) * imageHeight;
  const pad = Math.min(Math.max(3, rawPad), Math.max(3, rawH * 0.35));

  const x = Math.max(0, (targetBox.xmin / 1000) * imageWidth - pad);
  const y = Math.max(0, (targetBox.ymin / 1000) * imageHeight - pad);
  const w = Math.min(imageWidth - x, ((targetBox.xmax - targetBox.xmin) / 1000) * imageWidth + pad * 2);
  const h = Math.min(imageHeight - y, ((targetBox.ymax - targetBox.ymin) / 1000) * imageHeight + pad * 2);

  if (w <= 0 || h <= 0) return;

  ctx.save();
  // Fast, seamless background fill
  ctx.fillStyle = layer.backgroundColor || '#FFFFFF';
  if (feather > 1) {
    ctx.filter = `blur(${feather}px)`;
  }
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

/**
 * Transforms text case based on setting
 */
export function formatText(text: string, transform: TextLayer['textTransform']): string {
  if (!text) return '';
  switch (transform) {
    case 'uppercase':
      return text.toUpperCase();
    case 'lowercase':
      return text.toLowerCase();
    case 'capitalize':
      return text.replace(/\b\w/g, (c) => c.toUpperCase());
    default:
      return text;
  }
}

/**
 * Draws realistic text onto canvas with camera lens blur, film grain, and photometric blending
 */
export function drawRealisticText(
  ctx: CanvasRenderingContext2D,
  imageWidth: number,
  imageHeight: number,
  layer: TextLayer
) {
  if (!layer.visible || !layer.currentText.trim()) return;

  const boxX = (layer.box.xmin / 1000) * imageWidth;
  const boxY = (layer.box.ymin / 1000) * imageHeight;
  const boxW = ((layer.box.xmax - layer.box.xmin) / 1000) * imageWidth;
  const boxH = ((layer.box.ymax - layer.box.ymin) / 1000) * imageHeight;

  const centerX = boxX + boxW / 2;
  const centerY = boxY + boxH / 2;

  const formattedStr = formatText(layer.currentText, layer.textTransform);
  const lines = formattedStr.split('\n');

  // Compute font size with automatic width-fitting to prevent overlapping adjacent words
  let calculatedFontSize = layer.fontSize > 0 
    ? (layer.fontSize / 1000) * imageHeight
    : Math.max(8, (boxH * 0.78) / Math.max(1, lines.length));

  const fontStyle = layer.fontStyle || 'normal';
  const fontWeight = layer.fontWeight || '700';
  const fontFamily = layer.fontFamily || 'Inter, sans-serif';

  // Check if text exceeds bounding box width and auto-scale if needed
  ctx.save();
  ctx.font = `${fontStyle} ${fontWeight} ${calculatedFontSize}px "${fontFamily}", sans-serif`;
  let maxMeasuredWidth = 0;
  lines.forEach((line) => {
    const m = ctx.measureText(line).width;
    if (m > maxMeasuredWidth) maxMeasuredWidth = m;
  });
  ctx.restore();

  if (maxMeasuredWidth > boxW && maxMeasuredWidth > 0 && boxW > 0) {
    const scaleFactor = (boxW * 0.98) / maxMeasuredWidth;
    calculatedFontSize = Math.max(7, calculatedFontSize * scaleFactor);
  }

  ctx.save();

  // 1. Center of transformation
  ctx.translate(centerX, centerY);

  // 2. Rotation & Perspective Skew
  if (layer.rotationAngle) {
    ctx.rotate((layer.rotationAngle * Math.PI) / 180);
  }

  if (layer.perspectiveSkewX || layer.perspectiveSkewY) {
    const radX = ((layer.perspectiveSkewX || 0) * Math.PI) / 180;
    const radY = ((layer.perspectiveSkewY || 0) * Math.PI) / 180;
    ctx.transform(1, Math.tan(radY), Math.tan(radX), 1, 0, 0);
  }

  // 3. Photometric Blend mode & Opacity
  ctx.globalCompositeOperation = layer.blendMode || 'source-over';
  ctx.globalAlpha = Math.max(0, Math.min(1, layer.opacity ?? 1));

  // 4. Lens focus & Camera softness
  if (layer.cameraBlur && layer.cameraBlur > 0) {
    ctx.filter = `blur(${layer.cameraBlur}px)`;
  } else {
    ctx.filter = 'none';
  }

  // 5. Typography setup
  ctx.font = `${fontStyle} ${fontWeight} ${calculatedFontSize}px "${fontFamily}", sans-serif`;
  ctx.textAlign = layer.textAlign || 'center';
  ctx.textBaseline = 'middle';

  // Support canvas letter spacing
  if (layer.letterSpacing && 'letterSpacing' in ctx) {
    (ctx as any).letterSpacing = `${layer.letterSpacing}px`;
  }

  // Calculate text horizontal offset relative to center of box
  let drawX = 0;
  if (layer.textAlign === 'left') {
    drawX = -boxW / 2;
  } else if (layer.textAlign === 'right') {
    drawX = boxW / 2;
  }

  // Calculate text vertical metrics
  const lineSpacing = calculatedFontSize * (layer.lineHeight || 1.15);
  const totalTextHeight = lines.length * lineSpacing;
  let startY = -totalTextHeight / 2 + lineSpacing / 2;

  // 6. Draw each line with Shadow, Outline, and Fill
  lines.forEach((line) => {
    // Drop shadow
    if (layer.hasShadow && layer.shadowColor) {
      ctx.shadowColor = layer.shadowColor;
      ctx.shadowBlur = layer.shadowBlur || 4;
      ctx.shadowOffsetX = layer.shadowOffsetX || 2;
      ctx.shadowOffsetY = layer.shadowOffsetY || 2;
    } else {
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }

    // Outline / Stroke
    if (layer.hasOutline && layer.outlineColor && layer.outlineWidth > 0) {
      ctx.strokeStyle = layer.outlineColor;
      ctx.lineWidth = layer.outlineWidth;
      ctx.lineJoin = 'round';
      ctx.miterLimit = 2;
      ctx.strokeText(line, drawX, startY);
    }

    // Text Fill
    ctx.fillStyle = layer.color || '#FFFFFF';
    ctx.fillText(line, drawX, startY);

    startY += lineSpacing;
  });

  // 7. Sensor Grain / Film Noise Pass
  if (layer.filmGrain && layer.filmGrain > 0) {
    addNoiseToTransformedText(ctx, boxW * 1.3, boxH * 1.3, layer.filmGrain);
  }

  ctx.restore();
}

/**
 * Adds photographic micro-grain to make text match camera sensor noise
 */
function addNoiseToTransformedText(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  grainAmount: number
) {
  try {
    const noiseCanvas = document.createElement('canvas');
    const nw = Math.ceil(Math.min(w, 400));
    const nh = Math.ceil(Math.min(h, 200));
    noiseCanvas.width = nw;
    noiseCanvas.height = nh;
    const nctx = noiseCanvas.getContext('2d');
    if (!nctx) return;

    const imgData = nctx.createImageData(nw, nh);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = Math.random() > 0.5 ? 255 : 0;
      const alpha = Math.random() * (grainAmount / 100) * 120;
      d[i] = v;
      d[i + 1] = v;
      d[i + 2] = v;
      d[i + 3] = alpha;
    }
    nctx.putImageData(imgData, 0, 0);

    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.drawImage(noiseCanvas, -w / 2, -h / 2, w, h);
    ctx.restore();
  } catch {
    // silently skip if canvas fails
  }
}

/**
 * Draws interactive bounding box handles
 */
export function drawBoundingBox(
  ctx: CanvasRenderingContext2D,
  imageWidth: number,
  imageHeight: number,
  layer: TextLayer,
  isSelected: boolean,
  isHovered: boolean,
  isGroupMember?: boolean
) {
  const x = (layer.box.xmin / 1000) * imageWidth;
  const y = (layer.box.ymin / 1000) * imageHeight;
  const w = ((layer.box.xmax - layer.box.xmin) / 1000) * imageWidth;
  const h = ((layer.box.ymax - layer.box.ymin) / 1000) * imageHeight;

  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  if (layer.rotationAngle) {
    ctx.rotate((layer.rotationAngle * Math.PI) / 180);
  }

  // Border style
  ctx.lineWidth = isSelected ? 2 : isGroupMember ? 2 : 1.5;
  ctx.strokeStyle = isSelected
    ? '#06b6d4'
    : isGroupMember
    ? '#a855f7'
    : isHovered
    ? '#38bdf8'
    : 'rgba(255, 255, 255, 0.4)';
  if (!isSelected && !isGroupMember) {
    ctx.setLineDash([4, 4]);
  } else {
    ctx.setLineDash([]);
  }

  ctx.strokeRect(-w / 2, -h / 2, w, h);

  // Group label if part of a group
  if (layer.groupId && (isSelected || isGroupMember)) {
    ctx.fillStyle = '#a855f7';
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText('🔗 GROUPED', -w / 2, -h / 2 - 4);
  }

  // Corner resize handles if selected
  if (isSelected) {
    const handleSize = 8;
    ctx.fillStyle = '#06b6d4';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;

    const corners = [
      [-w / 2, -h / 2],
      [w / 2, -h / 2],
      [-w / 2, h / 2],
      [w / 2, h / 2],
    ];

    corners.forEach(([cx, cy]) => {
      ctx.fillRect(cx - handleSize / 2, cy - handleSize / 2, handleSize, handleSize);
      ctx.strokeRect(cx - handleSize / 2, cy - handleSize / 2, handleSize, handleSize);
    });

    // Rotation handle at top
    ctx.beginPath();
    ctx.moveTo(0, -h / 2);
    ctx.lineTo(0, -h / 2 - 18);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, -h / 2 - 18, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Samples pixel color from canvas at point
 */
export function samplePixelColor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number
): string {
  try {
    const p = ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
    const hex = (
      '#' +
      [p[0], p[1], p[2]]
        .map((c) => c.toString(16).padStart(2, '0'))
        .join('')
    ).toUpperCase();
    return hex;
  } catch {
    return '#FFFFFF';
  }
}

/**
 * Crops a region from canvas and returns it as a data URL for Lens OCR analysis
 */
export function cropCanvasRegion(
  canvas: HTMLCanvasElement,
  box: { ymin: number; xmin: number; ymax: number; xmax: number }
): string | null {
  try {
    const x = Math.max(0, Math.floor((box.xmin / 1000) * canvas.width));
    const y = Math.max(0, Math.floor((box.ymin / 1000) * canvas.height));
    const w = Math.min(canvas.width - x, Math.ceil(((box.xmax - box.xmin) / 1000) * canvas.width));
    const h = Math.min(canvas.height - y, Math.ceil(((box.ymax - box.ymin) / 1000) * canvas.height));

    if (w <= 2 || h <= 2) return null;

    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = w;
    cropCanvas.height = h;
    const cropCtx = cropCanvas.getContext('2d');
    if (!cropCtx) return null;

    cropCtx.drawImage(canvas, x, y, w, h, 0, 0, w, h);
    return cropCanvas.toDataURL('image/jpeg', 0.95);
  } catch {
    return null;
  }
}
