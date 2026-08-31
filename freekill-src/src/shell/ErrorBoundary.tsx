/**
 * One crash must not take the app with it.
 *
 * The room is the most complex thing on the page and the most likely to throw
 * while three lanes are still converging. When it does, the player should get a
 * sentence they can act on and a way back to the lobby — not a black rectangle
 * and a stack trace in a console they will never open.
 */
import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { getLanguage, t } from '../i18n';

interface Props { children: ReactNode; where: string; onReset?: () => void; }
interface State { error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(`[${this.props.where}]`, error, info.componentStack);
  }

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="page">
        <h2>{t('error.title', getLanguage(), { where: this.props.where })}</h2>
        <p className="lede">{t('error.lede', getLanguage())}</p>
        <pre style={{
          background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 10,
          padding: 14, fontSize: 12, overflow: 'auto', color: 'var(--paper-dim)',
        }}>{error.message}</pre>
        <div className="row" style={{ marginTop: 14 }}>
          <button className="btn" onClick={() => this.setState({ error: null })}>{t('error.retry', getLanguage())}</button>
          {this.props.onReset
            ? <button className="btn ghost" onClick={this.props.onReset}>{t('error.backToLobby', getLanguage())}</button>
            : null}
        </div>
      </div>
    );
  }
}
