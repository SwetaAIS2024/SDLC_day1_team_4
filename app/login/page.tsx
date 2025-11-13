'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isWebAuthnSupported, setIsWebAuthnSupported] = useState(true); // Assume true initially
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  // Check WebAuthn support on client side only
  useEffect(() => {
    setMounted(true);
    setIsWebAuthnSupported(
      typeof window !== 'undefined' && window.PublicKeyCredential !== undefined
    );
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim()) {
      setError('Please enter your username');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Get registration options from server
      const optionsRes = await fetch('/api/auth/register-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() }),
      });

      if (!optionsRes.ok) {
        const data = await optionsRes.json();
        throw new Error(data.error || 'Failed to start registration');
      }

      const { options } = await optionsRes.json();

      // 2. Trigger WebAuthn registration (browser prompt)
      const credential = await startRegistration(options);

      // 3. Verify registration with server
      const verifyRes = await fetch('/api/auth/register-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), credential }),
      });

      if (!verifyRes.ok) {
        const data = await verifyRes.json();
        throw new Error(data.error || 'Registration verification failed');
      }

      // Success! Redirect to todos
      router.push('/todos');
      router.refresh();
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setError('Registration cancelled or timed out');
      } else {
        setError(err.message || 'Registration failed');
      }
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim()) {
      setError('Please enter your username');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Get authentication options
      const optionsRes = await fetch('/api/auth/login-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() }),
      });

      if (!optionsRes.ok) {
        const data = await optionsRes.json();
        throw new Error(data.error || 'Failed to start login');
      }

      const { options } = await optionsRes.json();

      // 2. Trigger WebAuthn authentication
      const credential = await startAuthentication(options);

      // 3. Verify authentication with server
      const verifyRes = await fetch('/api/auth/login-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), credential }),
      });

      if (!verifyRes.ok) {
        const data = await verifyRes.json();
        throw new Error(data.error || 'Login verification failed');
      }

      // Success! Redirect to todos
      router.push('/todos');
      router.refresh();
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setError('Login cancelled or timed out');
      } else {
        setError(err.message || 'Login failed');
      }
      setLoading(false);
    }
  };

  // Don't show anything until mounted to avoid hydration mismatch
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-blue-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center p-6 transition-colors duration-200">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-10 border border-gray-100 dark:border-slate-700 transition-colors duration-200">
            <div className="text-center">
              <p className="text-gray-600 dark:text-slate-400">Loading...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isWebAuthnSupported) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="text-center max-w-md p-8">
          <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Browser Not Supported</h1>
          <p className="text-gray-600 dark:text-slate-400 mb-2">
            Your browser doesn't support WebAuthn/Passkeys.
          </p>
          <p className="text-sm text-gray-500 dark:text-slate-500">
            Please use a modern browser (Chrome 67+, Firefox 60+, Safari 13+, Edge 18+).
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-blue-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center p-6 transition-colors duration-200">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl dark:shadow-slate-900/50 p-10 border border-gray-100 dark:border-slate-700 transition-colors duration-200">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3 transition-colors duration-200">Todo App</h1>
            <p className="text-gray-600 dark:text-slate-400 text-base transition-colors duration-200">
              {isRegistering ? 'Create your account' : 'Sign in with your passkey'}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm border border-red-200 dark:border-red-800 transition-colors duration-200">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-5">
            {/* Username Input */}
            <div>
              <label className="block text-gray-700 dark:text-slate-300 text-sm font-medium mb-2 transition-colors duration-200">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="w-full px-4 py-3 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white text-base placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all duration-200"
                disabled={loading}
                required
                minLength={3}
                maxLength={50}
                pattern="[a-zA-Z0-9_-]+"
                title="Only letters, numbers, underscore, and dash allowed"
              />
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={loading || !username.trim()}
              className="w-full py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-lg font-medium text-base hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
            >
              {loading ? 
                (isRegistering ? 'Registering...' : 'Signing in...') : 
                (isRegistering ? 'Register with Passkey' : 'Sign in with Passkey')
              }
            </button>

            {/* Register Link */}
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(!isRegistering);
                  setError(null);
                }}
                disabled={loading}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium transition-colors duration-200"
              >
                {isRegistering ? 'Already have an account? Sign in' : 'Don\'t have an account? Register'}
              </button>
            </div>
          </form>

          {/* Info Box */}
          <div className="mt-8 p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg transition-colors duration-200">
            <p className="text-gray-600 dark:text-slate-300 text-sm leading-relaxed transition-colors duration-200">
              <span className="font-semibold text-gray-800 dark:text-slate-200">Passkeys</span> use your device&apos;s biometrics (fingerprint, face recognition) or PIN for secure authentication. No passwords needed!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
