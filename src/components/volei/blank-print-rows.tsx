export function BlankPrintRows({ count, start, columns }: { count: number; start: number; columns: number }) {
  return Array.from({ length: Math.max(0, count) }, (_, index) => (
    <tr key={index} data-slot="blank-print-row">
      <td>{start + index}</td>
      {Array.from({ length: columns - 1 }, (_, column) => <td key={column}>&nbsp;</td>)}
    </tr>
  ));
}
