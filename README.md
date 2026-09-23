# Timeless — Luxury Fashion E-Commerce Platform

A full-stack e-commerce storefront for a curated fashion retailer shipping across Nigeria, with a complete admin back office, real-time notifications, and a moderated customer review system.

**Live demo:** _add your deployed URL here_

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla JavaScript (ES modules), HTML5, CSS3 — no framework |
| Backend / routing | Node.js + Express (static hosting + clean URL routing) |
| Database & Auth | Firebase (Firestore, Firebase Authentication) |
| Real-time updates | Firestore `onSnapshot` listeners (cart, notifications, live reviews) |
| Image uploads | Cloudinary upload widget |
| Location / shipping | `country-state-city` npm package + a custom Lagos-zone shipping calculator |
| Order flow | WhatsApp-based order handoff (no payment gateway integration) |
| Icons | Font Awesome |

---

## Features

### Customer-facing
- Product browsing, filtering and a decision/product-detail page with an image gallery
- Cart with live Firestore sync, quantity controls, and batch clear
- Checkout with Nigeria-wide shipping cost calculation (state/LGA-aware) and a WhatsApp order handoff
- Order history
- Reviews: star ratings, photos, likes, editing, and a low-rating feedback flow (1–2★ reviews prompt for a reason and require admin approval before going public)
- Back-in-stock notifications: customers can ask to be notified when a sold-out size restocks
- Complaint / support ticket submission tied to a specific order
- A small AI-assisted review helper ("SamAi") for drafting reviews
- Real-time notification bell with unread badge, plus toast notifications for order/review/complaint updates
- Light/dark theme support

### Admin
- Product CRUD with size/stock management and Cloudinary image uploads
- Paginated live product inventory (10 per page)
- Order management
- Customer review moderation: approve pending (1–2★) reviews, reply, feature/unfeature (with automatic customer notification), delete
- Complaint management with status tracking and customer replies
- Unread-count badges (capped at 99+) on the Reviews and Complaints dashboard buttons
- A dedicated admin notification popup for new orders/reviews/complaints

---

## Project Structure

```
business-template/
├── server.js                 # Express server: static file serving + clean URL routes
├── firebase.json             # Points the Firebase CLI at the rules/indexes below
├── firestore.rules           # Firestore security rules (server-enforced, not just UI checks)
├── firestore.indexes.json    # Composite indexes required by the app's queries
├── package.json
└── public/
    ├── *.html                # One HTML file per page (no SPA routing)
    ├── css/                  # One stylesheet per page/feature area
    ├── js/                   # One ES module per page/feature area
    ├── images/
    └── sounds/
```

Each page is a standalone HTML file with its own script and (usually) its own stylesheet — there's no bundler or build step. `firebase.js` holds the shared Firebase app/auth/db instances that every other module imports.

---

## Getting Started

### Prerequisites
- Node.js 18+
- A Firebase project with Firestore and Authentication (Email/Password + Google) enabled

### Setup
1. Clone the repo and install dependencies:
   ```bash
   npm install
   ```
2. Create a Firebase project and drop your web app config into `public/js/firebase.js` (the `firebaseConfig` object). This is safe to be public — the Firebase Web API key only identifies your project; actual data access is controlled entirely by `firestore.rules` below.
3. Deploy the Firestore rules and indexes:
   ```bash
   firebase deploy --only firestore:rules,firestore:indexes
   ```
4. In Firestore, create an `admins` collection and add a document whose ID is your own Firebase Auth UID (any fields) — this is what grants admin access to `/admin-panel`, `/admin-reviews`, and `/admin-complaints`.
5. (Optional) Set your Cloudinary upload widget details in `admin.html` / `edit-product.js` if you want product image uploads to work.
6. Run the server:
   ```bash
   npm start        # or: npm run dev  (nodemon, auto-restart)
   ```
7. Visit `http://localhost:3000`.

### Environment
This project has no required `.env` variables for local development — Firebase config lives client-side by design (see step 2 above). If you wire up Google Analytics / Meta Pixel, set the IDs directly in `public/js/analytics.js`.

---

## Security Notes

Data access is enforced by **Firestore security rules** (`firestore.rules`), not just client-side checks — every collection has explicit rules for who can read/create/update/delete, down to which specific fields a given role is allowed to change. Client-side admin guards exist too (redirecting non-admins away from admin pages), but they're a UX convenience on top of the rules, not the actual security boundary.

---

## Known Limitations

- No automated tests yet
- No payment gateway — checkout hands off to WhatsApp for manual order confirmation
- Shipping cost is a flat zone-based table, not a live courier rate API
