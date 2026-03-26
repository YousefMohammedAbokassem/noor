import React, { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { ThemeMode } from '@/types/models';
import { ThemeTransitionOrigin, useSettingsStore } from '@/state/settingsStore';
import { ThemeTransitionOverlay } from './ThemeTransitionOverlay';

type ThemeTransitionController = {
  transitionToTheme: (nextTheme: ThemeMode, origin?: ThemeTransitionOrigin) => Promise<void>;
  toggleTheme: (origin?: ThemeTransitionOrigin) => Promise<void>;
};

const ThemeTransitionContext = React.createContext<ThemeTransitionController | null>(null);

export const ThemeTransitionProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const readerTheme = useSettingsStore((s) => s.readerTheme);
  const setReaderTheme = useSettingsStore((s) => s.setReaderTheme);
  const rootRef = React.useRef<View>(null);

  const transitionToTheme = React.useCallback(
    async (nextTheme: ThemeMode, origin?: ThemeTransitionOrigin) => {
      if (nextTheme === readerTheme) return;

      let snapshotUri: string | null = null;
      try {
        if (rootRef.current) {
          snapshotUri = await captureRef(rootRef, {
            format: 'jpg',
            quality: 0.82,
            result: 'tmpfile',
          });
        }
      } catch {
        snapshotUri = null;
      }

      setReaderTheme(nextTheme, origin, snapshotUri);
    },
    [readerTheme, setReaderTheme],
  );

  const toggleTheme = React.useCallback(
    async (origin?: ThemeTransitionOrigin) => {
      await transitionToTheme(readerTheme === 'dark' ? 'light' : 'dark', origin);
    },
    [readerTheme, transitionToTheme],
  );

  const contextValue = React.useMemo(
    () => ({
      transitionToTheme,
      toggleTheme,
    }),
    [toggleTheme, transitionToTheme],
  );

  return (
    <ThemeTransitionContext.Provider value={contextValue}>
      <View ref={rootRef} collapsable={false} style={styles.container}>
        {children}
        <ThemeTransitionOverlay />
      </View>
    </ThemeTransitionContext.Provider>
  );
};

export const useThemeTransition = () => {
  const context = React.useContext(ThemeTransitionContext);
  const readerTheme = useSettingsStore((s) => s.readerTheme);
  const setReaderTheme = useSettingsStore((s) => s.setReaderTheme);

  return (
    context ?? {
      transitionToTheme: async (nextTheme: ThemeMode, origin?: ThemeTransitionOrigin) => {
        setReaderTheme(nextTheme, origin, null);
      },
      toggleTheme: async (origin?: ThemeTransitionOrigin) => {
        setReaderTheme(readerTheme === 'dark' ? 'light' : 'dark', origin, null);
      },
    }
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
