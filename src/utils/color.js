// أدوات مزج الألوان لتأثير طيّ الهيدر
export const hexToRgb = (h) => {
  h = h.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
export const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
export const rgb = (a) => `rgb(${a[0]},${a[1]},${a[2]})`;
export const rgba = (a, al) => `rgba(${a[0]},${a[1]},${a[2]},${al})`;
export const clamp01 = (x) => Math.min(1, Math.max(0, x));
