
import {
  createContext,
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";

import { db } from "../firebase/firebaseConfig";
import defaultSettings from "../data/defaultSettings";

const LibrarySettingsContext = createContext(null);

const SETTINGS_DOCUMENT = "main";

const getStoredSettings = () => {
  try {
    const stored = localStorage.getItem("librarySettings");

    if (stored) {
      const parsed = JSON.parse(stored);

      return {
        ...defaultSettings,
        ...(parsed && typeof parsed === "object" ? parsed : {}),
      };
    }
  } catch (error) {
    console.error("Error loading local library settings:", error);
  }

  return { ...defaultSettings };
};

const saveSettingsLocally = (settings) => {
  try {
    localStorage.setItem(
      "librarySettings",
      JSON.stringify(settings)
    );
  } catch (error) {
    console.error("Error saving local library settings:", error);
  }
};

export const LibrarySettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(getStoredSettings);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsError, setSettingsError] = useState("");

  // --------------------------------------------------
  // LOAD SETTINGS FROM FIREBASE
  // --------------------------------------------------

  const refreshSettings = useCallback(async () => {
    setSettingsError("");

    try {
      const settingsRef = doc(
        db,
        "librarySettings",
        SETTINGS_DOCUMENT
      );

      const snapshot = await getDoc(settingsRef);

      let finalSettings;

      if (snapshot.exists()) {
        finalSettings = {
          ...defaultSettings,
          ...snapshot.data(),
        };
      } else {
        // If settings do not exist in Firebase yet,
        // use current local settings as initial settings.
        finalSettings = getStoredSettings();

        await setDoc(settingsRef, {
          ...finalSettings,
          updatedAt: new Date().toISOString(),
        });
      }

      setSettings(finalSettings);
      saveSettingsLocally(finalSettings);

      return finalSettings;
    } catch (error) {
      console.error("Firebase settings loading error:", error);

      setSettingsError(
        "Firebase settings could not be loaded. Local settings are being used."
      );

      // Keep the app usable if Firebase is unavailable.
      const localSettings = getStoredSettings();

      setSettings(localSettings);

      return localSettings;
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadSettings = async () => {
      try {
        await refreshSettings();
      } catch (error) {
        console.error("Settings initialization error:", error);

        if (mounted) {
          setSettingsError("Unable to load library settings.");
          setSettingsLoading(false);
        }
      }
    };

    const handleSettingsUpdate = () => {
      setSettings(getStoredSettings());
    };

    const handleStorage = (event) => {
      if (!event.key || event.key === "librarySettings") {
        setSettings(getStoredSettings());
      }
    };

    loadSettings();

    window.addEventListener(
      "librarySettingsUpdated",
      handleSettingsUpdate
    );

    window.addEventListener("storage", handleStorage);

    return () => {
      mounted = false;

      window.removeEventListener(
        "librarySettingsUpdated",
        handleSettingsUpdate
      );

      window.removeEventListener("storage", handleStorage);
    };
  }, [refreshSettings]);

  // --------------------------------------------------
  // UPDATE SETTINGS IN FIREBASE AND LOCAL STORAGE
  // --------------------------------------------------

  const updateSettings = useCallback(
    async (newSettings) => {
      if (
        !newSettings ||
        typeof newSettings !== "object" ||
        Array.isArray(newSettings)
      ) {
        throw new Error("Valid library settings are required.");
      }

      const updatedSettings = {
        ...settings,
        ...newSettings,
      };

      // Update UI and local fallback immediately.
      setSettings(updatedSettings);
      saveSettingsLocally(updatedSettings);

      window.dispatchEvent(
        new Event("librarySettingsUpdated")
      );

      setSettingsError("");

      try {
        const settingsRef = doc(
          db,
          "librarySettings",
          SETTINGS_DOCUMENT
        );

        await setDoc(
          settingsRef,
          {
            ...updatedSettings,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );

        return updatedSettings;
      } catch (error) {
        console.error("Firebase settings saving error:", error);

        setSettingsError(
          "Settings were saved locally, but Firebase could not be updated."
        );

        throw error;
      }
    },
    [settings]
  );

  return (
    <LibrarySettingsContext.Provider
      value={{
        settings,
        updateSettings,
        refreshSettings,
        settingsLoading,
        settingsError,
      }}
    >
      {children}
    </LibrarySettingsContext.Provider>
  );
};

export default LibrarySettingsContext;
