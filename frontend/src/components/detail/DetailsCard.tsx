import type { ApplicationDetail, WorkMode } from '../../api/types'
import { CURRENCY_OPTIONS, fmtSalary, SOURCE_OPTIONS, WORK_MODE_LABELS } from '../../lib/design'
import { shortDate } from '../../lib/dates'
import DateInput from '../ui/DateInput'
import LocationInput from '../ui/LocationInput'
import Select from '../ui/Select'

const asGroup = (values: readonly string[], labels?: Record<string, string>) => [
  { options: values.map((v) => ({ value: v, label: labels?.[v] ?? v })) },
]

const WORK_MODE_GROUP = asGroup(['remote', 'hybrid', 'onsite'], WORK_MODE_LABELS)

export interface DetailsDraft {
  company: string
  role: string
  jobUrl: string
  appliedDate: string
  location: string
  workMode: WorkMode
  source: string
  salaryMin: string
  salaryMax: string
  currency: string
}

export function draftFrom(application: ApplicationDetail): DetailsDraft {
  return {
    company: application.company,
    role: application.role,
    jobUrl: application.job_url ?? '',
    appliedDate: application.applied_date ?? '',
    location: application.location ?? '',
    workMode: application.work_mode ?? 'remote',
    source: application.source ?? 'LinkedIn',
    salaryMin: application.salary_min == null ? '' : String(application.salary_min),
    salaryMax: application.salary_max == null ? '' : String(application.salary_max),
    currency: application.salary_currency || 'USD',
  }
}

interface Props {
  application: ApplicationDetail
  editing: boolean
  draft: DetailsDraft | null
  onDraftChange: (draft: DetailsDraft) => void
  onStartEdit: () => void
  onCancelEdit: () => void
  onSaveEdit: () => void
}

export default function DetailsCard({
  application,
  editing,
  draft,
  onDraftChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
}: Props) {
  const set = (field: keyof DetailsDraft) => (value: string) =>
    draft && onDraftChange({ ...draft, [field]: value })

  // Keep a stored value selectable even when it isn't one of the design's
  // canned options, so opening the editor can't silently change data.
  const sourceOptions =
    draft && draft.source && !SOURCE_OPTIONS.includes(draft.source)
      ? [draft.source, ...SOURCE_OPTIONS]
      : SOURCE_OPTIONS
  const currencyOptions =
    draft && draft.currency && !CURRENCY_OPTIONS.includes(draft.currency)
      ? [draft.currency, ...CURRENCY_OPTIONS]
      : CURRENCY_OPTIONS

  return (
    <div className="side-card">
      <div className="side-card-head">
        <span className="side-card-label">Details</span>
        {editing ? (
          <div className="side-card-actions">
            <button className="btn-ghost" onClick={onCancelEdit}>
              Cancel
            </button>
            <button className="save-pill" onClick={onSaveEdit}>
              Save
            </button>
          </div>
        ) : (
          <button className="link-accent" onClick={onStartEdit}>
            Edit
          </button>
        )}
      </div>

      {!editing && (
        <div className="fact-list">
          <div className="fact">
            <div className="fact-label">Applied</div>
            <div>{application.applied_date ? shortDate(application.applied_date) : 'Not yet applied'}</div>
          </div>
          <div className="fact">
            <div className="fact-label">Location</div>
            <div>{application.location || 'Not specified'}</div>
          </div>
          <div className="fact">
            <div className="fact-label">Work mode</div>
            <div>{application.work_mode ? WORK_MODE_LABELS[application.work_mode] : 'Not specified'}</div>
          </div>
          <div className="fact">
            <div className="fact-label">Salary</div>
            <div>{fmtSalary(application.salary_min, application.salary_max, application.salary_currency)}</div>
          </div>
          <div className="fact">
            <div className="fact-label">Source</div>
            <div>{application.source || 'Not specified'}</div>
          </div>
        </div>
      )}

      {editing && draft && (
        <div className="details-edit">
          <label>
            Job posting URL
            <input value={draft.jobUrl} onChange={(e) => set('jobUrl')(e.target.value)} />
          </label>
          <div className="details-edit-field">
            Applied date
            <DateInput
              ariaLabel="Applied date"
              compact
              value={draft.appliedDate}
              onChange={set('appliedDate')}
            />
          </div>
          <div className="details-edit-field">
            Location
            <LocationInput value={draft.location} onChange={set('location')} placeholder="" />
          </div>
          <div className="details-edit-field">
            Work mode
            <Select
              ariaLabel="Work mode"
              compact
              value={draft.workMode}
              groups={WORK_MODE_GROUP}
              onChange={set('workMode')}
            />
          </div>
          <div className="salary-row">
            <label>
              Min salary
              <input
                type="number"
                min="0"
                value={draft.salaryMin}
                onChange={(e) => set('salaryMin')(e.target.value)}
              />
            </label>
            <label>
              Max salary
              <input
                type="number"
                min="0"
                value={draft.salaryMax}
                onChange={(e) => set('salaryMax')(e.target.value)}
              />
            </label>
            <div className="details-edit-field currency">
              Currency
              <Select
                ariaLabel="Currency"
                compact
                value={draft.currency}
                groups={asGroup(currencyOptions)}
                onChange={set('currency')}
              />
            </div>
          </div>
          <div className="details-edit-field">
            Source
            <Select
              ariaLabel="Source"
              compact
              value={draft.source}
              groups={asGroup(sourceOptions)}
              onChange={set('source')}
            />
          </div>
        </div>
      )}
    </div>
  )
}
