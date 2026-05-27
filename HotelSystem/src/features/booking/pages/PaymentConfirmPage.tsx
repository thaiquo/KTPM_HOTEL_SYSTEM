import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { paymentApi, type CheckinPaymentStatus } from '../../../services/api';

const formatCurrency = (value: number) => `${Math.round(Number(value || 0)).toLocaleString('vi-VN')}d`;

const PaymentConfirmPage: React.FC = () => {
  const paymentCode = useMemo(() => new URLSearchParams(window.location.search).get('code') || '', []);
  const [payment, setPayment] = useState<CheckinPaymentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!paymentCode) {
        setLoading(false);
        return;
      }
      try {
        setPayment(await paymentApi.getCheckinQr(paymentCode));
      } catch (error: any) {
        toast.error(error?.response?.data?.message || 'Khong tim thay giao dich');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [paymentCode]);

  const confirmPayment = async () => {
    if (!paymentCode) return;
    try {
      setConfirming(true);
      const result = payment?.paymentType === 'LATE_CHECKOUT_FEE'
        ? await paymentApi.confirmLateCheckoutQr(paymentCode)
        : await paymentApi.confirmCheckinQr(paymentCode);
      setPayment(result);
      toast.success('Da xac nhan thanh toan');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Khong the xac nhan thanh toan');
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-50 px-4 py-10 text-center text-sm font-bold text-gray-500">Dang tai giao dich...</div>;
  }

  if (!paymentCode || !payment) {
    return <div className="min-h-screen bg-gray-50 px-4 py-10 text-center text-sm font-bold text-rose-600">Giao dich khong hop le</div>;
  }

  const paid = payment.status === 'SUCCESS';

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-md rounded-3xl bg-white p-6 shadow-xl">
        <h1 className="text-2xl font-black text-gray-900">Xac nhan thanh toan</h1>
        <p className="mt-1 text-sm text-gray-500">Kiem tra thong tin truoc khi xac nhan.</p>

        <div className="mt-6 space-y-3 rounded-2xl border border-gray-100 bg-gray-50 p-4">
          <div className="flex justify-between gap-4 text-sm">
            <span className="font-bold text-gray-500">Ma thanh toan</span>
            <span className="text-right font-black text-gray-900">{payment.paymentCode}</span>
          </div>
          <div className="flex justify-between gap-4 text-sm">
            <span className="font-bold text-gray-500">Booking</span>
            <span className="font-black text-gray-900">{payment.bookingCode}</span>
          </div>
          <div className="flex justify-between gap-4 text-sm">
            <span className="font-bold text-gray-500">So tien</span>
            <span className="font-black text-sky-700">{formatCurrency(payment.amount)}</span>
          </div>
          <div className="flex justify-between gap-4 text-sm">
            <span className="font-bold text-gray-500">Trang thai</span>
            <span className={`font-black ${paid ? 'text-emerald-600' : 'text-amber-600'}`}>{payment.status}</span>
          </div>
          <div className="flex justify-between gap-4 text-sm">
            <span className="font-bold text-gray-500">Loai thanh toan</span>
            <span className="font-black text-gray-900">{payment.paymentType === 'LATE_CHECKOUT_FEE' ? 'Phi checkout tre' : payment.paymentType || '-'}</span>
          </div>
        </div>

        <button
          type="button"
          disabled={confirming || paid || payment.status !== 'PENDING'}
          onClick={confirmPayment}
          className="mt-6 w-full rounded-2xl bg-sky-600 px-4 py-3 text-sm font-black text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {paid ? 'Da thanh toan' : confirming ? 'Dang xac nhan...' : 'Xac nhan da thanh toan'}
        </button>
      </div>
    </div>
  );
};

export default PaymentConfirmPage;
