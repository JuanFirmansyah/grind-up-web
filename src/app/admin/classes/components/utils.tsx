// src/app/admin/classes/components/utils.ts

import { Users } from "lucide-react";

// Helper functions
export const formatDate = (dateStr: string) => {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('id-ID', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

export const getBookingRate = (booked: number, slots: number) => {
  return slots > 0 ? Math.round((booked / slots) * 100) : 0;
};

// Loading Skeleton
export function LoadingSkeleton({ viewMode }: { viewMode: 'table' | 'grid' }) {
  if (viewMode === 'table') {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="p-6 border-b border-gray-200 animate-pulse">
            <div className="flex justify-between">
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-48"></div>
                <div className="h-3 bg-gray-200 rounded w-32"></div>
              </div>
              <div className="h-6 bg-gray-200 rounded w-20"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
          <div className="h-32 bg-gray-200 rounded-lg mb-4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Empty State
export function EmptyState({ type, searchTerm }: { type: string; searchTerm: string }) {
  return (
    <div className="text-center py-12">
      <div className="max-w-md mx-auto">
        <div className="text-gray-400 mb-4">
          <Users className="h-16 w-16 mx-auto" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {searchTerm ? 'Tidak ada kelas yang sesuai' : `Belum ada ${type === 'special' ? 'Special Class' : 'Studio Class'}`}
        </h3>
        <p className="text-gray-500 mb-4">
          {searchTerm 
            ? 'Coba ubah kata kunci pencarian atau filter tanggal'
            : `Mulai dengan membuat ${type === 'special' ? 'special class' : 'studio class'} pertama Anda`
          }
        </p>
      </div>
    </div>
  );
}

// Stat Card
export function StatCard({ icon, label, value, color }: { 
  icon: React.ReactNode; 
  label: string; 
  value: string | number; 
  color: 'blue' | 'green' | 'purple' | 'red'; 
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    purple: 'bg-purple-50 text-purple-700',
    red: 'bg-red-50 text-red-700',
  };

  return (
    <div className={`p-4 rounded-lg ${colorClasses[color]}`}>
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-sm opacity-80">{label}</div>
        </div>
      </div>
    </div>
  );
}