import { Clock, ShieldX, MessageCircle, LogOut } from "lucide-react";
import { signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { whatsappLink, CONTATO_TELEFONE } from "@/lib/contato";

export function AguardandoAprovacao({ status, motivo }: { status: "pendente" | "recusado"; motivo?: string | null }) {
  const recusado = status === "recusado";
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-4 rounded-3xl border bg-card p-6 text-center shadow-sm">
        <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${recusado ? "bg-red-100 text-red-700" : "bg-primary/15"}`}>
          {recusado ? <ShieldX className="h-7 w-7" /> : <Clock className="h-7 w-7" />}
        </div>
        <h1 className="text-xl font-bold">{recusado ? "Cadastro não aprovado" : "Cadastro em análise"}</h1>
        <p className="text-sm text-muted-foreground">
          {recusado
            ? (motivo ? `Motivo: ${motivo}.` : "A TuEntrega não aprovou este cadastro.") + " Se acha que foi um engano, fale com a gente."
            : "Recebemos o seu cadastro. A equipe da TuEntrega analisa e libera o acesso em breve. Você será avisado quando for aprovado."}
        </p>
        {!recusado && (
          <p className="rounded-xl bg-muted p-3 text-xs text-muted-foreground">
            Foi convidado por uma empresa? Use a aba <strong>Convite</strong> na tela de entrada, com o e-mail e o código que ela enviou: nesse caso não precisa esperar aprovação.
          </p>
        )}
        <Button asChild className="w-full"><a href={whatsappLink("Olá! Meu cadastro no TuEntrega está aguardando aprovação.")} target="_blank" rel="noreferrer"><MessageCircle className="mr-2 h-4 w-4" />Falar pelo WhatsApp {CONTATO_TELEFONE}</a></Button>
        <Button variant="ghost" className="w-full" onClick={async () => { await signOut(); window.location.assign("/auth"); }}><LogOut className="mr-2 h-4 w-4" />Sair</Button>
      </div>
    </div>
  );
}
