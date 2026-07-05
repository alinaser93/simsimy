// ═══ معالج الصور الذكي (يعمل في المتصفح — بلا خوادم) ═══
// يحوّل أي صورة يرفعها التاجر إلى: مربّعة + مضغوطة + WebP + خلفية موحّدة
// النتيجة: صور خفيفة (~30-80 كB) سريعة التحميل وبمظهر احترافي متناسق كبلينكيت.

// خلفيات المنتجات الرسمية (فاتحة، هادئة، احترافية — مستوحاة من بلينكيت)
export const PRODUCT_BGS = [
  { name: "أخضر فاتح", bg: "#E9F2EC" },
  { name: "أزرق فاتح", bg: "#EAF1F8" },
  { name: "وردي فاتح", bg: "#FBEAEA" },
  { name: "بيج دافئ", bg: "#F6EFE2" },
  { name: "بنفسجي فاتح", bg: "#F0EAF7" },
  { name: "أصفر فاتح", bg: "#FBF6E0" },
  { name: "رمادي محايد", bg: "#F0F1F3" },
  { name: "خوخي", bg: "#FBEEE6" },
  { name: "نعناعي", bg: "#E6F4EE" },
  { name: "أبيض نقي", bg: "#FFFFFF" },
];

// اقتراح خلفية مناسبة حسب القسم (تناسق لوني تلقائي)
const CAT_BG = {
  "خضار وفواكه": "#E9F2EC", "ألبان وخبز وبيض": "#EAF1F8", "حلويات وشوكولاتة": "#F6EFE2",
  "تسالي وحلويات": "#FBF6E0", "مشروبات وعصائر": "#EAF1F8", "آيس كريم ومثلجات": "#F0EAF7",
  "جمال وعناية": "#FBEAEA", "إلكترونيات": "#F0F1F3", "منزل وديكور": "#F6EFE2",
  "أطفال وألعاب": "#FBEEE6", "منظفات وعناية منزلية": "#E6F4EE", "زيوت وسكر وبهارات": "#FBF6E0",
  "طحين وأرز وبقوليات": "#F6EFE2", "طعام سريع ومجمّد": "#FBEAEA", "بقالة أساسية": "#F0F1F3",
};
export const bgForCat = (cat) => CAT_BG[cat] || "#F0F1F3";

/**
 * يعالج ملف صورة: يقصّه مربّعاً، يركّب خلفية، يصغّره ويضغطه.
 * @param {File} file صورة يرفعها المستخدم
 * @param {object} opts { size=800, bg="#FFFFFF", pad=0.08, format="webp", quality=0.82, contain=true }
 * @returns {Promise<{dataUrl, blob, width, height, sizeKB}>}
 */
export async function processImage(file, opts = {}) {
  const { size = 800, bg = "#FFFFFF", pad = 0.08, format = "webp", quality = 0.82, contain = true } = opts;
  const img = await loadImage(file);
  const canvas = document.createElement("canvas");
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";

  // خلفية (شفافة إن كانت transparent)
  if (bg && bg !== "transparent") { ctx.fillStyle = bg; ctx.fillRect(0, 0, size, size); }

  const inner = size * (1 - pad * 2);
  let dw, dh;
  if (contain) {
    const scale = Math.min(inner / img.width, inner / img.height);
    dw = img.width * scale; dh = img.height * scale;
  } else { // cover
    const scale = Math.max(size / img.width, size / img.height);
    dw = img.width * scale; dh = img.height * scale;
  }
  ctx.drawImage(img, (size - dw) / 2, (size - dh) / 2, dw, dh);

  const mime = format === "png" ? "image/png" : format === "jpeg" ? "image/jpeg" : "image/webp";
  const blob = await new Promise((res) => canvas.toBlob(res, mime, quality));
  const dataUrl = canvas.toDataURL(mime, quality);
  return { dataUrl, blob, width: size, height: size, sizeKB: Math.round((blob?.size || dataUrl.length) / 1024) };
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("تعذّر قراءة الصورة")); };
    img.src = url;
  });
}

// تحويل dataUrl إلى File (للرفع أو التخزين)
export function dataUrlToFile(dataUrl, name = "image.webp") {
  const [head, body] = dataUrl.split(",");
  const mime = (head.match(/:(.*?);/) || [])[1] || "image/webp";
  const bin = atob(body);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new File([arr], name, { type: mime });
}
