export default function Table({ columns, children }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-graphite-800/10 dark:border-paper-100/10">
            {columns.map((col) => (
              <th
                key={col.key}
                className="manifest-label whitespace-nowrap px-3 py-2.5 text-left"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-graphite-800/[0.06] dark:divide-paper-100/[0.06]">
          {children}
        </tbody>
      </table>
    </div>
  );
}

export function Td({ children, className = "" }) {
  return (
    <td className={`px-3 py-3 align-middle text-graphite-800 dark:text-paper-200 ${className}`}>
      {children}
    </td>
  );
}

export function Tr({ children, ...props }) {
  return (
    <tr
      className="transition-colors hover:bg-graphite-800/[0.03] dark:hover:bg-paper-100/[0.03]"
      {...props}
    >
      {children}
    </tr>
  );
}
