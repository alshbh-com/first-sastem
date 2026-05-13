import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Lock, MessageCircle } from 'lucide-react';


export default function Login() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    setLoading(true);
    setError('');
    const result = await login(password);
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      navigate('/', { replace: true });
    }
  };

  const openWhatsApp = () => {
    window.open('https://wa.me/201061067966', '_blank');
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4 overflow-hidden">
      {/* Decorative neon orbs */}
      <div className="pointer-events-none absolute -top-32 -right-32 h-96 w-96 rounded-full bg-[hsl(var(--neon-magenta)/0.25)] blur-3xl animate-orb-pulse" />
      <div className="pointer-events-none absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-[hsl(var(--neon-cyan)/0.25)] blur-3xl animate-orb-pulse" style={{ animationDelay: '2s' }} />
      <div className="pointer-events-none absolute top-1/2 left-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[hsl(var(--neon-violet)/0.18)] blur-3xl animate-orb-pulse" style={{ animationDelay: '4s' }} />

      <div className="relative z-10 w-full max-w-md">
        <div className="glass-effect rounded-2xl overflow-hidden scanline">
          <div className="neon-strip" />
          <div className="p-8 space-y-6">
            {/* Logo */}
            <div className="flex flex-col items-center space-y-3">
              <div className="relative">
                <div className="absolute inset-0 bg-[var(--gradient-neon)] blur-2xl opacity-70 animate-neon-pulse rounded-2xl" />
                <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-display text-4xl font-bold shadow-[var(--shadow-glow)]">
                  F
                </div>
              </div>
              <div className="text-center space-y-1">
                <h1 className="font-display text-3xl font-bold text-foreground neon-text">FIRST</h1>
                <p className="font-display text-[10px] tracking-[0.4em] text-[hsl(var(--neon-magenta))]">// SECURED CHANNEL · V2.0</p>
                <div className="h-px w-32 mx-auto bg-[hsl(var(--neon-cyan)/0.6)] mt-2" />
                <p className="text-sm text-muted-foreground pt-1">نظام الشحن المتكامل</p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="font-display text-[10px] tracking-[0.3em] text-[hsl(var(--neon-cyan))] flex items-center gap-2">
                  <Lock className="h-3 w-3" /> ACCESS CODE
                </label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 text-center font-mono text-lg tracking-widest bg-input/70 border-[hsl(var(--primary)/0.4)] focus-visible:ring-[hsl(var(--primary)/0.4)] focus-visible:shadow-[0_0_18px_hsl(var(--primary)/0.4)]"
                  dir="ltr"
                  autoFocus
                />
              </div>

              {error && (
                <div className="text-sm text-destructive text-center font-display tracking-widest border border-destructive/40 rounded-md py-2 bg-destructive/10">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-12 gradient-neon text-[hsl(240_30%_5%)] font-display tracking-[0.2em] hover:opacity-90 shadow-[var(--shadow-glow)] border-0"
                disabled={loading}
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'تسجيل الدخول'}
              </Button>
            </form>

            {/* WhatsApp + credit - full width */}
            <div className="space-y-2 pt-2">
              <Button
                type="button"
                onClick={openWhatsApp}
                variant="outline"
                className="w-full h-auto py-3 flex-col gap-1 bg-[hsl(142_76%_36%/0.15)] border-[hsl(142_76%_50%/0.5)] text-[hsl(142_76%_75%)] hover:bg-[hsl(142_76%_40%/0.25)] hover:text-[hsl(142_76%_85%)] shadow-[0_0_18px_hsl(142_76%_45%/0.35)]"
              >
                <span className="flex items-center gap-2 text-sm">
                  <MessageCircle className="h-4 w-4" />
                  صنع من شركة دوبامين (الشبح سابقاً)
                </span>
                <span className="font-mono text-base tracking-widest" dir="ltr">01061067966</span>
              </Button>
            </div>
          </div>
          <div className="neon-strip opacity-60" />
        </div>

        <p className="text-center mt-6 font-display text-[10px] tracking-[0.4em] text-muted-foreground">
          © {new Date().getFullYear()} FIRST · LOGISTICS GRID
        </p>
      </div>
    </div>
  );
}
