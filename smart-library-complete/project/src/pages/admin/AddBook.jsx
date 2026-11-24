
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  Camera,
  CheckCircle2,
  Hash,
  LoaderCircle,
  Package,
  Save,
  Search,
  Tag,
  User,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  Html5Qrcode,
  Html5QrcodeSupportedFormats,
} from "html5-qrcode";

import { useLibraryData } from "../../context/useLibraryData";
import { addBookToFirestore } from "../../firebase/bookService";

const normalizeISBN = (value = "") =>
  String(value).replace(/[\s-]/g, "").toUpperCase();

const isValidISBN = (value) => {
  const isbn = normalizeISBN(value);
  return /^\d{13}$/.test(isbn) || /^\d{9}[\dX]$/.test(isbn);
};

async function fetchJSON(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json();
}

async function lookupGoogleBooks(isbn) {
  const data = await fetchJSON(
    `https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(isbn)}&maxResults=10`
  );

  const items = data.items || [];

  const normalize = (value) => normalizeISBN(value);

  const exactMatch = items.find((item) =>
    (item.volumeInfo?.industryIdentifiers || []).some(
      (identifier) => normalize(identifier.identifier) === normalize(isbn)
    )
  );

  // Prefer an exact ISBN match instead of an unrelated search result.
  const info = (exactMatch || items[0])?.volumeInfo;

  if (!info) return null;

  return {
    title: info.title || "",
    author: (info.authors || []).join(", "),
    category: (info.categories || []).join(", "),
    description: info.description || "",
    image:
      info.imageLinks?.thumbnail?.replace(/^http:/, "https:") ||
      info.imageLinks?.smallThumbnail?.replace(/^http:/, "https:") ||
      "",
  };
}

async function lookupOpenLibrary(isbn) {
  const data = await fetchJSON(
    `https://openlibrary.org/api/books?bibkeys=${encodeURIComponent(
      `ISBN:${isbn}`
    )}&format=json&jscmd=data`
  );

  const book = data[`ISBN:${isbn}`];

  if (!book) return null;

  return {
    title: book.title || "",
    author: (book.authors || [])
      .map((author) => author.name)
      .filter(Boolean)
      .join(", "),
    category: (book.subjects || [])
      .map((subject) => subject.name)
      .filter(Boolean)
      .slice(0, 5)
      .join(", "),
    description:
      typeof book.description === "string"
        ? book.description
        : book.description?.value || "",
    image:
      book.cover?.large ||
      book.cover?.medium ||
      book.cover?.small ||
      "",
  };
}

async function findBookDetails(isbn) {
  const cleanISBN = normalizeISBN(isbn);

  // Try both sources, even if one request fails.
  const results = await Promise.allSettled([
    lookupGoogleBooks(cleanISBN),
    lookupOpenLibrary(cleanISBN),
  ]);

  const google =
    results[0].status === "fulfilled" ? results[0].value : null;

  const openLibrary =
    results[1].status === "fulfilled" ? results[1].value : null;

  const details = {
    title: google?.title || openLibrary?.title || "",
    author: google?.author || openLibrary?.author || "",
    category: google?.category || openLibrary?.category || "",
    description:
      google?.description || openLibrary?.description || "",
    image: google?.image || openLibrary?.image || "",
  };

  return details.title || details.author || details.category
    ? details
    : null;
}

