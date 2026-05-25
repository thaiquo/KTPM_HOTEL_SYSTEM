import React, { useEffect, useMemo, useState } from 'react';
import {
  HiOutlineUserGroup,
  HiOutlinePlus,
  HiOutlinePencilAlt,
  HiOutlineTrash,
  HiOutlineSearch,
  HiOutlineFilter,
  HiOutlineRefresh,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
} from 'react-icons/hi';
import { isAxiosError } from 'axios';
import {
  type CreateEmployeePayload,
  type EmployeeBackend,
  type UpdateEmployeePayload,
} from '../../../services/api';
import { employeeApi } from '../../../services/userApi';

type EmployeeStatus = 'ACTIVE' | 'INACTIVE';

type Employee = {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: boolean;
  address: string;
  status: EmployeeStatus;
};

type EmployeeFormData = {
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: boolean;
  address: string;
  status: EmployeeStatus;
  password: string;
};

const INITIAL_FORM: EmployeeFormData = {
  fullName: '',
  email: '',
  phone: '',
  dateOfBirth: '',
  gender: true,
  address: '',
  status: 'ACTIVE',
  password: '',
};

const mapEmployee = (employee: EmployeeBackend): Employee => ({
  id: employee.id,
  fullName: employee.name || '',
  email: employee.email || '',
  phone: employee.phoneNumber || '',
  dateOfBirth: employee.dateOfBirth || '',
  gender: employee.gender ?? true,
  address: employee.address || '',
  status: employee.active === false ? 'INACTIVE' : 'ACTIVE',
});

const extractErrorMessage = (error: unknown): string => {
  if (!isAxiosError<{ message?: string }>(error)) {
    return 'Đã xảy ra lỗi không xác định.';
  }

  return error.response?.data?.message || 'Không thể xử lý yêu cầu. Vui lòng thử lại.';
};

