
import {
  createContext,
  useCallback,
  useEffect,
  useState,
} from "react";

import defaultBooks from "../data/defaultBooks";

import { getBooksFromFirestore } from "../firebase/bookService";
import { getStudentsFromFirestore } from "../firebase/studentService";
import { getIssuesFromFirestore } from "../firebase/issueService";
import { getNotificationsFromFirestore } from "../firebase/notificationService";

const LibraryDataContext = createContext(null);

const STORAGE_KEYS = {
  books: "books",
  students: "students",
  issuedBooks: "issuedBooks",
  notifications: "notifications",
  receipts: "receipts",
};

const readStorage = (storageKey, fallback = []) => {
  try {
    if (typeof window === "undefined") return fallback;

    const stored = window.localStorage.getItem(storageKey);

    if (!stored) return fallback;

    const parsed = JSON.parse(stored);

    return Array.isArray(parsed) ? parsed : fallback;
  } catch (error) {
    console.error(`Error reading ${storageKey}:`, error);
    return fallback;
  }
};

const saveStorage = (storageKey, data) => {
  try {
    if (typeof window === "undefined") return;

    window.localStorage.setItem(storageKey, JSON.stringify(data));
  } catch (error) {
    console.error(`Error saving ${storageKey}:`, error);
  }
};

const getKey = (item, type) => {
  if (!item || typeof item !== "object") {
    return "";
  }

  switch (type) {
    case "books":
      return String(
        item.bookId ?? item.isbn ?? item.id ?? ""
      )
        .trim()
        .toLowerCase();

    case "students":
      return String(
        item.libraryId ??
          item.studentLibraryId ??
          item.studentId ??
          item.id ??
          ""
      )
        .trim()
        .toLowerCase();

    case "issuedBooks":
    case "receipts":
      return String(
        item.issueId ?? item.receiptId ?? item.id ?? ""
      )
        .trim()
        .toLowerCase();

    default:
      return String(
        item.notificationId ?? item.id ?? ""
      )
        .trim()
        .toLowerCase();
  }
};

const mergeData = (localItems, firebaseItems, type) => {
  const local = Array.isArray(localItems) ? localItems : [];
  const remote = Array.isArray(firebaseItems) ? firebaseItems : [];

  const result = [...local];
  const indexes = new Map();

  result.forEach((item, index) => {
    const identifier = getKey(item, type);

    if (identifier && !indexes.has(identifier)) {
      indexes.set(identifier, index);
    }
  });

  remote.forEach((item) => {
    if (!item || typeof item !== "object") return;

    const identifier = getKey(item, type);

    const normalizedItem = {
      ...item,
      firestoreId: item.firestoreId ?? item.firebaseId ?? "",
      firebaseId: item.firebaseId ?? item.firestoreId ?? "",
    };

    if (identifier && indexes.has(identifier)) {
      const index = indexes.get(identifier);

      result[index] = {
        ...result[index],
        ...normalizedItem,
      };
    } else {
      if (identifier) {
        indexes.set(identifier, result.length);
      }

      result.push(normalizedItem);
    }
  });

  return result;
};

const getArray = (result) => {
  if (Array.isArray(result)) return result;

  if (Array.isArray(result?.data)) {
    return result.data;
  }

  return [];
};

