import { useCallback, useRef } from 'react';
import { FlatList } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

export const useResetFlatListOnFocus = <T,>() => {
  const listRef = useRef<FlatList<T>>(null);

  useFocusEffect(
    useCallback(() => {
      const frame = requestAnimationFrame(() => {
        listRef.current?.scrollToOffset({ offset: 0, animated: false });
      });

      return () => cancelAnimationFrame(frame);
    }, []),
  );

  return listRef;
};
