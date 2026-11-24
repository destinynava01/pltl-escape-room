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

  // One sheet per team (its own random locks, in order). Excel files made in the browser can't hold
  // pictures, so a question's picture is a clickable "View picture" link.
  const used = new Set(book.SheetNames)
  for (const team of data.team_sheets ?? []) {
    let name = (team.name || 'Team').replace(/[[\]:*?/\\]/g, ' ').slice(0, 28).trim() || 'Team'
    for (let n = 2; used.has(name); n++) name = `${name.slice(0, 25)} ${n}`
    used.add(name)

    const sheet = XLSX.utils.json_to_sheet(team.rows.length ? team.rows : [{ Note: 'This team had no locks.' }])
    sheet['!cols'] = [6, 22, 60, 30, 22, 7, 14, 15, 6, 14].map((wch) => ({ wch }))
    const columns = Object.keys(team.rows[0] ?? {})
    const pictureColumn = columns.indexOf('Picture')
    if (pictureColumn >= 0) {
      team.rows.forEach((row, i) => {
        if (!row.Picture) return
        const cell = sheet[XLSX.utils.encode_cell({ r: i + 1, c: pictureColumn })]
        cell.v = 'View picture'
        cell.l = { Target: row.Picture, Tooltip: 'Open the question picture' }
      })
    }
    XLSX.utils.book_append_sheet(book, sheet, name)
  }

  const today = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(book, `PLTL-Escape-Room-results-${today}.xlsx`)
}
