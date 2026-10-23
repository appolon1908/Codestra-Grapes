import { savedAuthoringReference } from "./handoff.mjs";
import React, { useEffect, useMemo, useState } from "react";
import { createProjectClient } from "./api.mjs";
import {
  authConfigured,
  getSession,
  initializeSession,
  login,
  logout,
} from "./auth.mjs";

export default function ProjectBar({
  kind,
  readContent,
  writeContent,
  ready = true,
}) {
  const api = useMemo(() => createProjectClient({ getSession }), []);
  const [signedIn, setSignedIn] = useState(false);
  const [tenant, setTenant] = useState("");
  const [projects, setProjects] = useState([]);
  const [offset, setOffset] = useState(0);
  const [active, setActive] = useState(null);
  const [name, setName] = useState("Untitled campaign");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(
    authConfigured
      ? "Checking sign-in…"
      : "Configure sign-in to save projects.",
  );
  useEffect(() => {
    let current = true;
    initializeSession()
      .then(async (signed) => {
        if (!current) return;
        setSignedIn(signed);
        if (signed) {
          const session = await getSession();
          if (!current) return;
          setTenant(session.tenantId);
          const list = await api.list(kind);
          if (current) {
            setProjects(list);
            setMessage("Projects ready. Publishing remains disabled.");
          }
        } else if (authConfigured)
          setMessage("Sign in to save and load projects.");
      })
      .catch((error) => {
        if (current) setMessage(error.message);
      });
    return () => {
      current = false;
    };
  }, [api, kind]);

  async function action(fn) {
    setBusy(true);
    try {
      await fn();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }
  async function refresh(nextOffset = offset) {
    const list = await api.list(kind, nextOffset);
    setProjects(list);
    setOffset(nextOffset);
  }
  function draft() {
    setActive(null);
    setName("Untitled campaign");
    writeContent(null);
    setMessage("New draft. Save to keep it in your workspace.");
  }
  async function load(id) {
    if (!id) return;
    const project = await api.get(id);
    if (project.kind !== kind)
      throw new Error("This project uses a different editor.");
    writeContent(project.content);
    setActive(project);
    setName(project.name);
    setMessage("Project loaded.");
  }
  async function save() {
    const payload = { name, content: readContent() };
    const saved = active
      ? await api.update(active.id, { ...payload, version: active.version })
      : await api.create({ ...payload, kind });
    setActive(saved);
    setName(saved.name);
    setMessage("Saved version " + saved.version + ".");
    await refresh();
  }
  async function exportReference() {
    const session = await getSession();
    const reference = savedAuthoringReference(active, session.tenantId, kind);
    const blob = new Blob([JSON.stringify(reference, null, 2) + "\n"], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download =
      kind +
      "-" +
      reference.source.projectId +
      "-v" +
      reference.source.revision +
      ".json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage(
      "Exported saved version " +
        reference.source.revision +
        " reference. Review is required before publication.",
    );
  }
  return (
    <header className="project-bar">
      <strong>
        {kind === "grapes" ? "Codestra Page Studio" : "Codestra Funnel Studio"}
      </strong>
      <span>{tenant ? "Workspace: " + tenant : "Local draft"}</span>
      <label>
        Project name{" "}
        <input
          value={name}
          maxLength={200}
          onChange={(e) => setName(e.target.value)}
          disabled={busy}
        />
      </label>
      <label>
        Saved projects{" "}
        <select
          aria-label="Saved projects"
          value={active?.id || ""}
          disabled={!signedIn || busy || !ready}
          onChange={(e) => action(() => load(e.target.value))}
        >
          <option value="">Select a project</option>
          {active && !projects.some((p) => p.id === active.id) && (
            <option value={active.id}>{active.name} (current)</option>
          )}
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <button
        disabled={!signedIn || busy || offset === 0}
        onClick={() => action(() => refresh(Math.max(0, offset - 50)))}
      >
        Previous projects
      </button>
      <button
        disabled={!signedIn || busy || projects.length < 50}
        onClick={() => action(() => refresh(offset + 50))}
      >
        Next projects
      </button>
      <button disabled={busy || !ready} onClick={draft}>
        New draft
      </button>
      <button
        disabled={!signedIn || busy || !ready || !name.trim()}
        onClick={() => action(save)}
      >
        Save project
      </button>
      <button
        disabled={!signedIn || busy || !active}
        onClick={() => action(exportReference)}
      >
        Export saved reference
      </button>
      <button disabled={!signedIn || busy} onClick={() => action(refresh)}>
        Refresh list
      </button>
      <button
        disabled={!authConfigured || busy}
        onClick={() => action(signedIn ? logout : login)}
      >
        {signedIn ? "Sign out" : "Sign in"}
      </button>
      <p role="status" aria-live="polite">
        {message}
      </p>
    </header>
  );
}
