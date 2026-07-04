/* مزامنة الطلبات الحيّة عبر Supabase Realtime.
   يجعل الطلبات تتزامن لحظياً بين أجهزة مختلفة (زبون/تاجر/مندوب/أدمن).
   يعمل فوق التخزين المحلي: إن تعذّر Supabase، يبقى التطبيق يعمل محلياً كالمعتاد. */
import { createClient } from "@supabase/supabase-js";
import { SUPABASE } from "../config.js";
import { getState, setState } from "./appStore.js";

let client = null;
let ready = false;
let pushingIds = new Set(); // لتجنّب حلقة الصدى (echo)

// ادمج طلباً واحداً في الحالة المحلية (تحديث أو إضافة)
function mergeOne(order) {
  if (!order || order.id == null) return;
  setState((s) => {
    const exists = s.orders.some((o) => o.id === order.id);
    const orders = exists
      ? s.orders.map((o) => (o.id === order.id ? { ...o, ...order } : o))
      : [order, ...s.orders];
    // حدّث nextOrderId ليتجاوز أي معرّف وارد
    const maxId = orders.reduce((m, o) => Math.max(m, typeof o.id === "number" ? o.id : 0), 0);
    return { orders, nextOrderId: Math.max(s.nextOrderId, maxId + 1) };
  });
}

function removeOne(id) {
  setState((s) => ({ orders: s.orders.filter((o) => o.id !== id) }));
}

// تهيئة المزامنة: تحميل أوّلي + اشتراك حيّ
export async function initSync() {
  if (ready || !SUPABASE?.url || !SUPABASE?.anonKey) return ready;
  try {
    client = createClient(SUPABASE.url, SUPABASE.anonKey, {
      realtime: { params: { eventsPerSecond: 5 } },
    });

    // 1) تحميل أوّلي لكل الطلبات من القاعدة
    const { data, error } = await client.from("orders").select("id,data").order("updated_at", { ascending: false }).limit(200);
    if (!error && Array.isArray(data)) {
      data.forEach((row) => { if (row.data) mergeOne(row.data); });
    }

    // 2) اشتراك حيّ: أي تغيير من أي جهاز يصل فوراً
    client
      .channel("orders-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (payload) => {
        if (payload.eventType === "DELETE") { removeOne(payload.old?.id); return; }
        const order = payload.new?.data;
        if (order && !pushingIds.has(order.id)) mergeOne(order); // تجاهل صدى تعديلاتنا
      })
      .subscribe();

    ready = true;
    return true;
  } catch (e) {
    console.warn("Supabase sync unavailable:", e?.message);
    return false;
  }
}

// ادفع طلباً للقاعدة (يُنادى بعد أي تغيير محلي على الطلب)
export async function pushOrder(orderId) {
  if (!client || !ready) return;
  const order = getState().orders.find((o) => o.id === orderId);
  if (!order) return;
  pushingIds.add(orderId);
  try {
    await client.from("orders").upsert({ id: order.id, data: order, updated_at: new Date().toISOString() });
  } catch (e) { /* تجاهل — يبقى محلياً */ }
  setTimeout(() => pushingIds.delete(orderId), 800);
}

export function isSyncReady() { return ready; }
