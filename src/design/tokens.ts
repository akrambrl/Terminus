// Fichier généré par scripts/sync-tokens.js depuis terminus-kit/tokens.css. Ne pas modifier à la main.
// Valeurs de la charte, prévues pour des visuels de 1080 px de large ; voir src/design/scale.ts pour l'app.

export const color = {
  "blue": "#2B3FD6",
  "tomato": "#FF5A36",
  "sun": "#FFC229",
  "mint": "#14B88A",
  "pink": "#F2458C",
  "violet": "#7B4AE2",
  "surface": "#EEF1FF",
  "ink": "#15123D",
  "inkMuted": "#5A5E8C",
  "white": "#FFFFFF",
  "lineEmpty": "#D5DBF6",
  "cream": "#FFF6DC",
  "plus": "#A9B3EC",
  "brickOnInk": "#1E1A50",
  "brickOnBlue": "#3146DB",
  "brickOnViolet": "#7446DA",
  "brickOnMint": "#1BC093",
  "brickOnSurface": "#E2E6FB"
} as const;

/** Pastilles de ligne : fond et texte. */
export const lineColor = {
  "1": {
    "bg": "#FFCD00",
    "fg": "#15123D"
  },
  "2": {
    "bg": "#2D3E9E",
    "fg": "#FFFFFF"
  },
  "3": {
    "bg": "#A3A03F",
    "fg": "#15123D"
  },
  "4": {
    "bg": "#B4479B",
    "fg": "#FFFFFF"
  },
  "5": {
    "bg": "#F28E42",
    "fg": "#15123D"
  },
  "6": {
    "bg": "#79BB92",
    "fg": "#15123D"
  },
  "7": {
    "bg": "#F29DB5",
    "fg": "#15123D"
  },
  "8": {
    "bg": "#D3A2D6",
    "fg": "#15123D"
  },
  "9": {
    "bg": "#CEC92B",
    "fg": "#15123D"
  },
  "10": {
    "bg": "#DFB039",
    "fg": "#15123D"
  },
  "11": {
    "bg": "#8A5A2B",
    "fg": "#FFFFFF"
  },
  "12": {
    "bg": "#1F7A4D",
    "fg": "#FFFFFF"
  },
  "13": {
    "bg": "#8FCBDB",
    "fg": "#15123D"
  },
  "14": {
    "bg": "#5E2D86",
    "fg": "#FFFFFF"
  },
  "3bis": {
    "bg": "#89C7D6",
    "fg": "#15123D"
  },
  "7bis": {
    "bg": "#6ECA97",
    "fg": "#15123D"
  }
} as const;

export const radius = {
  badge: 0.28,
  cell: 22,
  card: 40,
  pill: 999,
} as const;

export const border = { width: 4, color: "#15123D" } as const;

export const shadow = {
  solid: {"x":0,"y":10,"color":"#15123D"},
  soft: {"x":0,"y":10,"color":"rgba(21,18,61,.45)"},
} as const;

export const space = { 1: 8, 2: 14, 3: 26, 4: 64 } as const;
