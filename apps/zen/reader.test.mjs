import { test } from "node:test";
import assert from "node:assert/strict";
import {
  wordCount, chunkParagraph, splitParagraphs, makeTitle, pickBeginText
} from "./reader.js";

test("wordCount ignores extra whitespace", () => {
  assert.equal(wordCount("  hello   world  "), 2);
  assert.equal(wordCount(""), 0);
});

test("splitParagraphs separates on blank lines", () => {
  assert.deepEqual(splitParagraphs("one\n\ntwo"), ["one", "two"]);
});

test("splitParagraphs treats a single line as one paragraph", () => {
  assert.deepEqual(splitParagraphs("just one line"), ["just one line"]);
});

test("splitParagraphs drops empty input", () => {
  assert.deepEqual(splitParagraphs("   \n\n  "), []);
});

test("chunkParagraph splits long text under the word cap", () => {
  const long = Array.from({ length: 200 }, (_, i) => `w${i}`).join(" ");
  const chunks = chunkParagraph(long);
  assert.ok(chunks.length > 1);
  for (const c of chunks) assert.ok(wordCount(c) <= 80);
});

test("makeTitle strips leading markdown markers", () => {
  assert.equal(makeTitle("# A Heading\nbody"), "A Heading");
  assert.equal(makeTitle(""), "untitled");
});

// The easter egg: empty textarea falls back to the clipboard.
test("pickBeginText prefers textarea content", () => {
  assert.equal(pickBeginText("typed text", "clip text"), "typed text");
});

test("pickBeginText falls back to clipboard when textarea is empty", () => {
  assert.equal(pickBeginText("", "clip text"), "clip text");
  assert.equal(pickBeginText("   ", "clip text"), "clip text");
});

test("pickBeginText returns null when both are empty", () => {
  assert.equal(pickBeginText("", ""), null);
  assert.equal(pickBeginText("  ", "  "), null);
  assert.equal(pickBeginText("", null), null);
});
