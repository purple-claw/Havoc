// The very beginning - where React meets the DOM
// This is the genesis of our visualization

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Find the root element or die trying
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Failed to find root element. Did you forget to add it to index.html?');
}

// Create React root and render our app
const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
