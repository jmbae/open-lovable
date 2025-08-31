'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ProjectType, ProjectConfig, getProjectConfig } from '@/types/project';
import { Button } from '@/components/ui/button';

interface ProjectTypeSelectorProps {
  selectedType: ProjectType;
  onTypeChange: (type: ProjectType) => void;
  className?: string;
}

interface ProjectCardProps {
  config: ProjectConfig;
  isSelected: boolean;
  onClick: () => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ config, isSelected, onClick }) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={`
        relative p-6 rounded-xl border-2 cursor-pointer transition-all duration-200
        ${isSelected 
          ? 'border-blue-500 bg-blue-50 shadow-lg' 
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
        }
      `}
      onClick={onClick}
    >
      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      )}
      
      {/* Project icon and title */}
      <div className="flex items-center space-x-4 mb-4">
        <div 
          className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
          style={{ backgroundColor: `${config.color}20`, color: config.color }}
        >
          {config.icon}
        </div>
        <div>
          <h3 className="text-xl font-semibold text-gray-900">{config.name}</h3>
          <p className="text-sm text-gray-600">{config.framework}</p>
        </div>
      </div>
      
      {/* Description */}
      <p className="text-gray-600 mb-4 leading-relaxed">
        {config.description}
      </p>
      
      {/* Features */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-900">Key Features:</h4>
        <div className="flex flex-wrap gap-2">
          {config.features.slice(0, 3).map((feature, index) => (
            <span 
              key={index}
              className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-md"
            >
              {feature}
            </span>
          ))}
          {config.features.length > 3 && (
            <span className="px-2 py-1 text-xs text-gray-500">
              +{config.features.length - 3} more
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const ProjectTypeSelector: React.FC<ProjectTypeSelectorProps> = ({
  selectedType,
  onTypeChange,
  className = ""
}) => {
  const projectTypes = Object.values(ProjectType);
  
  return (
    <div className={`w-full max-w-4xl mx-auto ${className}`}>
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-3">
          Choose Your Development Platform
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Select the type of application you want to build. You can switch between platforms at any time during development.
        </p>
      </div>
      
      {/* Project Type Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {projectTypes.map((type) => {
          const config = getProjectConfig(type);
          return (
            <ProjectCard
              key={type}
              config={config}
              isSelected={selectedType === type}
              onClick={() => onTypeChange(type)}
            />
          );
        })}
      </div>
      
      {/* Action Buttons */}
      <div className="flex justify-center space-x-4">
        <Button 
          size="lg"
          variant="outline"
          className="px-8"
        >
          Learn More
        </Button>
        <Button 
          size="lg"
          className="px-8 bg-blue-600 hover:bg-blue-700"
        >
          Continue with {getProjectConfig(selectedType).name}
        </Button>
      </div>
      
      {/* Project Type Comparison */}
      <div className="mt-12 p-6 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
          Platform Comparison
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-2 flex items-center">
              🌐 React Web Apps
            </h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Perfect for web-based applications</li>
              <li>• Instant deployment and updates</li>
              <li>• SEO optimization with Next.js</li>
              <li>• Cross-browser compatibility</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2 flex items-center">
              📱 Flutter Mobile Apps
            </h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Native iOS and Android apps</li>
              <li>• Offline-first capabilities</li>
              <li>• Device hardware access</li>
              <li>• App store distribution</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectTypeSelector;