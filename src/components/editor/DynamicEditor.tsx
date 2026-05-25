"use client";

import dynamic from "next/dynamic";
import React from "react";
import { OutputData } from "@editorjs/editorjs";

interface DynamicEditorProps {
  initialData?: OutputData;
  onChange: (data: OutputData) => void;
}

const BlockEditor = dynamic(() => import("./BlockEditor"), {
  ssr: false,
  loading: () => <div className="h-28 animate-pulse bg-muted/5 rounded-xl w-full" />,
});

export default function DynamicEditor(props: DynamicEditorProps) {
  return <BlockEditor {...props} />;
}
