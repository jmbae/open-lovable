import { FileManifest, EditType, EditIntent, IntentPattern } from '@/types/file-manifest';

/**
 * Analyze user prompts to determine edit intent and select relevant files
 */
export function analyzeEditIntent(
  prompt: string,
  manifest: FileManifest
): EditIntent {
  const lowerPrompt = prompt.toLowerCase();
  
  // Define intent patterns
  const patterns: IntentPattern[] = [
    // Flutter specific patterns - check these first for higher priority
    {
      patterns: [
        /create\s+(a\s+)?(\w+)\s+(widget|screen)/i,
        /build\s+(a\s+)?(\w+)\s+(widget|screen)/i,
        /make\s+(a\s+)?(\w+)\s+(widget|screen)/i,
        /add\s+(a\s+)?new\s+(\w+)\s+(widget|screen)/i,
        /implement\s+(a\s+)?(\w+)\s+(widget|screen)/i,
      ],
      type: EditType.CREATE_FLUTTER_WIDGET,
      fileResolver: (p, m) => findFlutterInsertionPoints(p, m),
    },
    {
      patterns: [
        /create\s+(a\s+)?(\w+)\s+(screen|page)/i,
        /build\s+(a\s+)?(\w+)\s+(screen|page)/i,
        /make\s+(a\s+)?(\w+)\s+(screen|page)/i,
        /new\s+(screen|page)/i,
        /add\s+(a\s+)?new\s+(\w+\s+)?(screen|page)/i,
        // Korean patterns (using Unicode range for Korean characters)
        /([\uAC00-\uD7AF]+)\s*(화면|스크린|페이지)\s*(만들어|생성|추가)/i,
        /(화면|스크린|페이지).*(만들어|생성|추가)/i,
      ],
      type: EditType.CREATE_FLUTTER_SCREEN,
      fileResolver: (p, m) => findFlutterScreenInsertionPoints(p, m),
    },
    {
      patterns: [
        /update\s+(the\s+)?(\w+)\s+(widget)/i,
        /change\s+(the\s+)?(\w+)\s+(widget)/i,
        /modify\s+(the\s+)?(\w+)\s+(widget)/i,
        /edit\s+(the\s+)?(\w+)\s+(widget)/i,
      ],
      type: EditType.UPDATE_FLUTTER_WIDGET,
      fileResolver: (p, m) => findFlutterWidgetFiles(p, m),
    },
    {
      patterns: [
        /add\s+(a\s+)?app\s?bar/i,
        /implement\s+app\s?bar/i,
        /create\s+app\s?bar/i,
        /add\s+(a\s+)?bottom\s+navigation/i,
        /implement\s+bottom\s+navigation/i,
        /add\s+(a\s+)?floating\s+action\s+button/i,
        /add\s+(a\s+)?fab/i,
        /implement\s+navigation/i,
        /add\s+navigation/i,
        /add\s+tab\s?bar/i,
        /implement\s+tab\s?bar/i,
      ],
      type: EditType.ADD_FLUTTER_NAVIGATION,
      fileResolver: (p, m) => findFlutterNavigationFiles(p, m),
    },
    {
      patterns: [
        /add\s+flutter\s+(\w+\s+)?(package|dependency)/i,
        /install\s+flutter\s+(\w+\s+)?(package|dependency)/i,
        /use\s+flutter\s+(package|library)/i,
        /add\s+(\w+)\s+flutter\s+(package|library)/i,
        /flutter\s+pub\s+add/i,
        /add\s+(\w+)\s+(package|dependency)/i,
        /install\s+(\w+)\s+(package|dependency)/i,
      ],
      type: EditType.ADD_FLUTTER_PACKAGE,
      fileResolver: (p, m) => findFlutterPackageFiles(m),
    },
    // Existing React patterns
    {
      patterns: [
        /update\s+(the\s+)?(\w+)\s+(component|section|page)/i,
        /change\s+(the\s+)?(\w+)/i,
        /modify\s+(the\s+)?(\w+)/i,
        /edit\s+(the\s+)?(\w+)/i,
        /fix\s+(the\s+)?(\w+)\s+(styling|style|css|layout)/i,
        /remove\s+.*\s+(button|link|text|element|section)/i,
        /delete\s+.*\s+(button|link|text|element|section)/i,
        /hide\s+.*\s+(button|link|text|element|section)/i,
      ],
      type: EditType.UPDATE_COMPONENT,
      fileResolver: (p, m) => findComponentByContent(p, m),
    },
    {
      patterns: [
        /add\s+(a\s+)?new\s+(\w+)\s+(page|section|feature|component)/i,
        /create\s+(a\s+)?(\w+)\s+(page|section|feature|component)/i,
        /implement\s+(a\s+)?(\w+)\s+(page|section|feature)/i,
        /build\s+(a\s+)?(\w+)\s+(page|section|feature)/i,
        /add\s+(\w+)\s+to\s+(?:the\s+)?(\w+)/i,
        /add\s+(?:a\s+)?(\w+)\s+(?:component|section)/i,
        /include\s+(?:a\s+)?(\w+)/i,
      ],
      type: EditType.ADD_FEATURE,
      fileResolver: (p, m) => findFeatureInsertionPoints(p, m),
    },
    {
      patterns: [
        /fix\s+(the\s+)?(\w+|\w+\s+\w+)(?!\s+styling|\s+style)/i,
        /resolve\s+(the\s+)?error/i,
        /debug\s+(the\s+)?(\w+)/i,
        /repair\s+(the\s+)?(\w+)/i,
      ],
      type: EditType.FIX_ISSUE,
      fileResolver: (p, m) => findProblemFiles(p, m),
    },
    {
      patterns: [
        /change\s+(the\s+)?(color|theme|style|styling|css)/i,
        /update\s+(the\s+)?(color|theme|style|styling|css)/i,
        /make\s+it\s+(dark|light|blue|red|green)/i,
        /style\s+(the\s+)?(\w+)/i,
      ],
      type: EditType.UPDATE_STYLE,
      fileResolver: (p, m) => findStyleFiles(p, m),
    },
    {
      patterns: [
        /refactor\s+(the\s+)?(\w+)/i,
        /clean\s+up\s+(the\s+)?code/i,
        /reorganize\s+(the\s+)?(\w+)/i,
        /optimize\s+(the\s+)?(\w+)/i,
      ],
      type: EditType.REFACTOR,
      fileResolver: (p, m) => findRefactorTargets(p, m),
    },
    {
      patterns: [
        /start\s+over/i,
        /recreate\s+everything/i,
        /rebuild\s+(the\s+)?app/i,
        /new\s+app/i,
        /from\s+scratch/i,
      ],
      type: EditType.FULL_REBUILD,
      fileResolver: (p, m) => [m.entryPoint],
    },
    {
      patterns: [
        /install\s+(\w+)/i,
        /add\s+(\w+)\s+(package|library|dependency)/i,
        /use\s+(\w+)\s+(library|framework)/i,
      ],
      type: EditType.ADD_DEPENDENCY,
      fileResolver: (p, m) => findPackageFiles(m),
    },
  ];
  
  // Find matching pattern
  for (const pattern of patterns) {
    for (const regex of pattern.patterns) {
      if (regex.test(lowerPrompt)) {
        const targetFiles = pattern.fileResolver(prompt, manifest);
        const suggestedContext = getSuggestedContext(targetFiles, manifest);
        
        return {
          type: pattern.type,
          targetFiles,
          confidence: calculateConfidence(prompt, pattern, targetFiles),
          description: generateDescription(pattern.type, prompt, targetFiles),
          suggestedContext,
        };
      }
    }
  }
  
  // Default to component update if no pattern matches
  return {
    type: EditType.UPDATE_COMPONENT,
    targetFiles: [manifest.entryPoint],
    confidence: 0.3,
    description: 'General update to application',
    suggestedContext: [],
  };
}

