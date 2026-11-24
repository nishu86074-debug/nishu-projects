import { useEffect, useState } from "react";

import {
  Save,
  RotateCcw,
  Settings,
  Building2,
  Mail,
  User,
  IndianRupee,
  BookOpen,
  CalendarDays,
  CreditCard,
  Smartphone,
  Info,
  LoaderCircle,
} from "lucide-react";

import {
  getLibrarySettingsFromFirestore,
  saveLibrarySettingsToFirestore,
  resetLibrarySettingsInFirestore,
  DEFAULT_LIBRARY_SETTINGS,
} from "../../firebase/librarySettingsService";

// =====================================================
// LOCAL STORAGE HELPERS
// =====================================================

const getLocalSettings = () => {
  try {
    const savedSettings =
      localStorage.getItem(
        "librarySettings"
      );

    if (!savedSettings) {
      return {
        ...DEFAULT_LIBRARY_SETTINGS,
      };
    }

    const parsedSettings =
      JSON.parse(savedSettings);

    return {
      ...DEFAULT_LIBRARY_SETTINGS,
      ...(parsedSettings || {}),
    };
  } catch (error) {
    console.error(
      "Error loading local library settings:",
      error
    );

    return {
      ...DEFAULT_LIBRARY_SETTINGS,
    };
  }
};

const saveLocalSettings = (settings) => {
  try {
    localStorage.setItem(
      "librarySettings",
      JSON.stringify(settings)
    );

    window.dispatchEvent(
      new Event("librarySettingsUpdated")
    );

    window.dispatchEvent(
      new Event("libraryDataUpdated")
    );
  } catch (error) {
    console.error(
      "Error saving local library settings:",
      error
    );
  }
};

// =====================================================
// LIBRARY SETTINGS
// =====================================================

