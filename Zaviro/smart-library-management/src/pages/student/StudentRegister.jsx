import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import {
  ArrowLeft,
  BookOpen,
  Camera,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Phone,
  UserRound,
} from "lucide-react";

import {
  addStudentToFirestore,
  getStudentByEmail,
  getStudentsFromFirestore,
} from "../../firebase/studentService";

/* =====================================================
   DEFAULT STUDENT DATA
===================================================== */

const DEFAULT_STUDENT_STATUS = "Active";

/* =====================================================
   COMPRESS STUDENT PHOTO
===================================================== */

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
            height = Math.round(
              (height * MAX_SIZE) / width
            );

            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round(
              (width * MAX_SIZE) / height
            );

            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext("2d");

        if (!context) {
          reject(
            new Error("Unable to process image.")
          );

          return;
        }

        context.drawImage(
          img,
          0,
          0,
          width,
          height
        );

        const compressed = canvas.toDataURL(
          "image/jpeg",
          0.7
        );

        resolve(compressed);
      };

      img.onerror = () => {
        reject(
          new Error("Unable to process image.")
        );
      };

      img.src = event.target.result;
    };

    reader.onerror = () => {
      reject(
        new Error("Unable to read image.")
      );
    };

    reader.readAsDataURL(file);
  });
};

/* =====================================================
   GET STUDENT LIBRARY ID
===================================================== */

const getStudentLibraryId = (student) => {
  return String(
    student?.libraryId ||
      student?.studentLibraryId ||
      student?.studentId ||
      student?.id ||
      ""
  ).trim();
};

/* =====================================================
   GET STUDENT EMAIL
===================================================== */

const getStudentEmail = (student) => {
  return String(
    student?.email || ""
  )
    .trim()
    .toLowerCase();
};

/* =====================================================
   GET STUDENT PHONE
===================================================== */

const getStudentPhone = (student) => {
  return String(
    student?.phone || ""
  ).trim();
};

/* =====================================================
   GENERATE LIBRARY ID

   New format:
   LIB-2026-001

   Existing old format:
   ICH-LIB-2026-001

   Both formats are recognized while generating
   the next unique number.
===================================================== */

const generateLibraryId = (students) => {
  const year = new Date().getFullYear();

  const existingNumbers = students
    .map((student) => {
      const libraryId =
        getStudentLibraryId(student);

      const normalizedId = String(
        libraryId
      ).trim();

      const newFormatMatch =
        normalizedId.match(
          /^LIB-\d{4}-(\d+)$/
        );

      const oldFormatMatch =
        normalizedId.match(
          /^ICH-LIB-\d{4}-(\d+)$/
        );

      if (newFormatMatch) {
        return Number(newFormatMatch[1]);
      }

      if (oldFormatMatch) {
        return Number(oldFormatMatch[1]);
      }

      return 0;
    })
    .filter(
      (number) => number > 0
    );

  const nextNumber =
    existingNumbers.length > 0
      ? Math.max(...existingNumbers) + 1
      : 1;

  return `LIB-${year}-${String(
    nextNumber
  ).padStart(3, "0")}`;
};

/* =====================================================
   CHECK LOCAL STUDENT EMAIL
===================================================== */

const findLocalStudentByEmail = (
  students,
  email
) => {
  return students.find(
    (student) =>
      getStudentEmail(student) === email
  );
};

/* =====================================================
   CHECK LOCAL STUDENT PHONE
===================================================== */

const findLocalStudentByPhone = (
  students,
  phone
) => {
  return students.find(
    (student) =>
      getStudentPhone(student) === phone
  );
};

/* =====================================================
   STUDENT REGISTER
===================================================== */

