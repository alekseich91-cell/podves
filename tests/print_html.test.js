import { test } from "node:test";
import assert from "node:assert/strict";
import { escapeHtml } from "../src/export/print_html.js";

test("escapeHtml escapes ampersand, angle brackets, and quotes", () => {
  assert.equal(escapeHtml('<script>alert("x&y")</script>'),
    '&lt;script&gt;alert(&quot;x&amp;y&quot;)&lt;/script&gt;');
});

test("escapeHtml escapes single quote", () => {
  assert.equal(escapeHtml("it's"), "it&#39;s");
});

test("escapeHtml handles non-string by coercing", () => {
  assert.equal(escapeHtml(42), "42");
  assert.equal(escapeHtml(null), "");
  assert.equal(escapeHtml(undefined), "");
});
