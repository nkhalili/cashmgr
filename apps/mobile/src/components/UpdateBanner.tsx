import { Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@cashmgr/ui';

interface Props {
  version: string;
  storeUrl: string;
  onDismiss: () => void;
}

export function UpdateBanner({ version, storeUrl, onDismiss }: Props) {
  const theme = useTheme();
  const storeName = Platform.OS === 'ios' ? 'App Store' : 'Play Store';

  return (
    <View
      style={[
        styles.container,
        {
          margin: theme.spacing.md,
          borderRadius: theme.radii.lg,
          padding: theme.spacing.md,
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { fontFamily: theme.fontFamily }]}>
          Update Available
        </Text>
        <TouchableOpacity onPress={onDismiss} hitSlop={8}>
          <Text style={styles.closeIcon}>✕</Text>
        </TouchableOpacity>
      </View>
      <Text style={[styles.body, { fontFamily: theme.fontFamily, marginTop: theme.spacing.xs }]}>
        Version {version} is available in the {storeName}.
      </Text>
      <TouchableOpacity
        onPress={() => Linking.openURL(storeUrl)}
        style={[styles.button, { marginTop: theme.spacing.sm, borderRadius: theme.components.interactiveRadius }]}
      >
        <Text style={styles.buttonText}>Update Now</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    backgroundColor: '#fefce8',
    borderWidth: 1,
    borderColor: '#fde68a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 999,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontWeight: '600',
    fontSize: 15,
    color: '#92400e',
  },
  closeIcon: {
    color: '#b45309',
    fontSize: 16,
  },
  body: {
    fontSize: 13,
    color: '#b45309',
  },
  button: {
    backgroundColor: '#2563eb',
    paddingVertical: 6,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
});
