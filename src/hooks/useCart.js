import { useState, useCallback, useEffect } from "react";
import { getState, findProduct, useStore } from "../store/appStore.js";

const CART_KEY = "bk-cart-v1";
// حمّل السلة المحفوظة (تبقى بعد التحديث/الخروج)
const loadCart = () => {
  try { const r = JSON.parse(localStorage.getItem(CART_KEY)); return r && typeof r === "object" ? r : { cart: {}, order: [] }; }
  catch { return { cart: {}, order: [] }; }
};

// منطق السلة كاملاً: الإضافة/الزيادة/الإنقاص + الإجمالي والتوفير بالدينار (مع حفظ دائم)
export function useCart() {
  const saved = loadCart();
  const [cart, setCart] = useState(saved.cart || {});
  const [order, setOrder] = useState(saved.order || []); // ترتيب الإضافة لعرض الأحدث في شريط السلة
  const products = useStore((s) => s.products); // لتحديث الإجماليات عند تغيّر الأسعار

  // احفظ السلة في localStorage عند أي تغيير
  useEffect(() => {
    try { localStorage.setItem(CART_KEY, JSON.stringify({ cart, order })); } catch { /* تجاهل */ }
  }, [cart, order]);

  const remember = (id) => setOrder((o) => (o.includes(+id) ? o : [...o, +id]));
  const forget = (id) => setOrder((o) => o.filter((x) => x !== +id));

  const add = useCallback((id) => {
    const p = findProduct(id);
    if (!p || p.stock === false || !getState().settings.storeOpen) return;
    if (p.qty != null && p.qty < 1) return;              // نفد المخزون
    setCart((c) => ({ ...c, [id]: 1 }));
    remember(id);
  }, []);
  // لا تتجاوز الكمية المتوفّرة فعلياً في المخزون
  const inc = useCallback((id) => {
    const p = findProduct(id);
    setCart((c) => {
      const cur = c[id] || 0;
      if (p && p.qty != null && cur >= p.qty) return c;   // بلغنا أقصى المتوفّر
      return { ...c, [id]: cur + 1 };
    });
    remember(id);
  }, []);
  const dec = useCallback((id) => setCart((c) => {
    const n = (c[id] || 0) - 1; const nc = { ...c };
    if (n <= 0) { delete nc[id]; forget(id); } else nc[id] = n; return nc;
  }), []);
  const clear = useCallback(() => { setCart({}); setOrder([]); }, []);

  const lookup = (id) => products.find((p) => p.id === +id);
  // المنتجات الموجودة فعلاً في السلة مرتبةً من الأحدث إضافةً
  const recentItems = [...order].reverse().map(lookup).filter((p) => p && cart[p.id]);
  const count = Object.values(cart).reduce((a, b) => a + b, 0);
  const total = Object.entries(cart).reduce((a, [id, q]) => a + (lookup(id)?.priceIQD || 0) * q, 0);
  const savings = Object.entries(cart).reduce((a, [id, q]) => {
    const p = lookup(id); return a + (p ? (p.mrpIQD - p.priceIQD) * q : 0);
  }, 0);

  return { cart, add, inc, dec, clear, count, total, savings, recentItems };
}
