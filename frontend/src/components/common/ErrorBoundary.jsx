import { Component } from "react";
import { Home, RotateCcw } from "lucide-react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("App render error:", error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  handleHome = () => {
    window.location.href = "/home";
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex min-h-screen justify-center bg-[var(--imc-bg)] px-5 py-10">
        <div className="flex min-h-[70vh] w-full max-w-[430px] flex-col items-center justify-center rounded-[28px] bg-white p-6 text-center shadow-sm">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[rgba(67,56,202,0.12)] text-[#4338CA]">
            <RotateCcw size={25} />
          </div>

          <h1 className="mt-5 text-[22px] font-black text-[#12141C]">
            Something went wrong
          </h1>
          <p className="mt-2 max-w-[290px] text-[13px] font-semibold leading-5 text-[#667085]">
            The page hit a temporary error. Try again, or go back home.
          </p>

          <div className="mt-6 grid w-full grid-cols-2 gap-3">
            <button
              type="button"
              onClick={this.handleRetry}
              className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#4338CA] text-[13px] font-black text-white active:scale-[0.98]"
            >
              <RotateCcw size={16} />
              Try again
            </button>
            <button
              type="button"
              onClick={this.handleHome}
              className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-[#EAECF0] bg-white text-[13px] font-black text-[#12141C] active:scale-[0.98]"
            >
              <Home size={16} />
              Home
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
