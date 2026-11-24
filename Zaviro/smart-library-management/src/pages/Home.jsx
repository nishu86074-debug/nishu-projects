import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  CalendarCheck,
  Library,
  QrCode,
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react";

const DEFAULT_SETTINGS = {
  institutionName: "My College / University",
  libraryName: "Central Library",
  libraryEmail: "library@example.com",
  librarianName: "Library Administrator",
  finePerDay: 10,
  maxBooks: 3,
  issueDuration: 14,
  logo: "",
};

const getSettings = () => {
  try {
    const saved = JSON.parse(localStorage.getItem("librarySettings") || "{}");

    return {
      ...DEFAULT_SETTINGS,
      ...saved,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
};

const Home = () => {
  const [settings, setSettings] = useState(getSettings);

  useEffect(() => {
    const loadSettings = () => {
      setSettings(getSettings());
    };

    loadSettings();

    window.addEventListener("storage", loadSettings);
    window.addEventListener("librarySettingsUpdated", loadSettings);
    window.addEventListener("libraryDataUpdated", loadSettings);

    return () => {
      window.removeEventListener("storage", loadSettings);
      window.removeEventListener("librarySettingsUpdated", loadSettings);
      window.removeEventListener("libraryDataUpdated", loadSettings);
    };
  }, []);

  const features = [
    {
      icon: BookOpen,
      title: "Book Management",
      description:
        "Manage books, categories, availability and library inventory from one place.",
    },
    {
      icon: QrCode,
      title: "QR Based Access",
      description:
        "Use the student's digital library QR code for quick and convenient identification.",
    },
    {
      icon: CalendarCheck,
      title: "Issue & Return",
      description:
        "Keep track of issue dates, due dates, returns and overdue records.",
    },
    {
      icon: ShieldCheck,
      title: "Fine Management",
      description:
        "Automatically calculate overdue fines according to the library rules.",
    },
  ];

  const steps = [
    {
      number: "01",
      title: "Register",
      description:
        "Create a student account and receive a unique Digital Library ID.",
    },
    {
      number: "02",
      title: "Find a Book",
      description: "Search the library collection and check available books.",
    },
    {
      number: "03",
      title: "Get It Issued",
      description:
        "The librarian verifies the student and completes the issue process.",
    },
    {
      number: "04",
      title: "Track Everything",
      description:
        "View issued books, receipts, due dates, notifications and fines.",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* ================= HERO ================= */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-700">
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-violet-300/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:px-10 lg:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* LEFT */}
            <div className="text-white">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur-sm">
                <Library size={16} />
                Smart Library Management
              </div>

              <h1 className="max-w-3xl text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl">
                Welcome to{" "}
                <span className="text-indigo-100">{settings.libraryName}</span>
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-7 text-indigo-100 sm:text-lg">
                A modern digital library management system designed to make book
                management, student access, issue and return tracking simple and
                efficient.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/student-login"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-indigo-700 shadow-lg transition hover:bg-indigo-50"
                >
                  Student Login
                  <ArrowRight size={18} />
                </Link>

                <Link
                  to="/student-register"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-6 py-3.5 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/20"
                >
                  Create Library Account
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-indigo-100">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={17} />
                  Secure access
                </div>

                <div className="flex items-center gap-2">
                  <QrCode size={17} />
                  QR enabled
                </div>

                <div className="flex items-center gap-2">
                  <BookOpen size={17} />
                  Digital records
                </div>
              </div>
            </div>

            {/* RIGHT CARD */}
            <div className="lg:justify-self-end">
              <div className="relative mx-auto max-w-md rounded-3xl border border-white/20 bg-white/10 p-4 shadow-2xl backdrop-blur-xl">
                <div className="rounded-2xl bg-white p-7">
                  <div className="flex items-center gap-4">
                    {settings.logo ? (
                      <img
                        src={settings.logo}
                        alt={`${settings.libraryName} logo`}
                        className="h-16 w-16 rounded-2xl border border-slate-200 object-contain p-2"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
                        <Library size={32} />
                      </div>
                    )}

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        {settings.institutionName}
                      </p>

                      <h2 className="mt-1 text-xl font-bold text-slate-900">
                        {settings.libraryName}
                      </h2>
                    </div>
                  </div>

                  <div className="mt-7 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-indigo-50 p-4">
                      <BookOpen className="text-indigo-600" size={22} />

                      <p className="mt-3 text-sm font-semibold text-slate-800">
                        Books
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Digital catalogue
                      </p>
                    </div>

                    <div className="rounded-2xl bg-violet-50 p-4">
                      <UserRound className="text-violet-600" size={22} />

                      <p className="mt-3 text-sm font-semibold text-slate-800">
                        Students
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Digital library ID
                      </p>
                    </div>

                    <div className="rounded-2xl bg-emerald-50 p-4">
                      <QrCode className="text-emerald-600" size={22} />

                      <p className="mt-3 text-sm font-semibold text-slate-800">
                        QR Access
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Quick identification
                      </p>
                    </div>

                    <div className="rounded-2xl bg-amber-50 p-4">
                      <CalendarCheck className="text-amber-600" size={22} />

                      <p className="mt-3 text-sm font-semibold text-slate-800">
                        Tracking
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Issue & return
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= FEATURES ================= */}
      <section className="bg-white px-5 py-16 sm:px-8 lg:px-10 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-wider text-indigo-600">
              Powerful Features
            </p>

            <h2 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">
              Everything your library needs
            </h2>

            <p className="mt-4 text-base leading-7 text-slate-500">
              Manage everyday library operations through one simple and
              organized digital system.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <div
                  key={feature.title}
                  className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition group-hover:bg-indigo-600 group-hover:text-white">
                    <Icon size={23} />
                  </div>

                  <h3 className="mt-5 text-lg font-bold text-slate-900">
                    {feature.title}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= HOW IT WORKS ================= */}
      <section className="bg-slate-50 px-5 py-16 sm:px-8 lg:px-10 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-indigo-600">
                Simple Workflow
              </p>

              <h2 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">
                How the library system works
              </h2>

              <p className="mt-5 max-w-xl text-base leading-7 text-slate-500">
                The complete library workflow is designed to reduce paperwork
                and keep student and book records organized.
              </p>

              <Link
                to="/student-register"
                className="mt-7 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-700"
              >
                Get Started
                <ArrowRight size={17} />
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {steps.map((step) => (
                <div
                  key={step.number}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <span className="text-sm font-extrabold text-indigo-600">
                    {step.number}
                  </span>

                  <h3 className="mt-3 text-lg font-bold text-slate-900">
                    {step.title}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ================= LIBRARY RULES ================= */}
      <section className="bg-white px-5 py-16 sm:px-8 lg:px-10 lg:py-20">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 p-7 text-white shadow-xl sm:p-10">
            <div className="grid gap-8 md:grid-cols-2 md:items-center">
              <div>
                <p className="text-sm font-bold uppercase tracking-wider text-indigo-300">
                  Current Library Rules
                </p>

                <h2 className="mt-2 text-3xl font-bold">
                  Know your borrowing limits
                </h2>

                <p className="mt-4 text-sm leading-6 text-slate-300">
                  Library rules are controlled by the librarian through Library
                  Settings and can be changed whenever required.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-xs text-slate-400">Max Books</p>
                  <p className="mt-1 text-2xl font-bold">{settings.maxBooks}</p>
                </div>

                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-xs text-slate-400">Issue Duration</p>
                  <p className="mt-1 text-2xl font-bold">
                    {settings.issueDuration}
                    <span className="ml-1 text-sm font-medium text-slate-400">
                      days
                    </span>
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-xs text-slate-400">Fine / Day</p>
                  <p className="mt-1 text-2xl font-bold">
                    ₹{settings.finePerDay}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= CTA ================= */}
      <section className="bg-indigo-50 px-5 py-16 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg">
            <Search size={27} />
          </div>

          <h2 className="mt-5 text-3xl font-bold text-slate-900 sm:text-4xl">
            Ready to use your digital library?
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-500">
            Register for your Digital Library ID and access your books, receipts
            and notifications from one place.
          </p>

          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              to="/student-register"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-indigo-700"
            >
              Create Account
              <ArrowRight size={18} />
            </Link>

            <Link
              to="/student-login"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Student Login
            </Link>
          </div>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="bg-slate-950 px-5 py-10 text-white sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-3">
                {settings.logo ? (
                  <img
                    src={settings.logo}
                    alt={`${settings.libraryName} logo`}
                    className="h-12 w-12 rounded-xl bg-white object-contain p-1.5"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600">
                    <Library size={25} />
                  </div>
                )}

                <div>
                  <h3 className="font-bold">{settings.libraryName}</h3>
                  <p className="text-xs text-slate-400">
                    {settings.institutionName}
                  </p>
                </div>
              </div>

              <p className="mt-4 max-w-lg text-sm leading-6 text-slate-400">
                A modern digital library management platform for managing books,
                students, issue and return records, receipts, notifications and
                fines.
              </p>
            </div>

            <div>
              <h4 className="font-semibold">Student</h4>

              <div className="mt-4 space-y-2 text-sm text-slate-400">
                <Link
                  to="/student-login"
                  className="block transition hover:text-white"
                >
                  Student Login
                </Link>

                <Link
                  to="/student-register"
                  className="block transition hover:text-white"
                >
                  Register
                </Link>

                <Link
                  to="/student-books"
                  className="block transition hover:text-white"
                >
                  Browse Books
                </Link>
              </div>
            </div>

            <div>
              <h4 className="font-semibold">Library</h4>

              <div className="mt-4 space-y-2 text-sm text-slate-400">
                <p>{settings.libraryEmail}</p>
                <p>{settings.librarianName}</p>
                <p>Fine: ₹{settings.finePerDay} / overdue day</p>
              </div>
            </div>
          </div>

          <div className="mt-10 border-t border-white/10 pt-6 text-center text-xs text-slate-500">
            © {new Date().getFullYear()} {settings.libraryName}. All rights
            reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
