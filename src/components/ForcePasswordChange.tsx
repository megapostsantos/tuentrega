import { useState } from "react";
import { toast } from "sonner";
import { Loader2, KeyRound } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ForcePasswordChange() {
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [nova2, setNova2] = useState("");
  const [saving, setSaving] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (nova.length < 6) return toast.error("A nova senha precisa ter pelo menos 6 caracteres.");
    if (nova !== nova2) return toast.error("As senhas não conferem.");
    if (nova === atual) return toast.error("Escolha uma senha diferente da provisória.");
    setSaving(true);
    const { error } = await authClient.changePassword({ currentPassword: atual, newPassword: nova, revokeOtherSessions: true });
    if (error) {
      setSaving(false);
      return toast.error(error.message || "Senha provisória incorreta.");
    }
    await fetch("/api/db/password-changed", { method: "POST", credentials: "same-origin" });
    toast.success("Senha alterada!");
    window.location.reload();
  }

  async function sair() {
    await authClient.signOut();
    window.location.href = "/auth";
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <form onSubmit={salvar} className="w-full max-w-sm space-y-4">
        <Logo />
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold"><KeyRound className="h-5 w-5" />Crie sua nova senha</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sua senha foi redefinida pela TuEntrega. Para continuar, troque a senha provisória por uma só sua.
          </p>
        </div>
        <div className="space-y-2"><Label>Senha provisória</Label><Input type="password" required value={atual} onChange={(e) => setAtual(e.target.value)} /></div>
        <div className="space-y-2"><Label>Nova senha</Label><Input type="password" required value={nova} onChange={(e) => setNova(e.target.value)} /></div>
        <div className="space-y-2"><Label>Repita a nova senha</Label><Input type="password" required value={nova2} onChange={(e) => setNova2(e.target.value)} /></div>
        <Button type="submit" className="w-full" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar nova senha"}</Button>
        <Button type="button" variant="ghost" className="w-full" onClick={sair}>Sair</Button>
      </form>
    </div>
  );
}
