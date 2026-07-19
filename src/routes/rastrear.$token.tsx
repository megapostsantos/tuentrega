import { createFileRoute, useRouter } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Package, MapPin, CheckCircle2, Truck, Clock, XCircle, Camera } from 'lucide-react';
import { getTrackingByToken } from '@/lib/tracking.functions';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export const Route = createFileRoute('/rastrear/$token')({
  head: ({ params }) => ({
    meta: [
      { title: `Rastrear pacote ${params.token.slice(0, 8)} — BAG Envios` },
      { name: 'description', content: 'Acompanhe o status da sua entrega em tempo real.' },
      { name: 'robots', content: 'noindex,nofollow' },
    ],
  }),
  component: TrackPage,
  errorComponent: ({ error }) => (
    <ErrorState message={error.message ?? 'Não foi possível carregar.'} />
  ),
  notFoundComponent: () => <ErrorState message="Link de rastreamento inválido." />,
});

type StepKey = 'criado' | 'saiu' | 'transito' | 'final';

const STATUS_META: Record<
  string,
  { label: string; color: string; step: StepKey; isFail?: boolean }
> = {
  pendente: { label: 'Aguardando coleta', color: 'bg-slate-500', step: 'criado' },
  preparando: { label: 'Preparando envio', color: 'bg-slate-500', step: 'criado' },
  coletado: { label: 'Saiu para entrega', color: 'bg-blue-500', step: 'saiu' },
  saiu_para_entrega: { label: 'Saiu para entrega', color: 'bg-blue-500', step: 'saiu' },
  em_transito: { label: 'Em trânsito', color: 'bg-amber-500', step: 'transito' },
  in_progress: { label: 'Em trânsito', color: 'bg-amber-500', step: 'transito' },
  delivered: { label: 'Entregue', color: 'bg-emerald-600', step: 'final' },
  entregue: { label: 'Entregue', color: 'bg-emerald-600', step: 'final' },
  failed: { label: 'Tentativa frustrada', color: 'bg-red-600', step: 'final', isFail: true },
  nao_entregue: { label: 'Tentativa frustrada', color: 'bg-red-600', step: 'final', isFail: true },
};

function getMeta(status: string) {
  return (
    STATUS_META[status] ?? {
      label: status,
      color: 'bg-slate-500',
      step: 'criado' as StepKey,
    }
  );
}

