// دالة Netlify آمنة تنادي Claude — المفتاح يُقرأ من متغيّر بيئة سري (ANTHROPIC_API_KEY)
// ولا يظهر أبداً في كود المتصفح.
export default async (req) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };
  if (req.method === "OPTIONS") return new Response("", { headers: cors });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "POST only" }), { status: 405, headers: cors });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return new Response(JSON.stringify({ error: "لم يُضبط ANTHROPIC_API_KEY في Netlify" }), { status: 500, headers: cors });

  // ينادي واجهة Claude مجرّباً عدة موديلات بالتتابع (يحمي من تقاعد اسم موديل)
  async function callClaude(models, payload) {
    let lastErr = "";
    for (const model of models) {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model, ...payload }),
      });
      const data = await r.json();
      if (r.ok) return { ok: true, data };
      lastErr = data.error?.message || ("status " + r.status);
      // إن كان الخطأ بسبب الموديل (غير موجود/متقاعد) جرّب التالي، وإلا توقّف
      if (!/model|not_found|deprecat|404/i.test(lastErr)) return { ok: false, error: lastErr, status: r.status };
    }
    return { ok: false, error: lastErr, status: 400 };
  }
  const VISION_MODELS = ["claude-sonnet-4-6", "claude-sonnet-4-5", "claude-3-5-sonnet-latest"];
  const TEXT_MODELS = ["claude-haiku-4-5", "claude-3-5-haiku-latest", "claude-sonnet-4-6"];

  let body;
  try { body = await req.json(); } catch { return new Response(JSON.stringify({ error: "bad json" }), { status: 400, headers: cors }); }
  const { task, name, cat, sub, weight, price, cats = [], subs = [], image } = body || {};

  // تعليمات حسب المهمة
  let system = "أنت مساعد تسويقي خبير لمتجر بقالة عراقي (توصيل سريع مثل بلينكيت). أجب بالعربية فقط، بإيجاز، وبصيغة JSON صحيحة بلا أي نص إضافي أو أسوار كود.";
  let prompt = "";
  if (task === "describe") {
    prompt = `اكتب وصفاً تسويقياً جذّاباً وقصيراً (سطر إلى سطرين، حد أقصى 22 كلمة) لمنتج بقالة اسمه «${name}»${weight ? ` بحجم ${weight}` : ""}${cat ? ` من قسم ${cat}` : ""}. يحفّز الشراء ويذكر ميزة واضحة. أعد JSON: {"desc":"..."}`;
  } else if (task === "classify") {
    prompt = `صنّف منتج البقالة «${name}» لأقصى مبيعات. الأقسام المتاحة: ${cats.join("، ")}. التفرّعات الشائعة: ${subs.join("، ")}.\nاختر أنسب قسم وتفرّع. إن لم يناسبه أي قسم متاح، اقترح اسم قسم جديد مناسب (كلمتين). واقترح تفرّعاً دقيقاً (جديداً إن لزم).\nأعد JSON فقط: {"cat":"اسم القسم","sub":"التفرّع","isNew":true/false,"reason":"سبب قصير"}`;
  } else if (task === "badge") {
    prompt = `اختر شارة واحدة فقط للمنتج «${name}» (السعر ${price}) من: جديد، الأكثر مبيعاً، عرض خاص، محدود، أو اتركها فارغة. أعد JSON: {"badge":"..."}`;
  } else if (task === "imagePrompt") {
    system = "You translate Arabic grocery product names into short English image-generation prompts. Reply with JSON only, no extra text.";
    prompt = `Product (Arabic): «${name}»${cat ? ` category: ${cat}` : ""}. Write a concise English prompt (max 15 words) to generate a clean professional product photo on a plain white background. Reply JSON: {"prompt":"..."}`;
  } else if (task === "full") {
    prompt = `للمنتج «${name}»${weight ? ` (${weight})` : ""}: 1) صنّفه في أنسب قسم من: ${cats.join("، ")} (أو اقترح قسماً جديداً مناسباً إن لم يناسبه شيء) 2) اقترح تفرّعاً دقيقاً 3) اكتب وصفاً تسويقياً قصيراً (≤22 كلمة) 4) اختر شارة (جديد/الأكثر مبيعاً/عرض خاص/محدود/فارغة). أعد JSON فقط: {"cat":"...","sub":"...","desc":"...","badge":"...","isNew":true/false}`;
  } else if (task === "analyzeImage") {
    // معالجة منفصلة أدناه (تحتاج بلوك صورة)
  } else {
    return new Response(JSON.stringify({ error: "unknown task" }), { status: 400, headers: cors });
  }

  // مهمة تحليل الصورة: Claude يقرأ الصورة ويستخرج التفاصيل
  if (task === "analyzeImage") {
    if (!image) return new Response(JSON.stringify({ error: "no image" }), { status: 400, headers: cors });
    const m = /^data:(image\/[a-zA-Z]+);base64,(.+)$/.exec(image);
    if (!m) return new Response(JSON.stringify({ error: "bad image format" }), { status: 400, headers: cors });
    try {
      const out = await callClaude(VISION_MODELS, {
        max_tokens: 500,
        system: "أنت خبير في متاجر البقالة العراقية. حلّل صورة المنتج واستخرج معلوماته بدقّة. أجب بالعربية وبصيغة JSON فقط بلا أسوار كود.",
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: m[1], data: m[2] } },
            { type: "text", text: `حلّل صورة منتج البقالة هذه. الأقسام المتاحة: ${cats.join("، ")}. استخرج: الاسم التجاري، وصف تسويقي قصير (≤20 كلمة)، الوزن/الحجم إن ظهر، أنسب قسم (أو قسم جديد إن لزم)، تفرّع مناسب، وأي تفاصيل مكتوبة مهمة. أعد JSON فقط: {"name":"...","desc":"...","weight":"...","cat":"...","sub":"...","details":"..."}` },
          ],
        }],
      });
      if (!out.ok) return new Response(JSON.stringify({ error: out.error || "vision error" }), { status: out.status || 500, headers: cors });
      const data = out.data;
      let text = (data.content?.[0]?.text || "").trim().replace(/^```json\s*|\s*```$/g, "");
      let parsed; try { parsed = JSON.parse(text); } catch { const mm = text.match(/\{[\s\S]*\}/); parsed = mm ? JSON.parse(mm[0]) : { raw: text }; }
      return new Response(JSON.stringify(parsed), { headers: cors });
    } catch (e) {
      return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: cors });
    }
  }

  try {
    const out = await callClaude(TEXT_MODELS, {
      max_tokens: 400,
      system,
      messages: [{ role: "user", content: prompt }],
    });
    if (!out.ok) return new Response(JSON.stringify({ error: out.error || "AI error" }), { status: out.status || 500, headers: cors });
    const data = out.data;
    let text = (data.content?.[0]?.text || "").trim().replace(/^```json\s*|\s*```$/g, "");
    let parsed;
    try { parsed = JSON.parse(text); } catch { const m = text.match(/\{[\s\S]*\}/); parsed = m ? JSON.parse(m[0]) : { raw: text }; }
    return new Response(JSON.stringify(parsed), { headers: cors });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: cors });
  }
};
