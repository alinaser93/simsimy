import { useState } from "react";
import {
  ChevronRight, ChevronLeft, ShoppingBag, Wallet, HelpCircle, MapPin, Heart,
  CreditCard, Gift, Bell, Share2, Info, Shield, Phone, Moon, Sun, LogOut, Pencil, User, Cake,
} from "lucide-react";
import { fmt } from "../utils/currency.js";
import { useStore, updateUser } from "../store/appStore.js";
import { requestNotifyPermission, notifyPermission } from "../utils/notify.js";

/* الصفحة الشخصية — بأسلوب بلينكيت، معرّبة لمتجر عراقي */
export default function ProfilePage({ onBack, onOrders, onAddress, onWishlist, onWallet, onHelp, onLogin }) {
  const user = useStore((s) => s.user);
  const wishlist = useStore((s) => s.wishlist);
  const orders = useStore((s) => s.orders);
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState(user);

  const initial = (user.name || "ز").trim().charAt(0);
  const saveEdit = () => { updateUser(form); setEdit(false); };

  const Row = ({ Icon, label, sub, onClick, danger, color }) => (
    <div className={"pf-row" + (danger ? " danger" : "")} onClick={onClick}>
      <span className="ic" style={color ? { color } : undefined}><Icon size={19} strokeWidth={2} /></span>
      <span className="tx"><b>{label}</b>{sub && <small>{sub}</small>}</span>
      <ChevronLeft size={18} className="chev" />
    </div>
  );

  const share = () => {
    const url = window.location.origin;
    if (navigator.share) navigator.share({ title: "بلينكيت", text: "اطلب بقالتك بأسرع توصيل!", url }).catch(() => {});
    else { navigator.clipboard?.writeText(url); alert("تم نسخ رابط التطبيق ✓"); }
  };

  return (
    <div className="pf-page">
      {/* الرأس */}
      <div className="pf-top">
        <button className="pf-back" onClick={onBack}><ChevronRight size={24} /></button>
        <h2>حسابي</h2>
      </div>

      <div className="pf-scroll">
        {/* بطاقة المستخدم */}
        {!user.loggedIn ? (
          <div className="pf-loginprompt" onClick={onLogin}>
            <div className="pf-avatar"><User size={26} /></div>
            <div className="pf-uinfo">
              <div className="pf-name">سجّل الدخول</div>
              <div className="pf-phone" style={{ direction: "rtl", textAlign: "right" }}>للطلب وحفظ عناوينك ومفضّلتك</div>
            </div>
            <button className="pf-loginbtn">دخول</button>
          </div>
        ) : (
          <div className="pf-user">
            <div className="pf-avatar">{initial}</div>
            <div className="pf-uinfo">
              {edit ? (
                <input className="pf-name-input" value={form.name} placeholder="اكتب اسمك" autoFocus
                  onChange={(e) => setForm({ ...form, name: e.target.value })} />
              ) : (
                <div className="pf-name">{user.name || "أضف اسمك"}</div>
              )}
              <div className="pf-phone" dir="ltr">{user.phone}</div>
            </div>
            {edit ? (
              <button className="pf-save" onClick={saveEdit}>حفظ</button>
            ) : (
              <button className="pf-editbtn" onClick={() => { setForm(user); setEdit(true); }}><Pencil size={16} /></button>
            )}
          </div>
        )}

        {edit && (
          <div className="pf-editfields">
            <div className="pf-fld"><Cake size={16} /><input placeholder="تاريخ ميلادك (يوم/شهر)" value={form.birthday}
              onChange={(e) => setForm({ ...form, birthday: e.target.value })} /></div>
            <div className="pf-fld"><Phone size={16} /><input placeholder="رقم الهاتف" value={form.phone} dir="ltr"
              onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          </div>
        )}

        {/* بطاقة نقاط الولاء */}
        <div className="pf-points">
          <div className="pf-points-l">
            <span className="pf-points-ic">🎁</span>
            <div>
              <div className="pf-points-val">{user.points || 0} <small>نقطة</small></div>
              <div className="pf-points-sub">تساوي {fmt((user.points || 0) * 10)} د.ع خصم</div>
            </div>
          </div>
          <div className="pf-points-hint">اجمع نقاطاً مع كل طلب واستبدلها خصماً!</div>
        </div>

        {/* البطاقات الثلاث السريعة */}
        <div className="pf-cards">
          <div className="pf-card" onClick={onOrders}>
            <ShoppingBag size={22} /><span>طلباتي</span>
            {orders.length > 0 && <em>{orders.length}</em>}
          </div>
          <div className="pf-card" onClick={onWallet}>
            <Wallet size={22} /><span>محفظتي</span>
          </div>
          <div className="pf-card" onClick={onHelp}>
            <HelpCircle size={22} /><span>المساعدة</span>
          </div>
        </div>

        {/* الإعدادات */}
        <div className="pf-sec">
          <div className="pf-sectitle">الإعدادات</div>
          <div className="pf-row" onClick={async () => {
            if (user.notifications) { updateUser({ notifications: false }); return; }
            const perm = await requestNotifyPermission();
            if (perm === "granted") updateUser({ notifications: true });
            else if (perm === "denied") alert("الإشعارات محظورة — فعّلها من إعدادات المتصفح لهذا الموقع");
            else if (perm === "unsupported") alert("متصفحك لا يدعم الإشعارات");
            else updateUser({ notifications: true });
          }}>
            <span className="ic"><Bell size={19} strokeWidth={2} /></span>
            <span className="tx"><b>إشعارات الطلبات</b><small>تنبيهك بحالة طلبك: التجهيز، الطريق، الوصول</small></span>
            <span className={"pf-switch" + (user.notifications ? " on" : "")}><i /></span>
          </div>
        </div>

        {/* معلوماتي */}
        <div className="pf-sec">
          <div className="pf-sectitle">معلوماتي</div>
          <Row Icon={MapPin} label="دفتر العناوين" sub="أضف أو عدّل عناوين التوصيل" onClick={onAddress} color="#E23744" />
          <Row Icon={Heart} label="قائمة المفضّلة" sub={wishlist.length ? `${wishlist.length} منتج` : "لم تضف بعد"} onClick={onWishlist} color="#E23744" />
          <Row Icon={CreditCard} label="طرق الدفع" sub="الدفع عند الاستلام مفعّل" onClick={() => alert("الدفع عند الاستلام مفعّل حالياً")} color="#0C831F" />
          <Row Icon={Gift} label="قسائم الهدايا" sub="أدخل رمز قسيمة" onClick={() => alert("لا توجد قسائم متاحة حالياً")} color="#7c3aed" />
        </div>

        {/* أخرى */}
        <div className="pf-sec">
          <div className="pf-sectitle">أخرى</div>
          <Row Icon={Share2} label="شارك التطبيق" onClick={share} />
          <Row Icon={Info} label="من نحن" onClick={() => alert("بلينكيت — أسرع توصيل بقالة في مدينتك. نوصلك طلبك خلال دقائق.")} />
          <Row Icon={Shield} label="سياسة الخصوصية" onClick={() => alert("نحترم خصوصيتك ونحمي بياناتك. تُستخدم معلوماتك فقط لإتمام طلباتك.")} />
          <Row Icon={Phone} label="تواصل معنا" sub="خدمة العملاء على مدار الساعة" onClick={onHelp} />
        </div>

        {user.loggedIn && (
          <button className="pf-logout" onClick={() => { if (confirm("تسجيل الخروج من حسابك؟")) { updateUser({ name: "", phone: "", loggedIn: false }); onBack(); } }}>
            <LogOut size={18} /> تسجيل الخروج
          </button>
        )}

        <div className="pf-version">بلينكيت • الإصدار 1.0</div>
      </div>
    </div>
  );
}
