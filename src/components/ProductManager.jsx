import React, { useState, useEffect, useRef } from "react";
import { Plus, Trash2, Pencil } from "lucide-react";
import { useStore, addProduct, updateProduct, removeProduct } from "../store/appStore.js";
import { Switch } from "../portal/PortalKit.jsx";
import { classify, suggestPrice, suggestBadge, generateDesc, findSimilar } from "../utils/smartProduct.js";
import { uploadImage, getSupabaseCfg, setSupabaseCfg } from "../utils/supabase.js";
import { aiCall } from "../utils/aiClient.js";
import { genProductImage, suggestBackgrounds, pollinationsUrl, arToEnPrompt, normalizeImage } from "../utils/imageGen.js";
import { processImage, dataUrlToFile, bgForCat, PRODUCT_BGS } from "../utils/imageProcessor.js";
import { fmt, CUR } from "../utils/currency.js";

const CATS = ["مشروبات وعصائر","زيوت وسكر وبهارات","طعام سريع ومجمّد","حلويات وشوكولاتة","آيس كريم ومثلجات","خضار وفواكه","طحين وأرز وبقوليات","ألبان وخبز وبيض","منظفات وعناية منزلية","جمال وعناية","إلكترونيات","منزل وديكور","أطفال وألعاب","بقالة أساسية","تسالي وحلويات","مشروبات"];

// رفع حيّ ذكي: يفتح الكاميرا/المعرض ← يعالج الصورة (مربّعة + خلفية + ضغط WebP) ← يخزّنها
async function addImage(upd, data, onBusy) {
  const inp = document.createElement("input");
  inp.type = "file"; inp.accept = "image/*"; // على الجوال يتيح الكاميرا والمعرض
  inp.onchange = async () => {
    const f = inp.files[0]; if (!f) return;
    if (onBusy) onBusy(true);
    try {
      // عالج الصورة محلياً: مربّعة 800px + خلفية القسم + WebP مضغوط (~40-80كB)
      const bg = bgForCat(data.cat);
      const { dataUrl, blob } = await processImage(f, { size: 800, bg, pad: 0.08, format: "webp", quality: 0.82 });
      let finalUrl = dataUrl; // افتراضياً: تخزين مضغوط داخل المتجر (يعمل دائماً بلا خادم)
      // إن كان Supabase مضبوطاً: ارفع النسخة المضغوطة لرابط دائم أخف
      const cfg = getSupabaseCfg();
      if (cfg && cfg.url && cfg.anonKey) {
        try { const up = await uploadImage(dataUrlToFile(dataUrl, "p-" + Date.now() + ".webp")); if (up) finalUrl = up; }
        catch { /* يبقى المضغوط المحلي */ }
      }
      upd({ images: [...(data.images || []), finalUrl] });
    } catch (e) { alert("تعذّرت معالجة الصورة: " + (e.message || "")); }
    if (onBusy) onBusy(false);
  };
  inp.click();
}

