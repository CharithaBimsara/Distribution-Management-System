import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { customersApi } from '../../services/api/customersApi';
import { formatCurrency, formatDate, statusColor } from '../../utils/formatters';
import { Users, Search, MapPin, Phone, ChevronUp, ChevronDown, Filter, X, Calendar, DollarSign } from 'lucide-react';
import type { Customer, CustomerFilterOptions } from '../../types/customer.types';

type SortField = 'shopname' | 'location' | 'assignedrep' | 'creditlimit' | 'balance' | 'status' | 'createdat';
type SortOrder = 'asc' | 'desc';

export default function AdminCustomers() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('shopname');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [assignedRepFilter, setAssignedRepFilter] = useState<string>('');
  const [segmentFilter, setSegmentFilter] = useState<string>('');
  const [minCreditLimit, setMinCreditLimit] = useState<string>('');
  const [maxCreditLimit, setMaxCreditLimit] = useState<string>('');
  const [createdFrom, setCreatedFrom] = useState<string>('');
  const [createdTo, setCreatedTo] = useState<string>('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-customers', page, search, sortBy, sortOrder, statusFilter, assignedRepFilter, segmentFilter, minCreditLimit, maxCreditLimit, createdFrom, createdTo],
    queryFn: () => customersApi.adminGetAll({
      page,
      pageSize: 20,
      search: search || undefined,
      sortBy,
      sortOrder,
      isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
      assignedRepId: assignedRepFilter || undefined,
      customerSegment: segmentFilter || undefined,
      minCreditLimit: minCreditLimit ? parseFloat(minCreditLimit) : undefined,
      maxCreditLimit: maxCreditLimit ? parseFloat(maxCreditLimit) : undefined,
      createdFrom: createdFrom || undefined,
      createdTo: createdTo || undefined,
    }).then(r => r.data.data),
  });

  const { data: filterOptions } = useQuery({
    queryKey: ['admin-customer-filters'],
    queryFn: () => customersApi.adminGetFilterOptions().then(r => r.data.data),
  });

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setPage(1); // Reset to first page when sorting changes
  };

  const clearFilters = () => {
    setStatusFilter('all');
    setAssignedRepFilter('');
    setSegmentFilter('');
    setMinCreditLimit('');
    setMaxCreditLimit('');
    setCreatedFrom('');
    setCreatedTo('');
    setPage(1);
  };

  const hasActiveFilters = statusFilter !== 'all' || assignedRepFilter || segmentFilter || minCreditLimit || maxCreditLimit || createdFrom || createdTo;

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortBy !== field) return null;
    return sortOrder === 'asc' ?
      <ChevronUp className="w-4 h-4 ml-1" /> :
      <ChevronDown className="w-4 h-4 ml-1" />;
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
        <p className="text-slate-500 text-sm mt-1">Manage your customer base</p>
      </div>

      {/* Search and Filters Section */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm">
        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search customers..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <Filter className="w-4 h-4" />
            Filters
            {hasActiveFilters && (
              <span className="bg-indigo-500 text-white text-xs px-2 py-0.5 rounded-full">
                Active
              </span>
            )}
          </button>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
              Clear All
            </button>
          )}
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-lg border">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {/* Assigned Rep Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Assigned Rep</label>
              <select
                value={assignedRepFilter}
                onChange={(e) => { setAssignedRepFilter(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
              >
                <option value="">All Reps</option>
                {filterOptions?.assignedReps?.map((rep: { id: string; name: string }) => (
                  <option key={rep.id} value={rep.id}>
                    {rep.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Customer Segment Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Customer Segment</label>
              <select
                value={segmentFilter}
                onChange={(e) => { setSegmentFilter(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
              >
                <option value="">All Segments</option>
                {filterOptions?.customerSegments?.map((segment: string) => (
                  <option key={segment} value={segment}>
                    {segment}
                  </option>
                ))}
              </select>
            </div>

            {/* Credit Limit Range */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <DollarSign className="w-3 h-3 inline mr-1" />
                Credit Limit Range
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={minCreditLimit}
                  onChange={(e) => { setMinCreditLimit(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={maxCreditLimit}
                  onChange={(e) => { setMaxCreditLimit(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                />
              </div>
            </div>

            {/* Date Range */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Calendar className="w-3 h-3 inline mr-1" />
                Created Date Range
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={createdFrom}
                  onChange={(e) => { setCreatedFrom(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                />
                <input
                  type="date"
                  value={createdTo}
                  onChange={(e) => { setCreatedTo(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500">Loading customers...</div>
        ) : !data?.items?.length ? (
          <div className="p-8 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No customers found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th
                      className="text-left px-4 py-3 font-medium text-slate-600 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                      onClick={() => handleSort('shopname')}
                    >
                      <div className="flex items-center">
                        Shop Name
                        <SortIcon field="shopname" />
                      </div>
                    </th>
                    <th
                      className="text-left px-4 py-3 font-medium text-slate-600 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                      onClick={() => handleSort('location')}
                    >
                      <div className="flex items-center">
                        Location
                        <SortIcon field="location" />
                      </div>
                    </th>
                    <th
                      className="text-left px-4 py-3 font-medium text-slate-600 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                      onClick={() => handleSort('assignedrep')}
                    >
                      <div className="flex items-center">
                        Assigned Rep
                        <SortIcon field="assignedrep" />
                      </div>
                    </th>
                    <th
                      className="text-right px-4 py-3 font-medium text-slate-600 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                      onClick={() => handleSort('creditlimit')}
                    >
                      <div className="flex items-center justify-end">
                        Credit Limit
                        <SortIcon field="creditlimit" />
                      </div>
                    </th>
                    <th
                      className="text-right px-4 py-3 font-medium text-slate-600 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                      onClick={() => handleSort('balance')}
                    >
                      <div className="flex items-center justify-end">
                        Balance
                        <SortIcon field="balance" />
                      </div>
                    </th>
                    <th
                      className="text-center px-4 py-3 font-medium text-slate-600 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center justify-center">
                        Status
                        <SortIcon field="status" />
                      </div>
                    </th>
                    <th
                      className="text-left px-4 py-3 font-medium text-slate-600 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                      onClick={() => handleSort('createdat')}
                    >
                      <div className="flex items-center">
                        Created Date
                        <SortIcon field="createdat" />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.items.map((customer: Customer) => (
                    <tr 
                      key={customer.id} 
                      onClick={() => navigate(`/admin/customers/${customer.id}`)}
                      className="hover:bg-slate-50/60 transition-all duration-150 cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-purple-100 rounded-full flex items-center justify-center">
                            <span className="text-purple-700 font-medium text-sm">{customer.shopName[0]}</span>
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{customer.shopName}</p>
                            <p className="text-xs text-slate-500">{customer.customerSegment || 'General'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {customer.city || 'N/A'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{customer.assignedRepName || 'Unassigned'}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(customer.creditLimit)}</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900">{formatCurrency(customer.currentBalance)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(customer.isActive ? 'Active' : 'Inactive')}`}>
                          {customer.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatDate(customer.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {data.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
                <p className="text-sm text-slate-500">Page {data.page} of {data.totalPages}</p>
                <div className="flex gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50 hover:bg-slate-50">Previous</button>
                  <button onClick={() => setPage(p => Math.min(data.totalPages, p + 1))} disabled={page === data.totalPages} className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50 hover:bg-slate-50">Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
