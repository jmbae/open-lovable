import { DartValidator, type DartValidationError } from '../../lib/dart-validator';

describe('DartValidator', () => {
  describe('Basic Syntax Validation', () => {
    test('should validate correct Dart code', () => {
      const validCode = `
import 'package:flutter/material.dart';

class MyWidget extends StatelessWidget {
  const MyWidget({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: Text('Hello World'),
      ),
    );
  }
}`;

      const result = DartValidator.validateDartCode(validCode);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should detect missing semicolons', () => {
      const invalidCode = `
class MyWidget extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    var message = "Hello World"
    return Text(message);
  }
}`;

      const result = DartValidator.validateDartCode(invalidCode);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => 
        error.message.includes('Missing semicolon') && error.code === 'missing_semicolon'
      )).toBe(true);
    });

    test('should detect common Flutter widget typos', () => {
      const codeWithTypos = `
class MyWidget extends Stateless {
  @override
  Widget build(BuildContext context) {
    return scaffold(
      body: text('Hello'),
    );
  }
}`;

      const result = DartValidator.validateDartCode(codeWithTypos);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.code === 'possible_typo')).toBe(true);
      expect(result.errors.some(error => error.message.includes("Did you mean 'StatelessWidget'"))).toBe(true);
    });

    test('should detect missing required imports', () => {
      const codeWithoutImports = `
class MyWidget extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Text('Hello');
  }
}`;

      const result = DartValidator.validateDartCode(codeWithoutImports);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => 
        error.message.includes("Missing required import") && error.code === 'missing_import'
      )).toBe(true);
    });
  });

  describe('Flutter Pattern Validation', () => {
    test('should suggest const constructors for performance', () => {
      const codeWithoutConst = `
class MyWidget extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Text('Hello World'),
    );
  }
}`;

      const result = DartValidator.validateDartCode(codeWithoutConst);

      expect(result.warnings.some(warning => 
        warning.code === 'missing_const' && warning.message.includes('const')
      )).toBe(true);
    });

    test('should suggest using super.key', () => {
      const codeWithOldKeyPattern = `
class MyWidget extends StatelessWidget {
  const MyWidget({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return const Text('Hello');
  }
}`;

      const result = DartValidator.validateDartCode(codeWithOldKeyPattern);

      expect(result.warnings.some(warning => 
        warning.code === 'prefer_super_key'
      )).toBe(true);
    });

    test('should validate proper widget naming (PascalCase)', () => {
      const codeWithBadNaming = `
class myWidget extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return const Text('Hello');
  }
}`;

      const result = DartValidator.validateDartCode(codeWithBadNaming);

      expect(result.warnings.some(warning => 
        warning.code === 'invalid_class_name'
      )).toBe(true);
    });
  });

  describe('Best Practices Validation', () => {
    test('should validate variable naming (camelCase)', () => {
      const codeWithBadVariableNames = `
class MyWidget extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final MyVariable = 'hello';
    const ANOTHER_VAR = 'world';
    return Text(MyVariable);
  }
}`;

      const result = DartValidator.validateDartCode(codeWithBadVariableNames);

      expect(result.warnings.some(warning => 
        warning.code === 'invalid_variable_name'
      )).toBe(true);
    });

    test('should suggest extracting long strings', () => {
      const codeWithLongStrings = `
class MyWidget extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return const Text('This is a very long string that probably should be extracted to a constant or localization system');
  }
}`;

      const result = DartValidator.validateDartCode(codeWithLongStrings);

      expect(result.warnings.some(warning => 
        warning.code === 'long_string_literal'
      )).toBe(true);
    });
  });

  describe('Overall Structure Validation', () => {
    test('should require State class for StatefulWidget', () => {
      const incompleteStatefulWidget = `
class MyWidget extends StatefulWidget {
  @override
  Widget build(BuildContext context) {
    return const Text('Hello');
  }
}`;

      const result = DartValidator.validateDartCode(incompleteStatefulWidget);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => 
        error.code === 'missing_state_class'
      )).toBe(true);
    });

    test('should require build method in widgets', () => {
      const widgetWithoutBuild = `
import 'package:flutter/material.dart';

class MyWidget extends StatelessWidget {
  const MyWidget({super.key});
  
  void someMethod() {
    print('Hello');
  }
}`;

      const result = DartValidator.validateDartCode(widgetWithoutBuild);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => 
        error.code === 'missing_build_method'
      )).toBe(true);
    });
  });

  describe('Code Formatting', () => {
    test('should format Dart code with proper indentation', () => {
      const unformattedCode = `
class MyWidget extends StatelessWidget{
@override
Widget build(BuildContext context){
return Scaffold(
body:Center(
child:Text('Hello World'),
),
);
}
}`;

      const result = DartValidator.validateDartCode(unformattedCode);

      expect(result.formattedCode).toBeDefined();
      expect(result.formattedCode).toContain('  @override');
      expect(result.formattedCode).toContain('    return Scaffold(');
    });

    test('should add proper spacing around operators', () => {
      const codeWithBadSpacing = `
class MyWidget extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    var x=5+3;
    var y=x*2;
    return Text('\${x+y}');
  }
}`;

      const result = DartValidator.validateDartCode(codeWithBadSpacing);

      expect(result.formattedCode).toContain('x = 5 + 3');
      expect(result.formattedCode).toContain('y = x * 2');
    });
  });

  describe('Flutter Lint Rules', () => {
    test('should detect avoid_print violations', () => {
      const codeWithPrint = `
class MyWidget extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    print('Debug message');
    return const Text('Hello');
  }
}`;

      const lintErrors = DartValidator.checkFlutterLintRules(codeWithPrint);

      expect(lintErrors.some(error => 
        error.code === 'avoid_print'
      )).toBe(true);
    });

    test('should suggest single quotes over double quotes', () => {
      const codeWithDoubleQuotes = `
class MyWidget extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Text("Hello World");
  }
}`;

      const lintErrors = DartValidator.checkFlutterLintRules(codeWithDoubleQuotes);

      expect(lintErrors.some(error => 
        error.code === 'prefer_single_quotes'
      )).toBe(true);
    });

    test('should detect unnecessary braces in string interpolation', () => {
      const codeWithUnnecessaryBraces = `
class MyWidget extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final name = 'World';
    return Text('Hello \${name}');
  }
}`;

      const lintErrors = DartValidator.checkFlutterLintRules(codeWithUnnecessaryBraces);

      expect(lintErrors.some(error => 
        error.code === 'unnecessary_brace_in_string_interps'
      )).toBe(true);
    });
  });

  describe('Quick Fixes', () => {
    test('should provide fix for missing const', () => {
      const error: DartValidationError = {
        line: 1,
        column: 1,
        message: 'Consider adding const',
        severity: 'warning',
        code: 'missing_const'
      };
      const line = 'return Text("Hello");';

      const fixes = DartValidator.getQuickFixes(error, line);

      expect(fixes).toContain('return const Text("Hello");');
    });

    test('should provide fix for super.key pattern', () => {
      const error: DartValidationError = {
        line: 1,
        column: 1,
        message: 'Use super.key',
        severity: 'warning',
        code: 'prefer_super_key'
      };
      const line = 'const MyWidget({Key? key}) : super(key: key);';

      const fixes = DartValidator.getQuickFixes(error, line);

      expect(fixes[0]).toContain('{super.key}');
    });

    test('should provide fix for missing semicolon', () => {
      const error: DartValidationError = {
        line: 1,
        column: 1,
        message: 'Missing semicolon',
        severity: 'error',
        code: 'missing_semicolon'
      };
      const line = 'var message = "Hello"';

      const fixes = DartValidator.getQuickFixes(error, line);

      expect(fixes).toContain('var message = "Hello";');
    });

    test('should provide fix for single quotes', () => {
      const error: DartValidationError = {
        line: 1,
        column: 1,
        message: 'Prefer single quotes',
        severity: 'info',
        code: 'prefer_single_quotes'
      };
      const line = 'return Text("Hello World");';

      const fixes = DartValidator.getQuickFixes(error, line);

      expect(fixes).toContain("return Text('Hello World');");
    });
  });

  describe('Complexity Analysis', () => {
    test('should analyze code complexity metrics', () => {
      const complexCode = `
class MyWidget extends StatefulWidget {
  @override
  _MyWidgetState createState() => _MyWidgetState();
}

class _MyWidgetState extends State<MyWidget> {
  int counter = 0;
  
  void increment() {
    if (counter < 10) {
      setState(() {
        counter++;
      });
    } else if (counter >= 10 && counter < 20) {
      setState(() {
        counter += 2;
      });
    } else {
      counter = 0;
    }
  }
  
  void decrement() {
    if (counter > 0) {
      setState(() {
        counter--;
      });
    }
  }
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Text('\$counter'),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: increment,
        child: const Icon(Icons.add),
      ),
    );
  }
}`;

      const complexity = DartValidator.analyzeComplexity(complexCode);

      expect(complexity.cyclomaticComplexity).toBeGreaterThan(1);
      expect(complexity.linesOfCode).toBeGreaterThan(0);
      expect(complexity.numberOfMethods).toBeGreaterThan(0);
      expect(complexity.nestingDepth).toBeGreaterThan(0);
    });

    test('should calculate cyclomatic complexity correctly', () => {
      const codeWithDecisions = `
void processData(int value) {
  if (value > 0) {
    print('positive');
  } else if (value < 0) {
    print('negative');
  } else {
    print('zero');
  }
  
  for (int i = 0; i < value; i++) {
    if (i % 2 == 0) {
      print(i);
    }
  }
}`;

      const complexity = DartValidator.analyzeComplexity(codeWithDecisions);

      // Should count if, else if, for, inner if
      expect(complexity.cyclomaticComplexity).toBeGreaterThanOrEqual(5);
    });
  });

  describe('Error Handling', () => {
    test('should handle empty code gracefully', () => {
      const result = DartValidator.validateDartCode('');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should handle code with only comments', () => {
      const commentOnlyCode = `
// This is a comment
/* This is a block comment */

// Another comment
`;

      const result = DartValidator.validateDartCode(commentOnlyCode);

      expect(result.isValid).toBe(true);
    });

    test('should provide meaningful error locations', () => {
      const invalidCode = `
class MyWidget extends StatelessWidget {
  Widget build(BuildContext context) {
    var message = "Hello World"
    return Text(message);
  }
}`;

      const result = DartValidator.validateDartCode(invalidCode);
      const semicolonError = result.errors.find(e => e.code === 'missing_semicolon');

      expect(semicolonError).toBeDefined();
      expect(semicolonError!.line).toBeGreaterThan(0);
      expect(semicolonError!.column).toBeGreaterThan(0);
    });
  });
});