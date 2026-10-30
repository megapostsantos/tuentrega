/** Único ponto de contato público da TuEntrega (WhatsApp / telefone). */
export const CONTATO_TELEFONE = "(13) 99621-9569";
export const CONTATO_DIGITOS = "5513996219569";
export const CONTATO_TEL = `tel:+${CONTATO_DIGITOS}`;

/** Abre direto a conversa com o número (link oficial de envio do WhatsApp). */
export function whatsappLink(texto?: string): string {
  const base = `https://api.whatsapp.com/send?phone=${CONTATO_DIGITOS}`;
  return texto ? `${base}&text=${encodeURIComponent(texto)}` : base;
}
export const CONTATO_WHATSAPP = whatsappLink();

/** Endereço oficial do app, usado em tudo que é enviado a outras pessoas (convites, ofertas, guias). */
export const SITE_URL = "https://tuentrega.com.br";
