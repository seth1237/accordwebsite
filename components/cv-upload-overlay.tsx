'use client'

export function CvUploadOverlay({
  label = 'Uploading your CV',
}: {
  label?: string
}) {
  return (
    <div className="cv-up-overlay" role="status" aria-live="polite">
      <div className="cv-up-card">
        <div className="cv-up-stage" aria-hidden="true">
          <span className="cv-up-spark cv-up-spark-a" />
          <span className="cv-up-spark cv-up-spark-b" />
          <span className="cv-up-spark cv-up-spark-c" />
          <span className="cv-up-folder">
            <span className="cv-up-flap" />
            <span className="cv-up-pocket" />
          </span>
          <span className="cv-up-sheet">CV</span>
        </div>
        <span className="cv-up-tray">
          <span className="cv-up-bar" />
        </span>
        <p>{label}</p>
      </div>
    </div>
  )
}
