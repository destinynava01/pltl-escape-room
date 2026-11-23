import { escGame } from './api'

// Builds the results spreadsheet (Summary, Locks, Attempts, Students) and saves it.
// The Excel library is loaded only when someone downloads, so it never slows the game down.
export async function downloadResults({ gameId, hostToken }) {
  const data = await escGame({ action: 'game_results', game_id: gameId, host_token: hostToken })
  const XLSX = await import('xlsx')

  const book = XLSX.utils.book_new()
  const addSheet = (name, rows, widths) => {
    const sheet = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Note: 'Nothing to show yet.' }])
    sheet['!cols'] = widths.map((wch) => ({ wch }))
    XLSX.utils.book_append_sheet(book, sheet, name)
  }

  addSheet('Summary', data.summary ?? [], [7, 24, 9, 13, 7, 12, 11])
  addSheet('Locks', data.questions ?? [], [4, 22, 60, 32, 34, 34, 34, 34])
  addSheet('Attempts', data.attempts ?? [], [7, 22, 18, 6, 60, 32, 18])
  addSheet('Students', data.students ?? [], [22, 18, 13, 13])

  const today = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(book, `PLTL-Escape-Room-results-${today}.xlsx`)
}
