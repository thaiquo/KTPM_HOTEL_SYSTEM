import { CreditCard, ReceiptText } from 'lucide-react';

import type { BookingWithRoom } from './bookingHistoryView';
import {
  getBookingStatusLabel,
  getPaymentSummaryRows,
} from './bookingHistoryView';

type PaymentSummaryProps = {
  booking: BookingWithRoom;
};

export default function PaymentSummary({ booking }: PaymentSummaryProps) {
  const rows = getPaymentSummaryRows(booking);

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
          <CreditCard size={20} />
        </div>
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">Thanh toán</div>
          <h4 className="mt-1 text-xl font-black text-slate-950">Tổng kết giao dịch</h4>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="flex items-start justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
            <span className="text-sm font-medium text-slate-500">{row.label}</span>
            <span className="text-right text-sm font-black text-slate-900">{row.value}</span>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-3xl border border-slate-200 bg-white px-4 py-4">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
          <ReceiptText size={14} />
          Trạng thái booking
        </div>
        <div className="mt-2 text-sm font-black text-slate-900">{getBookingStatusLabel(booking)}</div>
      </div>
    </div>
  );
}
