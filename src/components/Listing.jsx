import { useMemo, useState } from "react";
import { ChevronRight, ChevronDown, Search, User, ArrowUpDown } from "lucide-react";
import { useStore } from "../store/appStore.js";
import ProductCard from "./ProductCard.jsx";

const SORTS = ["الأكثر رواجاً", "السعر: الأقل أولاً", "السعر: الأعلى أولاً", "أعلى خصم"];

/* صفحة التصنيف بأسلوب بلينكيت:
   عنوان القسم + صفوف أفقية ثابتة لكل تفرّع (نودلز / مجمّدات / دجاج…) + فرز */
export default function Listing({ title, cart, add, inc, dec, onBack }) {
  const PRODUCTS = useStore((s) => s.products);
  const cats = useMemo(() => [...new Set(PRODUCTS.map((p) => p.cat || "بقالة أساسية"))], [PRODUCTS]);
  const cat = useMemo(() => {
    if (cats.includes(title)) return title;                 // تطابق تام أولاً (يمنع التقاط قسم أقصر)
    const exactWord = cats.find((c) => title.split(/\s+/).includes(c));
    return exactWord || cats.find((c) => title.includes(c) || c.includes(title)) || "الكل";
  }, [cats, title]);

  const [sort, setSort] = useState(SORTS[0]);
  const [sortOpen, setSortOpen] = useState(false);
  const [activeSub, setActiveSub] = useState("__all");

  // عناوين خاصة من بلاطات منطقة العروض
  const dealMax = title.startsWith("__deals_max_") ? +title.replace("__deals_max_", "") : null;
  const dealOff = title.startsWith("__deals_off_") ? +title.replace("__deals_off_", "") : null;
  const inCat = useMemo(() => {
    if (dealMax) return PRODUCTS.filter((p) => p.priceIQD <= dealMax);
    if (dealOff) return PRODUCTS.filter((p) => p.mrpIQD > p.priceIQD && ((p.mrpIQD - p.priceIQD) / p.mrpIQD) * 100 >= dealOff);
    return cat === "الكل" ? PRODUCTS : PRODUCTS.filter((p) => (p.cat || "") === cat);
  }, [PRODUCTS, cat, dealMax, dealOff]);

  const sorter = (l) => {
    const a = [...l];
    if (sort === SORTS[1]) a.sort((x, y) => x.priceIQD - y.priceIQD);
    if (sort === SORTS[2]) a.sort((x, y) => y.priceIQD - x.priceIQD);
    if (sort === SORTS[3]) a.sort((x, y) => (y.mrpIQD - y.priceIQD) / y.mrpIQD - (x.mrpIQD - x.priceIQD) / x.mrpIQD);
    return a;
  };

  const total = inCat.length;

  // شريط التفرّعات الجانبي (كبلينكيت): «الكل» + كل تفرّع بأيقونته
  const subs = useMemo(() => {
    const seen = new Map();
    inCat.forEach((p) => {
      const key = p.sub || "أخرى";
      if (!seen.has(key)) seen.set(key, { name: key, e: p.e, img: p.img || (p.images && p.images[0]) });
    });
    return [...seen.values()];
  }, [inCat]);

  // المنتجات المعروضة حسب التفرّع المختار
  const shown = useMemo(() => {
    const list = activeSub === "__all" ? inCat : inCat.filter((p) => (p.sub || "أخرى") === activeSub);
    return sorter(list);
  }, [inCat, activeSub, sort]);

  return (
    <div className="bk-page" style={{ zIndex: 25 }}>
      <div className="bk-phead">
        <div className="bk-back" onClick={onBack}><ChevronRight size={22} strokeWidth={2.5} /></div>
        <div className="ti">{dealMax ? `عروض بـ ${dealMax.toLocaleString("ar")} د.ع وأقل` : dealOff ? `خصم ${dealOff}٪ فأكثر` : cat === "الكل" ? title : cat}<small>التوصيل خلال 8 دقائق · {total} منتج</small></div>
        <Search size={19} color="#4a4a4a" />
        <div className="bk-profile" style={{ background: "rgba(0,0,0,.06)", borderColor: "rgba(0,0,0,.08)" }}>
          <User size={18} strokeWidth={2} color="#3a3a3a" />
        </div>
      </div>

      <div className="bk-filters hide-sb" style={{ padding: "10px 14px" }}>
        <span className={"bk-fchip" + (sortOpen ? " on" : "")} onClick={() => setSortOpen(!sortOpen)}>
          <ArrowUpDown size={12} strokeWidth={2.6} /> {sort} <ChevronDown size={13} />
        </span>
        <span className="bk-fchip">السعر <ChevronDown size={13} /></span>
        <span className="bk-fchip">الخصومات <ChevronDown size={13} /></span>
        <span className="bk-fchip">الماركة <ChevronDown size={13} /></span>
      </div>
      {sortOpen && (
        <div className="bk-chips" style={{ padding: "0 14px 10px" }}>
          {SORTS.map((s) => (
            <span key={s} className={"bk-chip" + (sort === s ? " on" : "")}
              onClick={() => { setSort(s); setSortOpen(false); }}>{s}</span>
          ))}
        </div>
      )}

      {/* تخطيط بلينكيت: شريط تفرّعات جانبي + شبكة منتجات */}
      <div className="bk-listing-layout">
        {subs.length > 1 && (
          <div className="bk-siderail hide-sb">
            <div className={"bk-rail-item" + (activeSub === "__all" ? " on" : "")} onClick={() => setActiveSub("__all")}>
              <div className="bk-rail-img all">✨</div>
              <span>الكل</span>
            </div>
            {subs.map((sb) => (
              <div className={"bk-rail-item" + (activeSub === sb.name ? " on" : "")} key={sb.name} onClick={() => setActiveSub(sb.name)}>
                <div className="bk-rail-img">{sb.img ? <img src={sb.img} alt="" onError={(e) => { e.target.style.display = "none"; }} /> : sb.e}</div>
                <span>{sb.name}</span>
              </div>
            ))}
          </div>
        )}
        <div className="bk-listing-main hide-sb">
          <div className="bk-listing-grid2">
            {shown.map((p) => (
              <ProductCard key={p.id} p={p} qty={cart[p.id] || 0} onAdd={add} onInc={inc} onDec={dec} grid />
            ))}
          </div>
          {shown.length === 0 && <div style={{ textAlign: "center", color: "#9a9a9a", padding: 40, fontWeight: 600 }}>لا توجد منتجات في هذا القسم بعد</div>}
        </div>
      </div>
    </div>
  );
}
