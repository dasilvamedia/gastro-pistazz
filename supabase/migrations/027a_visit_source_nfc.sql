-- 027a: neuer Besuchs-Ursprung 'nfc'
-- ALTER TYPE ... ADD VALUE kann nicht in derselben Transaktion genutzt werden,
-- in der der Wert schon verwendet wird. Deshalb als eigene Datei ZUERST
-- ausfuehren, danach 027b.
ALTER TYPE visit_source ADD VALUE IF NOT EXISTS 'nfc';
