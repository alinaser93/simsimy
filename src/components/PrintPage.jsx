import { useState } from "react";
import { ChevronRight, FileText, Image as ImageIcon, Upload, Shield, Zap, Tag, Check, Loader2 } from "lucide-react";
import { placePrintOrder, useStore } from "../store/appStore.js";
import { uploadImage } from "../utils/supabase.js";
import { fmt, CUR } from "../utils/currency.js";

const OPTIONS = [
  { id: "docs", ic: FileText, t: "طباعة مستندات", d: "Word · PDF · صور — أبيض/أسود أو ملوّن، حجم A4", price: "من 250 د.ع/ورقة" },
  { id: "photos", ic: ImageIcon, t: "طباعة صور", d: "ورق فوتوغرافي لامع عالي الجودة، أحجام متعددة", price: "من 500 د.ع/صورة" },
  { id: "passport", ic: ImageIcon, t: "صور شخصية (جواز)", d: "أطقم 8 / 16 / 32 صورة — ورق 210 غرام", price: "من 3,000 د.ع" },
];

const FEATURES = [
  { ic: Shield, t: "آمن وخاص", d: "تُحذف ملفاتك بعد التوصيل مباشرة" },
  { ic: Zap, t: "توصيل سريع", d: "تستلم مطبوعاتك خلال دقائق" },
  { ic: Tag, t: "أفضل سعر", d: "أسعار تبدأ من 250 د.ع فقط" },
];

