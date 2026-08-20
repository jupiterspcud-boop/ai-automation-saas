/* Compatibility loader: the implementation lives in voice-widget.js. */
(function () {
  const current = document.currentScript;
  if (!current) return;
  const next = document.createElement("script");
  next.src = new URL("voice-widget.js?v=1", current.src).href;
  const businessId = current.getAttribute("data-business-id");
  if (businessId) next.setAttribute("data-business-id", businessId);
  current.parentNode.insertBefore(next, current.nextSibling);
})();
