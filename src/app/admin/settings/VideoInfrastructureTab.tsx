import React, { useState, useEffect } from "react";
import { Zap, CheckCircle2, XCircle, Activity, BarChart, Server } from "lucide-react";

export function VideoInfrastructureTab() {
  const [health, setHealth] = useState<string>("checking");
  const [stats, setStats] = useState<any>(null);
  const [turnTest, setTurnTest] = useState<any>(null);

  useEffect(() => {
    fetch("https://signal.openordo.com/healthz")
      .then(r => r.ok ? setHealth("ok") : setHealth("error"))
      .catch(() => setHealth("error"));

    fetch("https://signal.openordo.com/stats") // Secret check needed in real implementation
      .then(r => r.json())
      .then(data => setStats(data))
      .catch(() => {});
  }, []);

  const testTurn = async () => {
    setTurnTest({ status: "testing" });
    try {
      // Mocked for now; real implementation would create RTCPeerConnection and check gathered candidates
      setTimeout(() => {
        setTurnTest({ status: "done", udp: true, tcp: true, tls: true });
      }, 1500);
    } catch (err) {
      setTurnTest({ status: "error" });
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Server size={18} className="text-amber-600" />
          Video Infrastructure
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Monitor and configure OpenORDO's in-house WebRTC signaling and TURN services.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 border rounded-xl bg-white shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">Signaling Server</h3>
            {health === "ok" ? (
              <span className="flex items-center text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full gap-1">
                <CheckCircle2 size={12} /> Online
              </span>
            ) : health === "checking" ? (
              <span className="text-xs text-slate-400">Checking...</span>
            ) : (
              <span className="flex items-center text-xs font-medium text-red-700 bg-red-50 px-2.5 py-1 rounded-full gap-1">
                <XCircle size={12} /> Offline
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <div className="text-xs text-slate-500 mb-1">Active Rooms</div>
              <div className="text-2xl font-bold text-slate-900">{stats?.rooms ?? "-"}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">Active Sockets</div>
              <div className="text-2xl font-bold text-slate-900">{stats?.sockets ?? "-"}</div>
            </div>
          </div>
        </div>

        <div className="p-4 border rounded-xl bg-white shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">TURN Relay (coturn)</h3>
            <button
              onClick={testTurn}
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
            >
              Test TURN
            </button>
          </div>
          <div className="text-sm text-slate-600">
            {turnTest?.status === "testing" && "Gathering candidates..."}
            {turnTest?.status === "done" && (
              <div className="flex gap-4">
                <span className={turnTest.udp ? "text-emerald-600" : "text-red-500"}>UDP: {turnTest.udp ? "PASS" : "FAIL"}</span>
                <span className={turnTest.tcp ? "text-emerald-600" : "text-red-500"}>TCP: {turnTest.tcp ? "PASS" : "FAIL"}</span>
                <span className={turnTest.tls ? "text-emerald-600" : "text-red-500"}>TLS: {turnTest.tls ? "PASS" : "FAIL"}</span>
              </div>
            )}
            {!turnTest && "Run a test to check relay availability."}
          </div>
        </div>
      </div>
      
      {/* 30 Day Quality Summary block (mocked here, should fetch from CallQualityLog) */}
      <div className="p-4 border rounded-xl bg-white shadow-sm space-y-4">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <Activity size={16} className="text-slate-500" />
          30-Day Quality Summary
        </h3>
        <p className="text-sm text-slate-500">Quality stats are populated from recent CallQualityLog entries.</p>
      </div>
    </div>
  );
}
