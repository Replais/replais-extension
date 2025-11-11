import React, { createContext, useContext, useEffect, useState, useRef } from 'react';

// ============================================================================
// Types & Interfaces
// ============================================================================

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// ============================================================================
// Theme Color Definitions
// ============================================================================

/**
 * CSS variable definitions for dark theme
 * These values are used in HSL format (hue saturation lightness)
 */
const DARK_THEME_VARIABLES = `
  --background: 0, 0%, 9%;
  --foreground: 0 0% 98%;
  --card: 0 0% 3.9%;
  --card-foreground: 0 0% 98%;
  --popover: 0 0% 3.9%;
  --popover-foreground: 0 0% 98%;
  --primary: 0 0% 98%;
  --primary-foreground: 0 0% 9%;
  --secondary: 0 0% 14.9%;
  --secondary-foreground: 0 0% 98%;
  --muted: 0 0% 14.9%;
  --muted-foreground: 0 0% 63.9%;
  --accent: 0 0% 14.9%;
  --accent-foreground: 0 0% 98%;
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 0 0% 98%;
  --border: 0 0% 14.9%;
  --input: 0 0% 14.9%;
  --ring: 0 0% 83.1%;
  --primary-x: 258 49.8% 51.6%;
`;

/**
 * CSS variable definitions for light theme
 * These values are used in HSL format (hue saturation lightness)
 */
const LIGHT_THEME_VARIABLES = `
  --background: 0 0% 100%;
  --foreground: 0 0% 3.9%;
  --card: 0 0% 100%;
  --card-foreground: 0 0% 3.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 0 0% 3.9%;
  --primary: 0 0% 9%;
  --primary-foreground: 0 0% 98%;
  --secondary: 0 0% 96.1%;
  --secondary-foreground: 0 0% 9%;
  --muted: 0 0% 96.1%;
  --muted-foreground: 0 0% 45.1%;
  --accent: 0 0% 96.1%;
  --accent-foreground: 0 0% 9%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 0 0% 98%;
  --border: 0 0% 89.8%;
  --input: 0 0% 89.8%;
  --ring: 0 0% 3.9%;
  --primary-x: 258 49.8% 51.6%;
`;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Detects if we're in a content script context (injected into a page)
 * vs popup context (isolated extension page)
 * 
 * @returns true if in content script context, false if in popup context
 */
const isContentScript = () => {
  // In content scripts, window.location.origin will be the page's origin
  // In popup, it will be chrome-extension://...
  try {
    return !window.location.href.startsWith('chrome-extension://') && 
           !window.location.href.startsWith('moz-extension://');
  } catch {
    return true; // Assume content script if we can't determine
  }
};

/**
 * Generates CSS content for theme variables based on the resolved theme
 * 
 * @param resolvedTheme - The resolved theme ('light' or 'dark')
 * @returns CSS string with theme variables
 */
const generateThemeCSS = (resolvedTheme: 'light' | 'dark'): string => {
  const themeVariables = resolvedTheme === 'dark' 
    ? DARK_THEME_VARIABLES 
    : LIGHT_THEME_VARIABLES;
  
  return `
    /* Scoped theme variables for ReplAIs components */
    /* Set on body for inheritance, and directly on portal elements */
    body.replais-${resolvedTheme},
    [data-radix-popover-content],
    [data-radix-select-content] {
      ${themeVariables}
    }
  `;
};

// ============================================================================
// ThemeProvider Component
// ============================================================================

/**
 * ThemeProvider component that manages theme state and applies it to the DOM
 * 
 * Supports both content script context (injected into web pages) and popup context
 * (isolated extension pages). Uses chrome.storage for cross-context synchronization.
 * 
 * @param children - React children to wrap with theme context
 * @param defaultTheme - Default theme to use if none is stored (default: 'system')
 * @param storageKey - Key to use for storing theme preference (default: 'replais-theme')
 * @param containerRef - Optional ref to a container element for scoped theme application
 */
