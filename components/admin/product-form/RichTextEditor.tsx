"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TiptapImage from "@tiptap/extension-image";
import { uploadAdminImage } from "@/lib/admin/uploads";

function ToolbarButton({
  onClick,
  active,
  children,
  label,
}: {
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-[var(--radius-sm)] px-2.5 py-1.5 text-sm font-medium ${
        active ? "bg-[var(--foreground)] text-white" : "hover:bg-black/5"
      }`}
    >
      {children}
    </button>
  );
}

export function RichTextEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (html: string) => void;
}) {
  const editor = useEditor({
    extensions: [StarterKit, TiptapImage],
    content: value,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "prose-editor min-h-[10rem] px-3 py-2 text-sm focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !editor) return;

    const formData = new FormData();
    formData.set("file", file);
    const result = await uploadAdminImage("editor", formData);
    if (result.url) {
      editor.chain().focus().setImage({ src: result.url }).run();
    }
  }

  if (!editor) return null;

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium">Description</label>
      <div className="rounded-[var(--radius-sm)] border border-[var(--border)]">
        <div className="flex flex-wrap items-center gap-1 border-b border-[var(--border)] p-1.5">
          <ToolbarButton
            label="Bold"
            active={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            B
          </ToolbarButton>
          <ToolbarButton
            label="Italic"
            active={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            I
          </ToolbarButton>
          <ToolbarButton
            label="Bullet list"
            active={editor.isActive("bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            • List
          </ToolbarButton>
          <ToolbarButton
            label="Numbered list"
            active={editor.isActive("orderedList")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            1. List
          </ToolbarButton>
          <label className="cursor-pointer rounded-[var(--radius-sm)] px-2.5 py-1.5 text-sm font-medium hover:bg-black/5">
            Image
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </label>
        </div>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
