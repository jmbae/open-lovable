export interface DartValidationError {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
  code?: string;
}

export interface DartValidationResult {
  isValid: boolean;
  errors: DartValidationError[];
  warnings: DartValidationError[];
  formattedCode?: string;
}

export class DartValidator {
  private static readonly DART_KEYWORDS = new Set([
    'abstract', 'else', 'import', 'show', 'as', 'enum', 'in', 'static',
    'assert', 'export', 'interface', 'super', 'async', 'extends', 'is',
    'switch', 'await', 'external', 'library', 'sync', 'break', 'factory',
    'mixin', 'this', 'case', 'false', 'new', 'throw', 'catch', 'final',
    'null', 'true', 'class', 'finally', 'on', 'try', 'const', 'for',
    'operator', 'typedef', 'continue', 'function', 'part', 'var', 'covariant',
    'get', 'rethrow', 'void', 'default', 'hide', 'return', 'while',
    'deferred', 'if', 'set', 'with', 'do', 'implements', 'dynamic'
  ]);

  private static readonly FLUTTER_WIDGETS = new Set([
    'Widget', 'StatelessWidget', 'StatefulWidget', 'State', 'BuildContext',
    'Scaffold', 'AppBar', 'Container', 'Text', 'Column', 'Row', 'Stack',
    'ListView', 'GridView', 'Image', 'Icon', 'IconButton', 'ElevatedButton',
    'TextButton', 'FloatingActionButton', 'Card', 'Padding', 'Margin',
    'Center', 'Align', 'Expanded', 'Flexible', 'SizedBox', 'Divider',
    'TextField', 'TextFormField', 'DropdownButton', 'Checkbox', 'Radio',
    'Switch', 'Slider', 'AlertDialog', 'BottomSheet', 'Drawer',
    'BottomNavigationBar', 'TabBar', 'TabBarView', 'MaterialApp',
    'CupertinoApp', 'Theme', 'MediaQuery', 'SafeArea'
  ]);

  static validateDartCode(code: string): DartValidationResult {
    const errors: DartValidationError[] = [];
    const warnings: DartValidationError[] = [];
    const lines = code.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      // Check for basic syntax errors
      this.checkBasicSyntax(line, lineNumber, errors);
      
      // Check for Flutter-specific patterns
      this.checkFlutterPatterns(line, lineNumber, warnings);
      
      // Check for Dart best practices
      this.checkBestPractices(line, lineNumber, warnings);
    }

