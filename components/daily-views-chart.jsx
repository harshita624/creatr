"use client";

import {
  CategoryScale, Chart as ChartJS, Filler,
  LinearScale, LineElement, PointElement, Tooltip,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

export default function DailyViewsChart({ data = [] }) {
  const values   = data.map((d) => d.views);
  const labels   = data.map((d) => d.day);
  const total    = values.reduce((s, v) => s + v, 0);
  const avg      = data.length > 0 ? Math.round(total / data.length) : 0;
  const maxVal   = Math.max(...values, 1);
  const last7    = values.slice(-7);
  const prev7    = values.slice(-14, -7);
  const last7Sum = last7.reduce((s, v) => s + v, 0);
  const prev7Sum = prev7.reduce((s, v) => s + v, 0);
  const trend    = prev7Sum === 0
    ? (last7Sum > 0 ? 100 : 0)
    : Math.round(((last7Sum - prev7Sum) / prev7Sum) * 100);

  const chartData = {
    labels,
    datasets: [{
      data: values,
      borderColor: "#9333ea",
      backgroundColor: (ctx) => {
        const chart = ctx.chart;
        const { ctx: c, chartArea } = chart;
        if (!chartArea) return "rgba(147,51,234,0.1)";
        const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
        g.addColorStop(0, "rgba(147,51,234,0.22)");
        g.addColorStop(1, "rgba(147,51,234,0)");
        return g;
      },
      borderWidth: 2,
      pointRadius: (ctx) => {
        const val = ctx.dataset.data[ctx.dataIndex];
        return val > 0 ? 3 : 0;
      },
      pointBackgroundColor: "#9333ea",
      pointBorderColor: "#fff",
      pointBorderWidth: 1.5,
      tension: 0.4,
      fill: true,
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend:  { display: false },
      tooltip: {
        backgroundColor: "#1e1b4b",
        padding: 8,
        cornerRadius: 8,
        callbacks: {
          title: (items) => items[0]?.label || "",
          label: (ctx)   => ` ${ctx.parsed.y.toLocaleString()} views`,
        },
      },
    },
    scales: {
      x: {
        grid:  { display: false },
        border:{ display: false },
        ticks: {
          color: "#94a3b8",
          font:  { size: 10 },
          maxTicksLimit: 7,
          maxRotation:   0,
        },
      },
      y: {
        grid:  { color: "#f1f5f9", lineWidth: 1 },
        border:{ display: false },
        ticks: {
          color: "#94a3b8",
          font:  { size: 10 },
          maxTicksLimit: 5,
          callback: (v) => v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v,
        },
        beginAtZero: true,
        min: 0,
        suggestedMax: Math.max(maxVal * 1.15, 1),
      },
    },
  };

  return (
    <div className="w-full">
      {/* Summary cards */}
      <div className="mb-4 grid grid-cols-3 gap-2 sm:gap-3">
        <div className="rounded-xl bg-violet-50 p-3">
          <p className="text-[10px] font-semibold text-slate-500 sm:text-[11px]">Total Views</p>
          <p className="mt-1 text-lg font-black text-violet-600 sm:text-xl">
            {total >= 1000 ? `${(total / 1000).toFixed(1)}K` : total}
          </p>
        </div>
        <div className="rounded-xl bg-blue-50 p-3">
          <p className="text-[10px] font-semibold text-slate-500 sm:text-[11px]">Avg. Daily</p>
          <p className="mt-1 text-lg font-black text-blue-600 sm:text-xl">{avg}</p>
        </div>
        <div className={`rounded-xl p-3 ${trend >= 0 ? "bg-emerald-50" : "bg-red-50"}`}>
          <p className="text-[10px] font-semibold text-slate-500 sm:text-[11px]">7-day trend</p>
          <p className={`mt-1 text-lg font-black sm:text-xl ${trend >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            {trend >= 0 ? "+" : ""}{trend}%
          </p>
        </div>
      </div>

      {/* Chart — explicit height so it never overflows */}
      <div className="relative h-[160px] w-full sm:h-[200px]">
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}