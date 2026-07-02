// العملة: الدينار العراقي
export const CUR = "د.ع";
export const toIQD = (n) => Math.round((n * 36) / 50) * 50; // تحويل تقريبي إلى الدينار العراقي (أرقام واقعية)
export const fmt = (n) => n.toLocaleString("en-US");
