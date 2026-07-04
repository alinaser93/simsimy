import { useSyncExternalStore } from "react";
import { HOME_BLOCKS } from "../data/homeBlocks.js";
import { TAB_BLOCKS } from "../data/tabBlocks.js";
import { PRODUCTS } from "../data/products.js";
import { toIQD } from "../utils/currency.js";
import { WIDE_BANNERS, TRIO_PROMOS, BIG_STORES } from "../data/collections.js";

/* ============================================================
   المخزن المركزي — مصدر الحقيقة الوحيد للمتجر والبوابات.
   يُحفظ في localStorage ليبقى التحكم (الأدمن/التاجر) فعّالاً
   بعد إعادة التحميل، ولتنعكس التغييرات على واجهة المتجر فوراً.
   ============================================================ */

const KEY = "bk-app-store-v1";

// توزيع المنتجات على التجار حسب الفئة
const merchantFor = (id) => (id >= 6 && id <= 8 ? "m2" : id >= 9 && id <= 11 ? "m3" : "m1");

const seedProducts = () =>
  PRODUCTS.map((p) => ({
    ...p,
    priceIQD: toIQD(p.price),
    mrpIQD: toIQD(p.mrp),
    stock: true,
    merchantId: p.merchantId || merchantFor(p.id),
    desc: `منتج أصلي 100% بجودة مضمونة. ${p.name} — ${p.weight}. يصلك خلال دقائق بتغليف آمن يحافظ على الجودة والنضارة.`,
    highlights: [
      ["النوع", p.cat || "بقالة"],
      ["الوزن / الحجم", p.weight],
      ["بلد المنشأ", "العراق / مستورد"],
      ["التخزين", "بحسب التعليمات على العبوة"],
    ],
  }));

const T = (minsAgo) => new Date(Date.now() - minsAgo * 60000).toISOString();

const seedOrders = (prods) => {
  const pick = (ids) => ids.map((id) => {
    const p = prods.find((x) => x.id === id);
    return { id: p.id, name: p.name, qty: 1, priceIQD: p.priceIQD, e: p.e, merchantId: p.merchantId };
  });
  const mk = (id, items, status, courierId, minsAgo, name, phone, address, extra = {}) => {
    const subtotal = items.reduce((a, i) => a + i.priceIQD * i.qty, 0);
    const mids = [...new Set(items.map((i) => i.merchantId))];
    const allReady = !["جديد", "قيد التجهيز"].includes(status);
    const readiness = Object.fromEntries(mids.map((m) => [m, allReady]));
    const tip = extra.tip || 0;
    const fee = 1000, serviceFee = 250;
    return {
      id, items, merchantId: mids[0], merchantCount: mids.length, courierId, status,
      time: T(minsAgo), customer: { name, phone, address }, readiness,
      subtotal, fee, serviceFee, tip, payMethod: extra.payMethod || "نقداً عند الاستلام",
      note: extra.note || "", total: subtotal + fee + serviceFee + tip,
      courierWage: status === "تم التوصيل" ? 1500 + 500 * (mids.length - 1) : undefined,
    };
  };
  return [
    mk(1006, pick([1, 3, 5]), "جديد", null, 4, "علي حسين", "0770 111 2233", "الكرادة، شارع 62، بناية 14"),
    mk(1005, pick([6, 8]), "قيد التجهيز", null, 18, "زهراء محمد", "0781 555 8899", "المنصور، حي دراغ، دار 7"),
    mk(1004, pick([9]), "جاهز للتوصيل", null, 32, "مصطفى كاظم", "0790 222 4455", "زيونة، شارع الربيعي"),
    mk(1003, pick([2, 12, 13]), "في الطريق", "c1", 47, "نور صباح", "0771 999 1122", "اليرموك، حي الأطباء", { note: "لا تقرع الجرس" }),
    mk(1002, pick([4, 5]), "تم التوصيل", "c2", 130, "حيدر جبار", "0782 333 6677", "الكاظمية، قرب الصحن", { tip: 500 }),
    mk(1001, pick([7, 9]), "تم التوصيل", "c1", 210, "سارة أمير", "0791 444 5566", "الجادرية، مجمع النخيل", { payMethod: "زين كاش" }),
  ];
};

