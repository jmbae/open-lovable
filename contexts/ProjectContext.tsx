'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ProjectType, ProjectState, DEFAULT_PROJECT_TYPE } from '@/types/project';

// Local storage key
const PROJECT_STATE_KEY = 'open-lovable-project-state';

// Project Context interface
interface ProjectContextType {
  projectState: ProjectState;
  currentProjectType: ProjectType;
  setProjectType: (type: ProjectType) => void;
  isTransitioning: boolean;
  resetProject: () => void;
  getStoredProjectType: () => ProjectType;
}

// Create context with default values
const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

// Default project state
const defaultProjectState: ProjectState = {
  currentProjectType: DEFAULT_PROJECT_TYPE,
  isTransitioning: false,
  sessionId: undefined,
  lastSelected: undefined
};

// Project Context Provider Props
interface ProjectContextProviderProps {
  children: ReactNode;
  initialProjectType?: ProjectType;
}

// Project Context Provider Component
export const ProjectContextProvider: React.FC<ProjectContextProviderProps> = ({
  children,
  initialProjectType
}) => {
  const [projectState, setProjectState] = useState<ProjectState>(defaultProjectState);

  // Initialize project state on mount
  useEffect(() => {
    const initializeProjectState = () => {
      try {
        // Try to get stored project state
        const storedState = localStorage.getItem(PROJECT_STATE_KEY);
        let initialState = defaultProjectState;

        if (storedState) {
          const parsedState = JSON.parse(storedState);
          initialState = {
            ...defaultProjectState,
            ...parsedState,
            isTransitioning: false, // Always reset transitioning state
            sessionId: generateSessionId()
          };
        } else if (initialProjectType) {
          initialState = {
            ...defaultProjectState,
            currentProjectType: initialProjectType,
            sessionId: generateSessionId()
          };
        } else {
          initialState = {
            ...defaultProjectState,
            sessionId: generateSessionId()
          };
        }

        setProjectState(initialState);
      } catch (error) {
        console.error('Failed to initialize project state:', error);
        setProjectState({
          ...defaultProjectState,
          sessionId: generateSessionId()
        });
      }
    };

    initializeProjectState();
  }, [initialProjectType]);

  // Save project state to localStorage whenever it changes
  useEffect(() => {
    try {
      const stateToStore = {
        ...projectState,
        isTransitioning: false // Don't persist transitioning state
      };
      localStorage.setItem(PROJECT_STATE_KEY, JSON.stringify(stateToStore));
    } catch (error) {
      console.error('Failed to save project state:', error);
    }
  }, [projectState]);

  // Generate unique session ID
  const generateSessionId = (): string => {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Set project type with transition handling
  const setProjectType = (type: ProjectType) => {
    if (type === projectState.currentProjectType) {
      return; // No change needed
    }

    // Start transition
    setProjectState(prevState => ({
      ...prevState,
      isTransitioning: true,
      lastSelected: prevState.currentProjectType
    }));

    // Simulate transition delay for smooth UX
    setTimeout(() => {
      setProjectState(prevState => ({
        ...prevState,
        currentProjectType: type,
        isTransitioning: false,
        sessionId: generateSessionId() // New session for new project type
      }));
    }, 300);
  };

  // Reset project to default state
  const resetProject = () => {
    const newState = {
      ...defaultProjectState,
      sessionId: generateSessionId()
    };
    setProjectState(newState);
    
    // Clear localStorage
    try {
      localStorage.removeItem(PROJECT_STATE_KEY);
    } catch (error) {
      console.error('Failed to clear project state:', error);
    }
  };

  // Get stored project type without affecting current state
  const getStoredProjectType = (): ProjectType => {
    try {
      const storedState = localStorage.getItem(PROJECT_STATE_KEY);
      if (storedState) {
        const parsedState = JSON.parse(storedState);
        return parsedState.currentProjectType || DEFAULT_PROJECT_TYPE;
      }
    } catch (error) {
      console.error('Failed to get stored project type:', error);
    }
    return DEFAULT_PROJECT_TYPE;
  };

  // Context value
  const contextValue: ProjectContextType = {
    projectState,
    currentProjectType: projectState.currentProjectType,
    setProjectType,
    isTransitioning: projectState.isTransitioning,
    resetProject,
    getStoredProjectType
  };

  return (
    <ProjectContext.Provider value={contextValue}>
      {children}
    </ProjectContext.Provider>
  );
};

// Custom hook to use project context
export const useProject = (): ProjectContextType => {
  const context = useContext(ProjectContext);
  
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectContextProvider');
  }
  
  return context;
};

// Hook to get project type without requiring provider (for API routes)
export const useProjectType = (): ProjectType => {
  try {
    if (typeof window !== 'undefined') {
      const storedState = localStorage.getItem(PROJECT_STATE_KEY);
      if (storedState) {
        const parsedState = JSON.parse(storedState);
        return parsedState.currentProjectType || DEFAULT_PROJECT_TYPE;
      }
    }
  } catch (error) {
    console.error('Failed to get project type:', error);
  }
  return DEFAULT_PROJECT_TYPE;
};

// Utility function to check if project type has changed
export const hasProjectTypeChanged = (newType: ProjectType, oldType: ProjectType): boolean => {
  return newType !== oldType;
};

// Export context for advanced usage
export { ProjectContext };