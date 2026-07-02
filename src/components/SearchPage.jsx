import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { useStore } from "../store/appStore.js";
import ProductCard from "./ProductCard.jsx";

/* صفحة البحث — رائج الآن + نتائج حية أثناء الكتابة */
export default function SearchPage({ cart, add, inc, dec, onBack }) {
  const products = useStore((s) => s.products);
  const [q, setQ] = useState("");
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); }, []);

  const trending = ["حليب", "شيبس", "كولا", "سيروم", "سماعات", "موز", "شوكولاتة", "بيض"];
  const results = q.trim()
    ? products.filter((p) => p.name.includes(q.trim()) || (p.cat || "").includes(q.trim()))
    : [];

  return (
    <div className="bk-page">
      <div className="bk-srch-head">
        <div className="bk-srch-in">
          <Search size={17} color="#8a8a8a" />
          <input ref={ref} placeholder="ابحث عن منتجات، ماركات، فئات…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <span className="bk-srch-cancel" onClick={onBack}>إلغاء</span>
      </div>

      <div className="bk-pbody" style={{ background: "#fff" }}>
        {!q.trim() ? (
          <>
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
                <ProductCard key={p.id} p={p} grid qty={cart[p.id] || 0} onAdd={add} onInc={inc} onDec={dec} />
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
