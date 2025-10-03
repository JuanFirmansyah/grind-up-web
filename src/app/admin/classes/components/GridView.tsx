// src/app/admin/classes/components/GridView.tsx
"use client";

import { Pencil, Trash2, Users, Clock, Calendar } from "lucide-react";
import { motion } from "framer-motion";

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
  imageUrl?: string;
}

interface GridViewProps {
  classes: GymClass[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function GridView({ classes, onEdit, onDelete }: GridViewProps) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getBookingRate = (booked: number, slots: number) => {
    return slots > 0 ? Math.round((booked / slots) * 100) : 0;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {classes.map((cls, index) => (
        <motion.div
          key={cls.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
          className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all group"
        >
          {/* Header dengan Image/Gradient */}
          <div 
            className="h-32 rounded-t-xl relative overflow-hidden"
            style={{
              background: cls.imageUrl 
                ? `linear-gradient(135deg, rgba(151, 204, 221, 0.8) 0%, rgba(151, 204, 221, 0.6) 100%), url(${cls.imageUrl}) center/cover`
                : 'linear-gradient(135deg, #97CCDD 0%, #6FB5CC 100%)'
            }}
          >
            <div className="absolute top-3 right-3 flex gap-1">
              {cls.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 rounded-full text-xs font-medium text-white shadow-sm capitalize"
                  style={{
                    backgroundColor: 
                      tag === 'special' ? 'rgba(221, 151, 204, 0.9)' : 
                      tag === 'functional' ? 'rgba(16, 185, 129, 0.9)' : 
                      'rgba(59, 130, 246, 0.9)'
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                {cls.className}
              </h3>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                cls.level === 'Advanced' ? 'bg-red-100 text-red-800' :
                cls.level === 'Intermediate' ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              }`}>
                {cls.level}
              </span>
            </div>

            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>Coach: <strong>{cls.coach}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(cls.date)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>{cls.time} • {cls.duration}m</span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">{cls.bookedCount}/{cls.slots}</span>
                </div>
                <div className="text-sm font-medium" style={{
                  color: 
                    getBookingRate(cls.bookedCount, cls.slots) > 80 ? '#10B981' :
                    getBookingRate(cls.bookedCount, cls.slots) > 50 ? '#F59E0B' :
                    '#EF4444'
                }}>
                  {getBookingRate(cls.bookedCount, cls.slots)}% terisi
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-gray-100">
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
          </div>
        </motion.div>
      ))}
    </div>
  );
}