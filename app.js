const DISPLAY_REFRESH_MS = 30_000;
const STALE_AFTER_MS = 10 * 60_000;

const countElement = document.querySelector("#bay-count");
const updatedElement = document.querySelector("#updated-at");
const feedStatus = document.querySelector("#feed-status");
const feedLabel = document.querySelector("#feed-label");
const availabilityLabel = document.querySelector("#availability-label");
const connectionMessage = document.querySelector("#connection-message");
const refreshButton = document.querySelector("#refresh-button");

let lastSnapshot;
let requestInProgress = false;

function setStatus(state, label, message) {
  feedStatus.dataset.state = state;
  feedLabel.textContent = label;
  connectionMessage.dataset.state = state;
  connectionMessage.textContent = message;
}

function formatTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("The parking snapshot has an invalid timestamp.");
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function validateSnapshot(data) {
  if (
    !data ||
    data.carParkId !== "40" ||
    data.name !== "Convention Centre" ||
    !Number.isSafeInteger(data.availableBays) ||
    data.availableBays < 0 ||
    typeof data.fetchedAt !== "string" ||
    Number.isNaN(new Date(data.fetchedAt).getTime()) ||
    typeof data.isOpen !== "boolean"
  ) {
    throw new Error("The parking snapshot is missing valid bay availability data.");
  }

  return data;
}

function showSnapshot(snapshot) {
  const displayCount = snapshot.availableBays.toLocaleString();
  if (countElement.textContent !== displayCount) {
    countElement.textContent = displayCount;
  }

  updatedElement.dateTime = snapshot.fetchedAt;
  updatedElement.textContent = formatTime(snapshot.fetchedAt);
  availabilityLabel.textContent = snapshot.isOpen ? "Car park open" : "Check car park status";

  const age = Date.now() - new Date(snapshot.fetchedAt).getTime();
  if (age > STALE_AFTER_MS) {
    const ageMinutes = Math.max(1, Math.floor(age / 60_000));
    setStatus(
      "delayed",
      "Delayed",
      `This snapshot is ${ageMinutes} minutes old. The parking feed may be delayed.`,
    );
    return;
  }

  setStatus("ready", "Feed synced", "Availability is checked every 30 seconds.");
}

async function refreshAvailability() {
  if (requestInProgress) {
    return;
  }

  requestInProgress = true;
  refreshButton.disabled = true;
  refreshButton.setAttribute("aria-busy", "true");

  try {
    const dataUrl = new URL("./data.json", window.location.href);
    dataUrl.searchParams.set("check", Date.now().toString());
    const response = await fetch(dataUrl, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`The parking snapshot request failed (${response.status}).`);
    }

    lastSnapshot = validateSnapshot(await response.json());
    showSnapshot(lastSnapshot);
  } catch (error) {
    if (lastSnapshot) {
      const age = Math.max(1, Math.floor((Date.now() - new Date(lastSnapshot.fetchedAt)) / 60_000));
      setStatus("error", "Check failed", `Could not check for a new snapshot. Last snapshot: ${age} min ago.`);
    } else {
      setStatus("error", "Unavailable", "Could not load parking availability. Try again or open the official car park page.");
    }
    console.error("Could not refresh parking availability:", error);
  } finally {
    requestInProgress = false;
    refreshButton.disabled = false;
    refreshButton.removeAttribute("aria-busy");
  }
}

refreshButton.addEventListener("click", refreshAvailability);
window.setInterval(refreshAvailability, DISPLAY_REFRESH_MS);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    refreshAvailability();
  }
});

refreshAvailability();