function ISBNScanner({ onDetected, onClose }) {
  const scannerRef = useRef(null);
  const detectedRef = useRef(false);

  const [status, setStatus] = useState("starting");
  const [error, setError] = useState("");

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;

    scannerRef.current = null;

    try {
      if (scanner.isScanning) {
        await scanner.stop();
      }
    } catch (err) {
      console.warn("Could not stop scanner:", err);
    }

    try {
      scanner.clear();
    } catch {
      // Scanner may already have been cleared.
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      let scanner;

      try {
        scanner = new Html5Qrcode("isbn-reader", {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
          ],
          verbose: false,
        });

        scannerRef.current = scanner;

        const cameras = await Html5Qrcode.getCameras();

        if (cancelled) return;

        if (!cameras.length) {
          throw new Error("Camera nahi mili. Camera permission allow karein.");
        }

        const camera =
          cameras.find((item) =>
            /back|rear|environment/i.test(item.label)
          ) || cameras[cameras.length - 1];

        await scanner.start(
          camera.id,
          {
            fps: 10,
            qrbox: { width: 280, height: 120 },
            aspectRatio: 1.5,
          },
          async (decodedText) => {
            if (cancelled || detectedRef.current) return;

            const isbn = normalizeISBN(decodedText);

            if (!isValidISBN(isbn)) return;

            detectedRef.current = true;
            setStatus("scanned");

            await stopScanner();

            if (!cancelled) onDetected(isbn);
          },
          () => {}
        );

        if (!cancelled) setStatus("scanning");
        else await stopScanner();
      } catch (err) {
        console.error("Scanner error:", err);

        if (!cancelled) {
          setError(
            err.message ||
              "Camera start nahi hui. Browser permission check karein."
          );
          setStatus("error");
        }
      }
    };

    start();

    return () => {
      cancelled = true;
      stopScanner();
    };
  }, [onDetected, stopScanner]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b p-5">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Scan Book ISBN
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Barcode ko camera ke saamne rakhein
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 hover:bg-slate-100"
          >
            <X size={22} />
          </button>
        </div>

        <div className="p-5">
          <div
            id="isbn-reader"
            className="min-h-64 overflow-hidden rounded-2xl bg-slate-950"
          />

          {status === "starting" && (
            <p className="mt-4 flex items-center gap-2 rounded-xl bg-blue-50 p-3 text-sm text-blue-700">
              <LoaderCircle className="animate-spin" size={18} />
              Camera start ho raha hai...
            </p>
          )}

          {status === "scanning" && (
            <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">
              Scanner ready hai. ISBN barcode scan karein.
            </p>
          )}

          {status === "scanned" && (
            <p className="mt-4 rounded-xl bg-indigo-50 p-3 text-sm text-indigo-700">
              ISBN mil gaya. Book details search ho rahi hain...
            </p>
          )}

          {status === "error" && (
            <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={onClose}
            className="mt-4 w-full rounded-xl border px-4 py-3 font-semibold hover:bg-slate-50"
          >
            Close Scanner
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AddBook() {
  const navigate = useNavigate();
  const { books, setBooks } = useLibraryData();

  const [form, setForm] = useState({
    title: "",
    author: "",
    category: "",
    isbn: "",
    quantity: "1",
    description: "",
    image: "",
  });

  const [scannerOpen, setScannerOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  const updateField = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const searchISBN = useCallback(async (rawISBN) => {
    const isbn = normalizeISBN(rawISBN);

    setForm((previous) => ({ ...previous, isbn }));
    setSearching(true);

    try {
      const details = await findBookDetails(isbn);

      if (!details) {
        toast.error(
          "ISBN scan ho gaya, lekin online record nahi mila. Title aur author manually fill karein."
        );
        return;
      }

      setForm((previous) => ({
        ...previous,
        isbn,
        title: details.title || previous.title,
        author: details.author || previous.author,
        category: details.category || previous.category,
        description: details.description || previous.description,
        image: details.image || previous.image,
      }));

      const missing = [];

      if (!details.title) missing.push("title");
      if (!details.author) missing.push("author");
      if (!details.category) missing.push("category");

      if (missing.length) {
        toast.success(
          `Book mil gayi. Missing details manually enter karein: ${missing.join(", ")}.`
        );
      } else {
        toast.success("Book details automatically fill ho gayi!");
      }
    } catch (err) {
      console.error("ISBN lookup failed:", err);
      toast.error("Lookup failed. Internet connection check karein.");
    } finally {
      setSearching(false);
    }
  }, []);

  const handleDetected = useCallback(
    async (isbn) => {
      setScannerOpen(false);
      await searchISBN(isbn);
    },
    [searchISBN]
  );

  const handleSubmit = async (event) => {
    event.preventDefault();

    const title = form.title.trim();
    const author = form.author.trim();
    const category = form.category.trim();
    const isbn = normalizeISBN(form.isbn);
    const quantity = Number(form.quantity);

    if (!title || !author || !category) {
      toast.error("Title, author aur category fill karna zaroori hai.");
      return;
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      toast.error("Valid book quantity enter karein.");
      return;
    }

    setSaving(true);

    try {
      const bookId = `BOOK-${Date.now()}`;

      const newBook = {
        id: bookId,
        bookId,
        title,
        name: title,
        author,
        category,
        isbn,
        quantity,
        availableQuantity: quantity,
        issuedQuantity: 0,
        status: "Available",
        description: form.description.trim(),
        image: form.image.trim(),
        createdAt: new Date().toISOString(),
      };

      const result = await addBookToFirestore(newBook);

      const savedBook = {
        ...newBook,
        firestoreId: result?.id || result?.firestoreId || "",
      };

      setBooks([
        ...(Array.isArray(books) ? books : []),
        savedBook,
      ]);

      toast.success("Book successfully save ho gayi!");

      setForm({
        title: "",
        author: "",
        category: "",
        isbn: "",
        quantity: "1",
        description: "",
        image: "",
      });

      navigate("/books");
    } catch (err) {
      console.error("Saving book failed:", err);
      toast.error(
        "Book save nahi hui. bookService aur Firebase configuration check karein."
      );
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100";

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50">
      {scannerOpen && (
        <ISBNScanner
          onDetected={handleDetected}
          onClose={() => setScannerOpen(false)}
        />
      )}

      <header className="border-b border-indigo-100 bg-white/90 shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-5 sm:px-6">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-xl border border-slate-200 p-3 text-slate-600 hover:bg-slate-100"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg">
            <BookOpen size={25} />
          </div>

          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">
              Add New Book
            </h1>
            <p className="text-sm text-slate-500">
              Smart Library Management System
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-6 rounded-3xl bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 p-6 text-white shadow-xl">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-white/15 p-3">
              <Camera size={28} />
            </div>

            <div>
              <h2 className="text-xl font-bold">
                Smart ISBN Scanner
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-indigo-100">
                Barcode scan karein aur available online records se
                title, author, category aur cover details automatically
                fetch karne ki koshish karein.
              </p>

              <button
                type="button"
                onClick={() => setScannerOpen(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-bold text-indigo-700 shadow transition hover:bg-indigo-50"
              >
                <Camera size={19} />
                Open Scanner
              </button>
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-indigo-100/50"
        >
          <div className="flex items-center gap-3 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-5">
            <CheckCircle2 className="text-indigo-600" size={22} />
            <div>
              <h3 className="font-bold text-slate-900">
                Book Information
              </h3>
              <p className="text-sm text-slate-500">
                Starred fields are required.
              </p>
            </div>
          </div>

          <div className="space-y-6 p-6 sm:p-8">
            {searching && (
              <div className="flex items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
                <LoaderCircle size={20} className="animate-spin" />
                ISBN database mein book details search ho rahi hain...
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="isbn">
                ISBN Number
              </label>

              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Hash
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500"
                  />
                  <input
                    id="isbn"
                    name="isbn"
                    value={form.isbn}
                    onChange={updateField}
                    placeholder="Scan or enter ISBN"
                    className={`${inputClass} pl-10`}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => searchISBN(form.isbn)}
                  disabled={searching || !isValidISBN(form.isbn)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Search size={18} />
                  Find Details
                </button>
              </div>

              <p className="mt-2 text-xs text-slate-500">
                ISBN-10 ya ISBN-13 use karein.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <label htmlFor="title" className="mb-2 block text-sm font-semibold text-slate-700">
                  <BookOpen size={16} className="mr-2 inline text-indigo-600" />
                  Book Title *
                </label>
                <input
                  id="title"
                  name="title"
                  required
                  value={form.title}
                  onChange={updateField}
                  placeholder="Enter book title"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="author" className="mb-2 block text-sm font-semibold text-slate-700">
                  <User size={16} className="mr-2 inline text-violet-600" />
                  Author Name *
                </label>
                <input
                  id="author"
                  name="author"
                  required
                  value={form.author}
                  onChange={updateField}
                  placeholder="Enter author name"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="category" className="mb-2 block text-sm font-semibold text-slate-700">
                  <Tag size={16} className="mr-2 inline text-fuchsia-600" />
                  Category *
                </label>
                <input
                  id="category"
                  name="category"
                  required
                  value={form.category}
                  onChange={updateField}
                  placeholder="e.g. Computer Science"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="quantity" className="mb-2 block text-sm font-semibold text-slate-700">
                  <Package size={16} className="mr-2 inline text-emerald-600" />
                  Number of Copies *
                </label>
                <input
                  id="quantity"
                  name="quantity"
                  type="number"
                  min="1"
                  max="10000"
                  required
                  value={form.quantity}
                  onChange={updateField}
                  className={inputClass}
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="description" className="mb-2 block text-sm font-semibold text-slate-700">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows="4"
                  value={form.description}
                  onChange={updateField}
                  placeholder="Book description..."
                  className={inputClass}
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="image" className="mb-2 block text-sm font-semibold text-slate-700">
                  Book Cover Image URL
                </label>
                <input
                  id="image"
                  name="image"
                  type="url"
                  value={form.image}
                  onChange={updateField}
                  placeholder="https://example.com/book-cover.jpg"
                  className={inputClass}
                />

                {form.image && (
                  <img
                    src={form.image}
                    alt="Book cover preview"
                    className="mt-4 h-40 rounded-xl border border-slate-200 object-contain"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-violet-50 p-5">
              <h4 className="mb-3 font-bold text-slate-800">
                Book Preview
              </h4>
              <p className="text-sm text-slate-600">
                <strong>Title:</strong> {form.title || "Not entered"}
              </p>
              <p className="mt-2 text-sm text-slate-600">
                <strong>Author:</strong> {form.author || "Not entered"}
              </p>
              <p className="mt-2 text-sm text-slate-600">
                <strong>Category:</strong> {form.category || "Not entered"}
              </p>
              <p className="mt-2 text-sm text-slate-600">
                <strong>Copies:</strong> {form.quantity || "0"}
              </p>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50 p-6 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-xl border border-slate-200 bg-white px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving || searching}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-7 py-3 font-bold text-white shadow-md transition hover:from-indigo-700 hover:to-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <>
                  <LoaderCircle size={19} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={19} />
                  Save Book
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
