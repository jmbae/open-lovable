import yaml from 'js-yaml';

export interface FlutterPackage {
  name: string;
  version: string;
  description?: string;
  dev?: boolean;
}

export interface PubspecData {
  name: string;
  description?: string;
  version: string;
  environment: {
    sdk: string;
  };
  dependencies: Record<string, string>;
  dev_dependencies: Record<string, string>;
  flutter?: {
    uses_material_design?: boolean;
    assets?: string[];
    fonts?: Array<{
      family: string;
      fonts: Array<{
        asset: string;
        weight?: number;
        style?: string;
      }>;
    }>;
  };
}

export class FlutterPackageManager {
  private static readonly COMMON_PACKAGES: Record<string, string> = {
    'http': '^1.2.0',
    'provider': '^6.1.1',
    'riverpod': '^2.4.9',
    'flutter_riverpod': '^2.4.9',
    'shared_preferences': '^2.2.2',
    'path_provider': '^2.1.1',
    'sqflite': '^2.3.0',
    'image_picker': '^1.0.4',
    'camera': '^0.10.5+5',
    'geolocator': '^10.1.0',
    'connectivity_plus': '^5.0.2',
    'url_launcher': '^6.2.1',
    'webview_flutter': '^4.4.2',
    'firebase_core': '^2.24.2',
    'firebase_auth': '^4.15.3',
    'cloud_firestore': '^4.13.6',
    'dio': '^5.3.2',
    'json_annotation': '^4.8.1',
    'freezed_annotation': '^2.4.1',
    'google_fonts': '^6.1.0',
    'cached_network_image': '^3.3.0',
    'flutter_svg': '^2.0.9',
    'animations': '^2.0.11',
    'flutter_staggered_grid_view': '^0.7.0',
    'pull_to_refresh': '^2.0.0',
    'shimmer': '^3.0.0',
    'lottie': '^2.7.0'
  };

  private static readonly COMMON_DEV_PACKAGES: Record<string, string> = {
    'flutter_test': 'sdk: flutter',
    'flutter_lints': '^3.0.0',
    'build_runner': '^2.4.7',
    'json_serializable': '^6.7.1',
    'freezed': '^2.4.6',
    'mockito': '^5.4.2',
    'integration_test': 'sdk: flutter'
  };

  static createDefaultPubspec(projectName: string, description?: string): PubspecData {
    return {
      name: this.toSnakeCase(projectName),
      description: description || 'A new Flutter application.',
      version: '1.0.0+1',
      environment: {
        sdk: '>=3.1.0 <4.0.0'
      },
      dependencies: {
        flutter: 'sdk: flutter',
        cupertino_icons: '^1.0.2'
      },
      dev_dependencies: {
        flutter_test: 'sdk: flutter',
        flutter_lints: '^3.0.0'
      },
      flutter: {
        uses_material_design: true
      }
    };
  }

