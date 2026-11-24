import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import {
  UserPlus,
  User,
  Mail,
  Phone,
  Lock,
  Camera,
  Save,
  ArrowLeft,
  Library,
  CheckCircle,
  RefreshCw,
} from "lucide-react";

import {
  addStudentToFirestore,
  getStudentByEmail,
  getStudentsFromFirestore,
} from "../../firebase/studentService";

/* =========================
   Compress Student Photo
========================= */

const compressImage = (file) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve("");
      return;
    }

    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement("canvas");

        const MAX_SIZE = 500;

        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);

            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);

            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");

        if (!ctx) {
          reject(new Error("Unable to create image canvas"));

          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        const compressed = canvas.toDataURL("image/jpeg", 0.7);

        resolve(compressed);
      };

      img.onerror = () => {
        reject(new Error("Unable to process image"));
      };

      img.src = event.target.result;
    };

    reader.onerror = () => {
      reject(new Error("Unable to read image"));
    };

    reader.readAsDataURL(file);
  });
};

/* =========================
   Get Local Students
========================= */

const getLocalStudents = () => {
  try {
    const savedStudents = localStorage.getItem("students");

    const students = savedStudents ? JSON.parse(savedStudents) : [];

    return Array.isArray(students) ? students : [];
  } catch (error) {
    console.error("Unable to read local students:", error);

    return [];
  }
};

/* =========================
   Generate Generic Library ID
========================= */

const generateLibraryId = (students) => {
  const year = new Date().getFullYear();

  const existingNumbers = students
    .map((student) => {
      const id = student?.libraryId || student?.studentId || student?.id || "";

      /*
          Supports:

          LIB-2026-0001
          LIB-2026-0002
          LIB-2026-0003
        */

      const match = String(id).match(new RegExp(`LIB-${year}-(\\d+)`));

      return match ? Number(match[1]) : 0;
    })
    .filter(Boolean);

  const nextNumber =
    existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;

  return `LIB-${year}-${String(nextNumber).padStart(4, "0")}`;
};

/* =========================
   Add Student
========================= */