function TrackPage() {
  const { token } = Route.useParams();
  const fetchTracking = useServerFn(getTrackingByToken);

  const { data } = useSuspenseQuery({
    queryKey: ['public-tracking', token],
    queryFn: () => fetchTracking({ data: { token } }),
    staleTime: 30_000,
  });

  if (!data) return <ErrorState message="Pacote não encontrado para este link." />;

  const { pacote, oferta } = data;
  const meta = getMeta(pacote.status);

  const steps: { key: StepKey; label: string; icon: typeof Package }[] = [
    { key: 'criado', label: 'Operação criada', icon: Package },
    { key: 'saiu', label: 'Saiu para entrega', icon: Truck },
    { key: 'transito', label: 'Em trânsito', icon: Clock },
    {
      key: 'final',
      label: meta.isFail ? 'Tentativa frustrada' : 'Entregue',
      icon: meta.isFail ? XCircle : CheckCircle2,
    },
  ];

  const stepOrder: StepKey[] = ['criado', 'saiu', 'transito', 'final'];
  const currentIdx = stepOrder.indexOf(meta.step);

  const mapSrc =
    pacote.lat && pacote.lng
      ? `https://www.openstreetmap.org/export/embed.html?bbox=${pacote.lng - 0.005}%2C${
          pacote.lat - 0.005
        }%2C${pacote.lng + 0.005}%2C${pacote.lat + 0.005}&layer=mapnik&marker=${pacote.lat}%2C${
          pacote.lng
        }`
      : null;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 border-b bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-2 px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-base font-bold leading-tight">BAG Envios</p>
            <p className="text-xs text-muted-foreground leading-tight">Rastreio de entrega</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 px-4 py-5">
        {/* Status hero */}
        <Card className="p-5 text-center">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Status atual</p>
          <div className="mt-3 flex justify-center">
            <Badge
              className={`${meta.color} px-4 py-2 text-base font-semibold text-white hover:${meta.color}`}
            >
              {meta.label}
            </Badge>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Atualizado em{' '}
            {new Date(pacote.updated_at).toLocaleString('pt-BR', {
              dateStyle: 'short',
              timeStyle: 'short',
            })}
          </p>
        </Card>

        {/* Timeline */}
        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold">Linha do tempo</h2>
          <ol className="relative space-y-5 border-l-2 border-slate-200 pl-6">
            {steps.map((s, idx) => {
              const reached = idx <= currentIdx;
              const isFinal = idx === stepOrder.length - 1;
              const Icon = s.icon;
              const dotColor = reached
                ? isFinal && meta.isFail
                  ? 'bg-red-600 border-red-600'
                  : 'bg-primary border-primary'
                : 'bg-white border-slate-300';
              return (
                <li key={s.key} className="relative">
                  <span
                    className={`absolute -left-[34px] flex h-6 w-6 items-center justify-center rounded-full border-2 ${dotColor}`}
                  >
                    <Icon
                      className={`h-3 w-3 ${reached ? 'text-white' : 'text-slate-400'}`}
                    />
                  </span>
                  <p
                    className={`text-sm font-medium ${
                      reached ? 'text-slate-900' : 'text-slate-400'
                    }`}
                  >
                    {s.label}
                  </p>
                  {s.key === 'criado' && (
                    <p className="text-xs text-muted-foreground">
                      {new Date(pacote.created_at).toLocaleString('pt-BR', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </p>
                  )}
                  {s.key === 'final' && reached && pacote.entregue_em && (
                    <p className="text-xs text-muted-foreground">
                      {new Date(pacote.entregue_em).toLocaleString('pt-BR', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </p>
                  )}
                  {s.key === 'final' && reached && meta.isFail && pacote.motivo_nao_entrega && (
                    <p className="mt-1 text-xs text-red-600">{pacote.motivo_nao_entrega}</p>
                  )}
                </li>
              );
            })}
          </ol>
        </Card>

        {/* POD */}
        {pacote.foto_pod_url && meta.step === 'final' && !meta.isFail && (
          <Card className="overflow-hidden">
            <div className="flex items-center gap-2 border-b px-4 py-3">
              <Camera className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Comprovante de entrega</h2>
            </div>
            <a href={pacote.foto_pod_url} target="_blank" rel="noopener noreferrer">
              <img
                src={pacote.foto_pod_url}
                alt="Comprovante de entrega"
                className="max-h-80 w-full object-cover"
                loading="lazy"
              />
            </a>
          </Card>
        )}

        {/* Map */}
        {mapSrc && (
          <Card className="overflow-hidden">
            <div className="flex items-center gap-2 border-b px-4 py-3">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Localização da entrega</h2>
            </div>
            <iframe
              title="Mapa do endereço de entrega"
              src={mapSrc}
              className="h-64 w-full border-0"
              loading="lazy"
            />
          </Card>
        )}

        {/* Package info */}
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold">Detalhes do pacote</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Número</dt>
              <dd className="font-medium">#{pacote.numero_pacote}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Endereço</dt>
              <dd className="text-right font-medium">{pacote.endereco_entrega}</dd>
            </div>
            {oferta?.data_trabalho && (
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Data prevista</dt>
                <dd className="font-medium">
                  {new Date(oferta.data_trabalho).toLocaleDateString('pt-BR')}
                  {oferta.hora_inicio ? ` · ${oferta.hora_inicio.slice(0, 5)}` : ''}
                </dd>
              </div>
            )}
          </dl>
        </Card>

        <p className="pb-6 text-center text-xs text-muted-foreground">
          Acompanhamento fornecido por BAG Envios
        </p>
      </main>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <Card className="max-w-sm p-6 text-center">
        <XCircle className="mx-auto h-10 w-10 text-red-500" />
        <h1 className="mt-3 text-lg font-semibold">Rastreio indisponível</h1>
        <p className="mt-1 text-sm text-muted-foreground">{message}</p>
        <button
          onClick={() => router.invalidate()}
          className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Tentar novamente
        </button>
      </Card>
    </div>
  );
}

// Suppress unused-import lint when Skeleton not used directly
void Skeleton;
