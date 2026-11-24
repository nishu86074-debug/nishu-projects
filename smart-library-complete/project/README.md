# Smart Library Management System

React + Vite + Tailwind v4 + Firebase (Firestore).

## Run
```
npm install
npm run dev      # development
npm run build    # production build
```

## Firebase setup
0. Firebase Console -> Authentication -> Sign-in method -> enable Email/Password.
1. Firebase Console -> Firestore Database -> Create database.
2. Paste `firestore.rules` in Rules tab and Publish (development rules; tighten for production).
3. Config is in `src/firebase/firebaseConfig.js` (replace with your own project keys if needed).

## Logins
- Librarian: create the user yourself in Firebase Console -> Authentication -> Users -> Add user (Email/Password must be enabled). Log in at /admin-login with that email/password.
- Student: register at `/student-register`

## Admin routes
/admin-dashboard, /books, /add-book, /student-management, /add-student, /book-issue,
/return-book, /fine-management, /reports, /admin-notifications, /admin-receipts, /library-settings
