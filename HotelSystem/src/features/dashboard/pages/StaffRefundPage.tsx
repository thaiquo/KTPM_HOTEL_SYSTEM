import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { staffRefundApi, type RefundRecord } from '../../../services/api';

const formatCurrency = (value: number) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;

const StaffRefundPage: React.FC = () => {
  const [items, setItems] = useState<RefundRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});

  const fetchData = async () => {
    try {
      setLoading(true);
      setItems(await staffRefundApi.getAll());
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Không thể tải yêu cầu hoàn tiền');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const runAction = async (message: string, action: () => Promise<RefundRecord>) => {
    try {
      await action();
      toast.success(message);
      fetchData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Thao tác thất bại');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Xử lý Hoàn tiền</h1>
        <p className="text-sm text-gray-500 mt-1">Yêu cầu hoàn tiền vào queue chung, staff nhận xử lý thủ công.</p>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-sm font-bold text-gray-400">Đang tải yêu cầu...</div>
        ) : items.length === 0 ? (
          <div className="py-20 text-center text-sm font-bold text-gray-400">Không có yêu cầu hoàn tiền</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase">Yêu cầu</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase">Số tiền</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase">Trạng thái</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase">Lý do từ chối</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((refund) => (
                  <tr key={refund.id}>
                    <td className="px-6 py-5">
                      <div className="text-sm font-bold text-gray-900">Refund #{refund.id}</div>
                      <div className="text-xs text-gray-400">Booking #{refund.bookingId} · Staff {refund.assignedTo || 'chưa nhận'}</div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-sm font-bold text-gray-900">{formatCurrency(refund.refundAmount)}</div>
                      <div className="text-xs text-gray-500">Đã trả {formatCurrency(refund.paidAmount)}</div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-bold text-gray-600">{refund.status}</span>
                    </td>
                    <td className="px-6 py-5">
                      <input
                        value={rejectReason[refund.id] || ''}
                        onChange={(event) => setRejectReason({ ...rejectReason, [refund.id]: event.target.value })}
                        placeholder="Nhập lý do nếu từ chối"
                        className="w-56 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                      />
                    </td>
                    <td className="px-6 py-5 text-right space-x-2">
                      {refund.status === 'PENDING' && (
                        <button onClick={() => runAction('Đã nhận xử lý', () => staffRefundApi.assign(refund.id))} className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-bold text-white">Nhận xử lý</button>
                      )}
                      {(refund.status === 'ASSIGNED' || refund.status === 'PROCESSING') && (
                        <>
                          <button onClick={() => runAction('Đã duyệt hoàn tiền', () => staffRefundApi.approve(refund.id))} className="rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white">Duyệt</button>
                          <button onClick={() => runAction('Đã từ chối hoàn tiền', () => staffRefundApi.reject(refund.id, rejectReason[refund.id] || 'Refund rejected by staff'))} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white">Từ chối</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffRefundPage;
