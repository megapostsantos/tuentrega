import React from "react";
import { Button } from "@/components/ui/button";

type State = { error: Error | null };

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
          <div className="max-w-md text-center">
            <div className="text-5xl">😕</div>
            <h1 className="mt-4 text-xl font-semibold">Algo deu errado</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Ocorreu um erro inesperado. Tente novamente.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button onClick={this.reset}>Tentar novamente</Button>
              <Button variant="outline" onClick={() => (window.location.href = "/")}>
                Voltar ao início
              </Button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