/* صفحة خدمة الطباعة (خانة الطابعة) */
const UNIT = { docs: 250, photos: 500, passport: 3000 };
export default function PrintPage({ onBack, onPlaced }) {
  const loggedIn = useStore((s) => s.user.loggedIn);
  const [picked, setPicked] = useState(null);
  const [files, setFiles] = useState([]); // {name, url, isImage, raw}
  const [color, setColor] = useState("bw");
  const [copies, setCopies] = useState(1);
  const [placing, setPlacing] = useState(false);

  // حساب السعر التقديري
  const unit = UNIT[picked] || 0;
  const colorMul = color === "color" ? 2 : 1;
  const price = picked === "passport" ? unit * files.length : unit * files.length * copies * (picked === "docs" ? colorMul : 1);
  const labels = { docs: "طباعة مستندات", photos: "طباعة صور", passport: "صور شخصية (جواز)" };

  const submit = async () => {
    if (files.length === 0) return;
    if (!loggedIn) { onPlaced && onPlaced(null, "login"); return; } // يتطلب تسجيل دخول
    setPlacing(true);
    // ارفع الصور لـSupabase كي يراها متجر الطباعة (المستندات تُحفظ بالاسم)
    const uploaded = [];
    for (const f of files) {
      let url = f.url;
      if (f.isImage && f.raw) { try { const up = await uploadImage(f.raw); if (up) url = up; } catch { /* يبقى الاسم */ } }
      uploaded.push({ name: f.name, isImage: f.isImage, url });
    }
    const label = `${labels[picked]}${picked !== "passport" ? ` (${color === "color" ? "ملوّن" : "أبيض/أسود"} × ${copies})` : ""} — ${files.length} ملف`;
    const order = placePrintOrder({ type: picked, label, color, copies, files: uploaded, price });
    setPlacing(false);
    onPlaced && onPlaced(order);
  };

  const onFiles = (e) => {
    const added = Array.from(e.target.files).map((f) => ({
      name: f.name,
      isImage: f.type.startsWith("image/"),
      url: f.type.startsWith("image/") ? URL.createObjectURL(f) : null,
      raw: f,
    }));
    setFiles([...files, ...added]);
  };

  return (
    <div className="bk-print-page">
      <div className="bk-print-head">
        <div className="bk-back" onClick={onBack}><ChevronRight size={22} strokeWidth={2.5} /></div>
        <h2>🖨️ الطباعة والتصوير</h2>
      </div>
      <div className="bk-print-body">
        <div className="bk-print-hero">
          <div className="bk-print-hero-ic">🖨️</div>
          <div>
            <b>اطبع مستنداتك وصورك</b>
            <span>ارفع ملفاتك ونوصّلها مطبوعة لباب بيتك</span>
          </div>
        </div>

        {/* المميزات */}
        <div className="bk-print-feats">
          {FEATURES.map((f, i) => (
            <div className="bk-print-feat" key={i}>
              <f.ic size={20} />
              <b>{f.t}</b>
              <small>{f.d}</small>
            </div>
          ))}
        </div>

        {/* أنواع الطباعة */}
        <div className="bk-print-sec-t">اختر نوع الطباعة</div>
        {OPTIONS.map((o) => (
          <div className={"bk-print-opt" + (picked === o.id ? " on" : "")} key={o.id} onClick={() => setPicked(o.id)}>
            <div className="bk-print-opt-ic"><o.ic size={22} /></div>
            <div className="bk-print-opt-inf">
              <b>{o.t}</b>
              <small>{o.d}</small>
              <span className="bk-print-opt-pr">{o.price}</span>
            </div>
            <span className={"bk-print-radio" + (picked === o.id ? " on" : "")}>{picked === o.id && <Check size={14} />}</span>
          </div>
        ))}

        {/* خيارات + رفع (عند اختيار نوع) */}
        {picked && (
          <>
            {picked !== "passport" && (
              <div className="bk-print-controls">
                <div className="bk-print-ctrl">
                  <label>اللون</label>
                  <div className="bk-print-seg">
                    <button className={color === "bw" ? "on" : ""} onClick={() => setColor("bw")}>أبيض/أسود</button>
                    <button className={color === "color" ? "on" : ""} onClick={() => setColor("color")}>ملوّن</button>
                  </div>
                </div>
                <div className="bk-print-ctrl">
                  <label>عدد النسخ</label>
                  <div className="bk-print-qty">
                    <button onClick={() => setCopies(Math.max(1, copies - 1))}>−</button><b>{copies}</b><button onClick={() => setCopies(copies + 1)}>+</button>
                  </div>
                </div>
              </div>
            )}
            <label className="bk-print-upload">
              <Upload size={20} />
              <b>ارفع {picked === "photos" || picked === "passport" ? "الصور" : "الملفات"}</b>
              <small>PDF · Word · JPG · PNG</small>
              <input type="file" multiple hidden accept={picked === "docs" ? ".pdf,.doc,.docx,image/*" : "image/*"} onChange={onFiles} />
            </label>
            {files.length > 0 && (
              <div className="bk-print-thumbs">
                {files.map((f, i) => (
                  <div className="bk-print-thumb" key={i}>
                    {f.isImage && f.url ? <img src={f.url} alt={f.name} /> : <div className="bk-print-thumb-doc"><FileText size={26} /><span>{f.name.split(".").pop().toUpperCase()}</span></div>}
                    <div className="bk-print-thumb-nm">{f.name}</div>
                    <button className="bk-print-thumb-x" onClick={() => setFiles(files.filter((_, x) => x !== i))}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <div className="bk-print-note">🔒 خصوصيتك مهمة — تُحذف ملفاتك تلقائياً بعد التوصيل. لا ترفع محتوى مخالفاً.</div>
        <div style={{ height: 90 }} />
      </div>

      {/* زرّ الطلب */}
      {picked && (
        <div className="bk-print-foot">
          {files.length > 0 && <div className="bk-print-total">الإجمالي التقديري: <b>{fmt(price)} {CUR}</b><small>+ رسوم التوصيل</small></div>}
          <button className="bk-print-order" disabled={files.length === 0 || placing}
            onClick={submit}>
            {placing ? <><Loader2 size={17} className="spin" /> جارٍ الإرسال…</> : files.length === 0 ? "ارفع ملفاتك للمتابعة" : `اطلب الطباعة (${fmt(price)} ${CUR})`}
          </button>
        </div>
      )}
    </div>
  );
}
