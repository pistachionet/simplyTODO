import React from 'react';
import { useStore } from './hooks/useSessionStore.js';
import Landing from './pages/Landing.jsx';
import Board from './canvas/Board.jsx';

export default function App() {
  const sessionCode = useStore((s) => s.sessionCode);

  if (!sessionCode) {
    return <Landing />;
  }

  return <Board />;
}
