/**
 * A malformed request payload must not take the table down with it.
 *
 * The room renders payloads it did not author — a package can ship a request
 * shape v1 has never seen. When one of them throws, the game must keep running
 * and the failure must be visible, not silent.
 */
import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props { readonly children: ReactNode; readonly label: string }
interface State { readonly error: Error | null }

export class Boundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State { return { error }; }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(`[room:${this.props.label}]`, error, info.componentStack);
  }

  componentDidUpdate(prev: Props): void {
    // A new payload gets a fresh chance; a stuck boundary would freeze the room.
    if (prev.children !== this.props.children && this.state.error) this.setState({ error: null });
  }

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="fk-modal">
        <div className="fk-dialog">
          <h3 className="fk-dialog__title">{this.props.label}</h3>
          <p className="fk-dialog__prompt">{error.message}</p>
        </div>
      </div>
    );
  }
}