/**
 * Find component files mentioned in the prompt
 */
function findComponentFiles(prompt: string, manifest: FileManifest): string[] {
  const files: string[] = [];
  const lowerPrompt = prompt.toLowerCase();
  
  // Extract component names from prompt
  const componentWords = extractComponentNames(prompt);
  console.log('[findComponentFiles] Extracted words:', componentWords);
  
  // First pass: Look for exact component file matches
  for (const [path, fileInfo] of Object.entries(manifest.files)) {
    // Check if file name or component name matches
    const fileName = path.split('/').pop()?.toLowerCase() || '';
    const componentName = fileInfo.componentInfo?.name.toLowerCase();
    
    for (const word of componentWords) {
      if (fileName.includes(word) || componentName?.includes(word)) {
        console.log(`[findComponentFiles] Match found: word="${word}" in file="${path}"`);
        files.push(path);
        break; // Stop after first match to avoid duplicates
      }
    }
  }
  
  // If no specific component found, check for common UI elements
  if (files.length === 0) {
    const uiElements = ['header', 'footer', 'nav', 'sidebar', 'button', 'card', 'modal', 'hero', 'banner', 'about', 'services', 'features', 'testimonials', 'gallery', 'contact', 'team', 'pricing'];
    for (const element of uiElements) {
      if (lowerPrompt.includes(element)) {
        // Look for exact component file matches first
        for (const [path, fileInfo] of Object.entries(manifest.files)) {
          const fileName = path.split('/').pop()?.toLowerCase() || '';
          // Only match if the filename contains the element name
          if (fileName.includes(element + '.') || fileName === element) {
            files.push(path);
            console.log(`[findComponentFiles] UI element match: element="${element}" in file="${path}"`);
            return files; // Return immediately with just this file
          }
        }
        
        // If no exact file match, look for the element in file names (but be more selective)
        for (const [path, fileInfo] of Object.entries(manifest.files)) {
          const fileName = path.split('/').pop()?.toLowerCase() || '';
          if (fileName.includes(element)) {
            files.push(path);
            console.log(`[findComponentFiles] UI element partial match: element="${element}" in file="${path}"`);
            return files; // Return immediately with just this file
          }
        }
      }
    }
  }
  
  // Limit results to most specific matches
  if (files.length > 1) {
    console.log(`[findComponentFiles] Multiple files found (${files.length}), limiting to first match`);
    return [files[0]]; // Only return the first match
  }
  
  return files.length > 0 ? files : [manifest.entryPoint];
}

