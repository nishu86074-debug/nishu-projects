import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import {
  ArrowLeft,
  BookOpen,
  Plus,
  Search,
  Trash2,
  Library,
  CheckCircle,
  AlertCircle,
  X,
} from "lucide-react";

import { useLibraryData } from "../../context/useLibraryData";

import {
  getBooksFromFirestore,
  deleteBookFromFirestore,
} from "../../firebase/bookService";

const Books = () => {
  const navigate = useNavigate();

  const { books, setBooks } = useLibraryData();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");

  const [selectedBook, setSelectedBook] = useState(null);

  const [loading, setLoading] = useState(true);

  // Librarian protection
  useEffect(() => {
    const librarian = localStorage.getItem("librarian");

    if (!librarian) {
      navigate("/admin-login");
    }
  }, [navigate]);

  // Load books from Firebase
  useEffect(() => {
    const loadBooks = async () => {
      try {
        setLoading(true);

        const firebaseBooks = await getBooksFromFirestore();

        /*
          Firebase has no books yet:
          keep existing local books.
        */

        if (firebaseBooks.length > 0) {
          setBooks(firebaseBooks);
        }
      } catch (error) {
        console.error("Load books error:", error);

        toast.error("Unable to load books from Firebase.");
      } finally {
        setLoading(false);
      }
    };

    loadBooks();
  }, [setBooks]);

  // Categories
  const categories = useMemo(() => {
    const values = books.map((book) => book.category).filter(Boolean);

    return ["All", ...new Set(values)];
  }, [books]);

  // Filter books
  const filteredBooks = useMemo(() => {
    const query = search.trim().toLowerCase();

    return books.filter((book) => {
      const title = String(book.title || book.name || "").toLowerCase();

      const author = String(book.author || "").toLowerCase();

      const bookId = String(book.bookId || book.id || "").toLowerCase();

      const isbn = String(book.isbn || "").toLowerCase();

      const matchesSearch =
        !query ||
        title.includes(query) ||
        author.includes(query) ||
        bookId.includes(query) ||
        isbn.includes(query);

      const matchesCategory =
        categoryFilter === "All" || book.category === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [books, search, categoryFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = books.length;

    const available = books.filter(
      (book) => Number(book.availableQuantity ?? book.quantity ?? 0) > 0,
    ).length;

    const issued = books.filter(
      (book) => Number(book.issuedQuantity || 0) > 0,
    ).length;

    const unavailable = books.filter(
      (book) => Number(book.availableQuantity ?? book.quantity ?? 0) <= 0,
    ).length;

    return {
      total,
      available,
      issued,
      unavailable,
    };
  }, [books]);

  // Delete book
  const handleDelete = async (book) => {
    const bookId = book.bookId || book.id;

    const issuedQuantity = Number(book.issuedQuantity || 0);

    if (issuedQuantity > 0) {
      toast.error("This book cannot be deleted while it is issued.");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete "${book.title || book.name}"?`,
    );

    if (!confirmed) return;

    try {
      /*
        Firebase document ID:
        1. firestoreId if available
        2. id if it is Firebase document ID
      */

      const firestoreId =
        book.firestoreId ||
        book.firebaseId ||
        (book.id && !String(book.id).startsWith("BOOK-") ? book.id : null);

      if (firestoreId) {
        await deleteBookFromFirestore(firestoreId);
      }

      const updatedBooks = books.filter(
        (item) => String(item.bookId || item.id) !== String(bookId),
      );

      setBooks(updatedBooks);

      setSelectedBook(null);

      toast.success("Book deleted successfully.");
    } catch (error) {
      console.error("Delete book error:", error);

      toast.error("Unable to delete book from Firebase.");
    }
  };

  const clearFilters = () => {
    setSearch("");
    setCategoryFilter("All");
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <button
              onClick={() => navigate("/admin-dashboard")}
              className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-blue-600"
            >
              <ArrowLeft size={18} />
              Back to Dashboard
            </button>

            <h1 className="text-2xl font-bold text-slate-800 md:text-3xl">
              Book Management
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Manage all books available in the library
            </p>
          </div>

          <button
            onClick={() => navigate("/add-book")}
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            <Plus size={20} />
            Add New Book
          </button>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100">
              <Library size={22} className="text-blue-600" />
            </div>

            <p className="text-sm text-slate-500">Total Books</p>

            <p className="mt-1 text-2xl font-bold text-slate-800">
              {stats.total}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100">
              <CheckCircle size={22} className="text-emerald-600" />
            </div>

            <p className="text-sm text-slate-500">Available</p>

            <p className="mt-1 text-2xl font-bold text-slate-800">
              {stats.available}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-orange-100">
              <BookOpen size={22} className="text-orange-600" />
            </div>

            <p className="text-sm text-slate-500">Currently Issued</p>

            <p className="mt-1 text-2xl font-bold text-slate-800">
              {stats.issued}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-red-100">
              <AlertCircle size={22} className="text-red-600" />
            </div>

            <p className="text-sm text-slate-500">Unavailable</p>

            <p className="mt-1 text-2xl font-bold text-slate-800">
              {stats.unavailable}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search
                size={19}
                className="absolute left-3 top-3.5 text-slate-400"
              />

              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by title, author, Book ID or ISBN..."
                className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-4 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>

            {(search || categoryFilter !== "All") && (
              <button
                onClick={clearFilters}
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

            <p className="text-sm text-slate-500">Loading books...</p>
          </div>
        )}

        {/* Empty */}
        {!loading && filteredBooks.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <BookOpen size={45} className="mx-auto text-slate-300" />

            <h2 className="mt-4 text-lg font-bold text-slate-800">
              No books found
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Try another search or add a new book.
            </p>
          </div>
        )}

        {/* Desktop */}
        {!loading && filteredBooks.length > 0 && (
          <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200">
                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                      Book
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                      Author
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                      Category
                    </th>

                    <th className="px-5 py-4 text-center text-xs font-bold uppercase tracking-wide text-slate-500">
                      Quantity
                    </th>

                    <th className="px-5 py-4 text-center text-xs font-bold uppercase tracking-wide text-slate-500">
                      Status
                    </th>

                    <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredBooks.map((book) => {
                    const quantity = Number(book.quantity || 0);

                    const availableQuantity = Number(
                      book.availableQuantity ?? quantity,
                    );

                    const issuedQuantity = Number(book.issuedQuantity || 0);

                    const isAvailable = availableQuantity > 0;

                    return (
                      <tr
                        key={book.bookId || book.id}
                        className="border-b border-slate-100 transition hover:bg-slate-50"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
                              {book.image ? (
                                <img
                                  src={book.image}
                                  alt={book.title || book.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <BookOpen
                                  size={20}
                                  className="text-slate-400"
                                />
                              )}
                            </div>

                            <div>
                              <p className="font-semibold text-slate-800">
                                {book.title || book.name || "Untitled Book"}
                              </p>

                              <p className="text-xs text-slate-500">
                                {book.bookId || book.id}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {book.author || "Unknown Author"}
                        </td>

                        <td className="px-5 py-4">
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                            {book.category || "General"}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-center">
                          <p className="font-semibold text-slate-800">
                            {availableQuantity} / {quantity}
                          </p>

                          <p className="text-xs text-slate-500">
                            {issuedQuantity} issued
                          </p>
                        </td>

                        <td className="px-5 py-4 text-center">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              isAvailable
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {isAvailable ? "Available" : "Unavailable"}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setSelectedBook(book)}
                              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                            >
                              View
                            </button>

                            <button
                              onClick={() => handleDelete(book)}
                              className="rounded-lg p-2 text-red-500 transition hover:bg-red-50"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Mobile */}
        {!loading && filteredBooks.length > 0 && (
          <div className="grid gap-4 md:hidden">
            {filteredBooks.map((book) => {
              const quantity = Number(book.quantity || 0);

              const availableQuantity = Number(
                book.availableQuantity ?? quantity,
              );

              const issuedQuantity = Number(book.issuedQuantity || 0);

              return (
                <div
                  key={book.bookId || book.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex gap-3">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
                      {book.image ? (
                        <img
                          src={book.image}
                          alt={book.title || book.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <BookOpen size={23} className="text-slate-400" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-bold text-slate-800">
                        {book.title || book.name || "Untitled Book"}
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        {book.author || "Unknown Author"}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        {book.bookId || book.id}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">Available</p>

                      <p className="mt-1 font-bold text-slate-800">
                        {availableQuantity}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">Issued</p>

                      <p className="mt-1 font-bold text-slate-800">
                        {issuedQuantity}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      onClick={() => setSelectedBook(book)}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600"
                    >
                      View
                    </button>

                    <button
                      onClick={() => handleDelete(book)}
                      className="rounded-lg bg-red-50 p-2 text-red-500"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  Book Details
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Complete information about this book
                </p>
              </div>

              <button
                onClick={() => setSelectedBook(null)}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-slate-500">Title</p>

                <p className="mt-1 font-semibold text-slate-800">
                  {selectedBook.title || selectedBook.name || "Untitled Book"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-slate-500">Author</p>

                  <p className="mt-1 text-sm text-slate-800">
                    {selectedBook.author || "Unknown"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-500">Category</p>

                  <p className="mt-1 text-sm text-slate-800">
                    {selectedBook.category || "General"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-slate-500">Book ID</p>

                  <p className="mt-1 text-sm text-slate-800">
                    {selectedBook.bookId || selectedBook.id}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-500">ISBN</p>

                  <p className="mt-1 text-sm text-slate-800">
                    {selectedBook.isbn || "N/A"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-slate-50 p-3 text-center">
                  <p className="text-xs text-slate-500">Total</p>

                  <p className="mt-1 font-bold text-slate-800">
                    {selectedBook.quantity || 0}
                  </p>
                </div>

                <div className="rounded-xl bg-emerald-50 p-3 text-center">
                  <p className="text-xs text-emerald-600">Available</p>

                  <p className="mt-1 font-bold text-emerald-700">
                    {selectedBook.availableQuantity ??
                      selectedBook.quantity ??
                      0}
                  </p>
                </div>

                <div className="rounded-xl bg-orange-50 p-3 text-center">
                  <p className="text-xs text-orange-600">Issued</p>

                  <p className="mt-1 font-bold text-orange-700">
                    {selectedBook.issuedQuantity || 0}
                  </p>
                </div>
              </div>

              {selectedBook.description && (
                <div>
                  <p className="text-xs font-medium text-slate-500">
                    Description
                  </p>

                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {selectedBook.description}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedBook(null)}
                className="rounded-xl bg-slate-800 px-5 py-3 font-semibold text-white transition hover:bg-slate-900"
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

export default Books;
