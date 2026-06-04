const C = {
  bg: '#F7F8F4',
  ink: '#171B1F',
  muted: '#657078',
  line: '#D9DED7',
  green: '#1F7A5C',
  green2: '#DFF2E7',
  amber: '#E8B44F',
  amber2: '#FFF1CF',
  blue: '#2E6EA6',
  blue2: '#DDECF8',
  red: '#C9514A',
  red2: '#F8DEDA',
  white: '#FFFFFF',
  dark: '#101820',
}

function box(slide, x, y, w, h, opts = {}) {
  const shape = slide.shapes.add({
    geometry: opts.round ? 'roundRect' : 'rect',
    position: { left: x, top: y, width: w, height: h },
    fill: { type: 'solid', color: opts.fill || C.white },
    line: opts.line === false ? { style: 'solid', fill: opts.fill || C.white, width: 0 } : { style: 'solid', fill: opts.stroke || C.line, width: opts.lineWidth ?? 1 },
  })
  if (opts.text !== undefined) {
    shape.text.style = {
      typeface: 'Arial',
      fontSize: opts.size || 26,
      color: opts.color || C.ink,
      bold: Boolean(opts.bold),
      alignment: opts.align || 'left',
      verticalAlignment: opts.valign || 'middle',
      wrap: 'square',
      insets: opts.insets || { top: 14, right: 16, bottom: 14, left: 16 },
      autoFit: 'shrinkText',
    }
    shape.text = opts.text
  }
  return shape
}

function text(slide, value, x, y, w, h, opts = {}) {
  return box(slide, x, y, w, h, {
    text: value,
    fill: opts.fill || C.bg,
    line: false,
    size: opts.size || 28,
    color: opts.color || C.ink,
    bold: opts.bold,
    align: opts.align,
    valign: opts.valign || 'top',
    insets: opts.insets || { top: 0, right: 0, bottom: 0, left: 0 },
  })
}

function pill(slide, value, x, y, w, fill = C.green2, color = C.green) {
  return box(slide, x, y, w, 38, {
    round: true,
    fill,
    stroke: fill,
    text: value,
    size: 18,
    bold: true,
    color,
    align: 'center',
    insets: { top: 6, right: 10, bottom: 6, left: 10 },
  })
}

function header(slide, title, kicker = '') {
  box(slide, 0, 0, 1280, 720, { fill: C.bg, line: false })
  if (kicker) pill(slide, kicker, 64, 42, 260, C.green2, C.green)
  text(slide, title, 64, kicker ? 94 : 54, 980, 88, { size: 42, bold: true })
  box(slide, 64, 150, 1048, 2, { fill: C.line, line: false })
}

function footer(slide, n) {
  text(slide, 'КарПас CRM · carpasss.ru', 64, 676, 360, 24, { size: 15, color: C.muted })
  text(slide, String(n).padStart(2, '0'), 1160, 672, 80, 28, { size: 16, color: C.muted, align: 'right' })
}

function bullets(slide, items, x, y, w, opts = {}) {
  const rowH = opts.rowH || 54
  items.forEach((item, i) => {
    const yy = y + i * rowH
    box(slide, x, yy + 7, 24, 24, { round: true, fill: opts.dot || C.green, stroke: opts.dot || C.green, lineWidth: 0 })
    text(slide, item, x + 38, yy, w - 38, rowH - 4, { size: opts.size || 24, color: opts.color || C.ink })
  })
}

function card(slide, title, body, x, y, w, h, opts = {}) {
  box(slide, x, y, w, h, { round: true, fill: opts.fill || C.white, stroke: opts.stroke || C.line })
  text(slide, title, x + 20, y + 18, w - 40, 34, { size: opts.titleSize || 23, bold: true, color: opts.titleColor || C.ink })
  text(slide, body, x + 20, y + 60, w - 40, h - 78, { size: opts.size || 19, color: opts.color || C.muted })
}

function lane(slide, label, x, y, w, h, fill, color = C.ink) {
  box(slide, x, y, w, h, { round: true, fill, stroke: fill, text: label, size: 20, bold: true, color, align: 'center' })
}

function notes(slide, value) {
  slide.speakerNotes.setText(value)
}

export { C, box, text, pill, header, footer, bullets, card, lane, notes }
