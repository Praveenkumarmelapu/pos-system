import { useEffect, useRef } from 'react';

/**
 * useBarcodeScanner Hook
 * Listens for rapid keystrokes from USB/Bluetooth HID barcode scanners.
 * Only fires when user is NOT focused on a text input field.
 * When focused on a barcode input field, the form handles it instead.
 */
export function useBarcodeScanner({ onScan, minLength = 4, maxInterval = 50, enabled = true }) {
  const bufferRef = useRef('');
  const lastTimeRef = useRef(0);
  const onScanRef = useRef(onScan);
  
  // Keep callback ref fresh without re-registering listener
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (!enabled) {
      bufferRef.current = '';
      return;
    }

    function handleKeyDown(e) {
      const target = e.target;
      const targetTag = target.tagName?.toLowerCase();
      const isInput = targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select';

      // If user is focused on ANY input (including barcode input), let the form handle it
      // The hook only captures "background" scanner keystrokes when no input is focused
      if (isInput || target.isContentEditable || e.ctrlKey || e.altKey || e.metaKey || e.isComposing) {
        bufferRef.current = '';
        return;
      }

      const now = Date.now();
      
      const timeDiff = now - lastTimeRef.current;
      lastTimeRef.current = now;

      if (e.key === 'Enter') {
        const code = bufferRef.current.trim();
        bufferRef.current = '';
        
        if (timeDiff <= maxInterval && code.length >= minLength && onScanRef.current) {
          e.preventDefault();
          onScanRef.current(code);
        }
        return;
      }

      // Reset buffer if typing speed is too slow (human typing)
      if (timeDiff > maxInterval && bufferRef.current.length > 0) {
        bufferRef.current = '';
      }

      // Collect printable characters
      if (e.key.length === 1) {
        bufferRef.current += e.key;
      }
    }

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [enabled, minLength, maxInterval]);
}
