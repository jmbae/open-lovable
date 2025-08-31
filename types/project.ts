// Project type definitions for Open Lovable Flutter expansion

export enum ProjectType {
  REACT_WEB = 'REACT_WEB',
  FLUTTER_MOBILE = 'FLUTTER_MOBILE'
}

export interface ProjectConfig {
  type: ProjectType;
  name: string;
  description: string;
  framework: string;
  icon: string;
  color: string;
  features: string[];
}

export interface ProjectState {
  currentProjectType: ProjectType;
  isTransitioning: boolean;
  lastSelected?: ProjectType;
  sessionId?: string;
}

// Project configuration definitions
export const PROJECT_CONFIGS: Record<ProjectType, ProjectConfig> = {
  [ProjectType.REACT_WEB]: {
    type: ProjectType.REACT_WEB,
    name: 'React Web App',
    description: 'Build modern web applications with React, Next.js, and TypeScript',
    framework: 'React + Next.js',
    icon: '🌐',
    color: '#61DAFB',
    features: [
      'Server-side rendering',
      'TypeScript support',
      'Responsive design',
      'Real-time preview',
      'Component library'
    ]
  },
  [ProjectType.FLUTTER_MOBILE]: {
    type: ProjectType.FLUTTER_MOBILE,
    name: 'Flutter Mobile App',
    description: 'Create cross-platform mobile apps with Flutter and Dart',
    framework: 'Flutter + Dart',
    icon: '📱',
    color: '#02569B',
    features: [
      'Cross-platform development',
      'Material Design 3',
      'Hot reload',
      'Native performance',
      'Widget-based UI'
    ]
  }
};

export const DEFAULT_PROJECT_TYPE = ProjectType.REACT_WEB;

// Utility functions
export const getProjectConfig = (type: ProjectType): ProjectConfig => {
  return PROJECT_CONFIGS[type];
};

export const isValidProjectType = (type: string): type is ProjectType => {
  return Object.values(ProjectType).includes(type as ProjectType);
};

export const getProjectTypeFromString = (type: string): ProjectType => {
  return isValidProjectType(type) ? type : DEFAULT_PROJECT_TYPE;
};