const defaults = () => {
  const products = seedProducts();
  return {
    homeBlocks: HOME_BLOCKS,
  tabBlocks: TAB_BLOCKS,
  customTabs: [],
  settings: {
      promoText: "⚡ اطلب الآن واحصل على توصيل مجاني",
      eta: 12,
      deliveryFee: 1000,
      serviceFee: 250,          // رسوم الخدمة تظهر في الفاتورة
      freeAbove: 25000,         // توصيل مجاني فوق هذا المبلغ
      tipOptions: [250, 500, 1000], // خيارات بقشيش المندوب
      storeOpen: true,
      rowLayouts: {
      "أقل الأسعار على البقالة اليومية": "slide",
      "وفّر أكثر مع عروض المشروبات": "slide",
    },
    dealZone: {
      title: "منطقة العروض",
      subtitle: "أقوى الخصومات في مكان واحد",
      tiles: [
        { id: "s5", label: "متجر", value: "٥٬٠٠٠", sub: "د.ع وأقل", type: "max", n: 5000 },
        { id: "s15", label: "متجر", value: "١٥٬٠٠٠", sub: "د.ع وأقل", type: "max", n: 15000 },
        { id: "s25", label: "متجر", value: "٢٥٬٠٠٠", sub: "د.ع وأقل", type: "max", n: 25000 },
        { id: "d30", label: "خصم", value: "٣٠٪+", sub: "وأكثر", type: "minoff", n: 30 },
        { id: "d40", label: "خصم", value: "٤٠٪+", sub: "وأكثر", type: "minoff", n: 40 },
        { id: "d50", label: "خصم", value: "٥٠٪+", sub: "الأعلى", type: "minoff", n: 50 },
      ],
    },
    adminPin: "1234",        // رمز دخول لوحة الأدمن (قابل للتغيير من الإعدادات)
      courierBase: 1500,       // أجرة المندوب الأساسية عن التوصيلة
      courierExtra: 500,       // إضافة عن كل متجر إضافي في نفس الطلب
      whatsapp: "0770 000 0000", // رقم واتساب الدعم
    },
    // هوية الموقع — يتحكم بها الأدمن من تبويب «المظهر»
    appearance: {
      headTop: "#C99A24",
      headBot: "#8E6112",
      green: "#0C831F",
      yellow: "#F8CB46",
      yellowDk: "#F0B500",
    },
    // نصوص الموقع — يتحكم بها الأدمن من تبويب «المظهر»
    texts: {
      appName: "بلينكيت",
      logoLetter: "ب",
      tagline: "تطبيق الدقائق الأخيرة",
      splashWelcome: "اطلب الآن واستمتع بتوصيل مجاني",
      welcomeTitle: "أهلاً بك",
      welcomeSub: "اطلب الآن واحصل على توصيل مجاني",
      addressTitle: "المنزل",
      address: "علي، 22، منطقة راجباث",
      closedMsg: "المتجر مغلق حالياً — نعود قريباً 🌙",
      footerBig: "بلينكيت",
      footerTag: "تطبيق الدقائق الأخيرة 🇮🇶",
      footerMini: "صُنع بـ ❤️ في العراق",
      customerName: "زبون التطبيق",
    },
    // محتوى الأقسام القابلة للتحرير من تبويب «المحتوى»
    banners: WIDE_BANNERS.map((b, i) => ({ id: "b" + (i + 1), ...b })),
    trio: TRIO_PROMOS.map((t) => ({ ...t })),
    bigStores: BIG_STORES.map((g, i) => ({ id: "g" + (i + 1), ...g })),
    merchants: [
      { id: "m1", name: "سوبرماركت النخيل", cat: "بقالة وأغذية", phone: "0770 100 1000", password: "1111", commission: 10, open: true },
      { id: "m2", name: "بيوتي لاند", cat: "جمال وعناية", phone: "0781 200 2000", password: "2222", commission: 12, open: true },
      { id: "m3", name: "تك ستور", cat: "إلكترونيات", phone: "0790 300 3000", password: "3333", commission: 10, open: true },
    ],
    couriers: [
      { id: "c1", name: "أحمد كريم", phone: "0770 111 0001", active: true, password: "1111" },
      { id: "c2", name: "حسن علي", phone: "0781 222 0002", active: true, password: "2222" },
      { id: "c3", name: "مرتضى سعد", phone: "0790 333 0003", active: false, password: "3333" },
    ],
    products,
    storeLocation: { lat: 33.3152, lng: 44.3661, name: "المتجر الرئيسي" }, // بغداد
    coupons: [
      { code: "WELCOME", type: "percent", value: 20, minOrder: 5000, active: true, uses: 0, maxUses: 0, desc: "خصم 20% لأول طلب" },
      { code: "SAVE1000", type: "fixed", value: 1000, minOrder: 10000, active: true, uses: 0, maxUses: 0, desc: "خصم 1000 د.ع على الطلبات فوق 10 آلاف" },
    ],
    addresses: [
      { id: "a1", label: "المنزل", details: "المنصور، شارع 14 رمضان، دار 22", phone: "0770 000 0000", lat: 33.3260, lng: 44.3560 },
      { id: "a2", label: "العمل", details: "الكرادة، شارع السعدون، بناية 40، ط3", phone: "0770 000 0000", lat: 33.3080, lng: 44.4020 },
    ],
    selectedAddress: "a1",
    user: { name: "", phone: "", birthday: "", email: "", notifications: true, loggedIn: false },
    wishlist: [],
    orders: seedOrders(products),
    settlements: [],   // تسويات التجار والمندوبين
    nextOrderId: 1007,
  };
};

