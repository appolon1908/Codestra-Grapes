import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import grapesjs from "grapesjs";
import "grapesjs/dist/css/grapes.min.css";
import ProjectBar from "./src/ProjectBar.jsx";
import { validateGrapesProject } from "./src/project-data.mjs";
import Catalog from "./src/Catalog.jsx";
import "./src/styles.css";

const initial =
  '<section style="padding:60px;text-align:center"><h1>Your Campaign</h1><p>Build a landing page for your client.</p><a href="#signup">Get Started</a></section>';
function App() {
  const editor = useRef(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    editor.current = grapesjs.init({
      container: "#editor",
      height: "calc(100vh - 170px)",
      storageManager: false,
      telemetry: false,
      jsInHtml: false,
      components: initial,
      canvas: { scripts: [] },
      blockManager: {
        blocks: [
          {
            id: "heading",
            label: "Heading",
            content: "<h2>Your headline</h2>",
          },
          {
            id: "paragraph",
            label: "Text",
            content: "<p>Describe your offer.</p>",
          },
          { id: "image", label: "Image", content: { type: "image" } },
          {
            id: "button",
            label: "Call to action",
            content: '<a href="#signup">Sign up</a>',
          },
        ],
      },
    });
    setReady(true);
    return () => {
      editor.current?.destroy();
      editor.current = null;
    };
  }, []);
  function write(content) {
    if (content) editor.current.loadProjectData(validateGrapesProject(content));
    else {
      editor.current.setComponents(initial);
      editor.current.setStyle("");
    }
  }
  return (
    <>
      <ProjectBar
        kind="grapes"
        ready={ready}
        readContent={() =>
          validateGrapesProject(editor.current.getProjectData())
        }
        writeContent={write}
      />
      <Catalog />
      <div className="editor" id="editor" />
    </>
  );
}
createRoot(document.getElementById("root")).render(<App />);
