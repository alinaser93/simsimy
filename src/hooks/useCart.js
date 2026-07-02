import { useState, useCallback } from "react";
import { getState, findProduct, useStore } from "../store/appStore.js";

// منطق السلة كاملاً: الإضافة/الزيادة/الإنقاص + الإجمالي والتوفير بالدينار
export function useCart() {
  const [cart, setCart] = useState({});
  const [order, setOrder] = useState([]); // ترتيب الإضافة لعرض الأحدث في شريط السلة
  const products = useStore((s) => s.products); // لتحديث الإجماليات عند تغيّر الأسعار

  const remember = (id) => setOrder((o) => (o.includes(+id) ? o : [...o, +id]));
  const forget = (id) => setOrder((o) => o.filter((x) => x !== +id));

  const add = useCallback((id) => {
    const p = findProduct(id);
    if (!p || p.stock === false || !getState().settings.storeOpen) return;
    setCart((c) => ({ ...c, [id]: 1 }));
    remember(id);
  }, []);
  const inc = useCallback((id) => { setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 })); remember(id); }, []);
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
