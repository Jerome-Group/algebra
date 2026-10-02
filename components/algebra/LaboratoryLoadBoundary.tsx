"use client";
import { Component, Suspense, type ReactNode } from "react";

type Props = { title: string; children: ReactNode };
export function LaboratoryLoading({ title }: { title: string }) {
  return (
    <div className="laboratory-loading" role="status" aria-live="polite">
      <strong>Loading {title} laboratory…</strong>
      <p>The interactive model and its controls will appear here.</p>
      <div aria-hidden="true">Variables · Model · Mathematical explanation</div>
    </div>
  );
}
export class LaboratoryLoadBoundary extends Component<
  Props,
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <section className="laboratory-load-error" role="alert">
          <h3>Laboratory unavailable</h3>
          <p>
            {this.props.title} could not load. Your saved progress is kept; you
            can continue reading or reload this page to try again.
          </p>
          <button type="button" onClick={() => window.location.reload()}>
            Reload laboratory
          </button>
        </section>
      );
    return (
      <Suspense fallback={<LaboratoryLoading title={this.props.title} />}>
        {this.props.children}
      </Suspense>
    );
  }
}
