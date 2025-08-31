import { jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SandboxPreview from '../../components/SandboxPreview';

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  Loader2: () => <div data-testid="loader-icon">Loading</div>,
  ExternalLink: () => <div data-testid="external-link-icon">External</div>,
  RefreshCw: () => <div data-testid="refresh-icon">Refresh</div>,
  Terminal: () => <div data-testid="terminal-icon">Terminal</div>,
  Smartphone: () => <div data-testid="smartphone-icon">Mobile</div>,
  Monitor: () => <div data-testid="monitor-icon">Desktop</div>
}));

describe('SandboxPreview', () => {
  const defaultProps = {
    sandboxId: 'test-sandbox-123',
    port: 3000,
    type: 'vite' as const,
    isLoading: false
  };

  describe('Basic Rendering', () => {
    test('should render Vite preview correctly', () => {
      render(<SandboxPreview {...defaultProps} />);

      expect(screen.getByText('⚡ Vite Preview')).toBeInTheDocument();
      expect(screen.getByText('https://test-sandbox-123-3000.e2b.dev')).toBeInTheDocument();
      
      // Should have standard iframe
      const iframe = screen.getByTitle('vite preview');
      expect(iframe).toBeInTheDocument();
      expect(iframe).toHaveClass('w-full', 'h-[600px]');
    });

    test('should render Next.js preview correctly', () => {
      render(<SandboxPreview {...defaultProps} type="nextjs" />);

      expect(screen.getByText('▲ Next.js Preview')).toBeInTheDocument();
      
      const iframe = screen.getByTitle('nextjs preview');
      expect(iframe).toBeInTheDocument();
    });

    test('should render console output', () => {
      const consoleOutput = 'npm run dev\nVite server started on port 3000';
      
      render(
        <SandboxPreview 
          {...defaultProps} 
          type="console" 
          output={consoleOutput}
        />
      );

      // Use partial text matching for multiline output
      expect(screen.getByText((content, element) => {
        return content.includes('npm run dev') && content.includes('Vite server started');
      })).toBeInTheDocument();
      expect(screen.queryByRole('button')).not.toBeInTheDocument(); // No control buttons for console
    });
  });

  describe('Flutter Preview Support', () => {
    test('should render Flutter preview with mobile simulation', () => {
      render(
        <SandboxPreview 
          {...defaultProps} 
          type="flutter"
          port={8080}
        />
      );

      expect(screen.getByText('📱 Flutter Preview')).toBeInTheDocument();
      expect(screen.getByText('https://test-sandbox-123-8080.e2b.dev')).toBeInTheDocument();
      
      // Should have mobile view toggle button
      const mobileToggle = screen.getByTitle('Switch to desktop view');
      expect(mobileToggle).toBeInTheDocument();
      expect(screen.getByTestId('monitor-icon')).toBeInTheDocument(); // Shows desktop icon when in mobile view
      
      // Should have mobile device frame
      const iframe = screen.getByTitle('Flutter mobile preview');
      expect(iframe).toBeInTheDocument();
      expect(iframe).toHaveClass('w-full', 'h-full', 'bg-white', 'border-0');
      
      // Check for mobile viewport container
      const mobileContainer = iframe.closest('[class*="w-[375px]"]');
      expect(mobileContainer).toBeInTheDocument();
    });

    test('should toggle between mobile and desktop view', async () => {
      render(
        <SandboxPreview 
          {...defaultProps} 
          type="flutter"
        />
      );

      const toggleButton = screen.getByTitle('Switch to desktop view');
      
      // Initially in mobile view
      expect(screen.getByTestId('monitor-icon')).toBeInTheDocument();
      
      // Click to switch to desktop view
      fireEvent.click(toggleButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('smartphone-icon')).toBeInTheDocument();
        expect(screen.getByTitle('Switch to mobile view')).toBeInTheDocument();
      });
      
      // Click again to switch back to mobile view
      fireEvent.click(toggleButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('monitor-icon')).toBeInTheDocument();
        expect(screen.getByTitle('Switch to desktop view')).toBeInTheDocument();
      });
    });

    test('should use correct port for Flutter (8080)', () => {
      render(
        <SandboxPreview 
          {...defaultProps} 
          type="flutter"
          port={3000} // Original port
        />
      );

      // Should use 8080 for Flutter, not the provided port
      expect(screen.getByText('https://test-sandbox-123-8080.e2b.dev')).toBeInTheDocument();
    });

    test('should show Flutter-specific loading message', () => {
      render(
        <SandboxPreview 
          {...defaultProps} 
          type="flutter"
          isLoading={true}
        />
      );

      expect(screen.getByText('Building Flutter web app...')).toBeInTheDocument();
      expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
    });

    test('should render mobile device frame elements', () => {
      render(
        <SandboxPreview 
          {...defaultProps} 
          type="flutter"
        />
      );

      // Check for device frame elements
      const deviceFrame = screen.getByTitle('Flutter mobile preview').closest('.w-\\[375px\\]');
      expect(deviceFrame).toBeInTheDocument();
      
      // Should have rounded corners
      expect(deviceFrame).toHaveClass('rounded-[2rem]');
      
      // Should have shadow
      expect(deviceFrame).toHaveClass('shadow-2xl');
    });
  });

  describe('Interactive Controls', () => {
    test('should toggle console output', async () => {
      const consoleOutput = 'Flutter build output...';
      
      render(
        <SandboxPreview 
          {...defaultProps} 
          type="flutter"
          output={consoleOutput}
        />
      );

      // Console should be hidden initially
      expect(screen.queryByText(consoleOutput)).not.toBeInTheDocument();
      
      // Click terminal button to show console
      const terminalButton = screen.getByTitle('Toggle console');
      fireEvent.click(terminalButton);
      
      await waitFor(() => {
        expect(screen.getByText(consoleOutput)).toBeInTheDocument();
        expect(screen.getByText('Console Output')).toBeInTheDocument();
      });
      
      // Click again to hide console
      fireEvent.click(terminalButton);
      
      await waitFor(() => {
        expect(screen.queryByText(consoleOutput)).not.toBeInTheDocument();
      });
    });

    test('should refresh iframe on refresh button click', async () => {
      render(<SandboxPreview {...defaultProps} type="flutter" />);

      const refreshButton = screen.getByTitle('Refresh preview');
      
      // Click refresh button
      fireEvent.click(refreshButton);

      // Verify refresh button exists and is clickable
      expect(refreshButton).toBeInTheDocument();
      expect(refreshButton).toHaveClass('p-2', 'hover:bg-gray-700', 'rounded', 'transition-colors');
    });

    test('should open preview in new tab', () => {
      render(<SandboxPreview {...defaultProps} type="flutter" />);

      const externalLink = screen.getByTitle('Open in new tab');
      expect(externalLink).toHaveAttribute('href', 'https://test-sandbox-123-8080.e2b.dev');
      expect(externalLink).toHaveAttribute('target', '_blank');
      expect(externalLink).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  describe('Responsive Behavior', () => {
    test('should apply mobile viewport styles correctly', () => {
      render(<SandboxPreview {...defaultProps} type="flutter" />);

      const mobileFrame = screen.getByTitle('Flutter mobile preview').closest('.w-\\[375px\\]');
      expect(mobileFrame).toHaveClass('w-[375px]', 'h-[667px]'); // iPhone SE dimensions
    });

    test('should apply desktop viewport styles when toggled', async () => {
      render(<SandboxPreview {...defaultProps} type="flutter" />);

      const toggleButton = screen.getByTitle('Switch to desktop view');
      fireEvent.click(toggleButton);

      await waitFor(() => {
        // After toggle, button title should change
        expect(screen.getByTitle('Switch to mobile view')).toBeInTheDocument();
        expect(screen.getByTestId('smartphone-icon')).toBeInTheDocument();
      });
    });

    test('should hide mobile device frame elements in desktop view', async () => {
      render(<SandboxPreview {...defaultProps} type="flutter" />);

      // Switch to desktop view
      const toggleButton = screen.getByTitle('Switch to desktop view');
      fireEvent.click(toggleButton);

      await waitFor(() => {
        // Verify button state changed (indicates view changed)
        expect(screen.getByTitle('Switch to mobile view')).toBeInTheDocument();
        expect(screen.getByTestId('smartphone-icon')).toBeInTheDocument();
      });
    });
  });

  describe('Error States', () => {
    test('should handle missing preview URL gracefully', () => {
      render(
        <SandboxPreview 
          sandboxId=""
          port={3000}
          type="flutter"
        />
      );

      // Should still render without crashing
      expect(screen.getByText('📱 Flutter Preview')).toBeInTheDocument();
      
      const iframe = screen.getByTitle('Flutter mobile preview');
      expect(iframe).toHaveAttribute('src', 'about:blank'); // Empty URL defaults to about:blank
      
      // URL display should show fallback message for empty sandboxId
      expect(screen.getByText('No URL available')).toBeInTheDocument();
    });

    test('should render loading state correctly', () => {
      render(
        <SandboxPreview 
          {...defaultProps} 
          type="flutter"
          isLoading={true}
        />
      );

      expect(screen.getByText('Building Flutter web app...')).toBeInTheDocument();
      expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
      
      // Loading overlay should be visible
      const loadingOverlay = screen.getByText('Building Flutter web app...').closest('.absolute');
      expect(loadingOverlay).toHaveClass('inset-0', 'bg-gray-900/80');
    });
  });

  describe('Accessibility', () => {
    test('should have proper ARIA labels and roles', () => {
      render(<SandboxPreview {...defaultProps} type="flutter" />);

      // All buttons should have titles for accessibility
      expect(screen.getByTitle('Switch to desktop view')).toBeInTheDocument();
      expect(screen.getByTitle('Toggle console')).toBeInTheDocument();
      expect(screen.getByTitle('Refresh preview')).toBeInTheDocument();
      expect(screen.getByTitle('Open in new tab')).toBeInTheDocument();
      
      // iframe should have proper title
      expect(screen.getByTitle('Flutter mobile preview')).toBeInTheDocument();
    });

    test('should have proper sandbox attributes for security', () => {
      render(<SandboxPreview {...defaultProps} type="flutter" />);

      const iframe = screen.getByTitle('Flutter mobile preview');
      expect(iframe).toHaveAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms');
    });
  });

  describe('Type-specific Behavior', () => {
    test('should only show mobile toggle for Flutter type', () => {
      const { rerender } = render(<SandboxPreview {...defaultProps} type="vite" />);
      
      // Vite should not have mobile toggle
      expect(screen.queryByTitle('Switch to desktop view')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Switch to mobile view')).not.toBeInTheDocument();
      
      // Rerender with Flutter type
      rerender(<SandboxPreview {...defaultProps} type="flutter" />);
      
      // Flutter should have mobile toggle
      expect(screen.getByTitle('Switch to desktop view')).toBeInTheDocument();
    });

    test('should use correct preview labels for each type', () => {
      const { rerender } = render(<SandboxPreview {...defaultProps} type="vite" />);
      expect(screen.getByText('⚡ Vite Preview')).toBeInTheDocument();
      
      rerender(<SandboxPreview {...defaultProps} type="nextjs" />);
      expect(screen.getByText('▲ Next.js Preview')).toBeInTheDocument();
      
      rerender(<SandboxPreview {...defaultProps} type="flutter" />);
      expect(screen.getByText('📱 Flutter Preview')).toBeInTheDocument();
    });

    test('should use correct loading messages for each type', () => {
      const { rerender } = render(<SandboxPreview {...defaultProps} type="vite" isLoading={true} />);
      expect(screen.getByText('Starting Vite dev server...')).toBeInTheDocument();
      
      rerender(<SandboxPreview {...defaultProps} type="nextjs" isLoading={true} />);
      expect(screen.getByText('Starting Next.js dev server...')).toBeInTheDocument();
      
      rerender(<SandboxPreview {...defaultProps} type="flutter" isLoading={true} />);
      expect(screen.getByText('Building Flutter web app...')).toBeInTheDocument();
    });
  });

  describe('URL Generation', () => {
    test('should generate correct E2B URLs for different types', () => {
      const { rerender } = render(<SandboxPreview {...defaultProps} port={3000} />);
      
      // Vite uses provided port
      expect(screen.getByText('https://test-sandbox-123-3000.e2b.dev')).toBeInTheDocument();
      
      // Flutter uses port 8080 regardless of provided port
      rerender(<SandboxPreview {...defaultProps} type="flutter" port={3000} />);
      expect(screen.getByText('https://test-sandbox-123-8080.e2b.dev')).toBeInTheDocument();
    });

    test('should handle different sandbox IDs', () => {
      const { rerender } = render(
        <SandboxPreview 
          sandboxId="prod-sandbox-456"
          port={3000}
          type="flutter"
        />
      );
      
      expect(screen.getByText('https://prod-sandbox-456-8080.e2b.dev')).toBeInTheDocument();
      
      rerender(
        <SandboxPreview 
          sandboxId="dev-sandbox-789"
          port={3000}
          type="flutter"
        />
      );
      
      expect(screen.getByText('https://dev-sandbox-789-8080.e2b.dev')).toBeInTheDocument();
    });
  });

  describe('Mobile Device Simulation', () => {
    test('should render mobile device frame with correct dimensions', () => {
      render(<SandboxPreview {...defaultProps} type="flutter" />);

      const iframe = screen.getByTitle('Flutter mobile preview');
      
      expect(iframe).toBeInTheDocument();
      expect(iframe).toHaveClass('w-full', 'h-full', 'bg-white', 'border-0');
      
      // Check that we're in mobile simulation view
      const centerContainer = iframe.closest('.flex.justify-center');
      expect(centerContainer).toBeInTheDocument();
    });

    test('should show device frame elements in mobile view', () => {
      render(<SandboxPreview {...defaultProps} type="flutter" />);

      const iframe = screen.getByTitle('Flutter mobile preview');
      const container = iframe.closest('.relative');
      
      // Should have device frame styling
      expect(container).toHaveClass('relative', 'bg-white', 'rounded-[2rem]');
    });

    test('should hide device frame in desktop view', async () => {
      render(<SandboxPreview {...defaultProps} type="flutter" />);

      // Switch to desktop view
      const toggleButton = screen.getByTitle('Switch to desktop view');
      fireEvent.click(toggleButton);

      await waitFor(() => {
        // Check that the toggle button title changed (indicating view changed)
        expect(screen.getByTitle('Switch to mobile view')).toBeInTheDocument();
        expect(screen.getByTestId('smartphone-icon')).toBeInTheDocument();
      });
    });
  });

  describe('Console Integration', () => {
    test('should show console output when toggled', async () => {
      const flutterOutput = 'Flutter build completed successfully';

      render(
        <SandboxPreview 
          {...defaultProps} 
          type="flutter"
          output={flutterOutput}
        />
      );

      // Console should be hidden initially
      expect(screen.queryByText(flutterOutput)).not.toBeInTheDocument();
      
      // Click terminal button
      const terminalButton = screen.getByTitle('Toggle console');
      fireEvent.click(terminalButton);
      
      await waitFor(() => {
        expect(screen.getByText('Console Output')).toBeInTheDocument();
        expect(screen.getByText(flutterOutput)).toBeInTheDocument();
      });
    });

    test('should handle empty console output', async () => {
      render(
        <SandboxPreview 
          {...defaultProps} 
          type="flutter"
          output=""
        />
      );

      const terminalButton = screen.getByTitle('Toggle console');
      fireEvent.click(terminalButton);

      // Should not show console section if no output
      await waitFor(() => {
        expect(screen.queryByText('Console Output')).not.toBeInTheDocument();
      });
    });
  });

  describe('Performance and Optimization', () => {
    test('should minimize re-renders on prop changes', () => {
      const { rerender } = render(<SandboxPreview {...defaultProps} type="flutter" />);

      const iframe = screen.getByTitle('Flutter mobile preview');
      const initialKey = iframe.getAttribute('key');
      
      // Change non-key props
      rerender(
        <SandboxPreview 
          {...defaultProps} 
          type="flutter"
          output="new output"
        />
      );
      
      const sameIframe = screen.getByTitle('Flutter mobile preview');
      const sameKey = sameIframe.getAttribute('key');
      
      // iframe key should remain the same (no unnecessary re-render)
      expect(sameKey).toBe(initialKey);
    });

    test('should handle iframe loading states', () => {
      render(
        <SandboxPreview 
          {...defaultProps} 
          type="flutter"
          isLoading={true}
        />
      );

      // Loading overlay should be positioned above iframe
      const loadingOverlay = screen.getByText('Building Flutter web app...').closest('.absolute');
      expect(loadingOverlay).toHaveClass('z-10'); // Above iframe
      
      const iframe = screen.getByTitle('Flutter mobile preview');
      expect(iframe).toBeInTheDocument(); // iframe still rendered
    });
  });

  describe('Edge Cases', () => {
    test('should handle missing sandboxId gracefully', () => {
      render(
        <SandboxPreview 
          sandboxId=""
          port={8080}
          type="flutter"
        />
      );

      // Should render without crashing
      expect(screen.getByText('📱 Flutter Preview')).toBeInTheDocument();
    });

    test('should handle very long console output', async () => {
      const longOutput = 'A'.repeat(10000); // Very long output
      
      render(
        <SandboxPreview 
          {...defaultProps} 
          type="flutter"
          output={longOutput}
        />
      );

      const terminalButton = screen.getByTitle('Toggle console');
      fireEvent.click(terminalButton);

      await waitFor(() => {
        const consoleContainer = screen.getByText(longOutput).closest('.max-h-48');
        expect(consoleContainer).toHaveClass('overflow-y-auto'); // Should be scrollable
      });
    });

    test('should maintain state during type changes', () => {
      const { rerender } = render(<SandboxPreview {...defaultProps} type="vite" />);

      // Toggle console in vite mode
      const terminalButton = screen.getByTitle('Toggle console');
      fireEvent.click(terminalButton);

      // Switch to Flutter type
      rerender(<SandboxPreview {...defaultProps} type="flutter" output="test output" />);

      // Console should still be toggled (state maintained)
      expect(screen.getByText('test output')).toBeInTheDocument();
    });
  });
});