// @ts-nocheck
import { useQuery } from '@tanstack/react-query';
import { repsApi } from '../../services/api/repsApi';
import { customersApi } from '../../services/api/customersApi';
import { useNavigate } from 'react-router-dom';
import { MapPin, Users, Phone, Store, ChevronRight } from 'lucide-react';

export default function RepRoutes() {
  const navigate = useNavigate();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['rep-profile'],
    queryFn: () => repsApi.repGetProfile().then(r => (r.data as any).data),
  });

  const subRegionId = profile?.subRegionId;

  const { data: customersData, isLoading: customersLoading } = useQuery({
    queryKey: ['rep-route-customers', subRegionId],
    queryFn: () =>
      customersApi
        .repGetCustomers({ page: 1, pageSize: 200 })
        .then(r => r.data.data.items),
    enabled: !!subRegionId,
  });

  const isLoading = profileLoading || customersLoading;
  const customers = customersData || [];

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 px-5 pt-5 pb-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />
        <div className="relative">
          <h1 className="text-white text-xl font-bold">My Route</h1>
          <p className="text-emerald-200 text-sm mt-0.5">Your sub-region and customers</p>
        </div>
      </div>

      <div className="px-4 -mt-6 pb-8 space-y-4 relative z-10">
        {/* Sub-region Card */}
        <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              {isLoading ? (
                <div className="h-5 w-36 bg-slate-100 rounded-lg animate-pulse" />
              ) : profile?.subRegionName ? (
                <>
                  <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wide">Your Sub-Region</p>
                  <p className="text-base font-bold text-slate-900">{profile.subRegionName}</p>
                  {profile.regionName && (
                    <p className="text-xs text-slate-400">{profile.regionName}</p>
                  )}
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-slate-700">No Sub-Region Assigned</p>
                  <p className="text-xs text-slate-400">Contact your coordinator</p>
                </>
              )}
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-slate-900">{customers.length}</p>
              <p className="text-[11px] text-slate-400">Customers</p>
            </div>
          </div>
        </div>

        {/* Customers in route */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex items-center gap-2 p-4 pb-3 border-b border-slate-50">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
              <Users className="w-3.5 h-3.5 text-white" />
            </div>
            <h2 className="font-bold text-sm text-slate-800">Route Customers</h2>
          </div>

          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-16 bg-slate-50 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : !subRegionId ? (
            <div className="p-8 text-center">
              <MapPin className="w-10 h-10 text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No sub-region assigned to you yet.</p>
              <p className="text-xs text-slate-300 mt-1">Your route will appear once your coordinator assigns a sub-region.</p>
            </div>
          ) : customers.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="w-10 h-10 text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No customers in your sub-region yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {customers.map((c: any, i: number) => (
                <button
                  key={c.id}
                  onClick={() => navigate(`/rep/customers/${c.id}`)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-slate-50/70 transition text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center text-emerald-700 text-sm font-bold flex-shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {c.shopName || c.fullName || c.email}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                      {c.address && (
                        <span className="flex items-center gap-0.5 truncate">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          {[c.address.street, c.address.city].filter(Boolean).join(', ')}
                        </span>
                      )}
                      {c.phoneNumber && (
                        <span className="flex items-center gap-0.5">
                          <Phone className="w-3 h-3 flex-shrink-0" />
                          {c.phoneNumber}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
