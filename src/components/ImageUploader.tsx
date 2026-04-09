interface ImageUploaderProps {
  entryId?: string
}

export default function ImageUploader({ entryId: _entryId }: ImageUploaderProps) {
  return (
    <div>
      {/* TODO: upload images to R2 via signed URL, store r2_url in DB */}
      <button type="button">Add Photos</button>
    </div>
  )
}
