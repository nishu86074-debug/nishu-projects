import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Menu as MenuIcon,
  X,
  Home,
  UserPlus,
  LogIn,
  LayoutDashboard,
  Users,
  BookOpen,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  CreditCard,
  BarChart3,
  Settings,
  Receipt,
  Library,
  IdCard,
  Bell,
  BookMarked,
  ChevronRight,
} from "lucide-react";

const menuSections = [
  {
    title: "Public",
    items: [
      {
        name: "Home",
        path: "/",
        icon: Home,
      },
      {
        name: "Student Register",
        path: "/student-register",
        icon: UserPlus,
      },
      {
        name: "Student Login",
        path: "/student-login",
        icon: LogIn,
      },
      {
        name: "Admin Login",
        path: "/admin-login",
        icon: LogIn,
      },
    ],
  },

  {
    title: "Student",
    items: [
      {
        name: "Student Dashboard",
        path: "/student-dashboard",
        icon: LayoutDashboard,
      },
      {
        name: "Student Books",
        path: "/student-books",
        icon: BookOpen,
      },
      {
        name: "My Books",
        path: "/my-books",
        icon: BookMarked,
      },
      {
        name: "Library Card",
        path: "/library-card",
        icon: IdCard,
      },
      {
        name: "Notifications",
        path: "/notifications",
        icon: Bell,
      },
      {
        name: "My Receipts",
        path: "/my-receipts",
        icon: Receipt,
      },
    ],
  },

  {
    title: "Librarian",
    items: [
      {
        name: "Admin Dashboard",
        path: "/admin-dashboard",
        icon: LayoutDashboard,
      },
      {
        name: "Student Management",
        path: "/student-management",
        icon: Users,
      },
      {
        name: "Add Student",
        path: "/add-student",
        icon: UserPlus,
      },
      {
        name: "Books",
        path: "/books",
        icon: Library,
      },
      {
        name: "Add Book",
        path: "/add-book",
        icon: Plus,
      },
      {
        name: "Issue Book",
        path: "/book-issue",
        icon: ArrowUpRight,
      },
      {
        name: "Return Book",
        path: "/return-book",
        icon: ArrowDownLeft,
      },
      {
        name: "Fine Management",
        path: "/fine-management",
        icon: CreditCard,
      },
      {
        name: "Reports",
        path: "/reports",
        icon: BarChart3,
      },
      {
        name: "Library Settings",
        path: "/library-settings",
        icon: Settings,
      },
    ],
  },
];

const Menu = () => {
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);

  const handleNavigate = (path) => {
    navigate(path);
    setOpen(false);
  };

  return (
    <>
      {/* ================= MENU BUTTON ================= */}

      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed top-5 right-5 z-[9999] flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 font-semibold text-white shadow-2xl transition hover:bg-slate-800 active:scale-95"
        >
          <MenuIcon size={20} />

          <span>Menu</span>
        </button>
      )}

      {/* ================= MENU OVERLAY ================= */}

      {open && (
        <div className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-sm">
          <div className="absolute bottom-0 right-0 h-full w-full overflow-y-auto bg-white shadow-2xl sm:w-[420px]">
            {/* ================= HEADER ================= */}

            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
                  <MenuIcon size={20} />
                </div>

                <div>
                  <h2 className="font-bold text-slate-800">Menu</h2>

                  <p className="text-xs text-slate-500">
                    Library Management System
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
              >
                <X size={22} />
              </button>
            </div>

            {/* ================= MENU CONTENT ================= */}

            <div className="space-y-6 p-5">
              {menuSections.map((section) => (
                <div key={section.title}>
                  <p className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-slate-400">
                    {section.title}
                  </p>

                  <div className="space-y-1.5">
                    {section.items.map((item) => {
                      const Icon = item.icon;

                      return (
                        <button
                          type="button"
                          key={item.path}
                          onClick={() => handleNavigate(item.path)}
                          className="group flex w-full items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-left transition hover:border-indigo-200 hover:bg-indigo-50"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm transition group-hover:bg-indigo-600 group-hover:text-white">
                              <Icon size={18} />
                            </div>

                            <span className="text-sm font-semibold text-slate-700 group-hover:text-indigo-700">
                              {item.name}
                            </span>
                          </div>

                          <ChevronRight
                            size={18}
                            className="text-slate-400 transition group-hover:translate-x-1 group-hover:text-indigo-600"
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* ================= FOOTER ================= */}

            <div className="border-t border-slate-200 bg-slate-50 p-5">
              <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
                <p className="text-sm font-semibold text-indigo-800">
                  Smart Library Management
                </p>

                <p className="mt-1 text-xs leading-5 text-indigo-600">
                  Use this menu to quickly navigate between public, student and
                  librarian sections.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Menu;
