import { useState, useEffect, useCallback } from 'react';

// Standardize env var name. The app's build process must make this available.
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
const IS_CONFIGURED = CLIENT_ID !== 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';

const SCOPES = 'https://www.googleapis.com/auth/drive.file';

declare global {
    interface Window {
        google?: any;
    }
}

export interface GoogleAuth {
    isSignedIn: boolean;
    isInitializing: boolean;
    accessToken: string | null;
    signIn: () => void;
    isConfigured: boolean;
}

export const useGoogleAuth = (): GoogleAuth => {
    const [tokenClient, setTokenClient] = useState<any>(null);
    const [isSignedIn, setIsSignedIn] = useState(false);
    const [isInitializing, setIsInitializing] = useState(true);
    const [accessToken, setAccessToken] = useState<string | null>(null);

    const initializeClient = useCallback(() => {
        if (!IS_CONFIGURED) {
            console.warn("Google Drive integration is not configured. Please set the GOOGLE_CLIENT_ID environment variable.");
            setIsInitializing(false);
            return;
        }

        if (window.google?.accounts?.oauth2) {
             const client = window.google.accounts.oauth2.initTokenClient({
                client_id: CLIENT_ID,
                scope: SCOPES,
                callback: (tokenResponse: any) => {
                    if (tokenResponse && tokenResponse.access_token) {
                        setAccessToken(tokenResponse.access_token);
                        setIsSignedIn(true);
                    } else {
                        setAccessToken(null);
                        setIsSignedIn(false);
                    }
                },
                error_callback: (error: any) => {
                    console.error("Google Auth Error:", error);
                    setAccessToken(null);
                    setIsSignedIn(false);
                }
            });
            setTokenClient(client);
            setIsInitializing(false);
        }
    }, []);

    useEffect(() => {
        const gsiScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
        if (!gsiScript) {
            setIsInitializing(false); // Can't initialize if script tag is missing
            return;
        }
        
        const handleScriptLoad = () => {
             if (window.google) {
                initializeClient();
             }
        };

        if (window.google) {
            initializeClient();
        } else {
            gsiScript.addEventListener('load', handleScriptLoad);
        }
        
        return () => {
            if (gsiScript) {
                gsiScript.removeEventListener('load', handleScriptLoad);
            }
        };
    }, [initializeClient]);

    const signIn = useCallback(() => {
        if (!IS_CONFIGURED) {
            console.error("Cannot sign in: Google Drive is not configured.");
            return;
        }
        if (tokenClient) {
            tokenClient.requestAccessToken({ prompt: '' });
        } else {
            console.error("Google Auth client not initialized.");
        }
    }, [tokenClient]);

    return {
        isSignedIn,
        isInitializing,
        accessToken,
        signIn,
        isConfigured: IS_CONFIGURED,
    };
};