import React from "react";
import { getCurrentLocation, reverseGeocode } from "../utils/geo.js";
import { useState, useRef, useEffect } from "react";
import { DEALS_ROWS } from "../data/rowSections.js";
import { classify, suggestPrice, suggestBadge, generateDesc, findSimilar } from "../utils/smartProduct.js";
import { uploadImage, getSupabaseCfg, setSupabaseCfg, hasBakedConfig, diagnoseSupabase } from "../utils/supabase.js";
import { aiCall } from "../utils/aiClient.js";
import ProductManager from "../components/ProductManager.jsx";
import { GROCERY, SNACKS, BEAUTY, HOUSEHOLD, STORES_SPOTLIGHT, PICKS_LIFESTYLE, ELECTRONICS_TILES, DECOR_TILES, KIDS_TILES, IMPORTED_TILES } from "../data/collections.js";
import { processImage, dataUrlToFile, PRODUCT_BGS } from "../utils/imageProcessor.js";
import { addBlock, updateBlock, removeBlock, moveBlock, addCustomTab, removeCustomTab, undoLayout, redoLayout, resetTabLayout, histState , setStoreLocation , addCoupon, updateCoupon, removeCoupon , addBrand, updateBrand, removeBrand, setFilterTemplate, removeFilterTemplate, setTileOverride, resetTileOverride, toggleSectionHidden, addConcern, updateConcern, removeConcern, setSubOrder, toggleSubHidden, renameSub } from "../store/appStore.js";
import {
  LayoutDashboard, PackageSearch, ShoppingCart, Store, Bike, Settings2,
  Wallet, Clock3, Plus, Trash2, Pencil, RotateCcw, Palette, LayoutTemplate, KeyRound,
  Coins, Phone, MessageCircle, MapPin, CheckCircle2, ChevronDown, Tag, SlidersHorizontal, Compass, LayoutGrid, Sparkles, PanelRight } from "lucide-react";
import {
  useStore, updateProduct, addProduct, removeProduct, updateSettings,
  setOrderStatus, assignCourier, autoAssignCourier, findFreeCourier, toggleCourier, addCourier, addMerchant,
  updateMerchant, updateAppearance, updateTexts,
  addBanner, updateBanner, removeBanner, updateTrio,
  addBigStore, updateBigStore, removeBigStore,
  updateCourier, removeCourier, removeMerchant,
  settleMerchant, confirmSettlement,
  resetStore, ORDER_STATUSES,
} from "../store/appStore.js";
import { financeSummary, merchantDues, courierCash } from "../store/finance.js";
import { fmt, CUR } from "../utils/currency.js";
import { Shell, Gate, StatusBadge, Switch, Stat, timeAgo, usePortalPrefs, useOrderAlert } from "../portal/PortalKit.jsx";

const TABS = [
  { id: "guide", l: "الدليل — ابدأ هنا", Icon: Compass },
  { group: "📦 التشغيل اليومي" },
  { id: "dash", l: "اللوحة", Icon: LayoutDashboard },
  { id: "orders", l: "الطلبات", Icon: ShoppingCart },
  { id: "finance", l: "المالية", Icon: Coins },
  { group: "🛍️ الكتالوج" },
  { id: "products", l: "المنتجات", Icon: PackageSearch },
  { id: "filters", l: "الفلاتر والماركات", Icon: SlidersHorizontal },
  { id: "coupons", l: "أكواد الخصم", Icon: Tag },
  { group: "🎨 واجهة المتجر" },
  { id: "tiles", l: "بلاطات الرئيسية", Icon: LayoutGrid },
  { id: "concerns", l: "تسوّق حسب الحاجة", Icon: Sparkles },
  { id: "siderail", l: "القائمة الجانبية", Icon: PanelRight },
  { id: "content", l: "ترتيب الأقسام", Icon: LayoutTemplate },
  { id: "look", l: "الألوان والمظهر", Icon: Palette },
  { group: "👥 الفريق" },
  { id: "merchants", l: "التجار", Icon: Store },
  { id: "couriers", l: "المندوبون", Icon: Bike },
  { group: "⚙️" },
  { id: "settings", l: "الإعدادات", Icon: Settings2 },
];

export default function AdminApp() {
  const pin = useStore((st) => st.settings.adminPin || "1234");
  return (
    <Gate title="لوحة الإدارة" sub="تحكم كامل بالمتجر والطلبات والفريق" pin={pin} storageKey="bk-auth-admin" demo={pin}>
      {(logout) => <Admin onLogout={logout} />}
    </Gate>
  );
}

function Admin({ onLogout }) {
  const [tab, setTab] = useState("guide");
  const prefs = usePortalPrefs("admin");
  const ordersCount = useStore((st) => st.orders.length);
  useOrderAlert(ordersCount, { sound: prefs.sound, notif: prefs.notif, title: "🛒 طلب جديد", body: "وصل طلب جديد — راجع إدارة الطلبات" }); // 🔔 نغمة + إشعار
  return (
    <Shell role="الإدارة" tabs={TABS} tab={tab} setTab={setTab} onLogout={onLogout} prefs={prefs}>
      {tab === "guide" && <Guide go={setTab} />}
      {tab === "tiles" && <TilesEditor />}
      {tab === "concerns" && <ConcernsEditor />}
      {tab === "siderail" && <SideRailEditor />}
      {tab === "dash" && <Dash />}
      {tab === "orders" && <Orders />}
      {tab === "products" && <ProductManager scope="admin" />}
      {tab === "finance" && <Finance />}
      {tab === "content" && <Content />}
      {tab === "look" && <Look />}
      {tab === "merchants" && <Merchants />}
      {tab === "couriers" && <Couriers />}
      {tab === "coupons" && <Coupons />}
      {tab === "filters" && <FiltersBrands />}
      {tab === "settings" && <SettingsPage />}
    </Shell>
  );
}

