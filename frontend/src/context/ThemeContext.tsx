import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('collegetracker_theme');
    if (saved === 'light' || saved === 'dark') return saved;
    // Default to 'light' since user requested bright, crystal-clear light mode
    return 'light';
  });

  useEffect(() => {
    localStorage.setItem('collegetracker_theme', theme);
    const root = document.documentElement;
    const body = document.body;

    if (theme === 'light') {
      root.classList.add('light-theme');
      root.classList.remove('dark', 'dark-theme');
      body.classList.add('light-theme');
      body.classList.remove('dark', 'dark-theme');
    } else {
      root.classList.remove('light-theme');
      root.classList.add('dark', 'dark-theme');
      body.classList.remove('light-theme');
      body.classList.add('dark', 'dark-theme');
    }
  }, [theme]);

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
