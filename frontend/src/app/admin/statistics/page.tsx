'use client';

import { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setCurrentPage } from '@/store/adminSlice';
import { AppDispatch } from '@/store/store';
import AdminLayout from '@/components/AdminLayout';
import Card from '@/components/Card';

type Loan = {
  id: string;
  borrower: string;
  principal_amount: number;
  status: string;
  createdAt?: string;
  created_at?: string;
};

type Collateral = {
  id: string;
  owner: string;
  animal_type: string;
  appraised_value: number;
  status: string;
};

function PieChart({ data, colors }: { data: { label: string; value: number }[]; colors: string[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <p className="text-sm text-brown/60">No data</p>;

  let cumulative = 0;
  const slices = data.map((d, i) => {
    const start = (cumulative / total) * 2 * Math.PI;
    cumulative += d.value;
    const end = (cumulative / total) * 2 * Math.PI;
    return { ...d, start, end, color: colors[i % colors.length] };
  });

  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokes = slices.map((s) => {
    const length = ((s.end - s.start) / (2 * Math.PI)) * circumference;
    const offset = circumference - (s.start / (2 * Math.PI)) * circumference;
    return { length, offset, color: s.color, label: s.label, value: s.value };
  });

  return (
    <div className="flex flex-wrap items-center gap-4">
      <svg viewBox="0 0 140 140" className="h-40 w-40">
        {strokes.map((s, i) => (
          <circle
            key={i}
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke={s.color}
            strokeWidth="20"
            strokeDasharray={`${s.length} ${circumference - s.length}`}
            strokeDashoffset={s.offset}
          />
        ))}
      </svg>
      <div className="space-y-1 text-sm">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} />
            <span className="text-brown/80">{d.label}: {d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BarChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const colors = ['#dc2626', '#b91c1c', '#991b1b', '#7f1d1d', '#450a0a'];
  return (
    <div className="flex items-end gap-2 overflow-x-auto pb-2" style={{ minHeight: 160 }}>
      {data.map((d, i) => (
        <div key={i} className="flex min-w-[60px] flex-col items-center gap-2">
          <div
            className="w-full rounded-t-lg"
            style={{ height: Math.max((d.value / max) * 140, 4), backgroundColor: colors[i % colors.length] }}
          />
          <span className="text-xs text-brown/70">{d.label}</span>
          <span className="text-xs font-semibold text-brown">{d.value}</span>
        </div>
      ))}
    </div>
  );
}

function LineChart({ points }: { points: number[] }) {
  const width = 300;
  const height = 120;
  const max = Math.max(...points, 1);
  const step = width / Math.max(points.length - 1, 1);
  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${i * step} ${height - (p / max) * height}`)
    .join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-40 w-full overflow-visible">
      <path d={path} fill="none" stroke="#dc2626" strokeWidth="2" />
      {points.map((p, i) => (
        <circle key={i} cx={i * step} cy={height - (p / max) * height} r="3" fill="#dc2626" />
      ))}
    </svg>
  );
}

export default function StatisticsPage() {
  const dispatch = useDispatch<AppDispatch>();
  const pageData = useMemo(
    () => ({
      pageName: 'Statistics',
      routePath: 'statistics',
    }),
    []
  );

  const [stats, setStats] = useState<any>(null);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [collaterals, setCollaterals] = useState<Collateral[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dispatch(setCurrentPage(pageData));
  }, [dispatch, pageData]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([
      fetch('/api/v1/admin/stats').then((r) => r.json()),
      fetch('/api/v1/loans?pageSize=200').then((r) => r.json()),
      fetch('/api/v1/collateral?pageSize=200').then((r) => r.json()),
    ])
      .then(([s, l, c]) => {
        if (!mounted) return;
        setStats(s);
        setLoans(l.data || []);
        setCollaterals(c.data || []);
        setLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [dispatch]);

  const dailyOriginations = useMemo(() => {
    const days: Record<string, number> = {};
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      days[d.toISOString().split('T')[0]] = 0;
    }
    loans.forEach((l) => {
      const date = l.createdAt || l.created_at || '';
      if (date) days[date.split('T')[0]] = (days[date.split('T')[0]] || 0) + 1;
    });
    return Object.values(days);
  }, [loans]);

  const statusDistribution = useMemo(() => {
    const map: Record<string, number> = {};
    loans.forEach((l) => {
      map[l.status] = (map[l.status] || 0) + 1;
    });
    return [
      { label: 'Active', value: map['active'] || 0 },
      { label: 'Repaid', value: map['repaid'] || 0 },
      { label: 'Liquidated', value: map['liquidated'] || 0 },
    ];
  }, [loans]);

  const collateralByAnimal = useMemo(() => {
    const map: Record<string, number> = {};
    collaterals.forEach((c) => {
      map[c.animal_type] = (map[c.animal_type] || 0) + (c.appraised_value || 0);
    });
    return Object.entries(map).map(([label, value]) => ({ label, value: Math.round(value / 1e7) }));
  }, [collaterals]);

  const pieColors = ['#dc2626', '#16a34a', '#2563eb', '#ca8a04', '#9333ea'];

  return (
    <AdminLayout>
      <div className="grid gap-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card header={<h3 className="font-semibold text-brown dark:text-cream">Total Users</h3>}>
            <p className="text-3xl font-bold text-gold">{loading ? '...' : stats?.totalUsers ?? 0}</p>
          </Card>
          <Card header={<h3 className="font-semibold text-brown dark:text-cream">Total Loans</h3>}>
            <p className="text-3xl font-bold text-gold">{loading ? '...' : stats?.totalLoans ?? 0}</p>
          </Card>
          <Card header={<h3 className="font-semibold text-brown dark:text-cream">Active Collateral</h3>}>
            <p className="text-3xl font-bold text-gold">{loading ? '...' : stats?.totalCollateral ?? 0}</p>
          </Card>
          <Card header={<h3 className="font-semibold text-brown dark:text-cream">TVL (XLM)</h3>}>
            <p className="text-3xl font-bold text-gold">{loading ? '...' : stats?.totalValueLocked ?? 0}</p>
          </Card>
        </div>

        <Card header={<h3 className="font-semibold text-brown dark:text-cream">Daily Loan Originations (30 days)</h3>}>
          <div className="overflow-x-auto">
            <LineChart points={dailyOriginations} />
          </div>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Card header={<h3 className="font-semibold text-brown dark:text-cream">Loan Status Distribution</h3>}>
            <div className="overflow-x-auto">
              <PieChart data={statusDistribution} colors={pieColors} />
            </div>
          </Card>
          <Card header={<h3 className="font-semibold text-brown dark:text-cream">Collateral Value by Animal Type (XLM)</h3>}>
            <div className="overflow-x-auto">
              <BarChart data={collateralByAnimal} />
            </div>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
