const createDOMPurify = require("isomorphic-dompurify");
const { JSDOM } = require("jsdom");
const { sanitizePublishedHtml } = require("../dist/sanitize");

const purify = createDOMPurify;
const documentFactory = new JSDOM("").window.document.implementation;

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

let r = sanitizePublishedHtml(
  `<h1>Safe</h1><script>alert("XSS")</script><p>Hello</p>`,
  purify,
  { documentFactory },
);
assert(!r.html.includes("<script"), "script stripped");
assert(r.html.includes("<h1>Safe</h1>"), "safe heading kept");

r = sanitizePublishedHtml(
  `<img src="x" onerror="alert('XSS')"><p>ok</p>`,
  purify,
  { documentFactory },
);
assert(!r.html.includes("onerror"), "onerror removed");
assert(!r.html.includes("src="), "src removed");

r = sanitizePublishedHtml(
  `<a href="javascript:alert('XSS')">Dangerous</a><a href="forest.zz">Forest</a>`,
  purify,
  { documentFactory },
);
assert(!r.html.includes("javascript:"), "javascript url neutralized");
assert(r.html.includes('data-sw-nav="forest.zz"'), "internal link rewritten");

r = sanitizePublishedHtml(
  `<form action="https://evil.example"><input name="x"></form><iframe src="https://evil.example"></iframe><p>body</p>`,
  purify,
  { documentFactory },
);
assert(!r.html.includes("<form"), "form removed");
assert(!r.html.includes("<iframe"), "iframe removed");
assert(r.textContent.includes("body"), "text kept");

console.log("sanitize checks passed");
