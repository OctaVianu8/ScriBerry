import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

interface RichEditorProps {
  content?: string
  onChange?: (content: string) => void
}

export default function RichEditor({ content, onChange }: RichEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: content ?? '',
    onUpdate({ editor }) {
      onChange?.(JSON.stringify(editor.getJSON()))
    },
  })

  return <EditorContent editor={editor} />
}
