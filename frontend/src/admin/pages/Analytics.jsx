import { useCallback, useEffect, useState } from "react";
import { Activity, Clock, Eye, Layers, Users2 } from "lucide-react";
import adminApi from "../api/adminApi";
import { AdminEmpty, AdminError, AdminLoading, MetricCard } from "../components/AdminStates";

function formatMs(ms) {
  const seconds = Math.round((Number(ms) || 0) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${seconds % 60}s`;
}

function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function AdminAnalytics() {
  const [overview, setOverview] = useState(null);
  const [events, setEvents] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [contentByType, setContentByType] = useState([]);
  const [screens, setScreens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    Promise.all([
      adminApi.get("/admin/analytics/overview"),
      adminApi.get("/admin/analytics/events"),
      adminApi.get("/admin/analytics/sessions"),
      adminApi.get("/admin/analytics/content"),
      adminApi.get("/admin/analytics/screen-time"),
    ])
      .then(([overviewRes, eventsRes, sessionsRes, contentRes, screenRes]) => {
        setOverview(overviewRes.data.overview);
        setEvents(eventsRes.data.events || []);
        setSessions(sessionsRes.data.sessions || []);
        setContentByType(contentRes.data.byType || []);
        setScreens(screenRes.data.screens || []);
      })
      .catch((err) => setError(err.response?.data?.message || "Analytics failed to load"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <AdminLoading rows={4} />;
  if (error) return <AdminError text={error} onRetry={load} />;
  if (!overview) {
    return <AdminEmpty title="No analytics yet" text="Events will appear after people start opening the app." />;
  }

  const topEvents = overview.topEvents || [];
  const maxEventCount = Math.max(...topEvents.map((e) => e.count), 1);
  const maxImpressions = Math.max(...contentByType.map((c) => c.impressions), 1);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard label="DAU" value={overview.dau} hint="last 24h" />
        <MetricCard label="WAU" value={overview.wau} hint="last 7d" />
        <MetricCard label="MAU" value={overview.mau} hint="last 30d" />
        <MetricCard label="Stickiness" value={`${overview.stickiness}%`} hint="DAU / MAU" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <MetricCard label="Avg. session length" value={formatMs(overview.averageSessionDuration)} />
        <MetricCard label="Sessions / user" value={overview.sessionsPerUser} />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <section className="rounded-[24px] border border-[#EAECF0] bg-white p-4">
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-[#4338CA]" />
            <h2 className="text-[15px] font-black text-[#12141C]">Top events (30d)</h2>
          </div>
          {topEvents.length === 0 ? (
            <p className="mt-4 text-[12px] font-bold text-[#98A2B3]">No events recorded yet.</p>
          ) : (
            <div className="mt-4 space-y-2.5">
              {topEvents.map((event) => (
                <div key={event._id}>
                  <div className="flex items-center justify-between text-[12px] font-bold text-[#344054]">
                    <span className="truncate">{event._id}</span>
                    <span className="shrink-0 text-[#667085]">{event.count.toLocaleString()}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#F2F4F7]">
                    <div
                      className="h-full rounded-full bg-[#4338CA]"
                      style={{ width: `${(event.count / maxEventCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-[24px] border border-[#EAECF0] bg-white p-4">
          <div className="flex items-center gap-2">
            <Eye size={16} className="text-[#4338CA]" />
            <h2 className="text-[15px] font-black text-[#12141C]">Content impressions</h2>
          </div>
          {contentByType.length === 0 ? (
            <p className="mt-4 text-[12px] font-bold text-[#98A2B3]">No impressions recorded yet.</p>
          ) : (
            <div className="mt-4 space-y-2.5">
              {contentByType.map((row) => (
                <div key={row._id}>
                  <div className="flex items-center justify-between text-[12px] font-bold text-[#344054]">
                    <span className="capitalize">{row._id?.replace(/_/g, " ")}</span>
                    <span className="text-[#667085]">{row.impressions.toLocaleString()}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#F2F4F7]">
                    <div
                      className="h-full rounded-full bg-[#EC9A1E]"
                      style={{ width: `${(row.impressions / maxImpressions) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="rounded-[24px] border border-[#EAECF0] bg-white p-4">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-[#4338CA]" />
          <h2 className="text-[15px] font-black text-[#12141C]">Screen time (30d)</h2>
        </div>
        {screens.length === 0 ? (
          <p className="mt-4 text-[12px] font-bold text-[#98A2B3]">No screen-time data yet.</p>
        ) : (
          <div className="mt-3 divide-y divide-[#EAECF0]">
            {screens.map((screen) => (
              <div key={screen._id} className="flex items-center justify-between gap-3 py-2.5">
                <p className="min-w-0 truncate text-[12.5px] font-black text-[#12141C]">{screen._id || "Unknown"}</p>
                <div className="flex shrink-0 items-center gap-3 text-[11px] font-bold text-[#667085]">
                  <span>{screen.views} views</span>
                  <span>avg {formatMs(screen.avgMs)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-[24px] border border-[#EAECF0] bg-white p-4">
        <div className="flex items-center gap-2">
          <Users2 size={16} className="text-[#4338CA]" />
          <h2 className="text-[15px] font-black text-[#12141C]">Recent sessions</h2>
        </div>
        {sessions.length === 0 ? (
          <p className="mt-4 text-[12px] font-bold text-[#98A2B3]">No sessions recorded yet.</p>
        ) : (
          <div className="mt-3 divide-y divide-[#EAECF0]">
            {sessions.slice(0, 15).map((session) => (
              <div key={session._id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] font-black text-[#12141C]">
                    {session.user?.fullName || session.user?.username || "Anonymous"}
                  </p>
                  <p className="truncate text-[10.5px] font-bold text-[#98A2B3]">{session._id}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3 text-[11px] font-bold text-[#667085]">
                  <span className="flex items-center gap-1">
                    <Layers size={12} /> {session.events}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} /> {timeAgo(session.lastEventAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-[24px] border border-[#EAECF0] bg-white p-4">
        <h2 className="text-[15px] font-black text-[#12141C]">Recent events</h2>
        {events.length === 0 ? (
          <p className="mt-4 text-[12px] font-bold text-[#98A2B3]">No events yet.</p>
        ) : (
          <div className="mt-3 divide-y divide-[#EAECF0]">
            {events.slice(0, 20).map((event) => (
              <div key={event._id} className="py-3">
                <p className="text-[13px] font-black text-[#12141C]">{event.eventName}</p>
                <p className="text-[11px] font-bold text-[#667085]">
                  {event.user?.fullName || event.user?.username || "Anonymous"} &middot;{" "}
                  {new Date(event.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