    // Check overall structure
    this.checkOverallStructure(code, errors, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      formattedCode: this.formatDartCode(code)
    };
  }

  private static checkBasicSyntax(line: string, lineNumber: number, errors: DartValidationError[]) {
    const trimmedLine = line.trim();

    // Skip empty lines and comments
    if (!trimmedLine || trimmedLine.startsWith('//') || trimmedLine.startsWith('/*')) {
      return;
    }

    // Check for missing semicolons (simplified check)
    if (this.shouldHaveSemicolon(trimmedLine) && !trimmedLine.endsWith(';')) {
      errors.push({
        line: lineNumber,
        column: line.length,
        message: 'Missing semicolon at end of statement',
        severity: 'error',
        code: 'missing_semicolon'
      });
    }

    // Check for unclosed brackets
    const openBrackets = (line.match(/[\[{(]/g) || []).length;
    const closeBrackets = (line.match(/[\]})]/g) || []).length;
    
    if (openBrackets > closeBrackets && !trimmedLine.endsWith('{')) {
      // This is a simplified check - full parser would be needed for accurate bracket matching
      // For now, we'll skip this to avoid false positives
    }

    // Check for common typos in Flutter widgets
    this.checkCommonTypos(line, lineNumber, errors);
  }

  private static shouldHaveSemicolon(line: string): boolean {
    const trimmed = line.trim();
    
    // Skip if line contains opening brackets/braces or starts a function call
    if (trimmed.includes('{') || trimmed.includes('=>') || trimmed.endsWith('(')) {
      return false;
    }
    
    // Statements that should end with semicolon
    return (
      /^\s*(var|final|const|int|double|String|bool|List|Map)\s+/.test(line) ||
      /^\s*\w+\s*=/.test(line) ||
      (/^\s*return\s+/.test(line) && !trimmed.endsWith('(')) ||
      /^\s*throw\s+/.test(line) ||
      /^\s*assert\s*\(/.test(line) ||
      /^\s*super\s*\(/.test(line)
    );
  }

  private static checkCommonTypos(line: string, lineNumber: number, errors: DartValidationError[]) {
    const typos = [
      { wrong: 'Stateless', correct: 'StatelessWidget' },
      { wrong: 'Stateful', correct: 'StatefulWidget' },
      { wrong: 'scaffold', correct: 'Scaffold' },
      { wrong: 'appBar', correct: 'AppBar' },
      { wrong: 'container', correct: 'Container' },
      { wrong: 'text', correct: 'Text' },
      { wrong: 'column', correct: 'Column' },
      { wrong: 'row', correct: 'Row' }
    ];

    for (const typo of typos) {
      // Use word boundaries to avoid false positives
      const regex = new RegExp(`\\b${typo.wrong}\\b`, 'g');
      if (regex.test(line) && !line.includes('//')) {
        const match = line.match(regex);
        if (match) {
          const column = line.indexOf(match[0]) + 1;
          errors.push({
            line: lineNumber,
            column,
            message: `Did you mean '${typo.correct}'? Found '${typo.wrong}'`,
            severity: 'error',
            code: 'possible_typo'
          });
        }
      }
    }
  }

  private static checkFlutterPatterns(line: string, lineNumber: number, warnings: DartValidationError[]) {
    const trimmedLine = line.trim();

    // Check for missing const keywords
    if (/^\s*return\s+\w+\(/.test(trimmedLine) && !trimmedLine.includes('const')) {
      // Check if it's likely a widget constructor that could be const
      const widgetMatch = trimmedLine.match(/return\s+(\w+)\(/);
      if (widgetMatch && this.FLUTTER_WIDGETS.has(widgetMatch[1])) {
        warnings.push({
          line: lineNumber,
          column: trimmedLine.indexOf(widgetMatch[1]) + 1,
          message: `Consider adding 'const' keyword for better performance: const ${widgetMatch[1]}(...)`,
          severity: 'warning',
          code: 'missing_const'
        });
      }
    }

    // Check for super.key usage in constructors
    if (trimmedLine.includes('({') && trimmedLine.includes('key') && !trimmedLine.includes('super.key')) {
      warnings.push({
        line: lineNumber,
        column: 1,
        message: 'Consider using super.key instead of key parameter',
        severity: 'warning',
        code: 'prefer_super_key'
      });
    }

    // Check for proper widget naming (PascalCase)
    const classMatch = trimmedLine.match(/class\s+(\w+)/);
    if (classMatch) {
      const className = classMatch[1];
      if (!/^[A-Z][a-zA-Z0-9]*$/.test(className)) {
        warnings.push({
          line: lineNumber,
          column: trimmedLine.indexOf(className) + 1,
          message: 'Widget class names should be in PascalCase',
          severity: 'warning',
          code: 'invalid_class_name'
        });
      }
    }
  }

  private static checkBestPractices(line: string, lineNumber: number, warnings: DartValidationError[]) {
    const trimmedLine = line.trim();

    // Check for proper variable naming (camelCase) - but skip constructors and methods
    const varMatch = trimmedLine.match(/(?:var|final|const)\s+(\w+)/);
    if (varMatch && !trimmedLine.includes('(') && !trimmedLine.includes('extends')) {
      const varName = varMatch[1];
      if (!/^[a-z][a-zA-Z0-9]*$/.test(varName) && !varName.startsWith('_')) {
        warnings.push({
          line: lineNumber,
          column: trimmedLine.indexOf(varName) + 1,
          message: 'Variable names should be in camelCase',
          severity: 'warning',
          code: 'invalid_variable_name'
        });
      }
    }

    // Check for hardcoded strings that might need localization (but skip imports)
    const stringMatches = trimmedLine.match(/'[^']{10,}'/g) || [];
    stringMatches.forEach(str => {
      if (!trimmedLine.includes('//') && !trimmedLine.includes('import') && str.length > 20) {
        warnings.push({
          line: lineNumber,
          column: trimmedLine.indexOf(str) + 1,
          message: 'Consider extracting long strings to constants or localization',
          severity: 'info',
          code: 'long_string_literal'
        });
      }
    });

    // Check for setState usage in StatefulWidget
    if (trimmedLine.includes('setState') && !trimmedLine.includes('() =>')) {
      warnings.push({
        line: lineNumber,
        column: trimmedLine.indexOf('setState') + 1,
        message: 'Consider using setState(() => { ... }) for better readability',
        severity: 'info',
        code: 'setState_style'
      });
    }
  }

  private static checkOverallStructure(code: string, errors: DartValidationError[], warnings: DartValidationError[]) {
    // Check for required imports
    if (code.includes('StatelessWidget') || code.includes('StatefulWidget')) {
      if (!code.includes("import 'package:flutter/material.dart'")) {
        errors.push({
          line: 1,
          column: 1,
          message: "Missing required import: import 'package:flutter/material.dart';",
          severity: 'error',
          code: 'missing_import'
        });
      }
    }

    // Check for proper widget structure
    const hasStatefulWidget = code.includes('extends StatefulWidget');
    const hasStateClass = code.includes('extends State<');
    
    if (hasStatefulWidget && !hasStateClass) {
      errors.push({
        line: 1,
        column: 1,
        message: 'StatefulWidget requires a corresponding State class',
        severity: 'error',
        code: 'missing_state_class'
      });
    }

    // Check for build method in widgets
    if ((code.includes('extends StatelessWidget') || code.includes('extends State<')) && !code.includes('Widget build(BuildContext context)')) {
      errors.push({
        line: 1,
        column: 1,
        message: 'Widget classes must have a build method',
        severity: 'error',
        code: 'missing_build_method'
      });
    }
  }

  static formatDartCode(code: string): string {
    // Basic Dart code formatting
    let formatted = code;

    // Add proper spacing around operators
    formatted = formatted.replace(/(\w)([+\-*/%=<>!&|])(\w)/g, '$1 $2 $3');
    formatted = formatted.replace(/(\w)([+\-*/%])(\w)/g, '$1 $2 $3');
    
    // Fix spacing after commas
    formatted = formatted.replace(/,(\S)/g, ', $1');
    
    // Fix spacing after semicolons in for loops
    formatted = formatted.replace(/;(\S)/g, '; $1');
    
    // Proper indentation for Flutter widgets (simplified)
    const lines = formatted.split('\n');
    let indentLevel = 0;
    const indentSize = 2;
    
    const formattedLines = lines.map(line => {
      const trimmed = line.trim();
      
      if (!trimmed) return '';
      
      // Decrease indent for closing brackets
      if (trimmed.startsWith('}') || trimmed.startsWith(']') || trimmed.startsWith(')')
          || trimmed.startsWith('})') || trimmed.startsWith('],') || trimmed.startsWith('),')) {
        indentLevel = Math.max(0, indentLevel - 1);
      }
      
      const indentedLine = ' '.repeat(indentLevel * indentSize) + trimmed;
      
      // Increase indent for opening brackets
      if (trimmed.endsWith('{') || trimmed.endsWith('[') || trimmed.endsWith('(')
          || trimmed.match(/\{\s*$/) || trimmed.match(/\[\s*$/) || trimmed.match(/\(\s*$/)) {
        indentLevel++;
      }
      
      return indentedLine;
    });

    return formattedLines.join('\n');
  }

  static checkFlutterLintRules(code: string): DartValidationError[] {
    const lintErrors: DartValidationError[] = [];
    const lines = code.split('\n');

    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      const trimmed = line.trim();

      // prefer_const_constructors
      if (this.shouldBeConstConstructor(line)) {
        lintErrors.push({
          line: lineNumber,
          column: 1,
          message: 'Prefer const with constant constructors.',
          severity: 'warning',
          code: 'prefer_const_constructors'
        });
      }

      // avoid_print
      if (trimmed.includes('print(')) {
        lintErrors.push({
          line: lineNumber,
          column: trimmed.indexOf('print(') + 1,
          message: 'Avoid print() in production code. Use debugPrint() or logging.',
          severity: 'warning',
          code: 'avoid_print'
        });
      }

      // prefer_single_quotes
      if (trimmed.includes('"') && !trimmed.includes("'") && !trimmed.includes('\\')) {
        lintErrors.push({
          line: lineNumber,
          column: trimmed.indexOf('"') + 1,
          message: 'Prefer single quotes for strings.',
          severity: 'info',
          code: 'prefer_single_quotes'
        });
      }

      // unnecessary_brace_in_string_interps
      const interpolationMatch = trimmed.match(/\$\{(\w+)\}/);
      if (interpolationMatch && interpolationMatch[1]) {
        lintErrors.push({
          line: lineNumber,
          column: trimmed.indexOf(interpolationMatch[0]) + 1,
          message: 'Unnecessary braces in string interpolation. Use $' + interpolationMatch[1] + ' instead.',
          severity: 'info',
          code: 'unnecessary_brace_in_string_interps'
        });
      }
    });

    return lintErrors;
  }

  private static shouldBeConstConstructor(line: string): boolean {
    // Check if this line creates a widget that could be const
    const constructorPattern = /\w+\(/;
    const hasConstableWidget = this.FLUTTER_WIDGETS.has(line.match(/(\w+)\(/)?.[1] || '');
    
    return (
      constructorPattern.test(line) &&
      hasConstableWidget &&
      !line.includes('const ') &&
      !line.includes('new ') &&
      !line.includes('=') && // Avoid assignment expressions
      !line.includes('var ') && // Avoid variable declarations
      line.includes('(')
    );
  }

  static getQuickFixes(error: DartValidationError, line: string): string[] {
    const fixes: string[] = [];

    switch (error.code) {
      case 'missing_const':
        const widgetMatch = line.match(/(\w+)\(/);
        if (widgetMatch) {
          fixes.push(line.replace(widgetMatch[1] + '(', 'const ' + widgetMatch[1] + '('));
        }
        break;

      case 'prefer_super_key':
        fixes.push(line.replace(/\{key\}/, '{super.key}').replace(/\{Key\? key\}/, '{super.key}'));
        break;

      case 'missing_semicolon':
        fixes.push(line + ';');
        break;

      case 'prefer_single_quotes':
        fixes.push(line.replace(/"/g, "'"));
        break;

      case 'unnecessary_brace_in_string_interps':
        fixes.push(line.replace(/\$\{(\w+)\}/g, '$$1'));
        break;
    }

    return fixes;
  }

  static analyzeComplexity(code: string): {
    cyclomaticComplexity: number;
    linesOfCode: number;
    numberOfMethods: number;
    nestingDepth: number;
  } {
    const lines = code.split('\n').filter(line => line.trim() && !line.trim().startsWith('//'));
    
    // Count decision points for cyclomatic complexity
    const decisionPoints = (code.match(/\b(if|else|for|while|case|catch|&&|\|\||\?)\b/g) || []).length;
    const cyclomaticComplexity = decisionPoints + 1; // +1 for the entry point

    // Count methods/functions
    const numberOfMethods = (code.match(/\b(\w+)\s*\([^)]*\)\s*{/g) || []).length;

    // Calculate maximum nesting depth
    let currentDepth = 0;
    let maxDepth = 0;
    
    for (const line of lines) {
      const openBraces = (line.match(/\{/g) || []).length;
      const closeBraces = (line.match(/\}/g) || []).length;
      
      currentDepth += openBraces - closeBraces;
      maxDepth = Math.max(maxDepth, currentDepth);
    }

    return {
      cyclomaticComplexity,
      linesOfCode: lines.length,
      numberOfMethods,
      nestingDepth: maxDepth
    };
  }
}