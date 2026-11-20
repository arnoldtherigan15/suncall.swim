/* suncall.swim — product page interactions + AI Try-On flow (prototype)
 *
 * NOTE FOR DEVELOPMENT: the try-on result here is simulated with a static
 * demo image (photos/tryon-result.jpg). In production, replace
 * `generateTryOn()` with the real provider (e.g. Genlook widget / API).
 */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const state = {
  color: "Sunset Coral",
  top: "S",
  bottom: "M",
  bag: 2,
  photoUrl: null,
};

/* ---------- Toast ---------- */
let toastTimer;
function showToast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("is-show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("is-show"), 2600);
}
window.showToast = showToast;

/* ---------- Gallery ---------- */
$$(".thumb").forEach((thumb) => {
  thumb.addEventListener("click", () => {
    $$(".thumb").forEach((t) => t.classList.remove("is-active"));
    thumb.classList.add("is-active");
    const main = $("#mainImage");
    main.style.opacity = 0;
    setTimeout(() => {
      main.src = thumb.dataset.src;
      main.style.opacity = 1;
    }, 150);
  });
});

/* ---------- Options ---------- */
function syncSelectionText() {
  const meta = `${state.color} · Top ${state.top} · Bottom ${state.bottom}`;
  $(".selected__meta").textContent = meta;
  $("#colorName").textContent = state.color;
  $$(".js-color").forEach((el) => (el.textContent = state.color));
  $(".result__actions .muted").textContent = `$89 · Top ${state.top} · Bottom ${state.bottom}`;
}

function bindSwatches(container, onPick) {
  $$(".swatch", container).forEach((sw) => {
    sw.addEventListener("click", () => {
      $$(".swatch", container).forEach((s) => {
        s.classList.remove("is-active");
        s.setAttribute("aria-checked", "false");
      });
      sw.classList.add("is-active");
      sw.setAttribute("aria-checked", "true");
      onPick(sw.dataset.name);
    });
  });
}

bindSwatches($(".info .swatches"), (name) => {
  state.color = name;
  syncSelectionText();
});

$$(".chips").forEach((group) => {
  group.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip || chip.disabled) return;
    $$(".chip", group).forEach((c) => c.classList.remove("is-active"));
    chip.classList.add("is-active");
    state[group.dataset.group] = chip.textContent.trim();
    syncSelectionText();
  });
});

/* ---------- Bag + wishlist ---------- */
function addToBag() {
  state.bag += 1;
  $("#bagCount").textContent = state.bag;
  showToast(`Added: Marisol set — ${state.color}, Top ${state.top} / Bottom ${state.bottom}`);
}
$("#addToBag").addEventListener("click", addToBag);
$("#wishBtn").addEventListener("click", (e) => {
  const on = e.currentTarget.classList.toggle("is-active");
  showToast(on ? "Saved to your wishlist" : "Removed from wishlist");
});

/* ==========================================================
   Try-On modal
   ========================================================== */
const modal = $("#tryon");
let lastFocus = null;
let progressTimer = null;

function openTryOn() {
  lastFocus = document.activeElement;
  modal.hidden = false;
  document.body.style.overflow = "hidden";
  goToStep(1);
  $(".modal__header [data-close]").focus();
}

function closeTryOn() {
  modal.hidden = true;
  document.body.style.overflow = "";
  clearInterval(progressTimer);
  lastFocus?.focus();
}

function goToStep(step) {
  $$(".step", modal).forEach((el) => (el.hidden = Number(el.dataset.step) !== step));
  $$("#stepper li").forEach((li) => {
    const n = Number(li.dataset.step);
    li.classList.toggle("is-active", n === step);
    li.classList.toggle("is-done", n < step);
  });
  $("#tryonHeading").textContent = step === 3 ? "Your look is ready" : "Try it on";
  $(".modal__panel").scrollTop = 0;
}

$$("[data-open-tryon]").forEach((b) => b.addEventListener("click", openTryOn));
$$("[data-close]", modal).forEach((b) => b.addEventListener("click", closeTryOn));
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !modal.hidden) closeTryOn();
});

/* ---------- Step 1: upload ---------- */
const input = $("#photoInput");
const dropzone = $("#dropzone");

function handleFile(file) {
  if (!file) return;
  if (!/^image\/(jpeg|png)$/.test(file.type)) {
    showToast("Please upload a JPG or PNG photo.");
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    showToast("That photo is over 10 MB — try a smaller one.");
    return;
  }
  if (state.photoUrl?.startsWith("blob:")) URL.revokeObjectURL(state.photoUrl);
  state.photoUrl = URL.createObjectURL(file);
  startGenerating();
}

input.addEventListener("change", () => handleFile(input.files[0]));
$("#cameraBtn").addEventListener("click", (e) => {
  // On phones this opens the camera directly
  e.preventDefault();
  input.setAttribute("capture", "user");
  input.click();
  input.removeAttribute("capture");
});
["dragenter", "dragover"].forEach((ev) =>
  dropzone.addEventListener(ev, (e) => {
    e.preventDefault();
    dropzone.classList.add("is-drag");
  })
);
["dragleave", "drop"].forEach((ev) =>
  dropzone.addEventListener(ev, (e) => {
    e.preventDefault();
    dropzone.classList.remove("is-drag");
  })
);
dropzone.addEventListener("drop", (e) => handleFile(e.dataTransfer.files[0]));

$("#sampleBtn").addEventListener("click", () => {
  state.photoUrl = "photos/coverup-beach.jpg";
  startGenerating();
});

/* ---------- Step 2: generating (simulated) ---------- */
const stages = [
  [0, "Detecting body shape"],
  [30, "Matching fabric & color"],
  [65, "Adding light & shadows"],
  [90, "Final touches"],
];

function startGenerating() {
  $("#processingPhoto").src = state.photoUrl;
  $("#beforePhoto").src = state.photoUrl;
  goToStep(2);

  const duration = 4500; // demo speed; real generation ≈ 20 s
  const started = Date.now();
  clearInterval(progressTimer);
  progressTimer = setInterval(() => {
    const pct = Math.min(100, ((Date.now() - started) / duration) * 100);
    $("#barFill").style.width = pct + "%";
    $("#progressLabel").textContent = stages.filter(([at]) => pct >= at).pop()[1];
    const left = Math.max(1, Math.round(20 * (1 - pct / 100)));
    $("#progressTime").textContent = `~${left} sec left`;
    if (pct >= 100) {
      clearInterval(progressTimer);
      generateTryOn().then(() => goToStep(3));
    }
  }, 100);
}

// Placeholder for the real AI call.
function generateTryOn() {
  return Promise.resolve("photos/tryon-result.jpg");
}

/* ---------- Step 3: result ---------- */
bindSwatches($(".swatches--result"), (name) => {
  state.color = name;
  syncSelectionText();
  // keep main page swatches in sync
  $$(".info .swatch").forEach((s) => {
    const on = s.dataset.name === name;
    s.classList.toggle("is-active", on);
    s.setAttribute("aria-checked", String(on));
  });
  startGenerating();
});

$("#resultAddToBag").addEventListener("click", () => {
  addToBag();
  closeTryOn();
});
$("#retryBtn").addEventListener("click", () => {
  input.value = "";
  goToStep(1);
});

/* ---------- Icons ---------- */
if (window.lucide) lucide.createIcons();
