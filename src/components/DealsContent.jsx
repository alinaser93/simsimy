import { useMemo } from "react";
import ProductRow from "./ProductRow.jsx";
import { useStore } from "../store/appStore.js";

/* تبويب «العروض» — يعرض المنتجات المخفّضة مجمّعة بأقسام مُثيّمة (كتبويب Deals في بلينكيت)
   مربوط بالأدمن: أي منتج يضع له الأدمن سعرًا أقل من سعر ما قبل الخصم يظهر هنا تلقائيًا،
   وأي منتج يفعّل له الأدمن «عرض مميّز» يظهر في صف العروض المختارة بالأعلى. */
const SECTIONS = [
  { title: "أقل الأسعار على البقالة اليومية", cats: ["طحين وأرز وبقوليات", "زيوت وسكر وبهارات"] },
  { title: "وفّر أكثر مع عروض المشروبات", cats: ["مشروبات وعصائر"] },
  { title: "حلويات وآيس كريم بأسعار مغرية", cats: ["حلويات وشوكولاتة", "آيس كريم ومثلجات"] },
  { title: "طعام سريع ومجمّد بخصم", cats: ["طعام سريع ومجمّد"] },
  { title: "أساسيات المنزل بأسعار مخفّضة", cats: ["منظفات وعناية منزلية", "ألبان وخبز وبيض"] },
  { title: "أجهزة وإلكترونيات بأكبر خصم", cats: ["إلكترونيات"] },
  { title: "عناية وجمال بعروض", cats: ["جمال وعناية"] },
];

export default function DealsContent({ cart, add, inc, dec, openList }) {
  const products = useStore((s) => s.products);
  const pct = (p) => (p.mrpIQD > p.priceIQD ? (p.mrpIQD - p.priceIQD) / p.mrpIQD : 0);

  const featured = useMemo(
    () => products.filter((p) => p.deal).sort((a, b) => pct(b) - pct(a)).slice(0, 10).map((p) => p.id),
    [products]
  );

  const sections = useMemo(() => {
    const discounted = products.filter((p) => p.mrpIQD > p.priceIQD);
    return SECTIONS.map((sec) => ({
      ...sec,
      ids: discounted
        .filter((p) => sec.cats.includes(p.cat || ""))
        .sort((a, b) => pct(b) - pct(a))
        .slice(0, 8)
        .map((p) => p.id),
    })).filter((sec) => sec.ids.length >= 2);
  }, [products]);

  return (
    <>
      <div className="bk-deal-strip">
        <span className="t">تخفيضات حتى ٧٠٪</span>
        <span className="s">توصيل سريع · أسعار لا تُقاوم</span>
      </div>
      {featured.length >= 2 && (
        <ProductRow title="⚡ عروض مختارة لك" sub="أفضل التخفيضات المنتقاة" ids={featured}
          cart={cart} add={add} inc={inc} dec={dec} onSeeAll={() => openList("الكل")} />
      )}
      {sections.map((sec) => (
        <ProductRow key={sec.title} title={sec.title} ids={sec.ids}
          cart={cart} add={add} inc={inc} dec={dec} onSeeAll={() => openList(sec.cats[0])} />
      ))}
    </>
  );
}
