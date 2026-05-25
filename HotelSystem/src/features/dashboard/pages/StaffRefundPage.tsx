import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CheckCircle2, Clock3, Filter, RefreshCw, Search, ShieldAlert, TriangleAlert, Wallet } from 'lucide-react';
import Card from '../../../shared/components/ui/Card';
import Button from '../../../shared/components/ui/Button';
import { staffBookingApi, staffRefundApi, type RefundRecord, userApi } from '../../../services/api';

const formatCurrency = (value: number) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;

const formatDateTime = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
};

const normalize = (value?: string) => (value || '').toUpperCase();

const getStatusTone = (status: string) => {
  switch (normalize(status)) {
    case 'PENDING':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'ASSIGNED':
      return 'bg-sky-50 text-sky-700 border-sky-200';
    case 'PROCESSING':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    case 'APPROVED':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'REFUNDED':
      return 'bg-green-50 text-green-700 border-green-200';
    case 'REJECTED':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    case 'FAILED':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'OVERDUE':
      return 'bg-orange-50 text-orange-700 border-orange-200';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200';
  }
};

const getStatusLabel = (status: string) => {
  switch (normalize(status)) {
    case 'PENDING':
      return 'Chờ nhận';
    case 'ASSIGNED':
      return 'Đã nhận';
    case 'PROCESSING':
      return 'Đang xử lý';
    case 'APPROVED':
      return 'Đã xử lý';
    case 'REFUNDED':
      return 'Đã hoàn';
    case 'FAILED':
      return 'Lỗi hoàn tiền';
    case 'OVERDUE':
      return 'Quá hạn';
    default:
      return status || 'Unknown';
  }
};

const getMethodLabel = (method?: string) => {
  const m = normalize(method);
  if (!m) return 'Chưa rõ';
  if (m.includes('VNPAY')) return 'VNPAY';
  if (m.includes('CASH')) return 'Tiền mặt';
  if (m.includes('BANK')) return 'Chuyển khoản';
  return method || 'Khác';
};

const getPriorityLabel = (priority?: string) => {
  const p = normalize(priority);
  if (p === 'HIGH') return 'Ưu tiên cao';
  if (p === 'NORMAL') return 'Bình thường';
  return priority || '-';
};

const statusOptions = ['WORK', 'ALL', 'ASSIGNED', 'PROCESSING', 'OVERDUE'] as const;

type StatusFilter = (typeof statusOptions)[number];

const typeOptions = ['ALL_TYPES', 'CANCELLATION', 'EARLY_CHECKOUT', 'ROOM_CHANGE'] as const;

type TypeFilter = (typeof typeOptions)[number];

const StaffRefundPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState<RefundRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesterNameByRefund, setRequesterNameByRefund] = useState<Record<string, string>>({});
  const [selectedRefundId, setSelectedRefundId] = useState<string | null>(null);
  const initialStatus = statusOptions.includes(searchParams.get('tab') as StatusFilter)
    ? (searchParams.get('tab') as StatusFilter)
    : 'WORK';
  const initialType = typeOptions.includes(searchParams.get('type') as TypeFilter)
    ? (searchParams.get('type') as TypeFilter)
    : 'ALL_TYPES';
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialStatus);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>(
    initialStatus === 'ASSIGNED' ? initialType : 'ALL_TYPES'
  );
  const [searchTerm, setSearchTerm] = useState('');

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

  useEffect(() => {
    if (statusFilter !== 'ASSIGNED' && typeFilter !== 'ALL_TYPES') {
      setTypeFilter('ALL_TYPES');
    }
  }, [statusFilter, typeFilter]);

  useEffect(() => {
    let active = true;

    const loadRequesterNames = async () => {
      const nextNames: Record<string, string> = {};

      await Promise.all(
        items.map(async (refund) => {
          try {
            const bookingResponse = await staffBookingApi.getBooking(refund.bookingId);
            const userResponse = await userApi.getUserById(bookingResponse.userId);
            const userPayload = userResponse?.data?.data ?? userResponse?.data ?? {};
            const requesterName =
              String(userPayload?.name ?? userPayload?.fullName ?? userPayload?.username ?? '').trim() ||
              `User #${bookingResponse.userId}`;
            nextNames[refund.id] = requesterName;
          } catch {
            nextNames[refund.id] = `Booking #${refund.bookingId}`;
          }
        })
      );

      if (active) {
        setRequesterNameByRefund(nextNames);
      }
    };

    if (items.length === 0) {
      setRequesterNameByRefund({});
      return () => {
        active = false;
      };
    }

    loadRequesterNames();

    return () => {
      active = false;
    };
  }, [items]);

  const selectedRefund = useMemo(
    () => items.find((item) => item.id === selectedRefundId) ?? null,
    [items, selectedRefundId]
  );

  const closeDetailPanel = () => {
    setSelectedRefundId(null);
  };

  const runAction = async (message: string, action: () => Promise<RefundRecord>) => {
    try {
      await action();
      toast.success(message);
      closeDetailPanel();
      fetchData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Thao tác thất bại');
    }
  };

  const processRefundNow = async (refund: RefundRecord) => {
    const currentStatus = normalize(refund.status);
    if (currentStatus === 'PENDING') {
      await staffRefundApi.assign(refund.id);
    }
    await staffRefundApi.approve(refund.id);
  };

  const summary = useMemo(() => {
    const total = items.filter(item => normalize(item.status) !== 'REFUNDED').length;
    const assigned = items.filter((item) => normalize(item.status) === 'ASSIGNED').length;
    const processed = items.filter((item) => ['PROCESSING', 'REFUNDED', 'SUCCESS'].includes(normalize(item.status))).length;
    const overdue = items.filter((item) => normalize(item.status) === 'OVERDUE').length;
    const amount = items.reduce((sum, item) => sum + Number(item.refundAmount || 0), 0);
    return { total, assigned, processed, overdue, amount };
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const normalizedStatus = normalize(item.status);
      
      let matchesStatus = false;
      if (statusFilter === 'ALL') {
        matchesStatus = true;
      } else if (statusFilter === 'WORK') {
        const isWorkQueue = ['PENDING', 'ASSIGNED', 'PROCESSING', 'OVERDUE', 'FAILED'].includes(normalizedStatus);
        matchesStatus = isWorkQueue && item.reason !== 'EARLY_CHECKOUT_REFUND';
      } else if (statusFilter === 'ASSIGNED') {
        matchesStatus = normalizedStatus === 'ASSIGNED';
      } else if (statusFilter === 'PROCESSING') {
        matchesStatus = ['PROCESSING', 'REFUNDED', 'SUCCESS'].includes(normalizedStatus);
      } else if (statusFilter === 'OVERDUE') {
        matchesStatus = normalizedStatus === 'OVERDUE';
      }

      let matchesType = false;
      if (typeFilter === 'ALL_TYPES') {
        matchesType = true;
      } else if (typeFilter === 'CANCELLATION') {
        matchesType = item.reason !== 'EARLY_CHECKOUT_REFUND' && item.reason !== 'ROOM_CHANGE_REFUND';
      } else if (typeFilter === 'EARLY_CHECKOUT') {
        matchesType = item.reason === 'EARLY_CHECKOUT_REFUND';
      } else if (typeFilter === 'ROOM_CHANGE') {
        matchesType = item.reason === 'ROOM_CHANGE_REFUND';
      }

      const haystack = [
        item.id,
        item.bookingId,
        item.paymentTransactionId,
        item.reason,
        item.processedBy,
        item.assignedTo,
        item.status,
        item.priority,
      ]
        .map((value) => String(value ?? '').toLowerCase())
        .join(' ');
      const matchesSearch = !searchTerm || haystack.includes(searchTerm.toLowerCase());
      return matchesStatus && matchesType && matchesSearch;
    });
  }, [items, searchTerm, statusFilter, typeFilter]);

  return (
    <div className="space-y-6 pb-10 animate-in fade-in duration-500">
      {/* Header with Statistics */}
      <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6 text-white shadow-2xl">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at top right, rgba(56,189,248,0.35), transparent 28%), radial-gradient(circle at bottom left, rgba(16,185,129,0.20), transparent 30%)' }} />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-200">
              <Wallet size={14} /> Refund Operations
            </div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Xử lý Đơn hủy & Hoàn tiền</h1>
            <p className="max-w-xl text-sm leading-6 text-slate-300">
              Staff nhận yêu cầu hủy từ người dùng, kiểm tra giao dịch gốc, rồi hoàn tất trong 1-3 ngày.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[520px]">
            <MiniStat label="Tổng yêu cầu" value={summary.total} tone="bg-white/10" />
            <MiniStat label="Nhận xử lý" value={summary.assigned} tone="bg-sky-400/15" />
            <MiniStat label="Đã xử lý" value={summary.processed} tone="bg-emerald-400/15" />
            <MiniStat label="Quá hạn" value={summary.overdue} tone="bg-orange-400/15" />
          </div>
        </div>
      </div>

      <Card className="p-5 border-outline-variant/10 shadow-xl">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-xl font-black text-on-surface">Danh sách refund</h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              Ưu tiên xử lý các request theo 4 nhóm: tất cả, nhận xử lý, đã xử lý và quá hạn. Đơn quá hạn là đơn người dùng đã gửi nhưng nhân viên chưa xử lý đúng SLA 1-3 ngày.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative min-w-0 sm:min-w-[280px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={16} />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Tìm theo refund, booking, giao dịch..."
                className="w-full rounded-2xl border border-outline-variant/30 bg-surface-container-low py-3 pl-10 pr-4 text-sm outline-none transition focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
              />
            </div>
            <Button variant="outline" onClick={fetchData} className="rounded-2xl px-4">
              <RefreshCw size={16} /> Làm mới
            </Button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {statusOptions.map((status) => {
            const active = statusFilter === status;
            const getButtonLabel = (s: StatusFilter) => {
              if (s === 'WORK') return 'Xử lý đơn hủy';
              if (s === 'ALL') return 'Tất cả';
              if (s === 'ASSIGNED') return 'Nhận xử lý';
              if (s === 'PROCESSING') return 'Đã xử lý';
              if (s === 'OVERDUE') return 'Quá hạn';
              return s;
            };
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-black uppercase tracking-wide transition ${
                  active
                    ? 'border-primary/20 bg-primary/10 text-primary'
                    : 'border-outline-variant/20 bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                <Filter size={12} /> {getButtonLabel(status)}
              </button>
            );
          })}
        </div>

        {statusFilter === 'ASSIGNED' && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-outline-variant/10 pt-4">
          {typeOptions.map((type) => {
            const active = typeFilter === type;
            const getTypeLabel = (t: TypeFilter) => {
              if (t === 'ALL_TYPES') return 'Tất cả loại';
              if (t === 'CANCELLATION') return '🗑️ Xử lý hủy đơn';
              if (t === 'EARLY_CHECKOUT') return '⏱️ Xử lý checkout sớm';
              if (t === 'ROOM_CHANGE') return '↔️ Hoàn đổi phòng';
              return t;
            };
            return (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-black uppercase tracking-wide transition ${
                  active
                    ? 'border-sky-200 bg-sky-100 text-sky-700'
                    : 'border-outline-variant/20 bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                {getTypeLabel(type)}
              </button>
            );
          })}
        </div>
        )}
      </Card>

      {loading ? (
        <Card className="py-20 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-container-high text-on-surface-variant">
            <Clock3 size={28} />
          </div>
          <div className="mt-4 text-sm font-bold text-on-surface-variant">Đang tải yêu cầu hoàn tiền...</div>
        </Card>
      ) : filteredItems.length === 0 ? (
        <Card className="py-20 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-container-high text-on-surface-variant">
            <CheckCircle2 size={28} />
          </div>
          <div className="mt-4 text-sm font-bold text-on-surface-variant">Không có yêu cầu phù hợp</div>
          <p className="mt-2 text-xs text-on-surface-variant/70">Thử đổi bộ lọc hoặc xóa từ khóa tìm kiếm.</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredItems.map((refund) => {
            const status = normalize(refund.status);
            const isOverdue = status === 'OVERDUE';

            return (
              <Card key={refund.id} className="overflow-hidden border-outline-variant/10 shadow-xl transition hover:-translate-y-0.5">
                <div className="border-b border-outline-variant/10 bg-gradient-to-r from-surface-container-low to-surface-container-high px-5 py-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-black text-on-surface">Cancel Request #{refund.id}</h3>
                        <span className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-wide ${getStatusTone(refund.status)}`}>
                          {getStatusLabel(refund.status)}
                        </span>
                        {refund.reason === 'EARLY_CHECKOUT_REFUND' && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-violet-700">
                            ⏱️ Checkout sớm
                          </span>
                        )}
                        {refund.reason === 'ROOM_CHANGE_REFUND' && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-emerald-700">
                            ↔️ Đổi phòng
                          </span>
                        )}
                        {refund.reason !== 'EARLY_CHECKOUT_REFUND' && refund.reason !== 'ROOM_CHANGE_REFUND' && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-sky-700">
                            🗑️ Hủy đơn
                          </span>
                        )}
                        {isOverdue && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-orange-700">
                            <TriangleAlert size={12} /> Quá hạn
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-on-surface-variant">
                        Booking #{refund.bookingId} · giao dịch gốc {refund.paymentTransactionId || 'chưa có'}
                      </p>
                      {refund.reason && refund.reason !== 'EARLY_CHECKOUT_REFUND' && (
                        <p className="mt-1 text-[12px] font-semibold text-rose-500 max-w-lg truncate" title={refund.reason}>
                          Lý do: {refund.reason}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 text-[11px] font-black uppercase tracking-wide">
                      <InfoPill label="Kênh" value={getMethodLabel(refund.refundMethod)} />
                      <InfoPill label="Ưu tiên" value={getPriorityLabel(refund.priority)} />
                      <InfoPill label="Due" value={formatDateTime(refund.dueAt)} />
                    </div>
                  </div>
                </div>

                <div className="grid gap-5 p-5 xl:grid-cols-[1.3fr_0.9fr]">
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <MetricBox label="Số tiền hoàn" value={formatCurrency(refund.refundAmount)} accent="text-green-700" />
                    <MetricBox label="Đã thu" value={formatCurrency(refund.paidAmount)} accent="text-slate-900" />
                    <MetricBox label="Phí hủy / giữ lại" value={formatCurrency(refund.cancellationFee)} accent="text-rose-700" />
                    <MetricBox label="Người nhận xử lý" value={refund.assignedTo || 'Chưa có'} accent="text-sky-700" />
                    <MetricBox label="Người xử lý" value={refund.processedBy || 'Chưa có'} accent="text-indigo-700" />
                    <MetricBox
                      label="Người yêu cầu gửi"
                      value={requesterNameByRefund[refund.id] || `Booking #${refund.bookingId}`}
                      accent="text-slate-800"
                    />
                  </div>

                  <div className="space-y-3 rounded-3xl border border-outline-variant/10 bg-surface-container-low p-4">
                    <div className="text-sm font-black text-on-surface">Ghi chú xử lý</div>
                    <div className="text-sm leading-6 text-on-surface-variant">
                      Refund này đã được tính theo giao dịch thực thu và rule hiện tại. Staff chỉ cần nhận xử lý, kiểm tra giao dịch gốc, rồi hoàn tất theo luồng đã xử lý.
                    </div>
                    <div className="rounded-2xl border border-outline-variant/10 bg-white/70 p-3 text-xs text-on-surface-variant">
                      <div className="flex items-center gap-2 font-bold text-on-surface">
                        <ShieldAlert size={14} /> Giao dịch gốc
                      </div>
                      <div className="mt-2 break-all font-mono text-[11px] leading-5 text-on-surface-variant">
                        {refund.paymentTransactionId || 'Chưa có transaction gốc'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 border-t border-outline-variant/10 bg-surface-container-low px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="text-xs text-on-surface-variant">
                    Tạo lúc <span className="font-bold text-on-surface">{formatDateTime(refund.createdAt)}</span> · Cập nhật{' '}
                    <span className="font-bold text-on-surface">{formatDateTime(refund.updatedAt)}</span>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
                    <Button
                      variant="outline"
                      onClick={() => setSelectedRefundId(refund.id)}
                      className="rounded-2xl px-4"
                    >
                      <Wallet size={16} /> Xem chi tiết
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {selectedRefund && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6 overflow-y-auto" onClick={closeDetailPanel}>
          <div
            className="flex w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-white shadow-2xl my-8"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="shrink-0 border-b border-outline-variant/10 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 px-6 py-5 text-white">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-200">
                    <Wallet size={14} /> Xử lý refund
                  </div>
                  <h2 className="mt-3 text-2xl font-black tracking-tight">Hoàn tiền #{selectedRefund.id}</h2>
                  <p className="mt-1 text-sm text-slate-300">Booking #{selectedRefund.bookingId} · Xem chi tiết và duyệt xử lý hoàn tiền</p>
                </div>
                <Button variant="outline" onClick={closeDetailPanel} className="rounded-2xl border-white/20 bg-white/10 px-4 text-white hover:bg-white/20">
                  Đóng
                </Button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 px-6 py-6">
              <div className="space-y-6">
                {/* Header Status */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-wide ${getStatusTone(selectedRefund.status)}`}>
                    {getStatusLabel(selectedRefund.status)}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-wide text-slate-700">
                    Booking #{selectedRefund.bookingId}
                  </span>
                  {selectedRefund.reason && selectedRefund.reason !== 'EARLY_CHECKOUT_REFUND' && (
                    <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-wide text-rose-700">
                      {selectedRefund.reason}
                    </span>
                  )}
                </div>

                {/* Main Info Grid */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <DetailInfoBox label="Số tiền hoàn" value={formatCurrency(selectedRefund.refundAmount)} tone="bg-emerald-50 text-emerald-700" />
                  <DetailInfoBox label="Đã thu" value={formatCurrency(selectedRefund.paidAmount)} tone="bg-blue-50 text-blue-700" />
                  <DetailInfoBox label="Phí giữ lại" value={formatCurrency(selectedRefund.cancellationFee)} tone="bg-rose-50 text-rose-700" />
                  <DetailInfoBox label="Người yêu cầu" value={requesterNameByRefund[selectedRefund.id] || `Booking #${selectedRefund.bookingId}`} tone="bg-slate-50 text-slate-700" />
                  <DetailInfoBox label="Nhận xử lý" value={selectedRefund.assignedTo || 'Chưa có'} tone="bg-sky-50 text-sky-700" />
                  <DetailInfoBox label="Người xử lý" value={selectedRefund.processedBy || 'Chưa có'} tone="bg-indigo-50 text-indigo-700" />
                </div>

                {/* Secondary Info */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <DetailInfoBox label="Kênh hoàn" value={getMethodLabel(selectedRefund.refundMethod)} tone="bg-violet-50 text-violet-700" />
                  <DetailInfoBox label="Ưu tiên" value={getPriorityLabel(selectedRefund.priority)} tone="bg-amber-50 text-amber-700" />
                  <DetailInfoBox label="Hạn xử lý" value={formatDateTime(selectedRefund.dueAt)} tone="bg-orange-50 text-orange-700" />
                  <DetailInfoBox label="Giao dịch gốc" value={selectedRefund.paymentTransactionId || 'Chưa có'} tone="bg-gray-50 text-gray-700" mono />
                  <DetailInfoBox label="Tạo lúc" value={formatDateTime(selectedRefund.createdAt)} tone="bg-slate-50 text-slate-700" />
                  <DetailInfoBox label="Cập nhật" value={formatDateTime(selectedRefund.updatedAt)} tone="bg-slate-50 text-slate-700" />
                </div>

                {/* Action Section */}
                <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-6">
                  <div className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-emerald-600" /> Thao tác xử lý
                  </div>
                  
                  {normalize(selectedRefund.status) === 'PENDING' && (
                    <p className="text-sm leading-6 text-slate-600 mb-5">
                      🔔 <span className="font-bold">Trạng thái: Chờ nhận</span> - Đơn này đang chờ nhân viên nhận xử lý. Bấm "Duyệt xử lý" để nhận và hoàn tất ngay.
                    </p>
                  )}
                  
                  {normalize(selectedRefund.status) === 'ASSIGNED' && (
                    <p className="text-sm leading-6 text-slate-600 mb-5">
                      ✋ <span className="font-bold">Trạng thái: Đã nhận xử lý</span> - Bạn đã nhận đơn này. Kiểm tra giao dịch gốc rồi bấm "Hoàn tất" để hoàn tiền.
                    </p>
                  )}
                  
                  {normalize(selectedRefund.status) === 'PROCESSING' && (
                    <p className="text-sm leading-6 text-slate-600 mb-5">
                      ⏳ <span className="font-bold">Trạng thái: Đang xử lý</span> - Đơn đang trong quá trình hoàn tiền. Vui lòng chờ hoàn tất.
                    </p>
                  )}
                  
                  {normalize(selectedRefund.status) === 'OVERDUE' && (
                    <p className="text-sm leading-6 text-rose-600 mb-5">
                      ⚠️ <span className="font-bold">Trạng thái: QUÁ HẠN</span> - Đơn này đã vượt quá thời hạn xử lý 1-3 ngày. Vui lòng xử lý ngay lập tức.
                    </p>
                  )}
                  
                  {(normalize(selectedRefund.status) === 'REFUNDED' || normalize(selectedRefund.status) === 'SUCCESS') && (
                    <p className="text-sm leading-6 text-emerald-600 mb-5">
                      ✅ <span className="font-bold">Trạng thái: Đã hoàn tiền</span> - Đơn này đã hoàn tất xử lý. Hoàn tiền đã được gửi cho khách hàng.
                    </p>
                  )}
                  
                  {normalize(selectedRefund.status) === 'FAILED' && (
                    <p className="text-sm leading-6 text-rose-600 mb-5">
                      ❌ <span className="font-bold">Trạng thái: Lỗi hoàn tiền</span> - Quá trình hoàn tiền gặp lỗi. Liên hệ bộ phận kỹ thuật để kiểm tra lại.
                    </p>
                  )}

                  {(normalize(selectedRefund.status) === 'PENDING' || normalize(selectedRefund.status) === 'ASSIGNED' || normalize(selectedRefund.status) === 'PROCESSING' || normalize(selectedRefund.status) === 'OVERDUE' || normalize(selectedRefund.status) === 'FAILED') && (
                    <div className="flex gap-3">
                      <Button
                        onClick={() => runAction('Đã xử lý hoàn tiền', () => processRefundNow(selectedRefund))}
                        className="flex-1 rounded-2xl bg-emerald-600 px-4 py-3 text-white hover:bg-emerald-700 font-bold"
                      >
                        <CheckCircle2 size={18} /> Duyệt xử lý
                      </Button>
                      <Button
                        variant="outline"
                        onClick={closeDetailPanel}
                        className="rounded-2xl border-slate-300 px-4 py-3"
                      >
                        Hủy
                      </Button>
                    </div>
                  )}

                  {(normalize(selectedRefund.status) === 'REFUNDED' || normalize(selectedRefund.status) === 'SUCCESS') && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-600">
                      ✓ Yêu cầu này đã hoàn tất xử lý. Không còn thao tác nào khả dụng.
                    </div>
                  )}
                </div>

                {/* Notes Section */}
                <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-blue-50 p-6">
                  <div className="text-sm font-black text-slate-900 mb-3">ℹ️ Ghi chú</div>
                  <div className="text-sm leading-6 text-slate-600">
                    Màn hình chi tiết này giúp staff kiểm tra đầy đủ thông tin yêu cầu hoàn tiền. Kiểm tra giao dịch gốc, số tiền, phí giữ lại, và thông tin người yêu cầu trước khi duyệt hoàn tất.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function MiniStat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className={`rounded-2xl border border-white/10 ${tone} p-3 backdrop-blur-sm`}>
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/70">{label}</div>
      <div className="mt-2 text-2xl font-black leading-none text-white">{value}</div>
    </div>
  );
}

function DetailInfoBox({ label, value, tone, mono = false }: { label: string; value: string; tone: string; mono?: boolean }) {
  return (
    <div className={`rounded-2xl border border-slate-200 ${tone} p-4 shadow-sm`}>
      <div className="text-[10px] font-black uppercase tracking-wide text-slate-600">{label}</div>
      <div className={`mt-2 break-words text-sm font-bold ${mono ? 'font-mono text-[12px]' : 'text-base'}`}>
        {value}
      </div>
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-full border border-outline-variant/10 bg-white px-3 py-1.5 text-slate-700 shadow-sm">
      <span className="text-[9px] font-black text-slate-400">{label}: </span>
      <span className="text-[11px]">{value}</span>
    </div>
  );
}

function MetricBox({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-2xl border border-outline-variant/10 bg-white/90 p-4 shadow-sm">
      <div className="text-[11px] font-black uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`mt-2 text-sm font-black break-words ${accent}`}>{value}</div>
    </div>
  );
}

function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-low px-4 py-3">
      <div className="text-[10px] font-black uppercase tracking-wide text-on-surface-variant">{label}</div>
      <div className={`mt-1 text-sm font-bold break-words text-on-surface ${mono ? 'font-mono text-[11px]' : ''}`}>{value}</div>
    </div>
  );
}

export default StaffRefundPage;
