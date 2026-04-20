import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../../contexts/AuthContext';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { isAxiosError } from 'axios';
import Card from '../../../shared/components/ui/Card';
import Alert from '../../../shared/components/ui/Alert';
import Button from '../../../shared/components/ui/Button';

const LoginPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(formData.email, formData.password);
      const redirect = searchParams.get('redirect');
      if (redirect && redirect.startsWith('/')) {
        navigate(redirect, { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (err: unknown) {
      const message = isAxiosError<{ message?: string }>(err)
        ? err.response?.data?.message
        : undefined;

      setError(message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center py-14 px-6 bg-background">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            'url(https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1920)',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/45 to-background" />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative max-w-md w-full"
      >
        <Card className="p-8 bg-surface/70 backdrop-blur-[24px] border border-white/5 shadow-2xl shadow-black/50">
          <div className="text-center mb-8">
            <div className="text-[11px] uppercase tracking-[0.28em] text-on-surface-variant font-label">
              Welcome back
            </div>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-on-surface font-headline">Đăng nhập</h2>
            <p className="text-on-surface-variant mt-2">Chào mừng bạn quay trở lại S-T-T Hotel</p>
          </div>

          {error && (
            <Alert variant="error" className="mb-4">{error}</Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <label className="block text-xs font-bold tracking-widest uppercase text-on-surface-variant mb-2 font-label">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-fixed-dim" size={20} />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 rounded-lg bg-surface-container-highest/70 text-on-surface placeholder:text-on-surface-variant/60 outline-none border border-outline-variant/15 focus:border-primary-container/40 focus:ring-2 focus:ring-primary-container/20 transition-all"
                  placeholder="email@domain.com"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold tracking-widest uppercase text-on-surface-variant mb-2 font-label">Mật khẩu</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-fixed-dim" size={20} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-10 pr-12 py-3 rounded-lg bg-surface-container-highest/70 text-on-surface placeholder:text-on-surface-variant/60 outline-none border border-outline-variant/15 focus:border-primary-container/40 focus:ring-2 focus:ring-primary-container/20 transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Remember & Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-outline-variant/30 bg-surface-container-highest text-primary-container focus:ring-primary-container/30"
                />
                <span className="ml-2 text-sm text-on-surface-variant">Ghi nhớ đăng nhập</span>
              </label>
              <span className="text-sm text-on-surface-variant">Bạn quên mật khẩu?</span>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              loading={loading}
              className="w-full py-3 rounded-lg"
            >
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </Button>
          </form>

          {/* Register Link */}
          <p className="text-center text-on-surface-variant mt-6">
            Chưa có tài khoản?{' '}
            <Link to="/register" className="text-primary-fixed-dim font-semibold hover:text-primary transition-colors">
              Đăng ký ngay
            </Link>
          </p>

          {/* Social Login */}
          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-outline-variant/20"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-surface/70 text-on-surface-variant">Hoặc đăng nhập với</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <button type="button" className="flex items-center justify-center px-4 py-3 border border-outline-variant/20 rounded-lg bg-surface-container-highest/40 hover:bg-surface-container-highest/70 hover:border-outline-variant/40 transition-all text-on-surface">
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Google
              </button>
              <button type="button" className="flex items-center justify-center px-4 py-3 border border-outline-variant/20 rounded-lg bg-surface-container-highest/40 hover:bg-surface-container-highest/70 hover:border-outline-variant/40 transition-all text-on-surface">
                <svg className="w-5 h-5 mr-2" fill="#1877F2" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                Facebook
              </button>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default LoginPage;
