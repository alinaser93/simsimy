/* توليد صور منتجات متناسقة بأسلوب بلينكيت (بلا خادم) — canvas.
   ينتج صورة نظيفة: رمز/حرف المنتج على خلفية متدرّجة بلون القسم، بأبعاد موحّدة. */

// ألوان ناعمة لكل قسم (تطابق روح بلينكيت)
const CAT_COLORS = {
  "مشروبات وعصائر": ["#E8F4FD", "#CDE8FA"],
  "زيوت وسكر وبهارات": ["#FFF6E5", "#FFE9C2"],
  "طعام سريع ومجمّد": ["#FDEEE8", "#F9D9C7"],
  "حلويات وشوكولاتة": ["#F5ECE4", "#E8D3BE"],
  "آيس كريم ومثلجات": ["#FDE9F0", "#F8CFDE"],
  "خضار وفواكه": ["#EAF7E8", "#CDEBC5"],
  "طحين وأرز وبقوليات": ["#FBF4E6", "#F0E1BF"],
  "ألبان وخبز وبيض": ["#FFFBEA", "#FDEFC0"],
  "منظفات وعناية منزلية": ["#EAF2FB", "#CFE0F5"],
  "جمال وعناية": ["#F6ECF9", "#E7D0F0"],
  "إلكترونيات": ["#ECEEF3", "#D4D9E6"],
  "منزل وديكور": ["#F0EFEA", "#DED9C9"],
  "أطفال وألعاب": ["#FDF0E8", "#F8D9C5"],
};
const DEFAULT = ["#F2F4F6", "#E1E6EB"];

export function genProductImage(emoji, cat, size = 400) {
  const [c1, c2] = CAT_COLORS[cat] || DEFAULT;
  const cv = document.createElement("canvas");
  cv.width = cv.height = size;
  const ctx = cv.getContext("2d");
  // خلفية متدرّجة قطرية
  const g = ctx.createLinearGradient(0, 0, size, size);
  g.addColorStop(0, c1); g.addColorStop(1, c2);
  ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
  // دائرة ناعمة خلف الرمز
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.32, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.45)"; ctx.fill();
  // ظل خفيف
  ctx.shadowColor = "rgba(0,0,0,0.12)"; ctx.shadowBlur = size * 0.04; ctx.shadowOffsetY = size * 0.015;
  // الرمز/الإيموجي في المنتصف
  ctx.shadowColor = "transparent";
  ctx.font = `${size * 0.4}px "Noto Color Emoji", "Segoe UI Emoji", sans-serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(emoji || "🛒", size / 2, size / 2 + size * 0.02);
  return cv.toDataURL("image/png");
}

// خلفيات متعددة مقترحة (للأدمن ليختار)
export function suggestBackgrounds(emoji, cat) {
  const bases = Object.keys(CAT_COLORS);
  const picks = [cat, ...bases.filter((b) => b !== cat)].slice(0, 4);
  return picks.map((c) => ({ cat: c, url: genProductImage(emoji, c, 300) }));
}