const AddStudent = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    photo: "",
  });

  const [loading, setLoading] = useState(false);

  const [photoPreview, setPhotoPreview] = useState("");

  /* =========================
     Handle Input
  ========================= */

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  /* =========================
     Handle Photo
  ========================= */

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image");

      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Photo must be smaller than 5MB");

      return;
    }

    try {
      const compressedPhoto = await compressImage(file);

      setFormData((prev) => ({
        ...prev,
        photo: compressedPhoto,
      }));

      setPhotoPreview(compressedPhoto);

      toast.success("Photo selected");
    } catch (error) {
      console.error(error);

      toast.error("Unable to process photo");
    }
  };

  /* =========================
     Submit
  ========================= */

  const handleSubmit = async (e) => {
    e.preventDefault();

    const name = formData.name.trim();

    const email = formData.email.trim().toLowerCase();

    const phone = formData.phone.trim();

    /* -------------------------
       Validation
    ------------------------- */

    if (!name) {
      toast.error("Please enter student name");

      return;
    }

    if (!email) {
      toast.error("Please enter email");

      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email");

      return;
    }

    if (!phone) {
      toast.error("Please enter phone number");

      return;
    }

    if (!/^[0-9]{10}$/.test(phone)) {
      toast.error("Phone number must contain 10 digits");

      return;
    }

    if (!formData.password) {
      toast.error("Please enter password");

      return;
    }

    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters");

      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");

      return;
    }

    setLoading(true);

    try {
      /* -------------------------
         Get Local Students
      ------------------------- */

      const localStudents = getLocalStudents();

      /* -------------------------
         Get Firebase Students
      ------------------------- */

      let firebaseStudents = [];

      try {
        firebaseStudents = await getStudentsFromFirestore();

        if (!Array.isArray(firebaseStudents)) {
          firebaseStudents = [];
        }
      } catch (firebaseError) {
        console.error("Unable to fetch Firebase students:", firebaseError);

        /*
          We don't stop here because
          localStorage may still contain
          valid student data.
        */

        firebaseStudents = [];
      }

      /* -------------------------
         Combine Students
      ------------------------- */

      const allStudents = [...localStudents, ...firebaseStudents];

      /* -------------------------
         Duplicate Email - Local
      ------------------------- */

      const localEmailExists = localStudents.some(
        (student) =>
          String(student?.email || "")
            .trim()
            .toLowerCase() === email,
      );

      if (localEmailExists) {
        toast.error("A student with this email already exists");

        setLoading(false);

        return;
      }

      /* -------------------------
         Duplicate Email - Firebase
      ------------------------- */

      let firebaseEmailExists = false;

      try {
        const existingFirebaseStudent = await getStudentByEmail(email);

        firebaseEmailExists = Boolean(existingFirebaseStudent);
      } catch (firebaseError) {
        console.error("Firebase email check error:", firebaseError);
      }

      if (firebaseEmailExists) {
        toast.error("A student with this email already exists");

        setLoading(false);

        return;
      }

      /* -------------------------
         Duplicate Phone
      ------------------------- */

      const phoneExists = allStudents.some(
        (student) => String(student?.phone || "").trim() === phone,
      );

      if (phoneExists) {
        toast.error("A student with this phone number already exists");

        setLoading(false);

        return;
      }

      /* -------------------------
         Generate Library ID
      ------------------------- */

      const libraryId = generateLibraryId(allStudents);

      const now = new Date().toISOString();

      /* -------------------------
         Student Object
      ------------------------- */

      const newStudent = {
        id: libraryId,

        studentId: libraryId,

        libraryId,

        name,

        fullName: name,

        email,

        phone,

        password: formData.password,

        studentPassword: formData.password,

        photo: formData.photo || "",

        /*
          Keep image empty.

          Photo is already stored in
          the photo field.
        */

        image: "",

        status: "Active",

        issuedBooksCount: 0,

        returnedBooksCount: 0,

        fine: 0,

        createdAt: now,

        updatedAt: now,
      };

      /* -------------------------
         Save Student to Firebase
      ------------------------- */

      let firebaseStudent = null;

      try {
        firebaseStudent = await addStudentToFirestore(newStudent);

        if (firebaseStudent?.id) {
          /*
            Firestore document ID
            is kept locally so future
            updates can directly use it.
          */

          newStudent.firestoreId = firebaseStudent.id;

          newStudent.firebaseId = firebaseStudent.id;
        }

        toast.success("Student saved to Firebase");
      } catch (firebaseError) {
        console.error("Firebase student save error:", firebaseError);

        toast.error("Unable to save student to Firebase");

        setLoading(false);

        return;
      }

      /* -------------------------
         Save Student Locally
      ------------------------- */

      const updatedStudents = [...localStudents, newStudent];

      try {
        localStorage.setItem("students", JSON.stringify(updatedStudents));

        localStorage.setItem(
          "newRegisteredStudent",
          JSON.stringify(newStudent),
        );
      } catch (storageError) {
        console.error("Local storage error:", storageError);

        /*
          Firebase already contains
          the student at this point.
          We don't delete Firebase data
          because the actual registration
          was successful.
        */

        if (storageError?.name === "QuotaExceededError") {
          toast.error("Student saved to Firebase, but local storage is full.");
        } else {
          toast.error(
            "Student saved to Firebase, but local storage could not be updated.",
          );
        }

        setLoading(false);

        return;
      }

      /* -------------------------
         Student User
      ------------------------- */

      try {
        localStorage.setItem(
          "studentUser",
          JSON.stringify({
            ...newStudent,
            firestoreId: newStudent.firestoreId || "",
            firebaseId: newStudent.firebaseId || "",
          }),
        );
      } catch (error) {
        console.error("Unable to save student session:", error);
      }

      /* -------------------------
         Refresh Other Pages
      ------------------------- */

      window.dispatchEvent(new Event("libraryDataUpdated"));

      /* -------------------------
         Success
      ------------------------- */

      toast.success(`Student added successfully! Library ID: ${libraryId}`);

      setTimeout(() => {
        navigate("/student-management");
      }, 700);
    } catch (error) {
      console.error("Add student error:", error);

      toast.error("Something went wrong while adding student");
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     Reset Form
  ========================= */

  const handleReset = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      photo: "",
    });

    setPhotoPreview("");

    toast.success("Form cleared");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* =========================
          Header
      ========================= */}

      <div className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/admin-dashboard")}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
            >
              <ArrowLeft size={19} />
            </button>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
              <UserPlus size={21} />
            </div>

            <div>
              <h1 className="text-lg font-bold text-slate-900">Add Student</h1>

              <p className="text-sm text-slate-500">
                Register student in the digital library
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-2 rounded-full bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 sm:flex">
            <Library size={16} />
            Librarian Panel
          </div>
        </div>
      </div>

      {/* =========================
          Main
      ========================= */}

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Intro */}

        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900">
            Register New Student
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Create a digital library account for a student.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 lg:grid-cols-3">
            {/* =========================
                Photo Section
            ========================= */}

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5">
                <h3 className="font-semibold text-slate-900">Student Photo</h3>

                <p className="mt-1 text-xs text-slate-500">
                  Photo will appear on the Digital Library ID Card.
                </p>
              </div>

              <div className="flex flex-col items-center">
                <div className="relative mb-5">
                  <div className="flex h-36 w-36 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50">
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt="Student preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User size={55} className="text-indigo-300" />
                    )}
                  </div>

                  <label
                    htmlFor="studentPhoto"
                    className="absolute -bottom-2 -right-2 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg transition hover:bg-indigo-700"
                  >
                    <Camera size={18} />

                    <input
                      id="studentPhoto"
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                  </label>
                </div>

                <label
                  htmlFor="studentPhoto"
                  className="cursor-pointer rounded-xl border border-indigo-200 px-4 py-2 text-sm font-medium text-indigo-600 transition hover:bg-indigo-50"
                >
                  Choose Photo
                </label>

                <p className="mt-3 text-center text-xs text-slate-400">
                  JPG, PNG or WEBP
                  <br />
                  Maximum 5MB
                </p>

                {photoPreview && (
                  <div className="mt-4 flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                    <CheckCircle size={14} />
                    Photo ready
                  </div>
                )}
              </div>
            </div>

            {/* =========================
                Student Details
            ========================= */}

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
              <div className="mb-6">
                <h3 className="font-semibold text-slate-900">
                  Student Information
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Enter the student's basic details.
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                {/* Name */}

                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Full Name
                  </label>

                  <div className="relative">
                    <User
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Enter student full name"
                      className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                </div>

                {/* Email */}

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Email Address
                  </label>

                  <div className="relative">
                    <Mail
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="student@example.com"
                      className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                </div>

                {/* Phone */}

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Phone Number
                  </label>

                  <div className="relative">
                    <Phone
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="10 digit mobile number"
                      maxLength={10}
                      className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                </div>

                {/* Password */}

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Password
                  </label>

                  <div className="relative">
                    <Lock
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Minimum 6 characters"
                      className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                </div>

                {/* Confirm Password */}

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Confirm Password
                  </label>

                  <div className="relative">
                    <Lock
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Confirm password"
                      className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                </div>
              </div>

              {/* Auto ID Info */}

              <div className="mt-6 rounded-xl border border-indigo-100 bg-indigo-50 p-4">
                <div className="flex gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                    <Library size={17} />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-indigo-900">
                      Digital Library ID
                    </p>

                    <p className="mt-1 text-xs leading-5 text-indigo-700">
                      A unique ID such as{" "}
                      <span className="font-semibold">LIB-2026-0001</span> will
                      be generated automatically after registration.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* =========================
              Actions
          ========================= */}

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <RefreshCw size={17} />
              Clear Form
            </button>

            <button
              type="button"
              onClick={() => navigate("/student-management")}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <ArrowLeft size={17} />
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <RefreshCw size={17} className="animate-spin" />
                  Adding Student...
                </>
              ) : (
                <>
                  <Save size={17} />
                  Add Student
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default AddStudent;
