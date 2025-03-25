'use client';

import { useEffect } from 'react';
import { useUIPreferences } from '../store/hooks';

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
    const { isDarkMode } = useUIPreferences();

    // Apply dark mode class to html element
    useEffect(() => {
        if (isDarkMode.get()) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [isDarkMode]);

    return <>{children}</>;
} 