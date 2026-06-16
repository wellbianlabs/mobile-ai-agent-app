// Expo 기본 Metro 설정 확장 (expo-doctor 권장 베이스라인).
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

module.exports = config;
