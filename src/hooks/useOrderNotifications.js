import { useEffect, useRef } from "react";
import { useStore } from "../store/appStore.js";
import { showNotification, playBeep } from "../utils/notify.js";

// رسائل كل حالة طلب
const MSGS = {
  "جديد": ["🧾 تم استلام طلبك", "سنبدأ بتجهيزه حالاً"],
  "قيد التجهيز": ["👨‍🍳 يُجهّز طلبك الآن", "المتجر يغلّف منتجاتك بعناية"],
  "جاهز للتوصيل": ["📦 طلبك جاهز", "بانتظار المندوب لاستلامه"],
  "في الطريق": ["🛵 المندوب في الطريق إليك", "اقترب من عنوانك — تابعه على الخريطة"],
  "وصل المندوب": ["🚪 وصل المندوب", "افتح الباب واستلم طلبك"],
  "تم التوصيل": ["✅ تم توصيل طلبك", "بالعافية! نراك في الطلب القادم"],
  "ملغي": ["❌ أُلغي طلبك", "نأسف على الإزعاج"],
};

/* إشعارات الطلب — تعمل في كل أنحاء التطبيق (لا تتطلّب فتح صفحة التتبّع).
   ترسل إشعار متصفح + نغمة عند أي تغيّر في حالة طلبات الزبون. */
export default function useOrderNotifications() {
  const orders = useStore((s) => s.orders);
  const enabled = useStore((s) => s.user.notifications);
  const seen = useRef(null);   // { [orderId]: status }

  useEffect(() => {
    const mine = orders.filter((o) => o.mine);
    const cur = Object.fromEntries(mine.map((o) => [o.id, o.status]));
    if (seen.current === null) { seen.current = cur; return; }   // أول تحميل: سجّل بلا إشعار
    if (enabled) {
      mine.forEach((o) => {
        const prev = seen.current[o.id];
        if (prev && prev !== o.status) {
          const m = MSGS[o.status];
          if (m) {
            playBeep();
            showNotification(`${m[0]} · طلب #${o.id}`, o.status === "ملغي" && o.rejectReason ? o.rejectReason : m[1], { tag: "order-" + o.id, renotify: true });
          }
        }
      });
    }
    seen.current = cur;
  }, [orders, enabled]);
}
