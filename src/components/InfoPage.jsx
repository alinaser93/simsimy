import { useState } from "react";
import { ChevronRight, MessageCircle, Phone, Clock, Info, Shield, FileText, HelpCircle } from "lucide-react";
import { useStore } from "../store/appStore.js";

// صفحات المعلومات: من نحن، الخصوصية، الشروط، الأسئلة الشائعة، تواصل معنا
export default function InfoPage({ topic, onBack }) {
  const appName = useStore((s) => s.texts.appName);
  const wa = useStore((s) => s.settings.whatsapp) || "07700000000";
  const waDigits = String(wa).replace(/\D/g, "");
  const [open, setOpen] = useState(0);

  const meta = {
    about: { icon: Info, title: "من نحن" },
    privacy: { icon: Shield, title: "سياسة الخصوصية" },
    terms: { icon: FileText, title: "الشروط والأحكام" },
    faq: { icon: HelpCircle, title: "الأسئلة الشائعة" },
    contact: { icon: Phone, title: "تواصل معنا" },
  }[topic] || { icon: Info, title: "معلومات" };
  const Icon = meta.icon;

  const P = ({ children }) => <p className="info-p">{children}</p>;
  const H = ({ children }) => <div className="info-h">{children}</div>;

  const faqs = [
    ["كم يستغرق التوصيل؟", `نوصل طلبك خلال دقائق معدودة من أقرب متجر إليك — عادةً خلال 10 إلى 20 دقيقة حسب موقعك وحالة الطلب.`],
    ["ما هي مناطق التوصيل؟", `نوصّل داخل المدينة وضواحيها. عند إدخال عنوانك يظهر لك إن كنّا نخدم منطقتك ووقت التوصيل المتوقّع.`],
    ["ما هي طرق الدفع؟", `الدفع نقداً عند الاستلام متاح، إضافةً إلى طرق الدفع الإلكترونية المتوفّرة عند إتمام الطلب.`],
    ["هل يوجد حد أدنى للطلب؟", `تقدر تطلب أي كمية. التوصيل مجاني للطلبات فوق حدٍّ معيّن يظهر لك في السلة، وإلا تُضاف رسوم توصيل بسيطة.`],
    ["كيف أتابع طلبي؟", `بعد تأكيد الطلب، تابعه لحظة بلحظة من صفحة «طلباتي» — من التجهيز حتى وصول المندوب إلى بابك على الخريطة.`],
    ["ماذا لو وصلني منتج تالف؟", `نستبدل أو نسترجع أي منتج تالف أو غير مطابق خلال 72 ساعة من الاستلام. تواصل معنا وسنحلّها فوراً.`],
    ["كيف أجمع النقاط؟", `تكسب نقاطاً مع كل طلب، وتقدر تستبدلها بخصومات على طلباتك القادمة. رصيدك يظهر في أعلى الصفحة الرئيسية.`],
  ];

  return (
    <div className="bk-page info-page" style={{ zIndex: 46 }}>
      <div className="info-head">
        <button className="pf-back" onClick={onBack}><ChevronRight size={24} /></button>
        <div className="info-head-t"><Icon size={20} strokeWidth={2.2} /> {meta.title}</div>
      </div>

      <div className="info-body">
        {topic === "about" && (
          <>
            <div className="info-hero"><span className="info-logo">🛒</span><b>{appName}</b><span>توصيل بقالتك خلال دقائق</span></div>
            <P>{appName} هو تطبيق توصيل سريع يوصّلك احتياجاتك اليومية — بقالة، خضار وفواكه، مشروبات، منتجات العناية والجمال، والإلكترونيات — من أقرب متجر إلى باب بيتك خلال دقائق.</P>
            <H>مهمتنا</H>
            <P>نوفّر لك وقتك وجهدك، ونوصّل لك أفضل المنتجات بأسعار منافسة وبسرعة تعتمد عليها في أي وقت.</P>
            <H>ليش {appName}؟</H>
            <P>توصيل خارق السرعة · أسعار منافسة وعروض يومية · تشكيلة واسعة من آلاف المنتجات · خدمة عملاء على مدار الساعة.</P>
          </>
        )}

        {topic === "privacy" && (
          <>
            <P>خصوصيتك تهمّنا. توضّح هذه السياسة كيف نجمع بياناتك ونستخدمها ونحميها عند استخدامك {appName}.</P>
            <H>ما الذي نجمعه؟</H>
            <P>نجمع فقط ما يلزم لإتمام طلبك: اسمك، رقم هاتفك، عنوان التوصيل، وتفاصيل طلباتك.</P>
            <H>كيف نستخدمه؟</H>
            <P>نستخدم بياناتك لتوصيل طلباتك، وتحسين الخدمة، وإبلاغك بحالة طلبك والعروض. لا نبيع بياناتك لأي طرف ثالث.</P>
            <H>حمايتك</H>
            <P>نحمي معلوماتك بإجراءات أمان مناسبة، ولا نشاركها إلا مع المندوب والمتجر لغرض توصيل طلبك فقط.</P>
            <H>حقوقك</H>
            <P>تقدر تعدّل بياناتك أو تطلب حذف حسابك في أي وقت عبر التواصل معنا.</P>
          </>
        )}

        {topic === "terms" && (
          <>
            <P>باستخدامك {appName} فإنك توافق على الشروط التالية.</P>
            <H>الطلبات والأسعار</H>
            <P>الأسعار وتوفّر المنتجات قابلة للتغيير. نبذل جهدنا لعرض معلومات دقيقة، وقد نُلغي أي طلب في حال نفاد المنتج مع إعلامك.</P>
            <H>التوصيل</H>
            <P>أوقات التوصيل تقديرية وقد تتأثّر بالظروف. يُرجى التأكد من صحة عنوانك ورقم هاتفك.</P>
            <H>الإرجاع والاستبدال</H>
            <P>يُقبل الإرجاع أو الاستبدال خلال 72 ساعة للمنتجات التالفة أو غير المطابقة، بشرط أن تكون بحالتها الأصلية.</P>
            <H>الحساب</H>
            <P>أنت مسؤول عن الحفاظ على سرّية حسابك ودقّة معلوماتك.</P>
          </>
        )}

        {topic === "faq" && (
          <div className="info-faq">
            {faqs.map(([q, a], i) => (
              <div className={"faq-item" + (open === i ? " open" : "")} key={i}>
                <div className="faq-q" onClick={() => setOpen(open === i ? -1 : i)}>
                  <span>{q}</span><ChevronRight size={18} className="faq-chev" />
                </div>
                {open === i && <div className="faq-a">{a}</div>}
              </div>
            ))}
          </div>
        )}

        {topic === "contact" && (
          <>
            <P>خدمة العملاء متاحة لمساعدتك على مدار الساعة. اختر الطريقة الأنسب لك:</P>
            <a className="info-contact" href={`https://wa.me/${waDigits.startsWith("964") ? waDigits : "964" + waDigits.replace(/^0/, "")}`} target="_blank" rel="noreferrer">
              <span className="ic wa"><MessageCircle size={22} /></span>
              <div><b>واتساب</b><span>راسلنا مباشرة — أسرع طريقة للرد</span></div>
            </a>
            <a className="info-contact" href={`tel:${wa}`}>
              <span className="ic tel"><Phone size={22} /></span>
              <div><b>اتصال هاتفي</b><span>{wa}</span></div>
            </a>
            <div className="info-contact static">
              <span className="ic hr"><Clock size={22} /></span>
              <div><b>ساعات العمل</b><span>يومياً على مدار الساعة</span></div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