const EMPTY = { name: "", e: "🛒", weight: "", priceIQD: 1000, mrpIQD: 1500, merchantId: "m1", cat: CATS[0], sub: "", brand: "", deal: false, desc: "", highlights: [], images: [], variants: [], badge: "", autoPlace: true, qty: 50, lowAt: 10 };
const emptyFor = (mid) => ({ ...EMPTY, merchantId: mid || "m1" });
function ProductManager({ scope = "admin", mid = null }) {
  const allProducts = useStore((s) => s.products);
  const brands = useStore((s) => s.brands) || [];
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
  // أداة توليد الصور الواقعية لكل المنتجات دفعة واحدة
  const [bulk, setBulk] = useState(null); // null | { done, total, running }
  const bulkStop = useRef(false);
  const genAllImages = async () => {
    const targets = products.filter((p) => !((p.images && p.images.length) || p.img));
    if (!targets.length) { alert("كل المنتجات عندها صور بالفعل 👍"); return; }
    if (!window.confirm(`راح يولّد صور واقعية بالذكاء لـ ${targets.length} منتج (مجاناً).\nتقدر توقفه بأي لحظة. نكمل؟`)) return;
    bulkStop.current = false;
    setBulk({ done: 0, total: targets.length, running: true });
    let done = 0;
    for (const p of targets) {
      if (bulkStop.current) break;
      try {
        const genUrl = pollinationsUrl(arToEnPrompt(p.name)); // وصف إنجليزي موثوق ← صورة واقعية بخلفية بيضاء
        updateProduct(p.id, { images: [genUrl], img: genUrl });
        done++;
      } catch { /* تخطَّ هذا المنتج وواصل */ }
      setBulk({ done, total: targets.length, running: true });
      await new Promise((r) => setTimeout(r, 120));
    }
    setBulk({ done, total: targets.length, running: false });
    setTimeout(() => setBulk((b) => (b && !b.running ? null : b)), 6000);
  };
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
    if (d.qty != null) { d.qty = +d.qty || 0; d.lowAt = +d.lowAt || 0; d.stock = d.qty > 0; }
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
  // كل الأقسام: الثابتة + أي قسم مخصّص موجود في المنتجات + القسم الحالي (يسمح بأقسام مولّدة بالذكاء)
  const customCats = [...new Set(allProducts.map((p) => p.cat).filter((c) => c && !CATS.includes(c)))];
  const allCats = [...new Set([...(modal ? [modal.data.cat] : []), ...CATS, ...customCats].filter(Boolean))];
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
      if (res.cat) patch.cat = res.cat;   // يقبل قسماً جديداً مولّداً بالذكاء
      if (res.sub) patch.sub = res.sub;
      if (res.desc) patch.desc = res.desc;
      if (typeof res.badge === "string") patch.badge = res.badge;
      if (res.isNew && res.cat) patch._newCat = res.cat; // إشارة لقسم جديد
      if (Object.keys(patch).length) { upd(patch); setAiBusy(""); if (res.isNew) setTimeout(() => alert("🆕 أنشأ الذكاء قسماً جديداً: «" + res.cat + "» ووضع المنتج فيه"), 100); return; }
    }
    // احتياطي: القواعد المحلية
    if (kind === "classify" || kind === "full") { const c = classify(modal.data.name); if (c.matched) upd({ cat: c.cat, sub: modal.data.sub || c.sub }); }
    if (kind === "desc" || kind === "full") upd({ desc: generateDesc(modal.data.name, modal.data.cat, modal.data.weight) });
    if (kind === "badge" || kind === "full") upd({ badge: suggestBadge(modal.data.name, +modal.data.priceIQD, +modal.data.mrpIQD) });
    setAiBusy("");
  };
  const genImage = () => { const url = genProductImage(modal.data.e || "🛒", modal.data.cat); upd({ images: [...(modal.data.images || []), url] }); };
  const [normBusy, setNormBusy] = useState(false);
  const normalizeAll = async () => {
    const imgs = modal.data.images || [];
    if (!imgs.length) { alert("لا صور لتوحيدها"); return; }
    setNormBusy(true);
    try {
      const out = [];
      for (const u of imgs) {
        try { out.push(await normalizeImage(u)); } catch { out.push(u); }
      }
      upd({ images: out });
    } catch (e) { alert("تعذّر التوحيد: " + e.message); }
    setNormBusy(false);
  };
  const analyzeFromImage = async () => {
    const imgs = modal.data.images || [];
    if (!imgs.length) { alert("أضف صورة أولًا (رفع) ثم استخرج التفاصيل منها"); return; }
    setAiBusy("analyze");
    try {
      // حوّل الصورة لـ base64
      let dataUrl = imgs[0];
      if (!dataUrl.startsWith("data:")) {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        dataUrl = await new Promise((resolve) => { const fr = new FileReader(); fr.onload = () => resolve(fr.result); fr.readAsDataURL(blob); });
      }
      const r = await aiCall({ task: "analyzeImage", image: dataUrl, cats: CATS }, 25000);
      if (r && (r.name || r.desc)) {
        const patch = {};
        if (r.name && !modal.data.name) patch.name = r.name;
        if (r.desc) patch.desc = r.desc;
        if (r.weight && !modal.data.weight) patch.weight = r.weight;
        if (r.cat) patch.cat = r.cat;
        if (r.sub) patch.sub = r.sub;
        if (r.details) patch.hlText = (modal.data.hlText ? modal.data.hlText + "\n" : "") + r.details;
        upd(patch);
      } else { alert("تعذّر تحليل الصورة — تأكّد من نشر دالة الذكاء على Netlify"); }
    } catch (e) { alert("خطأ في التحليل: " + e.message); }
    setAiBusy("");
  };
  const genRealImage = async () => {
    if (!modal.data.name || modal.data.name.length < 2) { alert("اكتب اسم المنتج أولًا"); return; }
    setAiBusy("realimg");
    try {
      let prompt = arToEnPrompt(modal.data.name); // ترجمة محلية موثوقة أولًا
      const ai = await aiCall({ task: "imagePrompt", name: modal.data.name, cat: modal.data.cat }, 10000);
      if (ai && ai.prompt && ai.prompt.length > 3) prompt = ai.prompt;
      const genUrl = pollinationsUrl(prompt);
      // جلب الصورة ورفعها لـ Supabase لتخزين دائم وسريع
      try {
        const res = await fetch(genUrl);
        if (res.ok) {
          const blob = await res.blob();
          const file = new File([blob], "ai-" + Date.now() + ".jpg", { type: blob.type || "image/jpeg" });
          const stored = await uploadImage(file);
          upd({ images: [...(modal.data.images || []), stored] });
          setAiBusy(""); return;
        }
      } catch { /* fallback للرابط المباشر */ }
      upd({ images: [...(modal.data.images || []), genUrl] });
    } catch (e) { alert("تعذّر توليد الصورة — جرّب رفع صورة أو خلفية ملوّنة"); }
    setAiBusy("");
  };
  const [bgSuggest, setBgSuggest] = useState(null);
  const [imgBusy, setImgBusy] = useState(false);
  const showBgSuggest = () => setBgSuggest(suggestBackgrounds(modal.data.e || "🛒", modal.data.cat));
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
  const openEdit = (p) => setModal({ mode: "edit", data: { ...p, images: p.images || (p.img ? [p.img] : []), variants: p.variants || [], badge: p.badge || "", autoPlace: false, qty: p.qty ?? 50, lowAt: p.lowAt ?? 10, hlText: (p.highlights || []).map(([k, v]) => k + ": " + v).join("\n") } });
  return (
    <>
      <div className="pt-h1">{isMerchant ? "منتجاتي" : "إدارة المنتجات"}<small>{isMerchant ? "سعرك وتوفّرك وصورك — تظهر فوراً للزبائن" : "التعديلات تنعكس فوراً على واجهة المتجر"}</small></div>
      <div className="pt-card" style={{ background: "linear-gradient(135deg,#F0FBF3,#E3F5EA)", borderColor: "#BFE6CB" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ fontSize: 30, lineHeight: 1 }}>🎨</div>
          <div style={{ flex: 1, minWidth: 170 }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: "#0C6B2A" }}>صور واقعية بالذكاء</div>
            <div style={{ fontSize: 12.5, color: "#3a5a44", lineHeight: 1.6 }}>حوّل الإيموجي إلى صور منتجات واقعية بأسلوب بلينكيت — مجاناً وبضغطة وحدة.</div>
          </div>
          {!bulk?.running && <button className="pt-btn sm" style={{ background: "#0C831F" }} onClick={genAllImages}>🎨 ولّد صور المنتجات</button>}
        </div>
        {bulk && (
          <div style={{ marginTop: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12.5, marginBottom: 5, fontWeight: 700, color: "#0C6B2A" }}>
              <span>{bulk.running ? `⏳ يولّد… ${bulk.done} / ${bulk.total}` : `✓ تم توليد ${bulk.done} صورة`}</span>
              {bulk.running && <button className="pt-btn sm ghost" onClick={() => { bulkStop.current = true; }}>إيقاف</button>}
            </div>
            <div style={{ height: 8, background: "#D6EEDD", borderRadius: 20, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.round((bulk.done / bulk.total) * 100)}%`, background: "#0C831F", transition: "width .2s" }} />
            </div>
            {!bulk.running && <div style={{ fontSize: 11.5, color: "#3a5a44", marginTop: 7, lineHeight: 1.6 }}>الصور تظهر بالمتجر الآن. أي صورة ما عجبتك؟ افتح المنتج وبدّلها أو ولّد غيرها.</div>}
          </div>
        )}
      </div>
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
        <div className="pm-list">
          {groups.map(([gname, items]) => {
            const gkey = groupBy + ":" + gname;
            const isOpen = !collapsed[gkey];
            return (
              <div className="pm-group" key={gkey}>
                <div className="pm-grouphead" onClick={() => setCollapsed((c) => ({ ...c, [gkey]: isOpen }))}>
                  <span className="gchev">{isOpen ? "▾" : "◂"}</span>
                  {groupBy === "merchant" ? "🏪 " : "📂 "}<b>{gname}</b>
                  <span className="gcount">{items.length}</span>
                </div>
                {isOpen && items.map((p) => (
                  <div className={"pm-card" + (p.stock === false ? " off" : "")} key={p.id}>
                    {(p.img || (p.images && p.images[0])) ? <img className="pm-thumb" src={p.img || p.images[0]} alt="" onError={(e) => { e.target.style.display = "none"; }} /> : <span className="pm-thumb emoji">{p.e}</span>}
                    <div className="pm-info">
                      <div className="pm-name">{p.name}
                        {p.deal && <span className="pt-deal-tag">🏷️ عرض</span>}
                        {(p.variants || []).length > 0 && <span className="pt-deal-tag" style={{ background: "#eef4fb", color: "#2a5a8a" }}>{p.variants.length} خيارات</span>}
                      </div>
                      <div className="pm-meta">
                        {p.sub && <span className="pt-mini-chip">{p.sub}</span>}
                        {p.weight && <span className="pm-wt">{p.weight}</span>}
                        {!isMerchant && <span className="pm-mrch">{merchants.find((m) => m.id === p.merchantId)?.name || "—"}</span>}
                      </div>
                      <div className="pm-price"><b>{fmt(p.priceIQD)} {CUR}</b>{p.mrpIQD > p.priceIQD && <s>{fmt(p.mrpIQD)}</s>}</div>
                    </div>
                    <div className="pm-actions">
                      {p.qty != null ? (
                        <span className={"pt-qty" + (p.qty === 0 ? " out" : p.qty <= (p.lowAt || 0) ? " low" : "")}>{p.qty === 0 ? "نفد" : p.qty <= (p.lowAt || 0) ? `${p.qty} ⚠️` : p.qty}</span>
                      ) : <Switch on={p.stock !== false} onToggle={() => updateProduct(p.id, { stock: !(p.stock !== false) })} />}
                      <div className="pm-btns">
                        <button className="pt-btn ghost sm" onClick={() => openEdit(p)}><Pencil size={13} /></button>
                        <button className="pt-btn warn sm" onClick={() => confirm(`حذف «${p.name}»؟`) && removeProduct(p.id)}><Trash2 size={13} /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {modal && (
        <div className="pt-dim" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className="pt-modal pm-modal">
            <div className="pm-modal-head">
              <h3>{modal.mode === "add" ? "✨ إضافة منتج" : "تعديل المنتج"}</h3>
              <button className="pm-modal-x" onClick={closeModal}>✕</button>
            </div>
            <div className="pm-modal-body">

            {/* صور متعددة */}
            <div className="pt-field"><label>صور المنتج (يمكن إضافة أكثر من صورة)</label>
              <div className="pt-imgs">
                {(modal.data.images || []).map((url, i) => (
                  <div key={i} className="pt-img-chip">
                    {url ? <img src={url} alt="" onError={(e) => (e.target.style.opacity = 0.2)} /> : <span className="ph">🖼️</span>}
                    <button className="rm" onClick={() => upd({ images: modal.data.images.filter((_, j) => j !== i) })}>✕</button>
                  </div>
                ))}
                <button className="pt-img-add" onClick={() => addImage(upd, modal.data, setImgBusy)} disabled={imgBusy}>{imgBusy ? "⏳" : "📷"}<small>{imgBusy ? "يعالج…" : "ارفع صورة"}</small></button>
              </div>
              <div className="pt-imgbtns">
                <button className="ai-chip" style={{ background: "#0C831F" }} onClick={analyzeFromImage} disabled={aiBusy==="analyze"}>{aiBusy==="analyze" ? "⏳ يقرأ الصورة…" : "📷 استخرج التفاصيل من الصورة"}</button>
                <button className="ai-chip" style={{ background: "#2A6ED9" }} onClick={normalizeAll} disabled={normBusy}>{normBusy ? "⏳ يوحّد…" : "◻️ وحّد الصور (خلفية بيضاء)"}</button>
                <button className="ai-chip" style={{ background: "#7c3aed" }} onClick={genRealImage} disabled={aiBusy==="realimg"}>{aiBusy==="realimg" ? "⏳ يولّد…" : "🤖 ولّد صورة بالذكاء"}</button>
                <button className="ai-chip" style={{ background: "#5b6470" }} onClick={() => setBgSuggest(bgSuggest === "palette" ? null : "palette")}>🎨 لون خلفية البطاقة</button>
              </div>
              {bgSuggest === "palette" && (
                <div className="pt-bgpalette">
                  {PRODUCT_BGS.map((b) => (
                    <button key={b.bg} className={"bgp" + (modal.data.bg === b.bg ? " on" : "")} title={b.name}
                      style={{ background: b.bg }} onClick={() => { upd({ bg: b.bg }); }}>
                      {modal.data.bg === b.bg && "✓"}
                    </button>
                  ))}
                </div>
              )}
              <div className="pt-tip" style={{ marginTop: 6 }}>📷 اضغط <b>«ارفع صورة»</b> → تفتح الكاميرا أو المعرض → تُعالَج تلقائياً (مربّعة + خلفية متناسقة + ضغط) وتصبح جاهزة كبلينكيت. ثم «استخرج التفاصيل» ليملأ الذكاء الاسم والوصف.</div>

              <div className="pt-tip">💡 المنتجات بأكثر من صورة تُباع <b>أضعافاً</b>. لا صورة حقيقية؟ ولّد صورة متناسقة بألوان القسم بنقرة — تبدو نظيفة كبلينكيت.</div>
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
                <select className="pt-in" style={{ width: "100%" }} value={modal.data.cat || CATS[0]} onChange={(e) => { if (e.target.value === "__new") { const nc = prompt("اسم القسم الجديد:"); if (nc) upd({ cat: nc, autoPlace: false }); } else upd({ cat: e.target.value, autoPlace: false }); }}>
                  {allCats.map((c) => <option key={c} value={c}>{c}{!CATS.includes(c) ? " 🆕" : ""}</option>)}
                  <option value="__new">➕ قسم جديد…</option>
                </select></div>
              <div className="pt-field"><label>التفرّع</label>
                <input className="pt-in" list="bk-subs" placeholder="نودلز ومعكرونة" value={modal.data.sub || ""} onChange={(e) => upd({ sub: e.target.value, autoPlace: false })} />
                <datalist id="bk-subs">{subOptions.map((sc) => <option key={sc} value={sc} />)}</datalist></div>
            <div className="pt-field"><label>الماركة (اختياري — تظهر في الفلاتر)</label>
              <select className="pt-in" value={modal.data.brand || ""} onChange={(e) => upd({ brand: e.target.value })}>
                <option value="">— بلا ماركة —</option>
                {brands.map((b) => <option key={b.id} value={b.name}>{b.e} {b.name}</option>)}
              </select>
            </div>
            </div>
            <label className="pt-check sm" onClick={() => upd({ autoPlace: !modal.data.autoPlace })}>
              <span className={"pt-box" + (modal.data.autoPlace ? " on" : "")}>{modal.data.autoPlace ? "✓" : ""}</span>
              🧠 تصنيف ذكي تلقائي — يحلّل الاسم ويضع المنتج في أنسب قسم عند الحفظ (يتوقّف تلقائياً إن غيّرت القسم يدوياً)
            </label>

            <div className="pt-row2">
              <div className="pt-field"><label>الوزن/الحجم</label>
                <input className="pt-in" value={modal.data.weight} onChange={(e) => upd({ weight: e.target.value })} placeholder="1 كغ / 500 مل" /></div>
              <div className="pt-field"><label>السعر ({CUR}) <button className="ai-chip" onClick={aiPrice}>✨ اقترح</button></label>
                <input className="pt-in" type="number" step="50" value={modal.data.priceIQD} onChange={(e) => upd({ priceIQD: e.target.value })} /></div>
            </div>
            <div className="pt-field"><label>السعر قبل الخصم (اختياري)</label>
              <input className="pt-in" type="number" step="50" value={modal.data.mrpIQD} onChange={(e) => upd({ mrpIQD: e.target.value })} /></div>
            <div className="pt-row2">
              <div className="pt-field"><label>الكمية المتوفّرة في المخزون</label>
                <input className="pt-in" type="number" min="0" value={modal.data.qty ?? 50} onChange={(e) => upd({ qty: e.target.value })} /></div>
              <div className="pt-field"><label>تنبيه عند اقتراب النفاد (كمية)</label>
                <input className="pt-in" type="number" min="0" value={modal.data.lowAt ?? 10} onChange={(e) => upd({ lowAt: e.target.value })} /></div>
            </div>
            <div className="pt-tip">📦 عند بيع المنتج تنقص الكمية تلقائياً. عند وصولها للحد ينبّهك النظام، وعند الصفر يختفي المنتج من المتجر.</div>

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
            </div>
            <div className="pm-modal-foot">
              <button className="pt-btn ghost" onClick={closeModal}>إلغاء</button>
              <button className="pt-btn" style={{ flex: 1 }} onClick={save}>💾 {modal.mode === "add" ? "إضافة المنتج" : "حفظ التعديلات"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ---------------- التجار ---------------- */

export default ProductManager;
