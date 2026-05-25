"use client";

import React, { useEffect, useRef } from "react";
import EditorJS, { OutputData } from "@editorjs/editorjs";
// @ts-ignore
import Header from "@editorjs/header";
// @ts-ignore
import List from "@editorjs/list";
// @ts-ignore
import Checklist from "@editorjs/checklist";

interface BlockEditorProps {
  initialData?: any;
  onChange: (data: OutputData) => void;
}

export default function BlockEditor({ initialData, onChange }: BlockEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<EditorJS | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Keep track of the latest onChange callback to prevent stale closures
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    let isMounted = true;
    let editor: EditorJS | null = null;

    const initEditor = () => {
      if (!containerRef.current) return;

      // Create a unique child container for this specific editor instance
      const editorDiv = document.createElement("div");
      editorDiv.className = "w-full";

      // Clear the parent container and append the new editor element
      containerRef.current.innerHTML = "";
      containerRef.current.appendChild(editorDiv);

      // Sanitize and handle initial data (including legacy string descriptions)
      let dataForEditor: OutputData = { blocks: [] };
      if (initialData) {
        if (typeof initialData === "object" && Array.isArray((initialData as any).blocks)) {
          dataForEditor = initialData as OutputData;
        } else if (typeof initialData === "string" && initialData.trim() !== "") {
          // Convert legacy text description to Editor.js paragraph block structure
          dataForEditor = {
            blocks: [
              {
                id: "legacy-desc",
                type: "paragraph",
                data: {
                  text: initialData,
                },
              },
            ],
          };
        }
      }

      editor = new EditorJS({
        holder: editorDiv,
        tools: {
          header: {
            class: Header as any,
            inlineToolbar: true,
            config: {
              placeholder: "Heading...",
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
        data: dataForEditor,
        placeholder: "Start typing description, checklist, or heading...",
        onChange: async () => {
          if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
          }
          debounceTimeoutRef.current = setTimeout(async () => {
            if (isMounted && editor) {
              try {
                const content = await editor.saver.save();
                onChangeRef.current(content);
              } catch (e) {
                console.error("Failed to save EditorJS content:", e);
              }
            }
          }, 800); // 800ms debounce to prevent hammering the server/DB on every keystroke
        },
      });

      editorRef.current = editor;
    };

    initEditor();

    return () => {
      isMounted = false;

      // If there is a pending save when unmounting, save immediately
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        if (editor) {
          editor.saver.save()
            .then((content) => {
              onChangeRef.current(content);
            })
            .catch((err) => {
              console.error("Failed to save EditorJS content on unmount:", err);
            });
        }
      }

      if (editorRef.current) {
        const currentEditor = editorRef.current;
        editorRef.current = null;

        // Ensure we only destroy the editor after it is fully ready
        currentEditor.isReady
          .then(() => {
            try {
              currentEditor.destroy();
            } catch (e) {
              console.error("Failed to destroy EditorJS instance during cleanup:", e);
            }
          })
          .catch((e) => {
            console.error("EditorJS ready check failed during cleanup:", e);
          });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none w-full">
      <div ref={containerRef} className="w-full text-foreground" />
    </div>
  );
}
