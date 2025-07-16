import React from 'react';
import { 
  MousePointer, 
  Square, 
  Circle, 
  Diamond, 
  Type, 
  Minus,
  Undo,
  Redo,
  Download,
  Upload,
  Sun,
  Moon,
  Save,
  FolderOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useCanvasStore } from '@/store/useCanvasStore';
import { useThemeStore } from '@/store/useThemeStore';
import { AuthDialog } from '@/components/Auth/AuthDialog';

export const Toolbar: React.FC = () => {
  const { tool, setTool, undo, redo, clear, history, historyIndex } = useCanvasStore();
  const { isDark, toggleTheme } = useThemeStore();

  const tools = [
    { id: 'select', icon: MousePointer, label: 'Select' },
    { id: 'rectangle', icon: Square, label: 'Rectangle' },
    { id: 'ellipse', icon: Circle, label: 'Ellipse' },
    { id: 'diamond', icon: Diamond, label: 'Diamond' },
    { id: 'text', icon: Type, label: 'Text' },
    { id: 'line', icon: Minus, label: 'Line' },
  ] as const;

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return (
    <div className="bg-card border-b border-border px-4 py-2 flex items-center gap-2">
      {/* Tool selection */}
      <div className="flex items-center gap-1">
        {tools.map((toolItem) => (
          <Button
            key={toolItem.id}
            variant={tool === toolItem.id ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setTool(toolItem.id as any)}
            className="w-9 h-9 p-0"
            title={toolItem.label}
          >
            <toolItem.icon className="w-4 h-4" />
          </Button>
        ))}
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* History controls */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={undo}
          disabled={!canUndo}
          className="w-9 h-9 p-0"
          title="Undo (Ctrl+Z)"
        >
          <Undo className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={redo}
          disabled={!canRedo}
          className="w-9 h-9 p-0"
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo className="w-4 h-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* File operations */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            // TODO: Implement save functionality
            console.log('Save');
          }}
          className="w-9 h-9 p-0"
          title="Save"
        >
          <Save className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            // TODO: Implement load functionality
            console.log('Load');
          }}
          className="w-9 h-9 p-0"
          title="Load"
        >
          <FolderOpen className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            // TODO: Implement export functionality
            console.log('Export');
          }}
          className="w-9 h-9 p-0"
          title="Export"
        >
          <Download className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            // TODO: Implement import functionality
            console.log('Import');
          }}
          className="w-9 h-9 p-0"
          title="Import"
        >
          <Upload className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1" />

      {/* Right side controls */}
      <div className="flex items-center gap-2">
        <AuthDialog />
        
        <Button
          variant="destructive"
          size="sm"
          onClick={clear}
          title="Clear Canvas"
        >
          Clear
        </Button>
        
        <Separator orientation="vertical" className="h-6" />
        
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleTheme}
          className="w-9 h-9 p-0"
          title="Toggle Theme"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
};