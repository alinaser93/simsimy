import React, { useState, useEffect } from "react";
import { Plus, Trash2, Pencil } from "lucide-react";
import { useStore, addProduct, updateProduct, removeProduct } from "../store/appStore.js";
import { Switch } from "../portal/PortalKit.jsx";
import { classify, suggestPrice, suggestBadge, generateDesc, findSimilar } from "../utils/smartProduct.js";
import { uploadImage, getSupabaseCfg, setSupabaseCfg } from "../utils/supabase.js";
import { aiCall } from "../utils/aiClient.js";
import { fmt, CUR } from "../utils/currency.js";

const CATS = ["مشروبات وعصائر","زيوت وسكر وبهارات","طعام سريع ومجمّد","حلويات وشوكولاتة","آيس كريم ومثلجات","خضار وفواكه","طحين وأرز وبقوليات","ألبان وخبز وبيض","منظفات وعناية منزلية","جمال وعناية","إلكترونيات","منزل وديكور","أطفال وألعاب","بقالة أساسية","تسالي وحلويات","مشروبات"];

async function addImage(upd, data) {
  const cfg = getSupabaseCfg();
  if (cfg && cfg.url && cfg.anonKey) {
    const inp = document.createElement("input");
    inp.type = "file"; inp.accept = "image/*";
    inp.onchange = async () => {
      const f = inp.files[0]; if (!f) return;
      try { const url = await uploadImage(f); upd({ images: [...(data.images || []), url] }); }
      catch (e) { alert(e.message); }
    };
    inp.click();
  } else {
    const u = prompt("رابط الصورة (أو اضبط Supabase من الإعدادات للرفع المباشر):");
    if (u) upd({ images: [...(data.images || []), u] });
  }
}