/**
 * Find where to add new features
 */
function findFeatureInsertionPoints(prompt: string, manifest: FileManifest): string[] {
  const files: string[] = [];
  const lowerPrompt = prompt.toLowerCase();
  
  // For new pages, we need routing files and layout
  if (lowerPrompt.includes('page')) {
    // Find router configuration
    for (const [path, fileInfo] of Object.entries(manifest.files)) {
      if (fileInfo.content.includes('Route') || 
          fileInfo.content.includes('createBrowserRouter') ||
          path.includes('router') ||
          path.includes('routes')) {
        files.push(path);
      }
    }
    
    // Also include App.jsx for navigation updates
    if (manifest.entryPoint) {
      files.push(manifest.entryPoint);
    }
  }
  
  // For new components, find the most appropriate parent
  if (lowerPrompt.includes('component') || lowerPrompt.includes('section') || 
      lowerPrompt.includes('add') || lowerPrompt.includes('create')) {
    // Extract where to add it (e.g., "to the footer", "in header")
    const locationMatch = prompt.match(/(?:in|to|on|inside)\s+(?:the\s+)?(\w+)/i);
    if (locationMatch) {
      const location = locationMatch[1];
      const parentFiles = findComponentFiles(location, manifest);
      files.push(...parentFiles);
      console.log(`[findFeatureInsertionPoints] Adding to ${location}, parent files:`, parentFiles);
    } else {
      // Look for component mentions in the prompt
      const componentWords = extractComponentNames(prompt);
      for (const word of componentWords) {
        const relatedFiles = findComponentFiles(word, manifest);
        if (relatedFiles.length > 0 && relatedFiles[0] !== manifest.entryPoint) {
          files.push(...relatedFiles);
        }
      }
      
      // Default to App.jsx if no specific location found
      if (files.length === 0) {
        files.push(manifest.entryPoint);
      }
    }
  }
  
  // Remove duplicates
  return [...new Set(files)];
}

/**
 * Find files that might have problems
 */
function findProblemFiles(prompt: string, manifest: FileManifest): string[] {
  const files: string[] = [];
  
  // Look for error keywords
  if (prompt.match(/error|bug|issue|problem|broken|not working/i)) {
    // Check recently modified files first
    const sortedFiles = Object.entries(manifest.files)
      .sort(([, a], [, b]) => b.lastModified - a.lastModified)
      .slice(0, 5);
    
    files.push(...sortedFiles.map(([path]) => path));
  }
  
  // Also check for specific component mentions
  const componentFiles = findComponentFiles(prompt, manifest);
  files.push(...componentFiles);
  
  return [...new Set(files)];
}

/**
 * Find style-related files
 */
