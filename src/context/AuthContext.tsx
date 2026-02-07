import React, { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { 
  onAuthStateChanged, 
  signInWithPopup,
  GoogleAuthProvider, 
  signOut,
  signInWithCredential
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { start, onUrl } from '@fabianlars/tauri-plugin-oauth';
import { open } from '@tauri-apps/plugin-shell';
import { AuthContext } from './authContextBase';

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
      const tauriWindow = window as Window & {
        __TAURI_INTERNALS__?: unknown;
        __TAURI__?: unknown;
      };
      const isTauri = !!(tauriWindow.__TAURI_INTERNALS__ || tauriWindow.__TAURI__);
      
      if (isTauri) {
        const port = 14205;
        const clientId = "134216999860-hj267d4gs8b5gg61gv65141s0jj6bsqv.apps.googleusercontent.com";
        const redirectUri = `http://localhost:${port}`;
        
        console.log("Setting up OAuth listener...");
        
        // Создаём промис, который завершится при получении URL редиректа
        const responsePromise = new Promise<string>((resolve, reject) => {
          let unlisten: (() => void) | null = null;

          const setupListener = async () => {
            const stopListening = await onUrl((url: string) => {
              console.log("Captured OAuth URL via listener:", url);
              stopListening(); // Останавливаем слушатель
              resolve(url);
            });
            unlisten = stopListening;
          };

          setupListener().catch(reject);

          // Таймаут на случай, если пользователь прервёт процесс
          setTimeout(() => {
            if (unlisten) {
              unlisten();
            }
            reject(new Error("OAuth timeout"));
          }, 60000); // Таймаут 60 секунд
        });

        console.log("Starting OAuth server on port", port);
        const serverPort = await start({ ports: [port] });
        console.log("OAuth server started on port:", serverPort);
        
        // Формируем URL для Google OAuth
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + 
          `response_type=id_token` + 
          `&client_id=${clientId}` + 
          `&redirect_uri=${redirectUri}` + 
          `&scope=openid%20profile%20email` + 
          `&nonce=${Math.random().toString(36).substring(7)}`;

        console.log("Opening browser at:", authUrl);
        await open(authUrl);

        // Ждём URL из слушателя
        const responseUrl = await responsePromise;
        
        // Достаём ID токен из hash-фрагмента
        // URL будет выглядеть так: http://localhost:14205/#id_token=...
        const urlObj = new URL(responseUrl);
        const hashParams = new URLSearchParams(urlObj.hash.substring(1)); // Убираем ведущий '#'
        const idToken = hashParams.get('id_token');

        if (!idToken) {
          throw new Error("No ID token found in redirect URL");
        }

        console.log("Got ID Token, signing in to Firebase...");
        // Входим в Firebase
        const credential = GoogleAuthProvider.credential(idToken);
        await signInWithCredential(auth, credential);

      } else {
        // Веб-вариант входа
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
