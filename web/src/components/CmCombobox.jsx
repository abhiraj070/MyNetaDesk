"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";

import { highlight } from "@/lib/ministries";
import { searchCms } from "@/lib/chiefMinisters";

/**
 * Searchable Chief Minister picker, following the same ARIA combobox pattern
 * as `MinistryCombobox`: `aria-expanded` / `aria-controls` /
 * `aria-activedescendant` on the input, with a listbox of options. Arrow
 * keys move, Enter selects, Escape dismisses.
 *
 * Simpler than the ministry picker underneath — 31 flat rows, no portfolio
 * fragments or rank grouping — but the interaction shape stays identical so
 * switching tabs in the Search sheet doesn't relearn a new control.
 */
export function CmCombobox({ cms, selected, onSelect, onClear }) {
  const listboxId = useId();
  const optionId = (index) => `${listboxId}-opt-${index}`;

  const [draft, setDraft] = useState(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const value = draft ?? selected?.name ?? "";
  const effectiveQuery = draft ?? "";

  const results = useMemo(
    () => searchCms(cms, effectiveQuery),
    [cms, effectiveQuery],
  );

  const active = results.length > 0 ? Math.min(activeIndex, results.length - 1) : 0;

  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector(`#${CSS.escape(optionId(active))}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [open, active]); // eslint-disable-line react-hooks/exhaustive-deps

  const close = useCallback(() => {
    setOpen(false);
    setDraft(null);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) close();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, close]);

  const commit = useCallback(
    (cm) => {
      if (!cm) return;
      onSelect(cm);
      setDraft(null);
      setOpen(false);
      inputRef.current?.blur();
    },
    [onSelect],
  );

  function handleKeyDown(event) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      if (results.length === 0) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((index) => {
        const from = Math.min(index, results.length - 1);
        return (from + step + results.length) % results.length;
      });
      return;
    }

    if (event.key === "Home" || event.key === "End") {
      if (!open || results.length === 0) return;
      event.preventDefault();
      setActiveIndex(event.key === "Home" ? 0 : results.length - 1);
      return;
    }

    if (event.key === "Enter") {
      if (!open) return;
      event.preventDefault();
      commit(results[active]);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }

    if (event.key === "Tab" && open) close();
  }

  const showClear = Boolean(selected);

  return (
    <div ref={rootRef} className="relative">
      <div
        className={`flex items-center gap-2.5 rounded-control border bg-surface px-3.5 transition-colors ${
          open ? "border-brand" : "border-rule"
        }`}
      >
        <Search className="size-4 shrink-0 text-muted" strokeWidth={2} />

        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={
            open && results.length > 0 ? optionId(active) : undefined
          }
          aria-label="Search a state or a Chief Minister"
          autoComplete="off"
          spellCheck={false}
          placeholder="Search a state or a Chief Minister"
          value={value}
          onChange={(event) => {
            setDraft(event.target.value);
            setActiveIndex(0);
            setOpen(true);
          }}
          onFocus={(event) => {
            setOpen(true);
            event.target.select();
          }}
          onKeyDown={handleKeyDown}
          className="w-full bg-transparent py-2.5 text-sm text-ink outline-none placeholder:text-muted"
        />

        {showClear ? (
          <button
            type="button"
            onClick={() => {
              onClear();
              setDraft(null);
              setOpen(false);
            }}
            aria-label="Clear selected Chief Minister"
            className="shrink-0 rounded-full p-1 text-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            <X className="size-4" strokeWidth={2} />
          </button>
        ) : (
          <span className="shrink-0 text-[11px] whitespace-nowrap text-faint">
            {open && effectiveQuery
              ? `${results.length} of ${cms.length}`
              : `${cms.length} states`}
          </span>
        )}
      </div>

      {open && (
        <div className="absolute inset-x-0 top-full z-20 mt-1.5 overflow-hidden rounded-control border border-rule bg-surface shadow-card">
          <ul
            ref={listRef}
            id={listboxId}
            role="listbox"
            aria-label="Chief Ministers"
            className="max-h-72 overflow-y-auto"
          >
            {results.map((cm, index) => (
              <Option
                key={cm.state_key}
                id={optionId(index)}
                cm={cm}
                query={effectiveQuery}
                active={index === active}
                selected={selected?.state_key === cm.state_key}
                onPick={() => commit(cm)}
                onHover={() => setActiveIndex(index)}
              />
            ))}

            {results.length === 0 && (
              <li className="px-3.5 py-6 text-center text-sm text-muted">
                No state or Chief Minister matches “{effectiveQuery}”.
              </li>
            )}
          </ul>

          {results.length > 0 && (
            <p className="border-t border-rule px-3.5 py-2 text-[11px] text-faint">
              ↑ ↓ to move · ↵ to select · esc to dismiss
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Option({ id, cm, query, active, selected, onPick, onHover }) {
  return (
    <li
      id={id}
      role="option"
      aria-selected={selected}
      // Pointer, not click: the outside-press listener fires on pointerdown,
      // and a plain onClick would lose the race and close before selecting.
      onPointerDown={(event) => {
        event.preventDefault();
        onPick();
      }}
      onMouseMove={onHover}
      className={`cursor-pointer border-b border-rule px-3.5 py-2.5 last:border-b-0 ${
        active ? "bg-brand-wash" : ""
      }`}
    >
      <div className="flex items-baseline gap-3">
        <span className="min-w-0 flex-1 truncate text-sm text-ink">
          <Marked runs={highlight(cm.name, query)} />
        </span>
        <span className="shrink-0 text-[11px] whitespace-nowrap text-muted">
          {cm.party}
        </span>
      </div>
      <p className="mt-0.5 truncate text-xs text-muted">
        <Marked runs={highlight(cm.state, query)} />
      </p>
    </li>
  );
}

/** Underlines the matched prefix rather than colouring it — quieter. */
function Marked({ runs }) {
  return runs.map((run, index) =>
    run.match ? (
      <mark
        key={index}
        className="bg-transparent font-medium text-ink underline decoration-ink/30 underline-offset-2"
      >
        {run.text}
      </mark>
    ) : (
      <span key={index}>{run.text}</span>
    ),
  );
}