const LibrarySettings = () => {
  const [settings, setSettings] =
    useState(getLocalSettings);

  const [saved, setSaved] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [loadingSettings, setLoadingSettings] =
    useState(true);

  const [error, setError] =
    useState("");

  // ===================================================
  // LOAD FIREBASE SETTINGS
  // ===================================================

  useEffect(() => {
    let active = true;

    const loadFirebaseSettings =
      async () => {
        try {
          setLoadingSettings(true);
          setError("");

          const firebaseSettings =
            await getLibrarySettingsFromFirestore();

          if (
            firebaseSettings &&
            active
          ) {
            const mergedSettings = {
              ...DEFAULT_LIBRARY_SETTINGS,
              ...firebaseSettings,
            };

            setSettings(
              mergedSettings
            );

            saveLocalSettings(
              mergedSettings
            );
          }

          if (
            !firebaseSettings &&
            active
          ) {
            const localSettings =
              getLocalSettings();

            // If Firebase has no settings yet,
            // create the local/default settings
            // in Firebase.

            try {
              const createdSettings =
                await saveLibrarySettingsToFirestore(
                  localSettings
                );

              if (active) {
                const mergedSettings = {
                  ...DEFAULT_LIBRARY_SETTINGS,
                  ...createdSettings,
                };

                setSettings(
                  mergedSettings
                );

                saveLocalSettings(
                  mergedSettings
                );
              }
            } catch (createError) {
              console.error(
                "Initial Firebase settings creation failed:",
                createError
              );

              if (active) {
                setError(
                  "Firebase settings are not available. Local settings are being used."
                );
              }
            }
          }
        } catch (firebaseError) {
          console.error(
            "Firebase settings load failed:",
            firebaseError
          );

          if (active) {
            setError(
              "Firebase settings could not be loaded. Local settings are being used."
            );
          }
        } finally {
          if (active) {
            setLoadingSettings(false);
          }
        }
      };

    loadFirebaseSettings();

    return () => {
      active = false;
    };
  }, []);

  // ===================================================
  // HANDLE INPUT CHANGES
  // ===================================================

  const handleChange = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target;

    setSettings(
      (previousSettings) => ({
        ...previousSettings,
        [name]: value,
      })
    );

    setSaved(false);
    setError("");
  };

  // ===================================================
  // PREPARE FINAL SETTINGS
  // ===================================================

  const getFinalSettings = () => {
    return {
      ...DEFAULT_LIBRARY_SETTINGS,
      ...settings,

      institutionName:
        String(
          settings.institutionName ||
            ""
        ).trim(),

      libraryName:
        String(
          settings.libraryName ||
            ""
        ).trim(),

      libraryEmail:
        String(
          settings.libraryEmail ||
            ""
        )
          .trim()
          .toLowerCase(),

      librarianName:
        String(
          settings.librarianName ||
            ""
        ).trim(),

      finePerDay:
        Math.max(
          0,
          Number(
            settings.finePerDay
          ) || 0
        ),

      maxBooks:
        Math.max(
          1,
          Number(
            settings.maxBooks
          ) || 1
        ),

      issueDuration:
        Math.max(
          1,
          Number(
            settings.issueDuration
          ) || 1
        ),

      logo:
        String(
          settings.logo || ""
        ),

      paymentMode:
        settings.paymentMode ||
        "Both",

      upiId:
        String(
          settings.upiId || ""
        ).trim(),

      upiName:
        String(
          settings.upiName || ""
        ).trim(),

      paymentApp:
        settings.paymentApp ||
        "Other",

      paymentInstructions:
        String(
          settings.paymentInstructions ||
            ""
        ).trim(),
    };
  };

  // ===================================================
  // SAVE SETTINGS
  // ===================================================

  const handleSave = async () => {
    try {
      setLoading(true);
      setError("");
      setSaved(false);

      const finalSettings =
        getFinalSettings();

      // -----------------------------------------------
      // FIREBASE FIRST
      // -----------------------------------------------

      const firebaseSettings =
        await saveLibrarySettingsToFirestore(
          finalSettings
        );

      // -----------------------------------------------
      // LOCAL CACHE
      // -----------------------------------------------

      const savedSettings = {
        ...finalSettings,

        firestoreId:
          firebaseSettings?.id ||
          "main",

        firebaseId:
          firebaseSettings?.id ||
          "main",
      };

      saveLocalSettings(
        savedSettings
      );

      setSettings(
        savedSettings
      );

      setSaved(true);

      setTimeout(() => {
        setSaved(false);
      }, 3000);
    } catch (saveError) {
      console.error(
        "Library settings save error:",
        saveError
      );

      setError(
        "Settings could not be saved to Firebase. Please check your Firebase connection."
      );
    } finally {
      setLoading(false);
    }
  };

  // ===================================================
  // RESET SETTINGS
  // ===================================================

  const handleReset = async () => {
    const confirmReset =
      window.confirm(
        "Are you sure you want to reset all library settings to default?"
      );

    if (!confirmReset) {
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSaved(false);

      // -----------------------------------------------
      // FIREBASE RESET
      // -----------------------------------------------

      const firebaseSettings =
        await resetLibrarySettingsInFirestore(
          DEFAULT_LIBRARY_SETTINGS
        );

      const resetSettings = {
        ...DEFAULT_LIBRARY_SETTINGS,

        firestoreId:
          firebaseSettings?.id ||
          "main",

        firebaseId:
          firebaseSettings?.id ||
          "main",
      };

      // -----------------------------------------------
      // LOCAL CACHE
      // -----------------------------------------------

      saveLocalSettings(
        resetSettings
      );

      setSettings(
        resetSettings
      );

      setSaved(true);

      setTimeout(() => {
        setSaved(false);
      }, 3000);
    } catch (resetError) {
      console.error(
        "Library settings reset error:",
        resetError
      );

      setError(
        "Settings could not be reset in Firebase."
      );
    } finally {
      setLoading(false);
    }
  };

  // ===================================================
  // UI
  // ===================================================

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="mb-6 flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100">
              <Settings className="h-6 w-6 text-indigo-600" />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Library Settings
              </h1>

              <p className="text-sm text-gray-500">
                Manage library information, rules and payment settings
              </p>
            </div>
          </div>

          <div className="flex gap-3">

            {/* RESET */}

            <button
              type="button"
              onClick={handleReset}
              disabled={loading}
              className="flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RotateCcw className="h-4 w-4" />

              Reset
            </button>

            {/* SAVE */}

            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}

              {loading
                ? "Saving..."
                : "Save Settings"}
            </button>
          </div>
        </div>

        {/* =================================================
            LOADING
        ================================================= */}

        {loadingSettings && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-medium text-indigo-700">
            <LoaderCircle className="h-4 w-4 animate-spin" />

            Loading settings from Firebase...
          </div>
        )}

        {/* =================================================
            ERROR
        ================================================= */}

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {/* =================================================
            SUCCESS
        ================================================= */}

        {saved && (
          <div className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
            Library settings saved successfully to Firebase.
          </div>
        )}

        <div className="space-y-6">

          {/* =================================================
              LIBRARY INFORMATION
          ================================================= */}

          <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">

            <div className="mb-5 flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>

              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Library Information
                </h2>

                <p className="text-sm text-gray-500">
                  Basic information about your institution and library
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

              {/* INSTITUTION */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Institution Name
                </label>

                <div className="relative">

                  <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

                  <input
                    type="text"
                    name="institutionName"
                    value={
                      settings.institutionName
                    }
                    onChange={handleChange}
                    placeholder="My College / University"
                    className="w-full rounded-xl border border-gray-300 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>

              {/* LIBRARY NAME */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Library Name
                </label>

                <div className="relative">

                  <BookOpen className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

                  <input
                    type="text"
                    name="libraryName"
                    value={
                      settings.libraryName
                    }
                    onChange={handleChange}
                    placeholder="Central Library"
                    className="w-full rounded-xl border border-gray-300 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>

              {/* EMAIL */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Library Email
                </label>

                <div className="relative">

                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

                  <input
                    type="email"
                    name="libraryEmail"
                    value={
                      settings.libraryEmail
                    }
                    onChange={handleChange}
                    placeholder="library@example.com"
                    className="w-full rounded-xl border border-gray-300 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>

              {/* LIBRARIAN */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Librarian Name
                </label>

                <div className="relative">

                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

                  <input
                    type="text"
                    name="librarianName"
                    value={
                      settings.librarianName
                    }
                    onChange={handleChange}
                    placeholder="Library Administrator"
                    className="w-full rounded-xl border border-gray-300 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* =================================================
              LIBRARY RULES
          ================================================= */}

          <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">

            <div className="mb-5 flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100">
                <BookOpen className="h-5 w-5 text-orange-600" />
              </div>

              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Library Rules
                </h2>

                <p className="text-sm text-gray-500">
                  Configure book issue and fine rules
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">

              {/* FINE */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Fine Per Day
                </label>

                <div className="relative">

                  <IndianRupee className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

                  <input
                    type="number"
                    min="0"
                    name="finePerDay"
                    value={
                      settings.finePerDay
                    }
                    onChange={handleChange}
                    className="w-full rounded-xl border border-gray-300 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>

              {/* MAX BOOKS */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Maximum Active Books
                </label>

                <div className="relative">

                  <BookOpen className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

                  <input
                    type="number"
                    min="1"
                    name="maxBooks"
                    value={
                      settings.maxBooks
                    }
                    onChange={handleChange}
                    className="w-full rounded-xl border border-gray-300 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>

              {/* ISSUE DURATION */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Issue Duration (Days)
                </label>

                <div className="relative">

                  <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

                  <input
                    type="number"
                    min="1"
                    name="issueDuration"
                    value={
                      settings.issueDuration
                    }
                    onChange={handleChange}
                    className="w-full rounded-xl border border-gray-300 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* =================================================
              ONLINE PAYMENT
          ================================================= */}

          <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">

            <div className="mb-5 flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100">
                <CreditCard className="h-5 w-5 text-green-600" />
              </div>

              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Online Fine Payment
                </h2>

                <p className="text-sm text-gray-500">
                  Configure UPI details for online fine payments
                </p>
              </div>
            </div>

            {/* INFO */}

            <div className="mb-6 flex gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">

              <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />

              <div>
                <p className="text-sm font-semibold text-blue-900">
                  Payment configuration
                </p>

                <p className="mt-1 text-sm leading-6 text-blue-700">
                  Add your library's UPI ID here. You can change the UPI details anytime from this settings page.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

              {/* PAYMENT MODE */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Payment Mode
                </label>

                <select
                  name="paymentMode"
                  value={
                    settings.paymentMode
                  }
                  onChange={handleChange}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="Cash">
                    Cash Only
                  </option>

                  <option value="Online">
                    Online Only
                  </option>

                  <option value="Both">
                    Cash + Online
                  </option>
                </select>
              </div>

              {/* PAYMENT APP */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  UPI App
                </label>

                <div className="relative">

                  <Smartphone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

                  <select
                    name="paymentApp"
                    value={
                      settings.paymentApp
                    }
                    onChange={handleChange}
                    className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="Google Pay">
                      Google Pay
                    </option>

                    <option value="PhonePe">
                      PhonePe
                    </option>

                    <option value="Paytm">
                      Paytm
                    </option>

                    <option value="Other">
                      Other UPI App
                    </option>
                  </select>
                </div>
              </div>

              {/* UPI ID */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Library UPI ID
                </label>

                <input
                  type="text"
                  name="upiId"
                  value={
                    settings.upiId
                  }
                  onChange={handleChange}
                  placeholder="library123@upi"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />

                <p className="mt-1.5 text-xs text-gray-500">
                  Example: library123@upi
                </p>
              </div>

              {/* UPI NAME */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  UPI Account Name
                </label>

                <input
                  type="text"
                  name="upiName"
                  value={
                    settings.upiName
                  }
                  onChange={handleChange}
                  placeholder="Central Library"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />

                <p className="mt-1.5 text-xs text-gray-500">
                  Name displayed to students during payment
                </p>
              </div>

              {/* PAYMENT INSTRUCTIONS */}

              <div className="md:col-span-2">

                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Payment Instructions
                </label>

                <textarea
                  name="paymentInstructions"
                  value={
                    settings.paymentInstructions
                  }
                  onChange={handleChange}
                  rows="4"
                  placeholder="Enter payment instructions..."
                  className="w-full resize-none rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />

                <p className="mt-1.5 text-xs text-gray-500">
                  Instructions that can be shown to students during online fine payment.
                </p>
              </div>
            </div>

            {/* PAYMENT PREVIEW */}

            <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-5">

              <h3 className="mb-4 text-sm font-bold text-gray-800">
                Payment Details Preview
              </h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">

                {/* MODE */}

                <div>
                  <p className="text-xs font-medium text-gray-500">
                    Payment Mode
                  </p>

                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    {settings.paymentMode ||
                      "Not configured"}
                  </p>
                </div>

                {/* APP */}

                <div>
                  <p className="text-xs font-medium text-gray-500">
                    UPI App
                  </p>

                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    {settings.paymentApp ||
                      "Not configured"}
                  </p>
                </div>

                {/* UPI */}

                <div>
                  <p className="text-xs font-medium text-gray-500">
                    UPI ID
                  </p>

                  <p className="mt-1 break-all text-sm font-semibold text-green-700">
                    {settings.upiId ||
                      "Not configured"}
                  </p>
                </div>
              </div>

              {/* ACCOUNT NAME */}

              {settings.upiName && (
                <div className="mt-4">

                  <p className="text-xs font-medium text-gray-500">
                    Account Name
                  </p>

                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    {settings.upiName}
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* =================================================
              FIREBASE INFORMATION
          ================================================= */}

          <section className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5">

            <div className="flex gap-3">

              <Info className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />

              <div>

                <h3 className="text-sm font-bold text-indigo-900">
                  Firebase Settings
                </h3>

                <p className="mt-1 text-sm leading-6 text-indigo-700">
                  Library settings are stored in Firebase Firestore. LocalStorage is used only as a local cache so the application can continue working if Firebase is temporarily unavailable.
                </p>
              </div>
            </div>
          </section>

          {/* =================================================
              BOTTOM SAVE
          ================================================= */}

          <div className="flex justify-end pb-8">

            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {loading ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}

              {loading
                ? "Saving..."
                : "Save Settings"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LibrarySettings;