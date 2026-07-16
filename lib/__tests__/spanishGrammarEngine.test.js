import { classifySpanishWord } from "../spanishGrammarEngine";

// These words all resolve via the closed-class dictionary or the verb reverse-lookup
// (tiers 1–2 of classifySpanishWord), so no network/dict-es fetch is involved —
// safe to run under plain Jest with no server or fetch mock.

describe("classifySpanishWord — regression for previously-added vocabulary", () => {
  test("este — demonstrative", async () => {
    const card = await classifySpanishWord("este");
    expect(card.type).toBe("closed-class");
    expect(card.pos).toBe("demonstrative");
  });

  test("mi — possessive adjective, not ambiguous", async () => {
    const card = await classifySpanishWord("mi");
    expect(card.type).toBe("closed-class");
    expect(card.pos).toBe("possessive-adj");
    expect(card.ambiguous).toBe(false);
  });

  test("vuelve — verb form of volver", async () => {
    const card = await classifySpanishWord("vuelve");
    expect(card.type).toBe("verb");
    expect(card.lemma).toBe("volver");
  });

  test("sirve — verb form of servir", async () => {
    const card = await classifySpanishWord("sirve");
    expect(card.type).toBe("verb");
    expect(card.lemma).toBe("servir");
  });

  test("llegué — preterite form of llegar", async () => {
    const card = await classifySpanishWord("llegué");
    expect(card.type).toBe("verb");
    expect(card.lemma).toBe("llegar");
    expect(card.personLabel).toContain("yo");
  });

  test("tienen — still resolves correctly (pre-existing behavior)", async () => {
    const card = await classifySpanishWord("tienen");
    expect(card.type).toBe("verb");
    expect(card.lemma).toBe("tener");
  });
});

describe("classifySpanishWord — su/suyo ambiguity is shown, not flattened to one meaning", () => {
  test("su — marked ambiguous with all six possible owners listed", async () => {
    const card = await classifySpanishWord("su");
    expect(card.ambiguous).toBe(true);
    expect(card.requiresContext).toBe(true);
    expect(card.possibleOwners).toEqual(["él", "ella", "usted", "ellos", "ellas", "ustedes"]);
    expect(card.meaningsZh).toEqual(["他的", "她的", "您的", "他們的", "她們的", "您們的"]);
    // must not collapse to a single flat translation like "su = 他的"
    expect(card.zh).not.toBe("他的");
  });

  test("su has disambiguation alternatives (de + person)", async () => {
    const card = await classifySpanishWord("su");
    expect(card.disambiguation.length).toBeGreaterThanOrEqual(6);
    expect(card.disambiguation.some(d => d.es.includes("de él"))).toBe(true);
    expect(card.disambiguation.some(d => d.es.includes("de ella"))).toBe(true);
  });

  test("suyo/suya/suyos/suyas each agree with the possessed noun, not the owner", async () => {
    const suyo = await classifySpanishWord("suyo");
    const suya = await classifySpanishWord("suya");
    const suyos = await classifySpanishWord("suyos");
    const suyas = await classifySpanishWord("suyas");

    for (const card of [suyo, suya, suyos, suyas]) {
      expect(card.ambiguous).toBe(true);
      expect(card.possibleOwners).toEqual(["él", "ella", "usted", "ellos", "ellas", "ustedes"]);
    }

    // The four forms must actually differ (agree with gender/number of the thing owned) —
    // if they were all identical, that would repeat the bug of picking a form based on the owner.
    expect(suyo.word).toBe("suyo");
    expect(suya.word).toBe("suya");
    expect(suyos.word).toBe("suyos");
    expect(suyas.word).toBe("suyas");
    expect(suyo.zh).not.toBe(suya.zh);
    expect(suyos.zh).not.toBe(suyas.zh);
  });
});
