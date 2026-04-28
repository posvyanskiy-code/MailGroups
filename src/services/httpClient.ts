import { msalInstance, apiScope } from '../auth/msalConfig';

const BASE = import.meta.env.VITE_API_BASE as string;

async function token(): Promise<string> {
  const account = msalInstance.getAllAccounts()[0];
  if (!account) throw new Error('Not signed in');
  const r = await msalInstance.acquireTokenSilent({ account, scopes: [apiScope] });
  return r.accessToken;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const t = await token();
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      ...(init.headers || {}),
      'Authorization': `Bearer ${t}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${await res.text()}`);
  if (res.status === 204) return undefined as T;
  return await res.json() as T;
}
