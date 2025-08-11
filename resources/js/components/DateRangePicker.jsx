export default function DateRangePicker({ startDate, endDate, onChange }) {
    return (
        <div className="mb-6 flex items-center gap-4">
            <label className="flex flex-col text-sm font-medium">
                Start Date
                <input type="date" value={startDate} onChange={(e) => onChange(e.target.value, 'start')} className="mt-1 rounded border px-2 py-1" />
            </label>
            <label className="flex flex-col text-sm font-medium">
                End Date
                <input type="date" value={endDate} onChange={(e) => onChange(e.target.value, 'end')} className="mt-1 rounded border px-2 py-1" />
            </label>
        </div>
    );
}
