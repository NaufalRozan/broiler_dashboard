"use client";

import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
  ScatterChart,
  Scatter,
} from "recharts";

// ========= Types =========
type DataPoint = {
  time: string;
  temp: number;
  humidity: number;
  co2: number;
  nh3: number;
  pm25: number;
};

type MortalityEntry = {
  date: string;
  count: number;
  notes?: string;
};

type ConsumptionEntry = {
  day: number;
  feedKg: number;
  waterL: number;
};

// ========= Helpers =========
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

// Dummy standar kurva (silakan ganti sesuai standarmu)
function standardFeedKg(day: number): number {
  const base = 0.05;
  const inc = 0.015;
  return +(base + inc * Math.pow(day, 1.15)).toFixed(3);
}
function standardWaterL(day: number): number {
  return +(standardFeedKg(day) * 2.2).toFixed(3);
}

export default function DashboardPage() {
  // ====== Sensor data ======
  const [allData, setAllData] = useState<DataPoint[]>([]);
  const [data, setData] = useState<DataPoint[]>([]);
  const [index, setIndex] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<string>("");

  // ====== Health & Behavior (prototype) ======
  // Mortality
  const [mortality, setMortality] = useState<MortalityEntry[]>([]);
  const [mortDate, setMortDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [mortCount, setMortCount] = useState<number>(0);
  const [mortNotes, setMortNotes] = useState<string>("");

  // Consumption
  const [consumptions, setConsumptions] = useState<ConsumptionEntry[]>([
    { day: 1, feedKg: 0.06, waterL: 0.13 },
    { day: 2, feedKg: 0.07, waterL: 0.15 },
    { day: 3, feedKg: 0.08, waterL: 0.18 },
    { day: 4, feedKg: 0.10, waterL: 0.21 },
    { day: 5, feedKg: 0.12, waterL: 0.25 },
  ]);
  const [dayInput, setDayInput] = useState<number>(consumptions.length + 1);
  const [feedInput, setFeedInput] = useState<number>(0.1);
  const [waterInput, setWaterInput] = useState<number>(0.22);

  // Vision activity (dummy score)
  const activityScore = useMemo(() => {
    const latest = data[data.length - 1];
    if (!latest) return 50;
    const tempPenalty = clamp(Math.abs(latest.temp - 28) * 3, 0, 40);
    const humiPenalty = clamp(Math.abs(latest.humidity - 65) * 0.8, 0, 25);
    const noise = Math.random() * 10;
    return clamp(90 - tempPenalty - humiPenalty + noise, 5, 95);
  }, [data]);

  const abnormalReason = useMemo(() => {
    const latest = data[data.length - 1];
    if (!latest) return "Insufficient data";
    const reasons: string[] = [];
    if (latest.temp > 32) reasons.push("High temperature");
    if (latest.co2 > 1200) reasons.push("High CO₂");
    if (latest.nh3 > 5) reasons.push("High NH₃");
    if (latest.pm25 > 35) reasons.push("High PM2.5");
    if (activityScore < 35) reasons.push("Low movement");
    return reasons.length ? reasons.join(", ") : "Normal";
  }, [activityScore, data]);

  // ====== Fetch JSON & map ======
  useEffect(() => {
    fetch("/data/broiler_data.json")
      .then((res) => res.json())
      .then((json: Record<string, unknown>[]) => {
        const mapped: DataPoint[] = json.map((item) => ({
          time: String(item["Timestamp"]),
          temp: Number(item["Temperature (°C)"]),
          humidity: Number(item["Humidity (%)"]),
          co2: Number(item["CO₂ (ppm)"]),
          nh3: Number(item["Ammonia (ppm)"]),
          pm25: Number(item["PM2.5 (µg/m³)"]),
        }));
        setAllData(mapped);
      });
  }, []);

  // ====== Loop realtime (6 titik) ======
  useEffect(() => {
    if (allData.length === 0) return;
    const interval = setInterval(() => {
      setData((prev) => {
        const next = allData[index];
        setLastUpdate(next.time);
        setIndex((index + 1) % allData.length);
        const newData = [...prev, next];
        if (newData.length > 6) newData.shift();
        return newData;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [allData, index]);

  // ==== SAFE derivations tanpa early-return ====
  const isLoading = data.length === 0;
  const latestSafe: DataPoint =
    data[data.length - 1] ??
    allData[0] ?? {
      time: "-",
      temp: 0,
      humidity: 0,
      co2: 0,
      nh3: 0,
      pm25: 0,
    };

  // ====== Cards ======
  const cards = [
    { label: "Temperature", value: latestSafe.temp, unit: "°C", limit: 32, icon: "🌡️", color: latestSafe.temp > 32 ? "red" : "green" },
    { label: "Humidity", value: latestSafe.humidity, unit: "%", limit: 85, icon: "💧", color: "green" },
    { label: "CO₂", value: latestSafe.co2, unit: "ppm", limit: 1200, icon: "🌫️", color: latestSafe.co2 > 1200 ? "red" : "green" },
    { label: "NH₃", value: latestSafe.nh3, unit: "ppm", limit: 5, icon: "⚗️", color: latestSafe.nh3 > 5 ? "orange" : "green" },
    { label: "PM2.5", value: latestSafe.pm25, unit: "µg/m³", limit: 35, icon: "🫁", color: latestSafe.pm25 > 35 ? "yellow" : "green" },
  ];

  // ====== Chart data for consumption vs standard ======
  const consumptionChartData = useMemo(() => {
    const days = [...consumptions]
      .sort((a, b) => a.day - b.day)
      .map((c) => ({
        day: c.day,
        feedKg: c.feedKg,
        waterL: c.waterL,
        stdFeedKg: standardFeedKg(c.day),
        stdWaterL: standardWaterL(c.day),
      }));
    return days;
  }, [consumptions]);

  // ====== Handlers ======
  const addMortality = () => {
    if (!mortDate || Number.isNaN(mortCount)) return;
    setMortality((prev) => [
      ...prev,
      { date: mortDate, count: mortCount, notes: mortNotes || undefined },
    ]);
    setMortCount(0);
    setMortNotes("");
  };

  const addConsumption = () => {
    if (dayInput <= 0) return;
    setConsumptions((prev) => {
      const exists = prev.some((p) => p.day === dayInput);
      const next = exists
        ? prev.map((p) =>
          p.day === dayInput ? { ...p, feedKg: feedInput, waterL: waterInput } : p
        )
        : [...prev, { day: dayInput, feedKg: feedInput, waterL: waterInput }];
      return next;
    });
    setDayInput((d) => d + 1);
  };

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <header className="flex flex-col items-center gap-4 mb-2">
        <div className="flex gap-4">
          <img src="/img/umpsa.png" alt="Logo UMPSA" className="h-30 object-contain" />
        </div>
        <div className="text-center">
          <h1 className="text-4xl font-bold">iSENS-COOP: Smart Sensing System for Poultry House Monitoring</h1>
        </div>
      </header>

      <hr className="border-gray-300 my-4" />

      {/* CCTV Section */}
      <section>
        <div className="rounded-2xl overflow-hidden shadow-lg relative">
          <video
            src="/video/broiler_video.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="w-full object-cover"
          />
        </div>
      </section>

      {/* Live Readings */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Live Readings</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
          {cards.map((item, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-2xl shadow-sm border ${item.color === "red"
                ? "bg-red-50 border-red-300"
                : item.color === "orange"
                  ? "bg-orange-50 border-orange-300"
                  : item.color === "yellow"
                    ? "bg-yellow-50 border-yellow-300"
                    : "bg-green-50 border-green-200"
                } transition`}
            >
              <div className="text-3xl mb-2">{item.icon}</div>
              <p className="text-sm text-gray-600">{item.label}</p>
              <p className="text-xl font-bold">
                {item.value} {item.unit}
              </p>
              {item.value > item.limit && (
                <p className="text-xs mt-1 text-red-600">⚠️ Above limit!</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Trend Analysis */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Trend Analysis</h2>

        {/* Temp vs Time */}
        <div className="mb-6 bg-white rounded-2xl shadow p-4 h-64">
          <h3 className="font-semibold mb-2">Temperature (°C)</h3>
          <div className="h-[90%]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={isLoading ? [] : data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="temp"
                  stroke="#f87171"
                  isAnimationActive
                  animationDuration={800}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {isLoading && <p className="text-xs text-gray-400 mt-2">Loading data…</p>}
        </div>

        {/* CO2 vs Time */}
        <div className="mb-6 bg-white rounded-2xl shadow p-4 h-64">
          <h3 className="font-semibold mb-2">CO₂ (ppm)</h3>
          <div className="h-[90%]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={isLoading ? [] : data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="co2"
                  stroke="#60a5fa"
                  isAnimationActive
                  animationDuration={800}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {isLoading && <p className="text-xs text-gray-400 mt-2">Loading data…</p>}
        </div>

        {/* PM2.5 & NH3 vs Time */}
        <div className="mb-6 bg-white rounded-2xl shadow p-4 h-64">
          <h3 className="font-semibold mb-2">PM2.5 (µg/m³) & NH₃ (ppm)</h3>
          <div className="h-[90%]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={isLoading ? [] : data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="pm25"
                  stroke="#a855f7"
                  isAnimationActive
                  animationDuration={800}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="nh3"
                  stroke="#fbbf24"
                  isAnimationActive
                  animationDuration={800}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {isLoading && <p className="text-xs text-gray-400 mt-2">Loading data…</p>}
        </div>
      </section>

      {/* Correlation Insight */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Correlation Insight</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Temp vs CO2 */}
          <div className="bg-white rounded-2xl shadow p-2 h-72">
            <h3 className="font-medium mb-2">Temp vs CO₂</h3>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 30, bottom: 40, left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  dataKey="temp"
                  name="Temperature"
                  unit="°C"
                  domain={["dataMin", "dataMax"]}
                  label={{ value: "Temperature (°C)", position: "insideBottom", offset: -10 }}
                />
                <YAxis
                  type="number"
                  dataKey="co2"
                  name="CO₂"
                  unit="ppm"
                  domain={["dataMin", "dataMax"]}
                  label={{ value: "CO₂ (ppm)", angle: -90, position: "insideLeft", offset: -40 }}
                />
                <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                <Scatter name="Data" data={allData} fill="#60a5fa" shape="cross" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {/* Temp vs NH3 */}
          <div className="bg-white rounded-2xl shadow p-2 h-72">
            <h3 className="font-medium mb-2">Temp vs NH₃</h3>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 30, bottom: 40, left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  dataKey="temp"
                  name="Temperature"
                  unit="°C"
                  domain={["dataMin", "dataMax"]}
                  label={{ value: "Temperature (°C)", position: "insideBottom", offset: -10 }}
                />
                <YAxis
                  type="number"
                  dataKey="nh3"
                  name="NH₃"
                  unit="ppm"
                  domain={["dataMin", "dataMax"]}
                  label={{ value: "NH₃ (ppm)", angle: -90, position: "insideLeft", offset: -40 }}
                />
                <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                <Scatter name="Data" data={allData} fill="#fbbf24" shape="cross" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {/* Humidity vs PM2.5 */}
          <div className="bg-white rounded-2xl shadow p-2 h-72">
            <h3 className="font-medium mb-2">Humidity vs PM2.5</h3>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 30, bottom: 40, left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  dataKey="humidity"
                  name="Humidity"
                  unit="%"
                  domain={["dataMin", "dataMax"]}
                  label={{ value: "Humidity (%)", position: "insideBottom", offset: -10 }}
                />
                <YAxis
                  type="number"
                  dataKey="pm25"
                  name="PM2.5"
                  unit="µg/m³"
                  domain={["dataMin", "dataMax"]}
                  label={{ value: "PM2.5 (µg/m³)", angle: -90, position: "insideLeft", offset: -40 }}
                />
                <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                <Scatter name="Data" data={allData} fill="#a855f7" shape="cross" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* ============ Health & Behavior Monitoring (Prototype) ============ */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Health & Behavior Monitoring (Prototype)</h2>

        {/* Row: Mortality + Vision */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Mortality Logging */}
          <div className="bg-white rounded-2xl shadow p-4">
            <h3 className="font-semibold text-lg mb-3">Mortality Detection / Logging (Manual)</h3>
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="flex-1">
                <label className="text-sm text-gray-600">Date</label>
                <input
                  type="date"
                  className="w-full border rounded-lg px-3 py-2"
                  value={mortDate}
                  onChange={(e) => setMortDate(e.target.value)}
                />
              </div>
              <div className="w-32">
                <label className="text-sm text-gray-600">Count</label>
                <input
                  type="number"
                  className="w-full border rounded-lg px-3 py-2"
                  min={0}
                  value={mortCount}
                  onChange={(e) => setMortCount(Number(e.target.value))}
                />
              </div>
              <div className="flex-1">
                <label className="text-sm text-gray-600">Notes</label>
                <input
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="optional"
                  value={mortNotes}
                  onChange={(e) => setMortNotes(e.target.value)}
                />
              </div>
              <button
                onClick={addMortality}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg"
              >
                Add
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="py-2">Date</th>
                    <th className="py-2">Count</th>
                    <th className="py-2">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {mortality.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-3 text-gray-400">
                        No records yet.
                      </td>
                    </tr>
                  ) : (
                    mortality.map((m, i) => (
                      <tr key={`${m.date}-${i}`} className="border-t">
                        <td className="py-2">{m.date}</td>
                        <td className="py-2">{m.count}</td>
                        <td className="py-2">{m.notes ?? "-"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Vision-based Activity (Prototype) */}
          <div className="bg-white rounded-2xl shadow p-4">
            <h3 className="font-semibold text-lg mb-3">Chicken Activity Analysis (Vision-Based)</h3>
            <div className="rounded-xl overflow-hidden relative">
              <video
                src="/video/broiler_video.mp4"
                autoPlay
                loop
                muted
                playsInline
                className="w-full object-cover max-h-64"
              />
              {/* Pseudo heatmap overlay */}
              <div
                className="absolute inset-0 pointer-events-none opacity-40"
                style={{
                  background:
                    "radial-gradient(circle at 30% 40%, #ff0000, transparent 40%), radial-gradient(circle at 70% 60%, #ffa500, transparent 35%), radial-gradient(circle at 50% 30%, #ffff00, transparent 30%)",
                }}
              />
              <div className="absolute bottom-2 right-2 bg-white/80 backdrop-blur px-3 py-1 rounded-lg text-xs">
                Heatmap
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
              <div className="p-3 rounded-lg bg-gray-50">
                <div className="text-gray-500">Activity Score</div>
                <div className="text-xl font-semibold">{Math.round(activityScore)}</div>
              </div>
              <div className="p-3 rounded-lg bg-gray-50">
                <div className="text-gray-500">Status</div>
                <div
                  className={`text-sm font-semibold ${activityScore < 35
                    ? "text-red-600"
                    : activityScore < 60
                      ? "text-yellow-600"
                      : "text-green-700"
                    }`}
                >
                  {activityScore < 35 ? "Abnormal (Low)" : activityScore < 60 ? "Moderate" : "Normal"}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-gray-50">
                <div className="text-gray-500">Reason</div>
                <div className="text-xs">{abnormalReason}</div>
              </div>
            </div>

          </div>
        </div>

        {/* Row: Feed & Water Consumption */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Form */}
          <div className="bg-white rounded-2xl shadow p-4">
            <h3 className="font-semibold text-lg mb-3">Feed & Water Consumption (Manual)</h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-sm text-gray-600">Day</label>
                <input
                  type="number"
                  min={1}
                  className="w-full border rounded-lg px-3 py-2"
                  value={dayInput}
                  onChange={(e) => setDayInput(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Feed (kg)</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full border rounded-lg px-3 py-2"
                  value={feedInput}
                  onChange={(e) => setFeedInput(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Water (L)</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full border rounded-lg px-3 py-2"
                  value={waterInput}
                  onChange={(e) => setWaterInput(Number(e.target.value))}
                />
              </div>
            </div>
            <button
              onClick={addConsumption}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg w-full"
            >
              Save Entry
            </button>

            <div className="mt-4 max-h-40 overflow-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="py-2 px-2">Day</th>
                    <th className="py-2 px-2">Feed (kg)</th>
                    <th className="py-2 px-2">Water (L)</th>
                  </tr>
                </thead>
                <tbody>
                  {[...consumptions].sort((a, b) => a.day - b.day).map((c) => (
                    <tr key={c.day} className="border-t">
                      <td className="py-1 px-2">{c.day}</td>
                      <td className="py-1 px-2">{c.feedKg}</td>
                      <td className="py-1 px-2">{c.waterL}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>

          {/* Chart: Feed */}
          <div className="bg-white rounded-2xl shadow p-4 col-span-1">
            <h3 className="font-semibold mb-2">Daily Feed Trend vs Standard</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={consumptionChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="feedKg" name="Feed (kg)" stroke="#10b981" dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="stdFeedKg" name="Std Feed (kg)" stroke="#ef4444" dot={false} strokeDasharray="4 4" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart: Water */}
          <div className="bg-white rounded-2xl shadow p-4 col-span-1">
            <h3 className="font-semibold mb-2">Daily Water Trend vs Standard</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={consumptionChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="waterL" name="Water (L)" stroke="#3b82f6" dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="stdWaterL" name="Std Water (L)" stroke="#ef4444" dot={false} strokeDasharray="4 4" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>

      {/* System Health */}
      <section>
        <h2 className="text-2xl font-semibold mb-2">System Health & Uptime</h2>
        <div className="p-4 bg-gray-50 rounded-xl shadow flex flex-col sm:flex-row gap-4">
          <div>🕒 Last Updated: {lastUpdate || "-"}</div>
          <div>📡 Status: {allData.length ? "Online" : "Starting…"}</div>
          <div>🔋 Battery: 95%</div>
        </div>
      </section>
    </div>
  );
}
