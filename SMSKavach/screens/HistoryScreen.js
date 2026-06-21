import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
} from 'react-native';
import { COLORS } from '../src/constants';

function labelDisplay(label = '') {
  return label.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatTime(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) +
    ' · ' +
    d.toLocaleDateString([], { day: '2-digit', month: 'short' });
}

function HistoryItem({ item, index }) {
  const safeLabels = ['ham', 'safe', 'normal', 'legitimate'];
  const isFraud = !safeLabels.includes((item.prediction || '').toLowerCase());
  const accentColor = isFraud ? COLORS.fraud : COLORS.safe;
  const icon = isFraud ? '🚨' : '✅';

  return (
    <View style={[styles.item, { borderLeftColor: accentColor }]}>
      <View style={styles.itemTop}>
        <Text style={styles.itemIcon}>{icon}</Text>
        <Text style={[styles.itemLabel, { color: accentColor }]}>
          {labelDisplay(item.prediction)}
        </Text>
        <Text style={styles.itemTime}>{formatTime(item.timestamp)}</Text>
      </View>
      <Text style={styles.itemMsg} numberOfLines={2}>
        {item.message}
      </Text>
    </View>
  );
}

export default function HistoryScreen({ history }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerIcon}>📋</Text>
        <View>
          <Text style={styles.title}>Scan History</Text>
          <Text style={styles.subtitle}>Last {history.length} scanned messages</Text>
        </View>
      </View>

      {history.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyText}>No scans yet</Text>
          <Text style={styles.emptySubtext}>
            Go to Home and scan an SMS to see results here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item, index }) => <HistoryItem item={item} index={index} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingTop: 56,
    paddingHorizontal: 16,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerIcon: { fontSize: 36, marginRight: 12 },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.subtext,
    marginTop: 2,
  },

  // List
  list: { paddingBottom: 40 },

  // Item
  item: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderLeftWidth: 4,
    padding: 14,
    marginBottom: 12,
  },
  itemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  itemIcon: { fontSize: 16, marginRight: 8 },
  itemLabel: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  itemTime: {
    fontSize: 11,
    color: COLORS.subtext,
  },
  itemMsg: {
    fontSize: 13,
    color: COLORS.subtext,
    lineHeight: 18,
  },

  // Empty state
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 80,
  },
  emptyIcon: { fontSize: 56, marginBottom: 12 },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.subtext,
    marginBottom: 6,
  },
  emptySubtext: {
    fontSize: 13,
    color: COLORS.subtext,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
