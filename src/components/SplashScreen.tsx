import { Loader2 } from "lucide-react";
import { Logo } from "@/components/Logo";

export function SplashScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background gap-6">
      <Logo />
      <Loader2 className="h-7 w-7 animate-spin text-primary" />
    </div>
  );
}
