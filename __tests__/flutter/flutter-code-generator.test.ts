import { jest } from '@jest/globals';
import { readFileSync } from 'fs';
import { FlutterCodeGenerator } from '../../lib/flutter-code-generator';
import { ProjectType } from '../../types/project';

// Mock fs module
jest.mock('fs');
const mockReadFileSync = jest.mocked(readFileSync);

describe('FlutterCodeGenerator', () => {
  let generator: FlutterCodeGenerator;
  
  beforeEach(() => {
    generator = new FlutterCodeGenerator();
    jest.clearAllMocks();
  });

  describe('Template Loading and Variable Replacement', () => {
    beforeEach(() => {
      // Mock template file content
      mockReadFileSync.mockImplementation((filePath) => {
        const path = filePath.toString();
        if (path.includes('main.dart.template')) {
          return `import 'package:flutter/material.dart';

void main() {
  runApp(const {{app_name}}());
}

class {{app_name}} extends StatelessWidget {
  const {{app_name}}({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: '{{app_title}}',
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(seedColor: {{primary_color}}),
      ),
      home: const {{home_widget}}(),
    );
  }
}`;
        }
        if (path.includes('stateless-widget.template')) {
          return `class {{widget_name}} extends StatelessWidget {
  const {{widget_name}}({super.key});

  @override
  Widget build(BuildContext context) {
    return {{widget_body}};
  }
}`;
        }
        if (path.includes('stateful-widget.template')) {
          return `class {{widget_name}} extends StatefulWidget {
  const {{widget_name}}({super.key});

  @override
  State<{{widget_name}}> createState() => _{{widget_name}}State();
}

class _{{widget_name}}State extends State<{{widget_name}}> {
  @override
  Widget build(BuildContext context) {
    return {{widget_body}};
  }
}`;
        }
        if (path.includes('screen.template')) {
          return `class {{screen_name}} extends StatefulWidget {
  const {{screen_name}}({super.key});

  @override
  State<{{screen_name}}> createState() => _{{screen_name}}State();
}

class _{{screen_name}}State extends State<{{screen_name}}> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      {{#if has_app_bar}}
      appBar: AppBar(title: Text('{{screen_title}}')),
      {{/if}}
      {{#if has_floating_action_button}}
      floatingActionButton: FloatingActionButton(
        onPressed: () {},
        child: const Icon(Icons.add),
      ),
      {{/if}}
      body: {{screen_body}},
    );
  }
}`;
        }
        if (path.includes('pubspec.yaml.template')) {
          return `name: {{project_name}}
description: {{project_description}}
version: 1.0.0+1

environment:
  sdk: '>=3.1.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter`;
        }
        throw new Error(`Template not found: ${path}`);
      });
    });

    test('should generate main.dart with proper variable substitution', () => {
      const config = {
        app_name: 'MyApp',
        app_title: 'My Flutter App',
        primary_color: 'Colors.blue',
        home_widget: 'HomePage'
      };

      const result = generator.generateMainDart(config);

      expect(result).toContain('runApp(const MyApp());');
      expect(result).toContain('class MyApp extends StatelessWidget');
      expect(result).toContain("title: 'My Flutter App'");
      expect(result).toContain('seedColor: Colors.blue');
      expect(result).toContain('home: const HomePage()');
    });

    test('should generate StatelessWidget with proper structure', () => {
      const config = {
        widget_name: 'TestWidget',
        widget_body: 'Container(child: Text("Hello"))'
      };

      const result = generator.generateStatelessWidget(config);

      expect(result).toContain('class TestWidget extends StatelessWidget');
      expect(result).toContain('const TestWidget({super.key});');
      expect(result).toContain('Widget build(BuildContext context)');
      expect(result).toContain('Container(child: Text("Hello"))');
    });

    test('should generate pubspec.yaml with dependencies', () => {
      const config = {
        project_name: 'test_app',
        project_description: 'A test Flutter application'
      };

      const result = generator.generatePubspecYaml(config);

      expect(result).toContain('name: test_app');
      expect(result).toContain('description: A test Flutter application');
      expect(result).toContain('version: 1.0.0+1');
      expect(result).toContain('flutter:');
    });
  });

  describe('Flutter Project Generation', () => {
    beforeEach(() => {
      mockReadFileSync.mockImplementation((filePath) => {
        const path = filePath.toString();
        if (path.includes('main.dart.template')) {
          return 'import \'package:flutter/material.dart\';\n\nvoid main() {\n  runApp(const {{app_name}}());\n}';
        }
        if (path.includes('pubspec.yaml.template')) {
          return 'name: {{project_name}}\ndescription: {{project_description}}';
        }
        if (path.includes('screen.template')) {
          return 'class {{screen_name}} extends StatefulWidget {\n  @override\n  Widget build(BuildContext context) {\n    return {{body_content}};\n  }\n}';
        }
        return '';
      });
    });

    test('should generate complete Flutter project structure', () => {
      const config = {
        projectName: 'TodoApp',
        appTitle: 'My Todo App',
        projectDescription: 'A simple todo application'
      };

      const result = generator.generateFlutterProject(config);

      expect('lib/main.dart' in result).toBe(true);
      expect('pubspec.yaml' in result).toBe(true);
      expect(result['lib/main.dart']).toBeDefined();
      expect(result['lib/main.dart']).toContain('TodoApp');
      expect(result['pubspec.yaml']).toContain('todo_app');
    });
  });

  describe('Prompt-based Code Generation', () => {
    beforeEach(() => {
      mockReadFileSync.mockImplementation((filePath) => {
        const path = filePath.toString();
        if (path.includes('screen.template')) {
          return `class {{screen_name}} extends StatefulWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      {{#has_app_bar}}appBar: AppBar(title: Text('{{screen_title}}')),{{/has_app_bar}}
      body: {{body_content}},
    );
  }
}`;
        }
        if (path.includes('stateless-widget.template')) {
          return `class {{widget_name}} extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return {{widget_body}};
  }
}`;
        }
        if (path.includes('stateful-widget.template')) {
          return `class {{widget_name}} extends StatefulWidget {
  const {{widget_name}}({super.key});

  @override
  State<{{widget_name}}> createState() => _{{widget_name}}State();
}

class _{{widget_name}}State extends State<{{widget_name}}> {
  @override
  Widget build(BuildContext context) {
    return {{widget_body}};
  }
}`;
        }
        return '';
      });
    });

    test('should generate screen from prompt', () => {
      const prompt = 'create a login screen with app bar';
      
      const result = generator.generateFlutterCodeFromPrompt(prompt, ProjectType.FLUTTER_MOBILE);

      expect(result).toContain('extends StatefulWidget');
      expect(result).toContain('LoginScreen');
      expect(result).toBeTruthy();
    });

    test('should generate widget from prompt', () => {
      const prompt = 'create a custom button widget';
      
      const result = generator.generateFlutterCodeFromPrompt(prompt, ProjectType.FLUTTER_MOBILE);

      expect(result).toContain('extends StatelessWidget');
      expect(result).toContain('Button');
      expect(result).toBeTruthy();
    });

    test('should generate stateful widget for interactive components', () => {
      const prompt = 'create a stateful counter widget';
      
      const result = generator.generateFlutterCodeFromPrompt(prompt, ProjectType.FLUTTER_MOBILE);
      
      expect(result).toContain('extends StatefulWidget');
      expect(result).toContain('Counter');
    });

    test('should throw error for non-Flutter project types', () => {
      const prompt = 'create a widget';
      
      expect(() => {
        generator.generateFlutterCodeFromPrompt(prompt, ProjectType.REACT_WEB);
      }).toThrow('Flutter code generation is only supported for Flutter mobile projects');
    });
  });

  describe('Utility Functions', () => {
    test('should convert strings to PascalCase', () => {
      const testCases = [
        ['hello world', 'HelloWorld'],
        ['my-awesome-widget', 'MyAwesomeWidget'],
        ['user_profile_page', 'UserProfilePage'],
        ['simple', 'Simple']
      ];

      testCases.forEach(([input, expected]) => {
        // Access private method for testing
        const result = (generator as any).toPascalCase(input);
        expect(result).toBe(expected);
      });
    });

    test('should convert strings to snake_case', () => {
      const testCases = [
        ['HelloWorld', 'hello_world'],
        ['MyAwesomeWidget', 'my_awesome_widget'],
        ['UserProfilePage', 'user_profile_page'],
        ['Simple', 'simple']
      ];

      testCases.forEach(([input, expected]) => {
        // Access private method for testing
        const result = (generator as any).toSnakeCase(input);
        expect(result).toBe(expected);
      });
    });
  });

  describe('Pattern Extraction', () => {
    test('should extract screen name from prompts', () => {
      const testCases = [
        ['create a login screen', 'LoginScreen'],
        ['build home screen', 'HomeScreen'],
        ['make a profile screen', 'ProfileScreen']
      ];

      testCases.forEach(([prompt, expected]) => {
        const result = (generator as any).extractScreenName(prompt);
        expect(result).toBe(expected);
      });
    });

    test('should extract widget name from prompts', () => {
      const testCases = [
        ['create a button widget', 'ButtonWidget'],
        ['build custom card widget', 'CustomCardWidget'],
        ['make a loading widget', 'LoadingWidget']
      ];

      testCases.forEach(([prompt, expected]) => {
        const result = (generator as any).extractWidgetName(prompt);
        expect(result).toBe(expected);
      });
    });

    test('should extract project name from prompts', () => {
      const testCases = [
        ['create a todo app', 'TodoApp'],
        ['build weather app', 'WeatherApp'],
        ['make a chat project', 'ChatProject']
      ];

      testCases.forEach(([prompt, expected]) => {
        const result = (generator as any).extractProjectName(prompt);
        expect(result).toBe(expected);
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle missing template files gracefully', () => {
      mockReadFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      expect(() => {
        generator.generateMainDart({ app_name: 'Test' });
      }).toThrow('Template not found: main.dart.template');
    });

    test('should provide default values for missing config', () => {
      // Set up mock for template content
      mockReadFileSync.mockImplementation((filePath) => {
        const path = filePath.toString();
        if (path.includes('main.dart.template')) {
          return `import 'package:flutter/material.dart';

void main() {
  runApp(const {{app_name}}());
}

class {{app_name}} extends StatelessWidget {
  const {{app_name}}({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: '{{app_title}}',
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(seedColor: {{primary_color}}),
      ),
      home: const {{home_widget}}(),
    );
  }
}`;
        }
        throw new Error(`Template not found: ${path}`);
      });

      const result = generator.generateMainDart({});

      expect(result).toContain('MyApp');
      expect(result).toContain('Flutter App');
      expect(result).toContain('Colors.blue');
    });
  });
});