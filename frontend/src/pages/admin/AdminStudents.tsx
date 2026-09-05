import React, { useState, useEffect } from 'react';
import { adminApi } from '../../services/api';
import { Student } from '../../types';
import { GraduationCap, Search, MapPin, Route as RouteIcon, Phone } from 'lucide-react';

export const AdminStudents: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getStudents();
      if (res.data.success) {
        setStudents(res.data.students);
      }
    } catch (e) {
      console.error('Failed to load students:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const filtered = students.filter(
    (s) =>
      s.user?.name.toLowerCase().includes(search.toLowerCase()) ||
      s.rollNumber.toLowerCase().includes(search.toLowerCase()) ||
      s.village.toLowerCase().includes(search.toLowerCase()) ||
      s.boardingPoint?.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Registered Students</h1>
          <p className="text-xs text-slate-400">
            View student enrollment, assigned route corridors, and GPS boarding points.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-3">
        <Search className="w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by student name, roll number, village, or boarding stop..."
          className="w-full bg-transparent text-white text-sm focus:outline-none placeholder:text-slate-500"
        />
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/70 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Roll Number</th>
                <th className="px-6 py-4">Student Name</th>
                <th className="px-6 py-4">Village / City</th>
                <th className="px-6 py-4">Assigned Route</th>
                <th className="px-6 py-4">Boarding Point (GPS)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500 text-xs">
                    No students found.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-blue-400">
                      {s.rollNumber}
                    </td>
                    <td className="px-6 py-4 font-bold text-white flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-purple-400" />
                      {s.user?.name}
                    </td>
                    <td className="px-6 py-4 text-slate-300">{s.village}</td>
                    <td className="px-6 py-4 text-indigo-300 font-medium">
                      {s.route?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      {s.boardingPoint ? (
                        <div>
                          <span className="font-semibold text-white block">
                            📍 {s.boardingPoint.name}
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            {s.boardingPoint.latitude.toFixed(4)}, {s.boardingPoint.longitude.toFixed(4)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">Not assigned</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
