"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TiptapImage from "@tiptap/extension-image";
import TiptapLink from "@tiptap/extension-link";
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
  label = "Description",
}: {
  value: string;
  onChange: (html: string) => void;
  label?: string;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TiptapImage,
      // openOnClick: false -- a link inside the editor must be editable
      // text, not a navigation trap, while an admin is actively writing.
      // autolink: false -- typing a bare URL/email shouldn't silently
      // become a link; only the toolbar button (an explicit action)
      // creates one.
      TiptapLink.configure({ openOnClick: false, autolink: false }),
    ],
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

  // A prompt-based flow (matching the codebase's existing window.confirm
  // usage elsewhere, e.g. delete buttons) rather than a modal -- setting a
  // link is an occasional action, not worth a new dialog component.
  // Clicking with the cursor already inside a link removes it instead
  // (mirrors most rich-text editors' toggle behavior for this button).
  function handleLinkToggle() {
    if (!editor) return;
    if (editor.isActive("link")) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    const url = window.prompt("Link URL (e.g. /shipping or https://example.com)");
    if (!url) return;
    editor.chain().focus().setLink({ href: url }).run();
  }

  if (!editor) return null;

  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium">{label}</label>}
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
          <ToolbarButton label="Link" active={editor.isActive("link")} onClick={handleLinkToggle}>
            Link
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
