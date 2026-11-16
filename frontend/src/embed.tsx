import React from 'react';
import ReactDOM from 'react-dom/client';
import { CircleMessengerWidget } from './components/widget';
import { WidgetProps } from './components/widget/types';
import './index.css';

declare global {
  interface Window {
    CircleAIWidget?: {
      init: (options?: Partial<WidgetProps> & { targetId?: string }) => void;
      open: () => void;
      close: () => void;
    };
  }
}

export function initWidget(options: Partial<WidgetProps> & { targetId?: string } = {}) {
  const containerId = options.targetId || 'circle-ai-messenger-root';
  let container = document.getElementById(containerId);

  if (!container) {
    container = document.createElement('div');
    container.id = containerId;
    document.body.appendChild(container);
  }

  const root = ReactDOM.createRoot(container);
  root.render(
    <React.StrictMode>
      <CircleMessengerWidget
        embedded={options.embedded ?? false}
        primaryColor={options.primaryColor || '#FDBC1F'}
        secondaryColor={options.secondaryColor || '#3F3F3F'}
        logoUrl={options.logoUrl || '/circle_network_logo.webp'}
        initialLanguage={options.initialLanguage || 'en'}
        subscriberId={options.subscriberId || 'CN-88214'}
        defaultOpen={options.defaultOpen ?? false}
      />
    </React.StrictMode>
  );
}

// Attach to window for external script tags
if (typeof window !== 'undefined') {
  window.CircleAIWidget = {
    init: initWidget,
    open: () => {},
    close: () => {},
  };
}
