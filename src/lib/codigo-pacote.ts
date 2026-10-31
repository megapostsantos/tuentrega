/** Extrai o ID do pacote do conteúdo lido em um QR code ou código de barras de etiqueta. */
export function extrairIdPacote(bruto: string): string {
  const t = String(bruto ?? "").trim();
  if (!t) return "";
  // QR de etiqueta em JSON: {"id":"4580212345","sender_id":...}
  if (t.startsWith("{")) {
    try {
      const o = JSON.parse(t);
      const v = o?.id ?? o?.shipment_id ?? o?.shipmentId ?? o?.codigo ?? o?.code;
      if (v != null && String(v).trim()) return String(v).trim();
    } catch { /* segue */ }
  }
  // QR com link: ...?id=ABC123 ou .../ABC123
  const q = t.match(/[?&](?:id|shipment_id|codigo|code)=([A-Za-z0-9\-_.]+)/i);
  if (q) return q[1];
  if (/^https?:\/\//i.test(t)) {
    const ultimo = t.split(/[?#]/)[0].split("/").filter(Boolean).pop();
    if (ultimo && /[A-Za-z0-9]{6,}/.test(ultimo)) return ultimo;
  }
  return t;
}
