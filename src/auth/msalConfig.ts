import { Configuration, PublicClientApplication } from '@azure/msal-browser';

export const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_SPA_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_TENANT_ID}`,
    redirectUri: window.location.origin,
  },
  cache: { cacheLocation: 'localStorage' },
};

export const apiScope = import.meta.env.VITE_API_SCOPE as string;
export const msalInstance = new PublicClientApplication(msalConfig);
