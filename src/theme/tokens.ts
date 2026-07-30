export const lightColors = {
  cream: '#F6EEDC',
  paper: '#FFFBF2',
  forest: '#6E7F42',
  forestDark: '#4E5C2C',
  sage: '#C9B98A',
  sagePale: '#F0E4C6',
  beige: '#EDE0C2',
  beigeDark: '#DEC89C',
  honey: '#C6873A',
  ink: '#302A1C',
  inkSoft: '#7C7057',
  line: '#E2D0A8',
  danger: '#B4523F',
};

export const darkColors = {
  cream: '#221C13',
  paper: '#2C2418',
  forest: '#A6B87C',
  forestDark: '#C6D69C',
  sage: '#59502F',
  sagePale: '#3A3120',
  beige: '#3A3120',
  beigeDark: '#4C4126',
  honey: '#DDAA5B',
  ink: '#F2E9D8',
  inkSoft: '#BFAF8C',
  line: '#4A3F26',
  danger: '#E08A78',
};

export type ThemeColors = typeof lightColors;

export const radii = {
  sm: 10,
  md: 14,
  lg: 18,
  pill: 100,
};

export const spacing = (n: number) => n * 4;
