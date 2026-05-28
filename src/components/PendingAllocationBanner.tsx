import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Package, X, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface PendingAlloc {
  id: string;
  pacotes: number;
  paradas: number;
  companyName: string;
}

export function PendingAllocationBanner({ userId }: { userId: string }) {
  const [allocs, setAllocs] = useState<PendingAlloc[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const sb = supabase as any;
    async function load() {
      const { data: dispRows } = await sb.from("dispatchers").select("id").eq("entregador_id", userId);
      if (!dispRows?.length) return setAllocs([]);
      const ids = dispRows.map((d: any) => d.id);
      const { data } = await sb
        .from("dispatcher_alocacoes")
        .select("id, pacotes_alocados, paradas_alocadas, empresa_id")
        .in("dispatcher_id", ids)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (!data?.length) return setAllocs([]);

      const empresaIds = Array.from(new Set(data.map((a: any) => a.empresa_id)));
      const { data: emps } = await sb.from("empresas").select("id, nome_fantasia, razao_social").in("id", empresaIds);
      const eMap = new Map((emps ?? []).map((e: any) => [e.id, e.nome_fantasia || e.razao_social || "Empresa"]));
      setAllocs(data.map((a: any) => ({
        id: a.id,
        pacotes: a.pacotes_alocados,
        paradas: a.paradas_alocadas,
        companyName: eMap.get(a.empresa_id) || "Empresa",
      })));
    }
    load();
    const ch = sb.channel(`pending-alloc-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "dispatcher_alocacoes" }, load)
      .subscribe();
    return () => { sb.removeChannel(ch); };
  }, [userId]);

  if (dismissed || allocs.length === 0) return null;
  const top = allocs[0];

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 p-5 text-white shadow-lg">
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-2 top-2 rounded-full p-1 text-white/80 hover:bg-white/10"
        aria-label="Dispensar"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Package className="h-5 w-5" />
        Você tem alocação pendente!
        {allocs.length > 1 && (
          <span className="ml-1 rounded-full bg-white/20 px-2 py-0.5 text-xs">
            {allocs.length} pendentes
          </span>
        )}
      </div>
      <p className="mt-3 text-xl font-bold">{top.pacotes} pacotes · {top.paradas} paradas</p>
      <p className="text-sm text-white/90">da {top.companyName}</p>
      <Link
        to="/pacotes/distribuir/$alocacaoId"
        params={{ alocacaoId: top.id }}
        className="mt-4 inline-flex items-center gap-1 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-orange-600 shadow-sm"
      >
        Distribuir agora <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
