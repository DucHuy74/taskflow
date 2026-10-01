import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ThemeProvider, useTheme, useIsDark } from '@/contexts/ThemeContext';

// Create a localStorage mock
const createLocalStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    __reset: () => {
      store = {};
    },
  };
};

// Mock localStorage before tests
const localStorageMock = createLocalStorageMock();
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock matchMedia
const mockMatchMedia = vi.fn().mockImplementation((query: string) => ({
  matches: query === '(prefers-color-scheme: dark)',
  media: query,
  onchange: null,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));
Object.defineProperty(window, 'matchMedia', {
  value: mockMatchMedia,
  writable: true,
});

describe('ThemeContext', () => {
  beforeEach(() => {
    localStorageMock.__reset();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorageMock.__reset();
  });

  describe('ThemeProvider', () => {
    it('should provide default theme as system', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
      });

      expect(result.current.theme).toBe('system');
      expect(result.current.resolvedTheme).toBe('dark'); // matches mock
    });

    it('should allow setting a specific theme', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ({ children }) => <ThemeProvider defaultTheme="light">{children}</ThemeProvider>,
      });

      act(() => {
        result.current.setTheme('dark');
      });

      expect(result.current.theme).toBe('dark');
      expect(result.current.resolvedTheme).toBe('dark');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('taskflow-theme', 'dark');
    });

    it('should toggle theme correctly', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ({ children }) => <ThemeProvider defaultTheme="light">{children}</ThemeProvider>,
      });

      act(() => {
        result.current.toggleTheme();
      });

      expect(result.current.theme).toBe('dark');
    });

    it('should call onThemeChange callback when theme changes', () => {
      const onThemeChange = vi.fn();
      const { result } = renderHook(() => useTheme(), {
        wrapper: ({ children }) => (
          <ThemeProvider defaultTheme="light" onThemeChange={onThemeChange}>
            {children}
          </ThemeProvider>
        ),
      });

      act(() => {
        result.current.setTheme('dark');
      });

      expect(onThemeChange).toHaveBeenCalledWith('dark');
    });
  });

  describe('useIsDark hook', () => {
    it('should return true in dark mode', () => {
      const { result } = renderHook(() => useIsDark(), {
        wrapper: ({ children }) => <ThemeProvider defaultTheme="dark">{children}</ThemeProvider>,
      });

      expect(result.current).toBe(true);
    });

    it('should return false in light mode', () => {
      const { result } = renderHook(() => useIsDark(), {
        wrapper: ({ children }) => <ThemeProvider defaultTheme="light">{children}</ThemeProvider>,
      });

      expect(result.current).toBe(false);
    });
  });

  describe('persisted theme', () => {
    it('should restore theme from localStorage', () => {
      localStorageMock.getItem.mockReturnValueOnce('dark');

      const { result } = renderHook(() => useTheme(), {
        wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
      });

      expect(result.current.theme).toBe('dark');
    });

    it('should use default theme if localStorage has invalid value', () => {
      localStorageMock.getItem.mockReturnValueOnce('invalid-value');

      const { result } = renderHook(() => useTheme(), {
        wrapper: ({ children }) => <ThemeProvider defaultTheme="light">{children}</ThemeProvider>,
      });

      expect(result.current.theme).toBe('light');
    });
  });
});
