import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { useStore } from "../store/appStore.js";
import ProductCard from "./ProductCard.jsx";

// تطبيع عربي: يوحّد الهمزات والتاء المربوطة والألف المقصورة لمطابقة أذكى
const norm = (s) => (s || "").replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/\s+/g, " ").trim().toLowerCase();
const RECENT_KEY = "bk-recent-search";
const getRecent = () => { try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); } catch { return []; } };
const saveRecent = (q) => {
  const t = (q || "").trim();
  if (!t) return getRecent();
  try { const r = [t, ...getRecent().filter((x) => x !== t)].slice(0, 8); localStorage.setItem(RECENT_KEY, JSON.stringify(r)); return r; } catch { return getRecent(); }
};

/* صفحة البحث — بحث حي أثناء الكتابة + مطابقة ذكية + عمليات بحث سابقة */
export default function SearchPage({ cart, add, inc, dec, onBack }) {
  const products = useStore((s) => s.products);
  const [q, setQ] = useState("");
  const [recent, setRecent] = useState(getRecent());
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); }, []);

  const trending = ["حليب", "شيبس", "كولا", "سيروم", "سماعات", "موز", "شوكولاتة", "بيض"];
  const nq = norm(q);
  const results = nq
    ? products.filter((p) => norm(p.name).includes(nq) || norm(p.cat).includes(nq) || norm(p.sub).includes(nq))
    : [];

  const remember = () => setRecent(saveRecent(q));

  return (
    <div className="bk-page">
      <div className="bk-srch-head">
        <div className="bk-srch-in">
          <Search size={17} color="#8a8a8a" />
          <input ref={ref} placeholder="ابحث عن منتجات، ماركات، فئات…" value={q} onChange={(e) => setQ(e.target.value)} />
          {q && <X size={18} color="#aaa" style={{ cursor: "pointer" }} onClick={() => { setQ(""); ref.current?.focus(); }} />}
        </div>
        <span className="bk-srch-cancel" onClick={onBack}>إلغاء</span>
      </div>

      <div className="bk-pbody" style={{ background: "#fff" }}>
        {!nq ? (
          <>
            {recent.length > 0 && (
              <>
                <div className="bk-srch-sec">🕘 عمليات بحث سابقة</div>
                <div className="bk-trend">
                  {recent.map((t) => <span key={t} className="c" onClick={() => setQ(t)}>{t}</span>)}
                </div>
              </>
            )}
            <div className="bk-srch-sec">🔥 رائج الآن</div>
            <div className="bk-trend">
              {trending.map((t) => <span key={t} className="c" onClick={() => setQ(t)}>{t}</span>)}
            </div>
          </>
        ) : results.length > 0 ? (
          <>
            <div className="bk-srch-sec">نتائج «{q}» ({results.length})</div>
            <div className="bk-cat-grid" style={{ padding: "0 12px 16px" }}>
              {results.map((p) => (
                <ProductCard key={p.id} p={p} grid qty={cart[p.id] || 0} onAdd={(id) => { remember(); add(id); }} onInc={inc} onDec={dec} />
              ))}
            </div>
          </>
        ) : (
          <div className="bk-noresult"><div className="e">🔍</div>لا نتائج لـ «{q}» — جرّب كلمة أخرى</div>
        )}
      </div>
    </div>
  );
}
