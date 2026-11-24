import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  ArrowLeft,
  Bell,
  BellRing,
  BookOpen,
  Check,
  CheckCheck,
  Clock3,
  Info,
  Library,
  Mail,
  RefreshCw,
  Trash2,
  AlertCircle,
  X,
} from "lucide-react";

import {
  getNotificationsByStudent,
  markNotificationAsReadInFirestore,
  deleteNotificationFromFirestore,
  deleteReadNotificationsFromFirestore,
} from "../../firebase/notificationService";

// =====================================================
// DEFAULT SETTINGS
// =====================================================

const DEFAULT_LIBRARY_SETTINGS = {
  institutionName: "My College / University",
  libraryName: "Central Library",
  libraryEmail: "library@example.com",
  librarianName: "Library Administrator",
  finePerDay: 10,
  maxBooks: 3,
  issueDuration: 14,
  logo: "",
};

// =====================================================
// SETTINGS
// =====================================================

const getLibrarySettings = () => {
  try {
    const saved = JSON.parse(localStorage.getItem("librarySettings") || "null");

    if (!saved) {
      return DEFAULT_LIBRARY_SETTINGS;
    }

    return {
      ...DEFAULT_LIBRARY_SETTINGS,
      ...saved,
      finePerDay:
        Number(saved.finePerDay) >= 0
          ? Number(saved.finePerDay)
          : DEFAULT_LIBRARY_SETTINGS.finePerDay,
      maxBooks:
        Number(saved.maxBooks) > 0
          ? Number(saved.maxBooks)
          : DEFAULT_LIBRARY_SETTINGS.maxBooks,
      issueDuration:
        Number(saved.issueDuration) > 0
          ? Number(saved.issueDuration)
          : DEFAULT_LIBRARY_SETTINGS.issueDuration,
    };
  } catch {
    return DEFAULT_LIBRARY_SETTINGS;
  }
};

// =====================================================
// STUDENT
// =====================================================

const getStudentUser = () => {
  try {
    return JSON.parse(localStorage.getItem("studentUser") || "null");
  } catch {
    return null;
  }
};

// =====================================================
// LOCAL NOTIFICATIONS
// =====================================================

const getNotifications = () => {
  try {
    const saved = JSON.parse(localStorage.getItem("notifications") || "[]");

    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
};

// =====================================================
// HELPERS
// =====================================================

const getStudentId = (student) => {
  return String(
    student?.libraryId ||
      student?.studentLibraryId ||
      student?.studentId ||
      student?.id ||
      "",
  )
    .trim()
    .toLowerCase();
};

const getNotificationStudentId = (notification) => {
  return String(
    notification?.studentLibraryId ||
      notification?.studentId ||
      notification?.libraryId ||
      notification?.student?.libraryId ||
      "",
  )
    .trim()
    .toLowerCase();
};

const getNotificationId = (notification, index = 0) => {
  return (
    notification?.notificationId ||
    notification?.firestoreId ||
    notification?.id ||
    `notification-${index}`
  );
};

const getFirestoreNotificationId = (notification) => {
  return String(
    notification?.firestoreId || notification?.firebaseId || "",
  ).trim();
};

const isNotificationRead = (notification) => {
  return notification?.read === true || notification?.isRead === true;
};

const getNotificationDate = (notification) => {
  return (
    notification?.createdAt ||
    notification?.date ||
    notification?.timestamp ||
    ""
  );
};

const formatDate = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatTime = (value) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

// =====================================================
// NOTIFICATION TYPE
// =====================================================

const getNotificationType = (notification) => {
  const type = String(
    notification?.type || notification?.notificationType || "",
  ).toLowerCase();

  const title = String(notification?.title || "").toLowerCase();

  const message = String(
    notification?.message || notification?.description || "",
  ).toLowerCase();

  const text = `${type} ${title} ${message}`;

  if (text.includes("return") || text.includes("returned")) {
    return "return";
  }

  if (
    text.includes("fine") ||
    text.includes("overdue") ||
    text.includes("late")
  ) {
    return "fine";
  }

  if (
    text.includes("issue") ||
    text.includes("issued") ||
    text.includes("borrow")
  ) {
    return "issue";
  }

  if (text.includes("due") || text.includes("reminder")) {
    return "reminder";
  }

  return "general";
};

// =====================================================
// ICON
// =====================================================

const NotificationIcon = ({ type }) => {
  if (type === "issue") {
    return (
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-100">
        <BookOpen className="h-5 w-5 text-blue-600" />
      </div>
    );
  }

  if (type === "return") {
    return (
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100">
        <CheckCheck className="h-5 w-5 text-emerald-600" />
      </div>
    );
  }

  if (type === "fine") {
    return (
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-100">
        <AlertCircle className="h-5 w-5 text-red-600" />
      </div>
    );
  }

  if (type === "reminder") {
    return (
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-100">
        <Clock3 className="h-5 w-5 text-orange-600" />
      </div>
    );
  }

  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-100">
      <Info className="h-5 w-5 text-indigo-600" />
    </div>
  );
};

