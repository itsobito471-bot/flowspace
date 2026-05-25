"use client";

import React, { useEffect, useRef } from "react";
import EditorJS, { OutputData } from "@editorjs/editorjs";
// @ts-ignore
import Header from "@editorjs/header";
// @ts-ignore
import List from "@editorjs/list";
// @ts-ignore
import Checklist from "@editorjs/checklist";
// @ts-ignore
import Table from "@editorjs/table";
// @ts-ignore
import Code from "@editorjs/code";
// @ts-ignore
import Quote from "@editorjs/quote";
// @ts-ignore
import Warning from "@editorjs/warning";
// @ts-ignore
import Delimiter from "@editorjs/delimiter";
// @ts-ignore
import ToggleBlock from "editorjs-toggle-block";

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
          // Legacy support configurations (hidden from the toolbox menu)
          header: {
            class: Header as any,
            inlineToolbar: true,
            config: {
              placeholder: "Heading...",
              levels: [1, 2, 3],
              defaultLevel: 2,
            },
            toolbox: false,
          },
          list: {
            class: List as any,
            inlineToolbar: true,
            toolbox: false,
          },

          // New individual toolbox items to match the layout
          header1: {
            class: Header as any,
            inlineToolbar: true,
            config: {
              placeholder: "Heading 1",
              levels: [1],
              defaultLevel: 1,
            },
            shortcut: "CMD+SHIFT+1",
            toolbox: {
              title: "Heading 1",
              icon: '<svg width="18" height="18" viewBox="0 0 24 24"><text x="4" y="18" font-family="sans-serif" font-weight="bold" font-size="16">H1</text></svg>',
            },
          },
          header2: {
            class: Header as any,
            inlineToolbar: true,
            config: {
              placeholder: "Heading 2",
              levels: [2],
              defaultLevel: 2,
            },
            shortcut: "CMD+SHIFT+2",
            toolbox: {
              title: "Heading 2",
              icon: '<svg width="18" height="18" viewBox="0 0 24 24"><text x="4" y="18" font-family="sans-serif" font-weight="bold" font-size="16">H2</text></svg>',
            },
          },
          header3: {
            class: Header as any,
            inlineToolbar: true,
            config: {
              placeholder: "Heading 3",
              levels: [3],
              defaultLevel: 3,
            },
            shortcut: "CMD+SHIFT+3",
            toolbox: {
              title: "Heading 3",
              icon: '<svg width="18" height="18" viewBox="0 0 24 24"><text x="4" y="18" font-family="sans-serif" font-weight="bold" font-size="16">H3</text></svg>',
            },
          },
          bulletList: {
            class: List as any,
            inlineToolbar: true,
            config: {
              defaultStyle: "unordered",
            },
            toolbox: {
              title: "Toggle list", // Maps to Toggle list label in screenshot
              icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>',
            },
          },
          orderedList: {
            class: List as any,
            inlineToolbar: true,
            config: {
              defaultStyle: "ordered",
            },
            toolbox: {
              title: "Numbered list",
              icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="10" y1="6" x2="21" y2="6"></line><line x1="10" y1="12" x2="21" y2="12"></line><line x1="10" y1="18" x2="21" y2="18"></line><path d="M4 6h1v4"></path><path d="M4 10h2"></path><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"></path></svg>',
            },
          },
          toggle: {
            class: ToggleBlock as any,
            inlineToolbar: true,
            config: {
              placeholder: "Toggle list...",
            },
            toolbox: {
              title: "Toggle list",
            },
          },
          checklist: {
            class: Checklist as any,
            inlineToolbar: true,
          },
          table: {
            class: Table as any,
            inlineToolbar: true,
            config: {
              rows: 2,
              cols: 2,
            },
            toolbox: {
              title: "ClickUp List (Table)",
            },
          },
          quote: {
            class: Quote as any,
            inlineToolbar: true,
            config: {
              quotePlaceholder: "Enter a banner quote...",
            },
            toolbox: {
              title: "Banners",
            },
          },
          warning: {
            class: Warning as any,
            inlineToolbar: true,
            config: {
              titlePlaceholder: "Warning title",
              messagePlaceholder: "Warning message",
            },
            toolbox: {
              title: "Banners",
            },
          },
          code: {
            class: Code as any,
            config: {
              placeholder: "Enter code block...",
            },
            toolbox: {
              title: "Code block",
            },
          },
          delimiter: {
            class: Delimiter as any,
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
