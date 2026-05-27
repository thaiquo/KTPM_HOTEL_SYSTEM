import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../../contexts/AuthContext';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { isAxiosError } from 'axios';
import Card from '../../../shared/components/ui/Card';
import Alert from '../../../shared/components/ui/Alert';
import Button from '../../../shared/components/ui/Button';
import { getManagementHomeByRole } from '../../../shared/lib/roleRoute';

const LoginPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, user, isAuthenticated } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  // Already logged in → redirect to role dashboard or redirect param
  // RULE: role-based home takes priority over redirect='/' to prevent STAFF landing on homepage
  if (isAuthenticated && user) {
    const roleHome = getManagementHomeByRole(user.role);
    const redirect = searchParams.get('redirect');
    let redirectTarget = roleHome;
    
    if (redirect && redirect.startsWith('/') && redirect !== '/') {
      if (roleHome === '/staff' && redirect.startsWith('/staff')) redirectTarget = redirect;
      else if (roleHome === '/admin' && redirect.startsWith('/admin')) redirectTarget = redirect;
      else if (roleHome === '/' && !redirect.startsWith('/staff') && !redirect.startsWith('/admin')) redirectTarget = redirect;
    }
    return <Navigate to={redirectTarget} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const loggedInUser = await login(formData.email, formData.password);
      const roleHome = getManagementHomeByRole(loggedInUser?.role);
      const redirect = searchParams.get('redirect');
      
      let redirectTarget = roleHome;
      if (redirect && redirect.startsWith('/') && redirect !== '/') {
        if (roleHome === '/staff' && redirect.startsWith('/staff')) redirectTarget = redirect;
        else if (roleHome === '/admin' && redirect.startsWith('/admin')) redirectTarget = redirect;
        else if (roleHome === '/' && !redirect.startsWith('/staff') && !redirect.startsWith('/admin')) redirectTarget = redirect;
      }
      navigate(redirectTarget, { replace: true });
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
    <div className="min-h-screen flex items-center justify-center py-14 px-6 bg-white">
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        <Card className="p-8 bg-white border border-black/10 shadow-lg">
          <div className="text-center mb-8">
            <div className="text-[11px] uppercase tracking-[0.28em] text-[#d4af37] font-label">
              Welcome back
            </div>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[#0f0f0f] font-headline">Đăng nhập</h2>
            <p className="text-[#666] mt-2">Chào mừng bạn quay trở lại TriStar Hotel</p>
          </div>

          {error && (
            <Alert variant="error" className="mb-4">{error}</Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <label className="block text-xs font-bold tracking-widest uppercase text-[#0f0f0f] mb-2 font-label">email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[#d4af37]" size={20} />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 rounded-lg bg-[#f7f7f7] text-[#0f0f0f] placeholder:text-[#999] outline-none border border-[#ddd] focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/20 transition-all"
                  placeholder="thinh@gmail.com"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold tracking-widest uppercase text-[#0f0f0f] mb-2 font-label">Mật khẩu</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#d4af37]" size={20} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-10 pr-12 py-3 rounded-lg bg-[#f7f7f7] text-[#0f0f0f] placeholder:text-[#999] outline-none border border-[#ddd] focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/20 transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#999] hover:text-[#0f0f0f] transition-colors"
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
                  className="w-4 h-4 rounded border-[#ddd] bg-white text-[#d4af37] focus:ring-[#d4af37]/30"
                />
                <span className="ml-2 text-sm text-[#666]">Ghi nhớ đăng nhập</span>
              </label>
              <span className="text-sm text-[#666]">Bạn quên mật khẩu?</span>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              loading={loading}
              className="w-full py-3 rounded-lg bg-[#d4af37] text-[#0f0f0f] font-extrabold hover:bg-[#c49820] transition-all"
            >
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </Button>
          </form>

          {/* Register Link */}
          <p className="text-center text-[#666] mt-6">
            Chưa có tài khoản?{' '}
            <Link to="/register" className="text-[#d4af37] font-semibold hover:text-[#c49820] transition-colors">
              Đăng ký ngay
            </Link>
          </p>

        </Card>
      </motion.div>
    </div>
  );
};

export default LoginPage;
