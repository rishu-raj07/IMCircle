import { useCallback, useEffect, useState } from "react";
import adminApi from "../api/adminApi";
import { AdminEmpty, AdminError, AdminLoading, MetricCard } from "../components/AdminStates";

const groups = [
  {
    title: "People",
    keys: ["totalUsers", "newUsersToday", "dau", "wau", "mau", "suspendedUsers", "deletedUsers"],
  },
  {
    title: "Content",
    keys: [
      "totalPosts",
      "totalLearningPosts",
      "totalJourneys",
      "totalJourneyMilestones",
      "totalCommentsReplies",
      "totalReposts",
    ],
  },
  {
    title: "Trust & activity",
    keys: [
      "totalReports",
      "pendingReports",
      "totalImpressions",
      "totalProfileViews",
      "totalSearches",
      "averageSessionTime",
    ],
  },
];

const labels = {
  totalUsers: "Total users",
  newUsersToday: "New today",
  dau: "DAU",
  wau: "WAU",
  mau: "MAU",
  totalPosts: "Posts",
  totalLearningPosts: "Learning",
  totalJourneys: "Journeys",
  totalJourneyMilestones: "Milestones",
  totalCommentsReplies: "Comments/replies",
  totalReposts: "Reposts",
  totalReports: "Reports",
  pendingReports: "Pending reports",
  suspendedUsers: "Suspended users",
  deletedUsers: "Deleted users",
  totalImpressions: "Impressions",
  totalProfileViews: "Profile views",
  totalSearches: "Searches",
  averageSessionTime: "Avg session",
};

function formatValue(key, value) {
  if (key === "averageSessionTime") {
    const seconds = Math.round((Number(value) || 0) / 1000);
    if (seconds < 60) return `${seconds}s`;
    return `${Math.round(seconds / 60)}m`;
  }
  return Number(value || 0).toLocaleString();
}

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    adminApi
      .get("/admin/dashboard")
      .then((res) => setMetrics(res.data.metrics))
      .catch((err) => setError(err.response?.data?.message || "Dashboard failed to load"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] bg-[#12141C] p-5 text-white">
        <p className="text-[12px] font-black uppercase tracking-[0.18em] text-white/60">Overview</p>
        <h2 className="mt-2 text-[24px] font-black sm:text-[28px]">IMCircle health</h2>
        <p className="mt-1 text-[13px] font-bold text-white/65">
          Live platform metrics from content, users, reports, and analytics events.
        </p>
      </section>

      {loading ? (
        <AdminLoading rows={4} />
      ) : error ? (
        <AdminError text={error} onRetry={load} />
      ) : !metrics ? (
        <AdminEmpty title="No metrics yet" text="Numbers will show up once people start using the app." />
      ) : (
        <div className="space-y-5">
          {groups.map((group) => (
            <div key={group.title}>
              <h3 className="mb-2.5 text-[12px] font-black uppercase tracking-[0.14em] text-[#667085]">
                {group.title}
              </h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {group.keys.map((key) => (
                  <MetricCard key={key} label={labels[key]} value={formatValue(key, metrics?.[key])} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
