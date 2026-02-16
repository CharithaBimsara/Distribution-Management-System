import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Eye, EyeOff, Loader2, LogIn, Sparkles, Shield, Truck } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading, error, isAuthenticated, user, clearError } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && user) {
      const routes: Record<string, string> = { Admin: '/admin', SalesRep: '/rep', Customer: '/shop' };
      navigate(routes[user.role] || '/login');
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    await login(username, password);
  };

  const demoAccounts = [
    { label: 'Admin', desc: 'Full access', user: 'admin', pass: 'Admin@123', icon: Shield, color: '#818cf8', bg: 'rgba(99, 102, 241, 0.15)', border: 'rgba(99, 102, 241, 0.25)' },
    { label: 'Sales Rep', desc: 'Field sales', user: 'rep.kamal', pass: 'Rep@123', icon: Truck, color: '#34d399', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.25)' },
    { label: 'Customer', desc: 'Shop owner', user: 'shop.laksiri', pass: 'Cust@123', icon: Sparkles, color: '#fb923c', bg: 'rgba(249, 115, 22, 0.15)', border: 'rgba(249, 115, 22, 0.25)' },
  ];

  return (
    <div
      className="min-h-screen flex items-center justify-center p-5 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)' }}
    >
      {/* Animated background orbs */}
      <div
        className="absolute w-[500px] h-[500px] rounded-full animate-pulse-glow"
        style={{ top: '-15%', left: '-10%', background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)' }}
      />
      <div
        className="absolute w-[400px] h-[400px] rounded-full animate-pulse-glow"
        style={{ bottom: '-10%', right: '-10%', background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)', animationDelay: '1.5s' }}
      />
      <div
        className="absolute w-[300px] h-[300px] rounded-full animate-pulse-glow"
        style={{ top: '40%', left: '60%', background: 'radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%)', animationDelay: '3s' }}
      />

      {/* Dot grid pattern */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Main Content */}
      <div className="w-full max-w-[420px] relative z-10 animate-fade-in-scale">

        {/* Logo */}
        <div className="text-center mb-10">
          <div
            className="inline-flex items-center justify-center w-[72px] h-[72px] rounded-[20px] mb-6 animate-float"
            style={{
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              boxShadow: '0 8px 32px rgba(99, 102, 241, 0.35), 0 0 0 1px rgba(255,255,255,0.1) inset',
            }}
          >
            <span className="text-white font-black text-[28px]">D</span>
          </div>
          <h1 className="text-[28px] font-extrabold text-white tracking-tight leading-tight">
            Distribution<span style={{ color: '#818cf8' }}>MS</span>
          </h1>
          <p className="text-[14px] mt-2" style={{ color: '#64748b' }}>
            Wholesale Distribution Management
          </p>
        </div>

        {/* Login Card */}
        <div
          className="rounded-[20px] p-8"
          style={{
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 24px 48px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255,255,255,0.05) inset',
          }}
        >
          {error && (
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-[12px] mb-6 text-[13px] font-medium animate-scale-in"
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                color: '#fca5a5',
              }}
            >
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#f87171' }} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username */}
            <div>
              <label className="block text-[13px] font-semibold mb-2.5" style={{ color: '#94a3b8' }}>
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
                className="w-full transition-all duration-200 outline-none"
                style={{
                  padding: '14px 16px',
                  fontSize: '14px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1.5px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '14px',
                  color: '#f1f5f9',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'rgba(99, 102, 241, 0.5)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.15)';
                  e.target.style.background = 'rgba(255, 255, 255, 0.08)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                  e.target.style.boxShadow = 'none';
                  e.target.style.background = 'rgba(255, 255, 255, 0.06)';
                }}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-[13px] font-semibold mb-2.5" style={{ color: '#94a3b8' }}>
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full transition-all duration-200 outline-none"
                  style={{
                    padding: '14px 48px 14px 16px',
                    fontSize: '14px',
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1.5px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '14px',
                    color: '#f1f5f9',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'rgba(99, 102, 241, 0.5)';
                    e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.15)';
                    e.target.style.background = 'rgba(255, 255, 255, 0.08)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    e.target.style.boxShadow = 'none';
                    e.target.style.background = 'rgba(255, 255, 255, 0.06)';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors"
                  style={{ color: '#64748b' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#cbd5e1')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#64748b')}
                >
                  {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                </button>
              </div>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full font-semibold flex items-center justify-center gap-2.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                padding: '15px 24px',
                fontSize: '15px',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: 'white',
                borderRadius: '14px',
                border: 'none',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 20px rgba(99, 102, 241, 0.35)',
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.boxShadow = '0 8px 32px rgba(99, 102, 241, 0.5)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(99, 102, 241, 0.35)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
              onMouseDown={(e) => { if (!isLoading) e.currentTarget.style.transform = 'scale(0.98)'; }}
              onMouseUp={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
            >
              {isLoading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Signing in...</>
              ) : (
                <><LogIn className="w-5 h-5" /> Sign In</>
              )}
            </button>
          </form>
        </div>

        {/* Demo Accounts */}
        <div className="mt-8">
          <div className="flex items-center gap-4 mb-5">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: '#475569' }}>
              Quick Demo Access
            </span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            {demoAccounts.map((demo) => (
              <button
                key={demo.user}
                onClick={() => { setUsername(demo.user); setPassword(demo.pass); }}
                className="text-center transition-all duration-200 cursor-pointer"
                style={{
                  padding: '16px 8px',
                  background: demo.bg,
                  border: `1px solid ${demo.border}`,
                  borderRadius: '16px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = `0 8px 24px rgba(0,0,0,0.2)`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.95)'; }}
                onMouseUp={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
              >
                <div
                  className="w-10 h-10 rounded-[12px] flex items-center justify-center mx-auto mb-2.5"
                  style={{
                    background: `linear-gradient(135deg, ${demo.color}, ${demo.color}dd)`,
                    boxShadow: `0 4px 12px ${demo.color}40`,
                  }}
                >
                  <demo.icon className="w-[18px] h-[18px] text-white" />
                </div>
                <p className="text-[13px] font-semibold text-white">{demo.label}</p>
                <p className="text-[11px] mt-0.5" style={{ color: '#64748b' }}>{demo.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Register Link */}
        <div className="text-center mt-6">
          <p className="text-[14px]" style={{ color: '#64748b' }}>
            New to DistributionMS?{' '}
            <Link
              to="/register"
              className="font-semibold transition-all duration-200 hover:underline"
              style={{ color: '#818cf8' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#a5b4fc'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#818cf8'; }}
            >
              Create your account
            </Link>
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-[12px] mt-10" style={{ color: '#334155' }}>
          &copy; {new Date().getFullYear()} Janasiri Distributors &middot; All rights reserved
        </p>
      </div>
    </div>
  );
}
