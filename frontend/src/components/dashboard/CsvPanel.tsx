import { useRef, useState } from 'react'
import { api } from '../../api/client'

interface ImportResult {
  imported: number
  skipped: { row: number; reason: string }[]
  warnings: { row: number; reason: string }[]
}

export default function CsvPanel({ onImported }: { onImported?: () => void }) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const importFile = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    setError(null)
    setResult(null)
    try {
      const outcome = await api.upload<ImportResult>('/api/import/csv', formData)
      setResult(outcome)
      onImported?.()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  return (
    <div className="csv-panel">
      <div className="csv-actions">
        <a className="btn" href="/api/export/csv" download="applications.csv">
          ⬇ Export CSV
        </a>
        <button className="btn" onClick={() => fileInput.current?.click()}>
          ⬆ Import CSV
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".csv,text/csv"
          hidden
          aria-label="CSV file"
          onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0])}
        />
      </div>
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
      {result && (
        <div className="csv-result">
          <p>
            Imported <strong>{result.imported}</strong> application
            {result.imported === 1 ? '' : 's'}
            {result.skipped.length > 0 && `, skipped ${result.skipped.length}`}.
          </p>
          {[...result.warnings, ...result.skipped].slice(0, 5).map((item) => (
            <p className="muted" key={`${item.row}-${item.reason}`}>
              Row {item.row}: {item.reason}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
