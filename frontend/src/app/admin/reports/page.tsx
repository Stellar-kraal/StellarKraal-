'use client';

import { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setCurrentPage } from '@/store/adminSlice';
import { AppDispatch } from '@/store/store';
import AdminLayout from '@/components/AdminLayout';
import Card from '@/components/Card';

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  const csv = [headers.join(','), ...rows.map((row) => row.map(escapeCsv).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const dispatch = useDispatch<AppDispatch>();
  const pageData = useMemo(
    () => ({
      pageName: 'Reports',
      routePath: 'reports',
    }),
    []
  );

  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dispatch(setCurrentPage(pageData));
  }, [dispatch, pageData]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetch('/api/v1/loans?pageSize=100')
      .then((r) => r.json())
      .then((json) => {
        if (!mounted) return;
        setLoans(json.data || []);
        setLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        setError('Failed to load loans');
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [dispatch]);

  const handleExport = () => {
    const headers = ['ID', 'Borrower', 'Principal', 'Status', 'Created At'];
    const rows = loans.map((l) => [
      l.id,
      l.borrower,
      String(l.principal_amount || l.amount || 0),
      l.status,
      l.createdAt || l.created_at || '',
    ]);
    const date = new Date().toISOString().split('T')[0];
    downloadCsv(`report-${date}.csv`, headers, rows);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <Card
          header={
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-brown dark:text-cream">Loan Reports</h2>
              <button
                onClick={handleExport}
                disabled={loading || loans.length === 0}
                className="rounded-xl bg-brown px-4 py-2 text-sm font-semibold text-cream disabled:cursor-not-allowed disabled:opacity-50"
              >
                Download CSV
              </button>
            </div>
          }
        >
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-brown/10">
                  <th className="py-2 pr-4 font-medium text-brown/70">ID</th>
                  <th className="py-2 pr-4 font-medium text-brown/70">Borrower</th>
                  <th className="py-2 pr-4 font-medium text-brown/70">Principal</th>
                  <th className="py-2 pr-4 font-medium text-brown/70">Status</th>
                  <th className="py-2 font-medium text-brown/70">Created</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-brown/60">Loading...</td>
                  </tr>
                )}
                {!loading && loans.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-brown/60">No loans found.</td>
                  </tr>
                )}
                {loans.map((l) => (
                  <tr key={l.id} className="border-b border-brown/5">
                    <td className="py-2 pr-4 font-mono text-xs">{l.id}</td>
                    <td className="py-2 pr-4 font-mono text-xs">{l.borrower}</td>
                    <td className="py-2 pr-4">{String(l.principal_amount || l.amount || 0)}</td>
                    <td className="py-2 pr-4 capitalize">{l.status}</td>
                    <td className="py-2 text-brown/60">{l.createdAt || l.created_at || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}