export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'replais-theme',
  containerRef,
}: {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
  containerRef?: React.RefObject<HTMLElement>;
}) {
  // --------------------------------------------------------------------------
  // State Initialization
  // --------------------------------------------------------------------------
  
  /**
   * Theme state - can be 'light', 'dark', or 'system'
   * Initialized from localStorage for synchronous initial render
   */
  const [theme, setTheme] = useState<Theme>(() => {
    // Try to get from localStorage first (synchronous, for initial render)
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(storageKey) as Theme | null;
      if (stored && ['light', 'dark', 'system'].includes(stored)) {
        return stored;
      }
    }
    return defaultTheme;
  });

  /**
   * Sync with chrome.storage on mount (for cross-context syncing)
   * chrome.storage is the source of truth for cross-context synchronization
   */
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get([storageKey], (result) => {
        const stored = result[storageKey] as Theme | null;
        if (stored && ['light', 'dark', 'system'].includes(stored)) {
          // Always sync from chrome.storage on mount (it's the source of truth for cross-context)
          setTheme(stored);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount - we intentionally don't include theme/storageKey

  /**
   * Resolved theme - always 'light' or 'dark'
   * If theme is 'system', resolves based on user's system preference
   */
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => {
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    }
    return theme;
  });

  // --------------------------------------------------------------------------
  // Refs for Content Script Context
  // --------------------------------------------------------------------------
  
  /**
   * Cached check for content script context (determined once on mount)
   * Content scripts need scoped styling to avoid interfering with host pages
   */
  const isContentScriptContext = useRef(isContentScript());
  
  /**
   * Unique ID for the style element that injects theme CSS variables
   * Used to update/remove the style element when theme changes
   */
  const themeContainerId = useRef(`replais-theme-container-${Math.random().toString(36).substr(2, 9)}`);

  // --------------------------------------------------------------------------
  // Main Theme Application Effect
  // --------------------------------------------------------------------------
  
  /**
   * Main effect that applies the theme to the DOM whenever theme changes
   * Handles both content script and popup contexts differently
   */
  useEffect(() => {
    // Determine resolved theme (convert 'system' to 'light' or 'dark')
    let resolved: 'light' | 'dark';
    if (theme === 'system') {
      resolved = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    } else {
      resolved = theme;
    }

    setResolvedTheme(resolved);

    if (isContentScriptContext.current) {
      // ========================================================================
      // CONTENT SCRIPT MODE: Use scoped container approach
      // ========================================================================
      // Don't modify the host page's document directly to avoid conflicts
      
      const container = containerRef?.current || document.body;
      
      // Apply theme class to a scoped container
      // This ensures we don't interfere with the host page's styling
      container.classList.remove('replais-light', 'replais-dark');
      container.classList.add(`replais-${resolved}`);
      
      // Also apply to body for Radix portals (they render to body)
      // But use a scoped class name to avoid conflicts with host page
      document.body.classList.remove('replais-light', 'replais-dark');
      document.body.classList.add(`replais-${resolved}`);
      
      // Create or update a style element that scopes our CSS variables
      let styleEl = document.getElementById(themeContainerId.current) as HTMLStyleElement;
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = themeContainerId.current;
        document.head.appendChild(styleEl);
      }
      
      // Inject scoped CSS variables that portals can access
      // Set variables on the portal elements themselves so Tailwind classes can use them
      styleEl.textContent = generateThemeCSS(resolved);
    } else {
      // ========================================================================
      // POPUP MODE: Standard approach - modify document directly
      // ========================================================================
      // In popup context, we can safely modify the document root
      
      const root = document.documentElement;
      const body = document.body;
      
      // Remove existing theme classes from both root and body
      root.classList.remove('light', 'dark');
      body.classList.remove('light', 'dark');

      // Apply to both root and body to ensure portals inherit it
      root.classList.add(resolved);
      body.classList.add(resolved);
    }

    // --------------------------------------------------------------------------
    // Persist Theme Preference
    // --------------------------------------------------------------------------
    
    // Save to both localStorage and chrome.storage (for cross-context syncing)
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, theme);
    }
    
    // Also save to chrome.storage for syncing across extension contexts
    // This allows theme changes in popup to sync to content scripts and vice versa
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ [storageKey]: theme }).catch(() => {
        // Ignore errors (e.g., if storage quota is exceeded)
      });
    }
  }, [theme, storageKey, containerRef]);

  // --------------------------------------------------------------------------
  // System Theme Change Listener
  // --------------------------------------------------------------------------
  
  /**
   * Listens for system theme changes when theme is set to 'system'
   * Updates the resolved theme and applies it to the DOM when system preference changes
   */
  useEffect(() => {
    // Only listen if theme is set to 'system'
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      const resolved = e.matches ? 'dark' : 'light';
      setResolvedTheme(resolved);
      
      if (isContentScriptContext.current) {
        // Content script: update scoped classes and CSS
        const container = containerRef?.current || document.body;
        container.classList.remove('replais-light', 'replais-dark');
        container.classList.add(`replais-${resolved}`);
        document.body.classList.remove('replais-light', 'replais-dark');
        document.body.classList.add(`replais-${resolved}`);
        
        // Update injected CSS with new theme variables
        const styleEl = document.getElementById(themeContainerId.current) as HTMLStyleElement;
        if (styleEl) {
          styleEl.textContent = generateThemeCSS(resolved);
        }
      } else {
        // Popup: standard approach - update root and body classes
        const root = document.documentElement;
        const body = document.body;
        root.classList.remove('light', 'dark');
        body.classList.remove('light', 'dark');
        root.classList.add(resolved);
        body.classList.add(resolved);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, containerRef]);

  // --------------------------------------------------------------------------
  // Cross-Context Theme Synchronization
  // --------------------------------------------------------------------------
  
  /**
   * Listens for theme changes from other extension contexts (popup <-> content script)
   * Uses chrome.storage.onChanged as the primary mechanism, with chrome.runtime messages
   * as a backup. This ensures theme changes sync across all extension contexts.
   */
  useEffect(() => {
    // Primary mechanism: Listen for chrome.storage changes
    // This works across all extension contexts (popup, content scripts, background)
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName === 'local' && changes[storageKey] && changes[storageKey].newValue !== theme) {
        const newTheme = changes[storageKey].newValue as Theme;
        if (['light', 'dark', 'system'].includes(newTheme)) {
          setTheme(newTheme);
        }
      }
    };

    // Backup mechanism: Listen for chrome.runtime messages
    // Used as a fallback if chrome.storage events don't fire
    const handleMessage = (msg: { type?: string; theme?: Theme }) => {
      if (msg?.type === 'THEME_CHANGED' && msg?.theme && msg.theme !== theme) {
        const newTheme = msg.theme as Theme;
        if (['light', 'dark', 'system'].includes(newTheme)) {
          setTheme(newTheme);
        }
      }
    };

    // Register listeners
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener(handleStorageChange);
    }
    
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener(handleMessage);
    }

    // Cleanup: Remove listeners on unmount or when dependencies change
    return () => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
        chrome.storage.onChanged.removeListener(handleStorageChange);
      }
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.removeListener(handleMessage);
      }
    };
  }, [storageKey, theme]);

  // --------------------------------------------------------------------------
  // Cleanup on Unmount
  // --------------------------------------------------------------------------
  
  /**
   * Cleans up injected style elements when component unmounts
   * Only needed in content script context where we inject styles
   */
  useEffect(() => {
    const isContentScript = isContentScriptContext.current;
    const containerId = themeContainerId.current;
    
    return () => {
      if (isContentScript) {
        const styleEl = document.getElementById(containerId);
        if (styleEl) {
          styleEl.remove();
        }
      }
    };
  }, []);

  // --------------------------------------------------------------------------
  // Context Value Setup
  // --------------------------------------------------------------------------
  
  /**
   * Wrapper for setTheme that also broadcasts changes
   * The theme change will be saved to chrome.storage in the useEffect above,
   * which will trigger chrome.storage.onChanged listeners in other contexts
   */
  const setThemeWithBroadcast = React.useCallback((newTheme: Theme) => {
    setTheme(newTheme);
    
    // The theme change will be saved to chrome.storage in the useEffect above,
    // which will trigger chrome.storage.onChanged listeners in other contexts
    // So we don't need to manually send messages
  }, []);

  // Create context value with theme state and setter
  const value = {
    theme,
    setTheme: setThemeWithBroadcast,
    resolvedTheme,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

// ============================================================================
// useTheme Hook
// ============================================================================

/**
 * Hook to access theme context
 * 
 * @returns Theme context with theme, setTheme, and resolvedTheme
 * @throws Error if used outside of ThemeProvider
 * 
 * @example
 * ```tsx
 * const { theme, setTheme, resolvedTheme } = useTheme();
 * ```
 */
export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

