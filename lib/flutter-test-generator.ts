import { FlutterCodeGenerator, FlutterWidgetConfig, FlutterScreenConfig } from './flutter-code-generator';
import { DartValidator } from './dart-validator';
import { FlutterPackageManager } from './flutter-package-manager';
import { ProjectType } from '@/types/project';

export interface FlutterTestCase {
  name: string;
  prompt: string;
  expectedOutput: {
    hasValidDartSyntax: boolean;
    containsWidget: boolean;
    hasProperImports: boolean;
    followsFlutterPatterns: boolean;
  };
  projectType: ProjectType;
}

export interface FlutterTestResult {
  testCase: FlutterTestCase;
  generatedCode: string;
  validationResult: any;
  passed: boolean;
  errors: string[];
  warnings: string[];
  executionTime: number;
}

export class FlutterTestGenerator {
  private generator: FlutterCodeGenerator;

  constructor() {
    this.generator = new FlutterCodeGenerator();
  }

  // Test cases for various Flutter code generation scenarios
  static getTestCases(): FlutterTestCase[] {
    return [
      {
        name: 'Basic StatelessWidget Generation',
        prompt: 'Create a simple hello world widget',
        expectedOutput: {
          hasValidDartSyntax: true,
          containsWidget: true,
          hasProperImports: false, // Template doesn't include imports by default
          followsFlutterPatterns: true
        },
        projectType: ProjectType.FLUTTER_MOBILE
      },
      {
        name: 'Login Screen Generation',
        prompt: 'Create a login screen with email and password fields',
        expectedOutput: {
          hasValidDartSyntax: true,
          containsWidget: true,
          hasProperImports: false,
          followsFlutterPatterns: true
        },
        projectType: ProjectType.FLUTTER_MOBILE
      },
      {
        name: 'Home Screen with AppBar',
        prompt: 'Create a home screen with app bar and floating action button',
        expectedOutput: {
          hasValidDartSyntax: true,
          containsWidget: true,
          hasProperImports: false,
          followsFlutterPatterns: true
        },
        projectType: ProjectType.FLUTTER_MOBILE
      },
      {
        name: 'Shopping Cart Widget',
        prompt: 'Build a stateful shopping cart widget with item count',
        expectedOutput: {
          hasValidDartSyntax: true,
          containsWidget: true,
          hasProperImports: false,
          followsFlutterPatterns: true
        },
        projectType: ProjectType.FLUTTER_MOBILE
      },
      {
        name: 'Complete App Structure',
        prompt: 'Create a complete todo app with main.dart',
        expectedOutput: {
          hasValidDartSyntax: true,
          containsWidget: true,
          hasProperImports: false,
          followsFlutterPatterns: true
        },
        projectType: ProjectType.FLUTTER_MOBILE
      }
    ];
  }

  async runAllTests(): Promise<FlutterTestResult[]> {
    const testCases = FlutterTestGenerator.getTestCases();
    const results: FlutterTestResult[] = [];

    for (const testCase of testCases) {
      const result = await this.runSingleTest(testCase);
      results.push(result);
    }

    return results;
  }

  async runSingleTest(testCase: FlutterTestCase): Promise<FlutterTestResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Generate code using the Flutter code generator
      const generatedCode = this.generator.generateFlutterCodeFromPrompt(
        testCase.prompt, 
        testCase.projectType
      );

      // Validate the generated code
      const validationResult = DartValidator.validateDartCode(generatedCode);
      
      // Check if the code meets expectations
      let passed = true;

      // Check for valid Dart syntax
      if (testCase.expectedOutput.hasValidDartSyntax && !validationResult.isValid) {
        passed = false;
        errors.push('Generated code has invalid Dart syntax');
      }

      // Check if code contains widget
      if (testCase.expectedOutput.containsWidget) {
        const hasWidget = /extends\s+(StatelessWidget|StatefulWidget|State<)/.test(generatedCode);
        if (!hasWidget) {
          passed = false;
          errors.push('Generated code does not contain a Flutter widget');
        }
      }

      // Check for proper imports (when expected)
      if (testCase.expectedOutput.hasProperImports) {
        const hasImports = generatedCode.includes("import 'package:flutter/material.dart'");
        if (!hasImports) {
          passed = false;
          errors.push('Generated code missing proper Flutter imports');
        }
      }

      // Check Flutter patterns
      if (testCase.expectedOutput.followsFlutterPatterns) {
        if (!this.checkFlutterPatterns(generatedCode)) {
          passed = false;
          errors.push('Generated code does not follow Flutter patterns');
        }
      }

      // Add validation warnings
      warnings.push(...validationResult.warnings.map(w => w.message));

      const executionTime = Date.now() - startTime;

