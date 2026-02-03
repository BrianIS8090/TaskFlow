import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { 
  onAuthStateChanged, 
  signInWithPopup,
  GoogleAuthProvider, 
  signOut,
  signInWithCredential
} from 'firebase/auth';
import { auth } from '../lib/firebase';
// @ts-ignore
import { start, onUrl } from '@fabianlars/tauri-plugin-oauth';
// @ts-ignore
import { open } from '@tauri-apps/plugin-shell';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      // @ts-ignore
      const isTauri = !!(window.__TAURI_INTERNALS__ || window.__TAURI__);
      
      if (isTauri) {
        const port = 14205;
        const clientId = "134216999860-hj267d4gs8b5gg61gv65141s0jj6bsqv.apps.googleusercontent.com";
        const redirectUri = `http://localhost:${port}`;
        
        console.log("Setting up OAuth listener...");
        
        // Create a promise that resolves when the redirect URL is captured
        const responsePromise = new Promise<string>(async (resolve, reject) => {
            const unlisten = await onUrl((url: string) => {
                console.log("Captured OAuth URL via listener:", url);
                unlisten(); // Stop listening
                resolve(url);
            });
            // Optional: Timeout reject if user abandons flow
            setTimeout(() => {
                unlisten();
                reject(new Error("OAuth timeout"));
            }, 60000); // 60 seconds timeout
        });

        console.log("Starting OAuth server on port", port);
        const serverPort = await start({ ports: [port] });
        console.log("OAuth server started on port:", serverPort);
        
        // Construct Google Auth URL
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + 
          `response_type=id_token` + 
          `&client_id=${clientId}` + 
          `&redirect_uri=${redirectUri}` + 
          `&scope=openid%20profile%20email` + 
          `&nonce=${Math.random().toString(36).substring(7)}`;

        console.log("Opening browser at:", authUrl);
        await open(authUrl);

        // Wait for the URL from the listener
        const responseUrl = await responsePromise;
        
        // Parse the ID token from the hash fragment
        // The responseUrl will look like: http://localhost:14205/#id_token=...
        const urlObj = new URL(responseUrl);
        const hashParams = new URLSearchParams(urlObj.hash.substring(1)); // Remove leading '#'
        const idToken = hashParams.get('id_token');

        if (!idToken) {
          throw new Error("No ID token found in redirect URL");
        }

        console.log("Got ID Token, signing in to Firebase...");
        // Sign in to Firebase
        const credential = GoogleAuthProvider.credential(idToken);
        await signInWithCredential(auth, credential);

      } else {
        // Web fallback
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
      }
    } catch (error) {
      console.error("Sign in error:", error);
      alert(`Login failed: ${error}`);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};