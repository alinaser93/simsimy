import { useMemo, useState } from "react";
import { ChevronRight, ChevronDown, Search, User, ArrowUpDown, X, SlidersHorizontal, Check } from "lucide-react";
import { useStore } from "../store/appStore.js";
import ProductCard from "./ProductCard.jsx";

const SORTS = ["الأكثر رواجاً", "السعر: الأقل أولاً", "السعر: الأعلى أولاً", "أعلى خصم"];
const fmtN = (n) => n >= 1000 ? (n / 1000) + " ألف" : String(n);
// أقسام كل تبويب — تحصر نتائج «تسوّق حسب الحاجة» فيها (تمنع تطابق كلمة عابرة كـ«كريم»→«آيس كريم»)
const TAB_CATS = {
  beauty: ["جمال وعناية"],
  electronics: ["إلكترونيات"],
  decor: ["منزل وديكور"],
  kids: ["أطفال وألعاب"],
};

/* صفحة التصنيف بأسلوب بلينكيت:
   عنوان القسم + صفوف أفقية ثابتة لكل تفرّع (نودلز / مجمّدات / دجاج…) + فرز */
export default function Listing({ title, cart, add, inc, dec, onBack }) {
  const PRODUCTS = useStore((s) => s.products);
  const cats = useMemo(() => [...new Set(PRODUCTS.map((p) => p.cat || "بقالة أساسية"))], [PRODUCTS]);
  const subsAll = useMemo(() => [...new Set(PRODUCTS.map((p) => p.sub).filter(Boolean))], [PRODUCTS]);
  // محلّل ذكي: قسم تام → تفرّع تام → أقرب قسم بالتشابه → بحث بالكلمات.
  // لا يسقط أبداً على «الكل» (كان يعرض كل المتجر تحت عنوان خاطئ!)
  const match = useMemo(() => {
    if (title === "الكل") return { type: "all" };
    if (cats.includes(title)) return { type: "cat", value: title };
    if (subsAll.includes(title)) return { type: "sub", value: title };
    const norm = (w) => (w.startsWith("و") && w.length > 2 ? w.slice(1) : w);
    const toks = (str) => new Set(str.split(/\s+/).map(norm).filter((w) => w.length > 1));
    const tt = toks(title);
    let best = null, bestScore = 0;
    cats.forEach((c) => {
      const sc = [...toks(c)].filter((w) => tt.has(w)).length;
      if (sc > bestScore) { best = c; bestScore = sc; }
    });
    if (bestScore >= 1) return { type: "cat", value: best };
    return { type: "search", tokens: [...tt] };
  }, [title, cats, subsAll]);
  const cat = match.type === "cat" ? match.value : match.type === "all" ? "الكل" : title;

  const [sort, setSort] = useState(SORTS[0]);
  const [sortOpen, setSortOpen] = useState(false);      // صف الفرز الأفقي
  const [activeSub, setActiveSub] = useState("__all");
  const [fBrands, setFBrands] = useState([]); // فلتر الماركات (متعدد الاختيار كبلينكيت)
  const [fOff, setFOff] = useState(0);        // أدنى خصم %
  const [fPrice, setFPrice] = useState(null); // حد أقصى للسعر
  // نافذة الفلاتر السفلية (كبلينكيت)
  const [sheetTab, setSheetTab] = useState(null);       // null = مغلقة، وإلا مفتاح التبويب
  const [sheetQuery, setSheetQuery] = useState("");
  const [draft, setDraft] = useState({ brands: [], off: 0, price: null, sub: "__all" });
  const brands = useStore((st) => st.brands) || [];
  const filterTemplates = useStore((st) => st.filterTemplates) || [];
  const concerns = useStore((st) => st.concerns) || [];
  const subConfig = useStore((st) => st.subConfig) || {};

  // عناوين خاصة من بلاطات منطقة العروض
  const dealMax = title.startsWith("__deals_max_") ? +title.replace("__deals_max_", "") : null;
  const dealOff = title.startsWith("__deals_off_") ? +title.replace("__deals_off_", "") : null;
  const concern = title.startsWith("__concern_") ? concerns.find((c) => c.id === title.replace("__concern_", "")) : null;
  const inCat = useMemo(() => {
    if (concern) {
      const kw = concern.keywords || [];
      const scope = TAB_CATS[concern.tab]; // أقسام التبويب (إن وُجدت)
      return PRODUCTS.filter((p) => {
        if (scope && !scope.includes(p.cat)) return false; // احصر النتائج في أقسام التبويب
        return kw.some((w) => (p.name || "").includes(w) || (p.sub || "").includes(w));
      });
    }
    if (dealMax) return PRODUCTS.filter((p) => p.priceIQD <= dealMax);
    if (dealOff) return PRODUCTS.filter((p) => p.mrpIQD > p.priceIQD && ((p.mrpIQD - p.priceIQD) / p.mrpIQD) * 100 >= dealOff);
    if (match.type === "all") return PRODUCTS;
    if (match.type === "cat") return PRODUCTS.filter((p) => (p.cat || "") === match.value);
    if (match.type === "sub") return PRODUCTS.filter((p) => (p.sub || "") === match.value);
    // وضع البحث: منتجات تطابق كلمات العنوان (اسم/تفرّع/قسم) — أفضل بكثير من عرض كل المتجر
    return PRODUCTS.filter((p) => match.tokens.some((w) => (p.name || "").includes(w) || (p.sub || "").includes(w) || (p.cat || "").includes(w)));
  }, [PRODUCTS, match, dealMax, dealOff, concern]);

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
    let arr = [...seen.values()];
    const cfg = subConfig[cat];
    if (cfg) {
      if (cfg.hidden && cfg.hidden.length) arr = arr.filter((sb) => !cfg.hidden.includes(sb.name));
      if (cfg.order && cfg.order.length) arr.sort((a, b) => {
        const ia = cfg.order.indexOf(a.name), ib = cfg.order.indexOf(b.name);
        return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
      });
      if (cfg.rename) arr = arr.map((sb) => ({ ...sb, label: cfg.rename[sb.name] || sb.name }));
    }
    return arr;
  }, [inCat, subConfig, cat]);

  // المنتجات المعروضة: تفرّع + ماركة + خصم + سعر ثم فرز
  const shown = useMemo(() => {
    let list = activeSub === "__all" ? inCat : inCat.filter((p) => (p.sub || "أخرى") === activeSub);
    if (fBrands.length) list = list.filter((p) => fBrands.includes(p.brand));
    if (fOff > 0) list = list.filter((p) => p.mrpIQD > p.priceIQD && ((p.mrpIQD - p.priceIQD) / p.mrpIQD) * 100 >= fOff);
    if (fPrice) list = list.filter((p) => p.priceIQD <= fPrice);
    return sorter(list);
  }, [inCat, activeSub, sort, fBrands, fOff, fPrice]);

  const activeCount = fBrands.length + (fOff ? 1 : 0) + (fPrice ? 1 : 0) + (activeSub !== "__all" ? 1 : 0);
  const clearFilters = () => { setFBrands([]); setFOff(0); setFPrice(null); setActiveSub("__all"); };

  // ═══ نافذة الفلاتر (كبلينكيت): عدّادات لكل خيار + فتح/تطبيق ═══
  const offP = (p) => (p.mrpIQD > p.priceIQD ? ((p.mrpIQD - p.priceIQD) / p.mrpIQD) * 100 : 0);
  const brandCounts = useMemo(() => { const m = {}; inCat.forEach((p) => { if (p.brand) m[p.brand] = (m[p.brand] || 0) + 1; }); return m; }, [inCat]);
  const subCounts = useMemo(() => { const m = {}; inCat.forEach((p) => { const k = p.sub || "أخرى"; m[k] = (m[k] || 0) + 1; }); return m; }, [inCat]);
  const OFF_TIERS = [10, 25, 40, 50];
  const offCounts = useMemo(() => Object.fromEntries(OFF_TIERS.map((t) => [t, inCat.filter((p) => offP(p) >= t).length])), [inCat]);
  const priceCounts = useMemo(() => Object.fromEntries(priceSteps.map((t) => [t, inCat.filter((p) => p.priceIQD <= t).length])), [inCat, priceSteps]);

  const SHEET_KEYS = template.filter((k) => k !== "sort" && (k !== "brand" || catBrands.length > 0) && (k !== "sub" || subs.length > 1));
  const SHEET_LABELS = { brand: "الماركة", off: "الخصومات", price: "السعر", sub: "الأنواع" };
  const openSheet = (tab) => {
    setDraft({ brands: [...fBrands], off: fOff, price: fPrice, sub: activeSub });
    setSheetQuery("");
    setSheetTab(tab || SHEET_KEYS[0]);
    setSortOpen(false);
  };
  const applySheet = () => {
    setFBrands(draft.brands); setFOff(draft.off); setFPrice(draft.price); setActiveSub(draft.sub);
    setSheetTab(null);
  };
  const clearSheet = () => setDraft({ brands: [], off: 0, price: null, sub: "__all" });
  const draftCount = draft.brands.length + (draft.off ? 1 : 0) + (draft.price ? 1 : 0) + (draft.sub !== "__all" ? 1 : 0);
  const q = sheetQuery.trim();
  const matchQ = (label) => !q || String(label).includes(q);

  return (
    <div className="bk-page" style={{ zIndex: 25 }}>
      <div className="bk-phead">
        <div className="bk-back" onClick={onBack}><ChevronRight size={22} strokeWidth={2.5} /></div>
        <div className="ti">{concern ? concern.title : dealMax ? `عروض بـ ${dealMax.toLocaleString("ar")} د.ع وأقل` : dealOff ? `خصم ${dealOff}٪ فأكثر` : cat === "الكل" ? title : cat}<small>التوصيل خلال 8 دقائق · {total} منتج</small></div>
        <Search size={19} color="#4a4a4a" />
        <div className="bk-profile" style={{ background: "rgba(0,0,0,.06)", borderColor: "rgba(0,0,0,.08)" }}>
          <User size={18} strokeWidth={2} color="#3a3a3a" />
        </div>
      </div>

      {/* شريط الفلاتر (كبلينكيت): زر فلاتر رئيسي يفتح النافذة السفلية + فرز سريع */}
      <div className="bk-filters hide-sb" style={{ padding: "10px 14px" }}>
        {SHEET_KEYS.length > 0 && (
          <span className={"bk-fchip main" + (activeCount ? " act" : "")} onClick={() => openSheet(null)}>
            <SlidersHorizontal size={13} strokeWidth={2.6} /> فلاتر{activeCount > 0 && <b className="bk-fbadge">{activeCount}</b>}
          </span>
        )}
        {template.includes("sort") && (
          <span className={"bk-fchip" + (sortOpen ? " on" : "") + (sort !== SORTS[0] ? " act" : "")}
            onClick={() => { setSortOpen(!sortOpen); }}>
            <ArrowUpDown size={12} strokeWidth={2.6} /> {sort === SORTS[0] ? "فرز" : sort} <ChevronDown size={13} />
          </span>
        )}
        {SHEET_KEYS.map((k) => {
          const active = k === "brand" ? fBrands.length : k === "off" ? (fOff ? 1 : 0) : k === "price" ? (fPrice ? 1 : 0) : (activeSub !== "__all" ? 1 : 0);
          const label = k === "brand" ? (fBrands.length ? `الماركة (${fBrands.length})` : "الماركة")
            : k === "off" ? (fOff ? `خصم ${fOff}%+` : "الخصومات")
            : k === "price" ? (fPrice ? `≤ ${fmtN(fPrice)}` : "السعر")
            : (activeSub !== "__all" ? activeSub : "الأنواع");
          return (
            <span key={k} className={"bk-fchip" + (active ? " act" : "")} onClick={() => openSheet(k)}>
              {label} <ChevronDown size={13} />
            </span>
          );
        })}
      </div>

      {/* صف الفرز الأفقي الأنيق (سطر واحد قابل للتمرير) */}
      {sortOpen && (
        <div className="bk-sortrow hide-sb">
          {SORTS.map((sx) => (
            <span key={sx} className={"bk-sortpill" + (sort === sx ? " on" : "")}
              onClick={() => { setSort(sx); setSortOpen(false); }}>
              {sort === sx && <Check size={13} strokeWidth={3} />} {sx}
            </span>
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
                <span>{sb.label || sb.name}</span>
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
                    <div key={bn} className={"bk-brand-circle" + (fBrands.includes(bn) ? " on" : "")}
                      onClick={() => setFBrands(fBrands.includes(bn) ? fBrands.filter((x) => x !== bn) : [...fBrands, bn])}>
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

      {/* ═══ نافذة الفلاتر السفلية (كبلينكيت) ═══ */}
      {sheetTab && (
        <div className="bk-fsheet-wrap">
          <div className="bk-fsheet-overlay" onClick={() => setSheetTab(null)}>
            <button className="bk-fsheet-x" onClick={() => setSheetTab(null)}><X size={20} strokeWidth={2.5} /></button>
          </div>
          <div className="bk-fsheet">
            <div className="bk-fsheet-head">
              <b>الفلاتر</b>
              {draftCount > 0 && <span className="bk-fsheet-n">{draftCount} مختار</span>}
            </div>
            <div className="bk-fsheet-search">
              <Search size={15} color="#999" />
              <input placeholder="ابحث في الفلاتر…" value={sheetQuery} onChange={(e) => setSheetQuery(e.target.value)} />
              {sheetQuery && <X size={15} color="#999" style={{ cursor: "pointer" }} onClick={() => setSheetQuery("")} />}
            </div>
            <div className="bk-fsheet-body">
              <div className="bk-fsheet-tabs hide-sb">
                {SHEET_KEYS.map((k) => {
                  const n = k === "brand" ? draft.brands.length : k === "off" ? (draft.off ? 1 : 0) : k === "price" ? (draft.price ? 1 : 0) : (draft.sub !== "__all" ? 1 : 0);
                  return (
                    <div key={k} className={"bk-fsheet-tab" + (sheetTab === k ? " on" : "")} onClick={() => setSheetTab(k)}>
                      {SHEET_LABELS[k]}{n > 0 && <i>{n}</i>}
                    </div>
                  );
                })}
              </div>
              <div className="bk-fsheet-opts hide-sb">
                {sheetTab === "brand" && catBrands.filter(matchQ).map((bn) => {
                  const on = draft.brands.includes(bn);
                  return (
                    <div key={bn} className="bk-fopt" onClick={() => setDraft((d) => ({ ...d, brands: d.brands.includes(bn) ? d.brands.filter((x) => x !== bn) : [...d.brands, bn] }))}>
                      <span className={"bk-fcheck" + (on ? " on" : "")}>{on && <Check size={13} strokeWidth={3.2} />}</span>
                      <span className="bk-fopt-l">{bn}</span>
                      <small>({brandCounts[bn] || 0})</small>
                    </div>
                  );
                })}
                {sheetTab === "off" && [0, ...OFF_TIERS].filter((o) => matchQ(o === 0 ? "الكل" : o + "%")).map((o) => {
                  const on = draft.off === o;
                  return (
                    <div key={o} className="bk-fopt" onClick={() => setDraft((d) => ({ ...d, off: o }))}>
                      <span className={"bk-fradio" + (on ? " on" : "")} />
                      <span className="bk-fopt-l">{o === 0 ? "كل الخصومات" : `خصم ${o}% فأكثر`}</span>
                      {o > 0 && <small>({offCounts[o] || 0})</small>}
                    </div>
                  );
                })}
                {sheetTab === "price" && [null, ...priceSteps].filter((p) => matchQ(p == null ? "الكل" : fmtN(p))).map((p) => {
                  const on = draft.price === p;
                  return (
                    <div key={String(p)} className="bk-fopt" onClick={() => setDraft((d) => ({ ...d, price: p }))}>
                      <span className={"bk-fradio" + (on ? " on" : "")} />
                      <span className="bk-fopt-l">{p == null ? "كل الأسعار" : `أقل من ${fmtN(p)} د.ع`}</span>
                      {p != null && <small>({priceCounts[p] || 0})</small>}
                    </div>
                  );
                })}
                {sheetTab === "sub" && ["__all", ...subs.map((x) => x.name)].filter((sn) => matchQ(sn === "__all" ? "الكل" : sn)).map((sn) => {
                  const on = draft.sub === sn;
                  return (
                    <div key={sn} className="bk-fopt" onClick={() => setDraft((d) => ({ ...d, sub: sn }))}>
                      <span className={"bk-fradio" + (on ? " on" : "")} />
                      <span className="bk-fopt-l">{sn === "__all" ? "كل الأنواع" : sn}</span>
                      {sn !== "__all" && <small>({subCounts[sn] || 0})</small>}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="bk-fsheet-foot">
              <button className="bk-fsheet-clear" onClick={clearSheet}>مسح الفلاتر</button>
              <button className="bk-fsheet-apply" onClick={applySheet}>تطبيق{draftCount > 0 ? ` (${draftCount})` : ""}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
