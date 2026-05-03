// Setup for Jest tests
// Note: Jest matchers are built into @testing-library/react-native v12.4+

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
  Link: 'Link',
}));

// Mock Expo modules
jest.mock('expo-sqlite', () => ({
  openDatabaseSync: jest.fn(() => ({
    execSync: jest.fn(),
    getFirstSync: jest.fn(),
    getAllSync: jest.fn(),
    runSync: jest.fn(),
    prepareSync: jest.fn(),
  })),
}));

// Use manual mock for DateInput component (has __mocks__/DateInput.tsx)
jest.mock('./src/components/DateInput');

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');

  const createMockIcon = (name) => {
    return ({ name: iconName, size, color, ...props }) =>
      React.createElement(Text, { ...props, testID: `icon-${name}-${iconName}` }, iconName);
  };

  return {
    Ionicons: createMockIcon('Ionicons'),
    MaterialIcons: createMockIcon('MaterialIcons'),
    FontAwesome: createMockIcon('FontAwesome'),
    AntDesign: createMockIcon('AntDesign'),
    Feather: createMockIcon('Feather'),
  };
});

// Mock @cashmgr/ui theme
jest.mock('@cashmgr/ui', () => ({
  useTheme: () => ({
    colors: {
      primary: '#007AFF',
      secondary: '#5856D6',
      success: '#34C759',
      danger: '#FF3B30',
      warning: '#FF9500',
      info: '#5AC8FA',
      textPrimary: '#000000',
      textSecondary: '#666666',
      surface: '#FFFFFF',
      background: '#F2F2F7',
      border: '#C6C6C8',
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
    },
  }),
  Theme: {},
}));

// Mock react-native-svg (can't be transformed in jsdom with pnpm)
jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View, Text } = require('react-native');

  const createSvgComponent = (name) => {
    return React.forwardRef((props, ref) =>
      React.createElement(View, { ...props, ref, testID: `svg-${name}` }, props.children)
    );
  };

  return {
    __esModule: true,
    default: createSvgComponent('Svg'),
    Svg: createSvgComponent('Svg'),
    Path: createSvgComponent('Path'),
    G: createSvgComponent('G'),
    Circle: createSvgComponent('Circle'),
    Rect: createSvgComponent('Rect'),
    Line: createSvgComponent('Line'),
    Text: createSvgComponent('SvgText'),
    Defs: createSvgComponent('Defs'),
    LinearGradient: createSvgComponent('LinearGradient'),
    Stop: createSvgComponent('Stop'),
  };
});

// Mock Modal to avoid React 19 act() AggregateError with react-native-web portals
jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  const React = require('react');

  return {
    ...actual,
    Modal: ({ children, visible, testID, ...rest }) => {
      if (!visible) return null;
      return React.createElement(actual.View, { testID: testID || 'modal' }, children);
    },
  };
});

// Mock console methods to reduce noise in test output
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
};
