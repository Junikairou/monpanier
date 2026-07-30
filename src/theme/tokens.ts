export const lightColors = {
  cream: '#FAF7EF',
  paper: '#FFFFFF',
  forest: '#3C6B4F',
  forestDark: '#2A4E39',
  sage: '#B6CDAE',
  sagePale: '#E7EFE2',
  beige: '#E9E0CB',
  beigeDark: '#D8CBA8',
  honey: '#C79A3D',
  ink: '#2C2A22',
  inkSoft: '#6B6656',
  line: '#DED4BC',
  danger: '#B4523F',
};

export const darkColors = {
  cream: '#1C2019',
  paper: '#242A21',
  forest: '#8FBB9E',
  forestDark: '#B8D9C1',
  sage: '#3E5745',
  sagePale: '#2B3427',
  beige: '#332F24',
  beigeDark: '#463F2C',
  honey: '#D9AE55',
  ink: '#EDE9DA',
  inkSoft: '#B2AC97',
  line: '#3A3F32',
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
