import React, { useEffect, useMemo, useState } from 'react';
import {
    HiOutlineUserGroup,
    HiOutlinePlus,
    HiOutlinePencilAlt,
    HiOutlineSearch,
    HiOutlineFilter,
    HiOutlineRefresh,
    HiOutlineCheckCircle,
    HiOutlineXCircle,
} from 'react-icons/hi';
import { isAxiosError } from 'axios';
import {
    customerApi,
    type CreateCustomerPayload,
    type CustomerBackend,
    type UpdateCustomerPayload,
} from '../../../services/api';

type CustomerStatus = 'ACTIVE' | 'INACTIVE';

type Customer = {
    id: number;
    fullName: string;
    email: string;
    phone: string;
    dateOfBirth: string;
    gender: boolean;
    address: string;
    status: CustomerStatus;
};

type CustomerFormData = {
    fullName: string;
    email: string;
    phone: string;
    dateOfBirth: string;
    gender: boolean;
    address: string;
    status: CustomerStatus;
    password: string;
};

const INITIAL_FORM: CustomerFormData = {
    fullName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: true,
    address: '',
    status: 'ACTIVE',
    password: '',
};

const mapCustomer = (customer: CustomerBackend): Customer => ({
    id: customer.id,
    fullName: customer.name || '',
    email: customer.email || '',
    phone: customer.phoneNumber || '',
    dateOfBirth: customer.dateOfBirth || '',
    gender: customer.gender ?? true,
    address: customer.address || '',
    status: customer.active === false ? 'INACTIVE' : 'ACTIVE',
});

const extractErrorMessage = (error: unknown): string => {
    if (!isAxiosError<{ message?: string }>(error)) {
        return 'Da xay ra loi khong xac dinh.';
    }

    return error.response?.data?.message || 'Khong the xu ly yeu cau. Vui long thu lai.';
};

