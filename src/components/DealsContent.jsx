import { useMemo } from "react";
import ProductRow from "./ProductRow.jsx";
import { useStore } from "../store/appStore.js";

/* تبويب «العروض» بأسلوب بلينكيت (DEAL ZONE):
   - بانر أخضر «منطقة العروض»
   - شبكة بلاطات نجمية (متاجر الأسعار + نِسب الخصم) — قابلة للتحكّم من الأدمن
   - أقسام مُثيّمة للمنتجات المخفّضة، مربوطة بالأدمن */
const SECTIONS = [
  { title: "أقل الأسعار على البقالة اليومية", cats: ["طحين وأرز وبقوليات", "زيوت وسكر وبهارات"], slider: true },
  { title: "وفّر أكثر مع عروض المشروبات", cats: ["مشروبات وعصائر"], slider: true },
  { title: "حلويات وآيس كريم بأسعار مغرية", cats: ["حلويات وشوكولاتة", "آيس كريم ومثلجات"] },
  { title: "طعام سريع ومجمّد بخصم", cats: ["طعام سريع ومجمّد"] },
  { title: "أساسيات المنزل بأسعار مخفّضة", cats: ["منظفات وعناية منزلية", "ألبان وخبز وبيض"] },
  { title: "أجهزة وإلكترونيات بأكبر خصم", cats: ["إلكترونيات"] },
  { title: "عناية وجمال بعروض", cats: ["جمال وعناية"] },
];

export default function DealsContent({ cart, add, inc, dec, openList }) {
  const products = useStore((s) => s.products);
  const dealZone = useStore((s) => s.settings.dealZone);
  const rowLayouts = useStore((s) => s.settings.rowLayouts || {});
  const lay = (title, def) => (rowLayouts[title] || def) === "slide";
  const pct = (p) => (p.mrpIQD > p.priceIQD ? (p.mrpIQD - p.priceIQD) / p.mrpIQD : 0);

  const featured = useMemo(
    () => products.filter((p) => p.deal).sort((a, b) => pct(b) - pct(a)).slice(0, 10).map((p) => p.id),
    [products]
  );

  const sections = useMemo(() => {
    const discounted = products.filter((p) => p.mrpIQD > p.priceIQD);
    return SECTIONS.map((sec) => ({
      ...sec,
      ids: discounted.filter((p) => sec.cats.includes(p.cat || "")).sort((a, b) => pct(b) - pct(a)).slice(0, 8).map((p) => p.id),
    })).filter((sec) => sec.ids.length >= 2);
  }, [products]);

  const tileClick = (t) => {
    if (t.type === "max") openList("__deals_max_" + t.n);
    else if (t.type === "minoff") openList("__deals_off_" + t.n);
  };

  return (
    <>
      {/* بانر منطقة العروض الأخضر */}
      <div className="bk-dealzone">
        <div className="bk-dz-banner">
          <span className="dz-coupon c1">٪</span>
          <span className="dz-emoji e1">🧳</span>
          <span className="dz-title">منطقة العروض</span>
          <span className="dz-emoji e2">🛒</span>
          <span className="dz-coupon c2">٪</span>
        </div>
        <div className="bk-dz-grid">
          {(dealZone?.tiles || []).map((t) => (
            <div key={t.id} className="bk-dz-tile" onClick={() => tileClick(t)}>
              <div className="star">
                <div className="v">{t.value}</div>
                <div className="l">{t.label}</div>
                {t.sub && <div className="sub">{t.sub}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {featured.length >= 2 && (
        <ProductRow title="⚡ عروض مختارة لك" sub="أفضل التخفيضات المنتقاة" ids={featured}
          slider={lay("⚡ عروض مختارة لك", "grid")}
          cart={cart} add={add} inc={inc} dec={dec} onSeeAll={() => openList("الكل")} />
      )}
      {sections.map((sec) => (
        <ProductRow key={sec.title} title={sec.title} ids={sec.ids}
          slider={lay(sec.title, sec.slider ? "slide" : "grid")}
          cart={cart} add={add} inc={inc} dec={dec} onSeeAll={() => openList(sec.cats[0])} />
      ))}
    </>
  );
}