/* ---------------- اللوحة ---------------- */
function Dash() {
  const orders = useStore((s) => s.orders);
  const products = useStore((s) => s.products);
  const dayMs = 24 * 60 * 60 * 1000;
  const today = orders.filter((o) => Date.now() - new Date(o.time).getTime() < dayMs);
  const sales = (list) => list.filter((o) => o.status !== "ملغي").reduce((a, o) => a + o.total, 0);
  const active = orders.filter((o) => !["تم التوصيل", "ملغي"].includes(o.status)).length;
  const oos = products.filter((p) => p.stock === false).length;

  // المناطق الأكثر طلباً — من أول مقطع في عنوان الزبون
  const areas = {};
  orders.forEach((o) => {
    const a = (o.customer?.address || "").split("،")[0].trim() || "غير محدد";
    areas[a] = (areas[a] || 0) + 1;
  });
  const topAreas = Object.entries(areas).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxA = topAreas[0]?.[1] || 1;

  const days = ["سبت", "أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "اليوم"];
  const bars = [42, 65, 51, 78, 60, 88, Math.max(20, Math.min(100, orders.length * 12))];
  return (
    <>
      <div className="pt-h1">لوحة المتابعة<small>مزامنة حية — أي تغيير من الزبون أو التاجر أو المندوب يظهر فوراً</small></div>
      <div className="pt-stats" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))" }}>
        <Stat Icon={ShoppingCart} l="طلبات اليوم" v={today.length} />
        <Stat Icon={ShoppingCart} l="إجمالي الطلبات" v={orders.length} />
        <Stat Icon={Wallet} l="مبيعات اليوم" v={`${fmt(sales(today))} ${CUR}`} />
        <Stat Icon={Wallet} l="إجمالي المبيعات" v={`${fmt(sales(orders))} ${CUR}`} />
        <Stat Icon={Clock3} l="قيد التنفيذ" v={active} d={oos ? `${oos} منتج نافد` : "المخزون سليم"} />
      </div>
      <div className="pt-row2" style={{ alignItems: "start" }}>
        <div className="pt-card">
          <div className="cap">الطلبات خلال الأسبوع</div>
          <div className="pt-chart" style={{ paddingBottom: 30 }}>
            {bars.map((h, i) => <div key={i} className="b" style={{ height: `${h}%` }}><span>{days[i]}</span></div>)}
          </div>
        </div>
        <div className="pt-card">
          <div className="cap">📍 المناطق الأكثر طلباً</div>
          <div style={{ padding: 14, display: "grid", gap: 10 }}>
            {topAreas.map(([name, n]) => (
              <div key={name} style={{ display: "grid", gridTemplateColumns: "90px 1fr 26px", gap: 8, alignItems: "center", fontSize: 12, fontWeight: 700 }}>
                <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</span>
                <div style={{ height: 8, borderRadius: 6, background: "var(--p-line2)" }}>
                  <div style={{ width: `${(n / maxA) * 100}%`, height: "100%", borderRadius: 6, background: "linear-gradient(90deg,#F8CB46,#F0B500)" }} />
                </div>
                <b>{n}</b>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="pt-card">
        <div className="cap">أحدث الطلبات</div>
        <div className="mw-list">
          {orders.slice(0, 6).map((o) => (
            <div className="mw-row" key={o.id}>
              <div className="mw-l">
                <div className="mw-id">#{o.id} <span className="mw-time">{timeAgo(o.time)}</span></div>
                <div className="mw-sub">{o.customer.name}</div>
              </div>
              <div className="mw-r">
                <StatusBadge s={o.status} />
                <div className="mw-amt">{fmt(o.total)} {CUR}</div>
              </div>
            </div>
          ))}
          {orders.length === 0 && <div className="pt-empty">لا طلبات بعد</div>}
        </div>
      </div>
    </>
  );
}

/* ---------------- الطلبات ---------------- */
function Orders() {
  const orders = useStore((s) => s.orders);
  const couriers = useStore((s) => s.couriers);
  const merchants = useStore((s) => s.merchants);
  const [filter, setFilter] = useState("الكل");
  const list = filter === "الكل" ? orders : orders.filter((o) => o.status === filter);
  const mName = (id) => merchants.find((m) => m.id === id)?.name || "—";
  const [open, setOpen] = useState(null);
  return (
    <>
      <div className="pt-h1">إدارة الطلبات<small>اضغط على أي طلب لعرض التفاصيل وتغيير الحالة وتعيين المندوب</small></div>
      <div className="pt-card">
        <div className="cap">
          كل الطلبات ({list.length})<span className="sp" />
          <select className="pt-in" style={{ width: 150 }} value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option>الكل</option>
            {ORDER_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="ord-list">
          {list.map((o) => {
            const isOpen = open === o.id;
            const ph = (o.customer.phone || "").replace(/\s/g, "");
            const wa = "964" + ph.replace(/^0/, "");
            return (
              <div key={o.id} className={"ord-card" + (isOpen ? " open" : "")}>
                <div className="ord-head" onClick={() => setOpen(isOpen ? null : o.id)}>
                  <div className="ord-l">
                    <div className="ord-id">#{o.id} <span className="ord-time">{timeAgo(o.time)}</span></div>
                    <div className="ord-cust">{o.customer.name}</div>
                    <div className="ord-items-mini">{o.items.slice(0, 5).map((i, x) => <span key={x}>{i.e}</span>)}{o.items.length > 5 ? "…" : ""}</div>
                  </div>
                  <div className="ord-r">
                    <StatusBadge s={o.status} />
                    <div className="ord-total">{fmt(o.total)} {CUR}</div>
                    <ChevronDown size={16} className="ord-chev" style={{ transform: isOpen ? "rotate(180deg)" : "none" }} />
                  </div>
                </div>
                {isOpen && (
                  <div className="ord-body">
                    {/* تواصل */}
                    <div className="ord-contact">
                      <span className="ord-phone">{o.customer.phone}</span>
                      <a className="ord-cbtn call" href={`tel:${ph}`}><Phone size={15} /> اتصال</a>
                      <a className="ord-cbtn wa" target="_blank" rel="noreferrer" href={`https://wa.me/${wa}?text=${encodeURIComponent(`مرحباً ${o.customer.name}، بخصوص طلبك #${o.id}`)}`}><MessageCircle size={15} /> واتساب</a>
                      <a className="ord-cbtn map" target="_blank" rel="noreferrer" href={o.lat ? `https://maps.google.com/?q=${o.lat},${o.lng}` : `https://maps.google.com/?q=${encodeURIComponent(o.customer.address || "")}`}><MapPin size={15} /> الموقع</a>
                    </div>
                    <div className="ord-addr">📍 {o.customer.address}</div>
                    {/* العناصر */}
                    <div className="ord-sec-t">العناصر ({o.items.length})</div>
                    <div className="ord-items-full">
                      {o.items.map((i, x) => <div key={x} className="ord-item"><span>{i.e} {i.name}</span><b>×{i.qty}</b></div>)}
                    </div>
                    {/* المتجر والجاهزية */}
                    <div className="ord-meta">
                      <span>🏪 {(o.merchantCount || 1) > 1 ? `${o.merchantCount} متاجر` : mName(o.merchantId)}</span>
                      <span>{o.payMethod || "نقداً"}</span>
                      {o.tip > 0 && <span style={{ color: "#0C831F", fontWeight: 800 }}>بقشيش +{fmt(o.tip)}</span>}
                    </div>
                    {Object.keys(o.readiness || {}).length > 0 && (
                      <div className="ord-ready">
                        {Object.entries(o.readiness).map(([mid, ok]) => (
                          <span key={mid} className={"pt-mini-chip" + (ok ? " ok" : "")}>{ok ? "✓" : "⌛"} {mName(mid).split(" ")[0]}</span>
                        ))}
                      </div>
                    )}
                    {o.note && <div className="ord-note">📝 {o.note}</div>}
                    {o.rating && <div className="ord-rating">⭐ تقييم الزبون: الطلب {o.rating.orderStars}/5{o.rating.courierStars ? ` · المندوب ${o.rating.courierStars}/5` : ""}{o.rating.comment ? ` — «${o.rating.comment}»` : ""}</div>}
                    {/* التحكم */}
                    <div className="ord-controls">
                      <label>الحالة
                        <select className="pt-in" value={o.status} onChange={(e) => setOrderStatus(o.id, e.target.value)}>
                          {ORDER_STATUSES.map((st) => <option key={st}>{st}</option>)}
                        </select>
                      </label>
                      <label>المندوب
                        <select className="pt-in" value={o.courierId || ""} onChange={(e) => assignCourier(o.id, e.target.value || null)}>
                          <option value="">بدون مندوب</option>
                          {couriers.map((c) => {
                            const load = orders.filter((x) => x.courierId === c.id && ["في الطريق", "وصل المندوب"].includes(x.status)).length;
                            return <option key={c.id} value={c.id}>{c.name}{c.active === false ? " (غير متاح)" : load ? ` (${load} طلب)` : " (متاح)"}</option>;
                          })}
                        </select>
                      </label>
                    </div>
                    {!o.courierId && ["جاهز للتوصيل", "قيد التجهيز"].includes(o.status) && (
                      <button className="ord-autobtn" onClick={() => { const f = autoAssignCourier(o.id); alert(f ? `🛵 عُيّن تلقائياً: ${f.name}` : "لا يوجد مندوب متاح الآن"); }}>
                        ⚡ تعيين مندوب تلقائياً (أقل حملاً)
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {list.length === 0 && <div className="pt-empty">لا توجد طلبات بهذه الحالة</div>}
        </div>
      </div>
    </>
  );
}

/* ---------------- المنتجات ---------------- */
const CATS = ["مشروبات وعصائر","زيوت وسكر وبهارات","طعام سريع ومجمّد","حلويات وشوكولاتة","آيس كريم ومثلجات","خضار وفواكه","طحين وأرز وبقوليات","ألبان وخبز وبيض","منظفات وعناية منزلية","جمال وعناية","إلكترونيات","منزل وديكور","أطفال وألعاب","بقالة أساسية","تسالي وحلويات","مشروبات"];
function Merchants() {
  const merchants = useStore((s) => s.merchants);
  const products = useStore((s) => s.products);
  const orders = useStore((s) => s.orders);
  const [f, setF] = useState({ name: "", cat: "", phone: "", password: "", commission: 10 });
  const submit = () => {
    if (!f.name) return;
    addMerchant(f.name, f.cat, f.phone, f.password || "0000");
    setF({ name: "", cat: "", phone: "", password: "", commission: 10 });
  };
  return (
    <>
      <div className="pt-h1">التجار<small>المتاجر الشريكة ومنتجاتها</small></div>
      <div className="pt-card">
        <div className="cap">إضافة تاجر</div>
        <div style={{ padding: 14 }} className="pt-row2">
          <input className="pt-in" placeholder="اسم المتجر" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <input className="pt-in" placeholder="التخصص" value={f.cat} onChange={(e) => setF({ ...f, cat: e.target.value })} />
          <input className="pt-in" placeholder="الهاتف" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
          <input className="pt-in" dir="ltr" placeholder="كلمة مرور البوابة" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
          <input className="pt-in" type="number" placeholder="العمولة %" value={f.commission} onChange={(e) => setF({ ...f, commission: e.target.value })} />
          <button className="pt-btn" onClick={submit}>إضافة</button>
        </div>
      </div>
      <div className="pt-card">
        <div className="cap">قائمة التجار ({merchants.length})</div>
        <div className="ad-list">
          {merchants.map((m) => (
            <div className="ad-card" key={m.id}>
              <div className="ad-head">
                <div className="ad-title"><b>{m.name}</b><span className="ad-sub">{m.cat}</span></div>
                <Switch on={m.open !== false} onToggle={() => updateMerchant(m.id, { open: !(m.open !== false) })} />
              </div>
              <div className="ad-stats">
                <span>📦 {products.filter((p) => p.merchantId === m.id).length} منتج</span>
                <span>🛒 {orders.filter((o) => o.merchantId === m.id || (o.readiness && o.readiness[m.id] !== undefined)).length} طلب</span>
                <span style={{ direction: "ltr" }}>📞 {m.phone}</span>
              </div>
              <div className="ad-fields">
                <label>كلمة المرور<input className="pt-in" dir="ltr" value={m.password || ""} onChange={(e) => updateMerchant(m.id, { password: e.target.value })} /></label>
                <label>العمولة %<input className="pt-in" type="number" value={m.commission ?? 10} onChange={(e) => updateMerchant(m.id, { commission: +e.target.value || 0 })} /></label>
              </div>
              <button className="ad-del" onClick={() => confirm(`حذف «${m.name}»؟`) && removeMerchant(m.id)}><Trash2 size={13} /> حذف التاجر</button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/* ---------------- المندوبون ---------------- */
function Couriers() {
  const couriers = useStore((s) => s.couriers);
  const orders = useStore((s) => s.orders);
  const [f, setF] = useState({ name: "", phone: "", password: "" });
  const delivered = (id) => orders.filter((o) => o.courierId === id && o.status === "تم التوصيل").length;
  return (
    <>
      <div className="pt-h1">المندوبون<small>فريق التوصيل وحالته</small></div>
      <div className="pt-card">
        <div className="cap">إضافة مندوب</div>
        <div style={{ padding: 14, display: "flex", gap: 10 }}>
          <input className="pt-in" placeholder="الاسم" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <input className="pt-in" placeholder="الهاتف" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
          <input className="pt-in" dir="ltr" placeholder="كلمة مرور البوابة" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
          <button className="pt-btn" onClick={() => { if (f.name) { addCourier(f.name, f.phone, f.password || "0000"); setF({ name: "", phone: "", password: "" }); } }}>إضافة</button>
        </div>
      </div>
      <div className="pt-card">
        <div className="cap">الفريق ({couriers.length})</div>
        <div className="ad-list">
          {couriers.map((c) => (
            <div className="ad-card" key={c.id}>
              <div className="ad-head">
                <div className="ad-title"><b>{c.name}</b><span className="ad-sub" style={{ direction: "ltr" }}>{c.phone}</span></div>
                <Switch on={c.active} onToggle={() => toggleCourier(c.id)} />
              </div>
              <div className="ad-stats">
                <span>🛵 {delivered(c.id)} توصيلة مكتملة</span>
                <span className={c.active ? "ad-on" : "ad-off"}>{c.active ? "🟢 نشط" : "🔴 غير نشط"}</span>
              </div>
              <div className="ad-fields">
                <label>كلمة المرور<input className="pt-in" dir="ltr" value={c.password || ""} onChange={(e) => updateCourier(c.id, { password: e.target.value })} /></label>
              </div>
              <button className="ad-del" onClick={() => confirm(`حذف «${c.name}»؟`) && removeCourier(c.id)}><Trash2 size={13} /> حذف المندوب</button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/* ---------------- 🧭 الدليل — ابدأ هنا ---------------- */
const JOURNEY = [
  { e: "1️⃣", t: "التاجر يضيف المنتج", d: "من لوحة التاجر ← منتجاتي ← إضافة. أهم حقل: «القسم» — هو الذي يقرر أين يظهر المنتج في كل مكان." },
  { e: "2️⃣", t: "يظهر تلقائياً في 5 أماكن", d: "قائمة قسمه (عند فتح أي بلاطة) · صف الرئيسية المطابق (تلقائياً!) · التبويب العلوي · البحث · الفلاتر و«تسوّق بالماركة»." },
  { e: "3️⃣", t: "الزبون يطلب", d: "يضيف للسلة ← يدفع (خصم كود/نقاط إن وجدت) ← يُنشأ الطلب." },
  { e: "4️⃣", t: "التاجر يجهّز ← المندوب يوصّل", d: "الطلب يظهر فوراً للتاجر (يقبل ويجهّز) ثم يُسند لمندوب. الزبون يتتبّع مباشرة." },
  { e: "5️⃣", t: "التسليم والمكافآت", d: "تم التوصيل ← الزبون يقيّم ← يكسب نقاطاً ← الأرباح تظهر في «المالية»." },
];
const CONTROL_MAP = [
  { q: "أغيّر صورة/اسم بلاطة أو أخفيها؟", a: "🎨 بلاطات الرئيسية", tab: "tiles" },
  { q: "أخفي قسماً كاملاً (وجبات خفيفة، متاجر مميّزة…)؟", a: "🎨 بلاطات الرئيسية ← زر إخفاء القسم", tab: "tiles" },
  { q: "أغيّر ترتيب أقسام الرئيسية أو أضيف صفاً؟", a: "🎨 ترتيب الأقسام (أو زر «تخصيص الرئيسية» أعلى المتجر)", tab: "content" },
  { q: "أضيف/أعدّل منتجاً أو صورته أو سعره؟", a: "🛍️ المنتجات", tab: "products" },
  { q: "أتحكّم بالقائمة الجانبية داخل صفحة القسم؟", a: "🛍️ المنتجات ← حقل «التفرّع» (تلقائية)", tab: "products" },
  { q: "أتحكم بفلاتر الزبون والماركات؟", a: "🛍️ الفلاتر والماركات", tab: "filters" },
  { q: "أنشئ كود خصم؟", a: "🛍️ أكواد الخصم", tab: "coupons" },
  { q: "أغيّر الألوان/الشعار/البانرات؟", a: "🎨 الألوان والمظهر", tab: "look" },
  { q: "رسوم التوصيل/التوصيل المجاني/عروض الفلاش؟", a: "⚙️ الإعدادات", tab: "settings" },
  { q: "أتابع الطلبات الحية أو الأرباح؟", a: "📦 الطلبات / المالية", tab: "orders" },
];
function Guide({ go }) {
  return (
    <>
      <div className="pt-h1">🧭 دليلك السريع<small>كل ما تحتاجه لفهم متجرك والتحكم به — بلا تشتّت</small></div>

      <div className="pt-card">
        <div className="cap">🚀 يومك في 3 خطوات فقط</div>
        <div className="gd-daily">
          <div className="gd-step" onClick={() => go("orders")}><span>📦</span><b>الطلبات</b><small>تابع الجديد وأسنِد المندوبين</small></div>
          <div className="gd-step" onClick={() => go("products")}><span>🏷️</span><b>المنتجات</b><small>أضف أو عدّل الأسعار والمخزون</small></div>
          <div className="gd-step" onClick={() => go("finance")}><span>💰</span><b>المالية</b><small>راجع الأرباح والتسويات</small></div>
        </div>
        <div className="pt-note" style={{ margin: "0 14px 14px" }}>💡 كل ما عدا ذلك «إعداد لمرة واحدة» — لا تحتاجه يومياً.</div>
      </div>

      <div className="pt-card">
        <div className="cap">🛤️ رحلة المنتج من الإضافة حتى التسليم</div>
        <div className="gd-journey">
          {JOURNEY.map((j, i) => (
            <div className="gd-jstep" key={i}>
              <span className="gd-je">{j.e}</span>
              <div><b>{j.t}</b><small>{j.d}</small></div>
            </div>
          ))}
        </div>
        <div className="pt-note" style={{ margin: "0 14px 14px" }}>⭐ الخلاصة: <b>حقل «القسم» في المنتج هو المايسترو</b> — اضبطه صح ويتوزّع المنتج تلقائياً في كل مكان. لا تحتاج وضعه يدوياً في أي بلاطة.</div>
      </div>

      <div className="pt-card">
        <div className="cap">🗺️ أريد أن… ← أذهب إلى…</div>
        <div className="gd-map">
          {CONTROL_MAP.map((m, i) => (
            <div className="gd-row" key={i} onClick={() => go(m.tab)}>
              <span className="gd-q">{m.q}</span>
              <span className="gd-a">{m.a} ←</span>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-card">
        <div className="cap">🧩 ما هي أقسام الرئيسية الستة؟</div>
        <div style={{ padding: "4px 14px 14px", fontSize: 13, lineHeight: 2, color: "var(--p-mut2)" }}>
          <b>وجبات خفيفة ومشروبات · الجمال والعناية · مستلزمات المنزل</b>: شبكات بلاطات — كل بلاطة تفتح قسم منتجات (تتحكم بها من «بلاطات الرئيسية»).<br />
          <b>متاجر مميّزة · مختارات لأسلوب حياتك</b>: بلاطات تسويقية حرّة — عدّل صورها وأسماءها أو أخفِ ما لا يناسب العراق.<br />
          <b>منتجات رائجة قربك</b>: صف منتجات <b>يتعبأ تلقائياً</b> من الكتالوج — لا يحتاج تدخلاً.
        </div>
      </div>

      <div className="pt-card">
        <div className="cap">📑 القائمة الجانبية داخل صفحة القسم (تلقائية)</div>
        <div style={{ padding: "4px 14px 14px", fontSize: 13, lineHeight: 1.9, color: "var(--p-mut2)" }}>
          عند فتح الزبون لأي قسم (مثل «مشروبات وعصائر»)، يظهر <b>شريط جانبي</b> فيه أنواع فرعية (غازية، عصائر، طاقة…). هذا الشريط <b>يُبنى تلقائياً</b> من حقل <b>«التفرّع»</b> في منتجاتك — لا تديره يدوياً.
          <div style={{ marginTop: 10, padding: "10px 12px", background: "var(--p-hover,#f6f6f6)", borderRadius: 10 }}>
            <b>🔑 القاعدة:</b> التفرّع الذي تكتبه في المنتج = أيقونة في الشريط الجانبي.<br />
            <b>مثال:</b> 3 منتجات بتفرّع «عصائر» → يظهر «عصائر» مرة واحدة في الشريط، والضغط عليه يعرض تلك المنتجات الثلاثة.
          </div>
          <div style={{ marginTop: 8 }}>
            💡 <b>لتنظيم الشريط:</b> وحّد أسماء التفرّعات (اكتب «عصائر» لكل العصائر، لا «عصير» و«عصائر» و«جوس»)، واترك التفرّع فارغاً إن لم تحتجه (تُجمع تحت «أخرى»).
          </div>
        </div>
      </div>
    </>
  );
}

/* ---------------- 🧩 بلاطات الرئيسية ---------------- */
const TILE_SECTIONS = [
  ["البقالة والمطبخ", GROCERY], ["وجبات خفيفة ومشروبات", SNACKS],
  ["تسوّق حسب الفئة", BEAUTY], ["مستلزمات المنزل", HOUSEHOLD],
  ["متاجر مميّزة", STORES_SPOTLIGHT], ["مختارات لأسلوب حياتك", PICKS_LIFESTYLE],
  ["إلكترونيات (بلاطات)", ELECTRONICS_TILES], ["ديكور (بلاطات)", DECOR_TILES],
  ["أطفال (بلاطات)", KIDS_TILES], ["مستورد (بلاطات)", IMPORTED_TILES],
];
function TilesEditor() {
  const homeTiles = useStore((s) => s.homeTiles) || { hiddenSections: [], overrides: {} };
  const [secIdx, setSecIdx] = useState(0);
  const [sec, items] = TILE_SECTIONS[secIdx];
  const hidden = homeTiles.hiddenSections.includes(sec);
  const ov = (t) => homeTiles.overrides[sec + "|" + t] || {};
  const uploadTileImg = (section, tile) => {
    const inp = document.createElement("input");
    inp.type = "file"; inp.accept = "image/*";
    inp.onchange = async () => {
      const f = inp.files[0]; if (!f) return;
      try {
        const { dataUrl } = await processImage(f, { size: 400, bg: "transparent", pad: 0.06, format: "webp", quality: 0.85 });
        let url = dataUrl;
        const cfg = getSupabaseCfg();
        if (cfg && cfg.url && cfg.anonKey) {
          try { const up = await uploadImage(dataUrlToFile(dataUrl, "tile-" + Date.now() + ".webp")); if (up) url = up; }
          catch { /* يبقى data URL */ }
        }
        setTileOverride(section, tile, { img: url });
      } catch (e) { alert("تعذّرت المعالجة: " + (e.message || "")); }
    };
    inp.click();
  };

  return (
    <>
      <div className="pt-h1">🧩 بلاطات الرئيسية<small>غيّر الصور والأسماء، أخفِ بلاطة أو قسماً كاملاً — يظهر فوراً للزبائن</small></div>

      <div className="pt-card">
        <div style={{ padding: 14 }}>
          <div className="pt-field"><label>اختر القسم</label>
            <select className="pt-in" value={secIdx} onChange={(e) => setSecIdx(+e.target.value)}>
              {TILE_SECTIONS.map(([t, arr], i) => <option key={t} value={i}>{t} ({arr.length} بلاطة){homeTiles.hiddenSections.includes(t) ? " — 🙈 مخفي" : ""}</option>)}
            </select>
          </div>
          <button className={"pt-btn" + (hidden ? "" : " warn")} style={{ width: "100%" }} onClick={() => toggleSectionHidden(sec)}>
            {hidden ? "👁️ إظهار هذا القسم في الرئيسية" : "🙈 إخفاء هذا القسم كاملاً من الرئيسية"}
          </button>
        </div>
      </div>

      <div className="pt-card">
        <div className="cap">بلاطات «{sec}»</div>
        <div className="tl-list">
          {items.map((it) => {
            const o = ov(it.t);
            const isHid = !!o.hidden;
            const changed = o.name || o.e || o.img || o.bg || o.hidden;
            return (
              <div className={"tl-row" + (isHid ? " off" : "")} key={it.t}>
                <div className="tl-prev" style={{ background: o.bg || it.bg || "#f3f3f3" }}>
                  {(o.img || it.img) ? <img src={o.img || it.img} alt="" onError={(e) => { e.target.style.display = "none"; }} /> : <span>{o.e || it.e}</span>}
                </div>
                <div className="tl-fields">
                  <div className="tl-frow">
                    <input className="pt-in" placeholder={it.t} value={o.name || ""} onChange={(e) => setTileOverride(sec, it.t, { name: e.target.value })} title="الاسم (اتركه فارغاً للأصلي)" />
                    <input className="pt-in tl-emoji" placeholder={it.e || "🛒"} value={o.e || ""} onChange={(e) => setTileOverride(sec, it.t, { e: e.target.value })} title="إيموجي" />
                  </div>
                  <button className="tl-upload" onClick={() => uploadTileImg(sec, it.t)}>📷 {o.img ? "تغيير الصورة" : "رفع صورة للبلاطة"}</button>
                </div>
                <div className="tl-acts">
                  <button className={"tl-eye" + (isHid ? " on" : "")} title={isHid ? "إظهار" : "إخفاء"} onClick={() => setTileOverride(sec, it.t, { hidden: !isHid })}>{isHid ? "🙈" : "👁️"}</button>
                  {changed && <button className="tl-reset" title="استرجاع الأصلي" onClick={() => resetTileOverride(sec, it.t)}>↩️</button>}
                </div>
              </div>
            );
          })}
        </div>
        <div className="pt-note" style={{ margin: "0 14px 14px" }}>💡 كل بلاطة تفتح قسم المنتجات المطابق لاسمها <b>الأصلي</b> تلقائياً — تغيير الاسم المعروض لا يكسر الربط.</div>
      </div>
    </>
  );
}

/* ---------------- ✨ تسوّق حسب الحاجة ---------------- */
const CONCERN_TABS = [["beauty", "الجمال"], ["electronics", "إلكترونيات"], ["decor", "ديكور"], ["kids", "الأطفال"], ["all", "الرئيسية (الكل)"]];
const CONCERN_TAB_CATS = { beauty: ["جمال وعناية"], electronics: ["إلكترونيات"], decor: ["منزل وديكور"], kids: ["أطفال وألعاب"] };
function ConcernsEditor() {
  const concerns = useStore((s) => s.concerns) || [];
  const products = useStore((s) => s.products);
  const [tab, setTab] = useState("beauty");
  const [draft, setDraft] = useState({ title: "", sub: "", e: "✨", keywords: "" });
  const list = concerns.filter((c) => c.tab === tab);

  // نفس منطق المتجر: احصر بأقسام التبويب + طابق بالاسم/النوع (يمنع «كريم»→«آيس كريم»)
  const matchedProducts = (kw) => {
    const scope = CONCERN_TAB_CATS[tab];
    return products.filter((p) => {
      if (scope && !scope.includes(p.cat)) return false;
      return (kw || []).some((w) => (p.name || "").includes(w) || (p.sub || "").includes(w));
    });
  };

  const submit = () => {
    if (!draft.title.trim()) { alert("أدخل عنوان البطاقة"); return; }
    const keywords = draft.keywords.split(/[،,]/).map((x) => x.trim()).filter(Boolean);
    if (keywords.length === 0) { alert("أدخل كلمة مفتاحية واحدة على الأقل (تحدّد أي منتجات تظهر)"); return; }
    addConcern({ tab, title: draft.title.trim(), sub: draft.sub.trim(), e: draft.e || "✨", keywords });
    setDraft({ title: "", sub: "", e: "✨", keywords: "" });
  };
  const uploadImg = (id, field = "img") => {
    const inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*";
    inp.onchange = async () => {
      const f = inp.files[0]; if (!f) return;
      try {
        const { dataUrl } = await processImage(f, { size: 300, bg: "transparent", pad: 0.05, format: "webp", quality: 0.85 });
        let url = dataUrl; const cfg = getSupabaseCfg();
        if (cfg && cfg.url && cfg.anonKey) { try { const up = await uploadImage(dataUrlToFile(dataUrl, "cn-" + Date.now() + ".webp")); if (up) url = up; } catch { /* data url */ } }
        updateConcern(id, { [field]: url });
      } catch (e) { alert("تعذّرت المعالجة: " + (e.message || "")); }
    };
    inp.click();
  };

  return (
    <>
      <div className="pt-h1">✨ تسوّق حسب الحاجة<small>بطاقات تجمع منتجات لهدف معيّن (تساقط الشعر، حب الشباب…) — كبلينكيت</small></div>

      <div className="pt-card">
        <div style={{ padding: 14 }}>
          <div className="pt-field"><label>التبويب الذي تظهر فيه البطاقات</label>
            <div className="cn-tabs">
              {CONCERN_TABS.map(([id, l]) => (
                <span key={id} className={"cn-tab" + (tab === id ? " on" : "")} onClick={() => setTab(id)}>{l}{concerns.filter((c) => c.tab === id).length > 0 && <i>{concerns.filter((c) => c.tab === id).length}</i>}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="pt-card">
        <div className="cap">➕ إضافة بطاقة حاجة</div>
        <div style={{ padding: 14 }}>
          <div className="pt-row2">
            <div className="pt-field"><label>العنوان</label>
              <input className="pt-in" placeholder="مثال: تساقط الشعر" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></div>
            <div className="pt-field"><label>إيموجي</label>
              <input className="pt-in" style={{ textAlign: "center", fontSize: 18 }} value={draft.e} onChange={(e) => setDraft({ ...draft, e: e.target.value })} /></div>
          </div>
          <div className="pt-field"><label>الوصف القصير</label>
            <input className="pt-in" placeholder="مثال: سيرومات وماسكات لتقوية الجذور" value={draft.sub} onChange={(e) => setDraft({ ...draft, sub: e.target.value })} /></div>
          <div className="pt-field"><label>الكلمات المفتاحية (تحدّد المنتجات — افصل بفاصلة)</label>
            <input className="pt-in" placeholder="شعر، سيروم، ماسك، بلسم" value={draft.keywords} onChange={(e) => setDraft({ ...draft, keywords: e.target.value })} /></div>
          <div className="pt-note" style={{ margin: "0 0 10px" }}>💡 أي منتج يحوي اسمه/قسمه/نوعه إحدى هذه الكلمات سيظهر عند فتح البطاقة.</div>
          <button className="pt-btn" style={{ width: "100%" }} onClick={submit}>➕ إضافة البطاقة</button>
        </div>
      </div>

      <div className="pt-card">
        <div className="cap">بطاقات «{CONCERN_TABS.find((t) => t[0] === tab)?.[1]}» ({list.length})</div>
        <div className="cn-list">
          {list.map((c) => (
            <div className="cn-row" key={c.id}>
              <div className="cn-prev" style={{ background: c.bg || "#F6E9EE" }} onClick={() => uploadImg(c.id, "img")} title="اضغط لرفع صورة">
                {c.img ? <img src={c.img} alt="" /> : <span>{c.e}</span>}<em>📷</em>
              </div>
              <div className="cn-fields">
                <input className="pt-in" value={c.title} onChange={(e) => updateConcern(c.id, { title: e.target.value })} placeholder="العنوان" />
                <input className="pt-in" value={c.sub || ""} onChange={(e) => updateConcern(c.id, { sub: e.target.value })} placeholder="الوصف" style={{ fontSize: 12 }} />
                <input className="pt-in" value={(c.keywords || []).join("، ")} onChange={(e) => updateConcern(c.id, { keywords: e.target.value.split(/[،,]/).map((x) => x.trim()).filter(Boolean) })} placeholder="كلمات مفتاحية" style={{ fontSize: 11.5 }} dir="rtl" />
                {(() => { const mp = matchedProducts(c.keywords); return (
                  <div className="cn-preview">
                    <small className={"cn-count" + (mp.length === 0 ? " zero" : "")}>🔗 {mp.length} منتج مرتبط{mp.length === 0 ? " — عدّل الكلمات!" : ""}</small>
                    {mp.length > 0 && <div className="cn-prods">{mp.slice(0, 4).map((p) => <span key={p.id}>{p.e} {p.name}</span>)}{mp.length > 4 && <span className="more">+{mp.length - 4} غيرها</span>}</div>}
                  </div>
                ); })()}
              </div>
              <button className="pt-btn warn sm" onClick={() => confirm(`حذف «${c.title}»؟`) && removeConcern(c.id)}><Trash2 size={13} /></button>
            </div>
          ))}
          {list.length === 0 && <div className="pt-empty">لا بطاقات في هذا التبويب بعد</div>}
        </div>
      </div>
    </>
  );
}

/* ---------------- 📑 القائمة الجانبية ---------------- */
function SideRailEditor() {
  const products = useStore((s) => s.products);
  const subConfig = useStore((s) => s.subConfig) || {};
  const cats = [...new Set(products.map((p) => p.cat).filter(Boolean))];
  const [cat, setCat] = useState(cats[0] || "");

  // تفرّعات القسم الفعلية + عددها
  const subsRaw = [...new Set(products.filter((p) => p.cat === cat).map((p) => p.sub || "أخرى"))];
  const cfg = subConfig[cat] || {};
  // رتّب حسب الإعداد المحفوظ
  const subs = [...subsRaw].sort((a, b) => {
    const ia = (cfg.order || []).indexOf(a), ib = (cfg.order || []).indexOf(b);
    return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
  });
  const count = (sub) => products.filter((p) => p.cat === cat && (p.sub || "أخرى") === sub).length;
  const move = (sub, dir) => {
    const arr = [...subs]; const i = arr.indexOf(sub); const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    setSubOrder(cat, arr);
  };

  return (
    <>
      <div className="pt-h1">📑 القائمة الجانبية<small>رتّب أو أخفِ أو أعِد تسمية التفرّعات التي تظهر داخل صفحة كل قسم</small></div>

      <div className="pt-card">
        <div style={{ padding: 14 }}>
          <div className="pt-field"><label>اختر القسم</label>
            <select className="pt-in" value={cat} onChange={(e) => setCat(e.target.value)}>
              {cats.map((c) => <option key={c} value={c}>{c} ({products.filter((p) => p.cat === c).length} منتج)</option>)}
            </select>
          </div>
          <div className="pt-note" style={{ margin: 0 }}>💡 هذه التفرّعات تُبنى تلقائياً من حقل «التفرّع» في منتجاتك. هنا ترتّبها أو تخفيها فقط.</div>
        </div>
      </div>

      <div className="pt-card">
        <div className="cap">تفرّعات «{cat}» ({subs.length})</div>
        <div className="sr-list">
          {subs.map((sub, i) => {
            const hidden = (cfg.hidden || []).includes(sub);
            return (
              <div className={"sr-row" + (hidden ? " off" : "")} key={sub}>
                <div className="sr-ord">
                  <button disabled={i === 0} onClick={() => move(sub, -1)}>↑</button>
                  <button disabled={i === subs.length - 1} onClick={() => move(sub, 1)}>↓</button>
                </div>
                <div className="sr-inf">
                  <input className="pt-in" defaultValue={cfg.rename?.[sub] || ""} placeholder={sub} onBlur={(e) => renameSub(cat, sub, e.target.value)} title="اسم معروض (اتركه فارغاً للأصلي)" />
                  <small>{sub} · {count(sub)} منتج</small>
                </div>
                <button className={"sr-eye" + (hidden ? " on" : "")} onClick={() => toggleSubHidden(cat, sub)} title={hidden ? "إظهار" : "إخفاء"}>{hidden ? "🙈" : "👁️"}</button>
              </div>
            );
          })}
          {subs.length === 0 && <div className="pt-empty">لا تفرّعات في هذا القسم</div>}
        </div>
        <div className="pt-note" style={{ margin: "0 14px 14px" }}>🔑 لدمج تفرّعات متشابهة، وحّد كتابتها في المنتجات (اكتب «عصائر» لكلها). التسمية هنا تغيّر <b>العرض</b> فقط لا الربط.</div>
      </div>
    </>
  );
}

/* ---------------- الفلاتر والماركات ---------------- */
const FILTER_KEYS = [["sort", "🔀 الفرز"], ["brand", "🏷️ الماركة"], ["off", "％ الخصومات"], ["price", "💰 السعر"], ["sub", "📂 الأنواع"]];
function FiltersBrands() {
  const brands = useStore((s) => s.brands) || [];
  const templates = useStore((s) => s.filterTemplates) || [];
  const products = useStore((s) => s.products);
  const cats = [...new Set(products.map((p) => p.cat).filter(Boolean))];
  const [bf, setBf] = useState({ name: "", e: "🏷️", cats: [] });
  const [tplCat, setTplCat] = useState("*");

  const currentTpl = templates.find((t) => t.cat === tplCat)?.filters
    || templates.find((t) => t.cat === "*")?.filters || ["sort", "brand", "off", "price"];
  const toggleKey = (k) => {
    const next = currentTpl.includes(k) ? currentTpl.filter((x) => x !== k) : [...currentTpl, k];
    setFilterTemplate(tplCat, next);
  };
  // تحريك ترتيب فلتر (يحدد ترتيب تبويبات نافذة الفلاتر للزبون)
  const moveKey = (k, dir) => {
    const arr = [...currentTpl];
    const i = arr.indexOf(k);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    setFilterTemplate(tplCat, arr);
  };
  const keyLabel = (k) => (FILTER_KEYS.find(([kk]) => kk === k) || [k, k])[1];

  const submitBrand = () => {
    if (!bf.name.trim()) { alert("أدخل اسم الماركة"); return; }
    addBrand({ name: bf.name.trim(), e: bf.e || "🏷️", cats: bf.cats });
    setBf({ name: "", e: "🏷️", cats: [] });
  };

  return (
    <>
      <div className="pt-h1">الفلاتر والماركات<small>تحكّم بقوالب الفلاتر لكل قسم وأسماء الشركات والمحلات</small></div>

      {/* قوالب الفلاتر */}
      <div className="pt-card">
        <div className="cap">🎛️ قوالب الفلاتر (لكل قسم)</div>
        <div style={{ padding: 14 }}>
          <div className="pt-field"><label>اختر القسم</label>
            <select className="pt-in" value={tplCat} onChange={(e) => setTplCat(e.target.value)}>
              <option value="*">⭐ القالب العام (كل الأقسام)</option>
              {cats.map((c) => <option key={c} value={c}>{c}{templates.some((t) => t.cat === c) ? " ✓ (مخصّص)" : ""}</option>)}
            </select>
          </div>
          <div className="pt-note" style={{ margin: "0 0 10px" }}>اختر الفلاتر التي تظهر للزبون — تفتح كلها في <b>نافذة سفلية أنيقة (كبلينكيت)</b> بتبويبات جانبية ومربعات اختيار وعدّاد منتجات لكل خيار:</div>
          <div className="fb-keys">
            {FILTER_KEYS.map(([k, label]) => (
              <button key={k} className={"fb-key" + (currentTpl.includes(k) ? " on" : "")} onClick={() => toggleKey(k)}>
                {currentTpl.includes(k) ? "✓ " : ""}{label}
              </button>
            ))}
          </div>
          {currentTpl.filter((k) => k !== "sort").length > 1 && (
            <>
              <div className="pt-note" style={{ margin: "14px 0 8px" }}>🔃 ترتيب تبويبات النافذة (الأول يظهر أولاً):</div>
              <div className="fb-order">
                {currentTpl.map((k, i) => (
                  <div className="fb-ord" key={k}>
                    <span className="fb-ord-n">{i + 1}</span>
                    <span className="fb-ord-l">{keyLabel(k)}</span>
                    <button className="fb-ord-b" disabled={i === 0} onClick={() => moveKey(k, -1)}>↑</button>
                    <button className="fb-ord-b" disabled={i === currentTpl.length - 1} onClick={() => moveKey(k, 1)}>↓</button>
                  </div>
                ))}
              </div>
            </>
          )}
          {tplCat !== "*" && templates.some((t) => t.cat === tplCat) && (
            <button className="ad-del" style={{ marginTop: 12 }} onClick={() => removeFilterTemplate(tplCat)}>↩️ إرجاع هذا القسم للقالب العام</button>
          )}
        </div>
      </div>

      {/* إضافة ماركة */}
      <div className="pt-card">
        <div className="cap">➕ إضافة ماركة / شركة / محل</div>
        <div style={{ padding: 14 }}>
          <div className="pt-row2">
            <div className="pt-field"><label>الاسم</label>
              <input className="pt-in" placeholder="مثال: المراعي، زين، أبو أحمد…" value={bf.name} onChange={(e) => setBf({ ...bf, name: e.target.value })} /></div>
            <div className="pt-field"><label>الأيقونة (إيموجي)</label>
              <input className="pt-in" style={{ textAlign: "center", fontSize: 18 }} value={bf.e} onChange={(e) => setBf({ ...bf, e: e.target.value })} /></div>
          </div>
          <div className="pt-field"><label>تظهر في أقسام (اتركها فارغة = كل الأقسام)</label>
            <div className="fb-cats">
              {cats.map((c) => (
                <span key={c} className={"fb-cat" + (bf.cats.includes(c) ? " on" : "")}
                  onClick={() => setBf({ ...bf, cats: bf.cats.includes(c) ? bf.cats.filter((x) => x !== c) : [...bf.cats, c] })}>{c}</span>
              ))}
            </div>
          </div>
          <button className="pt-btn" style={{ width: "100%" }} onClick={submitBrand}>➕ إضافة الماركة</button>
        </div>
      </div>

      {/* الماركات الحالية */}
      <div className="pt-card">
        <div className="cap">الماركات الحالية ({brands.length})</div>
        <div className="ad-list">
          {brands.map((b) => (
            <div className="fb-brand" key={b.id}>
              <span className="fb-brand-e">{b.e}</span>
              <div className="fb-brand-inf">
                <input className="pt-in" value={b.name} onChange={(e) => updateBrand(b.id, { name: e.target.value })} />
                <small>{(b.cats || []).length ? b.cats.join(" · ") : "كل الأقسام"} · {products.filter((p) => p.brand === b.name).length} منتج</small>
              </div>
              <button className="pt-btn warn sm" onClick={() => confirm(`حذف «${b.name}»؟`) && removeBrand(b.id)}><Trash2 size={13} /></button>
            </div>
          ))}
          {brands.length === 0 && <div className="pt-empty">لا ماركات بعد</div>}
        </div>
      </div>
    </>
  );
}

/* ---------------- أكواد الخصم ---------------- */
function Coupons() {
  const coupons = useStore((s) => s.coupons) || [];
  const [f, setF] = useState({ code: "", type: "percent", value: 20, minOrder: 0, maxUses: 0, desc: "" });
  const submit = () => {
    if (!f.code.trim() || !f.value) { alert("أدخل الكود وقيمة الخصم"); return; }
    if (coupons.some((c) => c.code === f.code.toUpperCase().trim())) { alert("هذا الكود موجود مسبقاً"); return; }
    addCoupon({ ...f, value: +f.value, minOrder: +f.minOrder || 0, maxUses: +f.maxUses || 0, desc: f.desc || (f.type === "percent" ? `خصم ${f.value}%` : `خصم ${f.value} د.ع`) });
    setF({ code: "", type: "percent", value: 20, minOrder: 0, maxUses: 0, desc: "" });
  };
  return (
    <>
      <div className="pt-h1">أكواد الخصم<small>أنشئ كوبونات تجذب الزبائن وتزيد الطلبات</small></div>
      <div className="pt-card">
        <div className="cap">➕ إنشاء كود خصم</div>
        <div style={{ padding: 14 }}>
          <div className="pt-row2">
            <div className="pt-field"><label>الكود (حروف إنجليزية)</label>
              <input className="pt-in" dir="ltr" placeholder="WELCOME" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} /></div>
            <div className="pt-field"><label>نوع الخصم</label>
              <select className="pt-in" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
                <option value="percent">نسبة مئوية %</option>
                <option value="fixed">مبلغ ثابت د.ع</option>
              </select></div>
          </div>
          <div className="pt-row2">
            <div className="pt-field"><label>قيمة الخصم ({f.type === "percent" ? "%" : "د.ع"})</label>
              <input className="pt-in" type="number" value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} /></div>
            <div className="pt-field"><label>حد أدنى للطلب (د.ع)</label>
              <input className="pt-in" type="number" placeholder="0 = بلا حد" value={f.minOrder} onChange={(e) => setF({ ...f, minOrder: e.target.value })} /></div>
          </div>
          <div className="pt-field"><label>عدد مرات الاستخدام (0 = غير محدود)</label>
            <input className="pt-in" type="number" placeholder="0" value={f.maxUses} onChange={(e) => setF({ ...f, maxUses: e.target.value })} /></div>
          <button className="pt-btn" style={{ width: "100%" }} onClick={submit}>➕ إنشاء الكود</button>
        </div>
      </div>
      <div className="pt-card">
        <div className="cap">الأكواد الحالية ({coupons.length})</div>
        <div className="ad-list">
          {coupons.map((c) => (
            <div className={"cp-card" + (c.active ? "" : " off")} key={c.code}>
              <div className="cp-head">
                <span className="cp-code">{c.code}</span>
                <span className="cp-val">{c.type === "percent" ? `${c.value}%` : `${fmt(c.value)} د.ع`}</span>
                <Switch on={c.active} onToggle={() => updateCoupon(c.code, { active: !c.active })} />
              </div>
              <div className="cp-desc">{c.desc}</div>
              <div className="cp-meta">
                {c.minOrder > 0 && <span>حد أدنى {fmt(c.minOrder)} د.ع</span>}
                <span>استُخدم {c.uses || 0}{c.maxUses > 0 ? ` / ${c.maxUses}` : " مرة"}</span>
              </div>
              <button className="ad-del" onClick={() => confirm(`حذف الكود «${c.code}»؟`) && removeCoupon(c.code)}><Trash2 size={13} /> حذف الكود</button>
            </div>
          ))}
          {coupons.length === 0 && <div className="pt-empty">لا أكواد بعد — أنشئ أول كود خصم</div>}
        </div>
      </div>
    </>
  );
}

/* ---------------- الإعدادات ---------------- */
function SettingsPage() {
  const settings = useStore((s) => s.settings);
  const baked = hasBakedConfig();
  return (
    <>
      <div className="pt-h1">إعدادات المتجر<small>تنعكس فوراً على واجهة الزبائن</small></div>
      <div className="pt-card">
        <div className="cap">📍 موقع المتجر — يظهر للزبون على خريطة التتبّع</div>
        <StoreLocationCard />
      </div>
      <div className="pt-card">
        <div className="cap">🗄️ تكامل Supabase — رفع صور المنتجات{baked && <span className="save-badge" style={{ marginRight: 8 }}>✓ مزامَن لكل الأجهزة</span>}</div>
        <SupabaseCard />
      </div>
      <div className="pt-card">
        <div className="cap">الواجهة والتوصيل</div>
        <div style={{ padding: 14 }}>
          <div className="pt-field"><label>نص شريط العرض (أعلى المتجر)</label>
            <input className="pt-in" value={settings.promoText} onChange={(e) => updateSettings({ promoText: e.target.value })} /></div>
          <div className="pt-row2">
            <div className="pt-field"><label>زمن التوصيل (دقيقة)</label>
              <input className="pt-in" type="number" value={settings.eta} onChange={(e) => updateSettings({ eta: +e.target.value || 0 })} /></div>
            <div className="pt-field"><label>رسوم التوصيل ({CUR})</label>
              <input className="pt-in" type="number" step="250" value={settings.deliveryFee} onChange={(e) => updateSettings({ deliveryFee: +e.target.value || 0 })} /></div>
          </div>
          <div className="pt-row2">
            <div className="pt-field"><label>توصيل مجاني للطلبات فوق ({CUR})</label>
              <input className="pt-in" type="number" step="1000" value={settings.freeAbove} onChange={(e) => updateSettings({ freeAbove: +e.target.value || 0 })} /></div>
            <div className="pt-field"><label>رسوم الخدمة ({CUR})</label>
              <input className="pt-in" type="number" step="50" value={settings.serviceFee} onChange={(e) => updateSettings({ serviceFee: +e.target.value || 0 })} /></div>
          </div>
          <div className="pt-row2">
            <div className="pt-field"><label>أجرة المندوب الأساسية ({CUR})</label>
              <input className="pt-in" type="number" step="250" value={settings.courierBase ?? 1500} onChange={(e) => updateSettings({ courierBase: +e.target.value || 0 })} /></div>
            <div className="pt-field"><label>إضافة لكل متجر إضافي ({CUR})</label>
              <input className="pt-in" type="number" step="250" value={settings.courierExtra ?? 500} onChange={(e) => updateSettings({ courierExtra: +e.target.value || 0 })} /></div>
          </div>
          <div className="pt-row2">
            <div className="pt-field"><label>رمز دخول الأدمن</label>
              <input className="pt-in" dir="ltr" value={settings.adminPin || "1234"} onChange={(e) => updateSettings({ adminPin: e.target.value })} /></div>
            <div className="pt-field"><label>رقم واتساب الدعم</label>
              <input className="pt-in" dir="ltr" value={settings.whatsapp || ""} onChange={(e) => updateSettings({ whatsapp: e.target.value })} /></div>
          </div>
          <div className="pt-field"><label>خيارات بقشيش المندوب (أرقام مفصولة بفاصلة)</label>
            <input className="pt-in" dir="ltr" value={(settings.tipOptions || []).join(", ")}
              onChange={(e) => updateSettings({ tipOptions: e.target.value.split(",").map((x) => +x.trim()).filter(Boolean) })} /></div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "6px 0" }}>
            <Switch on={settings.storeOpen} onToggle={() => updateSettings({ storeOpen: !settings.storeOpen })} />
            <div><b style={{ fontSize: 13.5 }}>المتجر مفتوح</b>
              <div style={{ fontSize: 11.5, color: "var(--p-mut)" }}>عند الإغلاق يظهر شريط أحمر ويتوقف استقبال الطلبات</div></div>
          </div>
        </div>
      </div>

      <div className="pt-card">
        <div className="cap">⚡ عروض الفلاش (الصفحة الرئيسية)</div>
        <div style={{ padding: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "4px 0 14px" }}>
            <Switch on={!!(settings.flashDeals && settings.flashDeals.enabled)} onToggle={() => updateSettings({ flashDeals: { ...(settings.flashDeals || {}), enabled: !(settings.flashDeals && settings.flashDeals.enabled) } })} />
            <div><b style={{ fontSize: 13.5 }}>{settings.flashDeals && settings.flashDeals.enabled ? "🟢 عروض الفلاش مفعّلة" : "🔴 عروض الفلاش معطّلة"}</b>
              <div style={{ fontSize: 11.5, color: "var(--p-mut)" }}>شريط عروض بعدّاد تنازلي أعلى الرئيسية — يخلق إلحاحاً ويزيد المبيعات</div></div>
          </div>
          <div className="pt-field"><label>عنوان القسم</label>
            <input className="pt-in" value={(settings.flashDeals || {}).title || "عروض اليوم"} onChange={(e) => updateSettings({ flashDeals: { ...(settings.flashDeals || {}), title: e.target.value } })} /></div>
          <div className="pt-row2">
            <div className="pt-field"><label>عدد المنتجات المعروضة</label>
              <input className="pt-in" type="number" value={(settings.flashDeals || {}).count ?? 10} onChange={(e) => updateSettings({ flashDeals: { ...(settings.flashDeals || {}), count: +e.target.value || 1 } })} /></div>
            <div className="pt-field"><label>أقل نسبة خصم % للعرض</label>
              <input className="pt-in" type="number" value={(settings.flashDeals || {}).minOff ?? 5} onChange={(e) => updateSettings({ flashDeals: { ...(settings.flashDeals || {}), minOff: +e.target.value || 0 } })} /></div>
          </div>
          <div className="pt-note" style={{ margin: 0 }}>💡 العروض تُختار تلقائياً من أعلى المنتجات خصماً. العدّاد يتجدّد يومياً حتى منتصف الليل.</div>
        </div>
      </div>
      <div className="pt-card">
        <div className="cap">البيانات التجريبية</div>
        <div style={{ padding: 14 }}>
          <button className="pt-btn ghost" onClick={() => confirm("إعادة كل البيانات لحالتها الأولى؟") && resetStore()}>
            <RotateCcw size={13} style={{ verticalAlign: -2 }} /> إعادة ضبط البيانات
          </button>
        </div>
      </div>
    </>
  );
}

/* ---------------- المظهر: ألوان ونصوص الموقع ---------------- */
function ColorField({ label, value, onChange }) {
  return (
    <div className="pt-field">
      <label>{label}</label>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)}
          style={{ width: 44, height: 38, border: "1.5px solid #e2e2e2", borderRadius: 10, padding: 2, background: "#fff", cursor: "pointer" }} />
        <input className="pt-in" dir="ltr" style={{ width: 110 }} value={value} onChange={(e) => onChange(e.target.value)} />
      </div>
    </div>
  );
}

function Look() {
  const a = useStore((s) => s.appearance);
  const t = useStore((s) => s.texts);
  const T = (label, key, dir) => (
    <div className="pt-field"><label>{label}</label>
      <input className="pt-in" dir={dir} value={t[key]} onChange={(e) => updateTexts({ [key]: e.target.value })} /></div>
  );
  return (
    <>
      <div className="pt-h1">مظهر الموقع<small>الألوان والنصوص — تنعكس مباشرة على المتجر</small></div>

      <div className="pt-card">
        <div className="cap"><Palette size={15} color="#c99a24" /> ألوان الهوية</div>
        <div style={{ padding: 14 }} className="pt-row2">
          <ColorField label="الهيدر — أعلى التدرّج" value={a.headTop} onChange={(v) => updateAppearance({ headTop: v })} />
          <ColorField label="الهيدر — أسفل التدرّج" value={a.headBot} onChange={(v) => updateAppearance({ headBot: v })} />
          <ColorField label="اللون الأساسي (أزرار الإضافة والتأكيد)" value={a.green} onChange={(v) => updateAppearance({ green: v })} />
          <ColorField label="الأصفر المميز (الشعار والبداية)" value={a.yellow} onChange={(v) => updateAppearance({ yellow: v })} />
          <ColorField label="الأصفر الداكن" value={a.yellowDk} onChange={(v) => updateAppearance({ yellowDk: v })} />
        </div>
      </div>

      <div className="pt-card">
        <div className="cap">نصوص الهوية</div>
        <div style={{ padding: 14 }}>
          <div className="pt-row2">
            {T("اسم التطبيق", "appName")}
            {T("حرف الشعار", "logoLetter")}
          </div>
          {T("سطر الشعار (شاشة البداية)", "tagline")}
          {T("رسالة الترحيب (شاشة البداية)", "splashWelcome")}
          <div className="pt-row2">
            {T("عنوان البانر الرئيسي", "welcomeTitle")}
            {T("وصف البانر الرئيسي", "welcomeSub")}
          </div>
        </div>
      </div>

      <div className="pt-card">
        <div className="cap">نصوص عامة</div>
        <div style={{ padding: 14 }}>
          <div className="pt-row2">
            {T("عنوان موقع التوصيل", "addressTitle")}
            {T("العنوان التفصيلي", "address")}
          </div>
          {T("رسالة إغلاق المتجر", "closedMsg")}
          <div className="pt-row2">
            {T("الفوتر — الاسم الكبير", "footerBig")}
            {T("الفوتر — السطر الثاني", "footerTag")}
          </div>
          {T("الفوتر — السطر الصغير", "footerMini")}
        </div>
      </div>
    </>
  );
}

/* ---------------- المحتوى: بانرات وأقسام الصفحة الرئيسية ---------------- */

/* ===== منشئ الصفحات التفاعلي: معاينة حيّة + سحب/أسهم + إضافة/حذف كتل وتبويبات ===== */

/* مصغّرات رسومية لكتالوج الكتل */

function Thumb({ kind }) {
  const sq = (n, cls) => Array.from({ length: n }, (_, i) => <i key={i} className={cls || ""} />);
  return (
    <div className={"pal-th th-" + kind}>
      {kind === "grid" && sq(6)}
      {kind === "slide" && <>{sq(3)}<i className="cut" /></>}
      {kind === "ad" && <><b /><em /></>}
      {kind === "carousel" && <>{sq(2, "bar")}</>}
      {kind === "best" && sq(3, "col")}
      {kind === "tiles" && sq(8, "tile")}
      {kind === "trio" && sq(3, "tall")}
      {kind === "big" && sq(2, "bigc")}
      {kind === "head" && <><b className="hbar" /><em className="srch" /></>}
      {kind === "tabs" && sq(5, "dot")}
      {kind === "strip" && <b className="line" />}
      {kind === "dz" && <b className="star" />}
    </div>
  );
}


/* مجموعة قابلة للطي — لتجميع التحكمات المتشابهة */
function Group({ icon, title, sub, children, open: dOpen }) {
  const [open, setOpen] = useState(!!dOpen);
  return (
    <div className="pt-card pt-group">
      <div className="gcap" onClick={() => setOpen(!open)}>
        <span className="chev">{open ? "▾" : "◂"}</span>
        <span className="gt">{icon} {title}</span>
        {sub && <small>{sub}</small>}
      </div>
      {open && <div className="gbody">{children}</div>}
    </div>
  );
}

function PageBuilder() {
  const homeBlocks = useStore((s) => s.homeBlocks);
  const customTabs = useStore((s) => s.customTabs);
  const products = useStore((s) => s.products);
  const [tabId, setTabId] = useState("home");
  const [drag, setDrag] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [pending, setPending] = useState(null); // موضع الإدراج القادم من المعاينة
  const tabRef = useRef(tabId); tabRef.current = tabId;
  useEffect(() => {
    const onMsg = (e) => {
      const d = e.data || {};
      if (!d.bk) return;
      if (d.act === "insert" && d.tabId === tabRef.current) { setPending(d.index); setPalOpen(true); }
      if (d.act === "select") { setOpenId(d.id); setPending(null); }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);
  const THEMED_TABS = [
    ["electronics", "🎧 إلكترونيات"], ["beauty", "💄 الجمال"], ["decor", "🛋️ ديكور"],
    ["kids", "🧸 الأطفال"], ["gifting", "🎁 الهدايا"], ["imported", "🌍 مستورد"],
  ];
  const tabBlocksAll = useStore((s) => s.tabBlocks);
  const blocks = tabId === "home" ? homeBlocks : tabBlocksAll[tabId] ? tabBlocksAll[tabId] : (customTabs.find((t) => t.id === tabId)?.blocks || []);
  useStore((s) => s.histV || 0); // إعادة رسم عند تغيّر السجل
  const hs = histState();
  const [palOpen, setPalOpen] = useState(false);
  useEffect(() => {
    const onKey = (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (k === "z" && !e.shiftKey) { e.preventDefault(); undoLayout(); }
      else if (k === "y" || (k === "z" && e.shiftKey)) { e.preventDefault(); redoLayout(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const CATS_LIST = [...new Set(products.map((p) => p.cat).filter(Boolean))];

  const label = (b) => b.type === "builtin" ? "🧩 " + (b.label || b.key)
    : b.type === "row" ? (b.layout === "slide" ? "⇄ " : "▦ ") + b.title
    : "📢 إعلان: " + b.t;

  const onDrop = (targetId) => {
    if (!drag || drag === targetId) return setDrag(null);
    const arr = [...blocks];
    const from = arr.findIndex((b) => b.id === drag);
    const to = arr.findIndex((b) => b.id === targetId);
    if (from < 0 || to < 0) return setDrag(null);
    const [m] = arr.splice(from, 1);
    arr.splice(to, 0, m);
    // اكتب الترتيب الجديد عبر التحريك المتسلسل (أبسط: استبدال كامل عبر update متتالٍ)
    window.__setBlocks && window.__setBlocks(tabId, arr);
    setDrag(null);
  };

  return (
    <div className="pt-card">
      <div className="cap">🧱 منشئ الصفحات التفاعلي<span className="sp" />
        <select className="pt-in" style={{ width: 170 }} value={tabId} onChange={(e) => setTabId(e.target.value)}>
          <option value="home">🏠 الصفحة الرئيسية (الكل)</option>
          {THEMED_TABS.map(([id, l]) => <option key={id} value={id}>{l}</option>)}
          {customTabs.map((t) => <option key={t.id} value={t.id}>{t.emoji} {t.label}</option>)}
        </select>
        <button className="pt-btn sm" onClick={() => { const l = prompt("اسم التبويب الجديد:"); if (l) { const e = prompt("إيموجي التبويب:", "🛍️"); addCustomTab(l, e || "🛍️"); } }}>+ تبويب</button>
        {tabId !== "home" && !tabBlocksAll[tabId] && <button className="pt-btn warn sm" onClick={() => { if (confirm("حذف هذا التبويب وكل كتله؟")) { removeCustomTab(tabId); setTabId("home"); } }}><Trash2 size={12} /></button>}
        <span className="sp" />
        <div className="pt-toolbar">
          <button className="tb" disabled={!hs.u} title="تراجع (Ctrl+Z)" onClick={undoLayout}>↩ تراجع{hs.u ? ` (${hs.u})` : ""}</button>
          <button className="tb" disabled={!hs.r} title="إعادة (Ctrl+Y)" onClick={redoLayout}>↪ إعادة</button>
          <button className="tb" title="استعادة التصميم الافتراضي لهذا التبويب" onClick={() => { if (confirm("استعادة هذا التبويب لتصميمه الافتراضي؟ (يمكن التراجع)")) resetTabLayout(tabId); }}>⟲ استعادة</button>
          <span className="save-badge">✓ يُحفظ تلقائياً</span>
        </div>
      </div>

      <div className="pt-builder">
        <div className="pt-blocks">
          <button className="pal-toggle" onClick={() => setPalOpen(!palOpen)}>{palOpen ? "▾" : "＋"} إضافة كتلة <small>كتالوج أنماط بلينكيت</small></button>
          {pending != null && (
            <div className="pal-pending">📍 سيُدرَج في الموضع {pending + 1} — اختر كتلة من الكتالوج
              <button onClick={() => setPending(null)}>إلغاء</button></div>
          )}
          {palOpen && <div className="pal-grid">
            {[
              { k: "grid", n: "صف منتجات 3×2", th: "grid", add: { type: "row", title: "صف جديد", sub: "", ids: [1, 2, 3, 4, 5, 14], cat: CATS_LIST[0] || "", layout: "grid" } },
              { k: "slide", n: "صف سلايد دوّار", th: "slide", add: { type: "row", title: "سلايد جديد", sub: "", ids: [1, 2, 3, 4, 5, 14, 28, 29], cat: CATS_LIST[0] || "", layout: "slide" } },
              { k: "ad", n: "بانر إعلاني", th: "ad", add: { type: "ad", t: "إعلان جديد", p: "وصف الإعلان", cta: "تسوّق الآن", e: "🛒", bg: "" } },
              { k: "banners", n: "كاروسيل بانرات", th: "carousel", add: { type: "builtin", key: "banners", label: "بانرات العروض العريضة" } },
              { k: "best", n: "شبكة الأكثر مبيعاً", th: "best", add: { type: "builtin", key: "bestsellers", label: "الأكثر مبيعاً (شبكة الفئات)" } },
              { k: "trio", n: "البطاقات الثلاثية", th: "trio", add: { type: "builtin", key: "trio", label: "البطاقات الثلاثية" } },
              { k: "big", n: "متاجر كبرى", th: "big", add: { type: "builtin", key: "bigstores", label: "متاجر يحبها الجميع" } },
            ].map((p) => (
              <div key={p.k} className="pal-item" onClick={() => { addBlock(tabId, p.add, pending); setPending(null); setPalOpen(false); }}>
                <Thumb kind={p.th} /><span>{p.n}</span>
              </div>
            ))}
            <div className="pal-item" onClick={() => {
              const opts = ["grocery:البقالة والمطبخ","snacks:وجبات ومشروبات","beauty:الجمال","household:المنزل","stores:متاجر مميّزة","lifestyle:أسلوب حياتك","tiles_electronics:الإلكترونيات","tiles_decor:الديكور","tiles_kids:الأطفال","tiles_imported:المستورد"];
              const pick = prompt("اختر مجموعة البلاطات:\n" + opts.map((o,i)=>(i+1)+") "+o.split(":")[1]).join("\n"), "1");
              const idx = (+pick || 1) - 1; const [key, lbl] = (opts[idx] || opts[0]).split(":");
              addBlock(tabId, { type: "builtin", key, label: "بلاطات: " + lbl }, pending); setPending(null); setPalOpen(false);
            }}><Thumb kind="tiles" /><span>بلاطات فئات</span></div>
            {[["head","رأس مُثيّم","المظهر"],["tabs","شريط التبويبات","زر + تبويب"],["strip","شريط تحفيزي","المظهر"],["dz","منطقة العروض","بطاقة العروض"]].map(([k,n,w]) => (
              <div key={k} className="pal-item struct" title={"هيكلي — يُدار من: " + w}>
                <Thumb kind={k} /><span>{n}</span><small>{w}</small>
              </div>
            ))}
          </div>}
          {blocks.length === 0 && <div style={{ color: "var(--p-mut)", fontSize: 12, padding: 14, textAlign: "center" }}>لا توجد كتل بعد — أضف صفًا أو إعلانًا</div>}
          {blocks.map((b, i) => (
            <div key={b.id}
              className={"pt-block" + (drag === b.id ? " dragging" : "") + (b.hidden ? " off" : "")}
              draggable onDragStart={() => setDrag(b.id)} onDragOver={(e) => e.preventDefault()} onDrop={() => onDrop(b.id)} onDragEnd={() => setDrag(null)}>
              <span className="grip">⠿</span>
              <span className="bl" onClick={() => setOpenId(openId === b.id ? null : b.id)}>{label(b)}</span>
              <span className="ops">
                <button title="أعلى" disabled={i === 0} onClick={() => moveBlock(tabId, b.id, -1)}>▲</button>
                <button title="أسفل" disabled={i === blocks.length - 1} onClick={() => moveBlock(tabId, b.id, +1)}>▼</button>
                <button title={b.hidden ? "إظهار" : "إخفاء"} onClick={() => updateBlock(tabId, b.id, { hidden: !b.hidden })}>{b.hidden ? "🙈" : "👁"}</button>
                <button title="نسخ الكتلة" onClick={() => { const c = JSON.parse(JSON.stringify(b)); delete c.id; addBlock(tabId, c, i + 1); }}>⧉</button>
                <button title="حذف" className="del" onClick={() => removeBlock(tabId, b.id)}>✕</button>
              </span>
              {openId === b.id && b.type === "row" && (
                <div className="edit">
                  <input className="pt-in" placeholder="العنوان" value={b.title} onChange={(e) => updateBlock(tabId, b.id, { title: e.target.value })} />
                  <input className="pt-in" placeholder="سطر فرعي (اختياري)" value={b.sub || ""} onChange={(e) => updateBlock(tabId, b.id, { sub: e.target.value })} />
                  <input className="pt-in" dir="ltr" placeholder="معرّفات المنتجات: 1,2,3" value={(b.ids || []).join(",")} onChange={(e) => updateBlock(tabId, b.id, { ids: e.target.value.split(",").map((x) => +x.trim()).filter(Boolean) })} />
                  <div className="row2">
                    <select className="pt-in" value={b.cat || ""} onChange={(e) => updateBlock(tabId, b.id, { cat: e.target.value })}>
                      {CATS_LIST.map((c) => <option key={c}>{c}</option>)}
                    </select>
                    <div className="pt-seg">
                      <button className={"seg" + (b.layout !== "slide" ? " on" : "")} onClick={() => updateBlock(tabId, b.id, { layout: "grid" })}>▦ 3×2</button>
                      <button className={"seg" + (b.layout === "slide" ? " on" : "")} onClick={() => updateBlock(tabId, b.id, { layout: "slide" })}>⇄ سلايد</button>
                    </div>
                  </div>
                </div>
              )}
              {openId === b.id && b.type === "ad" && (
                <div className="edit">
                  <input className="pt-in" placeholder="عنوان الإعلان" value={b.t} onChange={(e) => updateBlock(tabId, b.id, { t: e.target.value })} />
                  <input className="pt-in" placeholder="الوصف" value={b.p || ""} onChange={(e) => updateBlock(tabId, b.id, { p: e.target.value })} />
                  <div className="row2">
                    <input className="pt-in" placeholder="نص الزر" value={b.cta || ""} onChange={(e) => updateBlock(tabId, b.id, { cta: e.target.value })} />
                    <input className="pt-in" placeholder="إيموجي" value={b.e || ""} onChange={(e) => updateBlock(tabId, b.id, { e: e.target.value })} />
                  </div>
                  <input className="pt-in" dir="ltr" placeholder="خلفية CSS (اختياري)" value={b.bg || ""} onChange={(e) => updateBlock(tabId, b.id, { bg: e.target.value })} />
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="pt-preview-wrap">
          <div className="ph-note">معاينة حيّة — تتحدث فور أي تعديل{tabId !== "home" ? " (افتح التبويب الجديد من شريط المتجر)" : ""}</div>
          <iframe key={tabId} className="pt-preview" src={"/?builder=1&tab=" + (tabId === "home" ? "all" : tabId)} title="معاينة المتجر" />
        </div>
      </div>
    </div>
  );
}


function StoreLocationCard() {
  const loc = useStore((s) => s.storeLocation);
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState("");
  const detect = async () => {
    setBusy(true); setMsg("");
    try {
      const p = await getCurrentLocation();
      setStoreLocation({ lat: p.lat, lng: p.lng });
      const addr = (await reverseGeocode(p.lat, p.lng)).full;
      setStoreLocation({ lat: p.lat, lng: p.lng }, addr);
      setMsg("✓ حُدّد موقع المتجر: " + addr);
    } catch (e) { setMsg("⚠️ " + e.message); }
    setBusy(false);
  };
  return (
    <div style={{ padding: 14 }}>
      <div style={{ fontSize: 12.5, color: "var(--p-mut)", marginBottom: 10 }}>
        الموقع الحالي: <b style={{ color: "var(--p-ink)" }}>{loc.name}</b> ({loc.lat.toFixed(4)}, {loc.lng.toFixed(4)})
      </div>
      <button className="bk-gps-btn" style={{ maxWidth: 320 }} onClick={detect} disabled={busy}>
        {busy ? "جارٍ التحديد…" : "📍 حدّد موقع المتجر (GPS)"}
      </button>
      {msg && <div style={{ fontSize: 12, marginTop: 8, color: msg.startsWith("✓") ? "#0C831F" : "#c0303a", fontWeight: 700 }}>{msg}</div>}
      <div style={{ fontSize: 11, color: "var(--p-mut)", marginTop: 8 }}>💡 قِف في المتجر واضغط الزرّ، أو افتح الإعدادات من جهاز داخل المتجر.</div>
    </div>
  );
}

function SupabaseCard() {
  const [cfg, setCfg] = useState(() => getSupabaseCfg() || { url: "", anonKey: "", bucket: "products" });
  const [saved, setSaved] = useState(false);
  const [test, setTest] = useState(null); // { state:'busy'|'ok'|'warn'|'err', msg, hint }
  const [busy, setBusy] = useState(false);
  const save = () => { setSupabaseCfg(cfg); setSaved(true); setTimeout(() => setSaved(false), 1500); };
  const baked = hasBakedConfig();
  const runTest = async () => {
    setSupabaseCfg(cfg); setBusy(true); setTest({ state: "busy", msg: "جارٍ الفحص… (رفع + قراءة)" });
    try {
      const r = await diagnoseSupabase();
      if (r.ok) setTest({ state: "ok", msg: "✅ سليم تماماً — الصور تُرفع وتُقرأ وتظهر على كل الأجهزة.", hint: "" });
      else if (r.upload && !r.read) setTest({ state: "warn", msg: "⚠️ الرفع يعمل، لكن قراءة الصور محجوبة — لهذا لا تظهر.", hint: r.hint });
      else setTest({ state: "err", msg: "❌ " + (r.error || "فشل الاتصال"), hint: r.hint });
    } catch (e) { setTest({ state: "err", msg: "❌ " + (e.message || "خطأ غير متوقّع"), hint: "" }); }
    setBusy(false);
  };
  return (
    <div>
      <div className="pt-field"><label>رابط المشروع (Project URL)</label>
        <input className="pt-in" dir="ltr" placeholder="https://xxxx.supabase.co" value={cfg.url} onChange={(e) => setCfg({ ...cfg, url: e.target.value })} /></div>
      <div className="pt-field"><label>المفتاح العام (publishable / anon) — ليس secret</label>
        <input className="pt-in" dir="ltr" placeholder="sb_publishable_... أو eyJ..." value={cfg.anonKey} onChange={(e) => setCfg({ ...cfg, anonKey: e.target.value })} /></div>
      <div className="pt-field"><label>اسم الـ Bucket (عام)</label>
        <input className="pt-in" dir="ltr" placeholder="products" value={cfg.bucket} onChange={(e) => setCfg({ ...cfg, bucket: e.target.value })} /></div>
      <div style={{ display: "flex", gap: 8 }}>
        <button className="pt-btn sm" onClick={save}>{saved ? "✓ حُفظ" : "حفظ الإعداد"}</button>
        <button className="pt-btn sm ghost" onClick={runTest} disabled={busy || !cfg.url || !cfg.anonKey}>{busy ? "⏳ يفحص…" : "🧪 افحص الصور (رفع + قراءة)"}</button>
      </div>
      {test && (
        <div className={"pt-testres " + (test.state === "ok" ? "ok" : test.state === "err" || test.state === "warn" ? "err" : "")}>
          <div>{test.msg}</div>
          {test.hint && <div style={{ marginTop: 6, fontWeight: 400, lineHeight: 1.7, opacity: 0.92 }}>💡 {test.hint}</div>}
        </div>
      )}
      <div className="pt-tip" style={{ marginTop: 8 }}>{baked ? <>✅ الإعداد الدائم مرفوع مع الموقع — <b>يعمل تلقائياً على كل الأجهزة</b> بلا إعادة إدخال. الحقول أعلاه لتجاوز مؤقت على هذا الجهاز فقط.</> : <>ℹ️ للمزامنة على كل الأجهزة: ضع القيم في <b>src/config.js</b> وارفعها على GitHub. أو أدخلها هنا لهذا الجهاز فقط.</>}</div>
    </div>
  );
}

function Content() {
  const banners = useStore((s) => s.banners);
  const trio = useStore((s) => s.trio);
  const bigStores = useStore((s) => s.bigStores);
  const dealZone = useStore((s) => s.settings.dealZone);
  const setDZ = (patch) => updateSettings({ dealZone: { ...dealZone, ...patch } });
  const setTile = (i, patch) => setDZ({ tiles: dealZone.tiles.map((t, j) => (j === i ? { ...t, ...patch } : t)) });
  const rowLayouts = useStore((s) => s.settings.rowLayouts || {});
  const setLayout = (title, mode) => updateSettings({ rowLayouts: { ...rowLayouts, [title]: mode } });
  const In = (val, on, w, dir) => (
    <input className="pt-in" dir={dir} style={{ width: w || "100%", padding: "6px 9px", fontSize: 12 }} value={val} onChange={(e) => on(e.target.value)} />
  );
  return (
    <>
      <div className="pt-h1">محتوى الصفحة الرئيسية<small>حرّر البانرات والأقسام — تظهر فوراً في المتجر</small></div>

      <PageBuilder />

      <Group icon="🏷️" title="تبويب العروض" sub="منطقة العروض + أنماط صفوفه (يُبنى تلقائياً من الخصومات)">
        <div className="pt-row2" style={{ marginBottom: 10 }}>
          <div className="pt-field"><label>عنوان البانر</label>{In(dealZone?.title || "", (v) => setDZ({ title: v }))}</div>
          <div className="pt-field"><label>الوصف الفرعي</label>{In(dealZone?.subtitle || "", (v) => setDZ({ subtitle: v }))}</div>
        </div>
        <div className="pt-scroll">
          <table className="pt-table">
            <thead><tr><th>القيمة</th><th>التسمية</th><th>سطر فرعي</th><th>النوع</th><th>الحد / النسبة</th></tr></thead>
            <tbody>
              {(dealZone?.tiles || []).map((t, i) => (
                <tr key={t.id}>
                  <td>{In(t.value, (v) => setTile(i, { value: v }), 75)}</td>
                  <td>{In(t.label, (v) => setTile(i, { label: v }), 70)}</td>
                  <td>{In(t.sub, (v) => setTile(i, { sub: v }), 95)}</td>
                  <td>
                    <select className="pt-in" style={{ width: 110, padding: "6px 8px", fontSize: 12 }} value={t.type} onChange={(e) => setTile(i, { type: e.target.value })}>
                      <option value="max">سعر أقصى</option>
                      <option value="minoff">خصم أدنى</option>
                    </select>
                  </td>
                  <td>{In(String(t.n), (v) => setTile(i, { n: +v || 0 }), 80, "ltr")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="pt-subhead">🎚️ نمط عرض كل صف</div>
        {DEALS_ROWS.map((title) => {
          const mode = rowLayouts[title] || "grid";
          return (
            <div key={title} className="pt-layout-row">
              <span className="nm">{title}</span>
              <div className="pt-seg">
                <button className={"seg" + (mode === "grid" ? " on" : "")} onClick={() => setLayout(title, "grid")}>▦ 3×2</button>
                <button className={"seg" + (mode === "slide" ? " on" : "")} onClick={() => setLayout(title, "slide")}>⇄ سلايد</button>
              </div>
            </div>
          );
        })}
      </Group>


      <div className="pt-h2">🧩 محتوى الكتل الجاهزة<small>البانرات والبطاقات — مكانها وترتيبها من المنشئ أعلاه</small></div>

      <div className="pt-card">
        <div className="cap">بانرات العروض العريضة<span className="sp" />
          <button className="pt-btn sm" onClick={addBanner}><Plus size={13} style={{ verticalAlign: -2 }} /> بانر</button></div>
        <div className="pt-scroll">
          <table className="pt-table">
            <thead><tr><th>العنوان</th><th>الوصف</th><th>زر</th><th>إيموجي</th><th>الخلفية (CSS)</th><th></th></tr></thead>
            <tbody>
              {banners.map((b) => (
                <tr key={b.id}>
                  <td>{In(b.t, (v) => updateBanner(b.id, { t: v }), 120)}</td>
                  <td>{In(b.sub, (v) => updateBanner(b.id, { sub: v }), 190)}</td>
                  <td>{In(b.cta, (v) => updateBanner(b.id, { cta: v }), 80)}</td>
                  <td>{In(b.e, (v) => updateBanner(b.id, { e: v }), 55)}</td>
                  <td>{In(b.bg, (v) => updateBanner(b.id, { bg: v }), 230, "ltr")}</td>
                  <td><button className="pt-btn warn sm" onClick={() => removeBanner(b.id)}><Trash2 size={12} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="pt-card">
        <div className="cap">البطاقات الثلاثية (صيدلية/حيوانات/أطفال)</div>
        <div className="pt-scroll">
          <table className="pt-table">
            <thead><tr><th>العنوان</th><th>الوصف</th><th>إيموجي</th><th>الخلفية</th><th>لون العنوان</th></tr></thead>
            <tbody>
              {trio.map((c, i) => (
                <tr key={i}>
                  <td>{In(c.t, (v) => updateTrio(i, { t: v }), 130)}</td>
                  <td>{In(c.sub, (v) => updateTrio(i, { sub: v }), 200)}</td>
                  <td>{In(c.e, (v) => updateTrio(i, { e: v }), 55)}</td>
                  <td>{In(c.bg, (v) => updateTrio(i, { bg: v }), 95, "ltr")}</td>
                  <td>{In(c.fg, (v) => updateTrio(i, { fg: v }), 95, "ltr")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="pt-card">
        <div className="cap">متاجر يحبها الجميع<span className="sp" />
          <button className="pt-btn sm" onClick={addBigStore}><Plus size={13} style={{ verticalAlign: -2 }} /> متجر</button></div>
        <div className="pt-scroll">
          <table className="pt-table">
            <thead><tr><th>الاسم</th><th>الوصف</th><th>إيموجي</th><th>الخلفية</th><th></th></tr></thead>
            <tbody>
              {bigStores.map((g) => (
                <tr key={g.id}>
                  <td>{In(g.t, (v) => updateBigStore(g.id, { t: v }), 140)}</td>
                  <td>{In(g.sub, (v) => updateBigStore(g.id, { sub: v }), 180)}</td>
                  <td>{In(g.e, (v) => updateBigStore(g.id, { e: v }), 55)}</td>
                  <td>{In(g.bg, (v) => updateBigStore(g.id, { bg: v }), 95, "ltr")}</td>
                  <td><button className="pt-btn warn sm" onClick={() => removeBigStore(g.id)}><Trash2 size={12} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ---------------- المالية: صافي الربح والتسويات ---------------- */
const PERIODS = [["اليوم", 24 * 60 * 60 * 1000], ["آخر 7 أيام", 7 * 24 * 60 * 60 * 1000], ["كل الفترة", null]];

function Finance() {
  const state = useStore((s) => s);
  const [period, setPeriod] = useState(2);
  const sum = financeSummary(state, PERIODS[period][1]);
  const mName = (id) => state.merchants.find((m) => m.id === id)?.name || id;
  const cName = (id) => state.couriers.find((c) => c.id === id)?.name || id;

  return (
    <>
      <div className="pt-h1">المالية<small>الأرباح والتسويات — تُحسب من الطلبات المُسلّمة تلقائياً</small></div>

      <div className="pt-card">
        <div className="cap">ملخص الفترة<span className="sp" />
          <select className="pt-in" value={period} onChange={(e) => setPeriod(+e.target.value)}>
            {PERIODS.map(([l], i) => <option key={l} value={i}>{l}</option>)}
          </select>
        </div>
        <div className="pt-stats" style={{ padding: 14, marginBottom: 0, gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))" }}>
          <Stat Icon={Wallet} l="إيراد الطلبات المُسلّمة" v={`${fmt(sum.revenue)} ${CUR}`} d={`${sum.deliveredCount} توصيلة`} />
          <Stat Icon={Coins} l="عمولات المتاجر" v={`${fmt(sum.commissions)} ${CUR}`} />
          <Stat Icon={Coins} l="رسوم التوصيل والخدمة" v={`${fmt(sum.deliveryFees + sum.serviceFees)} ${CUR}`} />
          <Stat Icon={Bike} l="أجور المندوبين" v={`− ${fmt(sum.wages)} ${CUR}`} />
          <Stat Icon={CheckCircle2} l="💰 صافي ربح المنصة" v={`${fmt(sum.net)} ${CUR}`} />
        </div>
        <div className="pt-note">الصافي = العمولات + رسوم التوصيل والخدمة − أجور المندوبين. قيمة البضاعة تعود للتجار والبقشيش للمندوبين.</div>
      </div>

      <div className="pt-card">
        <div className="cap">🏪 تسويات التجار<span className="sp" /><span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--p-mut)" }}>ادفع مستحقاتهم ثم يؤكدون الاستلام من لوحتهم</span></div>
        <div className="ad-list">
          {state.merchants.map((m) => {
            const d = merchantDues(state, m.id);
            return (
              <div className="fin-row" key={m.id}>
                <div className="fin-l"><b>{m.name}</b><span className="fin-sub">عمولة {m.commission ?? 10}% · {d.rows.length} طلب</span></div>
                <div className="fin-amt" style={{ color: d.amount ? "#0C831F" : "var(--p-mut)" }}>{fmt(d.amount)} {CUR}</div>
                <button className="pt-btn sm" disabled={!d.amount} style={{ opacity: d.amount ? 1 : 0.45 }}
                  onClick={() => settleMerchant(m.id, d.amount, d.rows.map((r) => r.id))}>تسوية</button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="pt-card">
        <div className="cap">🏍️ نقد المندوبين<span className="sp" /><span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--p-mut)" }}>يسلّمون النقد من لوحتهم وتؤكد الاستلام هنا</span></div>
        <div className="ad-list">
          {state.couriers.map((c) => {
            const cash = courierCash(state, c.id);
            return (
              <div className="fin-row" key={c.id}>
                <div className="fin-l"><b>{c.name}</b><span className="fin-sub">{cash.remitOrderIds.length} طلب نقدي · أجور {fmt(cash.wages + cash.tips)}</span></div>
                <div className="fin-amt" style={{ color: cash.remitDue ? "#b3261e" : "var(--p-mut)" }}>{fmt(cash.remitDue)} {CUR}<small>بذمّته</small></div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="pt-card">
        <div className="cap">📜 سجل التسويات</div>
        <div className="ad-list">
          {state.settlements.map((st) => (
            <div className="fin-log" key={st.id}>
              <div className="fin-log-top">
                <b>{st.kind === "merchant" ? "🏪 دفعة لتاجر" : "🏍️ نقد من مندوب"}</b>
                <span className={"pt-badge " + (st.status === "مؤكدة" ? "pt-b-done" : "pt-b-prep")}>{st.status}</span>
              </div>
              <div className="fin-log-mid">
                <span>{st.kind === "merchant" ? mName(st.partyId) : cName(st.partyId)}</span>
                <b>{fmt(st.amount)} {CUR}</b>
              </div>
              <div className="fin-log-bot">
                <span>{(st.orders || []).length} طلب · {timeAgo(st.time)} · #{st.id.slice(-5)}</span>
                {st.kind === "courier" && st.status !== "مؤكدة" && (
                  <button className="pt-btn sm" onClick={() => confirmSettlement(st.id)}>تأكيد الاستلام ✓</button>
                )}
              </div>
            </div>
          ))}
          {state.settlements.length === 0 && <div className="pt-empty">لا تسويات بعد — ستظهر هنا عند أول تسوية</div>}
        </div>
      </div>
    </>
  );
}
