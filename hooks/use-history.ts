import { useState, useCallback, useRef } from 'react';
import { TextLayer } from '@/lib/canvas-renderer';

export interface HistoryEntry {
  layers: TextLayer[];
  action: string;
  timestamp: number;
}

const MAX_HISTORY = 40;

export function useHistory(initialLayers: TextLayer[]) {
  const [history, setHistory] = useState<HistoryEntry[]>(() => [
    { layers: initialLayers, action: 'Initial state', timestamp: 0 },
  ]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingLayersRef = useRef<TextLayer[] | null>(null);

  const commitState = useCallback((newLayers: TextLayer[], action: string) => {
    setHistory((prev) => {
      // Slice off any redo branch
      const sliced = prev.slice(0, currentIndex + 1);
      const updated = [
        ...sliced,
        {
          layers: JSON.parse(JSON.stringify(newLayers)),
          action,
          timestamp: 0,
        },
      ];
      // Keep within max limit
      if (updated.length > MAX_HISTORY) {
        return updated.slice(updated.length - MAX_HISTORY);
      }
      return updated;
    });

    setCurrentIndex((prev) => {
      const nextIndex = Math.min(prev + 1, MAX_HISTORY - 1);
      return nextIndex;
    });
  }, [currentIndex]);

  // Push new state to history stack
  const pushState = useCallback((newLayers: TextLayer[], action: string = 'Edit', debounceMs: number = 0) => {
    if (debounceMs > 0) {
      pendingLayersRef.current = newLayers;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        if (pendingLayersRef.current) {
          commitState(pendingLayersRef.current, action);
          pendingLayersRef.current = null;
        }
      }, debounceMs);
    } else {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      commitState(newLayers, action);
    }
  }, [commitState]);

  // Reset history completely (e.g. when loading new image or sample)
  const resetHistory = useCallback((newLayers: TextLayer[], action: string = 'Load Image') => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    setHistory([
      {
        layers: JSON.parse(JSON.stringify(newLayers)),
        action,
        timestamp: 0,
      },
    ]);
    setCurrentIndex(0);
  }, []);

  // Undo step
  const undo = useCallback((): TextLayer[] | null => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      return JSON.parse(JSON.stringify(history[newIndex].layers));
    }
    return null;
  }, [currentIndex, history]);

  // Redo step
  const redo = useCallback((): TextLayer[] | null => {
    if (currentIndex < history.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      return JSON.parse(JSON.stringify(history[newIndex].layers));
    }
    return null;
  }, [currentIndex, history]);

  return {
    canUndo: currentIndex > 0,
    canRedo: currentIndex < history.length - 1,
    undo,
    redo,
    pushState,
    resetHistory,
    currentAction: history[currentIndex]?.action || 'Edit',
    historyCount: history.length,
    currentIndex,
  };
}
