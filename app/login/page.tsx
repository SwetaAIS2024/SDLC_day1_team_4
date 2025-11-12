'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handlePasskeyLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim()) {
      setError('Please enter your username');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // For now, create a simple session (WebAuthn can be added later)
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Login failed');
      }

      // Redirect to main page
      router.push('/todos');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to sign in. Please try again.');
      setLoading(false);
    }
  };

  const handleRegister = () => {
    // For now, just show an alert. Can be implemented later
    alert('Registration will be implemented with WebAuthn. For now, just enter any username to login.');
  };

  return (
    <div className="min-h-screen bg-[#1e2a3a] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-[#2d3f54] rounded-lg shadow-2xl p-8 border border-gray-700/50">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">Todo App</h1>
            <p className="text-gray-400 text-sm">Sign in with your passkey</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-900/50 text-red-200 rounded text-sm border border-red-700">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handlePasskeyLogin} className="space-y-4">
            {/* Username Input */}
            <div>
              <label className="block text-gray-300 text-sm mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="w-full px-4 py-2.5 bg-[#1e2a3a] border border-gray-600/50 rounded text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              />
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={loading || !username.trim()}
              className="w-full py-2.5 bg-blue-600 text-white rounded font-medium hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Signing in...' : 'Sign in with Passkey'}
            </button>

            {/* Register Link */}
            <div className="text-center">
              <button
                type="button"
                onClick={handleRegister}
                className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
              >
                Don't have an account? Register
              </button>
            </div>
          </form>

          {/* Info Text */}
          <div className="mt-6 pt-6 border-t border-gray-700/50">
            <p className="text-gray-400 text-xs text-center leading-relaxed">
              Passkeys use your device's biometrics (fingerprint, face recognition) or PIN for secure authentication. No passwords needed!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
