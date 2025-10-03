// src/app/admin/classes/components/TableView.tsx
"use client";

import { Pencil, Trash2, Users, Clock, Calendar } from "lucide-react";

interface GymClass {
  id: string;
  className: string;
  coach: string;
  slots: number;
  bookedCount: number;
  date: string;
  time: string;
  duration: number;
  level: string;
  tags: string[];
}

interface TableViewProps {
  classes: GymClass[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function TableView({ classes, onEdit, onDelete }: TableViewProps) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('id-ID', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getBookingRate = (booked: number, slots: number) => {
    return slots > 0 ? Math.round((booked / slots) * 100) : 0;
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Kelas
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Jadwal
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Coach
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Level
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Kapasitas
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Booking Rate
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {classes.map((cls) => (
              <tr key={cls.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div>
                    <div className="font-medium text-gray-900">{cls.className}</div>
                    <div className="flex gap-1 mt-1">
                      {cls.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize"
                          style={{
                            backgroundColor: 
                              tag === 'special' ? '#FEF3C7' : 
                              tag === 'functional' ? '#D1FAE5' : 
                              '#DBEAFE',
                            color: 
                              tag === 'special' ? '#92400E' : 
                              tag === 'functional' ? '#065F46' : 
                              '#1E40AF'
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(cls.date)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                    <Clock className="h-4 w-4" />
                    <span>{cls.time} • {cls.duration}m</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">{cls.coach}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    cls.level === 'Advanced' ? 'bg-red-100 text-red-800' :
                    cls.level === 'Intermediate' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {cls.level}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-gray-400" />
                    <span>{cls.bookedCount}/{cls.slots}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full transition-all"
                        style={{ 
                          width: `${getBookingRate(cls.bookedCount, cls.slots)}%`,
                          backgroundColor: 
                            getBookingRate(cls.bookedCount, cls.slots) > 80 ? '#10B981' :
                            getBookingRate(cls.bookedCount, cls.slots) > 50 ? '#F59E0B' :
                            '#EF4444'
                        }}
                      />
                    </div>
                    <span className="text-sm text-gray-600">
                      {getBookingRate(cls.bookedCount, cls.slots)}%
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => onEdit(cls.id)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDelete(cls.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Hapus"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}