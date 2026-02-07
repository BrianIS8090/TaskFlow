import React, { useState } from 'react';
import { Check, X } from 'lucide-react';
import { useAuth } from '../../context/useAuth';

interface LoginFormProps {
  onClose?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onClose }) => {
  const { signInWithGoogle } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const isTauri = '__TAURI__' in window;

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
      if (onClose) onClose();
    } catch (err: unknown) {
      setError('Ошибка входа через Google. Проверьте консоль.');
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900 bg-black/60 backdrop-blur-sm">
      {/* Фоновая подсветка для экрана входа */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md">
        {onClose && (
          <button 
            onClick={onClose}
            className="absolute -top-12 right-0 p-2 text-white/50 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        )}

        <div className="backdrop-blur-2xl bg-slate-800/90 rounded-3xl p-8 border border-white/10 shadow-2xl relative z-10">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30">
              <Check className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-semibold text-white mb-2">Вход в TaskFlow</h1>
            <p className="text-white/60 text-sm">Синхронизируйте задачи между устройствами</p>
          </div>

          <div className="space-y-4">
            {isTauri ? (
              <>
                <div className="text-center p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
                  <p className="text-white/80 text-sm mb-2">
                    В desktop-версии доступен локальный режим.
                  </p>
                  <p className="text-white/50 text-xs">
                    Для синхронизации используйте веб-версию
                  </p>
                </div>
                <button 
                  onClick={onClose}
                  className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                >
                  Продолжить без входа
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={handleGoogleLogin}
                  className="w-full py-3 bg-white text-slate-900 font-medium rounded-xl hover:bg-gray-100 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Войти через Google
                </button>
                
                {error && (
                  <p className="text-red-400 text-sm text-center bg-red-500/10 p-2 rounded-lg">
                    {error}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
