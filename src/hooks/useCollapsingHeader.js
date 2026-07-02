import { useRef, useLayoutEffect } from "react";
import { hexToRgb, mix, rgb, clamp01 } from "../utils/color.js";
import { INK_RGB } from "../constants/colors.js";

const COLLAPSE = 120; // مسافة التمرير حتى يكتمل طيّ الهيدر
const FADE = 210;     // مسافة التمرير حتى يختفي البانر

// التمرير يحرّك متغيّرات CSS فقط (‎--t --hf --tc‎) — بلا أي إعادة رسم React
export function useCollapsingHeader(theme) {
  const phoneRef = useRef(null);
  const scrollRef = useRef(null);
  const rafPending = useRef(false);
  const onHeadRgbRef = useRef([255, 255, 255]);

  const onScroll = () => {
    if (rafPending.current) return;
    rafPending.current = true;
    requestAnimationFrame(() => {
      rafPending.current = false;
      const el = scrollRef.current, ph = phoneRef.current;
      if (!el || !ph) return;
      const y = el.scrollTop;
      const t = clamp01(y / COLLAPSE);
      ph.style.setProperty("--t", String(t));
      ph.style.setProperty("--hf", String(clamp01(1 - y / FADE)));
      ph.style.setProperty("--tc", rgb(mix(onHeadRgbRef.current, INK_RGB, t)));
    });
  };

  // إعادة الهيدر لحالته الممتدة عند تغيير التبويب (قبل الرسم)
  useLayoutEffect(() => {
    const ph = phoneRef.current;
    if (!ph) return;
    onHeadRgbRef.current = hexToRgb(theme.onHead);
    ph.style.setProperty("--t", "0");
    ph.style.setProperty("--hf", "1");
    ph.style.setProperty("--tc", rgb(onHeadRgbRef.current));
  }, [theme]);

  return { phoneRef, scrollRef, onScroll };
}