export const LibraryDataProvider = ({ children }) => {
  const [books, setBooksState] = useState(() =>
    readStorage("books", defaultBooks)
  );

  const [students, setStudentsState] = useState(() =>
    readStorage("students", [])
  );

  const [issuedBooks, setIssuedBooksState] = useState(() =>
    readStorage("issuedBooks", [])
  );

  const [notifications, setNotificationsState] = useState(() =>
    readStorage("notifications", [])
  );

  const [receipts, setReceiptsState] = useState(() =>
    readStorage("receipts", [])
  );

  const [loading, setLoading] = useState(true);
  const [firebaseError, setFirebaseError] = useState("");

  const applyData = useCallback((storageKey, data) => {
    if (!Object.hasOwn(STORAGE_KEYS, storageKey)) {
      console.error(`Unknown collection: ${storageKey}`);
      return;
    }

    if (!Array.isArray(data)) {
      console.error(`${storageKey} must be an array.`);
      return;
    }

    saveStorage(storageKey, data);

    switch (storageKey) {
      case "books":
        setBooksState(data);
        break;

      case "students":
        setStudentsState(data);
        break;

      case "issuedBooks":
        setIssuedBooksState(data);
        break;

      case "notifications":
        setNotificationsState(data);
        break;

      case "receipts":
        setReceiptsState(data);
        break;

      default:
        break;
    }
  }, []);

  const refreshData = useCallback(async () => {
    setLoading(true);
    setFirebaseError("");

    try {
      const results = await Promise.allSettled([
        getBooksFromFirestore(),
        getStudentsFromFirestore(),
        getIssuesFromFirestore(),
        getNotificationsFromFirestore(),
      ]);

      const collections = [
        {
          name: "books",
          result: results[0],
          fallback: readStorage("books", defaultBooks),
        },
        {
          name: "students",
          result: results[1],
          fallback: readStorage("students", []),
        },
        {
          name: "issuedBooks",
          result: results[2],
          fallback: readStorage("issuedBooks", []),
        },
        {
          name: "notifications",
          result: results[3],
          fallback: readStorage("notifications", []),
        },
      ];

      const failedCollections = [];

      collections.forEach(({ name, result, fallback }) => {
        if (result.status === "fulfilled") {
          const firebaseItems = getArray(result.value);

          const mergedItems = mergeData(
            fallback,
            firebaseItems,
            name
          );

          applyData(name, mergedItems);
        } else {
          console.error(
            `Unable to load ${name} from Firebase:`,
            result.reason
          );

          failedCollections.push(name);
          applyData(name, fallback);
        }
      });

      applyData("receipts", readStorage("receipts", []));

      if (failedCollections.length > 0) {
        setFirebaseError(
          `Could not load: ${failedCollections.join(", ")}. Local data is being shown.`
        );
      }

      return failedCollections.length === 0;
    } catch (error) {
      console.error("Library data loading failed:", error);

      setFirebaseError(
        "Library data could not be loaded. Showing locally saved data."
      );

      applyData("books", readStorage("books", defaultBooks));
      applyData("students", readStorage("students", []));
      applyData("issuedBooks", readStorage("issuedBooks", []));
      applyData("notifications", readStorage("notifications", []));
      applyData("receipts", readStorage("receipts", []));

      return false;
    } finally {
      setLoading(false);
    }
  }, [applyData]);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      await Promise.resolve();

      if (cancelled) return;

      await refreshData();
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [refreshData]);

  useEffect(() => {
    const handleDataUpdate = () => {
      setBooksState(readStorage("books", defaultBooks));
      setStudentsState(readStorage("students", []));
      setIssuedBooksState(readStorage("issuedBooks", []));
      setNotificationsState(readStorage("notifications", []));
      setReceiptsState(readStorage("receipts", []));
    };

    const handleStorage = (event) => {
      if (
        event.key &&
        !Object.values(STORAGE_KEYS).includes(event.key)
      ) {
        return;
      }

      handleDataUpdate();
    };

    window.addEventListener("libraryDataUpdated", handleDataUpdate);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(
        "libraryDataUpdated",
        handleDataUpdate
      );

      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const saveCollection = useCallback(
    (storageKey, data) => {
      if (!Array.isArray(data)) {
        console.error(`${storageKey} must be an array.`);
        return;
      }

      applyData(storageKey, data);

      window.dispatchEvent(new Event("libraryDataUpdated"));
    },
    [applyData]
  );

  const setBooks = useCallback(
    (data) => saveCollection("books", data),
    [saveCollection]
  );

  const setStudents = useCallback(
    (data) => saveCollection("students", data),
    [saveCollection]
  );

  const setIssuedBooks = useCallback(
    (data) => saveCollection("issuedBooks", data),
    [saveCollection]
  );

  const setNotifications = useCallback(
    (data) => saveCollection("notifications", data),
    [saveCollection]
  );

  const setReceipts = useCallback(
    (data) => saveCollection("receipts", data),
    [saveCollection]
  );

  const value = {
    books,
    students,
    issuedBooks,
    notifications,
    receipts,
    setBooks,
    setStudents,
    setIssuedBooks,
    setNotifications,
    setReceipts,
    loading,
    firebaseError,
    refreshData,
  };

  return (
    <LibraryDataContext.Provider value={value}>
      {children}
    </LibraryDataContext.Provider>
  );
};

export default LibraryDataContext;
