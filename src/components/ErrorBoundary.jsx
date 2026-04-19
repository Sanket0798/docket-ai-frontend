import { Component } from 'react';

/**
 * Global Error Boundary — catches any unhandled React render errors
 * and shows a fallback UI instead of a white screen.
 *
 * Wrap around the entire app in main.jsx or App.jsx.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Log to console — swap for a real logging service (Sentry etc.) in production
    console.error('[ErrorBoundary] Uncaught error:', error, info.componentStack);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 text-center">
          <img
            src="/assets/icons/Empty-cuate.svg"
            alt="Something went wrong"
            className="mb-6 w-40 opacity-60"
          />
          <h1 className="text-2xl font-medium text-[#1B1B1D] mb-2">
            Something went wrong
          </h1>
          <p className="text-[#787889] text-base mb-8 max-w-md">
            An unexpected error occurred. Your work is safe — try refreshing or going back to the dashboard.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.location.reload()}
              className="h-[38px] px-6 border border-brand-color text-brand-color text-[15px] font-medium rounded-[6px] hover:bg-blue-50 transition cursor-pointer"
            >
              Refresh page
            </button>
            <button
              onClick={this.handleReload}
              className="h-[38px] px-6 bg-brand-color hover:bg-blue-700 text-white text-[15px] font-medium rounded-[6px] transition cursor-pointer"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
