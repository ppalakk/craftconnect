/**
 * Authentication middleware & helpers for CraftConnect
 */

function sessionUser(req) {
  return (req.session && req.session.user) || null;
}

function injectUserScript(html, user) {
  const tag = `<script>window.CC_USER=${JSON.stringify(user || null)};</script>`;
  if (html.includes("</head>")) {
    return html.replace("</head>", `${tag}</head>`);
  }
  return tag + html;
}

/**
 * Middleware: requireAuth
 * Blocks unauthenticated access — returns 401 JSON for API calls,
 * redirects to /login for browser navigation.
 */
function requireAuth(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  const isApi =
    req.xhr ||
    (req.headers.accept && req.headers.accept.includes("application/json")) ||
    req.path.startsWith("/api/");
  if (isApi) {
    return res.status(401).json({
      ok: false,
      error: "Authentication required",
      message: "Please sign in to your CraftConnect account to use this feature.",
      loginUrl: "/login",
    });
  }
  const redirectTarget = req.originalUrl || "/dashboard";
  res.redirect(
    `/login?error=${encodeURIComponent("Please sign in to access this feature.")}&redirect=${encodeURIComponent(redirectTarget)}`
  );
}

module.exports = { sessionUser, injectUserScript, requireAuth };
