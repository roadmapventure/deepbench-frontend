// src/hooks/useAIStatus.js — v5.0.0
// Global AI status indicator — any component writes to this, one indicator renders.
// The pulsing brass dot in the header reflects whatever is active across the app.

import { useState, useCallback, useRef } from "react";

// Module-level store — single instance across the app
let _listeners = [];
let _status = { active: false, message: "" };

function notifyListeners() {
  _listeners.forEach(fn => fn({ ..._status }));
}

// Call this from any component to set the AI status
export function setAIStatus(message) {
  _status = { active: !!message, message: message || "" };
  notifyListeners();
}

export function clearAIStatus() {
  _status = { active: false, message: "" };
  notifyListeners();
}

// Hook — subscribe to global AI status
export function useAIStatus() {
  const [status, setStatus] = useState(() => ({ ..._status }));

  // Register listener on mount, clean up on unmount
  const listenerRef = useRef(null);
  if (!listenerRef.current) {
    listenerRef.current = (s) => setStatus(s);
    _listeners.push(listenerRef.current);
  }

  // Cleanup — remove listener when component unmounts
  // (called via useEffect cleanup in consumer)
  const cleanup = useCallback(() => {
    _listeners = _listeners.filter(fn => fn !== listenerRef.current);
  }, []);

  return { status, cleanup };
}
