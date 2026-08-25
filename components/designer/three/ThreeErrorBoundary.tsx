'use client';

import { Component, type ReactNode } from 'react';

interface ThreeErrorBoundaryProps {
  fallback: ReactNode;
  children: ReactNode;
  /**
   * Changing this value clears a tripped boundary and re-mounts the children.
   * Without it a single 3D failure is STICKY for the page's whole life — in a
   * long-lived admin tab that silently downgraded every later sketch preview
   * capture to the logo card. A healthy (untripped) boundary ignores changes,
   * so bumping the key on routine actions costs nothing.
   */
  resetKey?: unknown;
}

interface ThreeErrorBoundaryState {
  hasError: boolean;
  lastResetKey?: unknown;
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
    this.state = { hasError: false, lastResetKey: props.resetKey };
  }

  static getDerivedStateFromError(): Partial<ThreeErrorBoundaryState> {
    return { hasError: true };
  }

  static getDerivedStateFromProps(
    props: ThreeErrorBoundaryProps,
    state: ThreeErrorBoundaryState
  ): Partial<ThreeErrorBoundaryState> | null {
    if (!Object.is(state.lastResetKey, props.resetKey)) {
      return { hasError: false, lastResetKey: props.resetKey };
    }
    return null;
  }

  componentDidCatch(error: unknown) {
    // Loud + greppable: a tripped boundary is why a capture finds no stage.
    console.error('[THREE_BOUNDARY_TRIPPED] 3D stage fell to its 2D fallback:', error);
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}
