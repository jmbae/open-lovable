import { readFileSync } from 'fs';
import { join } from 'path';
import { ProjectType } from '@/types/project';

export interface FlutterTemplateConfig {
  app_name?: string;
  app_title?: string;
  primary_color?: string;
  home_widget?: string;
  project_name?: string;
  project_description?: string;
  dependencies?: Array<{ name: string; version: string }>;
  dev_dependencies?: Array<{ name: string; version: string }>;
  has_assets?: boolean;
  assets?: Array<{ path: string }>;
  has_fonts?: boolean;
  fonts?: Array<{
    family: string;
    files: Array<{ path: string; weight?: number }>;
  }>;
}

export interface FlutterWidgetConfig {
  widget_name: string;
  constructor_params?: Array<{ type: string; name: string }>;
  state_variables?: Array<{
    type: string;
    name: string;
    default_value?: string;
  }>;
  lifecycle_methods?: Array<{
    method_name: string;
    method_body: string;
    is_super_call?: boolean;
  }>;
  custom_methods?: Array<{
    method_signature: string;
    method_body: string;
  }>;
  widget_body: string;
}

export interface FlutterScreenConfig {
  screen_name: string;
  screen_title?: string;
  has_app_bar?: boolean;
  has_drawer?: boolean;
  has_floating_action_button?: boolean;
  has_bottom_navigation?: boolean;
  has_actions?: boolean;
  actions?: Array<{ action_widget: string }>;
  drawer_items?: Array<{
    icon: string;
    title: string;
    on_tap: string;
  }>;
  body_content: string;
  fab_action?: string;
  fab_tooltip?: string;
  fab_icon?: string;
  bottom_nav_items?: Array<{
    icon: string;
    label: string;
  }>;
  current_index?: string;
  on_tap_handler?: string;
}

export class FlutterCodeGenerator {
  private templatesPath: string;

  constructor() {
    this.templatesPath = join(process.cwd(), 'lib', 'flutter-templates');
  }

  private loadTemplate(templateName: string): string {
    try {
      const templatePath = join(this.templatesPath, templateName);
      return readFileSync(templatePath, 'utf-8');
    } catch (error) {
      console.error(`Failed to load Flutter template: ${templateName}`, error);
      throw new Error(`Template not found: ${templateName}`);
    }
  }

