// File manifest types for enhanced edit tracking

export interface FileInfo {
  content: string;
  type: 'component' | 'page' | 'style' | 'config' | 'utility' | 'layout' | 'hook' | 'context' | 'flutter_widget' | 'flutter_screen' | 'flutter_config';
  exports?: string[]; // Named exports and default export
  imports?: ImportInfo[]; // Dependencies
  lastModified: number;
  componentInfo?: ComponentInfo; // For React components
  flutterInfo?: FlutterWidgetInfo; // For Flutter widgets
  path: string;
  relativePath: string; // Path relative to src/ or lib/
}

export interface ImportInfo {
  source: string; // e.g., './Header', 'react', '@/components/Button'
  imports: string[]; // Named imports
  defaultImport?: string; // Default import name
  isLocal: boolean; // true if starts with './' or '@/'
}

export interface ComponentInfo {
  name: string;
  props?: string[]; // Prop names if detectable
  hooks?: string[]; // Hooks used (useState, useEffect, etc)
  hasState: boolean;
  childComponents?: string[]; // Components rendered inside
}

export interface FlutterWidgetInfo {
  name: string;
  type: 'StatelessWidget' | 'StatefulWidget' | 'Screen' | 'CustomWidget';
  props?: string[]; // Properties if detectable
  hasState: boolean;
  childWidgets?: string[]; // Widgets rendered inside
  isScreen?: boolean; // True if this is a screen/page widget
  usesNavigation?: boolean; // True if contains navigation logic
}

export interface RouteInfo {
  path: string; // Route path (e.g., '/videos', '/about')
  component: string; // Component file path
  layout?: string; // Layout component if any
}

export interface ComponentTree {
  [componentName: string]: {
    file: string;
    imports: string[]; // Components it imports
    importedBy: string[]; // Components that import it
    type: 'page' | 'layout' | 'component';
  }
}

export interface FileManifest {
  files: Record<string, FileInfo>;
  routes: RouteInfo[];
  componentTree: ComponentTree;
  entryPoint: string; // Usually App.jsx or main.jsx
  styleFiles: string[]; // All CSS files
  timestamp: number;
}

// Edit classification types
export enum EditType {
  UPDATE_COMPONENT = 'UPDATE_COMPONENT',    // "update the header", "change button color"
  ADD_FEATURE = 'ADD_FEATURE',              // "add a videos page", "create new component"
  FIX_ISSUE = 'FIX_ISSUE',                 // "fix the styling", "resolve error"
  REFACTOR = 'REFACTOR',                   // "reorganize", "clean up"
  FULL_REBUILD = 'FULL_REBUILD',           // "start over", "recreate everything"
  UPDATE_STYLE = 'UPDATE_STYLE',           // "change colors", "update theme"
  ADD_DEPENDENCY = 'ADD_DEPENDENCY',       // "install package", "add library"
  
  // Flutter specific edit types
  CREATE_FLUTTER_WIDGET = 'CREATE_FLUTTER_WIDGET',     // "create widget", "build widget"
  CREATE_FLUTTER_SCREEN = 'CREATE_FLUTTER_SCREEN',     // "create screen", "build screen", "new page"  
  UPDATE_FLUTTER_WIDGET = 'UPDATE_FLUTTER_WIDGET',     // "update widget", "modify widget"
  ADD_FLUTTER_NAVIGATION = 'ADD_FLUTTER_NAVIGATION',   // "add appbar", "bottom navigation", "floating action button"
  ADD_FLUTTER_PACKAGE = 'ADD_FLUTTER_PACKAGE'          // "add flutter package", "install flutter dependency"
}

export interface EditIntent {
  type: EditType;
  targetFiles: string[]; // Predicted files to edit
  confidence: number; // 0-1 confidence score
  description: string; // Human-readable description
  suggestedContext: string[]; // Additional files to include for context
}

// Patterns for intent detection
export interface IntentPattern {
  patterns: RegExp[];
  type: EditType;
  fileResolver: (prompt: string, manifest: FileManifest) => string[];
}