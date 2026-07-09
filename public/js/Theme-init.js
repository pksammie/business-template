// Applies the saved theme to every page as early as possible, so the
// selected theme is consistent site-wide (not just on the homepage) and
// there's no flash of the wrong theme before the page finishes loading.
(function () {
  var saved = localStorage.getItem("theme");
  document.body.dataset.theme = saved || "dark";
})();