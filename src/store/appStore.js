import { useSyncExternalStore } from "react";
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
    settings: {
      promoText: "⚡ اطلب الآن واحصل على توصيل مجاني",
      eta: 12,
      deliveryFee: 1000,
      serviceFee: 250,          // رسوم الخدمة تظهر في الفاتورة
      freeAbove: 25000,         // توصيل مجاني فوق هذا المبلغ
      tipOptions: [250, 500, 1000], // خيارات بقشيش المندوب
      storeOpen: true,
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
    addresses: [
      { id: "a1", label: "المنزل", details: "علي، 22، منطقة راجباث", phone: "0770 000 0000" },
      { id: "a2", label: "العمل", details: "شارع السعدون، بناية 40، ط3", phone: "0770 000 0000" },
    ],
    selectedAddress: "a1",
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
  ["banners", "trio", "bigStores", "addresses"].forEach((k) => { if (!Array.isArray(saved[k])) out[k] = d[k]; });
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

export const updateSettings = (patch) =>
  setState((s) => ({ settings: { ...s.settings, ...patch } }));

// جاهزية التاجر (بوابة الجاهزية): عندما تكتمل كل المتاجر ينتقل الطلب تلقائياً لـ«جاهز للتوصيل»
export const setMerchantReady = (orderId, mid, val = true) =>
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

export const assignCourier = (id, courierId) =>
  setState((s) => ({ orders: s.orders.map((o) => (o.id === id ? { ...o, courierId } : o)) }));

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
    subtotal, fee, serviceFee: s.settings.serviceFee, tip,
    payMethod: extra.payMethod || "نقداً عند الاستلام",
    note: extra.note || "",
    total: subtotal + fee + s.settings.serviceFee + tip,
  };
  setState({ orders: [order, ...s.orders], nextOrderId: s.nextOrderId + 1 });
  return order;
};

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

export const cancelOrder = (id) =>
  setState((s) => ({ orders: s.orders.map((o) => (o.id === id && o.status === "جديد" ? { ...o, status: "ملغي" } : o)) }));

export const addAddress = (label, details, phone) => {
  const id = "a" + Date.now();
  setState((s) => ({ addresses: [...s.addresses, { id, label, details, phone }], selectedAddress: id }));
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