      return {
        testCase,
        generatedCode,
        validationResult,
        passed,
        errors,
        warnings,
        executionTime
      };
    } catch (error) {
      errors.push(`Test execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return {
        testCase,
        generatedCode: '',
        validationResult: null,
        passed: false,
        errors,
        warnings,
        executionTime: Date.now() - startTime
      };
    }
  }

  private checkFlutterPatterns(code: string): boolean {
    // Check for basic Flutter widget patterns
    const hasWidgetClass = /class\s+\w+\s+extends\s+(StatelessWidget|StatefulWidget)/.test(code);
    const hasBuildMethod = /Widget\s+build\s*\(\s*BuildContext\s+context\s*\)/.test(code);
    
    return hasWidgetClass && hasBuildMethod;
  }

  // Generate test report
  generateTestReport(results: FlutterTestResult[]): string {
    const totalTests = results.length;
    const passedTests = results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    
    let report = `# Flutter Code Generation Test Report\n\n`;
    report += `**Summary:**\n`;
    report += `- Total Tests: ${totalTests}\n`;
    report += `- Passed: ${passedTests}\n`;
    report += `- Failed: ${failedTests}\n`;
    report += `- Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%\n\n`;
    
    report += `## Test Results\n\n`;
    
    results.forEach((result, index) => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      report += `### ${index + 1}. ${result.testCase.name} ${status}\n\n`;
      report += `**Prompt:** "${result.testCase.prompt}"\n`;
      report += `**Execution Time:** ${result.executionTime}ms\n\n`;
      
      if (result.errors.length > 0) {
        report += `**Errors:**\n`;
        result.errors.forEach(error => {
          report += `- ${error}\n`;
        });
        report += `\n`;
      }
      
      if (result.warnings.length > 0) {
        report += `**Warnings:**\n`;
        result.warnings.forEach(warning => {
          report += `- ${warning}\n`;
        });
        report += `\n`;
      }
      
      if (result.generatedCode) {
        report += `**Generated Code:**\n`;
        report += `\`\`\`dart\n${result.generatedCode}\n\`\`\`\n\n`;
      }
      
      report += `---\n\n`;
    });
    
    return report;
  }

  // Test specific Flutter widget generation
  testWidgetGeneration(): void {
    console.log('Testing Flutter widget generation...');
    
    // Test StatelessWidget
    const statelessWidget = this.generator.generateStatelessWidget({
      widget_name: 'TestWidget',
      widget_body: `Container(
        child: Text('Hello Flutter'),
      )`
    });
    
    console.log('StatelessWidget generated:');
    console.log(statelessWidget);
    
    // Test StatefulWidget
    const statefulWidget = this.generator.generateStatefulWidget({
      widget_name: 'CounterWidget',
      state_variables: [
        { type: 'int', name: 'counter', default_value: '0' }
      ],
      widget_body: `Column(
        children: [
          Text('Count: $counter'),
          ElevatedButton(
            onPressed: () => setState(() => counter++),
            child: Text('Increment'),
          ),
        ],
      )`
    });
    
    console.log('StatefulWidget generated:');
    console.log(statefulWidget);
    
    // Validate generated widgets
    const statelessValidation = DartValidator.validateDartCode(statelessWidget);
    const statefulValidation = DartValidator.validateDartCode(statefulWidget);
    
    console.log('StatelessWidget validation:', statelessValidation);
    console.log('StatefulWidget validation:', statefulValidation);
  }

  // Test pubspec.yaml generation
  testPubspecGeneration(): void {
    console.log('Testing pubspec.yaml generation...');
    
    // Test basic pubspec
    const basicPubspec = FlutterPackageManager.createDefaultPubspec('test_app', 'A test Flutter app');
    console.log('Basic pubspec:', FlutterPackageManager.serializePubspec(basicPubspec));
    
    // Test adding packages
    const pubspecWithPackages = FlutterPackageManager.addPackage(basicPubspec, 'http');
    FlutterPackageManager.addPackage(pubspecWithPackages, 'provider');
    
    console.log('Pubspec with packages:', FlutterPackageManager.serializePubspec(pubspecWithPackages));
    
    // Test package need analysis
    const sampleCode = `
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:provider/provider.dart';

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      home: Consumer<MyModel>(
        builder: (context, model, child) {
          return Scaffold(
            body: Text('Hello'),
          );
        },
      ),
    );
  }
}`;
    
    const neededPackages = FlutterPackageManager.analyzePackageNeeds(sampleCode);
    console.log('Analyzed package needs:', neededPackages);
  }

  // Test Dart code validation
  testDartValidation(): void {
    console.log('Testing Dart code validation...');
    
    // Test valid code
    const validCode = `
import 'package:flutter/material.dart';

class TestWidget extends StatelessWidget {
  const TestWidget({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: Text('Hello Flutter'),
      ),
    );
  }
}`;
    
    const validationResult = DartValidator.validateDartCode(validCode);
    console.log('Valid code validation:', validationResult);
    
    // Test invalid code
    const invalidCode = `
class TestWidget extends StatelessWidget {
  Widget build(BuildContext context) {
    return Scaffold(
      body: text('Missing Text widget'),
    )  // Missing semicolon
  }
}`;
    
    const invalidValidation = DartValidator.validateDartCode(invalidCode);
    console.log('Invalid code validation:', invalidValidation);
  }

  // Integration test: Full workflow
  async testFullWorkflow(): Promise<void> {
    console.log('Testing full Flutter code generation workflow...');
    
    const prompt = 'Create a todo list app with add and delete functionality';
    const projectType = ProjectType.FLUTTER_MOBILE;
    
    try {
      // Generate Flutter project structure
      const projectFiles = this.generator.generateFlutterProject({
        projectName: 'TodoApp',
        appTitle: 'My Todo App',
        projectDescription: 'A simple todo list application'
      });
      
      console.log('Generated project files:');
      Object.keys(projectFiles).forEach(filePath => {
        console.log(`- ${filePath}`);
      });
      
      // Generate specific widget from prompt
      const generatedWidget = this.generator.generateFlutterCodeFromPrompt(prompt, projectType);
      
      // Validate generated code
      const validation = DartValidator.validateDartCode(generatedWidget);
      
      // Analyze package needs
      const packageNeeds = FlutterPackageManager.analyzePackageNeeds(generatedWidget);
      
      console.log('Full workflow results:');
      console.log('- Generated widget:', generatedWidget.substring(0, 200) + '...');
      console.log('- Validation passed:', validation.isValid);
      console.log('- Package needs:', packageNeeds.map(p => p.name));
      
    } catch (error) {
      console.error('Full workflow test failed:', error);
    }
  }
}