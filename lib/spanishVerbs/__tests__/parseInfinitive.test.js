import { parseInfinitive } from "../infinitiveParser";

describe("parseInfinitive", () => {
  test("llamar — non-reflexive -ar verb", () => {
    expect(parseInfinitive("llamar")).toMatchObject({
      baseInfinitive: "llamar", ending: "ar", isReflexive: false, valid: true,
    });
  });

  test("llamarse — reflexive -ar verb", () => {
    expect(parseInfinitive("llamarse")).toMatchObject({
      baseInfinitive: "llamar", ending: "ar", isReflexive: true, valid: true,
    });
  });

  test("despertarse — reflexive -ar stem-changing verb", () => {
    expect(parseInfinitive("despertarse")).toMatchObject({
      baseInfinitive: "despertar", ending: "ar", isReflexive: true, valid: true,
    });
  });

  test("acostarse — reflexive -ar stem-changing verb", () => {
    expect(parseInfinitive("acostarse")).toMatchObject({
      baseInfinitive: "acostar", ending: "ar", isReflexive: true, valid: true,
    });
  });

  test("vestirse — reflexive -ir verb", () => {
    expect(parseInfinitive("vestirse")).toMatchObject({
      baseInfinitive: "vestir", ending: "ir", isReflexive: true, valid: true,
    });
  });

  test("despertar — non-reflexive base verb", () => {
    expect(parseInfinitive("despertar")).toMatchObject({
      baseInfinitive: "despertar", ending: "ar", isReflexive: false, valid: true,
    });
  });

  test("normalizes: trims whitespace, lowercases, keeps accented letters", () => {
    const r = parseInfinitive("  Oír  ");
    expect(r.original).toBe("oír");
    expect(r.baseInfinitive).toBe("oír");
    expect(r.ending).toBe("ir");
  });

  test("stem is baseInfinitive minus the ar/er/ir ending", () => {
    expect(parseInfinitive("hablar").stem).toBe("habl");
    expect(parseInfinitive("hablarse").stem).toBe("habl");
  });

  test("input that isn't a valid ar/er/ir infinitive is marked invalid", () => {
    const r = parseInfinitive("xyz");
    expect(r.valid).toBe(false);
    expect(r.ending).toBeNull();
  });

  test("a word that merely ends in 'se' but has no ar/er/ir base is not treated as reflexive", () => {
    // "mese" isn't a real verb, but this guards the double-check logic in parseInfinitive:
    // isReflexive requires the stripped base to itself end in ar/er/ir.
    const r = parseInfinitive("mese");
    expect(r.isReflexive).toBe(false);
  });

  test("empty input is invalid, not a thrown error", () => {
    expect(parseInfinitive("").valid).toBe(false);
    expect(parseInfinitive(undefined).valid).toBe(false);
  });
});
