"use client";

import React, { useEffect, useRef } from "react";
import EditorJS, { OutputData } from "@editorjs/editorjs";
import Header from "@editorjs/header";
import List from "@editorjs/list";

interface RichTextEditorProps {
  data?: OutputData;
  onChange: (data: OutputData) => void;
  placeholder?: string;
  readOnly?: boolean;
}

export default function RichTextEditor({ data, onChange, placeholder, readOnly = false }: RichTextEditorProps) {
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
              placeholder: 'Enter a header',
              levels: [1, 2, 3, 4],
              defaultLevel: 2
            }
          },
          list: {
            class: List as any,
            inlineToolbar: true,
          },
        },
        data: data || { blocks: [] },
        placeholder: placeholder || "Type your task description here...",
        readOnly: readOnly,
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
      if (editorRef.current && editorRef.current.destroy) {
        try {
          editorRef.current.destroy();
        } catch (e) {
          console.error("Editor instance cleanup failed", e);
        }
        editorRef.current = null;
      }
    };
    // Initialize once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none w-full">
      <div 
        ref={containerRef} 
        className="min-h-[150px] p-4 bg-surface border border-muted/20 rounded-xl focus-within:ring-2 focus-within:ring-violet/50 focus-within:border-violet/50" 
      />
    </div>
  );
}
