import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Mail, Lock, Phone, Eye, EyeOff, Calendar } from 'lucide-react';
import { isAxiosError } from 'axios';
import Card from '../../../shared/components/ui/Card';
import Alert from '../../../shared/components/ui/Alert';
import Button from '../../../shared/components/ui/Button';
import { authApi } from '../../../services/api';

const RegisterPage = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'register' | 'otp-method' | 'otp-verify'>('register');
  const [otp, setOtp] = useState('');
  const [otpSentVia, setOtpSentVia] = useState<'EMAIL' | 'PHONE' | ''>('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    dateOfBirth: '',
    password: '',
    confirmPassword: '',
  });

  const handleRegisterSubmit = async (e: React.FormEvent) => {
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
      await authApi.register({
        name: formData.name,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        dateOfBirth: formData.dateOfBirth,
        password: formData.password,
        role: 'CUSTOMER',
      });
      setStep('otp-method');
    } catch (err: unknown) {
      const message = isAxiosError<{ message?: string }>(err)
        ? err.response?.data?.message
        : undefined;

      setError(message || 'Đăng ký thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpMethodSelect = async (method: 'EMAIL' | 'PHONE') => {
    setError('');
    setLoading(true);
    try {
      await authApi.sendOtp(method);
      setOtpSentVia(method);
      setStep('otp-verify');
    } catch (err: unknown) {
      const message = isAxiosError<{ message?: string }>(err)
        ? err.response?.data?.message
        : undefined;
      setError(message || 'Không thể gửi OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authApi.verifyOtp(otp);
      navigate('/login?registered=true', { replace: true });
    } catch (err: unknown) {
      const message = isAxiosError<{ message?: string }>(err)
        ? err.response?.data?.message
        : undefined;
      setError(message || 'OTP không hợp lệ');
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
              Create account
            </div>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[#0f0f0f] font-headline">Đăng ký</h2>
            <p className="text-[#666] mt-2">Khởi đầu hành trình tại TriStar Hotel</p>
          </div>

          {error && (
            <Alert variant="error" className="mb-4">{error}</Alert>
          )}

          {step === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-5">
            {/* Name */}
            <div>
              <label className="block text-xs font-bold tracking-widest uppercase text-[#0f0f0f] mb-2 font-label">Họ và tên</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-[#d4af37]" size={18} />
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 rounded-lg bg-[#f7f7f7] text-[#0f0f0f] placeholder:text-[#999] outline-none border border-[#ddd] focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/20 transition-all"
                  placeholder="Nguyễn Văn A"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold tracking-widest uppercase text-[#0f0f0f] mb-2 font-label">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[#d4af37]" size={18} />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 rounded-lg bg-[#f7f7f7] text-[#0f0f0f] placeholder:text-[#999] outline-none border border-[#ddd] focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/20 transition-all"
                  placeholder="email@domain.com"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-bold tracking-widest uppercase text-[#0f0f0f] mb-2 font-label">Số điện thoại</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-[#d4af37]" size={18} />
                <input
                  type="tel"
                  required
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 rounded-lg bg-[#f7f7f7] text-[#0f0f0f] placeholder:text-[#999] outline-none border border-[#ddd] focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/20 transition-all"
                  placeholder="0901234567"
                />
              </div>
            </div>

            {/* Date of Birth */}
            <div>
              <label className="block text-xs font-bold tracking-widest uppercase text-[#0f0f0f] mb-2 font-label">Ngày sinh</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-[#d4af37]" size={18} />
                <input
                  type="date"
                  required
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 rounded-lg bg-[#f7f7f7] text-[#0f0f0f] placeholder:text-[#999] outline-none border border-[#ddd] focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/20 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold tracking-widest uppercase text-[#0f0f0f] mb-2 font-label">Mật khẩu</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#d4af37]" size={18} />
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
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-bold tracking-widest uppercase text-[#0f0f0f] mb-2 font-label">Xác nhận mật khẩu</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#d4af37]" size={18} />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full pl-10 pr-12 py-3 rounded-lg bg-[#f7f7f7] text-[#0f0f0f] placeholder:text-[#999] outline-none border border-[#ddd] focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/20 transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#999] hover:text-[#0f0f0f] transition-colors"
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
                className="w-4 h-4 mt-1 rounded border-[#ddd] bg-white text-[#d4af37] focus:ring-[#d4af37]/30 transition-all cursor-pointer"
              />
              <label className="ml-2 text-sm text-[#666] leading-relaxed">
                Tôi đồng ý với Điều khoản sử dụng và Chính sách bảo mật.
              </label>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              loading={loading}
              className="w-full py-3 rounded-lg bg-[#d4af37] text-[#0f0f0f] font-extrabold hover:bg-[#c49820] transition-all"
            >
              {loading ? 'Đang tạo tài khoản...' : 'Tiếp tục'}
            </Button>
          </form>
          )}

          {step === 'otp-method' && (
          <div className="space-y-4">
            <p className="text-center text-[#666] mb-6">Chọn phương thức xác thực OTP:</p>
            <button
              onClick={() => handleOtpMethodSelect('EMAIL')}
              disabled={loading}
              className="w-full py-4 px-4 rounded-lg border-2 border-[#d4af37] bg-white text-[#0f0f0f] font-bold hover:bg-[#f7f7f7] transition-all disabled:opacity-50"
            >
              📧 Gửi OTP qua Email
            </button>
            <button
              onClick={() => handleOtpMethodSelect('PHONE')}
              disabled={loading}
              className="w-full py-4 px-4 rounded-lg border-2 border-[#d4af37] bg-white text-[#0f0f0f] font-bold hover:bg-[#f7f7f7] transition-all disabled:opacity-50"
            >
              📱 Gửi OTP qua SMS
            </button>
            <button
              onClick={() => setStep('register')}
              className="w-full py-3 rounded-lg bg-[#ddd] text-[#666] font-bold hover:bg-[#ccc] transition-all mt-4"
            >
              Quay lại
            </button>
          </div>
          )}

          {step === 'otp-verify' && (
          <form onSubmit={handleOtpVerify} className="space-y-6">
            <div>
              <p className="text-center text-[#666] mb-4">
                Mã OTP đã được gửi tới {otpSentVia === 'EMAIL' ? formData.email : formData.phoneNumber}
              </p>
              <label className="block text-xs font-bold tracking-widest uppercase text-[#0f0f0f] mb-2 font-label">Mã OTP</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  className="w-full px-4 py-3 rounded-lg bg-[#f7f7f7] text-[#0f0f0f] text-center text-2xl font-bold tracking-widest placeholder:text-[#999] outline-none border border-[#ddd] focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/20 transition-all"
                  placeholder="000000"
                />
              </div>
            </div>
            <Button
              type="submit"
              loading={loading}
              className="w-full py-3 rounded-lg bg-[#d4af37] text-[#0f0f0f] font-extrabold hover:bg-[#c49820] transition-all"
            >
              {loading ? 'Đang xác thực...' : 'Xác thực OTP'}
            </Button>
            <button
              type="button"
              onClick={() => setStep('otp-method')}
              className="w-full py-3 rounded-lg bg-[#ddd] text-[#666] font-bold hover:bg-[#ccc] transition-all"
            >
              Quay lại
            </button>
          </form>
          )}

          {/* Login Link */}
          {step === 'register' && (
          <p className="text-center text-[#666] mt-6">
            Đã có tài khoản?{' '}
            <Link to="/login" className="text-[#d4af37] font-semibold hover:text-[#c49820] transition-colors">
              Đăng nhập
            </Link>
          </p>
          )}
        </Card>
      </motion.div>
    </div>
  );
};

export default RegisterPage;

