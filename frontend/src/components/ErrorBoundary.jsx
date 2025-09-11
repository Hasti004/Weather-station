// Global ErrorBoundary: catches React render errors anywhere in the component tree
// Use only once in main entry (index.js) to wrap <App />
import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: undefined, errorInfo: undefined };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error, errorInfo: undefined };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div style={{ padding: 16, background: '#fee2e2', color: '#991b1b' }}>
          <h2 style={{ fontWeight: 700 }}>Something went wrong.</h2>
          <p>Please check the console for more details.</p>
          {this.state.error && (
            <details style={{ fontSize: 12, marginTop: 8, textAlign: 'left' }}>
              <summary>Error Details</summary>
              <pre>{this.state.error.toString()}</pre>
              {this.state.errorInfo?.componentStack}
            </details>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;

// Example usage:
// <ErrorBoundary fallback={<div>Custom error message</div>}>
//   <App />
// </ErrorBoundary>


