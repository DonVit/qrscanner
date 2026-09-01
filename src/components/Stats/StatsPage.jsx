import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Users, ReceiptText, CheckCircle2 } from "lucide-react";
import { selectTotalScans, selectUniqueScans } from "../../selectors/receptsSelectors";

function resolveStatsUrl() {
  const explicitStatsUrl = import.meta.env.VITE_STATS_URL;
  if (explicitStatsUrl) {
    return explicitStatsUrl;
  }

  const apiUrl = import.meta.env.VITE_API_URL;
  if (!apiUrl) {
    return "/api/stats";
  }

  if (/\/api\/receipts\/?$/i.test(apiUrl)) {
    return apiUrl.replace(/\/api\/receipts\/?$/i, "/api/stats");
  }

  if (/\/receipts\/?$/i.test(apiUrl)) {
    return apiUrl.replace(/\/receipts\/?$/i, "/stats");
  }

  if (/\/api\/?$/i.test(apiUrl)) {
    return apiUrl.replace(/\/api\/?$/i, "/api/stats");
  }

  return `${apiUrl.replace(/\/+$/, "")}/stats`;
}

const STATS_URL = resolveStatsUrl();

function StatCard({ title, value, icon: Icon, accent }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300">{title}</h3>
        <div className={`rounded-full p-2 ${accent}`}>
          <Icon size={18} />
        </div>
      </div>
      <div className="text-3xl font-semibold text-gray-900 dark:text-white">{value}</div>
    </div>
  );
}

export default function StatsPage() {
  const auth = useSelector((state) => state.auth);
  const totalScans = useSelector(selectTotalScans);
  const uniqueScans = useSelector(selectUniqueScans);
  const [stats, setStats] = useState({ users: 0, uploadedReceipts: 0, totalReceipts: 0, userBreakdown: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadStats() {
      try {
        const response = await fetch(STATS_URL, {
          headers: auth?.token ? { Authorization: `Bearer ${auth.token}` } : {},
        });
        if (!response.ok) {
          throw new Error("Unable to load statistics");
        }

        const payload = await response.json();
        if (!active) return;

        setStats({
          users: Number(payload.users ?? 0),
          uploadedReceipts: Number(payload.uploadedReceipts ?? 0),
          totalReceipts: Number(payload.totalReceipts ?? 0),
          userBreakdown: Array.isArray(payload.userBreakdown) ? payload.userBreakdown : [],
        });
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load statistics");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadStats();
    return () => {
      active = false;
    };
  }, [auth?.token]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-gradient-to-r from-red-50 to-white p-6 shadow-sm dark:border-gray-700 dark:from-gray-800 dark:to-gray-900">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Statistics</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          Overview of active users and receipt sync progress.
        </p>
      </div>

      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
          Loading statistics...
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200">
          {error}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-5">
            <StatCard
              title="Total scans (device)"
              value={totalScans}
              icon={ReceiptText}
              accent="bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200"
            />
            <StatCard
              title="Unique URLs (device)"
              value={uniqueScans}
              icon={ReceiptText}
              accent="bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-200"
            />
            <StatCard
              title="Users"
              value={stats.users}
              icon={Users}
              accent="bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-200"
            />
            <StatCard
              title="Uploaded receipts"
              value={stats.uploadedReceipts}
              icon={CheckCircle2}
              accent="bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-200"
            />
            <StatCard
              title="Total receipts"
              value={stats.totalReceipts}
              icon={ReceiptText}
              accent="bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-200"
            />
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Users</h3>
              <span className="text-sm text-gray-500 dark:text-gray-400">Receipts</span>
            </div>
            {stats.userBreakdown.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No users yet.</p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-200">User</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-200">Receipts</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                    {stats.userBreakdown.map((entry) => (
                      <tr key={entry.username}>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">{entry.username}</td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">{entry.receiptCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
