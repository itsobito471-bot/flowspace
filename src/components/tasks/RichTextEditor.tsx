"use client";

import React, { useEffect, useRef } from "react";
import EditorJS, { OutputData } from "@editorjs/editorjs";
import Header from "@editorjs/header";
import List from "@editorjs/list";
import Checklist from "@editorjs/checklist";

interface RichTextEditorProps {
  data?: OutputData;
  onChange: (data: OutputData) => void;
  placeholder?: string;
  readOnly?: boolean;
}

export default function RichTextEditor({
  data, onChange, placeholder, readOnly = false
}: RichTextEditorProps) {
  const editorRef = useRef<EditorJS | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editorRef.current && containerRef.current) {
      const editor = new EditorJS({
        holder: containerRef.current,
        tools: {
          header: {
            class: Header as any,
            inlineToolbar: true,
            config: {
              placeholder: "Heading…",
              levels: [1, 2, 3],
              defaultLevel: 2,
            },
          },
          list: {
            class: List as any,
            inlineToolbar: true,
          },
          checklist: {
            class: Checklist as any,
            inlineToolbar: true,
          },
        },
        data: data || { blocks: [] },
        placeholder: placeholder || "Add a description, checklist, or heading…",
        readOnly,
        onChange: async () => {
          if (!readOnly) {
            const content = await editor.saver.save();
            onChange(content);
          }
        },
      });
      editorRef.current = editor;
    }

    return () => {
      if (editorRef.current?.destroy) {
        try { editorRef.current.destroy(); } catch {}
        editorRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <style>{`
        /* ── Checklist: radio-style circles ── */
        .cdx-checklist__item-checkbox {
          width: 18px !important;
          height: 18px !important;
          border-radius: 50% !important;
          border: 2px solid var(--muted, #6b7280) !important;
          background: transparent !important;
          flex-shrink: 0;
          transition: border-color 0.15s, background 0.15s;
        }
        .cdx-checklist__item input[type="checkbox"]:checked + .cdx-checklist__item-checkbox,
        .cdx-checklist__item--checked .cdx-checklist__item-checkbox {
          border-color: var(--cyan) !important;
          background: transparent !important;
        }
        .cdx-checklist__item--checked .cdx-checklist__item-checkbox::after {
          display: none !important;
        }
        /* Hide built-in check mark; use a dot instead */
        .cdx-checklist__item--checked .cdx-checklist__item-checkbox::before {
          content: '' !important;
          display: block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--cyan) !important;
          margin: auto;
          position: relative;
          top: 50%;
          transform: translateY(-50%);
        }
        .cdx-checklist__item--checked .cdx-checklist__item-text {
          text-decoration: line-through;
          opacity: 0.45;
        }
        .cdx-checklist__item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 4px 0;
        }

        /* ── Editor general ── */
        .codex-editor { color: var(--foreground); }
        .ce-block__content { max-width: 100% !important; }
        .cdx-block { padding: 4px 0; }
        .ce-toolbar__plus, .ce-toolbar__settings-btn { color: var(--cyan) !important; }
        .ce-inline-tool--active, .ce-inline-toolbar__dropdown { color: var(--cyan) !important; }

        /* Heading sizes */
        .ce-header[data-level="1"] { font-size: 1.6rem; font-weight: 700; }
        .ce-header[data-level="2"] { font-size: 1.25rem; font-weight: 700; }
        .ce-header[data-level="3"] { font-size: 1rem; font-weight: 600; }
      `}</style>
      <div className="prose prose-sm dark:prose-invert max-w-none w-full">
        <div
          ref={containerRef}
          className="min-h-[140px] px-4 py-3 bg-surface border border-muted/15 rounded-xl focus-within:ring-2 focus-within:ring-cyan/40 focus-within:border-cyan/50 transition-all"
        />
      </div>
    </>
  );
}
