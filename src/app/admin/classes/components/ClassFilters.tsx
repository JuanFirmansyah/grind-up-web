// src/app/admin/classes/components/ClassFilters.tsx
"use client";

import { Search, Calendar, Filter } from "lucide-react";

interface ClassFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  dateFilter: string;
  onDateFilterChange: (value: string) => void;
}

export default function ClassFilters({
  searchTerm,
  onSearchChange,
  dateFilter,
  onDateFilterChange,
}: ClassFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
      {/* Search Input */}
      <div className="relative flex-1 sm:flex-initial">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Cari kelas atau coach..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Date Filter */}
      <div className="relative flex-1 sm:flex-initial">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Calendar className="h-4 w-4 text-gray-400" />
        </div>
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => onDateFilterChange(e.target.value)}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Filter Indicator */}
      {(searchTerm || dateFilter) && (
        <button
          onClick={() => {
            onSearchChange("");
            onDateFilterChange("");
          }}
          className="inline-flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
        >
          <Filter className="h-4 w-4" />
          Clear Filters
          {(searchTerm && dateFilter) && ` (2)`}
          {(searchTerm && !dateFilter) && ` (1)`}
          {(!searchTerm && dateFilter) && ` (1)`}
        </button>
      )}
    </div>
  );
}