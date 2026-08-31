/**
 * The sign-in screen — which is a name box, because that is the whole point of
 * the project. No email, no password, no address, no port.
 */
import { useState } from 'react';
import { useSession } from '../session';
import { generalAvatar } from '../boot';

const AVATARS = ['caocao', 'liubei', 'sunquan', 'diaochan', 'zhugeliang', 'guanyu'];

export function Landing({ onDone }: { onDone: () => void }) {
  const { loaded, identity, signIn } = useSession();
  const [name, setName] = useState(identity?.displayName ?? '');
  const [avatar, setAvatar] = useState(identity?.avatar ?? AVATARS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(name, avatar);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="landing">
      <div className="inner">
        <h1 className="title">新月杀</h1>
        <p className="sub">
          打开链接就能玩的三国杀。<br />
          不用装客户端，不用同步扩展包，不用填服务器地址。
        </p>

        <form onSubmit={submit}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="取个名字"
            maxLength={24}
            autoFocus
            aria-label="显示名称"
          />
          <button className="btn primary" type="submit" disabled={busy || !name.trim()}>
            {identity ? '继续' : '进入'}
          </button>
        </form>

        <div className="avatars" role="group" aria-label="选择头像">
          {AVATARS.map((a) => {
            const src = generalAvatar(loaded, a);
            return (
              <button
                key={a}
                type="button"
                aria-pressed={avatar === a}
                aria-label={a}
                onClick={() => setAvatar(a)}
              >
                {src ? <img src={src} alt="" /> : null}
              </button>
            );
          })}
        </div>

        {error ? <p className="notice" style={{ marginTop: 20 }}>{error}</p> : null}
      </div>
    </div>
  );
}
