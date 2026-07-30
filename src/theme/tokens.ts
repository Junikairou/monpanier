export const lightColors = {
  cream: '#F7F4EE',
  paper: '#FFFFFF',
  forest: '#7DAE8F',
  forestDark: '#5C8E70',
  sage: '#C8DFD0',
  sagePale: '#EAF3ED',
  beige: '#E8E0D0',
  beigeDark: '#C9BEA8',
  honey: '#C67A00',
  honeyPale: '#FFF3E0',
  ink: '#2D2D2D',
  inkSoft: '#5C5C5C',
  inkFaint: '#9B9B9B',
  line: '#E8E0D0',
  danger: '#E07A6A',
};

export const darkColors = {
  cream: '#20211D',
  paper: '#2A2B25',
  forest: '#8FC0A2',
  forestDark: '#AAD6BB',
  sage: '#3E4A40',
  sagePale: '#2F3A32',
  beige: '#33322A',
  beigeDark: '#454337',
  honey: '#E0A855',
  honeyPale: '#3A331F',
  ink: '#EFEDE6',
  inkSoft: '#B7B3A6',
  inkFaint: '#8B8779',
  line: '#3A3A32',
  danger: '#E4998C',
};

export type ThemeColors = typeof lightColors;

export const radii = {
  sm: 8,
  md: 8,
  lg: 14,
  pill: 100,
};

export const spacing = (n: number) => n * 4;

export const fonts = {
  display: 'PlayfairDisplay_600SemiBold',
  displayMedium: 'PlayfairDisplay_500Medium',
  body: 'DMSans_400Regular',
  bodyMedium: 'DMSans_500Medium',
  bodySemiBold: 'DMSans_600SemiBold',
  bodyLight: 'DMSans_300Light',
};

export const cardShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.05,
  shadowRadius: 6,
  elevation: 2,
};
