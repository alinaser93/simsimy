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




// قاموس مبسّط عربي→إنجليزي لوصف الصورة (لتوليد صور صحيحة عبر Pollinations)
const AR_EN = {
  "تمر": "dates fruit", "تمور": "dates", "خضري": "khudri dates", "موز": "banana", "تفاح": "apple",
  "برتقال": "orange fruit", "عنب": "grapes", "رمان": "pomegranate", "فراولة": "strawberry",
  "بطيخ": "watermelon", "مانجو": "mango", "ليمون": "lemon", "خيار": "cucumber", "طماطم": "tomato",
  "بصل": "onion", "بطاطا": "potato", "جزر": "carrot", "ثوم": "garlic", "باذنجان": "eggplant",
  "شوكولاتة": "chocolate bar", "شوكولا": "chocolate", "كادبوري": "cadbury chocolate", "كيت كات": "kitkat chocolate",
  "بسكويت": "biscuits", "كيك": "cake", "رقائق": "potato chips", "شيبس": "chips", "فشار": "popcorn",
  "آيس كريم": "ice cream", "بوظة": "ice cream", "حليب": "milk bottle", "لبن": "yogurt", "زبادي": "yogurt cup",
  "جبن": "cheese", "جبنة": "cheese", "خبز": "bread", "صمون": "bread bun", "بيض": "eggs carton",
  "أرز": "rice bag", "بسمتي": "basmati rice", "طحين": "flour bag", "دقيق": "flour",
  "عدس": "lentils", "حمص": "chickpeas", "فاصوليا": "beans", "زيت": "cooking oil bottle", "خردل": "mustard oil",
  "سكر": "sugar bag", "ملح": "salt", "بهار": "spices", "كاتشب": "ketchup bottle", "صلصة": "sauce",
  "عصير": "juice bottle", "كولا": "cola soft drink", "بيبسي": "pepsi can", "ماء": "water bottle",
  "مشروب طاقة": "energy drink can", "شامبو": "shampoo bottle", "صابون": "soap bar", "كريم": "cream jar",
  "سيروم": "face serum bottle", "مسحوق غسيل": "laundry detergent", "معطر": "air freshener spray",
  "سماعات": "headphones", "شاحن": "phone charger", "باور بانك": "power bank",
  "معجون": "paste jar", "نودلز": "instant noodles pack", "معكرونة": "pasta pack", "دجاج": "frozen chicken",
  "فيريرو": "ferrero rocher chocolate", "روشيه": "ferrero rocher", "أوريو": "oreo cookies",
};
const norm2 = (s) => (s || "").toLowerCase().replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي");
export function arToEnPrompt(name) {
  const t = norm2(name);
  // ابحث عن أطول كلمة مفتاحية مطابقة
  let best = "", en = "";
  for (const [ar, e] of Object.entries(AR_EN)) {
    if (t.includes(norm2(ar)) && ar.length > best.length) { best = ar; en = e; }
  }
  return en || name; // إن لم نجد، نعيد الاسم كما هو
}

// توليد صورة حقيقية بالذكاء عبر Pollinations (مجاني، بلا مفتاح)
// seed اختياري: مرّر قيمة ثابتة (مثل رقم المنتج) لتكون الصورة **نفسها على كل الأجهزة**.
export function pollinationsUrl(prompt, seed) {
  const p = encodeURIComponent((prompt || "product") + ", professional product photo, plain white background, centered, high quality, no text");
  const s = (seed == null ? Math.floor(Math.random() * 100000) : Math.abs(seed) % 1000000);
  return `https://image.pollinations.ai/prompt/${p}?width=600&height=600&nologo=true&seed=${s}`;
}


// توحيد صورة المنتج: مربّع بخلفية بيضاء نظيفة (كبلينكيت) — دون تغيير ألوان المنتج
export function normalizeImage(srcUrl, size = 600) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const cv = document.createElement("canvas");
        cv.width = cv.height = size;
        const ctx = cv.getContext("2d");
        // خلفية بيضاء
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, size, size);
        // احتواء الصورة داخل المربّع مع هامش (object-fit: contain)
        const pad = size * 0.08;
        const box = size - pad * 2;
        const scale = Math.min(box / img.width, box / img.height);
        const w = img.width * scale, h = img.height * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        resolve(cv.toDataURL("image/jpeg", 0.9));
      } catch (e) { reject(e); }
    };
    img.onerror = () => reject(new Error("تعذّر تحميل الصورة"));
    img.src = srcUrl;
  });
}
