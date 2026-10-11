import { render } from 'preact';
import './styles/main.css';
import { installFonts } from './ui/fonts';
import { App } from './ui/App';
import { recordOfflineLaunch, registerServiceWorker } from './engine/pwa';

installFonts();
render(<App />, document.getElementById('app')!);

// Register the offline engine. On the very first visit it downloads and verifies every game file;
// afterwards it serves everything from the device and never refreshes content in the background.
void registerServiceWorker().then(() => recordOfflineLaunch());
