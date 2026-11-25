// Sheets are native modal dialogs. On a phone they rise from the bottom edge; on a wider
// screen a sheet marked data-anchor opens beside the control that summoned it.
(() => {
  "use strict";

  const embedded = window.parent !== window;
  const narrow = matchMedia("(max-width: 790px)");
  const sheets = new Set();
  let openCount = 0;

  function tellStudio(open) {
    // The studio's tab bar joins the backdrop, so the sheet reads as one modal surface.
    if (embedded) window.parent.postMessage({type:"ns-modal", open}, location.origin);
  }

  function place(dialog, trigger) {
    dialog.classList.remove("is-anchored");
    dialog.style.removeProperty("top");
    dialog.style.removeProperty("right");
    if (!dialog.hasAttribute("data-anchor") || narrow.matches || !trigger?.isConnected) return;
    const rect = trigger.getBoundingClientRect();
    dialog.classList.add("is-anchored");
    dialog.style.top = Math.round(Math.min(rect.bottom + 8, window.innerHeight - 160)) + "px";
    dialog.style.right = Math.round(Math.max(12, window.innerWidth - rect.right)) + "px";
  }

  function setup(dialog, {onOpen, onClose} = {}) {
    let returnTo = null;
    function close() {
      if (dialog.open) dialog.close();
    }
    function open(trigger) {
      if (dialog.open) return;
      returnTo = trigger || (document.activeElement !== document.body ? document.activeElement : null);
      onOpen?.();
      place(dialog, trigger);
      try { dialog.showModal(); } catch { dialog.setAttribute("open", ""); }
      openCount++;
      tellStudio(true);
    }
    // Capture phase: a dismissing control closes the sheet before its own action moves focus.
    dialog.addEventListener("click", event => {
      const control = event.target.closest?.("[data-dismiss]");
      if (control && dialog.contains(control)) close();
    }, true);
    dialog.addEventListener("click", event => {
      if (event.target !== dialog) return;
      const r = dialog.getBoundingClientRect();
      if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) close();
    });
    dialog.addEventListener("close", () => {
      openCount = Math.max(0, openCount - 1);
      tellStudio(openCount > 0);
      const active = document.activeElement;
      if (returnTo?.isConnected && !returnTo.hidden && (!active || active === document.body || dialog.contains(active))) {
        returnTo.focus({preventScroll:true});
      }
      returnTo = null;
      onClose?.();
    });
    const sheet = {dialog, open, close, get isOpen() { return dialog.open; }};
    sheets.add(sheet);
    return sheet;
  }

  narrow.addEventListener?.("change", () => { for (const sheet of sheets) sheet.close(); });
  window.NovelSheet = {setup, closeAll() { for (const sheet of sheets) sheet.close(); }};
})();
