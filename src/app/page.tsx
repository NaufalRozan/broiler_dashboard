"use client";

import { useEffect, useState } from "react";
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

type DataPoint = {
  time: string;
  temp: number;
  humidity: number;
  co2: number;
  nh3: number;
  pm25: number;
};

export default function DashboardPage() {
  const [allData, setAllData] = useState<DataPoint[]>([]);
  const [data, setData] = useState<DataPoint[]>([]);
  const [index, setIndex] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<string>("");

  // fetch JSON dan mapping
  useEffect(() => {
    fetch("/data/broiler_data.json")
      .then((res) => res.json())
      .then((json) => {
        const mapped = json.map((item: any) => ({
          time: item["Timestamp"],
          temp: item["Temperature (°C)"],
          humidity: item["Humidity (%)"],
          co2: item["CO₂ (ppm)"],
          nh3: item["Ammonia (ppm)"],
          pm25: item["PM2.5 (µg/m³)"],
        }));
        setAllData(mapped);
      });
  }, []);

  // loop data realtime (6 titik terakhir)
  useEffect(() => {
    if (allData.length === 0) return;

    const interval = setInterval(() => {
      setData((prev) => {
        const next = allData[index];
        setLastUpdate(next.time);
        setIndex((index + 1) % allData.length);
        const newData = [...prev, next];
        if (newData.length > 6) newData.shift(); // jaga maksimal 6 titik
        return newData;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [allData, index]);

  if (data.length === 0) return <p className="p-4">Loading data...</p>;

  const latest = data[data.length - 1];

  const cards = [
    { label: "Temperature", value: latest.temp, unit: "°C", limit: 32, icon: "🌡️", color: latest.temp > 32 ? "red" : "green" },
    { label: "Humidity", value: latest.humidity, unit: "%", limit: 85, icon: "💧", color: "green" },
    { label: "CO₂", value: latest.co2, unit: "ppm", limit: 1200, icon: "🌫️", color: latest.co2 > 1200 ? "red" : "green" },
    { label: "NH₃", value: latest.nh3, unit: "ppm", limit: 5, icon: "⚗️", color: latest.nh3 > 5 ? "orange" : "green" },
    { label: "PM2.5", value: latest.pm25, unit: "µg/m³", limit: 35, icon: "🫁", color: latest.pm25 > 35 ? "yellow" : "green" },
  ];

  return (
    <div className="space-y-8 p-6  max-w-7xl mx-auto">
      <header className="flex flex-col items-center gap-4 mb-6">
        <div className="flex gap-4">
          <img
            src="/img/umpsa.png"
            alt="Logo"
            className="h-20 object-contain"
          />
          <img
            src="/img/pprn.png"
            alt="Logo"
            className="h-17 object-contain"
          />
        </div>
        <div className="text-center">
          <h1 className="text-4xl font-bold">iSENES-COOP: Smart Sensing System for Poultry House Monitoring</h1>
        </div>
      </header>

      <hr className="border-gray-300 my-4" />

      {/* CCTV Section */}
      <section>
        <div className="rounded-2xl overflow-hidden shadow-lg">
          <video
            src="/video/broiler_video.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="w-full  object-cover"
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
              <p className="text-xl font-bold">{item.value} {item.unit}</p>
              {item.value > item.limit && <p className="text-xs mt-1 text-red-600">⚠️ Above limit!</p>}
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
          <ResponsiveContainer width="100%" height="90%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="temp"
                stroke="#f87171"
                isAnimationActive={true}
                animationDuration={800} // transisi lebih smooth
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* CO2 vs Time */}
        <div className="mb-6 bg-white rounded-2xl shadow p-4 h-64">
          <h3 className="font-semibold mb-2">CO₂ (ppm)</h3>
          <ResponsiveContainer width="100%" height="90%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="co2"
                stroke="#60a5fa"
                isAnimationActive={true}
                animationDuration={800}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* PM2.5 & NH3 vs Time */}
        <div className="mb-6 bg-white rounded-2xl shadow p-4 h-64">
          <h3 className="font-semibold mb-2">PM2.5 (µg/m³) & NH₃ (ppm)</h3>
          <ResponsiveContainer width="100%" height="90%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="pm25"
                stroke="#a855f7"
                isAnimationActive={true}
                animationDuration={800}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="nh3"
                stroke="#fbbf24"
                isAnimationActive={true}
                animationDuration={800}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
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
              <ScatterChart
                margin={{ top: 20, right: 30, bottom: 40, left: 60 }} // 👈 Tambahkan margin
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  dataKey="temp"
                  name="Temperature"
                  unit="°C"
                  domain={['dataMin', 'dataMax']}
                  label={{
                    value: "Temperature (°C)",
                    position: "insideBottom",
                    offset: -10,
                  }}
                />
                <YAxis
                  type="number"
                  dataKey="co2"
                  name="CO₂"
                  unit="ppm"
                  domain={['dataMin', 'dataMax']}
                  label={{
                    value: "CO₂ (ppm)",
                    angle: -90,
                    position: "insideLeft",
                    offset: -40,
                  }}
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
              <ScatterChart
                margin={{ top: 20, right: 30, bottom: 40, left: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  dataKey="temp"
                  name="Temperature"
                  unit="°C"
                  domain={['dataMin', 'dataMax']}
                  label={{
                    value: "Temperature (°C)",
                    position: "insideBottom",
                    offset: -10,
                  }}
                />
                <YAxis
                  type="number"
                  dataKey="nh3"
                  name="NH₃"
                  unit="ppm"
                  domain={['dataMin', 'dataMax']}
                  label={{
                    value: "NH₃ (ppm)",
                    angle: -90,
                    position: "insideLeft",
                    offset: -40,
                  }}
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
              <ScatterChart
                margin={{ top: 20, right: 30, bottom: 40, left: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  dataKey="humidity"
                  name="Humidity"
                  unit="%"
                  domain={['dataMin', 'dataMax']}
                  label={{
                    value: "Humidity (%)",
                    position: "insideBottom",
                    offset: -10,
                  }}
                />
                <YAxis
                  type="number"
                  dataKey="pm25"
                  name="PM2.5"
                  unit="µg/m³"
                  domain={['dataMin', 'dataMax']}
                  label={{
                    value: "PM2.5 (µg/m³)",
                    angle: -90,
                    position: "insideLeft",
                    offset: -40,
                  }}
                />
                <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                <Scatter name="Data" data={allData} fill="#a855f7" shape="cross" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>


      {/* System Health */}
      <section>
        <h2 className="text-2xl font-semibold mb-2">System Health & Uptime</h2>
        <div className="p-4 bg-gray-50 rounded-xl shadow flex flex-col sm:flex-row gap-4">
          <div>🕒 Last Updated: {lastUpdate}</div>
          <div>📡 Status: Online</div>
          <div>🔋 Battery: 95%</div>
        </div>
      </section>
    </div>
  );
}
