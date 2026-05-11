import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    isDarkMode: boolean; // Computed actual boolean value (resolved from system if theme is 'system')
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [theme, setThemeState] = useState<Theme>(() => {
        const savedTheme = localStorage.getItem('app-theme') as Theme;
        return savedTheme || 'system';
    });
    
    const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
        localStorage.setItem('app-theme', newTheme);
    };

    useEffect(() => {
        const root = window.document.documentElement;
        
        const updateTheme = () => {
            let activeTheme = theme;
            if (theme === 'system') {
                const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                activeTheme = systemPrefersDark ? 'dark' : 'light';
            }

            root.classList.remove('light', 'dark');
            root.classList.add(activeTheme);
            setIsDarkMode(activeTheme === 'dark');
            
            // Perbarui warna body text
            root.style.colorScheme = activeTheme;
            document.body.style.backgroundColor = activeTheme === 'dark' ? '#0f172a' : '#f8fafc';
        };

        updateTheme();

        // Listen for system changes if mode is system
        if (theme === 'system') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const handleChange = () => updateTheme();
            mediaQuery.addEventListener('change', handleChange);
            return () => mediaQuery.removeEventListener('change', handleChange);
        }
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme, isDarkMode }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