  static parsePubspec(yamlContent: string): PubspecData {
    try {
      const parsed = yaml.load(yamlContent) as any;
      return {
        name: parsed.name || 'flutter_app',
        description: parsed.description || 'A Flutter application',
        version: parsed.version || '1.0.0+1',
        environment: parsed.environment || { sdk: '>=3.1.0 <4.0.0' },
        dependencies: parsed.dependencies || {},
        dev_dependencies: parsed.dev_dependencies || {},
        flutter: parsed.flutter || {}
      };
    } catch (error) {
      throw new Error(`Failed to parse pubspec.yaml: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static serializePubspec(pubspecData: PubspecData): string {
    // Create a clean object for YAML serialization
    const yamlData: any = {
      name: pubspecData.name,
      description: pubspecData.description,
      publish_to: "'none'",
      version: pubspecData.version,
      environment: pubspecData.environment,
      dependencies: pubspecData.dependencies,
      dev_dependencies: pubspecData.dev_dependencies
    };

    if (pubspecData.flutter && Object.keys(pubspecData.flutter).length > 0) {
      yamlData.flutter = pubspecData.flutter;
    }

    return yaml.dump(yamlData, {
      indent: 2,
      lineWidth: 100,
      quotingType: '"',
      forceQuotes: false
    });
  }

  static addPackage(pubspecData: PubspecData, packageName: string, version?: string, isDev = false): PubspecData {
    const targetDependencies = isDev ? pubspecData.dev_dependencies : pubspecData.dependencies;
    
    // Use provided version or common version or latest
    const packageVersion = version || 
      this.COMMON_PACKAGES[packageName] || 
      (isDev ? this.COMMON_DEV_PACKAGES[packageName] : null) || 
      '^1.0.0';

    targetDependencies[packageName] = packageVersion;

    return { ...pubspecData };
  }

  static removePackage(pubspecData: PubspecData, packageName: string): PubspecData {
    const newData = { ...pubspecData };
    delete newData.dependencies[packageName];
    delete newData.dev_dependencies[packageName];
    return newData;
  }

  static addAsset(pubspecData: PubspecData, assetPath: string): PubspecData {
    if (!pubspecData.flutter) {
      pubspecData.flutter = {};
    }
    
    if (!pubspecData.flutter.assets) {
      pubspecData.flutter.assets = [];
    }

    if (!pubspecData.flutter.assets.includes(assetPath)) {
      pubspecData.flutter.assets.push(assetPath);
    }

    return { ...pubspecData };
  }

  static addFont(pubspecData: PubspecData, fontFamily: string, fontAssets: Array<{ asset: string; weight?: number; style?: string }>): PubspecData {
    if (!pubspecData.flutter) {
      pubspecData.flutter = {};
    }
    
    if (!pubspecData.flutter.fonts) {
      pubspecData.flutter.fonts = [];
    }

    // Check if font family already exists
    const existingFontIndex = pubspecData.flutter.fonts.findIndex(font => font.family === fontFamily);
    
    if (existingFontIndex >= 0) {
      // Update existing font family
      pubspecData.flutter.fonts[existingFontIndex].fonts = fontAssets;
    } else {
      // Add new font family
      pubspecData.flutter.fonts.push({
        family: fontFamily,
        fonts: fontAssets
      });
    }

    return { ...pubspecData };
  }

  static analyzePackageNeeds(dartCode: string): FlutterPackage[] {
    const packages: FlutterPackage[] = [];
    const imports = this.extractImports(dartCode);

    for (const importPath of imports) {
      if (importPath.startsWith('package:')) {
        // Extract package name from package:packageName/... format
        const packageParts = importPath.replace('package:', '').split('/');
        const packageName = packageParts[0];
        
        // Skip flutter SDK packages
        if (packageName === 'flutter' || packageName === 'flutter_test') {
          continue;
        }

        // Check if it's a common package
        if (this.COMMON_PACKAGES[packageName]) {
          packages.push({
            name: packageName,
            version: this.COMMON_PACKAGES[packageName],
            description: `Auto-detected from import: ${importPath}`
          });
        } else {
          // Add unknown packages with default version
          packages.push({
            name: packageName,
            version: '^1.0.0',
            description: `Auto-detected from import: ${importPath}`
          });
        }
      }
    }

    // Analyze code patterns for additional package needs
    if (dartCode.includes('http.') || dartCode.includes('HttpClient')) {
      packages.push({
        name: 'http',
        version: this.COMMON_PACKAGES['http'],
        description: 'HTTP client for API calls'
      });
    }

    if (dartCode.includes('Provider') || dartCode.includes('Consumer')) {
      packages.push({
        name: 'provider',
        version: this.COMMON_PACKAGES['provider'],
        description: 'State management with Provider'
      });
    }

    if (dartCode.includes('SharedPreferences')) {
      packages.push({
        name: 'shared_preferences',
        version: this.COMMON_PACKAGES['shared_preferences'],
        description: 'Persistent storage for simple data'
      });
    }

    if (dartCode.includes('ImagePicker')) {
      packages.push({
        name: 'image_picker',
        version: this.COMMON_PACKAGES['image_picker'],
        description: 'Pick images from gallery or camera'
      });
    }

    // Remove duplicates
    const uniquePackages = packages.filter((pkg, index, self) => 
      index === self.findIndex(p => p.name === pkg.name)
    );

    return uniquePackages;
  }

  private static extractImports(dartCode: string): string[] {
    const importRegex = /import\s+['"]([^'"]+)['"]/g;
    const imports: string[] = [];
    let match;

    while ((match = importRegex.exec(dartCode)) !== null) {
      imports.push(match[1]);
    }

    return imports;
  }

  static validatePubspec(pubspecData: PubspecData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate name
    if (!pubspecData.name) {
      errors.push('Package name is required');
    } else if (!/^[a-z][a-z0-9_]*$/.test(pubspecData.name)) {
      errors.push('Package name must start with a lowercase letter and contain only lowercase letters, numbers, and underscores');
    }

    // Validate version
    if (!pubspecData.version) {
      errors.push('Version is required');
    } else if (!/^\d+\.\d+\.\d+(\+\d+)?$/.test(pubspecData.version)) {
      errors.push('Version must follow semantic versioning format (e.g., 1.0.0+1)');
    }

    // Validate SDK constraint
    if (!pubspecData.environment?.sdk) {
      errors.push('Dart SDK constraint is required');
    }

    // Check for Flutter dependency
    if (!pubspecData.dependencies.flutter) {
      errors.push('Flutter dependency is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static generatePubspecFromPrompt(prompt: string, projectName: string): PubspecData {
    const pubspec = this.createDefaultPubspec(projectName);
    const lowerPrompt = prompt.toLowerCase();

    // Analyze prompt for package needs
    if (lowerPrompt.includes('http') || lowerPrompt.includes('api') || lowerPrompt.includes('request')) {
      this.addPackage(pubspec, 'http');
    }

    if (lowerPrompt.includes('state management') || lowerPrompt.includes('provider')) {
      this.addPackage(pubspec, 'provider');
    }

    if (lowerPrompt.includes('storage') || lowerPrompt.includes('preferences')) {
      this.addPackage(pubspec, 'shared_preferences');
    }

    if (lowerPrompt.includes('image') || lowerPrompt.includes('photo') || lowerPrompt.includes('camera')) {
      this.addPackage(pubspec, 'image_picker');
    }

    if (lowerPrompt.includes('location') || lowerPrompt.includes('gps')) {
      this.addPackage(pubspec, 'geolocator');
    }

    if (lowerPrompt.includes('web') || lowerPrompt.includes('url')) {
      this.addPackage(pubspec, 'url_launcher');
    }

    if (lowerPrompt.includes('font') || lowerPrompt.includes('google fonts')) {
      this.addPackage(pubspec, 'google_fonts');
    }

    if (lowerPrompt.includes('animation') || lowerPrompt.includes('lottie')) {
      this.addPackage(pubspec, 'lottie');
    }

    if (lowerPrompt.includes('svg')) {
      this.addPackage(pubspec, 'flutter_svg');
    }

    if (lowerPrompt.includes('cache') || lowerPrompt.includes('network image')) {
      this.addPackage(pubspec, 'cached_network_image');
    }

    return pubspec;
  }

  private static toSnakeCase(str: string): string {
    return str
      .replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
      .replace(/^_/, '')
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  static getSuggestedPackages(category?: string): FlutterPackage[] {
    const allPackages = Object.entries(this.COMMON_PACKAGES).map(([name, version]) => ({
      name,
      version,
      description: this.getPackageDescription(name)
    }));

    if (!category) {
      return allPackages;
    }

    // Filter by category
    switch (category.toLowerCase()) {
      case 'network':
        return allPackages.filter(pkg => ['http', 'dio', 'connectivity_plus'].includes(pkg.name));
      case 'state':
        return allPackages.filter(pkg => ['provider', 'riverpod', 'flutter_riverpod'].includes(pkg.name));
      case 'storage':
        return allPackages.filter(pkg => ['shared_preferences', 'path_provider', 'sqflite'].includes(pkg.name));
      case 'ui':
        return allPackages.filter(pkg => ['google_fonts', 'flutter_svg', 'animations', 'lottie', 'shimmer'].includes(pkg.name));
      case 'media':
        return allPackages.filter(pkg => ['image_picker', 'camera', 'cached_network_image'].includes(pkg.name));
      default:
        return allPackages;
    }
  }

  private static getPackageDescription(packageName: string): string {
    const descriptions: Record<string, string> = {
      'http': 'HTTP client for making API requests',
      'provider': 'State management library',
      'riverpod': 'Advanced state management',
      'flutter_riverpod': 'Flutter bindings for Riverpod',
      'shared_preferences': 'Persistent storage for simple data',
      'path_provider': 'Access to device file system paths',
      'sqflite': 'SQLite plugin for Flutter',
      'image_picker': 'Pick images from gallery or camera',
      'camera': 'Camera plugin for Flutter',
      'geolocator': 'Location services',
      'connectivity_plus': 'Network connectivity info',
      'url_launcher': 'Launch URLs in external applications',
      'webview_flutter': 'WebView widget',
      'firebase_core': 'Firebase core functionality',
      'firebase_auth': 'Firebase authentication',
      'cloud_firestore': 'Cloud Firestore database',
      'dio': 'HTTP client with interceptors',
      'json_annotation': 'JSON serialization annotations',
      'google_fonts': 'Google Fonts for Flutter',
      'cached_network_image': 'Cached network images',
      'flutter_svg': 'SVG rendering support',
      'animations': 'Pre-built animations',
      'lottie': 'Lottie animations',
      'shimmer': 'Shimmer effect widget'
    };

    return descriptions[packageName] || 'Flutter package';
  }
}