// =====================================================
// MERGE KEY
// =====================================================

const getNotificationKey = (notification) => {
  const firestoreId = getFirestoreNotificationId(notification);

  if (firestoreId) {
    return `firebase-${firestoreId}`;
  }

  const notificationId = String(
    notification?.notificationId || notification?.id || "",
  ).trim();

  if (notificationId) {
    return `notification-${notificationId}`;
  }

  return [
    getNotificationStudentId(notification),
    notification?.type || "",
    notification?.title || "",
    notification?.message || "",
    notification?.createdAt || "",
  ]
    .join("-")
    .toLowerCase();
};

// =====================================================
// COMPONENT
// =====================================================

const Notifications = () => {
  const navigate = useNavigate();

  const [settings, setSettings] = useState(getLibrarySettings);

  const [notifications, setNotifications] = useState(getNotifications);

  const [firebaseNotifications, setFirebaseNotifications] = useState([]);

  const [filter, setFilter] = useState("all");

  const [selectedNotification, setSelectedNotification] = useState(null);

  const [loadingFirebase, setLoadingFirebase] = useState(false);

  // ===================================================
  // STUDENT
  // ===================================================

  const student = getStudentUser();

  const currentStudentId = getStudentId(student);

  // ===================================================
  // AUTH
  // ===================================================

  useEffect(() => {
    if (!student) {
      navigate("/student-login", {
        replace: true,
      });
    }
  }, [student, navigate]);

  // ===================================================
  // FIREBASE LOAD
  // ===================================================

  const loadFirebaseNotifications = useCallback(async () => {
    if (!currentStudentId) {
      return;
    }

    try {
      const data = await getNotificationsByStudent(currentStudentId);

      setFirebaseNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Firebase notifications error:", error);

      setFirebaseNotifications([]);
    }
  }, [currentStudentId]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!currentStudentId) {
        return;
      }

      try {
        const data = await getNotificationsByStudent(currentStudentId);

        if (cancelled) {
          return;
        }

        setFirebaseNotifications(Array.isArray(data) ? data : []);
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error("Firebase notifications error:", error);

        setFirebaseNotifications([]);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [currentStudentId]);

  // ===================================================
  // LOCAL STORAGE EVENTS
  // ===================================================

  useEffect(() => {
    const handleUpdate = () => {
      setSettings(getLibrarySettings());
      setNotifications(getNotifications());

      void loadFirebaseNotifications();
    };

    window.addEventListener("storage", handleUpdate);

    window.addEventListener("libraryDataUpdated", handleUpdate);

    window.addEventListener("librarySettingsUpdated", handleUpdate);

    return () => {
      window.removeEventListener("storage", handleUpdate);

      window.removeEventListener("libraryDataUpdated", handleUpdate);

      window.removeEventListener("librarySettingsUpdated", handleUpdate);
    };
  }, [loadFirebaseNotifications]);

  // ===================================================
  // MERGE LOCAL + FIREBASE
  // ===================================================

  const allNotifications = useMemo(() => {
    const localData = Array.isArray(notifications) ? notifications : [];

    const firebaseData = Array.isArray(firebaseNotifications)
      ? firebaseNotifications
      : [];

    const mergedMap = new Map();

    localData.forEach((notification) => {
      const key = getNotificationKey(notification);

      if (key) {
        mergedMap.set(key, {
          ...notification,
        });
      }
    });

    firebaseData.forEach((notification) => {
      const key = getNotificationKey(notification);

      if (!key) {
        return;
      }

      const existing = mergedMap.get(key);

      mergedMap.set(key, {
        ...(existing || {}),
        ...notification,
      });
    });

    return Array.from(mergedMap.values());
  }, [notifications, firebaseNotifications]);

  // ===================================================
  // STUDENT NOTIFICATIONS
  // ===================================================

  const studentNotifications = useMemo(() => {
    return allNotifications
      .map((notification, index) => ({
        ...notification,
        _notificationId: getNotificationId(notification, index),
      }))
      .filter((notification) => {
        const notificationStudentId = getNotificationStudentId(notification);

        return currentStudentId && notificationStudentId === currentStudentId;
      })
      .sort((a, b) => {
        const dateA = new Date(getNotificationDate(a)).getTime();

        const dateB = new Date(getNotificationDate(b)).getTime();

        return (
          (Number.isNaN(dateB) ? 0 : dateB) - (Number.isNaN(dateA) ? 0 : dateA)
        );
      });
  }, [allNotifications, currentStudentId]);

  // ===================================================
  // STATS
  // ===================================================

  const totalNotifications = studentNotifications.length;

  const unreadNotifications = studentNotifications.filter(
    (notification) => !isNotificationRead(notification),
  ).length;

  const readNotifications = totalNotifications - unreadNotifications;

  // ===================================================
  // FILTER
  // ===================================================

  const filteredNotifications = useMemo(() => {
    if (filter === "unread") {
      return studentNotifications.filter(
        (notification) => !isNotificationRead(notification),
      );
    }

    if (filter === "read") {
      return studentNotifications.filter((notification) =>
        isNotificationRead(notification),
      );
    }

    return studentNotifications;
  }, [studentNotifications, filter]);

  // ===================================================
  // SAVE LOCAL
  // ===================================================

  const saveNotifications = useCallback((updatedNotifications) => {
    localStorage.setItem("notifications", JSON.stringify(updatedNotifications));

    setNotifications(updatedNotifications);

    window.dispatchEvent(new Event("libraryDataUpdated"));
  }, []);

  // ===================================================
  // MARK ONE READ
  // ===================================================

  const markAsRead = async (notificationId) => {
    const target = studentNotifications.find(
      (notification) =>
        String(notification._notificationId) === String(notificationId),
    );

    if (!target) {
      return;
    }

    const firestoreId = getFirestoreNotificationId(target);

    try {
      if (firestoreId) {
        await markNotificationAsReadInFirestore(firestoreId);
      }
    } catch (error) {
      console.error("Firebase mark as read error:", error);

      return;
    }

    const updatedNotifications = notifications.map((notification, index) => {
      const id = getNotificationId(notification, index);

      if (String(id) !== String(notificationId)) {
        return notification;
      }

      return {
        ...notification,
        read: true,
        isRead: true,
        readAt: notification?.readAt || new Date().toISOString(),
      };
    });

    saveNotifications(updatedNotifications);

    setFirebaseNotifications((current) =>
      current.map((notification) => {
        const id = getFirestoreNotificationId(notification);

        if (id && id === firestoreId) {
          return {
            ...notification,
            read: true,
            isRead: true,
          };
        }

        return notification;
      }),
    );
  };

  // ===================================================
  // MARK ALL READ
  // ===================================================

  const markAllAsRead = async () => {
    const unreadFirebase = firebaseNotifications.filter(
      (notification) =>
        getNotificationStudentId(notification) === currentStudentId &&
        !isNotificationRead(notification) &&
        getFirestoreNotificationId(notification),
    );

    try {
      await Promise.all(
        unreadFirebase.map((notification) =>
          markNotificationAsReadInFirestore(
            getFirestoreNotificationId(notification),
          ),
        ),
      );
    } catch (error) {
      console.error("Firebase mark all read error:", error);

      return;
    }

    const now = new Date().toISOString();

    const updatedNotifications = notifications.map((notification) => {
      if (getNotificationStudentId(notification) !== currentStudentId) {
        return notification;
      }

      return {
        ...notification,
        read: true,
        isRead: true,
        readAt: notification?.readAt || now,
      };
    });

    saveNotifications(updatedNotifications);

    setFirebaseNotifications((current) =>
      current.map((notification) => {
        if (getNotificationStudentId(notification) !== currentStudentId) {
          return notification;
        }

        return {
          ...notification,
          read: true,
          isRead: true,
        };
      }),
    );
  };

  // ===================================================
  // DELETE ONE
  // ===================================================

  const deleteNotification = async (notificationId) => {
    const target = studentNotifications.find(
      (notification) =>
        String(notification._notificationId) === String(notificationId),
    );

    if (!target) {
      return;
    }

    const firestoreId = getFirestoreNotificationId(target);

    try {
      if (firestoreId) {
        await deleteNotificationFromFirestore(firestoreId);
      }
    } catch (error) {
      console.error("Firebase delete notification error:", error);

      return;
    }

    const updatedNotifications = notifications.filter((notification, index) => {
      const id = getNotificationId(notification, index);

      const belongsToStudent =
        getNotificationStudentId(notification) === currentStudentId;

      return !(belongsToStudent && String(id) === String(notificationId));
    });

    saveNotifications(updatedNotifications);

    setFirebaseNotifications((current) =>
      current.filter(
        (notification) =>
          getFirestoreNotificationId(notification) !== firestoreId,
      ),
    );

    if (
      selectedNotification &&
      String(selectedNotification._notificationId) === String(notificationId)
    ) {
      setSelectedNotification(null);
    }
  };

  // ===================================================
  // CLEAR READ
  // ===================================================

  const clearReadNotifications = async () => {
    if (!currentStudentId) {
      return;
    }

    try {
      await deleteReadNotificationsFromFirestore(currentStudentId);
    } catch (error) {
      console.error("Firebase clear read notifications error:", error);

      return;
    }

    const updatedNotifications = notifications.filter((notification) => {
      const belongsToStudent =
        getNotificationStudentId(notification) === currentStudentId;

      const read = isNotificationRead(notification);

      return !(belongsToStudent && read);
    });

    saveNotifications(updatedNotifications);

    setFirebaseNotifications((current) =>
      current.filter((notification) => {
        const belongsToStudent =
          getNotificationStudentId(notification) === currentStudentId;

        return !(belongsToStudent && isNotificationRead(notification));
      }),
    );

    setSelectedNotification(null);
  };

  // ===================================================
  // OPEN
  // ===================================================

  const openNotification = async (notification) => {
    const id = notification._notificationId;

    if (!isNotificationRead(notification)) {
      await markAsRead(id);
    }

    setSelectedNotification({
      ...notification,
      read: true,
      isRead: true,
    });
  };

  // ===================================================
  // REFRESH
  // ===================================================

  const refreshNotifications = async () => {
    setLoadingFirebase(true);

    setSettings(getLibrarySettings());
    setNotifications(getNotifications());

    try {
      await loadFirebaseNotifications();
    } finally {
      setLoadingFirebase(false);
    }
  };

  // ===================================================
  // EMPTY STATE
  // ===================================================

  const renderEmptyState = () => {
    let title = "No notifications";

    let message = "You don't have any notifications right now.";

    if (filter === "unread") {
      title = "No unread notifications";

      message = "You're all caught up. There are no unread notifications.";
    }

    if (filter === "read") {
      title = "No read notifications";

      message = "You don't have any read notifications yet.";
    }

    return (
      <div className="rounded-3xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
          <Bell className="h-8 w-8 text-slate-400" />
        </div>

        <h3 className="mt-5 text-xl font-black text-slate-900">{title}</h3>

        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
          {message}
        </p>

        <Link
          to="/student-dashboard"
          className="mt-6 inline-flex rounded-xl bg-indigo-600 px-5 py-3 text-sm font-black text-white hover:bg-indigo-700"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  };

  if (!student) {
    return null;
  }

  // ===================================================
  // RENDER
  // ===================================================

  return (
    <div className="min-h-screen bg-slate-100">
      {/* HEADER */}

      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/student-dashboard")}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100">
              <Bell className="h-5 w-5 text-indigo-600" />
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-lg font-black text-slate-900">
                Notifications
              </h1>

              <p className="hidden truncate text-xs font-medium text-slate-500 sm:block">
                {settings.libraryName}
              </p>
            </div>
          </div>

          <Link
            to="/student-dashboard"
            className="hidden rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-black text-white hover:bg-indigo-700 sm:block"
          >
            Dashboard
          </Link>
        </div>
      </header>

      {/* MAIN */}

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* HERO */}

        <section className="overflow-hidden rounded-3xl bg-slate-900 p-6 text-white shadow-sm sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10">
                <BellRing className="h-7 w-7 text-indigo-300" />
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-300">
                  Library Updates
                </p>

                <h2 className="mt-2 text-2xl font-black sm:text-3xl">
                  Stay up to date
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                  Get updates about book issues, returns, due dates, fines and
                  important library information.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <div className="rounded-2xl bg-white/10 px-4 py-3 text-center">
                <p className="text-xl font-black">{totalNotifications}</p>

                <p className="mt-1 text-[10px] font-bold text-slate-300">
                  Total
                </p>
              </div>

              <div className="rounded-2xl bg-white/10 px-4 py-3 text-center">
                <p className="text-xl font-black text-orange-300">
                  {unreadNotifications}
                </p>

                <p className="mt-1 text-[10px] font-bold text-slate-300">
                  Unread
                </p>
              </div>

              <div className="rounded-2xl bg-white/10 px-4 py-3 text-center">
                <p className="text-xl font-black text-emerald-300">
                  {readNotifications}
                </p>

                <p className="mt-1 text-[10px] font-bold text-slate-300">
                  Read
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FILTERS */}

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {[
                ["all", `All (${totalNotifications})`],
                ["unread", `Unread (${unreadNotifications})`],
                ["read", `Read (${readNotifications})`],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  className={`rounded-xl px-4 py-2.5 text-xs font-black ${
                    filter === value
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              {unreadNotifications > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 hover:bg-slate-50"
                >
                  <CheckCheck className="h-4 w-4" />
                  Mark all read
                </button>
              )}

              {readNotifications > 0 && (
                <button
                  type="button"
                  onClick={clearReadNotifications}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-xs font-black text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear read
                </button>
              )}

              <button
                type="button"
                onClick={refreshNotifications}
                disabled={loadingFirebase}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw
                  className={`h-4 w-4 ${loadingFirebase ? "animate-spin" : ""}`}
                />

                {loadingFirebase ? "Loading..." : "Refresh"}
              </button>
            </div>
          </div>
        </section>

        {/* NOTIFICATIONS */}

        <section className="mt-6">
          {filteredNotifications.length === 0 ? (
            renderEmptyState()
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((notification) => {
                const id = notification._notificationId;

                const isRead = isNotificationRead(notification);

                const type = getNotificationType(notification);

                const title = notification?.title || "Library Notification";

                const message =
                  notification?.message ||
                  notification?.description ||
                  "You have a new library notification.";

                const createdAt = getNotificationDate(notification);

                return (
                  <article
                    key={String(id)}
                    className={`rounded-3xl border bg-white p-4 shadow-sm transition hover:shadow-md sm:p-5 ${
                      isRead
                        ? "border-slate-200"
                        : "border-indigo-200 bg-indigo-50/30"
                    }`}
                  >
                    <div className="flex items-start gap-3 sm:gap-4">
                      <NotificationIcon type={type} />

                      <button
                        type="button"
                        onClick={() => openNotification(notification)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3
                                className={`text-sm sm:text-base ${
                                  isRead
                                    ? "font-bold text-slate-800"
                                    : "font-black text-slate-900"
                                }`}
                              >
                                {title}
                              </h3>

                              {!isRead && (
                                <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[9px] font-black uppercase text-white">
                                  New
                                </span>
                              )}
                            </div>

                            <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">
                              {message}
                            </p>
                          </div>

                          <div className="shrink-0 text-left sm:text-right">
                            <p className="text-[11px] font-bold text-slate-400">
                              {formatDate(createdAt)}
                            </p>

                            <p className="mt-0.5 text-[10px] text-slate-400">
                              {formatTime(createdAt)}
                            </p>
                          </div>
                        </div>
                      </button>

                      <div className="flex shrink-0 flex-col gap-2">
                        {!isRead && (
                          <button
                            type="button"
                            onClick={() => markAsRead(id)}
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-emerald-50 hover:text-emerald-600"
                            title="Mark as read"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => deleteNotification(id)}
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 hover:bg-red-50 hover:text-red-600"
                          title="Delete notification"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* LIBRARY INFO */}

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="p-6 sm:p-8">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-100">
                  <Library className="h-6 w-6 text-indigo-600" />
                </div>

                <div>
                  <h3 className="font-black text-slate-900">
                    {settings.libraryName}
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    {settings.institutionName}
                  </p>

                  <p className="mt-2 text-xs text-slate-400">
                    Librarian:{" "}
                    <span className="font-bold text-slate-600">
                      {settings.librarianName}
                    </span>
                  </p>
                </div>
              </div>

              <a
                href={`mailto:${settings.libraryEmail}`}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-black text-white hover:bg-slate-800"
              >
                <Mail className="h-4 w-4" />
                Contact Library
              </a>
            </div>
          </div>
        </section>

        {/* FOOTER */}

        <footer className="py-8 text-center">
          <p className="text-xs font-semibold text-slate-400">
            {settings.institutionName} • {settings.libraryName}
          </p>

          <p className="mt-1 text-[11px] text-slate-400">
            Smart Library Management System
          </p>
        </footer>
      </main>

      {/* DETAIL MODAL */}

      {selectedNotification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-5">
              <div className="flex items-center gap-3">
                <NotificationIcon
                  type={getNotificationType(selectedNotification)}
                />

                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-indigo-600">
                    Notification
                  </p>

                  <h3 className="font-black text-slate-900">Details</h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedNotification(null)}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              <h2 className="text-xl font-black text-slate-900">
                {selectedNotification?.title || "Library Notification"}
              </h2>

              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                {selectedNotification?.message ||
                  selectedNotification?.description ||
                  "No additional details available."}
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                    Date
                  </p>

                  <p className="mt-1 text-sm font-black text-slate-800">
                    {formatDate(getNotificationDate(selectedNotification))}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                    Time
                  </p>

                  <p className="mt-1 text-sm font-black text-slate-800">
                    {formatTime(getNotificationDate(selectedNotification)) ||
                      "—"}
                  </p>
                </div>
              </div>

              {selectedNotification?.bookTitle && (
                <div className="mt-3 rounded-2xl bg-slate-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                    Book
                  </p>

                  <p className="mt-1 text-sm font-black text-slate-800">
                    {selectedNotification.bookTitle}
                  </p>
                </div>
              )}

              {selectedNotification?.dueDate && (
                <div className="mt-3 rounded-2xl bg-orange-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-wide text-orange-500">
                    Due Date
                  </p>

                  <p className="mt-1 text-sm font-black text-orange-700">
                    {formatDate(selectedNotification.dueDate)}
                  </p>
                </div>
              )}

              {selectedNotification?.fine !== undefined &&
                selectedNotification?.fine !== null && (
                  <div className="mt-3 rounded-2xl bg-red-50 p-4">
                    <p className="text-[10px] font-black uppercase tracking-wide text-red-500">
                      Fine
                    </p>

                    <p className="mt-1 text-sm font-black text-red-700">
                      ₹
                      {Number(selectedNotification.fine || 0).toLocaleString(
                        "en-IN",
                      )}
                    </p>
                  </div>
                )}

              <button
                type="button"
                onClick={() => setSelectedNotification(null)}
                className="mt-6 w-full rounded-xl bg-indigo-600 px-5 py-3 text-sm font-black text-white hover:bg-indigo-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;
