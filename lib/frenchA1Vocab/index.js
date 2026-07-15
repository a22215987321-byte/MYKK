import { FRENCH_A1_CATEGORIES } from "./categories";
import { GREETINGS_WORDS } from "./greetings";
import { PRONOUNS_WORDS } from "./pronouns";
import { QUESTION_WORDS } from "./questionWords";
import { ADJECTIVES_WORDS } from "./adjectives";
import { ADVERBS_WORDS } from "./adverbs";
import { NOUNS_WORDS } from "./nouns";
import { VERBS_WORDS } from "./verbs";

export { FRENCH_A1_CATEGORIES };

export const FRENCH_A1_WORDS = [
  ...GREETINGS_WORDS,
  ...PRONOUNS_WORDS,
  ...QUESTION_WORDS,
  ...ADJECTIVES_WORDS,
  ...ADVERBS_WORDS,
  ...NOUNS_WORDS,
  ...VERBS_WORDS,
];

export const PART_OF_SPEECH_LABELS = {
  verb: "動詞",
  noun: "名詞",
  adjective: "形容詞",
  adverb: "副詞",
  preposition: "介詞",
  pronoun: "代詞",
  "question-word": "疑問詞",
  conjunction: "連接詞",
  greeting: "問候語",
};