const load = () => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

const mergeSaved = (d, saved) => {
  if (!saved) return d;
  const out = { ...d, ...saved };
  ["settings", "appearance", "texts"].forEach((k) => { out[k] = { ...d[k], ...(saved[k] || {}) }; });
  ["banners", "trio", "bigStores", "addresses", "homeBlocks", "customTabs"].forEach((k) => { if (!Array.isArray(saved[k])) out[k] = d[k]; });
  out.tabBlocks = { ...d.tabBlocks, ...(saved.tabBlocks || {}) };
  out.user = { ...d.user, ...(saved.user || {}) };
  if (!Array.isArray(out.wishlist)) out.wishlist = d.wishlist;
  Object.keys(d.tabBlocks).forEach((k) => { if (!Array.isArray(out.tabBlocks[k])) out.tabBlocks[k] = d.tabBlocks[k]; });
  out.merchants = (saved.merchants || d.merchants).map((m) => ({ password: "0000", commission: 10, open: true, ...m }));
  out.couriers = (saved.couriers || d.couriers).map((c) => ({ password: "0000", ...c }));
  if (!Array.isArray(saved.settlements)) out.settlements = [];
  out.orders = (saved.orders || d.orders).map((o) => ({
    readiness: o.readiness || {},
    serviceFee: o.serviceFee ?? 0, tip: o.tip ?? 0,
    payMethod: o.payMethod || "نقداً عند الاستلام",
    merchantCount: o.merchantCount || 1,
    ...o,
    items: (o.items || []).map((i) => ({ merchantId: i.merchantId || o.merchantId, ...i })),
  }));
  return out;
};
let state = mergeSaved(defaults(), load());
try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* بيئة بلا تخزين */ }

// مزامنة حية: أي تبويب يكتب، البقية تتحدّث فوراً (زبون/أدمن/تاجر/مندوب على نفس الجهاز)
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === KEY && e.newValue) {
      try { state = mergeSaved(defaults(), JSON.parse(e.newValue)); listeners.forEach((l) => l()); } catch { /* تجاهل */ }
    }
  });
}
const listeners = new Set();
const emit = () => {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* تجاهل */ }
  listeners.forEach((l) => l());
};

let orderChangeHook = null;
export const setOrderChangeHook = (fn) => { orderChangeHook = fn; };
const afterOrderChange = (id) => { try { orderChangeHook && orderChangeHook(id); } catch { /* تجاهل */ } };
export const getState = () => state;
export const setState = (patch) => {
  state = { ...state, ...(typeof patch === "function" ? patch(state) : patch) };
  emit();
};
export const resetStore = () => { state = defaults(); emit(); };

