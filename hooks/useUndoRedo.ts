import { useState, useCallback } from 'react';

interface UndoRedoState<T> {
  past: T[];
  present: T;
  future: T[];
}

export default function useUndoRedo<T>(initialState: T | (() => T), limit: number = 10) {
  const [state, setState] = useState<UndoRedoState<T>>(() => {
    const present = typeof initialState === 'function' ? (initialState as () => T)() : initialState;
    return {
      past: [],
      present,
      future: []
    };
  });

  const canUndo = state.past.length > 0;
  const canRedo = state.future.length > 0;

  const undo = useCallback(() => {
    setState(currentState => {
      if (currentState.past.length === 0) return currentState;

      const previous = currentState.past[currentState.past.length - 1];
      const newPast = currentState.past.slice(0, currentState.past.length - 1);

      return {
        past: newPast,
        present: previous,
        future: [currentState.present, ...currentState.future]
      };
    });
  }, []);

  const redo = useCallback(() => {
    setState(currentState => {
      if (currentState.future.length === 0) return currentState;

      const next = currentState.future[0];
      const newFuture = currentState.future.slice(1);

      return {
        past: [...currentState.past, currentState.present],
        present: next,
        future: newFuture
      };
    });
  }, []);

  const set = useCallback((newState: T | ((prevState: T) => T)) => {
    setState(currentState => {
      const computedNewState = typeof newState === 'function' 
        ? (newState as (prevState: T) => T)(currentState.present)
        : newState;

      if (currentState.present === computedNewState) return currentState;

      const newPast = [...currentState.past, currentState.present];
      if (newPast.length > limit) {
        newPast.shift();
      }

      return {
        past: newPast,
        present: computedNewState,
        future: []
      };
    });
  }, [limit]);

  return {
      state: state.present,
      setState: set,
      undo,
      redo,
      canUndo,
      canRedo,
  };
}