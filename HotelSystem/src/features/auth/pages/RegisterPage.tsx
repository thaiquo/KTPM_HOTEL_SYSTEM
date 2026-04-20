import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../../contexts/AuthContext';
import { User, Mail, Lock, Phone, Eye, EyeOff } from 'lucide-react';
import { isAxiosError } from 'axios';
import Card from '../../../shared/components/ui/Card';
import Alert from '../../../shared/components/ui/Alert';
import Button from '../../../shared/components/ui/Button';

const RegisterPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { register } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    if (formData.password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    setLoading(true);

    try {
      await register({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
      });
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

      setError(message || 'Đăng ký thất bại');
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
            'url(https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1920)',
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
              Create account
            </div>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-on-surface font-headline">Đăng ký</h2>
            <p className="text-on-surface-variant mt-2 font-medium">Khởi đầu hành trình lãng mạn tại S-T-T</p>
          </div>

          {error && (
            <Alert variant="error" className="mb-4">{error}</Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div>
              <label className="block text-xs font-bold tracking-widest uppercase text-on-surface-variant mb-2 font-label">Họ và tên</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-fixed-dim" size={18} />
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface-container-highest/70 text-on-surface placeholder:text-on-surface-variant/60 outline-none border border-outline-variant/15 focus:border-primary-container/40 focus:ring-2 focus:ring-primary-container/20 transition-all font-medium"
                  placeholder="Nguyễn Văn A"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold tracking-widest uppercase text-on-surface-variant mb-2 font-label">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-fixed-dim" size={18} />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface-container-highest/70 text-on-surface placeholder:text-on-surface-variant/60 outline-none border border-outline-variant/15 focus:border-primary-container/40 focus:ring-2 focus:ring-primary-container/20 transition-all font-medium"
                  placeholder="email@domain.com"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-bold tracking-widest uppercase text-on-surface-variant mb-2 font-label">Số điện thoại</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-fixed-dim" size={18} />
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface-container-highest/70 text-on-surface placeholder:text-on-surface-variant/60 outline-none border border-outline-variant/15 focus:border-primary-container/40 focus:ring-2 focus:ring-primary-container/20 transition-all font-medium"
                  placeholder="0901234567"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold tracking-widest uppercase text-on-surface-variant mb-2 font-label">Mật khẩu</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-fixed-dim" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-10 pr-12 py-3 rounded-xl bg-surface-container-highest/70 text-on-surface placeholder:text-on-surface-variant/60 outline-none border border-outline-variant/15 focus:border-primary-container/40 focus:ring-2 focus:ring-primary-container/20 transition-all font-medium"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-bold tracking-widest uppercase text-on-surface-variant mb-2 font-label">Xác nhận mật khẩu</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-fixed-dim" size={18} />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full pl-10 pr-12 py-3 rounded-xl bg-surface-container-highest/70 text-on-surface placeholder:text-on-surface-variant/60 outline-none border border-outline-variant/15 focus:border-primary-container/40 focus:ring-2 focus:ring-primary-container/20 transition-all font-medium"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Terms */}
            <div className="flex items-start">
              <input
                type="checkbox"
                required
                className="w-4 h-4 mt-1 rounded border-outline-variant/30 bg-surface-container-highest text-primary-container focus:ring-primary-container/30 transition-all cursor-pointer"
              />
              <label className="ml-2 text-sm text-on-surface-variant font-medium leading-relaxed">
                Tôi đồng ý với Điều khoản sử dụng và Chính sách bảo mật.
              </label>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              loading={loading}
              className="w-full py-3.5 rounded-xl font-bold tracking-wide shadow-lg shadow-primary/10 hover:shadow-primary/20 transition-all active:scale-[0.98]"
            >
              {loading ? 'Đang tạo tài khoản...' : 'Đăng ký ngay'}
            </Button>
          </form>

          {/* Login Link */}
          <p className="text-center text-on-surface-variant mt-8 font-medium">
            Đã có tài khoản?{' '}
            <Link to="/login" className="text-primary-fixed-dim font-bold hover:text-primary transition-colors">
              Đăng nhập
            </Link>
          </p>
        </Card>
      </motion.div>
    </div>
  );
};

export default RegisterPage;