const StudentRegister = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [photo, setPhoto] = useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [loading, setLoading] =
    useState(false);

  /* =====================================================
     HANDLE INPUT
  ===================================================== */

  const handleChange = (event) => {
    const {
      name,
      value,
    } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  /* =====================================================
     HANDLE PHOTO
  ===================================================== */

  const handlePhotoChange = async (
    event
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error(
        "Please select a valid image."
      );

      event.target.value = "";

      return;
    }

    if (
      file.size >
      5 * 1024 * 1024
    ) {
      toast.error(
        "Photo must be smaller than 5MB."
      );

      event.target.value = "";

      return;
    }

    try {
      const compressedPhoto =
        await compressImage(file);

      setPhoto(compressedPhoto);

      toast.success(
        "Photo selected successfully."
      );
    } catch (error) {
      console.error(
        "Photo processing error:",
        error
      );

      toast.error(
        "Unable to process photo."
      );
    }
  };

  /* =====================================================
     HANDLE SUBMIT
  ===================================================== */

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    if (loading) {
      return;
    }

    /* =================================================
       CLEAN FORM DATA
    ================================================= */

    const name =
      formData.name.trim();

    const email =
      formData.email
        .trim()
        .toLowerCase();

    const phone =
      formData.phone.trim();

    const password =
      formData.password;

    const confirmPassword =
      formData.confirmPassword;

    /* =================================================
       VALIDATION
    ================================================= */

    if (!name) {
      toast.error(
        "Please enter your name."
      );

      return;
    }

    if (name.length < 2) {
      toast.error(
        "Name must contain at least 2 characters."
      );

      return;
    }

    if (!email) {
      toast.error(
        "Please enter your email."
      );

      return;
    }

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      toast.error(
        "Please enter a valid email."
      );

      return;
    }

    if (!phone) {
      toast.error(
        "Please enter your phone number."
      );

      return;
    }

    if (!/^\d{10}$/.test(phone)) {
      toast.error(
        "Please enter a valid 10-digit phone number."
      );

      return;
    }

    if (password.length < 6) {
      toast.error(
        "Password must contain at least 6 characters."
      );

      return;
    }

    if (password !== confirmPassword) {
      toast.error(
        "Passwords do not match."
      );

      return;
    }

    if (!photo) {
      toast.error(
        "Please upload your photo."
      );

      return;
    }

    setLoading(true);

    try {
      /* =================================================
         GET LOCAL STUDENTS
      ================================================= */

      let localStudents = [];

      try {
        const storedStudents =
          JSON.parse(
            localStorage.getItem(
              "students"
            ) || "[]"
          );

        localStudents = Array.isArray(
          storedStudents
        )
          ? storedStudents
          : [];
      } catch (storageError) {
        console.error(
          "Error reading local students:",
          storageError
        );

        localStudents = [];
      }

      /* =================================================
         CHECK LOCAL EMAIL
      ================================================= */

      const localEmailStudent =
        findLocalStudentByEmail(
          localStudents,
          email
        );

      if (localEmailStudent) {
        toast.error(
          "A student with this email already exists."
        );

        setLoading(false);

        return;
      }

      /* =================================================
         CHECK LOCAL PHONE
      ================================================= */

      const localPhoneStudent =
        findLocalStudentByPhone(
          localStudents,
          phone
        );

      if (localPhoneStudent) {
        toast.error(
          "A student with this phone number already exists."
        );

        setLoading(false);

        return;
      }

      /* =================================================
         CHECK FIRESTORE EMAIL
      ================================================= */

      let firestoreStudent = null;

      try {
        firestoreStudent =
          await getStudentByEmail(
            email
          );
      } catch (firestoreError) {
        console.error(
          "Firestore email check error:",
          firestoreError
        );

        toast.error(
          "Unable to connect with Firebase. Please check your internet connection."
        );

        setLoading(false);

        return;
      }

      if (firestoreStudent) {
        toast.error(
          "A student with this email already exists."
        );

        setLoading(false);

        return;
      }

      /* =================================================
         GET FIRESTORE STUDENTS

         Used to generate a unique Library ID.
      ================================================= */

      let firestoreStudents = [];

      try {
        firestoreStudents =
          await getStudentsFromFirestore();

        if (
          !Array.isArray(
            firestoreStudents
          )
        ) {
          firestoreStudents = [];
        }
      } catch (firestoreError) {
        console.error(
          "Firestore students fetch error:",
          firestoreError
        );

        toast.error(
          "Unable to load student data from Firebase."
        );

        setLoading(false);

        return;
      }

      /* =================================================
         COMBINE LOCAL + FIRESTORE STUDENTS

         Remove duplicate references so Library ID
         generation is reliable.
      ================================================= */

      const studentMap =
        new Map();

      [
        ...localStudents,
        ...firestoreStudents,
      ].forEach((student) => {
        const libraryId =
          getStudentLibraryId(
            student
          ).toLowerCase();

        if (libraryId) {
          studentMap.set(
            libraryId,
            student
          );
        }
      });

      const allKnownStudents =
        Array.from(
          studentMap.values()
        );

      /* =================================================
         GENERATE UNIQUE LIBRARY ID
      ================================================= */

      const libraryId =
        generateLibraryId(
          allKnownStudents
        );

      /* =================================================
         CURRENT DATE
      ================================================= */

      const now =
        new Date().toISOString();

      /* =================================================
         CREATE STUDENT OBJECT
      ================================================= */

      const newStudent = {
        id: libraryId,

        studentId: libraryId,

        libraryId: libraryId,

        studentLibraryId:
          libraryId,

        name: name,

        fullName: name,

        email: email,

        phone: phone,

        /*
         * Password is required by the current
         * frontend login system.
         *
         * studentService.js removes password
         * fields before Firestore save.
         */

        password: password,

        studentPassword:
          password,

        photo: photo,

        /*
         * Do not duplicate the Base64 image.
         */

        image: "",

        status:
          DEFAULT_STUDENT_STATUS,

        issuedBooksCount: 0,

        returnedBooksCount: 0,

        fine: 0,

        createdAt: now,

        updatedAt: now,
      };

      /* =================================================
         SAVE TO FIRESTORE FIRST
      ================================================= */

      let savedFirestoreStudent = null;

      try {
        savedFirestoreStudent =
          await addStudentToFirestore(
            newStudent
          );
      } catch (firestoreError) {
        console.error(
          "Firestore registration error:",
          firestoreError
        );

        toast.error(
          "Student could not be saved to Firebase. Please try again."
        );

        setLoading(false);

        return;
      }

      /* =================================================
         GET FIRESTORE DOCUMENT ID
      ================================================= */

      const firestoreId =
        savedFirestoreStudent?.id ||
        savedFirestoreStudent?.firestoreId ||
        savedFirestoreStudent?.firebaseId ||
        "";

      /* =================================================
         CREATE FINAL LOCAL STUDENT

         Keep Firebase IDs locally so other pages can
         update the same Firestore student document.
      ================================================= */

      const finalStudent = {
        ...newStudent,

        firestoreId,

        firebaseId: firestoreId,

        firebaseStudentId:
          firestoreId,

        syncedToFirebase:
          Boolean(firestoreId),

        syncedAt: now,
      };

      /* =================================================
         SAVE TO LOCAL STORAGE
      ================================================= */

      const updatedStudents = [
        ...localStudents,
        finalStudent,
      ];

      try {
        localStorage.setItem(
          "students",
          JSON.stringify(
            updatedStudents
          )
        );

        /* ---------------------------------------------
           Keep newly registered student
           available for Library Card.
        --------------------------------------------- */

        localStorage.setItem(
          "newRegisteredStudent",
          JSON.stringify(
            finalStudent
          )
        );

        /* ---------------------------------------------
           Existing application automatically
           logs the student in after registration.
        --------------------------------------------- */

        localStorage.setItem(
          "studentUser",
          JSON.stringify(
            finalStudent
          )
        );
      } catch (storageError) {
        console.error(
          "Local storage error:",
          storageError
        );

        toast.error(
          "Student was saved to Firebase, but local storage is full."
        );

        setLoading(false);

        return;
      }

      /* =================================================
         UPDATE APPLICATION DATA
      ================================================= */

      try {
        window.dispatchEvent(
          new Event(
            "libraryDataUpdated"
          )
        );
      } catch (eventError) {
        console.error(
          "Library update event error:",
          eventError
        );
      }

      /* =================================================
         SUCCESS
      ================================================= */

      console.log(
        "Student saved to Firestore:",
        savedFirestoreStudent
      );

      toast.success(
        `Registration successful! Your Library ID is ${libraryId}`
      );

      setTimeout(() => {
        navigate(
          "/library-card",
          {
            replace: true,
          }
        );
      }, 700);
    } catch (error) {
      console.error(
        "Student registration error:",
        error
      );

      toast.error(
        "Something went wrong. Please try again."
      );

      setLoading(false);
    }
  };

  /* =====================================================
     UI
  ===================================================== */

  return (
    <div className="min-h-screen bg-slate-50">
      {/* =================================================
          HEADER
      ================================================= */}

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="flex items-center gap-3"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white">
              <BookOpen size={22} />
            </div>

            <div>
              <h1 className="font-bold text-slate-900">
                Smart Library
              </h1>

              <p className="text-xs text-slate-500">
                Library Management System
              </p>
            </div>
          </Link>

          <Link
            to="/student-login"
            className="flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-slate-900"
          >
            <ArrowLeft size={17} />

            Login
          </Link>
        </div>
      </header>

      {/* =================================================
          MAIN
      ================================================= */}

      <main className="mx-auto flex max-w-6xl justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="w-full max-w-2xl">
          {/* =================================================
              HEADING
          ================================================= */}

          <div className="mb-7 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
              <UserRound size={27} />
            </div>

            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Student Registration
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Create your account and get your
              Digital Library ID automatically.
            </p>
          </div>

          {/* =================================================
              FORM CARD
          ================================================= */}

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
            <form
              onSubmit={handleSubmit}
              className="space-y-6"
            >
              {/* =================================================
                  PHOTO
              ================================================= */}

              <div>
                <label className="mb-3 block text-sm font-semibold text-slate-700">
                  Student Photo
                </label>

                <div className="flex flex-col items-center gap-4 sm:flex-row">
                  <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50">
                    {photo ? (
                      <img
                        src={photo}
                        alt="Student preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Camera
                        size={30}
                        className="text-slate-400"
                      />
                    )}
                  </div>

                  <div>
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">
                      <Camera size={17} />

                      {photo
                        ? "Change Photo"
                        : "Upload Photo"}

                      <input
                        type="file"
                        accept="image/*"
                        onChange={
                          handlePhotoChange
                        }
                        className="hidden"
                      />
                    </label>

                    <p className="mt-2 text-xs text-slate-500">
                      JPG, PNG or WEBP
                      <br />
                      Maximum 5MB
                    </p>
                  </div>
                </div>
              </div>

              {/* =================================================
                  NAME
              ================================================= */}

              <div>
                <label
                  htmlFor="name"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Full Name
                </label>

                <div className="relative">
                  <UserRound
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={
                      formData.name
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Enter your full name"
                    autoComplete="name"
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </div>
              </div>

              {/* =================================================
                  EMAIL
              ================================================= */}

              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Email Address
                </label>

                <div className="relative">
                  <Mail
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={
                      formData.email
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="student@example.com"
                    autoComplete="email"
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </div>
              </div>

              {/* =================================================
                  PHONE
              ================================================= */}

              <div>
                <label
                  htmlFor="phone"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Phone Number
                </label>

                <div className="relative">
                  <Phone
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={
                      formData.phone
                    }
                    onChange={(event) => {
                      const numericValue =
                        event.target.value.replace(
                          /\D/g,
                          ""
                        );

                      setFormData(
                        (previous) => ({
                          ...previous,
                          phone:
                            numericValue,
                        })
                      );
                    }}
                    placeholder="10-digit mobile number"
                    autoComplete="tel"
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </div>
              </div>

              {/* =================================================
                  PASSWORD
              ================================================= */}

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Password
                </label>

                <div className="relative">
                  <LockKeyhole
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="password"
                    name="password"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    value={
                      formData.password
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Create a password"
                    autoComplete="new-password"
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-11 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        (previous) =>
                          !previous
                      )
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
                  >
                    {showPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>

                <p className="mt-2 text-xs text-slate-500">
                  Minimum 6 characters
                </p>
              </div>

              {/* =================================================
                  CONFIRM PASSWORD
              ================================================= */}

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Confirm Password
                </label>

                <div className="relative">
                  <LockKeyhole
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={
                      showConfirmPassword
                        ? "text"
                        : "password"
                    }
                    value={
                      formData.confirmPassword
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Confirm your password"
                    autoComplete="new-password"
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-11 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword(
                        (previous) =>
                          !previous
                      )
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
              </div>

              {/* =================================================
                  INFORMATION
              ================================================= */}

              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                <div className="flex gap-3">
                  <CheckCircle2
                    size={20}
                    className="mt-0.5 shrink-0 text-blue-600"
                  />

                  <div>
                    <p className="text-sm font-semibold text-blue-900">
                      Your Digital Library ID
                    </p>

                    <p className="mt-1 text-xs leading-5 text-blue-700">
                      After registration, a unique
                      Library ID will be generated
                      automatically. Your Digital
                      Library ID card will also be
                      created using your registered
                      details.
                    </p>
                  </div>
                </div>
              </div>

              {/* =================================================
                  SUBMIT
              ================================================= */}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 px-5 py-3.5 text-sm font-bold text-white shadow-sm transition hover:from-blue-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />

                    Connecting to Library
                    Database...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} />

                    Create Student
                    Account
                  </>
                )}
              </button>
            </form>

            {/* =================================================
                LOGIN
            ================================================= */}

            <div className="mt-6 border-t border-slate-100 pt-6 text-center">
              <p className="text-sm text-slate-500">
                Already have an account?{" "}

                <Link
                  to="/student-login"
                  className="font-bold text-blue-600 hover:text-blue-700"
                >
                  Student Login
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default StudentRegister;