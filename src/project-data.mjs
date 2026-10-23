import DOMPurify from "dompurify";

const tags = new Set(
  "a abbr address article aside b blockquote br button caption code col colgroup dd del details div dl dt em figcaption figure footer h1 h2 h3 h4 h5 h6 header hr i img li main nav ol p pre s section small span strong sub summary sup table tbody td th thead tr u ul body".split(
    " ",
  ),
);
const types = new Set([
  "default",
  "wrapper",
  "text",
  "textnode",
  "image",
  "link",
  "link-block",
]);
const forbidden = new Set([
  "__proto__",
  "constructor",
  "prototype",
  "scripts",
  "script",
  "script-export",
  "script-props",
  "srcdoc",
  "events",
]);
const htmlOptions = {
  ALLOWED_TAGS: [...tags].filter((tag) => tag !== "body"),
  ALLOWED_ATTR: [
    "id",
    "class",
    "title",
    "alt",
    "href",
    "src",
    "width",
    "height",
    "colspan",
    "rowspan",
    "role",
  ],
  ALLOW_DATA_ATTR: false,
  FORBID_TAGS: ["style"],
  FORBID_ATTR: ["style", "srcdoc", "srcset"],
};
function url(value) {
  if (typeof value !== "string" || /[\u0000-\u0020\\]/.test(value))
    throw Error("Unsafe image or link URL.");
  if (
    /^(https?:\/\/|mailto:|tel:|#|\/(?!\/))/.test(value) ||
    /^data:image\/(png|jpeg|gif|webp|avif);base64,[A-Za-z0-9+/=]+$/.test(value)
  )
    return value;
  throw Error("Use an HTTPS image URL or a safe relative link.");
}
function css(value) {
  if (typeof value !== "string" && typeof value !== "number")
    throw Error("Invalid project style.");
  if (
    /[<>\\{};]/.test(String(value)) ||
    /url\s*\(|expression\s*\(|javascript|vbscript|@import|behavior|-moz-binding/i.test(
      String(value),
    )
  ) {
    throw Error(
      "Executable or remote CSS is not supported. Use an image block.",
    );
  }
  return value;
}
function style(value = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error("Invalid styles.");
  return Object.fromEntries(
    Object.entries(value).map(([key, val]) => {
      if (!/^(--)?[a-zA-Z][a-zA-Z0-9-]*$/.test(key))
        throw Error("Invalid style property.");
      return [key, css(val)];
    }),
  );
}
function attributes(value = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error("Invalid attributes.");
  const result = {};
  for (const [key, val] of Object.entries(value)) {
    const name = key.toLowerCase();
    if (
      /^on/.test(name) ||
      ["srcdoc", "srcset", "style", "formaction"].includes(name)
    )
      throw Error("Unsafe component attribute.");
    if (
      ![
        "id",
        "class",
        "title",
        "alt",
        "href",
        "src",
        "width",
        "height",
        "colspan",
        "rowspan",
        "role",
      ].includes(name) &&
      !/^aria-[a-z-]+$/.test(name)
    )
      continue;
    if (typeof val !== "string" && typeof val !== "number")
      throw Error("Invalid attribute value.");
    result[name] = ["src", "href"].includes(name) ? url(val) : val;
  }
  return result;
}
// Rebuild an allowlisted document. Never hand arbitrary GrapesJS model properties
// (scripts, frame attributes, component factories, CSS imports) to loadProjectData.
export function validateGrapesProject(data) {
  let visited = 0;
  function inspect(value, depth = 0) {
    if (depth > 60 || ++visited > 30000)
      throw Error("Page project is too complex.");
    if (value && typeof value === "object") {
      for (const [key, child] of Object.entries(value)) {
        if (forbidden.has(key.toLowerCase()) || /^on/i.test(key))
          throw Error("Executable page content is not supported.");
        inspect(child, depth + 1);
      }
    }
  }
  inspect(data);
  function component(value) {
    if (typeof value === "string")
      return DOMPurify.sanitize(value, htmlOptions);
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw Error("Invalid page component.");
    const result = {};
    if (value.type !== undefined) {
      if (!types.has(value.type)) throw Error("Unsupported component type.");
      result.type = value.type;
    }
    if (value.tagName !== undefined) {
      if (
        typeof value.tagName !== "string" ||
        !tags.has(value.tagName.toLowerCase())
      )
        throw Error("Unsupported page element.");
      result.tagName = value.tagName.toLowerCase();
    }
    if (value.content !== undefined) {
      if (typeof value.content !== "string")
        throw Error("Invalid page content.");
      result.content = DOMPurify.sanitize(value.content, htmlOptions);
    }
    if (value.components !== undefined)
      result.components = Array.isArray(value.components)
        ? value.components.map(component)
        : component(value.components);
    if (value.attributes !== undefined)
      result.attributes = attributes(value.attributes);
    if (value.style !== undefined) result.style = style(value.style);
    if (value.src !== undefined) result.src = url(value.src);
    if (value.classes !== undefined) {
      if (!Array.isArray(value.classes)) throw Error("Invalid page classes.");
      result.classes = value.classes.map((item) => {
        const name = typeof item === "string" ? item : item?.name;
        if (typeof name !== "string" || !/^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(name))
          throw Error("Invalid page class.");
        return name;
      });
    }
    return result;
  }
  if (
    !data ||
    typeof data !== "object" ||
    !Array.isArray(data.pages) ||
    !data.pages.length ||
    data.pages.length > 20
  )
    throw Error("Invalid page project.");
  const pages = data.pages.map((page) => {
    if (!page || typeof page !== "object") throw Error("Invalid page.");
    const frames = page.frames ?? [{ component: page.component }];
    if (!Array.isArray(frames) || frames.length !== 1)
      throw Error("One canvas per page is supported.");
    const result = {
      frames: frames.map((frame) => ({
        component: component(frame?.component),
      })),
    };
    for (const key of ["id", "name"])
      if (typeof page[key] === "string") result[key] = page[key].slice(0, 200);
    return result;
  });
  const styles = (data.styles ?? []).map((rule) => {
    if (!rule || !Array.isArray(rule.selectors))
      throw Error("Invalid style rule.");
    const selectors = rule.selectors.map((selector) => {
      const text = typeof selector === "string" ? selector : selector?.name;
      if (
        typeof text !== "string" ||
        !/^[.#a-zA-Z0-9_*\[\]="':,\s>+~()-]+$/.test(text)
      )
        throw Error("Unsupported CSS selector.");
      if (typeof selector !== "string") {
        if (
          ![1, 2].includes(selector.type) ||
          !/^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(text)
        ) {
          throw Error("Unsupported typed CSS selector.");
        }
        return { name: text, type: selector.type };
      }
      return text;
    });
    const result = { selectors, style: style(rule.style) };
    if (rule.state) {
      if (
        ![
          "hover",
          "focus",
          "active",
          "focus-visible",
          "focus-within",
          "visited",
          "disabled",
          "checked",
          "first-child",
          "last-child",
        ].includes(rule.state)
      ) {
        throw Error("Unsupported style state.");
      }
      result.state = rule.state;
    }
    if (rule.mediaText) {
      if (
        typeof rule.mediaText !== "string" ||
        !/^[a-zA-Z0-9\s:().-]+$/.test(rule.mediaText)
      )
        throw Error("Unsupported media query.");
      result.mediaText = rule.mediaText;
      result.atRuleType = "media";
    }
    return result;
  });
  const assets = (data.assets ?? []).map((asset) => ({
    type: "image",
    src: url(typeof asset === "string" ? asset : asset?.src),
  }));
  return { pages, styles, assets };
}
