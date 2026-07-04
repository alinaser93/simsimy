/* نظام الإشعارات — إشعارات متصفح حقيقية (تظهر حتى والتطبيق بالخلفية) + نغمة تنبيه.
   يعمل لكل الأطراف: زبون، تاجر، مندوب، أدمن. */

// هل الإشعارات مدعومة؟
export function notifySupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

// حالة الإذن الحالية: granted | denied | default | unsupported
export function notifyPermission() {
  if (!notifySupported()) return "unsupported";
  return Notification.permission;
}

// اطلب إذن الإشعارات من المستخدم
export async function requestNotifyPermission() {
  if (!notifySupported()) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  try { return await Notification.requestPermission(); } catch { return "denied"; }
}

// أظهر إشعاراً (إن كان الإذن ممنوحاً)
export function showNotification(title, body, opts = {}) {
  try {
    if (notifySupported() && Notification.permission === "granted") {
      const n = new Notification(title, {
        body,
        icon: opts.icon || "/vite.svg",
        badge: opts.icon || "/vite.svg",
        tag: opts.tag,            // نفس الوسم يستبدل الإشعار السابق بدل تكديسه
        renotify: !!opts.renotify,
        silent: false,
      });
      n.onclick = () => { try { window.focus(); } catch { /* تجاهل */ } if (opts.onClick) opts.onClick(); n.close(); };
      setTimeout(() => n.close(), opts.duration || 8000);
      return true;
    }
  } catch { /* المتصفح منع */ }
  return false;
}

// نغمة تنبيه قصيرة (fallback أو مع الإشعار)
export function playBeep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    const t = ctx.currentTime;
    const tone = (f, at) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine"; o.frequency.value = f;
      o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0001, t + at);
      g.gain.exponentialRampToValueAtTime(0.22, t + at + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + at + 0.25);
      o.start(t + at); o.stop(t + at + 0.3);
    };
    tone(880, 0); tone(1245, 0.18);
  } catch { /* منع الصوت قبل أول تفاعل */ }
}

// تنبيه موحّد: نغمة + إشعار متصفح
export function alertBoth(title, body, opts = {}) {
  if (opts.sound !== false) playBeep();
  showNotification(title, body, opts);
}
