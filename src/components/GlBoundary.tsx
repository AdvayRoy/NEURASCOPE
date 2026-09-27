"use client";
import { Component, type ReactNode } from "react";

/** Keeps the DOM/SVG instruments usable when WebGL is unavailable or a canvas crashes. */
export class GlBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) return this.props.fallback ?? null;
    return this.props.children;
  }
}
