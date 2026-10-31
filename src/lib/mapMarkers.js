export const markerSize = 24
export const markerGap = 8

const svg = paths => `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`
export const categoryIcons = {
  bridge: svg('<path d="M2 17h20M4 17V6m16 11V6M4 8c4 7 12 7 16 0M8 12v5m4-4v4m4-5v5M2 21h20"/>'),
  'flood-control': svg('<path d="M2 16h5l5-9h4l5 9M2 20c2-2 3 2 5 0s3 2 5 0 3 2 5 0 3 2 5 0M13 7l4 9M12 4h4"/>'),
  museum: svg('<path d="m3 9 9-6 9 6H3Zm2 11h14M7 11v6m5-6v6m5-6v6M3 22h18"/>'),
}

// Lay out equal-size markers in screen pixels. Reserve a square for every icon,
// including icons moved earlier, so nearby groups cannot collide with each other.
export function spreadMarkers(points, spacing = markerSize + markerGap) {
  const cells = new Map()
  const cellKey = (x, y) => `${x},${y}`
  const free = point => {
    const cx = Math.floor(point.x / spacing), cy = Math.floor(point.y / spacing)
    for (let x = cx - 1; x <= cx + 1; x++) {
      for (let y = cy - 1; y <= cy + 1; y++) {
        for (const other of cells.get(cellKey(x, y)) || []) {
          if (Math.abs(point.x - other.x) < spacing && Math.abs(point.y - other.y) < spacing) return false
        }
      }
    }
    return true
  }
  return points.map(origin => {
    let placed = { x: origin.x, y: origin.y }
    search: for (let ring = 0; ; ring++) {
      for (let y = -ring; y <= ring; y++) {
        for (let x = -ring; x <= ring; x++) {
          if (Math.max(Math.abs(x), Math.abs(y)) !== ring) continue
          const candidate = { x: origin.x + x * spacing, y: origin.y + y * spacing }
          if (free(candidate)) { placed = candidate; break search }
        }
      }
    }
    const key = cellKey(Math.floor(placed.x / spacing), Math.floor(placed.y / spacing))
    if (!cells.has(key)) cells.set(key, [])
    cells.get(key).push(placed)
    return { ...placed, moved: placed.x !== origin.x || placed.y !== origin.y }
  })
}
