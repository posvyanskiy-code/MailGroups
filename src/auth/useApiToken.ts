import { useMsal } from '@azure/msal-react';
import { apiScope } from './msalConfig';

export function useApiToken() {
  const { instance, accounts } = useMsal();
  return async (): Promise<string> => {
    const account = accounts[0];
    if (!account) throw new Error('Not signed in');
    const r = await instance.acquireTokenSilent({ account, scopes: [apiScope] });
    return r.accessToken;
  };
}
