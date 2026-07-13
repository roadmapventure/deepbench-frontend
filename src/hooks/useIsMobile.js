// DeepBench v6.1.46 | useIsMobile.js | S-MI-45 — platform's single responsive breakpoint source
// FEATURE: MI-45 — see STYLE-GUIDE.md §22
import { useState, useEffect } from "react";

export const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const query = `(max-width: ${MOBILE_BREAKPOINT}px)`;
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setIsMobile(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return isMobile;
}