export function useStore(selector = (s) => s) {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => selector(state)
  );
}

/* ---------- إجراءات جاهزة ---------- */
export const findProduct = (id) => state.products.find((p) => p.id === id);

export const updateProduct = (id, patch) =>
  setState((s) => ({ products: s.products.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));

export const addProduct = (data) =>
  setState((s) => {
    const id = Math.max(...s.products.map((p) => p.id)) + 1;
    return { products: [...s.products, { rating: 4.3, reviews: "جديد", eta: "10 دقائق", bg: "#F2F2F2", stock: true, ...data, id }] };
  });

export const removeProduct = (id) =>
  setState((s) => ({ products: s.products.filter((p) => p.id !== id) }));



// ===== سجلّ التراجع/الإعادة لتخطيطات المنشئ =====
let undoStack = [], redoStack = [], lastHKey = null, lastHT = 0;
const layoutSnap = (st) => JSON.parse(JSON.stringify({ homeBlocks: st.homeBlocks, tabBlocks: st.tabBlocks, customTabs: st.customTabs }));
const pushHist = (key) => {
  const now = Date.now();
  if (key && key === lastHKey && now - lastHT < 900) { lastHT = now; return; } // دمج ضربات الكتابة المتتالية
  undoStack.push(layoutSnap(state));
  if (undoStack.length > 50) undoStack.shift();
  redoStack = []; lastHKey = key || null; lastHT = now;
};
export const histState = () => ({ u: undoStack.length, r: redoStack.length });
export const undoLayout = () => {
  if (!undoStack.length) return;
  redoStack.push(layoutSnap(state)); lastHKey = null;
  const snap = undoStack.pop();
  setState((st) => ({ ...snap, histV: (st.histV || 0) + 1 }));
};
export const redoLayout = () => {
  if (!redoStack.length) return;
  undoStack.push(layoutSnap(state)); lastHKey = null;
  const snap = redoStack.pop();
  setState((st) => ({ ...snap, histV: (st.histV || 0) + 1 }));
};
export const resetTabLayout = (tabId) => {
  pushHist();
  setState((st) => {
    const bump = { histV: (st.histV || 0) + 1 };
    if (tabId === "home") return { homeBlocks: JSON.parse(JSON.stringify(HOME_BLOCKS)), ...bump };
    if (st.tabBlocks[tabId]) return { tabBlocks: { ...st.tabBlocks, [tabId]: JSON.parse(JSON.stringify(TAB_BLOCKS[tabId] || [])) }, ...bump };
    return { customTabs: st.customTabs.map((t) => (t.id === tabId ? { ...t, blocks: [] } : t)), ...bump };
  });
};

// ===== منشئ الصفحات (كتل الرئيسية + التبويبات المخصّصة) =====
const genId = () => "b" + Math.random().toString(36).slice(2, 8);
const blocksOf = (s, tabId) => (tabId === "home" ? s.homeBlocks : s.tabBlocks[tabId] ? s.tabBlocks[tabId] : (s.customTabs.find((t) => t.id === tabId)?.blocks || []));
const writeBlocks = (s, tabId, blocks) =>
  tabId === "home"
    ? { homeBlocks: blocks }
    : s.tabBlocks[tabId]
    ? { tabBlocks: { ...s.tabBlocks, [tabId]: blocks } }
    : { customTabs: s.customTabs.map((t) => (t.id === tabId ? { ...t, blocks } : t)) };
export const addBlock = (tabId, block, index) => {
  pushHist();
  return setState((s) => {
    const arr = [...blocksOf(s, tabId)];
    const nb = { id: genId(), ...block };
    if (index == null || index < 0 || index > arr.length) arr.push(nb); else arr.splice(index, 0, nb);
    return { ...writeBlocks(s, tabId, arr), histV: (s.histV || 0) + 1 };
  });
};
export const updateBlock = (tabId, id, patch) => {
  pushHist(tabId + ":" + id);
  setState((s) => ({ ...writeBlocks(s, tabId, blocksOf(s, tabId).map((b) => (b.id === id ? { ...b, ...patch } : b))), histV: (s.histV || 0) + 1 }));
};
export const removeBlock = (tabId, id) => {
  pushHist();
  setState((s) => ({ ...writeBlocks(s, tabId, blocksOf(s, tabId).filter((b) => b.id !== id)), histV: (s.histV || 0) + 1 }));
};
export const moveBlock = (tabId, id, dir) => {
  pushHist();
  return setState((s) => {
    const arr = [...blocksOf(s, tabId)];
    const i = arr.findIndex((b) => b.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= arr.length) return {};
    [arr[i], arr[j]] = [arr[j], arr[i]];
    return { ...writeBlocks(s, tabId, arr), histV: (s.histV || 0) + 1 };
  });
};
export const setBlocksOrder = (tabId, blocks) => { pushHist(); setState((s) => ({ ...writeBlocks(s, tabId, blocks), histV: (s.histV || 0) + 1 })); };
if (typeof window !== "undefined") window.__setBlocks = setBlocksOrder;
export const addCustomTab = (label, emoji) => {
  pushHist();
  setState((s) => ({ customTabs: [...s.customTabs, { id: "ct" + Date.now().toString(36), label, emoji: emoji || "🛍️", blocks: [] }], histV: (s.histV || 0) + 1 }));
};
export const updateCustomTab = (id, patch) => {
  pushHist();
  setState((s) => ({ customTabs: s.customTabs.map((t) => (t.id === id ? { ...t, ...patch } : t)), histV: (s.histV || 0) + 1 }));
};
export const removeCustomTab = (id) => {
  pushHist();
  setState((s) => ({ customTabs: s.customTabs.filter((t) => t.id !== id), histV: (s.histV || 0) + 1 }));
};

// ═══ أكواد الخصم ═══
export const addCoupon = (coupon) =>
  setState((s) => ({ coupons: [...(s.coupons || []), { ...coupon, code: coupon.code.toUpperCase().trim(), uses: 0, active: true }] }));
export const updateCoupon = (code, patch) =>
  setState((s) => ({ coupons: (s.coupons || []).map((c) => (c.code === code ? { ...c, ...patch } : c)) }));
export const removeCoupon = (code) =>
  setState((s) => ({ coupons: (s.coupons || []).filter((c) => c.code !== code) }));
// تحقّق من كود وأرجع الخصم (أو خطأ)
export const validateCoupon = (code, subtotal) => {
  const s = state;
  const c = (s.coupons || []).find((x) => x.code === (code || "").toUpperCase().trim());
  if (!c) return { ok: false, error: "الكود غير صحيح" };
  if (!c.active) return { ok: false, error: "هذا الكود غير مُفعّل" };
  if (c.maxUses > 0 && c.uses >= c.maxUses) return { ok: false, error: "انتهت صلاحية هذا الكود" };
  if (subtotal < (c.minOrder || 0)) return { ok: false, error: `الحد الأدنى للطلب ${c.minOrder} د.ع` };
  const discount = c.type === "percent" ? Math.round(subtotal * c.value / 100) : c.value;
  return { ok: true, discount, coupon: c };
};

export const setStoreLocation = (coords, name) => setState((s) => ({ storeLocation: { lat: coords.lat, lng: coords.lng, name: name || s.storeLocation.name } }));
export const updateSettings = (patch) =>
  setState((s) => ({ settings: { ...s.settings, ...patch } }));

export const updateUser = (patch) =>
  setState((s) => ({ user: { ...s.user, ...patch } }));
export const toggleWishlist = (id) =>
  setState((s) => ({ wishlist: s.wishlist.includes(id) ? s.wishlist.filter((x) => x !== id) : [...s.wishlist, id] }));

// جاهزية التاجر (بوابة الجاهزية): عندما تكتمل كل المتاجر ينتقل الطلب تلقائياً لـ«جاهز للتوصيل»
export const setMerchantReady = (orderId, mid, val = true) => {
  setState((s) => ({
    orders: s.orders.map((o) => {
      if (o.id !== orderId) return o;
      const readiness = { ...(o.readiness || {}), [mid]: val };
      const vals = Object.values(readiness);
      const allReady = vals.length > 0 && vals.every(Boolean);
      let status = o.status;
      if (allReady && ["جديد", "قيد التجهيز"].includes(status)) status = "جاهز للتوصيل";
      if (!val && status === "جاهز للتوصيل") status = "قيد التجهيز";
      return { ...o, readiness, status };
    }),
  }));
  afterOrderChange(orderId);
};

export const updateCourier = (id, patch) =>
  setState((s) => ({ couriers: s.couriers.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
export const removeCourier = (id) =>
  setState((s) => ({ couriers: s.couriers.filter((c) => c.id !== id) }));
export const removeMerchant = (id) =>
  setState((s) => ({ merchants: s.merchants.filter((m) => m.id !== id) }));

export const setOrderStatus = (id, status) =>
  setState((s) => ({
    orders: s.orders.map((o) => {
      if (o.id !== id) return o;
      const stamp = status === "تم التوصيل" && o.courierWage == null
        ? { courierWage: (s.settings.courierBase ?? 1500) + (s.settings.courierExtra ?? 500) * Math.max(0, (o.merchantCount || 1) - 1) }
        : {};
      return { ...o, status, ...stamp };
    }),
  }));

export const assignCourier = (id, courierId) => { _assignCourier(id, courierId); afterOrderChange(id); };
const _assignCourier = (id, courierId) =>
  setState((s) => ({ orders: s.orders.map((o) => (o.id === id ? { ...o, courierId } : o)) }));


// ═══ إدارة الطلب من التاجر ═══
// إعادة حساب مبالغ الطلب بعد تعديل العناصر
function recomputeOrder(o, s) {
  const subtotal = o.items.reduce((a, i) => a + i.priceIQD * i.qty, 0);
  const fee = subtotal >= s.settings.freeAbove ? 0 : s.settings.deliveryFee;
  return { ...o, subtotal, fee, total: subtotal + fee + (o.serviceFee || 0) + (o.tip || 0) };
}
// حذف عنصر من الطلب (نفاد المنتج) — يعيد حساب المبالغ
export const removeOrderItem = (orderId, itemId) => { setState((s) => ({
    orders: s.orders.map((o) => {
      if (o.id !== orderId) return o;
      const items = o.items.filter((i) => i.id !== itemId);
      if (items.length === 0) return { ...o, status: "ملغي", items }; // لا عناصر → إلغاء
      return recomputeOrder({ ...o, items }, s);
    }),
  })); afterOrderChange(orderId); };
// تعديل كمية عنصر في الطلب
export const updateOrderItemQty = (orderId, itemId, qty) => { setState((s) => ({
    orders: s.orders.map((o) => {
      if (o.id !== orderId) return o;
      if (qty <= 0) { const items = o.items.filter((i) => i.id !== itemId); return items.length ? recomputeOrder({ ...o, items }, s) : { ...o, status: "ملغي", items }; }
      const items = o.items.map((i) => (i.id === itemId ? { ...i, qty } : i));
      return recomputeOrder({ ...o, items }, s);
    }),
  })); afterOrderChange(orderId); };
// التاجر يرفض الطلب كاملاً
export const rejectOrder = (orderId, reason) => { setState((s) => ({ orders: s.orders.map((o) => (o.id === orderId ? { ...o, status: "ملغي", rejectReason: reason || "رفضه المتجر" } : o)) })); afterOrderChange(orderId); };

// ═══ تعيين المندوب تلقائياً ═══
// يجد مندوباً متاحاً بلا طلبات نشطة (الأقل حملاً)
export const findFreeCourier = () => {
  const s = state;
  const active = (cid) => s.orders.filter((o) => o.courierId === cid && ["في الطريق", "وصل المندوب"].includes(o.status)).length;
  const candidates = s.couriers.filter((c) => c.active !== false).map((c) => ({ id: c.id, name: c.name, load: active(c.id) })).sort((a, b) => a.load - b.load);
  return candidates[0] || null;
};
// تعيين تلقائي: يُسند الطلب لأقل مندوب حملاً ويطلقه
export const autoAssignCourier = (orderId) => {
  const free = findFreeCourier();
  if (!free) return null;
  setState((s) => ({ orders: s.orders.map((o) => (o.id === orderId ? { ...o, courierId: free.id, status: "في الطريق" } : o)) }));
  afterOrderChange(orderId);
  return free;
};
export const toggleCourier = (id) =>
  setState((s) => ({ couriers: s.couriers.map((c) => (c.id === id ? { ...c, active: !c.active } : c)) }));

export const addCourier = (name, phone, password = "0000") =>
  setState((s) => ({ couriers: [...s.couriers, { id: "c" + Date.now(), name, phone, active: true, password }] }));

export const addMerchant = (name, cat, phone, password = "0000") =>
  setState((s) => ({ merchants: [...s.merchants, { id: "m" + Date.now(), name, cat, phone, password }] }));

export const placeOrder = (items, extra = {}) => {
  const s = state;
  const addr = s.addresses.find((a) => a.id === s.selectedAddress) || s.addresses[0];
  const customer = {
    name: s.texts.customerName,
    phone: addr?.phone || "0770 000 0000",
    address: addr ? `${addr.label} — ${addr.details}` : s.texts.address,
  };
  items = items.map((i) => ({ ...i, merchantId: i.merchantId || findProduct(i.id)?.merchantId || "m1" }));
  const subtotal = items.reduce((a, i) => a + i.priceIQD * i.qty, 0);
  const fee = subtotal >= s.settings.freeAbove ? 0 : s.settings.deliveryFee;
  const tip = extra.tip || 0;
  const mids = [...new Set(items.map((i) => i.merchantId))];
  const merchantId = mids[0] || "m1";
  const merchantCount = mids.length;
  const readiness = Object.fromEntries(mids.map((m) => [m, false]));
  const order = {
    id: s.nextOrderId, items, merchantId, merchantCount, readiness, courierId: null, status: "جديد",
    time: new Date().toISOString(), customer, mine: true,
    lat: addr?.lat, lng: addr?.lng,
    subtotal, fee, serviceFee: s.settings.serviceFee, tip,
    discount: extra.discount || 0, couponCode: extra.couponCode || null,
    payMethod: extra.payMethod || "نقداً عند الاستلام",
    note: extra.note || "",
    total: Math.max(0, subtotal + fee + s.settings.serviceFee + tip - (extra.discount || 0)),
  };
  // إنقاص كمية المخزون للمنتجات المطلوبة (إن كانت تُدار بالكمية)
  const soldQty = {};
  items.forEach((i) => { soldQty[i.id] = (soldQty[i.id] || 0) + i.qty; });
  const products = s.products.map((p) => {
    if (p.qty == null || !soldQty[p.id]) return p;
    const q = Math.max(0, p.qty - soldQty[p.id]);
    return { ...p, qty: q, stock: q > 0 };
  });
  const coupons = extra.couponCode ? (s.coupons || []).map((c) => (c.code === extra.couponCode ? { ...c, uses: (c.uses || 0) + 1 } : c)) : s.coupons;
  setState({ orders: [order, ...s.orders], nextOrderId: s.nextOrderId + 1, products, coupons });
  afterOrderChange(order.id);
  return order;
};

// تحديث موقع التوصيل للطلب (موقع الزبون الحقيقي بالGPS)
export const updateOrderLocation = (id, coords) => {
  if (!coords) return;
  setState((s) => ({ orders: s.orders.map((o) => (o.id === id ? { ...o, lat: coords.lat, lng: coords.lng } : o)) }));
  afterOrderChange(id);
};
// تحديث موقع المندوب الحيّ (يُبثّ للزبون لحظياً)
export const updateCourierLocation = (id, coords) => {
  if (!coords) return;
  setState((s) => ({ orders: s.orders.map((o) => (o.id === id ? { ...o, courierLat: coords.lat, courierLng: coords.lng, courierAt: Date.now() } : o)) }));
  afterOrderChange(id);
};
// تقييم الزبون للطلب والمندوب بعد التوصيل
export const rateOrder = (id, rating) => { setState((s) => ({ orders: s.orders.map((o) => (o.id === id ? { ...o, rating: { orderStars: rating.orderStars, courierStars: rating.courierStars, comment: rating.comment || "", at: Date.now() } } : o)) })); afterOrderChange(id); };

// تسوية التاجر: الأدمن يدفع مستحقات الطلبات المُسلّمة غير المسوّاة → بانتظار تأكيد التاجر
export const settleMerchant = (mid, amount, orderIds) => {
  if (!amount || !orderIds.length) return;
  setState((s) => ({
    settlements: [{
      id: "st" + Date.now(), kind: "merchant", partyId: mid, amount,
      orders: orderIds, time: new Date().toISOString(), status: "بانتظار التأكيد",
    }, ...s.settlements],
  }));
};
// تسليم نقد المندوب للإدارة → بانتظار تأكيد الأدمن
export const courierRemit = (cid, amount, orderIds) => {
  if (!amount || !orderIds.length) return;
  setState((s) => ({
    settlements: [{
      id: "st" + Date.now(), kind: "courier", partyId: cid, amount,
      orders: orderIds, time: new Date().toISOString(), status: "بانتظار التأكيد",
    }, ...s.settlements],
  }));
};
export const confirmSettlement = (id) =>
  setState((s) => ({ settlements: s.settlements.map((x) => (x.id === id ? { ...x, status: "مؤكدة" } : x)) }));

export const cancelOrder = (id) => { _cancelOrder(id); afterOrderChange(id); };
const _cancelOrder = (id) =>
  setState((s) => ({ orders: s.orders.map((o) => (o.id === id && o.status === "جديد" ? { ...o, status: "ملغي" } : o)) }));

export const addAddress = (label, details, phone, coords) => {
  const id = "a" + Date.now();
  setState((s) => ({ addresses: [...s.addresses, { id, label, details, phone, lat: coords?.lat, lng: coords?.lng }], selectedAddress: id }));
};
export const selectAddress = (id) => setState({ selectedAddress: id });
export const removeAddress = (id) =>
  setState((s) => ({
    addresses: s.addresses.filter((a) => a.id !== id),
    selectedAddress: s.selectedAddress === id ? (s.addresses[0]?.id || null) : s.selectedAddress,
  }));

export const updateAppearance = (patch) =>
  setState((s) => ({ appearance: { ...s.appearance, ...patch } }));

export const updateTexts = (patch) =>
  setState((s) => ({ texts: { ...s.texts, ...patch } }));

export const updateMerchant = (id, patch) =>
  setState((s) => ({ merchants: s.merchants.map((m) => (m.id === id ? { ...m, ...patch } : m)) }));

export const addBanner = () =>
  setState((s) => ({ banners: [...s.banners, { id: "b" + Date.now(), t: "عنوان جديد", sub: "وصف قصير", cta: "تسوّق", e: "🛍️", bg: "linear-gradient(120deg,#0C831F,#0a6b1a)", fg: "#fff" }] }));
export const updateBanner = (id, patch) =>
  setState((s) => ({ banners: s.banners.map((b) => (b.id === id ? { ...b, ...patch } : b)) }));
export const removeBanner = (id) =>
  setState((s) => ({ banners: s.banners.filter((b) => b.id !== id) }));

export const updateTrio = (i, patch) =>
  setState((s) => ({ trio: s.trio.map((t, x) => (x === i ? { ...t, ...patch } : t)) }));

export const addBigStore = () =>
  setState((s) => ({ bigStores: [...s.bigStores, { id: "g" + Date.now(), t: "متجر جديد", sub: "وصف", e: "🏬", bg: "#EFEFEF" }] }));
export const updateBigStore = (id, patch) =>
  setState((s) => ({ bigStores: s.bigStores.map((b) => (b.id === id ? { ...b, ...patch } : b)) }));
export const removeBigStore = (id) =>
  setState((s) => ({ bigStores: s.bigStores.filter((b) => b.id !== id) }));

export const ORDER_STATUSES = ["جديد", "قيد التجهيز", "جاهز للتوصيل", "في الطريق", "وصل المندوب", "تم التوصيل", "ملغي"];
