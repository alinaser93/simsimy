// كتل الصفحة الرئيسية — نظام «المنشئ التفاعلي»
// أنواع الكتل: builtin (مكوّن جاهز) | row (صف منتجات) | ad (بانر إعلاني)
let n = 0;
const id = () => "hb" + (++n);
export const HOME_BLOCKS = [
  { id: id(), type: "builtin", key: "bestsellers", label: "الأكثر مبيعاً (شبكة الفئات)" },
  { id: id(), type: "builtin", key: "grocery", label: "بلاطات: البقالة والمطبخ" },
  { id: id(), type: "builtin", key: "snacks", label: "بلاطات: وجبات خفيفة ومشروبات" },
  { id: id(), type: "builtin", key: "beauty", label: "بلاطات: الجمال والعناية" },
  { id: id(), type: "builtin", key: "household", label: "بلاطات: مستلزمات المنزل" },
  { id: id(), type: "builtin", key: "stores", label: "بلاطات: متاجر مميّزة" },
  { id: id(), type: "builtin", key: "lifestyle", label: "بلاطات: مختارات لأسلوبك" },
  { id: id(), type: "builtin", key: "trio", label: "البطاقات الثلاثية" },
  { id: id(), type: "builtin", key: "banners", label: "بانرات العروض العريضة" },
  { id: id(), type: "row", title: "منتجات رائجة قربك", sub: "", ids: [32, 33, 1, 28], cat: "الرائج الآن", layout: "grid" },
  { id: id(), type: "ad", t: "احتفال البرياني هنا", p: "أحضر أجود أنواع الأرز", cta: "تسوّق الآن", e: "🍚", bg: "" },
  { id: id(), type: "row", title: "مشروبات باردة وعصائر", sub: "غازية · طاقة · ماء جوز الهند", ids: [34, 35, 37, 38, 39, 40], cat: "مشروبات وعصائر", layout: "grid" },
  { id: id(), type: "row", title: "شوكولاتة لنزواتك", sub: "", ids: [56, 57, 55, 59, 58, 60], cat: "حلويات وشوكولاتة", layout: "grid" },
  { id: id(), type: "row", title: "آيس كريم لصيفٍ منعش", sub: "علب · أقماع · كيك آيس كريم", ids: [62, 65, 63, 66, 67, 64], cat: "آيس كريم ومثلجات", layout: "grid" },
  { id: id(), type: "row", title: "طعام سريع ومجمّد", sub: "نودلز · مجمّدات · دجاج", ids: [48, 49, 50, 51, 52, 54], cat: "طعام سريع ومجمّد", layout: "grid" },
  { id: id(), type: "row", title: "زيوت وسكر وبهارات", sub: "", ids: [41, 43, 44, 45, 46, 47], cat: "زيوت وسكر وبهارات", layout: "grid" },
  { id: id(), type: "row", title: "طحين وأرز للوجبات اليومية", sub: "", ids: [74, 75, 72, 73, 76], cat: "طحين وأرز وبقوليات", layout: "grid" },
  { id: id(), type: "row", title: "خضار وفواكه طازجة", sub: "", ids: [68, 70, 69, 71, 32, 33], cat: "خضار وفواكه", layout: "grid" },
  { id: id(), type: "row", title: "الألبان والخبز والبيض", sub: "حليب · لبن · أجبان", ids: [77, 78, 79, 4, 28, 31], cat: "ألبان وخبز وبيض", layout: "grid" },
  { id: id(), type: "ad", t: "سيرومات لكل بشرة", p: "فيتامين C ونياسيناميد", cta: "اكتشفي", e: "🧪", bg: "linear-gradient(120deg,#2A6ED9,#1d55ad)" },
  { id: id(), type: "row", title: "عناية وجمال", sub: "سيرومات · ترطيب", ids: [87, 88, 89, 90, 91, 6], cat: "جمال وعناية", layout: "grid" },
  { id: id(), type: "row", title: "أساسيات النظافة", sub: "غسيل · أرضيات · معطرات", ids: [80, 83, 84, 82, 85, 86], cat: "منظفات وعناية منزلية", layout: "grid" },
  { id: id(), type: "row", title: "صوتيات وإلكترونيات", sub: "", ids: [93, 94, 95, 9, 11, 10], cat: "إلكترونيات", layout: "grid" },
  { id: id(), type: "builtin", key: "bigstores", label: "متاجر يحبها الجميع" },
  { id: id(), type: "row", title: "الأساسيات اليومية، توصيل سريع", sub: "", ids: [4, 5, 14, 2], cat: "البقالة", layout: "grid" },
];
