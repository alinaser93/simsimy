// كتل التبويبات المُثيّمة — قابلة للتحرير من منشئ الصفحات
let n = 0; const id = () => "tb" + (++n);
export const TAB_BLOCKS = {
  electronics: [
    { id: id(), type: "row", title: "أفضل الصوتيات والإكسسوارات", ids: [93, 94, 95, 9, 10, 11], cat: "إلكترونيات", layout: "grid" },
    { id: id(), type: "builtin", key: "tiles_electronics", label: "بلاطات: فئات الإلكترونيات" },
    { id: id(), type: "row", title: "أجهزة تناسب كل احتياجاتك", ids: [11, 9, 10, 95, 93, 94], cat: "إلكترونيات", layout: "grid" },
  ],
  beauty: [
    { id: id(), type: "row", title: "مختارات الجمال الأعلى تقييماً", ids: [87, 88, 89, 8, 7, 6], cat: "جمال وعناية", layout: "grid" },
    { id: id(), type: "builtin", key: "beauty", label: "بلاطات: فئات الجمال" },
    { id: id(), type: "builtin", key: "concerns", label: "تسوّق حسب الحاجة" },
    { id: id(), type: "row", title: "غذّي وأصلحي شعركِ", sub: "ماسكات وسيرومات للشعر", ids: [6, 8, 7, 90, 91, 92], cat: "جمال وعناية", layout: "grid" },
  ],
  decor: [
    { id: id(), type: "row", title: "قطع مختارة لمنزلك", ids: [18, 19, 20, 21], cat: "منزل وديكور", layout: "grid" },
    { id: id(), type: "builtin", key: "tiles_decor", label: "بلاطات: فئات الديكور" },
    { id: id(), type: "row", title: "أضف الخضرة لكل غرفة", ids: [21, 18, 19, 20], cat: "منزل وديكور", layout: "grid" },
  ],
  kids: [
    { id: id(), type: "row", title: "مختارات الصغار", ids: [15, 16, 17], cat: "أطفال وألعاب", layout: "grid" },
    { id: id(), type: "builtin", key: "tiles_kids", label: "بلاطات: فئات الأطفال" },
    { id: id(), type: "row", title: "هدايا للصغار", ids: [17, 15, 16], cat: "أطفال وألعاب", layout: "grid" },
  ],
  gifting: [
    { id: id(), type: "row", title: "هدايا مختارة سيحبونها", ids: [21, 22, 15, 60], cat: "الكل", layout: "grid" },
    { id: id(), type: "ad", t: "علّب فرحتهم", p: "علب هدايا فاخرة لكل مناسبة", cta: "اكتشف", e: "🎁", bg: "linear-gradient(120deg,#5a4a7a,#3a2f4a)" },
    { id: id(), type: "row", title: "هدية الطبيعة المثالية", ids: [18, 21, 20, 61], cat: "الكل", layout: "grid" },
  ],
  imported: [
    { id: id(), type: "row", title: "وصل حديثاً: المفضّلة عالمياً", ids: [23, 1, 2, 12], cat: "الكل", layout: "grid" },
    { id: id(), type: "builtin", key: "tiles_imported", label: "بلاطات: فئات المستورد" },
    { id: id(), type: "row", title: "استمتع بعالم من النكهات", ids: [12, 22, 13, 60], cat: "الكل", layout: "grid" },
  ],
};
