---
name: mandarin
description: Teach beginner Mandarin: vocabulary, phrases, dialogues, tones, quizzes and a word lookup, with pinyin.
---

# Mandarin for beginners

Works offline. Use it when the user wants to learn or practise Mandarin Chinese, or asks how to say something in Chinese, or what a Chinese word means.

## Instructions

Call the `run_js` tool with the following exact parameters:
- script name: index.html
- data: A JSON string with the following fields:
  - mode: String. Optional. One of "lesson" (default), "quiz", "tones", "mistakes", "lookup".
  - topic: String. Optional. One of "introductions", "numbers", "shopping", "restaurant", "hotel", "directions", "everyday". Used by "lesson" and "quiz". Leave it out for the introductions lesson, or for a quiz across all topics.
  - query: String. Only for "lookup": an English word, pinyin or Chinese characters to look up.

Use only the Chinese, pinyin and English in the `result`. Never write your own Chinese characters, pinyin or tone marks, and never change the ones in the result, because small mistakes in tones and characters are easy to make. If the user asks for a word or phrase that is not in the result, say it is not in this beginner list and do not invent it. For a quiz, ask one question at a time and keep the answers hidden until the learner has replied. This skill cannot play audio, so do not offer to pronounce anything.
