'use client';

import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#1A0F0A]">
          <div className="text-center">
            <h2 className="text-2xl text-[#D4A017] mb-4">Oops! Something went wrong.</h2>
            <button
              onClick={() => window.location.reload()}
              className="bg-[#D4A017] text-white px-4 py-2 rounded-lg hover:bg-[#A77B06]"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
