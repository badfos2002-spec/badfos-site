'use client';

import { Component, type ReactNode } from 'react';

interface ThreeErrorBoundaryProps {
  fallback: ReactNode;
  children: ReactNode;
}

interface ThreeErrorBoundaryState {
  hasError: boolean;
}

/**
 * Minimal error boundary: if the 3D preview throws (WebGL unavailable, model
 * load failure, etc.) it renders `fallback` instead of crashing the page.
 */
export default class ThreeErrorBoundary extends Component<
  ThreeErrorBoundaryProps,
  ThreeErrorBoundaryState
> {
  constructor(props: ThreeErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ThreeErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}
