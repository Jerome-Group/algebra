"use client";
import { useId, useState } from "react";
import { Plus, Search } from "lucide-react";
import {
  argumentLimits,
  type ArgumentBlock,
  type ArgumentSheet,
} from "@/lib/algebra/argument-records";
import { Prose } from "./Math";

export function ArgumentWriting({
  sheet,
  commit,
  consult,
  historical,
}: {
  sheet: ArgumentSheet;
  commit: (sheet: ArgumentSheet) => void;
  consult: () => void;
  historical: boolean;
}) {
  const active =
    sheet.blocks.find((block) => block.id === sheet.activeBlockId) ??
    sheet.blocks[0];
  const position = sheet.blocks.findIndex((block) => block.id === active.id);
  const [preview, setPreview] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const fieldId = useId();
  const edit = (
    change: Partial<
      Pick<ArgumentBlock, "text" | "question" | "review" | "reference">
    >,
  ) =>
    commit({
      ...sheet,
      activeBlockId: active.id,
      blocks: sheet.blocks.map((block) =>
        block.id === active.id ? { ...block, ...change } : block,
      ),
    });
  return (
    <section className="argument-writing" aria-label="Your proof sheet">
      <header className="argument-panel-heading">
        <div>
          <span className="section-kicker">YOUR WRITING</span>
          <h2>Build your argument</h2>
        </div>
        <span>
          {sheet.blocks.length} / {argumentLimits.blocks} blocks
        </span>
      </header>
      <ol className="argument-blocks" aria-label="Argument blocks">
        {sheet.blocks.map((block, index) => (
          <li key={block.id}>
            <button
              aria-pressed={block.id === active.id}
              onClick={() => commit({ ...sheet, activeBlockId: block.id })}
            >
              <span className="argument-block-number">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span>
                <strong>
                  {block.text.trim() ? block.text : "Unwritten block"}
                </strong>
                <small>
                  {block.question ||
                    (block.review === "needs-work"
                      ? "Needs work"
                      : block.review === "revisited"
                        ? historical
                          ? "Historical self-review"
                          : "Revisited"
                        : "Not self-reviewed")}
                </small>
              </span>
            </button>
          </li>
        ))}
      </ol>
      <div className="argument-editor">
        <label htmlFor={`${fieldId}-text`}>
          Your argument, block {position + 1}
        </label>
        <p id={`${fieldId}-hint`}>
          Write in your own words. Use $…$ for mathematics.
        </p>
        <textarea
          id={`${fieldId}-text`}
          aria-describedby={`${fieldId}-hint`}
          value={active.text}
          maxLength={argumentLimits.textBytes}
          onChange={(event) =>
            edit({ text: event.target.value, review: "unreviewed" })
          }
          rows={9}
          placeholder="Name the objects and the map you want to construct. Justify one move at a time."
        />
        <button
          className="argument-text-button"
          aria-expanded={preview}
          onClick={() => setPreview(!preview)}
        >
          {preview ? "Hide formatted writing" : "Preview formatted writing"}
        </button>
        {preview && (
          <div
            className="argument-writing-preview argument-written-prose"
            aria-label="Formatted writing"
          >
            <Prose>
              {active.text || "Your formatted writing appears here."}
            </Prose>
          </div>
        )}
        <label htmlFor={`${fieldId}-question`}>Question for this block</label>
        <textarea
          id={`${fieldId}-question`}
          rows={2}
          value={active.question}
          maxLength={argumentLimits.questionBytes}
          onChange={(event) =>
            edit({ question: event.target.value, review: "needs-work" })
          }
          placeholder="Which equality, hypothesis or construction needs work?"
        />
        <button
          className="argument-consult-action"
          onClick={() => {
            edit({ review: "needs-work" });
            consult();
          }}
        >
          <Search size={16} aria-hidden="true" /> Find support for this question
        </button>
        <label htmlFor={`${fieldId}-review`}>
          {historical ? "Self-review of retained teaching" : "Your self-review"}
        </label>
        <select
          id={`${fieldId}-review`}
          value={active.review}
          onChange={(event) => {
            const review = event.target.value;
            if (
              review === "unreviewed" ||
              review === "needs-work" ||
              review === "revisited"
            )
              edit({ review });
          }}
        >
          <option value="unreviewed">Not self-reviewed</option>
          <option value="needs-work">Needs work</option>
          <option value="revisited">I revisited this reasoning</option>
        </select>
        {active.reference !== null && (
          <div className="argument-attached-reference">
            <span>
              Reference {active.reference + 1} from this sheet’s teaching
              edition
            </span>
            <button onClick={() => edit({ reference: null })}>
              Remove reference
            </button>
          </div>
        )}
        <p className="argument-caption">
          Writing, comparison and self-review give no competency credit.
        </p>
        <div className="argument-actions argument-block-actions">
          <button
            disabled={sheet.blocks.length >= argumentLimits.blocks}
            onClick={() => {
              const block: ArgumentBlock = {
                id: crypto.randomUUID(),
                text: "",
                question: "",
                review: "unreviewed",
                reference: null,
              };
              commit({
                ...sheet,
                blocks: [...sheet.blocks, block],
                activeBlockId: block.id,
              });
            }}
          >
            <Plus size={16} aria-hidden="true" /> Add block
          </button>
          <button
            className="argument-text-button"
            disabled={sheet.blocks.length <= 1}
            onClick={() => setRemoving(active.id)}
          >
            Remove this block
          </button>
        </div>
        {removing === active.id && (
          <div
            className="argument-confirmation"
            role="group"
            aria-label="Remove argument block"
          >
            <p>Remove this block and its question?</p>
            <div className="argument-actions">
              <button
                onClick={() => {
                  const blocks = sheet.blocks.filter(
                    (block) => block.id !== active.id,
                  );
                  commit({ ...sheet, blocks, activeBlockId: blocks[0].id });
                  setRemoving(null);
                }}
              >
                Remove block
              </button>
              <button onClick={() => setRemoving(null)}>Keep block</button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export function ArgumentComparison({
  sheet,
  commit,
  historical,
}: {
  sheet: ArgumentSheet;
  commit: (sheet: ArgumentSheet) => void;
  historical: boolean;
}) {
  const active =
    sheet.blocks.find((block) => block.id === sheet.activeBlockId) ??
    sheet.blocks[0];
  return (
    <section className="argument-comparison" aria-label="Compare with teaching">
      <header className="argument-panel-heading">
        <div>
          <span className="section-kicker">
            {historical ? "RETAINED TEACHING" : "REVIEWED TEACHING"}
          </span>
          <h2 id="argument-compare-heading" tabIndex={-1}>
            Compare one move at a time
          </h2>
        </div>
      </header>
      <p className="argument-caption">
        References belong to the edition stored with this sheet. Choosing one
        records what you consulted.
      </p>
      <ol className="argument-proof-references">
        {sheet.edition.proof.map((text, index) => (
          <li key={index} data-selected={active.reference === index}>
            <span className="argument-reference-label">
              REFERENCE {index + 1}
            </span>
            <p>
              <Prose>{text}</Prose>
            </p>
            <button
              aria-pressed={active.reference === index}
              onClick={() =>
                commit({
                  ...sheet,
                  activeBlockId: active.id,
                  blocks: sheet.blocks.map((block) =>
                    block.id === active.id
                      ? { ...block, reference: index }
                      : block,
                  ),
                })
              }
            >
              {active.reference === index
                ? "Reference attached"
                : `Attach reference ${index + 1} to this block`}
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
