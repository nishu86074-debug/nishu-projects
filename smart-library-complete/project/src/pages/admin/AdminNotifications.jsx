import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, Bell, CheckCheck, Search, Trash2 } from "lucide-react";

import {
  deleteNotificationFromFirestore,
  getNotificationsFromFirestore,
  markNotificationAsReadInFirestore,
} from "../../firebase/notificationService";

const formatDate = (value) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleString();
};

const AdminNotifications = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!localStorage.getItem("librarian")) navigate("/admin-login");
  }, [navigate]);

  useEffect(() => {
    (async () => {
      try {
        const data = await getNotificationsFromFirestore();
        data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setItems(data);
      } catch {
        toast.error("Failed to load notifications");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const isRead = (n) => n.read === true || n.isRead === true;

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((n) => {
      if (filter === "unread" && isRead(n)) return false;
      if (filter === "read" && !isRead(n)) return false;
      if (!q) return true;
      return [n.title, n.message, n.studentName, n.studentId]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [items, filter, search]);

  const markRead = async (n) => {
    try {
      if (n.firestoreId) await markNotificationAsReadInFirestore(n.firestoreId);
      setItems((p) =>
        p.map((x) => (x.id === n.id ? { ...x, read: true, isRead: true } : x)),
      );
    } catch {
      toast.error("Could not update notification");
    }
  };

  const markAllRead = async () => {
    const unread = items.filter((n) => !isRead(n));
    await Promise.all(unread.map(markRead));
    toast.success("All notifications marked as read");
  };

  const remove = async (n) => {
    if (!window.confirm("Delete this notification?")) return;
    try {
      if (n.firestoreId) await deleteNotificationFromFirestore(n.firestoreId);
      setItems((p) => p.filter((x) => x.id !== n.id));
      toast.success("Notification deleted");
    } catch {
      toast.error("Could not delete notification");
    }
  };

  const unreadCount = items.filter((n) => !isRead(n)).length;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-5xl">
        <button
          onClick={() => navigate("/admin-dashboard")}
          className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-600"
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </button>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
              <Bell className="text-blue-600" /> Notifications
            </h1>
            <p className="text-sm text-slate-500">
              All library activity: issues, returns, fines and reminders.
            </p>
          </div>
          <button
            onClick={markAllRead}
            disabled={!unreadCount}
            className="flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-600 disabled:opacity-40"
          >
            <CheckCheck size={16} /> Mark All as Read
          </button>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          {[
            ["all", `All (${items.length})`],
            ["unread", `Unread (${unreadCount})`],
            ["read", `Read (${items.length - unreadCount})`],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                filter === key
                  ? "bg-blue-600 text-white"
                  : "bg-white text-slate-600 border border-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
            <Search size={16} className="text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notifications"
              className="w-48 text-sm outline-none"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {loading ? (
            <p className="p-8 text-center text-slate-500">Loading...</p>
          ) : visible.length === 0 ? (
            <p className="p-8 text-center text-slate-500">
              No notifications found.
            </p>
          ) : (
            visible.map((n) => (
              <div
                key={n.id}
                className="flex items-start gap-4 border-b border-slate-100 p-4 last:border-0"
              >
                <span
                  className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${
                    isRead(n) ? "bg-slate-300" : "bg-blue-600"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900">
                    {n.title || "Notification"}
                  </p>
                  <p className="text-sm text-slate-600">{n.message}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {n.studentName ? `${n.studentName} · ` : ""}
                    {formatDate(n.createdAt)}
                  </p>
                </div>
                {!isRead(n) && (
                  <button
                    onClick={() => markRead(n)}
                    className="text-xs font-semibold text-blue-600"
                  >
                    Mark read
                  </button>
                )}
                <button
                  onClick={() => remove(n)}
                  className="text-red-500 hover:text-red-700"
                  aria-label="Delete notification"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminNotifications;
