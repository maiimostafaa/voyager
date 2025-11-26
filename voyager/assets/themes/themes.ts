import { palette } from "./palette";

const Themes = {
  // Light mode 
  lightBlue: {
    bg: palette.lightBlue,
    hover: palette.lightBlueHover,
    text: palette.darkBlueText,
    textSecondary: palette.lightBlueText,
    statusBar: "dark-content" as const,
    border: palette.lightBlueAccent,
    shadows: {
      shadowColor: palette.lightBlueText,
      shadowOpacity: 0.3,
      shadowRadius: 5,
      shadowOffset: { width: -1, height: 5 },
    },
  },
  lightGrey: {
    bg: palette.lightGrey,
    hover: palette.lightGreyHover,
    text: palette.darkGreyText,
    textSecondary: palette.lightGreyText,
    statusBar: "dark-content" as const,
    border: palette.lightGreyAccent,
    shadows: {
      shadowColor: palette.lightGreyText,
      shadowOpacity: 0.3,
      shadowRadius: 5,
      shadowOffset: { width: -1, height: 5 },
    },
  },
  // Dark mode
  darkBlue: {
    bg: palette.darkBlue,
    hover: palette.darkBlueHover,
    text: palette.lightBlue,
    textSecondary: palette.darkBlueText,
    statusBar: "light-content" as const,
    border: palette.darkBlueAccent,
    shadows: {
      shadowColor: palette.black,
      shadowOpacity: 0.4,
      shadowRadius: 5,
      shadowOffset: { width: -1, height: 5 },
    },
  },
  darkGrey: {
    bg: palette.darkGrey,
    hover: palette.darkGreyHover,
    text: palette.lightGrey,
    textSecondary: palette.darkGreyText,
    statusBar: "light-content" as const,
    border: palette.darkGreyAccent,
    shadows: {
      shadowColor: palette.black,
      shadowOpacity: 0.4,
      shadowRadius: 5,
      shadowOffset: { width: -1, height: 5 },
    },
  },
};

export default Themes;
