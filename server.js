const express = require("express");
const path = require("path");
const cors = require("cors");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// Serve all your static website assets from the public directory
app.use(express.static(path.join(__dirname, "public")));

// Suppress background favicon errors
app.get("/favicon.ico", (req, res) => res.status(204).end());

// Storefront Core Pages Routing
app.get("/", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "index.html")),
);
app.get("/cart", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "cart.html")),
);
app.get("/admin", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "admin-guard.html")),
);
app.get("/admin-panel", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "admin.html")),
);
app.get("/checkout", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "checkout.html")),
);
app.get("/decision-page", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "decision-page.html")),
);
app.get("/decision-page.html", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "decision-page.html")),
);

// Brand Informational Pages Routing
app.get("/about", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "about.html")),
);
app.get("/contact-us", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "contact-us.html")),
);
app.get("/login", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "login.html")),
);
app.get("/register", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "register.html")),
);
app.get("/developer", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "developer.html")),
);
app.get("/orders", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "orders.html")),
);

app.get("/orders.html", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "orders.html")),
);
app.get("/complaint", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "complaint.html")),
);
app.get("/complaint.html", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "complaint.html")),
);
app.get("/forgot-password", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "forgot-password.html"));
});

// Catch-all route to prevent raw text error dumps
app.use((req, res) => {
  res.status(404).redirect("/");
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});