import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";

import LibrarySettingsContext from "./LibrarySettingsContext";

import { db } from "../firebase/firebaseConfig";

const SETTINGS_COLLECTION = "librarySettings";
const SETTINGS_DOCUMENT = "main";

const DEFAULT_SETTINGS = {
  institutionName: "My College / University",
  libraryName: "Central Library",
  libraryEmail: "library@example.com",
  librarianName: "Library Administrator",

  finePerDay: 10,
  maxBooks: 3,
  issueDuration: 14,

  logo: "",

  paymentMode: "Both",
  upiId: "",
  upiName: "",
  upiApp: "",
  paymentInstructions: "",
};

const readLocalSettings = () => {
  try {
    const savedSettings = JSON.parse(
      localStorage.getItem("librarySettings") || "null",
    );

    if (!savedSettings) {
      return DEFAULT_SETTINGS;
    }

    return {
      ...DEFAULT_SETTINGS,
      ...savedSettings,
    };
  } catch (error) {
    console.error(
      "Error reading local library settings:",
      error,
    );

    return DEFAULT_SETTINGS;
  }
};

const normalizeSettings = (settings) => {
  return {
    ...DEFAULT_SETTINGS,
    ...(settings || {}),
  };
};

export const LibrarySettingsProvider = ({
  children,
}) => {
  const [settings, setSettings] = useState(
    readLocalSettings,
  );

  const [loading, setLoading] = useState(false);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  // =====================================================
  // SAVE SETTINGS LOCALLY
  // =====================================================

  const saveLocalSettings = useCallback(
    (newSettings) => {
      try {
        const normalizedSettings =
          normalizeSettings(newSettings);

        localStorage.setItem(
          "librarySettings",
          JSON.stringify(normalizedSettings),
        );

        setSettings(normalizedSettings);

        window.dispatchEvent(
          new Event("librarySettingsUpdated"),
        );

        window.dispatchEvent(
          new Event("libraryDataUpdated"),
        );
      } catch (storageError) {
        console.error(
          "Error saving local library settings:",
          storageError,
        );
      }
    },
    [],
  );

  // =====================================================
  // LOAD SETTINGS FROM FIREBASE
  // =====================================================

  const loadSettings = useCallback(
    async () => {
      setLoading(true);
      setError("");

      try {
        const settingsRef = doc(
          db,
          SETTINGS_COLLECTION,
          SETTINGS_DOCUMENT,
        );

        const settingsSnapshot =
          await getDoc(settingsRef);

        if (settingsSnapshot.exists()) {
          const firebaseSettings =
            settingsSnapshot.data();

          const mergedSettings =
            normalizeSettings(firebaseSettings);

          localStorage.setItem(
            "librarySettings",
            JSON.stringify(mergedSettings),
          );

          setSettings(mergedSettings);

          window.dispatchEvent(
            new Event("librarySettingsUpdated"),
          );

          return mergedSettings;
        }

        // =================================================
        // IF FIREBASE DOCUMENT DOES NOT EXIST
        // CREATE DEFAULT SETTINGS
        // =================================================

        const defaultSettings =
          normalizeSettings(
            readLocalSettings(),
          );

        await setDoc(
          settingsRef,
          {
            ...defaultSettings,
            createdAt:
              new Date().toISOString(),
            updatedAt:
              new Date().toISOString(),
          },
        );

        localStorage.setItem(
          "librarySettings",
          JSON.stringify(defaultSettings),
        );

        setSettings(defaultSettings);

        window.dispatchEvent(
          new Event("librarySettingsUpdated"),
        );

        return defaultSettings;
      } catch (firebaseError) {
        console.error(
          "Error loading library settings from Firebase:",
          firebaseError,
        );

        // =================================================
        // FIREBASE FAILS → USE LOCAL STORAGE
        // =================================================

        const localSettings =
          readLocalSettings();

        setSettings(localSettings);

        setError(
          "Unable to load settings from Firebase. Using saved local settings.",
        );

        return localSettings;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {
    let mounted = true;

    const initializeSettings = async () => {
      const loadedSettings =
        await loadSettings();

      if (!mounted || !loadedSettings) {
        return;
      }
    };

    initializeSettings();

    return () => {
      mounted = false;
    };
  }, [loadSettings]);

  // =====================================================
  // LISTEN FOR SETTINGS UPDATES
  // =====================================================

  useEffect(() => {
    const handleSettingsUpdate = () => {
      const localSettings =
        readLocalSettings();

      setSettings(localSettings);
    };

    const handleStorageUpdate = () => {
      const localSettings =
        readLocalSettings();

      setSettings(localSettings);
    };

    window.addEventListener(
      "librarySettingsUpdated",
      handleSettingsUpdate,
    );

    window.addEventListener(
      "storage",
      handleStorageUpdate,
    );

    return () => {
      window.removeEventListener(
        "librarySettingsUpdated",
        handleSettingsUpdate,
      );

      window.removeEventListener(
        "storage",
        handleStorageUpdate,
      );
    };
  }, []);

  // =====================================================
  // UPDATE SETTINGS
  // =====================================================

  const updateSettings = useCallback(
    async (newSettings) => {
      setSaving(true);
      setError("");

      try {
        const updatedSettings =
          normalizeSettings(newSettings);

        // -----------------------------------------------
        // UPDATE UI + LOCAL STORAGE FIRST
        // -----------------------------------------------

        saveLocalSettings(updatedSettings);

        // -----------------------------------------------
        // UPDATE FIREBASE
        // -----------------------------------------------

        const settingsRef = doc(
          db,
          SETTINGS_COLLECTION,
          SETTINGS_DOCUMENT,
        );

        await setDoc(
          settingsRef,
          {
            ...updatedSettings,
            updatedAt:
              new Date().toISOString(),
          },
          {
            merge: true,
          },
        );

        // -----------------------------------------------
        // FINAL LOCAL SYNC
        // -----------------------------------------------

        localStorage.setItem(
          "librarySettings",
          JSON.stringify(updatedSettings),
        );

        setSettings(updatedSettings);

        window.dispatchEvent(
          new Event("librarySettingsUpdated"),
        );

        window.dispatchEvent(
          new Event("libraryDataUpdated"),
        );

        return updatedSettings;
      } catch (firebaseError) {
        console.error(
          "Error saving library settings:",
          firebaseError,
        );

        setError(
          "Settings were saved locally, but Firebase could not be updated.",
        );

        return normalizeSettings(
          newSettings,
        );
      } finally {
        setSaving(false);
      }
    },
    [saveLocalSettings],
  );

  // =====================================================
  // UPDATE ONE SETTING
  // =====================================================

  const updateSetting = useCallback(
    async (key, value) => {
      const updatedSettings = {
        ...settings,
        [key]: value,
      };

      return updateSettings(
        updatedSettings,
      );
    },
    [settings, updateSettings],
  );

  // =====================================================
  // RESET SETTINGS
  // =====================================================

  const resetSettings = useCallback(
    async () => {
      const resetData = {
        ...DEFAULT_SETTINGS,
      };

      return updateSettings(resetData);
    },
    [updateSettings],
  );

  // =====================================================
  // REFRESH SETTINGS
  // =====================================================

  const refreshSettings = useCallback(
    async () => {
      return loadSettings();
    },
    [loadSettings],
  );

  // =====================================================
  // CONTEXT VALUE
  // =====================================================

  const contextValue = {
    settings,

    loading,

    saving,

    error,

    setSettings: updateSettings,

    updateSettings,

    updateSetting,

    resetSettings,

    refreshSettings,

    DEFAULT_SETTINGS,
  };

  return (
    <LibrarySettingsContext.Provider
      value={contextValue}
    >
      {children}
    </LibrarySettingsContext.Provider>
  );
};