  private replaceTemplateVariables(template: string, config: any): string {
    let result = template;

    // Replace simple variables like {{variable_name}}
    result = result.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      const value = config[key.trim()];
      return value !== undefined ? String(value) : match;
    });

    // Handle conditional blocks like {{#has_something}}...{{/has_something}}
    result = result.replace(/\{\{#([^}]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (match, key, content) => {
      const condition = config[key.trim()];
      return condition ? content : '';
    });

    // Handle loops like {{#items}}...{{/items}}
    result = result.replace(/\{\{#([^}]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (match, key, content) => {
      const items = config[key.trim()];
      if (Array.isArray(items)) {
        return items.map(item => {
          let itemContent = content;
          if (typeof item === 'object') {
            Object.keys(item).forEach(itemKey => {
              itemContent = itemContent.replace(
                new RegExp(`\\{\\{${itemKey}\\}\\}`, 'g'),
                String(item[itemKey])
              );
            });
          }
          return itemContent;
        }).join('');
      }
      return '';
    });

    return result;
  }

  generateMainDart(config: FlutterTemplateConfig): string {
    const template = this.loadTemplate('main.dart.template');
    
    const defaultConfig = {
      app_name: 'MyApp',
      app_title: 'Flutter App',
      primary_color: 'Colors.blue',
      home_widget: 'HomePage',
      ...config
    };

    return this.replaceTemplateVariables(template, defaultConfig);
  }

  generatePubspecYaml(config: FlutterTemplateConfig): string {
    const template = this.loadTemplate('pubspec.yaml.template');
    
    const defaultConfig = {
      project_name: 'flutter_app',
      project_description: 'A new Flutter project.',
      dependencies: [],
      dev_dependencies: [],
      has_assets: false,
      assets: [],
      has_fonts: false,
      fonts: [],
      ...config
    };

    return this.replaceTemplateVariables(template, defaultConfig);
  }

  generateStatefulWidget(config: FlutterWidgetConfig): string {
    const template = this.loadTemplate('stateful-widget.template');
    
    const defaultConfig = {
      constructor_params: [],
      state_variables: [],
      lifecycle_methods: [],
      custom_methods: [],
      widget_body: 'Container()',
      ...config
    };

    return this.replaceTemplateVariables(template, defaultConfig);
  }

  generateStatelessWidget(config: FlutterWidgetConfig): string {
    const template = this.loadTemplate('stateless-widget.template');
    
    const defaultConfig = {
      constructor_params: [],
      custom_methods: [],
      widget_body: 'Container()',
      ...config
    };

    return this.replaceTemplateVariables(template, defaultConfig);
  }

  generateScreen(config: FlutterScreenConfig): string {
    const template = this.loadTemplate('screen.template');
    
    const defaultConfig = {
      screen_title: config.screen_name,
      has_app_bar: true,
      has_drawer: false,
      has_floating_action_button: false,
      has_bottom_navigation: false,
      has_actions: false,
      body_content: 'Center(child: Text("Hello World"))',
      actions: [],
      drawer_items: [],
      bottom_nav_items: [],
      current_index: '0',
      on_tap_handler: '(index) {}',
      fab_action: '() {}',
      fab_tooltip: 'Action',
      fab_icon: 'Icons.add',
      ...config
    };

    return this.replaceTemplateVariables(template, defaultConfig);
  }

  // Utility method to generate a complete Flutter project structure
  generateFlutterProject(config: {
    projectName: string;
    projectDescription?: string;
    appTitle?: string;
    primaryColor?: string;
  }) {
    const appName = this.toPascalCase(config.projectName);
    const homeWidget = `${appName}HomePage`;

    const mainDart = this.generateMainDart({
      app_name: appName,
      app_title: config.appTitle || config.projectName,
      primary_color: config.primaryColor || 'Colors.blue',
      home_widget: homeWidget
    });

    const pubspecYaml = this.generatePubspecYaml({
      project_name: this.toSnakeCase(config.projectName),
      project_description: config.projectDescription || 'A new Flutter project generated by Open Lovable.'
    });

    const homePage = this.generateScreen({
      screen_name: homeWidget,
      screen_title: config.appTitle || config.projectName,
      body_content: `Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              'Welcome to ${config.appTitle || config.projectName}!',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            ),
            SizedBox(height: 16),
            Text(
              'Start building your amazing app',
              style: TextStyle(fontSize: 16),
            ),
          ],
        ),
      )`
    });

    return {
      'lib/main.dart': mainDart,
      'pubspec.yaml': pubspecYaml,
      [`lib/pages/${this.toSnakeCase(homeWidget)}.dart`]: homePage
    };
  }

  private toPascalCase(str: string): string {
    return str
      .replace(/[^a-zA-Z0-9]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .replace(/\s/g, '');
  }

  private toSnakeCase(str: string): string {
    return str
      .replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
      .replace(/^_/, '')
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  // Method to generate Flutter code based on AI prompts
  generateFlutterCodeFromPrompt(prompt: string, projectType: ProjectType): string {
    if (projectType !== ProjectType.FLUTTER_MOBILE) {
      throw new Error('Flutter code generation is only supported for Flutter mobile projects');
    }

    // Basic prompt analysis - this would be enhanced with more sophisticated NLP
    const lowerPrompt = prompt.toLowerCase();

    if (lowerPrompt.includes('screen') || lowerPrompt.includes('page')) {
      return this.generateScreenFromPrompt(prompt);
    } else if (lowerPrompt.includes('widget') || lowerPrompt.includes('component')) {
      return this.generateWidgetFromPrompt(prompt);
    } else if (lowerPrompt.includes('project') || lowerPrompt.includes('app')) {
      return this.generateProjectFromPrompt(prompt);
    }

    // Default: generate a simple widget
    return this.generateStatelessWidget({
      widget_name: 'GeneratedWidget',
      widget_body: `Container(
        child: Text('Generated from: ${prompt}'),
      )`
    });
  }

  private generateScreenFromPrompt(prompt: string): string {
    const screenName = this.extractScreenName(prompt) || 'GeneratedScreen';
    const hasAppBar = prompt.toLowerCase().includes('appbar') || prompt.toLowerCase().includes('app bar');
    const hasFloatingActionButton = prompt.toLowerCase().includes('floating action') || prompt.toLowerCase().includes('fab');
    const hasBottomNavigation = prompt.toLowerCase().includes('bottom navigation') || prompt.toLowerCase().includes('tab');

    return this.generateScreen({
      screen_name: screenName,
      has_app_bar: hasAppBar,
      has_floating_action_button: hasFloatingActionButton,
      has_bottom_navigation: hasBottomNavigation,
      body_content: `Center(
        child: Text('${screenName} Screen'),
      )`
    });
  }

  private generateWidgetFromPrompt(prompt: string): string {
    const widgetName = this.extractWidgetName(prompt) || 'GeneratedWidget';
    const isStateful = prompt.toLowerCase().includes('stateful') || 
                      prompt.toLowerCase().includes('state') ||
                      prompt.toLowerCase().includes('interactive');

    if (isStateful) {
      return this.generateStatefulWidget({
        widget_name: widgetName,
        widget_body: `Container(
          child: Text('${widgetName}'),
        )`
      });
    } else {
      return this.generateStatelessWidget({
        widget_name: widgetName,
        widget_body: `Container(
          child: Text('${widgetName}'),
        )`
      });
    }
  }

  private generateProjectFromPrompt(prompt: string): string {
    const projectName = this.extractProjectName(prompt) || 'GeneratedApp';
    const files = this.generateFlutterProject({
      projectName,
      appTitle: projectName
    });

    // Return the main.dart content as the primary generated code
    return files['lib/main.dart'];
  }

  private extractScreenName(prompt: string): string | null {
    const patterns = [
      /create\s+(?:a\s+)?(\w+)\s+screen/i,
      /build\s+(\w+)\s+screen/i,
      /make\s+(?:a\s+)?(\w+)\s+screen/i,
      /(\w+)\s+screen/i,
      /screen\s+(?:called\s+)?(\w+)/i
    ];

    for (const pattern of patterns) {
      const match = prompt.match(pattern);
      if (match) {
        const baseName = this.toPascalCase(match[1]);
        return baseName.endsWith('Screen') ? baseName : baseName + 'Screen';
      }
    }

    return null;
  }

  private extractWidgetName(prompt: string): string | null {
    const patterns = [
      /create\s+(?:a\s+)?([\w\s]+)\s+widget/i,
      /build\s+([\w\s]+)\s+widget/i,
      /make\s+(?:a\s+)?([\w\s]+)\s+widget/i,
      /([\w\s]+)\s+widget/i,
      /widget\s+(?:called\s+)?([\w\s]+)/i,
      /component\s+(?:called\s+)?([\w\s]+)/i
    ];

    for (const pattern of patterns) {
      const match = prompt.match(pattern);
      if (match) {
        const baseName = this.toPascalCase(match[1].trim());
        return baseName.endsWith('Widget') ? baseName : baseName + 'Widget';
      }
    }

    return null;
  }

  private extractProjectName(prompt: string): string | null {
    const patterns = [
      /create\s+(?:a\s+)?(\w+)\s+(?:app|project)/i,
      /build\s+(\w+)\s+app/i,
      /make\s+(?:a\s+)?(\w+)\s+(?:app|project)/i,
      /(?:app|project)\s+(?:called\s+)?(\w+)/i
    ];

    for (const pattern of patterns) {
      const match = prompt.match(pattern);
      if (match) {
        const baseName = this.toPascalCase(match[1]);
        // Check if the prompt mentions "project" specifically
        if (prompt.toLowerCase().includes('project')) {
          return baseName.endsWith('Project') ? baseName : baseName + 'Project';
        } else {
          return baseName.endsWith('App') ? baseName : baseName + 'App';
        }
      }
    }

    return null;
  }
}