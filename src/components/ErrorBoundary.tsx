import { Component, ErrorInfo, ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { clearScrollLock } from "@/lib/scrollLockGuard";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * App-wide crash guard.
 *
 * Without this, an uncaught render error anywhere in the tree takes the
 * whole app down to a blank white screen with no way back short of force-
 * closing the app — which on a native WebView often reads as "it crashed".
 * This catches it, logs it, and shows a recoverable screen instead.
 *
 * It also force-clears any Radix scroll lock (see scrollLockGuard.ts) that
 * may have been left stuck if a modal happened to be open when the crash
 * occurred — otherwise even the "Reload" button's page would render behind
 * a scroll-locked <html>, which reads as "the app can't scroll" on the next
 * visit until a hard reload.
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary] caught a render error:", error, info.componentStack);
    clearScrollLock();
  }

  handleReload = () => {
    clearScrollLock();
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ background: "hsl(var(--background))" }}
      >
        <div className="w-full max-w-sm text-center">
          <div
            className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-5"
            style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}
          >
            <RefreshCw className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-xl font-extrabold text-foreground mb-2">
            Something went wrong
          </h1>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            The app hit an unexpected error. Reloading usually fixes it — your
            bookings and account are safe.
          </p>
          <button
            onClick={this.handleReload}
            className="w-full h-[52px] rounded-2xl text-white font-extrabold text-sm tap-scale"
            style={{
              background: "linear-gradient(145deg, hsl(199 100% 50%), hsl(199 100% 38%))",
              boxShadow: "var(--shadow-sky)",
            }}
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
