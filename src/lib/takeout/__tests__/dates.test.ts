import { describe, expect, it } from "vitest";
import { detectNumericOrder, monthFromToken, parseTakeoutDate } from "../dates";

const iso = (s: string, opts = {}) => {
  const r = parseTakeoutDate(s, { fallbackTimeZone: "Asia/Jakarta", ...opts });
  return r ? new Date(r.ms).toISOString() : null;
};

describe("parseTakeoutDate", () => {
  it.each([
    ["Jan 5, 2024, 10:31:22 PM WIB", "2024-01-05T15:31:22.000Z"],
    ["Jan 5, 2024, 10:31:22\u202fPM WIB", "2024-01-05T15:31:22.000Z"], // narrow nbsp (newer exports)
    ["Jan 5, 2024, 12:05:00 AM WIB", "2024-01-04T17:05:00.000Z"],
    ["Jan 5, 2024, 12:05:00 PM WIB", "2024-01-05T05:05:00.000Z"],
    ["5 Jan 2024, 22:31:22 WIB", "2024-01-05T15:31:22.000Z"], // en-GB
    ["5 Jan 2024, 22.31.22 WIB", "2024-01-05T15:31:22.000Z"], // id short
    ["5 Januari 2024 pukul 22.31.22 WIB", "2024-01-05T15:31:22.000Z"], // id long
    ["12 Agu 2024, 21.00.00 WIB", "2024-08-12T14:00:00.000Z"],
    ["12 Agt 2024, 21.00.00 WIB", "2024-08-12T14:00:00.000Z"],
    ["3 Mei 2024, 08.15.00 WITA", "2024-05-03T00:15:00.000Z"],
    ["3 Mei 2024, 08.15.00 WIT", "2024-05-02T23:15:00.000Z"],
    ["9 Okt 2024, 14.00.00 WIB", "2024-10-09T07:00:00.000Z"],
    ["8 Des 2024, 23.59.59 WIB", "2024-12-08T16:59:59.000Z"],
    ["Mar 4, 2024, 12:00:00 AM PST", "2024-03-04T08:00:00.000Z"],
    ["Jul 4, 2024, 9:00:00 AM PDT", "2024-07-04T16:00:00.000Z"],
    ["Mar 1, 2024, 10:00:00 AM GMT+07:00", "2024-03-01T03:00:00.000Z"],
    ["Mar 1, 2024, 10:00:00 AM GMT-3", "2024-03-01T13:00:00.000Z"],
    ["Mar 1, 2024, 10:00:00 AM UTC", "2024-03-01T10:00:00.000Z"],
    ["5 de ene. de 2024, 22:31:22 CET", "2024-01-05T21:31:22.000Z"], // es
    ["5 janv. 2024, 22:31:22 CET", "2024-01-05T21:31:22.000Z"], // fr
    ["5. März 2024, 22:31:22 MEZ", "2024-03-05T21:31:22.000Z"], // de long
    ["05.01.2024, 22:31:22 MEZ", "2024-01-05T21:31:22.000Z"], // de numeric
    ["2024-01-05 22:31:22 GMT+07:00", "2024-01-05T15:31:22.000Z"],
    ["2024年1月5日 22:31:22 JST", "2024-01-05T13:31:22.000Z"],
    ["2024. 1. 5. 오후 10:31:22 KST", "2024-01-05T13:31:22.000Z"],
    ["5 Jan 2024, 10:31:22 p. m. CET", "2024-01-05T21:31:22.000Z"],
  ])("%s", (input, expected) => {
    expect(iso(input)).toBe(expected);
  });

  it("missing timezone -> wall time in the fallback zone", () => {
    const r = parseTakeoutDate("Jan 5, 2024, 10:30:00 PM", { fallbackTimeZone: "Asia/Jakarta" });
    expect(new Date(r!.ms).toISOString()).toBe("2024-01-05T15:30:00.000Z");
    expect(r!.noTz).toBe(true);
  });

  it("unknown abbreviation -> fallback zone + flagged", () => {
    const r = parseTakeoutDate("Jan 5, 2024, 10:30:00 PM XYZT", { fallbackTimeZone: "Asia/Jakarta" });
    expect(new Date(r!.ms).toISOString()).toBe("2024-01-05T15:30:00.000Z");
    expect(r!.unknownTz).toBe("XYZT");
  });

  it("resolves ambiguous CST / IST using the fallback zone", () => {
    expect(iso("Jan 5, 2024, 10:00:00 AM CST", { fallbackTimeZone: "America/Chicago" })).toBe("2024-01-05T16:00:00.000Z");
    expect(iso("Jan 5, 2024, 10:00:00 AM CST", { fallbackTimeZone: "Asia/Shanghai" })).toBe("2024-01-05T02:00:00.000Z");
    expect(iso("Jan 5, 2024, 10:00:00 AM IST", { fallbackTimeZone: "Asia/Kolkata" })).toBe("2024-01-05T04:30:00.000Z");
  });

  it("numeric slash dates use the detected order", () => {
    expect(iso("05/01/2024 22:31:22 BRT", { numericOrder: "dmy" })).toBe("2024-01-06T01:31:22.000Z");
    expect(iso("05/01/2024 22:31:22 BRT", { numericOrder: "mdy" })).toBe("2024-05-02T01:31:22.000Z");
    expect(iso("25/01/2024 22:31:22 BRT", { numericOrder: "mdy" })).toBe("2024-01-26T01:31:22.000Z"); // unambiguous wins
    expect(detectNumericOrder(["05/01/2024 1:00", "25/01/2024 1:00"])).toBe("dmy");
    expect(detectNumericOrder(["01/25/2024 1:00"])).toBe("mdy");
    expect(detectNumericOrder(["01/05/2024 1:00"])).toBeNull();
  });

  it("rejects garbage", () => {
    expect(iso("")).toBeNull();
    expect(iso("not a date")).toBeNull();
    expect(iso("Jan 2024 WIB")).toBeNull();
  });

  it("month tokens", () => {
    expect(monthFromToken("Agu")).toBe(8);
    expect(monthFromToken("juil.")).toBe(7);
    expect(monthFromToken("jui")).toBeNull();
    expect(monthFromToken("Mei")).toBe(5);
    expect(monthFromToken("Des")).toBe(12);
  });
});
