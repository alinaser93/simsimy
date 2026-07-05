import { useMemo, useState } from "react";
import { ChevronRight, ChevronDown, Search, User, ArrowUpDown } from "lucide-react";
import { useStore } from "../store/appStore.js";
import ProductCard from "./ProductCard.jsx";

const SORTS = ["الأكثر رواجاً", "السعر: الأقل أولاً", "السعر: الأعلى أولاً", "أعلى خصم"];
const fmtN = (n) => n >= 1000 ? (n / 1000) + " ألف" : String(n);

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
  const [openFilter, setOpenFilter] = useState(null); // sort | brand | off | price
  const [activeSub, setActiveSub] = useState("__all");
  const [fBrand, setFBrand] = useState("");   // فلتر الماركة
  const [fOff, setFOff] = useState(0);        // أدنى خصم %
  const [fPrice, setFPrice] = useState(null); // حد أقصى للسعر
  const brands = useStore((st) => st.brands) || [];
  const filterTemplates = useStore((st) => st.filterTemplates) || [];

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

  // قالب الفلاتر لهذا القسم (من الأدمن) — أو القالب العام "*"
  const template = useMemo(() => {
    const exact = filterTemplates.find((t) => t.cat === cat);
    const star = filterTemplates.find((t) => t.cat === "*");
    return (exact || star || { filters: ["sort", "brand", "off", "price"] }).filters;
  }, [filterTemplates, cat]);

  // الماركات الفعلية الموجودة في منتجات هذا القسم (+ المسجّلة للقسم من الأدمن)
  const catBrands = useMemo(() => {
    const inProducts = [...new Set(inCat.map((p) => p.brand).filter(Boolean))];
    const registered = brands.filter((b) => (b.cats || []).includes(cat) || (b.cats || []).length === 0).map((b) => b.name);
    return [...new Set([...inProducts, ...registered])];
  }, [inCat, brands, cat]);

  // حدود السعر للفلترة
  const priceSteps = useMemo(() => {
    const prices = inCat.map((p) => p.priceIQD);
    const max = Math.max(...prices, 0);
    if (max <= 5000) return [1000, 2500, 5000];
    if (max <= 25000) return [5000, 10000, 25000];
    return [10000, 25000, 50000, 100000];
  }, [inCat]);

  // شريط التفرّعات الجانبي (كبلينكيت): «الكل» + كل تفرّع بأيقونته
  const subs = useMemo(() => {
    const seen = new Map();
    inCat.forEach((p) => {
      const key = p.sub || "أخرى";
      if (!seen.has(key)) seen.set(key, { name: key, e: p.e, img: p.img || (p.images && p.images[0]) });
    });
    return [...seen.values()];
  }, [inCat]);

  // المنتجات المعروضة: تفرّع + ماركة + خصم + سعر ثم فرز
  const shown = useMemo(() => {
    let list = activeSub === "__all" ? inCat : inCat.filter((p) => (p.sub || "أخرى") === activeSub);
    if (fBrand) list = list.filter((p) => p.brand === fBrand);
    if (fOff > 0) list = list.filter((p) => p.mrpIQD > p.priceIQD && ((p.mrpIQD - p.priceIQD) / p.mrpIQD) * 100 >= fOff);
    if (fPrice) list = list.filter((p) => p.priceIQD <= fPrice);
    return sorter(list);
  }, [inCat, activeSub, sort, fBrand, fOff, fPrice]);

  const activeCount = (fBrand ? 1 : 0) + (fOff ? 1 : 0) + (fPrice ? 1 : 0);
  const clearFilters = () => { setFBrand(""); setFOff(0); setFPrice(null); setOpenFilter(null); };

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

      {/* شريط الفلاتر الديناميكي — يتبع قالب القسم من الأدمن */}
      <div className="bk-filters hide-sb" style={{ padding: "10px 14px" }}>
        {template.includes("sort") && (
          <span className={"bk-fchip" + (openFilter === "sort" ? " on" : "") + (sort !== SORTS[0] ? " act" : "")}
            onClick={() => setOpenFilter(openFilter === "sort" ? null : "sort")}>
            <ArrowUpDown size={12} strokeWidth={2.6} /> {sort === SORTS[0] ? "فرز" : sort} <ChevronDown size={13} />
          </span>
        )}
        {template.includes("brand") && catBrands.length > 0 && (
          <span className={"bk-fchip" + (openFilter === "brand" ? " on" : "") + (fBrand ? " act" : "")}
            onClick={() => setOpenFilter(openFilter === "brand" ? null : "brand")}>
            {fBrand || "الماركة"} <ChevronDown size={13} />
          </span>
        )}
        {template.includes("off") && (
          <span className={"bk-fchip" + (openFilter === "off" ? " on" : "") + (fOff ? " act" : "")}
            onClick={() => setOpenFilter(openFilter === "off" ? null : "off")}>
            {fOff ? `خصم ${fOff}%+` : "الخصومات"} <ChevronDown size={13} />
          </span>
        )}
        {template.includes("price") && (
          <span className={"bk-fchip" + (openFilter === "price" ? " on" : "") + (fPrice ? " act" : "")}
            onClick={() => setOpenFilter(openFilter === "price" ? null : "price")}>
            {fPrice ? `≤ ${fmtN(fPrice)}` : "السعر"} <ChevronDown size={13} />
          </span>
        )}
        {template.includes("sub") && subs.length > 1 && (
          <span className={"bk-fchip" + (activeSub !== "__all" ? " act" : "")}
            onClick={() => setActiveSub("__all")}>
            {activeSub === "__all" ? "كل الأنواع" : activeSub} {activeSub !== "__all" && "✕"}
          </span>
        )}
        {activeCount > 0 && <span className="bk-fclear" onClick={clearFilters}>مسح الكل ({activeCount})</span>}
      </div>

      {/* لوحات الفلاتر المنبثقة */}
      {openFilter === "sort" && (
        <div className="bk-chips" style={{ padding: "0 14px 10px" }}>
          {SORTS.map((sx) => (
            <span key={sx} className={"bk-chip" + (sort === sx ? " on" : "")}
              onClick={() => { setSort(sx); setOpenFilter(null); }}>{sx}</span>
          ))}
        </div>
      )}
      {openFilter === "brand" && (
        <div className="bk-chips" style={{ padding: "0 14px 10px" }}>
          <span className={"bk-chip" + (!fBrand ? " on" : "")} onClick={() => { setFBrand(""); setOpenFilter(null); }}>الكل</span>
          {catBrands.map((b) => (
            <span key={b} className={"bk-chip" + (fBrand === b ? " on" : "")}
              onClick={() => { setFBrand(b); setOpenFilter(null); }}>{b}</span>
          ))}
        </div>
      )}
      {openFilter === "off" && (
        <div className="bk-chips" style={{ padding: "0 14px 10px" }}>
          {[0, 10, 25, 40, 50].map((o) => (
            <span key={o} className={"bk-chip" + (fOff === o ? " on" : "")}
              onClick={() => { setFOff(o); setOpenFilter(null); }}>{o === 0 ? "الكل" : `${o}%+ خصم`}</span>
          ))}
        </div>
      )}
      {openFilter === "price" && (
        <div className="bk-chips" style={{ padding: "0 14px 10px" }}>
          <span className={"bk-chip" + (!fPrice ? " on" : "")} onClick={() => { setFPrice(null); setOpenFilter(null); }}>الكل</span>
          {priceSteps.map((p) => (
            <span key={p} className={"bk-chip" + (fPrice === p ? " on" : "")}
              onClick={() => { setFPrice(p); setOpenFilter(null); }}>≤ {fmtN(p)} د.ع</span>
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
          {catBrands.length >= 2 && template.includes("brand") && (
            <div className="bk-brandshop">
              <div className="bk-brandshop-t">تسوّق حسب الماركة</div>
              <div className="bk-brandshop-row hide-sb">
                {catBrands.map((bn) => {
                  const bObj = brands.find((b) => b.name === bn);
                  return (
                    <div key={bn} className={"bk-brand-circle" + (fBrand === bn ? " on" : "")}
                      onClick={() => setFBrand(fBrand === bn ? "" : bn)}>
                      <div className="bk-brand-img">{bObj?.img ? <img src={bObj.img} alt="" onError={(e) => { e.target.style.display = "none"; }} /> : (bObj?.e || "🏷️")}</div>
                      <span>{bn}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
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
