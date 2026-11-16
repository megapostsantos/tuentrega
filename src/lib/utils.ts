import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Valor em reais no padrão brasileiro: R$ 1.234,56 */
export function fmtBRL(n: number | string | null | undefined): string {
  return Number(n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** "Hoje", "Ontem" ou "seg., 11/11" a partir de uma data ISO (yyyy-mm-dd), no fuso local. */
export function rotuloDia(iso: string): string {
  const d = new Date(iso.slice(0, 10) + "T12:00:00");
  const h = new Date(); const dia = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((dia(h) - dia(d)) / 86400000);
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Ontem";
  return d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });
}