function findStyleFiles(prompt: string, manifest: FileManifest): string[] {
  const files: string[] = [];
  
  // Add all CSS files
  files.push(...manifest.styleFiles);
  
  // Check for Tailwind config
  const tailwindConfig = Object.keys(manifest.files).find(
    path => path.includes('tailwind.config')
  );
  if (tailwindConfig) files.push(tailwindConfig);
  
  // If specific component styling mentioned, include that component
  const componentFiles = findComponentFiles(prompt, manifest);
  files.push(...componentFiles);
  
  return files;
}

/**
 * Find files to refactor
 */
function findRefactorTargets(prompt: string, manifest: FileManifest): string[] {
  // Similar to findComponentFiles but broader
  return findComponentFiles(prompt, manifest);
}

/**
 * Find package configuration files
 */
function findPackageFiles(manifest: FileManifest): string[] {
  const files: string[] = [];
  
  for (const path of Object.keys(manifest.files)) {
    if (path.endsWith('package.json') || 
        path.endsWith('vite.config.js') ||
        path.endsWith('tsconfig.json')) {
      files.push(path);
    }
  }
  
  return files;
}

/**
 * Find component by searching for content mentioned in the prompt
 */
function findComponentByContent(prompt: string, manifest: FileManifest): string[] {
  const files: string[] = [];
  const lowerPrompt = prompt.toLowerCase();
  
  console.log('[findComponentByContent] Searching for content in prompt:', prompt);
  
  // Extract quoted strings or specific button/link text
  const quotedStrings = prompt.match(/["']([^"']+)["']/g) || [];
  const searchTerms: string[] = quotedStrings.map(s => s.replace(/["']/g, ''));
  
  // Also look for specific terms after 'remove', 'delete', 'hide'
  const actionMatch = prompt.match(/(?:remove|delete|hide)\s+(?:the\s+)?(.+?)(?:\s+button|\s+link|\s+text|\s+element|\s+section|$)/i);
  if (actionMatch) {
    searchTerms.push(actionMatch[1].trim());
  }
  
  console.log('[findComponentByContent] Search terms:', searchTerms);
  
  // If we have search terms, look for them in file contents
  if (searchTerms.length > 0) {
    for (const [path, fileInfo] of Object.entries(manifest.files)) {
      // Only search in component files
      if (!path.includes('.jsx') && !path.includes('.tsx')) continue;
      
      const content = fileInfo.content.toLowerCase();
      
      for (const term of searchTerms) {
        if (content.includes(term.toLowerCase())) {
          console.log(`[findComponentByContent] Found "${term}" in ${path}`);
          files.push(path);
          break; // Only add file once
        }
      }
    }
  }
  
  // If no files found by content, fall back to component name search
  if (files.length === 0) {
    console.log('[findComponentByContent] No files found by content, falling back to component name search');
    return findComponentFiles(prompt, manifest);
  }
  
  // Return only the first match to avoid editing multiple files
  return [files[0]];
}

/**
 * Extract component names from prompt
 */
function extractComponentNames(prompt: string): string[] {
  const words: string[] = [];
  
  // Remove common words but keep component-related words
  const cleanPrompt = prompt
    .replace(/\b(the|a|an|in|on|to|from|update|change|modify|edit|fix|make)\b/gi, '')
    .toLowerCase();
  
  // Extract potential component names (words that might be components)
  const matches = cleanPrompt.match(/\b\w+\b/g) || [];
  
  for (const match of matches) {
    if (match.length > 2) { // Skip very short words
      words.push(match);
    }
  }
  
  return words;
}

/**
 * Get additional files for context - returns ALL files for comprehensive context
 */
function getSuggestedContext(
  targetFiles: string[],
  manifest: FileManifest
): string[] {
  // Return all files except the ones being edited
  const allFiles = Object.keys(manifest.files);
  return allFiles.filter(file => !targetFiles.includes(file));
}

/**
 * Resolve import path to actual file path
 */
function resolveImportPath(
  fromFile: string,
  importPath: string,
  manifest: FileManifest
): string | null {
  // Handle relative imports
  if (importPath.startsWith('./') || importPath.startsWith('../')) {
    const fromDir = fromFile.substring(0, fromFile.lastIndexOf('/'));
    const resolved = resolveRelativePath(fromDir, importPath);
    
    // Try with different extensions
    const extensions = ['.jsx', '.js', '.tsx', '.ts', ''];
    for (const ext of extensions) {
      const fullPath = resolved + ext;
      if (manifest.files[fullPath]) {
        return fullPath;
      }
      
      // Try index file
      const indexPath = resolved + '/index' + ext;
      if (manifest.files[indexPath]) {
        return indexPath;
      }
    }
  }
  
  // Handle @/ alias (common in Vite projects)
  if (importPath.startsWith('@/')) {
    const srcPath = importPath.replace('@/', '/home/user/app/src/');
    return resolveImportPath(fromFile, srcPath, manifest);
  }
  
  return null;
}

/**
 * Resolve relative path
 */
function resolveRelativePath(fromDir: string, relativePath: string): string {
  const parts = fromDir.split('/');
  const relParts = relativePath.split('/');
  
  for (const part of relParts) {
    if (part === '..') {
      parts.pop();
    } else if (part !== '.') {
      parts.push(part);
    }
  }
  
  return parts.join('/');
}

/**
 * Calculate confidence score
 */
function calculateConfidence(
  prompt: string,
  pattern: IntentPattern,
  targetFiles: string[]
): number {
  let confidence = 0.5; // Base confidence
  
  // Higher confidence if we found specific files
  if (targetFiles.length > 0 && targetFiles[0] !== '') {
    confidence += 0.2;
  }
  
  // Higher confidence for more specific prompts
  if (prompt.split(' ').length > 5) {
    confidence += 0.1;
  }
  
  // Higher confidence for exact pattern matches
  for (const regex of pattern.patterns) {
    if (regex.test(prompt)) {
      confidence += 0.2;
      break;
    }
  }
  
  return Math.min(confidence, 1.0);
}

/**
 * Generate human-readable description
 */
function generateDescription(
  type: EditType,
  prompt: string,
  targetFiles: string[]
): string {
  const fileNames = targetFiles.map(f => f.split('/').pop()).join(', ');
  
  switch (type) {
    case EditType.UPDATE_COMPONENT:
      return `Updating component(s): ${fileNames}`;
    case EditType.ADD_FEATURE:
      return `Adding new feature to: ${fileNames}`;
    case EditType.FIX_ISSUE:
      return `Fixing issue in: ${fileNames}`;
    case EditType.UPDATE_STYLE:
      return `Updating styles in: ${fileNames}`;
    case EditType.REFACTOR:
      return `Refactoring: ${fileNames}`;
    case EditType.FULL_REBUILD:
      return 'Rebuilding entire application';
    case EditType.ADD_DEPENDENCY:
      return 'Adding new dependency';
    
    // Flutter specific descriptions
    case EditType.CREATE_FLUTTER_WIDGET:
      return `Creating Flutter widget in: ${fileNames}`;
    case EditType.CREATE_FLUTTER_SCREEN:
      return `Creating Flutter screen in: ${fileNames}`;
    case EditType.UPDATE_FLUTTER_WIDGET:
      return `Updating Flutter widget in: ${fileNames}`;
    case EditType.ADD_FLUTTER_NAVIGATION:
      return `Adding Flutter navigation to: ${fileNames}`;
    case EditType.ADD_FLUTTER_PACKAGE:
      return `Adding Flutter package to: ${fileNames}`;
      
    default:
      return `Editing: ${fileNames}`;
  }
}

/**
 * Find where to insert new Flutter widgets
 */
function findFlutterInsertionPoints(prompt: string, manifest: FileManifest): string[] {
  const files: string[] = [];
  const lowerPrompt = prompt.toLowerCase();
  
  // Look for existing Flutter files to understand project structure
  const flutterFiles = Object.keys(manifest.files).filter(path => 
    path.endsWith('.dart') && 
    (path.includes('lib/') || path.includes('widgets/'))
  );
  
  if (flutterFiles.length > 0) {
    // If Flutter files exist, add to the main app file or widgets directory
    const mainFile = flutterFiles.find(f => f.includes('main.dart'));
    if (mainFile) {
      files.push(mainFile);
    } else {
      // Default to first Flutter file found
      files.push(flutterFiles[0]);
    }
  } else {
    // No Flutter files yet, use entry point as fallback
    files.push(manifest.entryPoint);
  }
  
  return files;
}

/**
 * Find where to insert new Flutter screens
 */
function findFlutterScreenInsertionPoints(prompt: string, manifest: FileManifest): string[] {
  const files: string[] = [];
  
  // Look for existing Flutter screen/page files
  const screenFiles = Object.keys(manifest.files).filter(path => 
    path.endsWith('.dart') && 
    (path.includes('screens/') || path.includes('pages/') || path.includes('lib/'))
  );
  
  // Find main app file for routing updates
  const mainFile = screenFiles.find(f => f.includes('main.dart')) || 
                  screenFiles.find(f => f.includes('app.dart'));
  
  if (mainFile) {
    files.push(mainFile);
  }
  
  // If no specific files found, use entry point
  if (files.length === 0) {
    files.push(manifest.entryPoint);
  }
  
  return files;
}

/**
 * Find existing Flutter widget files to update
 */
function findFlutterWidgetFiles(prompt: string, manifest: FileManifest): string[] {
  const files: string[] = [];
  const lowerPrompt = prompt.toLowerCase();
  
  // Extract widget names from prompt
  const widgetWords = extractFlutterWidgetNames(prompt);
  console.log('[findFlutterWidgetFiles] Extracted widget words:', widgetWords);
  
  // Look for matching Flutter files
  for (const [path, fileInfo] of Object.entries(manifest.files)) {
    if (!path.endsWith('.dart')) continue;
    
    const fileName = path.split('/').pop()?.toLowerCase() || '';
    const widgetName = fileInfo.flutterInfo?.name?.toLowerCase();
    
    for (const word of widgetWords) {
      if (fileName.includes(word.toLowerCase()) || widgetName?.includes(word.toLowerCase())) {
        console.log(`[findFlutterWidgetFiles] Match found: word="${word}" in file="${path}"`);
        files.push(path);
        break;
      }
    }
  }
  
  // If no specific widget found, look for common Flutter UI elements
  if (files.length === 0) {
    const flutterElements = ['button', 'card', 'list', 'container', 'column', 'row', 'scaffold'];
    for (const element of flutterElements) {
      if (lowerPrompt.includes(element)) {
        for (const [path, fileInfo] of Object.entries(manifest.files)) {
          if (!path.endsWith('.dart')) continue;
          
          const fileName = path.split('/').pop()?.toLowerCase() || '';
          if (fileName.includes(element)) {
            files.push(path);
            console.log(`[findFlutterWidgetFiles] Flutter element match: element="${element}" in file="${path}"`);
            return files;
          }
        }
      }
    }
  }
  
  return files.length > 0 ? files : findFlutterInsertionPoints(prompt, manifest);
}

/**
 * Find Flutter navigation-related files
 */
function findFlutterNavigationFiles(prompt: string, manifest: FileManifest): string[] {
  const files: string[] = [];
  
  // Look for main app files that typically contain navigation
  const navigationFiles = Object.keys(manifest.files).filter(path => 
    path.endsWith('.dart') && 
    (path.includes('main.dart') || 
     path.includes('app.dart') ||
     path.includes('home.dart') ||
     path.includes('navigation'))
  );
  
  files.push(...navigationFiles);
  
  // If no navigation files found, use main Flutter files
  if (files.length === 0) {
    return findFlutterInsertionPoints(prompt, manifest);
  }
  
  return files;
}

/**
 * Find Flutter package configuration files
 */
function findFlutterPackageFiles(manifest: FileManifest): string[] {
  const files: string[] = [];
  
  // Look for pubspec.yaml file
  for (const path of Object.keys(manifest.files)) {
    if (path.endsWith('pubspec.yaml') || path.endsWith('pubspec.yml')) {
      files.push(path);
    }
  }
  
  // If no pubspec found, create it at root level
  if (files.length === 0) {
    files.push('pubspec.yaml');
  }
  
  return files;
}

/**
 * Extract Flutter widget names from prompt
 */
function extractFlutterWidgetNames(prompt: string): string[] {
  const words: string[] = [];
  
  // Remove common words but keep Flutter-related words
  const cleanPrompt = prompt
    .replace(/\b(the|a|an|in|on|to|from|update|change|modify|edit|fix|make|create|build|widget|screen)\b/gi, '')
    .toLowerCase();
  
  // Extract potential widget names
  const matches = cleanPrompt.match(/\b\w+\b/g) || [];
  
  for (const match of matches) {
    if (match.length > 2) {
      words.push(match);
    }
  }
  
  // Add common Flutter widget patterns
  const flutterKeywords = ['appbar', 'scaffold', 'container', 'column', 'row', 'button', 'card', 'list', 'fab'];
  for (const keyword of flutterKeywords) {
    if (prompt.toLowerCase().includes(keyword)) {
      words.push(keyword);
    }
  }
  
  return words;
}