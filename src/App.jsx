import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import MenuScreen from './components/MenuScreen';
import ExerciseScreen from './components/ExerciseScreen';
import Background from './components/Background';
import './App.css';

export default function App() {
  const [currentModule, setCurrentModule] = useState(null);

  return (
    <div className="app">
      <Background />
      <div style={{ position: 'relative', zIndex: 1, height: '100%' }}>
        <AnimatePresence mode="wait">
          {currentModule ? (
            <ExerciseScreen
              key={currentModule}
              moduleId={currentModule}
              onBack={() => setCurrentModule(null)}
            />
          ) : (
            <MenuScreen
              key="menu"
              onSelectModule={setCurrentModule}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
