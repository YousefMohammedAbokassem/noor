import { useCallback, useRef } from 'react';
import { FlatList, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

const savedOffsets = new Map<string, number>();

export const useResetFlatListOnFocus = <T,>(key: string) => {
  const listRef = useRef<FlatList<T>>(null);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      savedOffsets.set(key, Math.max(event.nativeEvent.contentOffset.y, 0));
    },
    [key],
  );

  useFocusEffect(
    useCallback(() => {
      const savedOffset = savedOffsets.get(key);
      if (!savedOffset || savedOffset <= 0) {
        return undefined;
      }

      const frame = requestAnimationFrame(() => {
        listRef.current?.scrollToOffset({ offset: savedOffset, animated: false });
      });

      return () => cancelAnimationFrame(frame);
    }, [key]),
  );

  return { listRef, handleScroll };
};
