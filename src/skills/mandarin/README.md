# mandarin

**What it does:** teaches beginner Standard Mandarin from a fixed, bundled vocabulary file: topic lessons (words, phrases and a short dialogue with pinyin and English), quizzes, tone and pronunciation help, common beginner mistakes, and a word lookup.

**Status:** Requires Android testing. Built and passing the generic structure checks, but **its own behaviour tests and data-validation tests are not written yet**, so it is not labelled "Tested locally". Not tried on the phone. Fully offline.

## Read this first: the content is UNREVIEWED
`data/mandarin.json` was written by an AI assistant from general knowledge of beginner (about HSK 1) Mandarin. **No native speaker or teacher has checked it.** Planned automated tests (not written yet) will check the *form* of every entry (one pinyin syllable per Chinese character, only legal pinyin syllables, correct tone-mark placement), but they cannot tell whether a word, a tone or a translation is right. Every answer from the skill says so. Before relying on it for real study, have a Mandarin speaker or teacher read `data/mandarin.json`, then record that in `PROJECT-STATUS.md` and flip `reviewStatus` in the file.

## Why the Chinese comes from a file, not from Gemma
A small model can get tones and characters wrong from memory. So the skill returns the exact characters, pinyin and English from the data file, and its `SKILL.md` tells Gemma to use only those. Pinyin is stored with tone *numbers* (`cai4dan1`) and converted to tone marks by code (`càidān`), so a tone mark cannot be mistyped in the data.

## Parameters
| Field | Type | Notes |
|---|---|---|
| `mode` | text, optional | `lesson` (default), `quiz`, `tones`, `mistakes`, `lookup`. Aliases: `practice`, `pronunciation`, `translate`, ... |
| `topic` | text, optional | `introductions` (default), `numbers`, `shopping`, `restaurant`, `hotel`, `directions`, `everyday`. Aliases: `greetings`, `food`, `travel`, `daily`, ... |
| `query` | text, for lookup | English word, pinyin (with or without tone marks or numbers) or Chinese characters. Giving only `query` means lookup |

## What each mode returns
- **lesson:** 12 to 18 words, 8 to 11 phrases, a 6-line dialogue, a tip.
- **quiz:** 5 questions (two vocabulary, one tone, two phrase translations) plus an answers block marked "for checking only". The skill cannot keep score between turns: Gemma asks, the learner replies, Gemma checks. A new random set comes each call.
- **tones:** the four tones and neutral tone on *ma*, the tone changes (third-tone sandhi, 不, 一), minimal pairs (买/卖, 水/睡, 是/十) and approximate descriptions of hard sounds.
- **mistakes:** nine common beginner mistakes with examples (吗 questions, 不 vs 没, 二 vs 两, measure words, word order, tones, pinyin letters).
- **lookup:** up to 6 entries matching an English word, pinyin or characters. No match says so, and nothing is invented.

## Pinyin conventions
Pinyin follows the official spelling: the changed tones of 不 and 一 are written as spoken (bú shì, yí ge, yì diǎn), but the third-tone change is not written (你好 is written nǐ hǎo and said ní hǎo). Proper names are capitalised; sentences start with a capital.

## What leaves the phone
Nothing. No network access.

## Errors
Unknown mode or topic (lists the valid ones); lookup without a query; malformed input.

## Limits
- About 100 words and 70 phrases in 7 topics, plus 9 mistakes. Small on purpose: a small correct set beats a large unchecked one.
- Pronunciation help is text-only and approximate. **No audio.**
- Characters are simplified Chinese only. No handwriting or stroke order.
- Comparisons of sounds with English are rough; a teacher or a recording is better.

## Example prompts
- "Teach me some Mandarin for the restaurant"
- "Quiz me on Mandarin numbers"
- "How do the four tones work?"
- "What does 谢谢 mean?" / "How do I say hotel in Chinese?"
- "What are common mistakes beginners make in Mandarin?"
