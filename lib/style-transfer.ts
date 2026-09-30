import { TextLayer } from './canvas-renderer';

export interface TypographyStyle {
  id: string;
  name: string;
  fontFamily: string;
  fontWeight: string;
  fontStyle: 'normal' | 'italic';
  color: string;
  hasOutline: boolean;
  outlineColor: string;
  outlineWidth: number;
  hasShadow: boolean;
  shadowColor: string;
  shadowBlur: number;
  blendMode: GlobalCompositeOperation;
  cameraBlur: number;
  filmGrain: number;
  letterSpacing: number;
  textTransform: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  sourceText?: string;
  backgroundColor?: string;
  confidence?: number;
}

/**
 * Extracts distinct typography styles from current text layers
 */
export function extractStylesFromLayers(layers: TextLayer[]): TypographyStyle[] {
  const styles: TypographyStyle[] = [];
  const seenKeys = new Set<string>();

  layers.forEach((layer) => {
    const key = `${layer.fontFamily}-${layer.fontWeight}-${layer.color}-${layer.blendMode}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      styles.push({
        id: `style-${layer.id}`,
        name: layer.originalText ? `"${layer.originalText.slice(0, 18)}"` : `${layer.fontFamily} ${layer.fontWeight}`,
        fontFamily: layer.fontFamily,
        fontWeight: layer.fontWeight,
        fontStyle: layer.fontStyle || 'normal',
        color: layer.color,
        hasOutline: layer.hasOutline,
        outlineColor: layer.outlineColor,
        outlineWidth: layer.outlineWidth,
        hasShadow: layer.hasShadow,
        shadowColor: layer.shadowColor,
        shadowBlur: layer.shadowBlur,
        blendMode: layer.blendMode,
        cameraBlur: layer.cameraBlur,
        filmGrain: layer.filmGrain,
        letterSpacing: layer.letterSpacing,
        textTransform: layer.textTransform,
        sourceText: layer.originalText || layer.currentText,
        backgroundColor: layer.backgroundColor,
      });
    }
  });

  return styles;
}

/**
 * Transfers a typography style onto a target TextLayer
 */
export function applyStyleToLayer(targetLayer: TextLayer, style: TypographyStyle): TextLayer {
  return {
    ...targetLayer,
    fontFamily: style.fontFamily,
    fontWeight: style.fontWeight,
    fontStyle: style.fontStyle,
    color: style.color,
    hasOutline: style.hasOutline,
    outlineColor: style.outlineColor,
    outlineWidth: style.outlineWidth,
    hasShadow: style.hasShadow,
    shadowColor: style.shadowColor,
    shadowBlur: style.shadowBlur,
    blendMode: style.blendMode,
    cameraBlur: style.cameraBlur,
    filmGrain: style.filmGrain,
    letterSpacing: style.letterSpacing,
    textTransform: style.textTransform,
  };
}

/**
 * Finds nearest style by geometric distance on image
 */
export function findNearestStyle(
  box: TextLayer['box'],
  layers: TextLayer[],
  excludeId?: string
): TypographyStyle | null {
  const validLayers = layers.filter((l) => l.id !== excludeId);
  if (validLayers.length === 0) return null;

  const targetCenterY = (box.ymin + box.ymax) / 2;
  const targetCenterX = (box.xmin + box.xmax) / 2;

  let nearestLayer = validLayers[0];
  let minDistance = Infinity;

  validLayers.forEach((layer) => {
    const centerY = (layer.box.ymin + layer.box.ymax) / 2;
    const centerX = (layer.box.xmin + layer.box.xmax) / 2;
    const dist = Math.hypot(targetCenterX - centerX, targetCenterY - centerY);
    if (dist < minDistance) {
      minDistance = dist;
      nearestLayer = layer;
    }
  });

  const styles = extractStylesFromLayers([nearestLayer]);
  return styles[0] || null;
}
