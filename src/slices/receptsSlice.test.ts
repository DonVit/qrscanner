import { describe, expect, it } from "vitest";
import { addRecept, receptsReducer } from "./receptsSlice";

describe("recepts reducer", () => {
  it("prevents duplicate URLs when the same address is scanned again", () => {
    let state = receptsReducer({}, addRecept(" https://example.com/receipt "));
    state = receptsReducer(state, addRecept("https://example.com/receipt"));

    const values = Object.values(state);
    expect(values).toHaveLength(1);
    expect(values[0].url).toBe("https://example.com/receipt");
  });

  it("rejects malformed scan content that is not a valid URL", () => {
    const state = receptsReducer({}, addRecept("not a valid url"));
    expect(Object.values(state)).toHaveLength(0);
  });
});
