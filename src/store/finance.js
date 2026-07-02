/* حسابات المالية — دوال نقية تُستدعى من لوحات الأدمن والتاجر والمندوب.
   المنطق (كما في المتاجر الكبرى):
   • حصة كل تاجر من الطلب = مجموع أسعار عناصره.
   • عمولة الأدمن = حصة التاجر × نسبة عمولته.
   • مستحق التاجر = حصته − العمولة.
   • أجرة المندوب = أساسية + إضافة لكل متجر إضافي (تُختم على الطلب عند التسليم).
   • النقد بذمة المندوب (للطلبات النقدية) = إجمالي الطلب − أجرته − بقشيشه. */

export const DELIVERED = "تم التوصيل";

// حصص التجار من عناصر طلب واحد: { m1: 4500, m2: 2000, ... }
export const orderMerchantGoods = (order) => {
  const map = {};
  (order.items || []).forEach((i) => {
    const mid = i.merchantId || order.merchantId || "m1";
    map[mid] = (map[mid] || 0) + i.priceIQD * i.qty;
  });
  return map;
};

export const commissionPct = (merchant) => (merchant?.commission ?? 10);

export const courierWageOf = (order, settings) =>
  order.courierWage ??
  ((settings?.courierBase ?? 1500) + (settings?.courierExtra ?? 500) * Math.max(0, (order.merchantCount || 1) - 1));

// معرفات الطلبات المسوّاة سابقاً لطرف معيّن
export const settledIds = (settlements, kind, partyId) =>
  new Set(
    (settlements || [])
      .filter((s) => s.kind === kind && s.partyId === partyId)
      .flatMap((s) => s.orders || [])
  );

// مستحقات تاجر غير المسوّاة: { amount, orders: [{id, goods, commission, due}] }
export const merchantDues = (state, mid) => {
  const merchant = state.merchants.find((m) => m.id === mid);
  const done = settledIds(state.settlements, "merchant", mid);
  const rows = [];
  state.orders.forEach((o) => {
    if (o.status !== DELIVERED || done.has(o.id)) return;
    const goods = orderMerchantGoods(o)[mid];
    if (!goods) return;
    const commission = Math.round(goods * commissionPct(merchant) / 100);
    rows.push({ id: o.id, time: o.time, goods, commission, due: goods - commission });
  });
  return { amount: rows.reduce((a, r) => a + r.due, 0), rows };
};

// فواتير التاجر كاملة (مسوّاة وغير مسوّاة) لعرض سجل المحفظة
export const merchantInvoices = (state, mid) => {
  const merchant = state.merchants.find((m) => m.id === mid);
  const done = settledIds(state.settlements, "merchant", mid);
  return state.orders
    .filter((o) => o.status === DELIVERED && orderMerchantGoods(o)[mid])
    .map((o) => {
      const goods = orderMerchantGoods(o)[mid];
      const commission = Math.round(goods * commissionPct(merchant) / 100);
      return { id: o.id, time: o.time, goods, commission, due: goods - commission, settled: done.has(o.id) };
    });
};

// النقد بذمة المندوب (طلبات نقدية مُسلّمة غير مسوّاة): { amount, orders, earnings }
export const courierCash = (state, cid) => {
  const done = settledIds(state.settlements, "courier", cid);
  const rows = [];
  state.orders.forEach((o) => {
    if (o.status !== DELIVERED || o.courierId !== cid) return;
    const wage = courierWageOf(o, state.settings);
    const cod = (o.payMethod || "").includes("نقد");
    const collected = cod ? o.total : 0;
    const keep = wage + (o.tip || 0);
    rows.push({
      id: o.id, time: o.time, cod, collected, wage, tip: o.tip || 0,
      remit: cod ? Math.max(0, o.total - keep) : 0,
      settled: done.has(o.id),
    });
  });
  const open = rows.filter((r) => r.cod && !r.settled);
  return {
    rows,
    remitDue: open.reduce((a, r) => a + r.remit, 0),
    remitOrderIds: open.map((r) => r.id),
    wages: rows.reduce((a, r) => a + r.wage, 0),
    tips: rows.reduce((a, r) => a + r.tip, 0),
  };
};

// ملخص مالية الأدمن خلال فترة: sinceMs = null للكل
export const financeSummary = (state, sinceMs = null) => {
  const since = sinceMs ? Date.now() - sinceMs : 0;
  let revenue = 0, commissions = 0, deliveryFees = 0, serviceFees = 0, wages = 0, deliveredCount = 0;
  state.orders.forEach((o) => {
    if (o.status !== DELIVERED) return;
    if (new Date(o.time).getTime() < since) return;
    deliveredCount++;
    revenue += o.total;
    deliveryFees += o.fee || 0;
    serviceFees += o.serviceFee || 0;
    wages += courierWageOf(o, state.settings);
    const goods = orderMerchantGoods(o);
    Object.entries(goods).forEach(([mid, g]) => {
      const m = state.merchants.find((x) => x.id === mid);
      commissions += Math.round(g * commissionPct(m) / 100);
    });
  });
  return {
    deliveredCount, revenue, commissions, deliveryFees, serviceFees, wages,
    net: commissions + deliveryFees + serviceFees - wages,
  };
};
