import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import { Toaster } from "react-hot-toast";

import Menu from "./component/Menu";

// =====================================================
// PUBLIC PAGES
// =====================================================

import Home from "./pages/Home";

import AdminLogin from "./pages/admin/AdminLogin";

import StudentLogin from "./pages/student/StudentLogin";
import StudentRegister from "./pages/student/StudentRegister";

// =====================================================
// ADMIN PAGES
// =====================================================

import AdminDashboard from "./pages/admin/AdminDashboard";
import AddBook from "./pages/admin/AddBook";
import AddStudent from "./pages/admin/AddStudent";
import BookIssue from "./pages/admin/BookIssue";
import ReturnBook from "./pages/admin/ReturnBook";
import Books from "./pages/admin/Books";
import FineManagement from "./pages/admin/FineManagement";
import StudentManagement from "./pages/admin/StudentManagement";
import Reports from "./pages/admin/Reports";
import LibrarySettings from "./pages/admin/LibrarySettings";
import Receipt from "./pages/admin/Receipt";
import AdminNotifications from "./pages/admin/AdminNotifications";
import AdminReceipts from "./pages/admin/AdminReceipts";

// =====================================================
// STUDENT PAGES
// =====================================================

import StudentDashboard from "./pages/student/StudentDashboard";
import StudentBooks from "./pages/student/StudentBooks";
import StudentBookDetails from "./pages/student/StudentBookDetails";
import MyBooks from "./pages/student/MyBooks";
import LibraryCard from "./pages/student/LibraryCard";
import MyReceipts from "./pages/student/MyReceipts";
import Notifications from "./pages/student/Notifications";

// =====================================================
// ADMIN PROTECTED ROUTE
// =====================================================

const AdminProtectedRoute = ({ children }) => {
  const librarian = localStorage.getItem("librarian");

  if (!librarian) {
    return (
      <Navigate
        to="/admin-login"
        replace
      />
    );
  }

  return children;
};

// =====================================================
// STUDENT PROTECTED ROUTE
// =====================================================

const StudentProtectedRoute = ({ children }) => {
  const studentUser = localStorage.getItem("studentUser");

  if (!studentUser) {
    return (
      <Navigate
        to="/student-login"
        replace
      />
    );
  }

  return children;
};

// =====================================================
// RECEIPT PROTECTED ROUTE
// =====================================================

const ReceiptProtectedRoute = ({ children }) => {
  const librarian = localStorage.getItem("librarian");

  const studentUser = localStorage.getItem("studentUser");

  if (!librarian && !studentUser) {
    return (
      <Navigate
        to="/"
        replace
      />
    );
  }

  return children;
};

// =====================================================
// APP
// =====================================================

const App = () => {
  return (
    <BrowserRouter>
      {/* =================================================
          GLOBAL TOASTER
      ================================================= */}

      <Toaster
        position="top-right"
        reverseOrder={false}
        toastOptions={{
          duration: 3000,
        }}
      />

      {/* =================================================
          APPLICATION ROUTES
      ================================================= */}

      <Routes>
        {/* =================================================
            PUBLIC ROUTES
        ================================================= */}

        <Route
          path="/"
          element={<Home />}
        />

        <Route
          path="/admin-login"
          element={<AdminLogin />}
        />

        <Route
          path="/student-login"
          element={<StudentLogin />}
        />

        <Route
          path="/student-register"
          element={<StudentRegister />}
        />

        {/* =================================================
            ADMIN ROUTES
        ================================================= */}

        <Route
          path="/admin-dashboard"
          element={
            <AdminProtectedRoute>
              <AdminDashboard />
            </AdminProtectedRoute>
          }
        />

        <Route
          path="/add-book"
          element={
            <AdminProtectedRoute>
              <AddBook />
            </AdminProtectedRoute>
          }
        />

        <Route
          path="/add-student"
          element={
            <AdminProtectedRoute>
              <AddStudent />
            </AdminProtectedRoute>
          }
        />

        <Route
          path="/book-issue"
          element={
            <AdminProtectedRoute>
              <BookIssue />
            </AdminProtectedRoute>
          }
        />

        <Route
          path="/return-book"
          element={
            <AdminProtectedRoute>
              <ReturnBook />
            </AdminProtectedRoute>
          }
        />

        <Route
          path="/books"
          element={
            <AdminProtectedRoute>
              <Books />
            </AdminProtectedRoute>
          }
        />

        <Route
          path="/fine-management"
          element={
            <AdminProtectedRoute>
              <FineManagement />
            </AdminProtectedRoute>
          }
        />

        <Route
          path="/student-management"
          element={
            <AdminProtectedRoute>
              <StudentManagement />
            </AdminProtectedRoute>
          }
        />

        <Route
          path="/reports"
          element={
            <AdminProtectedRoute>
              <Reports />
            </AdminProtectedRoute>
          }
        />

        <Route
          path="/library-settings"
          element={
            <AdminProtectedRoute>
              <LibrarySettings />
            </AdminProtectedRoute>
          }
        />

        <Route
          path="/admin-notifications"
          element={
            <AdminProtectedRoute>
              <AdminNotifications />
            </AdminProtectedRoute>
          }
        />

        <Route
          path="/admin-receipts"
          element={
            <AdminProtectedRoute>
              <AdminReceipts />
            </AdminProtectedRoute>
          }
        />

        {/* =================================================
            RECEIPT ROUTE
        ================================================= */}

        <Route
          path="/receipt/:issueId"
          element={
            <ReceiptProtectedRoute>
              <Receipt />
            </ReceiptProtectedRoute>
          }
        />

        {/* =================================================
            STUDENT ROUTES
        ================================================= */}

        <Route
          path="/student-dashboard"
          element={
            <StudentProtectedRoute>
              <StudentDashboard />
            </StudentProtectedRoute>
          }
        />

        <Route
          path="/student-books"
          element={
            <StudentProtectedRoute>
              <StudentBooks />
            </StudentProtectedRoute>
          }
        />

        <Route
          path="/student-book/:bookId"
          element={
            <StudentProtectedRoute>
              <StudentBookDetails />
            </StudentProtectedRoute>
          }
        />

        <Route
          path="/my-books"
          element={
            <StudentProtectedRoute>
              <MyBooks />
            </StudentProtectedRoute>
          }
        />

        <Route
          path="/library-card"
          element={
            <StudentProtectedRoute>
              <LibraryCard />
            </StudentProtectedRoute>
          }
        />

        <Route
          path="/my-receipts"
          element={
            <StudentProtectedRoute>
              <MyReceipts />
            </StudentProtectedRoute>
          }
        />

        <Route
          path="/notifications"
          element={
            <StudentProtectedRoute>
              <Notifications />
            </StudentProtectedRoute>
          }
        />

        {/* =================================================
            FALLBACK ROUTE
        ================================================= */}

        <Route
          path="*"
          element={
            <Navigate
              to="/"
              replace
            />
          }
        />
      </Routes>

      {/* =================================================
          GLOBAL MENU
      ================================================= */}

      <Menu />
    </BrowserRouter>
  );
};

export default App;