const CustomerManagementPage: React.FC = () => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | CustomerStatus>('ALL');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingCustomerId, setEditingCustomerId] = useState<number | null>(null);
    const [formData, setFormData] = useState<CustomerFormData>(INITIAL_FORM);
    const [formError, setFormError] = useState('');
    const [pageError, setPageError] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const fetchCustomers = async () => {
        setLoading(true);
        setPageError('');

        try {
            const activeParam =
                statusFilter === 'ALL'
                    ? undefined
                    : statusFilter === 'ACTIVE';

            const response = await customerApi.getAll({
                keyword: searchTerm.trim() || undefined,
                active: activeParam,
            });

            setCustomers(response.data.map(mapCustomer));
        } catch (error) {
            setPageError(extractErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCustomers();
    }, [statusFilter]);

    const filteredCustomers = useMemo(() => {
        if (!searchTerm.trim()) return customers;

        const keyword = searchTerm.trim().toLowerCase();
        return customers.filter(
            (customer) =>
                customer.fullName.toLowerCase().includes(keyword) ||
                customer.email.toLowerCase().includes(keyword) ||
                customer.phone.toLowerCase().includes(keyword) ||
                customer.address.toLowerCase().includes(keyword)
        );
    }, [customers, searchTerm]);

    const activeCount = customers.filter((customer) => customer.status === 'ACTIVE').length;
    const inactiveCount = customers.length - activeCount;

    const openCreateForm = () => {
        setEditingCustomerId(null);
        setFormData(INITIAL_FORM);
        setFormError('');
        setIsFormOpen(true);
    };

    const openEditForm = (customer: Customer) => {
        setEditingCustomerId(customer.id);
        setFormData({
            fullName: customer.fullName,
            email: customer.email,
            phone: customer.phone,
            dateOfBirth: customer.dateOfBirth,
            gender: customer.gender,
            address: customer.address,
            status: customer.status,
            password: '',
        });
        setFormError('');
        setIsFormOpen(true);
    };

    const closeForm = () => {
        setIsFormOpen(false);
        setEditingCustomerId(null);
        setFormData(INITIAL_FORM);
        setFormError('');
    };

    const validateForm = (): boolean => {
        if (!formData.fullName.trim() || !formData.email.trim() || !formData.phone.trim()) {
            setFormError('Vui long nhap day du Ho ten, Email va So dien thoai.');
            return false;
        }

        if (!editingCustomerId && !formData.password.trim()) {
            setFormError('Vui long nhap mat khau cho khach hang moi.');
            return false;
        }

        return true;
    };

    const handleSaveCustomer = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setFormError('');

        if (!validateForm()) return;

        setSubmitting(true);

        try {
            if (editingCustomerId) {
                const payload: UpdateCustomerPayload = {
                    name: formData.fullName.trim(),
                    email: formData.email.trim(),
                    phoneNumber: formData.phone.trim(),
                    dateOfBirth: formData.dateOfBirth.trim() || undefined,
                    gender: formData.gender,
                    address: formData.address.trim() || undefined,
                    active: formData.status === 'ACTIVE',
                };

                await customerApi.update(editingCustomerId, payload);
            } else {
                const payload: CreateCustomerPayload = {
                    name: formData.fullName.trim(),
                    email: formData.email.trim(),
                    password: formData.password,
                    phoneNumber: formData.phone.trim(),
                    dateOfBirth: formData.dateOfBirth.trim() || undefined,
                    gender: formData.gender,
                    address: formData.address.trim() || undefined,
                    active: formData.status === 'ACTIVE',
                };

                await customerApi.create(payload);
            }

            closeForm();
            await fetchCustomers();
        } catch (error) {
            setFormError(extractErrorMessage(error));
        } finally {
            setSubmitting(false);
        }
    };

    const handleToggleStatus = async (customer: Customer) => {
        try {
            await customerApi.updateStatus(customer.id, customer.status !== 'ACTIVE');
            await fetchCustomers();
        } catch (error) {
            setPageError(extractErrorMessage(error));
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Quan ly khach hang</h1>
                    <p className="text-sm text-gray-500 mt-1">Quan ly du lieu khach hang (khong xoa).</p>
                </div>
                <button
                    onClick={openCreateForm}
                    className="flex items-center px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
                >
                    <HiOutlinePlus className="w-5 h-5 mr-2" />
                    <span className="text-sm font-semibold">Them khach hang</span>
                </button>
            </div>

            {pageError && (
                <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                    {pageError}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center text-white shadow-lg">
                        <HiOutlineUserGroup className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tong khach hang</p>
                        <p className="text-2xl font-bold text-gray-900">{customers.length}</p>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-500 rounded-2xl flex items-center justify-center text-white shadow-lg">
                        <HiOutlineCheckCircle className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Dang hoat dong</p>
                        <p className="text-2xl font-bold text-gray-900">{activeCount}</p>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg">
                        <HiOutlineXCircle className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tam ngung</p>
                        <p className="text-2xl font-bold text-gray-900">{inactiveCount}</p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                        <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Tim theo ten, email, so dien thoai..."
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-2.5 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex items-center bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">
                            <HiOutlineFilter className="w-4 h-4 text-gray-400 mr-2" />
                            <select
                                value={statusFilter}
                                onChange={(event) => setStatusFilter(event.target.value as 'ALL' | CustomerStatus)}
                                className="bg-transparent text-sm text-gray-600 outline-none"
                            >
                                <option value="ALL">Tat ca</option>
                                <option value="ACTIVE">Dang hoat dong</option>
                                <option value="INACTIVE">Tam ngung</option>
                            </select>
                        </div>
                        <button
                            onClick={fetchCustomers}
                            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                            title="Tai lai du lieu"
                        >
                            <HiOutlineRefresh className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50/50">
                                <th className="px-8 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50">Khach hang</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50">Ngay sinh</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50">Gioi tinh</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50">Dia chi</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50">Trang thai</th>
                                <th className="px-8 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50 text-right">Hanh dong</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-8 py-10 text-center text-sm text-gray-500">
                                        Dang tai du lieu khach hang...
                                    </td>
                                </tr>
                            ) : filteredCustomers.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-8 py-10 text-center text-sm text-gray-500">
                                        Khong co khach hang phu hop.
                                    </td>
                                </tr>
                            ) : (
                                filteredCustomers.map((customer) => (
                                    <tr key={customer.id} className="hover:bg-gray-50/30 transition-all">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold">
                                                    {customer.fullName.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900">{customer.fullName}</p>
                                                    <p className="text-xs text-gray-500">{customer.email}</p>
                                                    <p className="text-xs text-gray-400">{customer.phone}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-sm font-medium text-gray-700">
                                            {customer.dateOfBirth || 'Chua cap nhat'}
                                        </td>
                                        <td className="px-6 py-5 text-sm font-medium text-gray-700">
                                            {customer.gender ? 'Nam' : 'Nu'}
                                        </td>
                                        <td className="px-6 py-5 text-sm font-medium text-gray-700 max-w-xs truncate">
                                            {customer.address || 'Chua cap nhat'}
                                        </td>
                                        <td className="px-6 py-5">
                                            <span
                                                className={`px-3 py-1 text-[11px] font-bold rounded-full uppercase tracking-wider ${customer.status === 'ACTIVE'
                                                        ? 'bg-green-100 text-green-600'
                                                        : 'bg-amber-100 text-amber-600'
                                                    }`}
                                            >
                                                {customer.status === 'ACTIVE' ? 'Dang hoat dong' : 'Tam ngung'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleToggleStatus(customer)}
                                                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all"
                                                >
                                                    {customer.status === 'ACTIVE' ? 'Tam ngung' : 'Kich hoat'}
                                                </button>
                                                <button
                                                    onClick={() => openEditForm(customer)}
                                                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                    title="Chinh sua"
                                                >
                                                    <HiOutlinePencilAlt className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isFormOpen && (
                <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4">
                    <div className="w-full max-w-2xl bg-white rounded-3xl border border-gray-100 shadow-2xl">
                        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-gray-900">
                                {editingCustomerId ? 'Cap nhat khach hang' : 'Them khach hang moi'}
                            </h2>
                            <button
                                onClick={closeForm}
                                className="text-sm font-semibold text-gray-500 hover:text-gray-800"
                            >
                                Dong
                            </button>
                        </div>

                        <form onSubmit={handleSaveCustomer} className="p-6 space-y-4">
                            {formError && (
                                <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                                    {formError}
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Ho ten</label>
                                    <input
                                        value={formData.fullName}
                                        onChange={(event) => setFormData((prev) => ({ ...prev, fullName: event.target.value }))}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500"
                                        placeholder="Nhap ho ten"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Email</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500"
                                        placeholder="khachhang@tristar.com"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">So dien thoai</label>
                                    <input
                                        value={formData.phone}
                                        onChange={(event) => setFormData((prev) => ({ ...prev, phone: event.target.value }))}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500"
                                        placeholder="09xxxxxxxx"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Ngay sinh</label>
                                    <input
                                        type="date"
                                        value={formData.dateOfBirth}
                                        onChange={(event) => setFormData((prev) => ({ ...prev, dateOfBirth: event.target.value }))}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Gioi tinh</label>
                                    <label className="flex items-center justify-between w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white">
                                        <span className="text-sm text-gray-700">{formData.gender ? 'Nam' : 'Nu'}</span>
                                        <input
                                            type="checkbox"
                                            checked={formData.gender}
                                            onChange={(event) => setFormData((prev) => ({ ...prev, gender: event.target.checked }))}
                                            className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500/30"
                                        />
                                    </label>
                                    <p className="mt-1 text-xs text-gray-500">Bat: Nam, tat: Nu.</p>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Dia chi</label>
                                    <input
                                        value={formData.address}
                                        onChange={(event) => setFormData((prev) => ({ ...prev, address: event.target.value }))}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500"
                                        placeholder="Nhap dia chi"
                                    />
                                </div>

                                {!editingCustomerId && (
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Mat khau</label>
                                        <input
                                            type="password"
                                            value={formData.password}
                                            onChange={(event) => setFormData((prev) => ({ ...prev, password: event.target.value }))}
                                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500"
                                            placeholder="Nhap mat khau"
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Trang thai</label>
                                    <select
                                        value={formData.status}
                                        onChange={(event) => setFormData((prev) => ({ ...prev, status: event.target.value as CustomerStatus }))}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500 bg-white"
                                    >
                                        <option value="ACTIVE">Dang hoat dong</option>
                                        <option value="INACTIVE">Tam ngung</option>
                                    </select>
                                </div>
                            </div>

                            <div className="pt-2 flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={closeForm}
                                    className="px-4 py-2.5 text-sm font-semibold rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50"
                                >
                                    Huy
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-4 py-2.5 text-sm font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-70"
                                >
                                    {submitting
                                        ? 'Dang luu...'
                                        : editingCustomerId
                                            ? 'Luu thay doi'
                                            : 'Tao khach hang'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerManagementPage;
