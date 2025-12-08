import { palette } from "./palette";

const Themes = {
  // Light mode 
  light: {
    bg: palette.lightBlue,
    hover: palette.lightBlueHover,
    text: palette.lightBlueText,
    textSecondary: palette.darkBlueText,
    accent: palette.lightGrey,
    accentHover: palette.lightGreyHover,
    accentText: palette.lightGreyText,
    statusBar: "dark-content" as const,
    border: palette.lightBlueAccent,
    fonts: {
      regular: 'Bodoni-Regular',
      bold: 'Bodoni-Bold',
      italic: 'Bodoni-Italic',
      boldItalic: 'Bodoni-BoldItalic',
    },
    shadows: {
      shadowColor: palette.lightBlueText,
      shadowOpacity: 0.3,
      shadowRadius: 5,
      shadowOffset: { width: -1, height: 5 },
    },
  },
  // Dark mode
  dark: {
    bg: palette.darkBlue,
    hover: palette.darkBlueHover,
    text: palette.lightBlue,
    textSecondary: palette.darkBlueText,
    accent: palette.darkGrey,
    accentHover: palette.darkGreyHover,
    accentText: palette.darkGreyText,
    statusBar: "light-content" as const,
    border: palette.darkBlueAccent,
    fonts: {
      regular: 'Bodoni-Regular',
      bold: 'Bodoni-Bold',
      italic: 'Bodoni-Italic',
      boldItalic: 'Bodoni-BoldItalic',
    },
    shadows: {
      shadowColor: palette.black,
      shadowOpacity: 0.4,
      shadowRadius: 5,
      shadowOffset: { width: -1, height: 5 },
    },
  },
};

export default Themes;
