import { useState } from "react";
import { ChevronRight, Search, Plus, MapPin, Trash2 } from "lucide-react";
import { useStore, addAddress, selectAddress, removeAddress } from "../store/appStore.js";

/* اختيار موقع التوصيل + إضافة عنوان جديد — كما في التطبيق الأصلي */
export default function AddressPage({ onBack }) {
  const addresses = useStore((s) => s.addresses);
  const selected = useStore((s) => s.selectedAddress);
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ label: "المنزل", details: "", phone: "" });

  const save = () => {
    if (!f.details) return;
    addAddress(f.label || "عنوان", f.details, f.phone || "0770 000 0000");
    setAdding(false);
    setF({ label: "المنزل", details: "", phone: "" });
    onBack();
  };

  return (
    <div className="bk-page">
      <div className="bk-phead">
        <div className="bk-back" onClick={onBack}><ChevronRight size={22} strokeWidth={2.5} /></div>
        <div className="ti">اختر موقع التوصيل</div>
      </div>

      <div className="bk-pbody">
        <div className="bk-srch-head" style={{ borderBottom: "none", background: "transparent" }}>
          <div className="bk-srch-in"><Search size={17} color="#8a8a8a" /><input placeholder="ابحث عن منطقة، اسم شارع…" /></div>
        </div>

        {!adding ? (
          <div className="bk-addr-add" onClick={() => setAdding(true)}><Plus size={18} strokeWidth={2.6} /> إضافة عنوان جديد</div>
        ) : (
          <div className="bk-cardbox" style={{ padding: 14 }}>
            <div className="pt-field"><label>التسمية</label>
              <div className="bk-chips" style={{ padding: 0 }}>
                {["المنزل", "العمل", "أخرى"].map((l) => (
                  <span key={l} className={"bk-chip" + (f.label === l ? " on" : "")} onClick={() => setF({ ...f, label: l })}>{l}</span>
                ))}
              </div>
            </div>
            <div className="pt-field"><label>تفاصيل العنوان (المنطقة، الشارع، الدار/الطابق)</label>
              <input className="pt-in" placeholder="مثال: الكرادة، شارع 62، بناية 14، ط2" value={f.details}
                onChange={(e) => setF({ ...f, details: e.target.value })} /></div>
            <div className="pt-field"><label>رقم الهاتف</label>
              <input className="pt-in" dir="ltr" placeholder="07xx xxx xxxx" value={f.phone}
                onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="pt-btn" style={{ flex: 1 }} onClick={save}>حفظ العنوان</button>
              <button className="pt-btn ghost" onClick={() => setAdding(false)}>إلغاء</button>
            </div>
          </div>
        )}

        <div className="bk-srch-sec" style={{ paddingBottom: 6 }}>عناوينك المحفوظة</div>
        <div className="bk-cardbox">
          {addresses.map((a) => (
            <div className="bk-addr-card" key={a.id} onClick={() => { selectAddress(a.id); onBack(); }}>
              <span className="e">{a.label === "العمل" ? "🏢" : "🏠"}</span>
              <div className="inf">
                <b>{a.label} {selected === a.id && <span style={{ color: "#0C831F", fontSize: 10.5 }}>· المحدد ✓</span>}</b>
                <span>{a.details}</span>
                <div className="ph">📞 {a.phone}</div>
              </div>
              {addresses.length > 1 && (
                <Trash2 size={16} color="#b3261e" style={{ marginTop: 4 }}
                  onClick={(e) => { e.stopPropagation(); removeAddress(a.id); }} />
              )}
            </div>
          ))}
        </div>
        <div className="bk-tip-note" style={{ paddingTop: 8 }}><MapPin size={12} style={{ verticalAlign: -2 }} /> اختيارك يُستخدم في حساب زمن التوصيل وظهور العنوان أعلى المتجر.</div>
      </div>
    </div>
  );
}
