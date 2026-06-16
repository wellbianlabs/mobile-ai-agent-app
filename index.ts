import { registerRootComponent } from 'expo';

import App from './src/App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App)
// 그리고 Expo Go / 네이티브 빌드 양쪽에서 올바르게 루트를 마운트합니다.
registerRootComponent(App);
