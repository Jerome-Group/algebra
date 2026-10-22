"use client";
import { useId, useState } from "react";
import { Download } from "lucide-react";
import {
  argumentLimits,
  type ArgumentSheet,
  type SavedArgument,
} from "@/lib/algebra/argument-records";
import { argumentTarget } from "@/lib/algebra/argument-catalogue";
import { useArguments } from "./ArgumentContext";
type ImportPreview = ReturnType<
  ReturnType<typeof useArguments>["previewImport"]
>;

export function ArgumentBackups({
  onResume,
  onImport,
}: {
  onResume: (saved: SavedArgument) => void;
  onImport: (sheet: ArgumentSheet) => void;
}) {
  const state = useArguments();
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState<SavedArgument | null>(null);
  const run = (operation: () => Promise<void>) => {
    void operation().catch((error: unknown) =>
      setError(
        error instanceof Error ? error.message : "The action could not finish.",
      ),
    );
  };
  const fileId = useId();
  const download = () => {
    const url = URL.createObjectURL(
      new Blob([state.exportRecords()], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "algebra-arguments-backup.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };
  return (
    <details className="argument-records">
      <summary>
        Your saved arguments and backups <span>{state.saved.length}</span>
      </summary>
      <div>
        <p className="argument-caption">
          Argument backups contain your writing. They are separate from progress
          backups.
        </p>
        <div className="argument-actions">
          <button onClick={download}>
            <Download size={16} aria-hidden="true" /> Export argument backup
          </button>
          <label className="argument-file-button" htmlFor={fileId}>
            Preview argument backup
          </label>
          <input
            id={fileId}
            type="file"
            accept="application/json,.json"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              try {
                if (file.size > argumentLimits.importBytes)
                  throw new Error("Argument backup exceeds 8 MiB.");
                setPreview(state.previewImport(await file.text()));
                setSelected(null);
                setError("");
              } catch (error) {
                setPreview(null);
                setError(
                  error instanceof Error
                    ? error.message
                    : "This backup could not be read.",
                );
              }
            }}
          />
        </div>
        {error && <p role="alert">{error}</p>}
        {preview && (
          <section
            className="argument-import-preview"
            aria-label="Argument backup preview"
          >
            <h3>
              {preview.sheets.length} argument
              {preview.sheets.length === 1 ? "" : "s"} in this backup
            </h3>
            <p>
              Choose one to use as a temporary copy. Your original backup keeps
              every sheet. Save each copy explicitly.
            </p>
            <fieldset>
              <legend>Choose an argument to copy</legend>
              {preview.sheets.map((sheet) => (
                <label key={sheet.id}>
                  <input
                    type="radio"
                    name={`${fileId}-sheet`}
                    checked={selected === sheet.id}
                    onChange={() => setSelected(sheet.id)}
                  />
                  <span>
                    {argumentTarget(sheet.lessonId)?.navTitle} ·{" "}
                    {sheet.blocks.length} block
                    {sheet.blocks.length === 1 ? "" : "s"}
                  </span>
                </label>
              ))}
            </fieldset>
            {preview.warnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
            <div className="argument-actions">
              <button
                disabled={!selected}
                onClick={() => {
                  const sheet = preview.sheets.find(
                    (sheet) => sheet.id === selected,
                  );
                  if (sheet) onImport(sheet);
                }}
              >
                Use selected copy
              </button>
              <button onClick={() => setPreview(null)}>Close preview</button>
            </div>
          </section>
        )}
        {state.saved.length ? (
          <ul className="argument-saved-list">
            {state.saved.map((saved) => (
              <li key={saved.sheet.id}>
                <div>
                  <strong>
                    {argumentTarget(saved.sheet.lessonId)?.navTitle}
                  </strong>
                  <small>
                    {saved.sheet.blocks.length} block
                    {saved.sheet.blocks.length === 1 ? "" : "s"} · Saved to your
                    account
                  </small>
                </div>
                <div className="argument-actions">
                  <button onClick={() => onResume(saved)}>
                    Resume saved argument
                  </button>
                  <button
                    disabled={
                      (state.phase !== "ready" &&
                        state.phase !== "unsupported") ||
                      state.canRetry ||
                      (state.dirty && state.active?.id === saved.sheet.id)
                    }
                    onClick={() => setRemoving(saved)}
                  >
                    Delete saved argument
                  </button>
                </div>
                {state.dirty && state.active?.id === saved.sheet.id && (
                  <p>
                    Save or discard current changes before deleting this active
                    argument.
                  </p>
                )}
                {removing?.sheet.id === saved.sheet.id && (
                  <div
                    className="argument-confirmation"
                    role="group"
                    aria-label="Delete saved argument"
                  >
                    <p>Delete this saved argument from your account?</p>
                    <div className="argument-actions">
                      <button
                        disabled={
                          (state.phase !== "ready" &&
                            state.phase !== "unsupported") ||
                          state.canRetry ||
                          (state.dirty && state.active?.id === saved.sheet.id)
                        }
                        onClick={() => {
                          run(() => state.remove(saved));
                          setRemoving(null);
                        }}
                      >
                        Delete this saved argument
                      </button>
                      <button onClick={() => setRemoving(null)}>
                        Keep saved argument
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="argument-caption">
            {state.phase === "guest"
              ? "Sign in to save arguments to your account. Export temporary writing before signing in."
              : "No saved arguments yet."}
          </p>
        )}
      </div>
    </details>
  );
}
