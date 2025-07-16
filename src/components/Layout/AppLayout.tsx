import React, { useEffect, useRef, useState } from 'react';
import { Canvas } from '@/components/Canvas/Canvas';
import { Toolbar } from '@/components/Toolbar/Toolbar';
import { StatusBar } from '@/components/StatusBar/StatusBar';
import { PropertyPanel } from '@/components/PropertyPanel/PropertyPanel';
import { useThemeStore } from '@/store/useThemeStore';

export const AppLayout: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const { isDark } = useThemeStore();

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({
          width: rect.width,
          height: rect.height,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Initialize theme on mount
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      {/* Header */}
      <header className="shrink-0">
        <div className="border-b border-border px-6 py-3">
          <h1 className="text-xl font-semibold bg-gradient-primary bg-clip-text text-transparent">
            Mind Map Editor
          </h1>
        </div>
        <Toolbar />
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas area */}
        <div className="flex-1 flex flex-col">
          <div ref={containerRef} className="flex-1 relative">
            <Canvas width={dimensions.width} height={dimensions.height} />
          </div>
          <StatusBar />
        </div>

        {/* Right panel */}
        <div className="shrink-0 border-l border-border">
          <PropertyPanel />
        </div>
      </div>
    </div>
  );
};