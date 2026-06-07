import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "./Button";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (e: Error, info: ErrorInfo) => void;
}

interface State { error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State { return { error }; }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info);
    this.props.onError?.(error, info);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-warning mb-3" aria-hidden />
          <h2 className="text-lg font-semibold">Что-то пошло не так</h2>
          <p className="text-sm text-fg-muted mt-1 max-w-md">
            {this.state.error.message || "Произошла непредвиденная ошибка"}
          </p>
          <Button onClick={this.reset} className="mt-4">Попробовать снова</Button>
        </div>
      );
    }
    return this.props.children;
  }
}
