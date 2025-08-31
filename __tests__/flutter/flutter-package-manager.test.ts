import { FlutterPackageManager, type PubspecData } from '../../lib/flutter-package-manager';

describe('FlutterPackageManager', () => {
  describe('Default Pubspec Creation', () => {
    test('should create default pubspec with required fields', () => {
      const result = FlutterPackageManager.createDefaultPubspec('test_app', 'A test application');

      expect(result.name).toBe('test_app');
      expect(result.description).toBe('A test application');
      expect(result.version).toBe('1.0.0+1');
      expect(result.environment.sdk).toBe('>=3.1.0 <4.0.0');
      expect(result.dependencies.flutter).toBe('sdk: flutter');
      expect(result.dependencies.cupertino_icons).toBe('^1.0.2');
      expect(result.dev_dependencies.flutter_test).toBe('sdk: flutter');
      expect(result.dev_dependencies.flutter_lints).toBe('^3.0.0');
      expect(result.flutter?.uses_material_design).toBe(true);
    });

    test('should handle snake_case conversion for project names', () => {
      const testCases = [
        ['MyAwesomeApp', 'my_awesome_app'],
        ['TodoApp', 'todo_app'],
        ['user-profile', 'user_profile'],
        ['simple', 'simple']
      ];

      testCases.forEach(([input, expected]) => {
        const result = FlutterPackageManager.createDefaultPubspec(input);
        expect(result.name).toBe(expected);
      });
    });
  });

  describe('Pubspec Serialization and Parsing', () => {
    test('should serialize pubspec to valid YAML', () => {
      const pubspec = FlutterPackageManager.createDefaultPubspec('test_app', 'Test app');
      const yaml = FlutterPackageManager.serializePubspec(pubspec);

      expect(yaml).toContain('name: test_app');
      expect(yaml).toContain('description: Test app');
      expect(yaml).toContain('version: 1.0.0+1');
      expect(yaml).toContain('flutter:');
      expect(yaml).toContain('dependencies:');
      expect(yaml).toContain('dev_dependencies:');
    });

    test('should parse YAML back to pubspec data', () => {
      const originalPubspec = FlutterPackageManager.createDefaultPubspec('test_app', 'Test app');
      const yaml = FlutterPackageManager.serializePubspec(originalPubspec);
      const parsedPubspec = FlutterPackageManager.parsePubspec(yaml);

      expect(parsedPubspec.name).toBe(originalPubspec.name);
      expect(parsedPubspec.description).toBe(originalPubspec.description);
      expect(parsedPubspec.version).toBe(originalPubspec.version);
      expect(parsedPubspec.environment.sdk).toBe(originalPubspec.environment.sdk);
    });

    test('should handle malformed YAML gracefully', () => {
      const invalidYaml = 'invalid: yaml: content: [unclosed';

      expect(() => {
        FlutterPackageManager.parsePubspec(invalidYaml);
      }).toThrow('Failed to parse pubspec.yaml');
    });
  });

  describe('Package Management', () => {
    let basePubspec: PubspecData;

    beforeEach(() => {
      basePubspec = FlutterPackageManager.createDefaultPubspec('test_app');
    });

    test('should add regular dependencies', () => {
      const result = FlutterPackageManager.addPackage(basePubspec, 'http', '^1.2.0');

      expect(result.dependencies.http).toBe('^1.2.0');
      expect(result.dev_dependencies.http).toBeUndefined();
    });

    test('should add dev dependencies', () => {
      const result = FlutterPackageManager.addPackage(basePubspec, 'mockito', '^5.4.2', true);

      expect(result.dev_dependencies.mockito).toBe('^5.4.2');
      expect(result.dependencies.mockito).toBeUndefined();
    });

    test('should use common package versions when version not specified', () => {
      const result = FlutterPackageManager.addPackage(basePubspec, 'http');

      expect(result.dependencies.http).toBe('^1.2.0'); // From COMMON_PACKAGES
    });

    test('should remove packages from both dependencies and dev_dependencies', () => {
      let pubspec = FlutterPackageManager.addPackage(basePubspec, 'http', '^1.2.0');
      pubspec = FlutterPackageManager.addPackage(pubspec, 'http', '^1.2.0', true);
      
      const result = FlutterPackageManager.removePackage(pubspec, 'http');

      expect(result.dependencies.http).toBeUndefined();
      expect(result.dev_dependencies.http).toBeUndefined();
    });
  });

  describe('Assets and Fonts Management', () => {
    let basePubspec: PubspecData;

    beforeEach(() => {
      basePubspec = FlutterPackageManager.createDefaultPubspec('test_app');
    });

    test('should add assets', () => {
      const result = FlutterPackageManager.addAsset(basePubspec, 'assets/images/');

      expect(result.flutter?.assets).toContain('assets/images/');
    });

    test('should not add duplicate assets', () => {
      let pubspec = FlutterPackageManager.addAsset(basePubspec, 'assets/images/');
      pubspec = FlutterPackageManager.addAsset(pubspec, 'assets/images/');

      expect(pubspec.flutter?.assets?.filter(asset => asset === 'assets/images/')).toHaveLength(1);
    });

    test('should add fonts', () => {
      const fontAssets = [
        { asset: 'fonts/Roboto-Regular.ttf' },
        { asset: 'fonts/Roboto-Bold.ttf', weight: 700 }
      ];

      const result = FlutterPackageManager.addFont(basePubspec, 'Roboto', fontAssets);

      expect(result.flutter?.fonts).toHaveLength(1);
      expect(result.flutter?.fonts?.[0].family).toBe('Roboto');
      expect(result.flutter?.fonts?.[0].fonts).toHaveLength(2);
    });

    test('should update existing font family', () => {
      const initialFonts = [{ asset: 'fonts/Roboto-Regular.ttf' }];
      const updatedFonts = [
        { asset: 'fonts/Roboto-Regular.ttf' },
        { asset: 'fonts/Roboto-Bold.ttf', weight: 700 }
      ];

      let pubspec = FlutterPackageManager.addFont(basePubspec, 'Roboto', initialFonts);
      pubspec = FlutterPackageManager.addFont(pubspec, 'Roboto', updatedFonts);

      expect(pubspec.flutter?.fonts).toHaveLength(1);
      expect(pubspec.flutter?.fonts?.[0].fonts).toHaveLength(2);
    });
  });

  describe('Package Analysis from Code', () => {
    test('should analyze import statements for packages', () => {
      const dartCode = `
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:provider/provider.dart';
import 'dart:io';

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp();
  }
}`;

      const packages = FlutterPackageManager.analyzePackageNeeds(dartCode);

      const packageNames = packages.map(p => p.name);
      expect(packageNames).toContain('http');
      expect(packageNames).toContain('provider');
      expect(packageNames).not.toContain('flutter'); // Should skip flutter SDK packages
    });

    test('should analyze code patterns for additional packages', () => {
      const dartCode = `
class MyClass {
  void fetchData() async {
    final response = await http.get(uri);
  }
  
  void saveData() {
    SharedPreferences.getInstance();
  }
  
  void pickImage() {
    ImagePicker().pickImage(source: ImageSource.gallery);
  }
}`;

      const packages = FlutterPackageManager.analyzePackageNeeds(dartCode);

      const packageNames = packages.map(p => p.name);
      expect(packageNames).toContain('http');
      expect(packageNames).toContain('shared_preferences');
      expect(packageNames).toContain('image_picker');
    });

    test('should remove duplicate packages', () => {
      const dartCode = `
import 'package:http/http.dart' as http;

class MyClass {
  void method1() {
    http.get(uri);
  }
  
  void method2() {
    HttpClient client = HttpClient();
  }
}`;

      const packages = FlutterPackageManager.analyzePackageNeeds(dartCode);
      const httpPackages = packages.filter(p => p.name === 'http');
      
      expect(httpPackages).toHaveLength(1);
    });
  });

  describe('Pubspec Validation', () => {
    test('should validate correct pubspec', () => {
      const validPubspec = FlutterPackageManager.createDefaultPubspec('test_app', 'Test app');
      const result = FlutterPackageManager.validatePubspec(validPubspec);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should detect missing required fields', () => {
      const invalidPubspec: PubspecData = {
        name: '',
        version: '',
        environment: { sdk: '' },
        dependencies: {},
        dev_dependencies: {}
      };

      const result = FlutterPackageManager.validatePubspec(invalidPubspec);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Package name is required');
      expect(result.errors).toContain('Version is required');
      expect(result.errors).toContain('Dart SDK constraint is required');
    });

    test('should validate package name format', () => {
      const invalidPubspec = FlutterPackageManager.createDefaultPubspec('test_app');
      // Manually set an invalid name that bypasses toSnakeCase conversion
      invalidPubspec.name = '123invalid';
      const result = FlutterPackageManager.validatePubspec(invalidPubspec);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('Package name must start with a lowercase letter'))).toBe(true);
    });

    test('should validate version format', () => {
      const invalidPubspec = FlutterPackageManager.createDefaultPubspec('test_app');
      invalidPubspec.version = 'invalid-version';
      
      const result = FlutterPackageManager.validatePubspec(invalidPubspec);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('Version must follow semantic versioning'))).toBe(true);
    });
  });

  describe('Prompt-based Package Generation', () => {
    test('should generate packages from HTTP/API prompts', () => {
      const prompt = 'Create an app that fetches data from HTTP API';
      const result = FlutterPackageManager.generatePubspecFromPrompt(prompt, 'api_app');

      expect(result.dependencies.http).toBeDefined();
      expect(result.name).toBe('api_app');
    });

    test('should generate packages from state management prompts', () => {
      const prompt = 'Build an app with state management using provider';
      const result = FlutterPackageManager.generatePubspecFromPrompt(prompt, 'state_app');

      expect(result.dependencies.provider).toBeDefined();
    });

    test('should generate packages from image-related prompts', () => {
      const prompt = 'Create a photo gallery app with camera support';
      const result = FlutterPackageManager.generatePubspecFromPrompt(prompt, 'photo_app');

      expect(result.dependencies.image_picker).toBeDefined();
    });

    test('should generate packages from location prompts', () => {
      const prompt = 'Build a GPS location tracking app';
      const result = FlutterPackageManager.generatePubspecFromPrompt(prompt, 'location_app');

      expect(result.dependencies.geolocator).toBeDefined();
    });
  });

  describe('Package Suggestions', () => {
    test('should return all suggested packages when no category specified', () => {
      const packages = FlutterPackageManager.getSuggestedPackages();

      expect(packages.length).toBeGreaterThan(0);
      expect(packages.every(p => p.name && p.version && p.description)).toBe(true);
    });

    test('should filter packages by network category', () => {
      const packages = FlutterPackageManager.getSuggestedPackages('network');

      const packageNames = packages.map(p => p.name);
      expect(packageNames).toContain('http');
      expect(packageNames).toContain('dio');
      expect(packageNames).toContain('connectivity_plus');
    });

    test('should filter packages by state management category', () => {
      const packages = FlutterPackageManager.getSuggestedPackages('state');

      const packageNames = packages.map(p => p.name);
      expect(packageNames).toContain('provider');
      expect(packageNames).toContain('riverpod');
      expect(packageNames).toContain('flutter_riverpod');
    });

    test('should filter packages by UI category', () => {
      const packages = FlutterPackageManager.getSuggestedPackages('ui');

      const packageNames = packages.map(p => p.name);
      expect(packageNames).toContain('google_fonts');
      expect(packageNames).toContain('flutter_svg');
      expect(packageNames).toContain('animations');
    });
  });
});