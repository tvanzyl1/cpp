import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const SOURCE_URL = "https://www.cityofperthparking.com.au/json/cpp/map/carpark/alt/1";
const CAR_PARK_ID = "40";
const CAR_PARK_NAME = "Convention Centre";

function parseBayCount(value) {
  const count = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new Error("The Convention Centre record has an invalid free_space value.");
  }

  return count;
}

export function extractAvailability(records, fetchedAt = new Date().toISOString()) {
  if (!Array.isArray(records)) {
    throw new Error("The parking API response must be a list.");
  }

  const matches = records.filter(
    (record) => record?.id === CAR_PARK_ID && record?.title === CAR_PARK_NAME,
  );
  if (matches.length === 0) {
    throw new Error(`No ${CAR_PARK_NAME} record (id ${CAR_PARK_ID}) was found.`);
  }

  const counts = matches.map((record) => parseBayCount(record.free_space));
  if (counts.some((count) => count !== counts[0])) {
    throw new Error("The Convention Centre entrances reported conflicting bay counts.");
  }

  const timestamp = new Date(fetchedAt);
  if (Number.isNaN(timestamp.getTime())) {
    throw new Error("The snapshot timestamp is invalid.");
  }

  return {
    carParkId: CAR_PARK_ID,
    name: CAR_PARK_NAME,
    address: "21 Mounts Bay Road",
    availableBays: counts[0],
    isOpen: matches.some((record) => record.opennow === true),
    fetchedAt: timestamp.toISOString(),
    sourceUrl: "https://www.cityofperthparking.com.au/convention-centre",
  };
}

export async function writeAvailability(outputPath = "data.json") {
  const response = await fetch(SOURCE_URL, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    throw new Error(`Parking API request failed with HTTP ${response.status}.`);
  }

  const snapshot = extractAvailability(await response.json());
  const destination = resolve(outputPath);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  return snapshot;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  writeAvailability(process.argv[2]).then(
    (snapshot) => console.log(`Saved ${snapshot.availableBays} available bays to ${resolve(process.argv[2] ?? "data.json")}.`),
    (error) => {
      console.error(`Could not update parking availability: ${error.message}`);
      process.exitCode = 1;
    },
  );
}
