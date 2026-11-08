import test from "node:test";
import assert from "node:assert/strict";

import { extractAvailability } from "../scripts/refresh-data.mjs";

const timestamp = "2026-11-08T12:00:00.000Z";

test("extracts the Convention Centre bay count from duplicate entrance records", () => {
  const snapshot = extractAvailability(
    [
      { id: "39", title: "Other car park", free_space: 12 },
      { id: "40", title: "Convention Centre", free_space: "1058", opennow: true },
      { id: "40", title: "Convention Centre", free_space: 1058, opennow: false },
    ],
    timestamp,
  );

  assert.deepEqual(snapshot, {
    carParkId: "40",
    name: "Convention Centre",
    address: "21 Mounts Bay Road",
    availableBays: 1058,
    isOpen: true,
    fetchedAt: timestamp,
    sourceUrl: "https://www.cityofperthparking.com.au/convention-centre",
  });
});

test("rejects a missing Convention Centre record", () => {
  assert.throws(
    () => extractAvailability([{ id: "41", title: "Different car park", free_space: 10 }], timestamp),
    /No Convention Centre record/,
  );
});

test("rejects invalid or conflicting bay counts", () => {
  assert.throws(
    () => extractAvailability([{ id: "40", title: "Convention Centre", free_space: -1 }], timestamp),
    /invalid free_space/,
  );
  assert.throws(
    () =>
      extractAvailability(
        [
          { id: "40", title: "Convention Centre", free_space: 10 },
          { id: "40", title: "Convention Centre", free_space: 11 },
        ],
        timestamp,
      ),
    /conflicting bay counts/,
  );
});

test("rejects an invalid snapshot timestamp", () => {
  assert.throws(
    () =>
      extractAvailability(
        [{ id: "40", title: "Convention Centre", free_space: 10 }],
        "not-a-timestamp",
      ),
    /timestamp is invalid/,
  );
});