const EmployeeManagementPage: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | EmployeeStatus>('ALL');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState<number | null>(null);
  const [formData, setFormData] = useState<EmployeeFormData>(INITIAL_FORM);
  const [formError, setFormError] = useState('');
  const [pageError, setPageError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchEmployees = async () => {
    setLoading(true);
    setPageError('');

    try {
      const activeParam =
        statusFilter === 'ALL'
          ? undefined
          : statusFilter === 'ACTIVE';

      const response = await employeeApi.getAll({
        keyword: searchTerm.trim() || undefined,
        active: activeParam,
      });

      setEmployees(response.data.map(mapEmployee));
    } catch (error) {
      setPageError(extractErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [statusFilter]);

  const filteredEmployees = useMemo(() => {
    if (!searchTerm.trim()) return employees;

    const keyword = searchTerm.trim().toLowerCase();
    return employees.filter(
      (employee) =>
        employee.fullName.toLowerCase().includes(keyword) ||
        employee.email.toLowerCase().includes(keyword) ||
        employee.phone.toLowerCase().includes(keyword) ||
        employee.address.toLowerCase().includes(keyword)
    );
  }, [employees, searchTerm]);

  const activeCount = employees.filter((employee) => employee.status === 'ACTIVE').length;
  const inactiveCount = employees.length - activeCount;

  const openCreateForm = () => {
    setEditingEmployeeId(null);
    setFormData(INITIAL_FORM);
    setFormError('');
    setIsFormOpen(true);
  };

  const openEditForm = (employee: Employee) => {
    setEditingEmployeeId(employee.id);
    setFormData({
      fullName: employee.fullName,
      email: employee.email,
      phone: employee.phone,
      dateOfBirth: employee.dateOfBirth,
      gender: employee.gender,
      address: employee.address,
      status: employee.status,
      password: '',
    });
    setFormError('');
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingEmployeeId(null);
    setFormData(INITIAL_FORM);
    setFormError('');
  };

  const validateForm = (): boolean => {
    if (!formData.fullName.trim() || !formData.email.trim() || !formData.phone.trim()) {
      setFormError('Vui lòng nhập đầy đủ Họ tên, Email và Số điện thoại.');
      return false;
    }

    if (!editingEmployeeId && !formData.password.trim()) {
      setFormError('Vui lòng nhập mật khẩu cho nhân viên mới.');
      return false;
    }

    return true;
  };

  const handleSaveEmployee = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');

    if (!validateForm()) return;

    setSubmitting(true);

    try {
      if (editingEmployeeId) {
        const payload: UpdateEmployeePayload = {
          name: formData.fullName.trim(),
          email: formData.email.trim(),
          phoneNumber: formData.phone.trim(),
          dateOfBirth: formData.dateOfBirth.trim() || undefined,
          gender: formData.gender,
          address: formData.address.trim() || undefined,
          active: formData.status === 'ACTIVE',
        };

        await employeeApi.update(editingEmployeeId, payload);
      } else {
        const payload: CreateEmployeePayload = {
          name: formData.fullName.trim(),
          email: formData.email.trim(),
          password: formData.password,
          phoneNumber: formData.phone.trim(),
          dateOfBirth: formData.dateOfBirth.trim() || undefined,
          gender: formData.gender,
          address: formData.address.trim() || undefined,
          active: formData.status === 'ACTIVE',
        };

        await employeeApi.create(payload);
      }

      closeForm();
      await fetchEmployees();
    } catch (error) {
      setFormError(extractErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEmployee = async (employeeId: number) => {
    const confirmed = window.confirm('Bạn có chắc chắn muốn xóa nhân viên này?');
    if (!confirmed) return;

    try {
      await employeeApi.remove(employeeId);
      await fetchEmployees();
    } catch (error) {
      setPageError(extractErrorMessage(error));
    }
  };

  const handleToggleStatus = async (employee: Employee) => {
    try {
      await employeeApi.updateStatus(employee.id, employee.status !== 'ACTIVE');
      await fetchEmployees();
    } catch (error) {
      setPageError(extractErrorMessage(error));
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý nhân viên</h1>
          <p className="text-sm text-gray-500 mt-1">Quản lý dữ liệu nhân viên trực tiếp từ cơ sở dữ liệu.</p>
        </div>
        <button
          onClick={openCreateForm}
          className="flex items-center px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
        >
          <HiOutlinePlus className="w-5 h-5 mr-2" />
          <span className="text-sm font-semibold">Thêm nhân viên</span>
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
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tổng nhân viên</p>
            <p className="text-2xl font-bold text-gray-900">{employees.length}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-green-500 rounded-2xl flex items-center justify-center text-white shadow-lg">
            <HiOutlineCheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Đang hoạt động</p>
            <p className="text-2xl font-bold text-gray-900">{activeCount}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg">
            <HiOutlineXCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tạm ngưng</p>
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
              placeholder="Tìm theo tên, email, số điện thoại..."
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
                onChange={(event) => setStatusFilter(event.target.value as 'ALL' | EmployeeStatus)}
                className="bg-transparent text-sm text-gray-600 outline-none"
              >
                <option value="ALL">Tất cả</option>
                <option value="ACTIVE">Đang hoạt động</option>
                <option value="INACTIVE">Tạm ngưng</option>
              </select>
            </div>
            <button
              onClick={fetchEmployees}
              className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
              title="Tải lại dữ liệu"
            >
              <HiOutlineRefresh className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-8 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50">Nhân viên</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50">Ngày sinh</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50">Giới tính</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50">Địa chỉ</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50">Trạng thái</th>
                <th className="px-8 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-8 py-10 text-center text-sm text-gray-500">
                    Đang tải dữ liệu nhân viên...
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-10 text-center text-sm text-gray-500">
                    Không có nhân viên phù hợp.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-gray-50/30 transition-all">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold">
                          {employee.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{employee.fullName}</p>
                          <p className="text-xs text-gray-500">{employee.email}</p>
                          <p className="text-xs text-gray-400">{employee.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-sm font-medium text-gray-700">
                      {employee.dateOfBirth || 'Chưa cập nhật'}
                    </td>
                    <td className="px-6 py-5 text-sm font-medium text-gray-700">
                      {employee.gender ? 'Nam' : 'Nữ'}
                    </td>
                    <td className="px-6 py-5 text-sm font-medium text-gray-700 max-w-xs truncate">
                      {employee.address || 'Chưa cập nhật'}
                    </td>
                    <td className="px-6 py-5">
                      <span
                        className={`px-3 py-1 text-[11px] font-bold rounded-full uppercase tracking-wider ${
                          employee.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-600'
                            : 'bg-amber-100 text-amber-600'
                        }`}
                      >
                        {employee.status === 'ACTIVE' ? 'Đang hoạt động' : 'Tạm ngưng'}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggleStatus(employee)}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all"
                        >
                          {employee.status === 'ACTIVE' ? 'Tạm ngưng' : 'Kích hoạt'}
                        </button>
                        <button
                          onClick={() => openEditForm(employee)}
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                          title="Chỉnh sửa"
                        >
                          <HiOutlinePencilAlt className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteEmployee(employee.id)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          title="Xóa"
                        >
                          <HiOutlineTrash className="w-5 h-5" />
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
                {editingEmployeeId ? 'Cập nhật nhân viên' : 'Thêm nhân viên mới'}
              </h2>
              <button
                onClick={closeForm}
                className="text-sm font-semibold text-gray-500 hover:text-gray-800"
              >
                Đóng
              </button>
            </div>

            <form onSubmit={handleSaveEmployee} className="p-6 space-y-4">
              {formError && (
                <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Họ tên</label>
                  <input
                    value={formData.fullName}
                    onChange={(event) => setFormData((prev) => ({ ...prev, fullName: event.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500"
                    placeholder="Nhập họ tên"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500"
                    placeholder="nhanvien@tristar.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Số điện thoại</label>
                  <input
                    value={formData.phone}
                    onChange={(event) => setFormData((prev) => ({ ...prev, phone: event.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500"
                    placeholder="09xxxxxxxx"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Ngày sinh</label>
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(event) => setFormData((prev) => ({ ...prev, dateOfBirth: event.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Giới tính</label>
                  <label className="flex items-center justify-between w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white">
                    <span className="text-sm text-gray-700">{formData.gender ? 'Nam' : 'Nữ'}</span>
                    <input
                      type="checkbox"
                      checked={formData.gender}
                      onChange={(event) => setFormData((prev) => ({ ...prev, gender: event.target.checked }))}
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500/30"
                    />
                  </label>
                  <p className="mt-1 text-xs text-gray-500">Bật: Nam, tắt: Nữ.</p>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Địa chỉ</label>
                  <input
                    value={formData.address}
                    onChange={(event) => setFormData((prev) => ({ ...prev, address: event.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500"
                    placeholder="Nhập địa chỉ"
                  />
                </div>

                {!editingEmployeeId && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Mật khẩu</label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(event) => setFormData((prev) => ({ ...prev, password: event.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500"
                      placeholder="Nhập mật khẩu"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Trạng thái</label>
                  <select
                    value={formData.status}
                    onChange={(event) => setFormData((prev) => ({ ...prev, status: event.target.value as EmployeeStatus }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500 bg-white"
                  >
                    <option value="ACTIVE">Đang hoạt động</option>
                    <option value="INACTIVE">Tạm ngưng</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-4 py-2.5 text-sm font-semibold rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2.5 text-sm font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-70"
                >
                  {submitting
                    ? 'Đang lưu...'
                    : editingEmployeeId
                      ? 'Lưu thay đổi'
                      : 'Tạo nhân viên'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeManagementPage;
