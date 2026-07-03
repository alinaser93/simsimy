/* إعداد Supabase الدائم — يُرفع مع الموقع فيعمل على كل الأجهزة تلقائياً.
   المفتاح العام (publishable/anon) آمن للواجهة الأمامية — هذا هو النمط القياسي في Supabase.
   لا تضع هنا المفتاح السري (secret/service_role) أبداً. */
export const SUPABASE = {
  url: "https://lsaofqvexwyygcufmeip.supabase.co",
  anonKey: "sb_publishable_9siIMqT-vQAXk371FtCBgQ_nYe7f4uw",
  bucket: "products",
};