const EMPTY = { name: "", e: "🛒", weight: "", priceIQD: 1000, mrpIQD: 1500, merchantId: "m1", cat: CATS[0], sub: "", deal: false, desc: "", highlights: [], images: [], variants: [], badge: "", autoPlace: true };
const emptyFor = (mid) => ({ ...EMPTY, merchantId: mid || "m1" });
function ProductManager({ scope = "admin", mid = null }) {
  const allProducts = useStore((s) => s.products);
  const merchants = useStore((s) => s.merchants);
  const isMerchant = scope === "merchant";
  const products = isMerchant ? allProducts.filter((p) => p.merchantId === mid) : allProducts;
  const [q, setQ] = useState("");
  const [catFilter, setCatFilter] = useState("الكل");
  const [merchantFilter, setMerchantFilter] = useState("الكل");
  const [groupBy, setGroupBy] = useState("cat"); // cat | merchant | none
  const [dealsOnly, setDealsOnly] = useState(false);
  const [collapsed, setCollapsed] = useState({});
  const subOptions = [...new Set(products.map((p) => p.sub).filter(Boolean))];
  const [modal, setModal] = useState(null); // null | {mode:'add'|'edit', data}
  const list = products.filter((p) => p.name.includes(q) && (catFilter === "الكل" || p.cat === catFilter) && (merchantFilter === "الكل" || p.merchantId === merchantFilter) && (!dealsOnly || p.deal));
  const mName = (id) => merchants.find((m) => m.id === id)?.name || "—";
  // بناء المجموعات المرتّبة
  const groups = (() => {
    if (groupBy === "none") return [["كل المنتجات", list]];
    const map = new Map();
    if (groupBy === "cat") {
      // قسم ← ثم مرتّب داخله بالتفرّع
      list.forEach((p) => { const k = p.cat || "غير مصنّف"; if (!map.has(k)) map.set(k, []); map.get(k).push(p); });
      for (const [, arr] of map) arr.sort((a, b) => (a.sub || "").localeCompare(b.sub || "", "ar") || a.name.localeCompare(b.name, "ar"));
    } else {
      list.forEach((p) => { const k = mName(p.merchantId); if (!map.has(k)) map.set(k, []); map.get(k).push(p); });
      for (const [, arr] of map) arr.sort((a, b) => (a.cat || "").localeCompare(b.cat || "", "ar"));
    }
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  })();
  const save = () => {
    const d = { ...modal.data, priceIQD: +modal.data.priceIQD || 0, mrpIQD: +modal.data.mrpIQD || 0 };
    if (typeof d.hlText === "string") {
      d.highlights = d.hlText.split("\n").map((l) => l.split(":")).filter((a) => a.length >= 2)
        .map((a) => [a[0].trim(), a.slice(1).join(":").trim()]);
      delete d.hlText;
    }
    d.images = (d.images || []).filter(Boolean);
    if (d.images.length && !d.img) d.img = d.images[0];
    d.variants = (d.variants || []).filter((v) => v.label).map((v) => ({ label: v.label, weight: v.weight || "", priceIQD: +v.priceIQD || d.priceIQD, mrpIQD: +v.mrpIQD || +v.priceIQD || d.mrpIQD }));
    // التصنيف الذكي التلقائي: يضع المنتج في أفضل قسم لأقصى ظهور (يحترم اختيار التاجر إن أوقف التلقائي)
    if (d.autoPlace) {
      const c = classify(d.name);
      if (c.matched) { d.cat = c.cat; if (!d.sub) d.sub = c.sub; }
    }
    if (modal.mode === "add") addProduct(d); else updateProduct(d.id, d);
    setModal(null);
  };
  const upd = (patch) => setModal((m) => ({ ...m, data: { ...m.data, ...patch } }));
  const [aiBusy, setAiBusy] = useState("");
  const subsList = [...new Set(products.map((p) => p.sub).filter(Boolean))];
  // يحاول Claude الحقيقي عبر دالة Netlify؛ إن فشل يستخدم القواعد المحلية فوراً
  const runAI = async (kind) => {
    if (!modal.data.name || modal.data.name.length < 2) return;
    setAiBusy(kind);
    const base = { name: modal.data.name, cat: modal.data.cat, sub: modal.data.sub, weight: modal.data.weight, price: +modal.data.priceIQD, cats: CATS, subs: subsList };
    let res = null;
    if (kind === "classify") res = await aiCall({ ...base, task: "classify" });
    else if (kind === "desc") res = await aiCall({ ...base, task: "describe" });
    else if (kind === "badge") res = await aiCall({ ...base, task: "badge" });
    else if (kind === "full") res = await aiCall({ ...base, task: "full" });
    // تطبيق نتيجة Claude
    if (res) {
      const patch = {};
      if (res.cat && CATS.includes(res.cat)) patch.cat = res.cat;
      if (res.sub) patch.sub = res.sub;
      if (res.desc) patch.desc = res.desc;
      if (typeof res.badge === "string") patch.badge = res.badge;
      if (Object.keys(patch).length) { upd(patch); setAiBusy(""); return; }
    }
    // احتياطي: القواعد المحلية
    if (kind === "classify" || kind === "full") { const c = classify(modal.data.name); if (c.matched) upd({ cat: c.cat, sub: modal.data.sub || c.sub }); }
    if (kind === "desc" || kind === "full") upd({ desc: generateDesc(modal.data.name, modal.data.cat, modal.data.weight) });
    if (kind === "badge" || kind === "full") upd({ badge: suggestBadge(modal.data.name, +modal.data.priceIQD, +modal.data.mrpIQD) });
    setAiBusy("");
  };
  const aiClassify = () => runAI("classify");
  const aiDesc = () => runAI("desc");
  const aiBadge = () => runAI("badge");
  const aiPrice = () => { const r = suggestPrice(allProducts, modal.data.cat, modal.data.sub); if (r) upd({ priceIQD: r.price, mrpIQD: r.mrp }); };
  const similar = modal && modal.data.name.length > 2 ? findSimilar(allProducts, modal.data.name, modal.data.id) : [];
  // زرّ رجوع المتصفح يغلق المودال بدل مغادرة الصفحة
  useEffect(() => {
    if (!modal) return;
    window.history.pushState({ pm: 1 }, "");
    const onPop = () => setModal(null);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [!!modal]);
  const closeModal = () => { if (window.history.state && window.history.state.pm) window.history.back(); else setModal(null); };
  const openEdit = (p) => setModal({ mode: "edit", data: { ...p, images: p.images || (p.img ? [p.img] : []), variants: p.variants || [], badge: p.badge || "", autoPlace: false, hlText: (p.highlights || []).map(([k, v]) => k + ": " + v).join("\n") } });
  return (
    <>
      <div className="pt-h1">{isMerchant ? "منتجاتي" : "إدارة المنتجات"}<small>{isMerchant ? "سعرك وتوفّرك وصورك — تظهر فوراً للزبائن" : "التعديلات تنعكس فوراً على واجهة المتجر"}</small></div>
      <div className="pt-card">
        <div className="cap" style={{ flexWrap: "wrap", gap: 8 }}>
          <b>{list.length}</b> منتج<span className="sp" />
          <span className="pt-seg">
            <button className={"seg" + (groupBy === "cat" ? " on" : "")} onClick={() => setGroupBy("cat")}>📂 حسب القسم</button>
            {!isMerchant && <button className={"seg" + (groupBy === "merchant" ? " on" : "")} onClick={() => setGroupBy("merchant")}>🏪 حسب المتجر</button>}
            <button className={"seg" + (groupBy === "none" ? " on" : "")} onClick={() => setGroupBy("none")}>قائمة</button>
          </span>
          <select className="pt-in" style={{ width: 130 }} value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
            <option>الكل</option>{CATS.map((c) => <option key={c}>{c}</option>)}
          </select>
          {!isMerchant && <select className="pt-in" style={{ width: 130 }} value={merchantFilter} onChange={(e) => setMerchantFilter(e.target.value)}>
            <option value="الكل">كل المتاجر</option>{merchants.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>}
          <input className="pt-in" style={{ width: 110 }} placeholder="بحث…" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className={"pt-btn sm" + (dealsOnly ? "" : " ghost")} onClick={() => setDealsOnly(!dealsOnly)}>🏷️ العروض</button>
          <button className="pt-btn sm" onClick={() => setModal({ mode: "add", data: emptyFor(isMerchant ? mid : "m1") })}><Plus size={13} style={{ verticalAlign: -2 }} /> إضافة</button>
        </div>
        <div className="pt-scroll">
          <table className="pt-table pt-ptable">
            <thead><tr><th>المنتج</th><th>القسم</th><th>التفرّع</th><th>السعر</th><th>التاجر</th><th>متوفر</th><th></th></tr></thead>
            <tbody>
              {groups.map(([gname, items]) => {
                const gkey = groupBy + ":" + gname;
                const isOpen = !collapsed[gkey];
                return (
                  <React.Fragment key={gkey}>
                    <tr className="pt-grouprow" onClick={() => setCollapsed((c) => ({ ...c, [gkey]: isOpen }))}>
                      <td colSpan={7}>
                        <span className="gchev">{isOpen ? "▾" : "◂"}</span>
                        {groupBy === "merchant" ? "🏪 " : "📂 "}<b>{gname}</b>
                        <span className="gcount">{items.length}</span>
                      </td>
                    </tr>
                    {isOpen && items.map((p) => (
                <tr key={p.id} style={p.stock === false ? { opacity: 0.55 } : undefined}>
                  <td><div className="pt-prodcell">{(p.img || (p.images && p.images[0])) ? <img className="pt-thumb" src={p.img || p.images[0]} alt="" onError={(e) => { e.target.style.display = "none"; }} /> : <span className="pt-thumb emoji">{p.e}</span>}<div><b>{p.name}</b>{p.deal && <span className="pt-deal-tag">🏷️ عرض</span>}{(p.variants || []).length > 0 && <span className="pt-deal-tag" style={{ background: "#eef4fb", color: "#2a5a8a" }}>{p.variants.length} خيارات</span>}<div style={{ color: "var(--p-mut)", fontSize: 10.5 }}>{p.weight}</div></div></div></td>
                  <td style={{ fontSize: 11.5 }}>{p.cat || "—"}</td>
                  <td>{p.sub ? <span className="pt-mini-chip">{p.sub}</span> : <span style={{ color: "var(--p-mut)" }}>—</span>}</td>
                  <td><b>{fmt(p.priceIQD)} {CUR}</b><div style={{ color: "var(--p-mut)", fontSize: 10, textDecoration: "line-through" }}>{fmt(p.mrpIQD)}</div></td>
                  <td>{merchants.find((m) => m.id === p.merchantId)?.name || "—"}</td>
                  <td><Switch on={p.stock !== false} onToggle={() => updateProduct(p.id, { stock: !(p.stock !== false) })} /></td>
                  <td style={{ display: "flex", gap: 6 }}>
                    <button className="pt-btn ghost sm" onClick={() => openEdit(p)}><Pencil size={12} /></button>
                    <button className="pt-btn warn sm" onClick={() => confirm(`حذف «${p.name}»؟`) && removeProduct(p.id)}><Trash2 size={12} /></button>
                  </td>
                </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="pt-dim" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className="pt-modal">
            <h3>{modal.mode === "add" ? "✨ إضافة منتج ذكي" : "تعديل المنتج"}</h3>

            {/* صور متعددة */}
            <div className="pt-field"><label>صور المنتج (يمكن إضافة أكثر من صورة)</label>
              <div className="pt-imgs">
                {(modal.data.images || []).map((url, i) => (
                  <div key={i} className="pt-img-chip">
                    {url ? <img src={url} alt="" onError={(e) => (e.target.style.opacity = 0.2)} /> : <span className="ph">🖼️</span>}
                    <button className="rm" onClick={() => upd({ images: modal.data.images.filter((_, j) => j !== i) })}>✕</button>
                  </div>
                ))}
                <button className="pt-img-add" onClick={() => addImage(upd, modal.data)}>＋<small>صورة</small></button>
              </div>
              <div className="pt-tip">💡 المنتجات بأكثر من صورة تُباع <b>أضعافاً</b> — أضف صورًا من زوايا مختلفة ليثق الزبون ويشتري أسرع.</div>
              <input className="pt-in" style={{ marginTop: 6 }} value={modal.data.e} onChange={(e) => upd({ e: e.target.value })} placeholder="الإيموجي (يظهر إن لم توجد صورة)" />
            </div>

            <div className="pt-field"><label>اسم المنتج <button className="ai-chip" onClick={() => runAI("full")} disabled={aiBusy==="full" || modal.data.name.length<2}>{aiBusy==="full" ? "⏳ يحلّل…" : "🤖 حلّل بالذكاء"}</button></label>
              <input className="pt-in" value={modal.data.name} onChange={(e) => upd({ name: e.target.value })} placeholder="مثال: شوكولاتة كادبوري" /></div>

            {/* كشف الدمج: منتج مشابه */}
            {similar.length > 0 && modal.mode === "add" && (
              <div className="pt-merge">🔗 يوجد منتج مشابه: <b>{similar[0].name}</b> — أضِف هذا كخيار ضمنه بدل منتج منفصل؟
                <button onClick={() => { const base = similar[0]; const v = [...(base.variants || []), { label: modal.data.name.replace(base.name, "").trim() || modal.data.weight || "خيار", weight: modal.data.weight, priceIQD: +modal.data.priceIQD, mrpIQD: +modal.data.mrpIQD }]; updateProduct(base.id, { variants: v }); setModal(null); }}>دمج كخيار</button>
              </div>
            )}

            <div className="pt-row2">
              <div className="pt-field"><label>القسم {modal.data.autoPlace && <span className="ai-on">✨ تلقائي</span>} <button className="ai-chip" onClick={aiClassify} disabled={aiBusy==="classify"}>{aiBusy==="classify" ? "⏳" : "🧠 صنّف"}</button></label>
                <select className="pt-in" style={{ width: "100%" }} value={modal.data.cat || CATS[0]} onChange={(e) => upd({ cat: e.target.value })}>
                  {CATS.map((c) => <option key={c}>{c}</option>)}
                </select></div>
              <div className="pt-field"><label>التفرّع</label>
                <input className="pt-in" list="bk-subs" placeholder="نودلز ومعكرونة" value={modal.data.sub || ""} onChange={(e) => upd({ sub: e.target.value })} />
                <datalist id="bk-subs">{subOptions.map((sc) => <option key={sc} value={sc} />)}</datalist></div>
            </div>
            <label className="pt-check sm" onClick={() => upd({ autoPlace: !modal.data.autoPlace })}>
              <span className={"pt-box" + (modal.data.autoPlace ? " on" : "")}>{modal.data.autoPlace ? "✓" : ""}</span>
              🧠 تصنيف ذكي تلقائي — يضع المنتج في أنسب قسم لأقصى ظهور وشراء (يحلّل الاسم عند الحفظ)
            </label>

            <div className="pt-row2">
              <div className="pt-field"><label>الوزن/الحجم</label>
                <input className="pt-in" value={modal.data.weight} onChange={(e) => upd({ weight: e.target.value })} placeholder="1 كغ / 500 مل" /></div>
              <div className="pt-field"><label>السعر ({CUR}) <button className="ai-chip" onClick={aiPrice}>✨ اقترح</button></label>
                <input className="pt-in" type="number" step="50" value={modal.data.priceIQD} onChange={(e) => upd({ priceIQD: e.target.value })} /></div>
            </div>
            <div className="pt-field"><label>السعر قبل الخصم (اختياري)</label>
              <input className="pt-in" type="number" step="50" value={modal.data.mrpIQD} onChange={(e) => upd({ mrpIQD: e.target.value })} /></div>

            {/* خيارات المنتج (variants) */}
            <div className="pt-field"><label>خيارات المنتج (أحجام/أنواع متعددة تظهر كـ «N خيارات»)</label>
              <div className="pt-vars">
                {(modal.data.variants || []).map((v, i) => (
                  <div key={i} className="pt-var-row">
                    <input className="pt-in" placeholder="الاسم (مثال: كبير)" value={v.label} onChange={(e) => upd({ variants: modal.data.variants.map((x, j) => j === i ? { ...x, label: e.target.value } : x) })} />
                    <input className="pt-in" style={{ width: 80 }} placeholder="الحجم" value={v.weight || ""} onChange={(e) => upd({ variants: modal.data.variants.map((x, j) => j === i ? { ...x, weight: e.target.value } : x) })} />
                    <input className="pt-in" style={{ width: 90 }} type="number" step="50" placeholder="السعر" value={v.priceIQD || ""} onChange={(e) => upd({ variants: modal.data.variants.map((x, j) => j === i ? { ...x, priceIQD: e.target.value } : x) })} />
                    <button className="rm" onClick={() => upd({ variants: modal.data.variants.filter((_, j) => j !== i) })}>✕</button>
                  </div>
                ))}
                <button className="pt-btn sm ghost" onClick={() => upd({ variants: [...(modal.data.variants || []), { label: "", weight: "", priceIQD: modal.data.priceIQD, mrpIQD: modal.data.mrpIQD }] })}>＋ إضافة خيار</button>
              </div>
              <div className="pt-tip">🎯 أضف أحجامًا/أنواعًا متعددة (صغير/كبير) — الزبون يجد ما يناسب ميزانيته فيشتري بدل أن يغادر.</div>
            </div>

            {/* الشارة */}
            <div className="pt-field"><label>شارة المنتج <button className="ai-chip" onClick={aiBadge} disabled={aiBusy==="badge"}>{aiBusy==="badge" ? "⏳" : "✨ اقترح"}</button></label>
              <div className="pt-badges">
                {["", "جديد", "الأكثر مبيعاً", "عرض خاص", "محدود"].map((b) => (
                  <button key={b} className={"bdg" + (modal.data.badge === b ? " on" : "")} onClick={() => upd({ badge: b })}>{b || "بدون"}</button>
                ))}
              </div>
            </div>

            <label className="pt-check sm" onClick={() => upd({ deal: !modal.data.deal })}>
              <span className={"pt-box" + (modal.data.deal ? " on" : "")}>{modal.data.deal ? "✓" : ""}</span>
              🏷️ عرض مميّز — يظهر في صف «عروض مختارة» بتبويب العروض
            </label>

            <div className="pt-field"><label>الوصف <button className="ai-chip" onClick={aiDesc} disabled={aiBusy==="desc"}>{aiBusy==="desc" ? "⏳ يفكّر…" : "✨ توليد بالذكاء"}</button></label>
              <textarea className="pt-in" rows="2" value={modal.data.desc || ""} onChange={(e) => upd({ desc: e.target.value })} placeholder="وصف قصير يجذب الزبون…" /></div>
            <div className="pt-field"><label>المواصفات — سطر لكل خاصية «المفتاح: القيمة»</label>
              <textarea className="pt-in" rows="3" placeholder={"النوع: ألبان\nالوزن: 1 لتر"} value={modal.data.hlText || ""} onChange={(e) => upd({ hlText: e.target.value })} /></div>
            {!isMerchant && <div className="pt-field"><label>التاجر</label>
              <select className="pt-in" style={{ width: "100%" }} value={modal.data.merchantId} onChange={(e) => upd({ merchantId: e.target.value })}>
                {merchants.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select></div>}
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <button className="pt-btn" style={{ flex: 1 }} onClick={save}>💾 {modal.mode === "add" ? "إضافة المنتج" : "حفظ"}</button>
              <button className="pt-btn ghost" onClick={closeModal}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ---------------- التجار ---------------- */

export default ProductManager;
