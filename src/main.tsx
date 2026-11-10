import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { ensurePromiseTry } from './lib/pdfjs-runtime';
import App from './App';
import './styles.css';

ensurePromiseTry();
registerSW({ immediate: true });
createRoot(document.getElementById('root')!).render(<App />);
