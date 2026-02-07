import { useContext } from 'react';
import { ThemeContext, type ThemeContextType } from './themeContextBase';

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context as ThemeContextType;
};
