// ════════════════════════════════════════════════════════════
// SMSKavach — Single-file Expo App (Mobile + Web)
// AI-powered SMS fraud detection prototype
// ════════════════════════════════════════════════════════════

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
  ScrollView,
  Pressable,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';

const API_BASE = Platform.OS === 'web'
  ? 'http://localhost:5000'
  : 'http://10.202.140.171:5000';

// ── Theme ────────────────────────────────────────────────────

const C = {
  bg:          '#0f0f0f',
  card:        '#1c1c1e',
  cardBorder:  '#2a2a2a',
  fraud:       '#ef4444',
  fraudBg:     'rgba(239,68,68,0.12)',
  safe:        '#22c55e',
  warn:        '#f59e0b',
  warnBg:      'rgba(245,158,11,0.12)',
  accent:      '#6366f1',
  text:        '#f5f5f5',
  muted:       '#888888',
  inputBg:     '#111111',
  inputBorder: '#333333',
};

const IS_WEB = Platform.OS === 'web';
const TOP_PAD = Platform.select({ ios: 54, android: 40, web: 16 });
const MAX_WIDTH = 520; // center-constrained width for web

// ── Dummy SMS data ───────────────────────────────────────────

function makeDummyMessages() {
  return [
    {
      id: 'd1',
      sender: 'Zomato',
      body: 'Your order #4821 has been delivered! Rate your experience and earn Zomato credits.',
      time: '12:32 PM',
      status: 'safe',
    },
    {
      id: 'd2',
      sender: 'Jio',
      body: 'Recharge of Rs 299 successful. Validity 28 days. Data: 2GB/day. Thank you for using Jio.',
      time: '11:15 AM',
      status: 'safe',
    },
    {
      id: 'd3',
      sender: 'HDFC Bank',
      body: 'Your credit card statement for Mar 2026 is ready. Total due: Rs 12,450. Pay before 15 Apr.',
      time: '10:48 AM',
      status: 'safe',
    },
    {
      id: 'd4',
      sender: 'Amazon',
      body: 'Your package with order #302-918273 will be delivered today by 9 PM. Track: amzn.in/d/abc123',
      time: '9:20 AM',
      status: 'safe',
    },
    {
      id: 'd5',
      sender: 'IRCTC',
      body: 'PNR 2847193625 - Train 12302 Rajdhani Exp: Confirmed. Coach B3 Seat 42. Dep: 21 Mar 16:55.',
      time: 'Yesterday',
      status: 'safe',
    },
  ];
}

// ════════════════════════════════════════════════════════════
// Custom Modal (works on web + mobile)
// ════════════════════════════════════════════════════════════

function CustomModal({ visible, onClose, position, children }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const slideY = useRef(new Animated.Value(40)).current;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(slideY, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(slideY, { toValue: 40, duration: 180, useNativeDriver: true }),
      ]).start(() => setMounted(false));
    }
  }, [visible]);

  if (!mounted) return null;

  const isBottom = position === 'bottom';

  return (
    <Animated.View
      style={[
        styles.modalOverlay,
        { opacity },
        isBottom ? { justifyContent: 'flex-end' } : { justifyContent: 'center' },
      ]}
    >
      {/* Backdrop tap to close */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onClose}
      />
      <Animated.View
        style={[
          isBottom ? styles.modalBottom : styles.modalCenter,
          { transform: [{ translateY: slideY }] },
          IS_WEB && { maxWidth: MAX_WIDTH, alignSelf: 'center', width: '100%' },
        ]}
      >
        {children}
      </Animated.View>
    </Animated.View>
  );
}

// ════════════════════════════════════════════════════════════
// Custom Toast (Animated View — works everywhere)
// ════════════════════════════════════════════════════════════

function Toast({ message, visible, type }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (visible && message) {
      opacity.setValue(0);
      translateY.setValue(20);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start(() => {
        Animated.sequence([
          Animated.delay(2000),
          Animated.parallel([
            Animated.timing(opacity, { toValue: 0, duration: 350, useNativeDriver: true }),
            Animated.timing(translateY, { toValue: 20, duration: 350, useNativeDriver: true }),
          ]),
        ]).start();
      });
    }
  }, [visible, message]);

  if (!visible) return null;

  const bg = type === 'error' ? C.fraud : type === 'warn' ? C.warn : C.accent;

  return (
    <Animated.View
      style={[
        styles.toast,
        { opacity, backgroundColor: bg, transform: [{ translateY }] },
        IS_WEB && { maxWidth: MAX_WIDTH, alignSelf: 'center', left: 0, right: 0, marginHorizontal: 'auto' },
      ]}
      pointerEvents="none"
    >
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  );
}

// ════════════════════════════════════════════════════════════
// INBOX SCREEN
// ════════════════════════════════════════════════════════════

function InboxScreen() {
  const [messages, setMessages] = useState(makeDummyMessages());
  const [menuOpen, setMenuOpen] = useState(false);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testText, setTestText] = useState('');
  const [loading, setLoading] = useState(false);

  // Quarantine confirm
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [confirmInput, setConfirmInput] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // View full message
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewMessage, setViewMessage] = useState(null);

  // Toast
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });
  const toastKey = useRef(0);

  const showToast = useCallback((message, type) => {
    // Toggle key so the effect re-fires even with same message
    toastKey.current += 1;
    setToast({ visible: false, message: '', type: 'info' });
    setTimeout(() => {
      setToast({ visible: true, message, type });
    }, 60);
  }, []);

  // ── Send test message to API ────────────
  async function handleSendToAI() {
    const msg = testText.trim();
    if (!msg) {
      showToast('Please enter a message', 'error');
      return;
    }

    setLoading(true);
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(API_BASE + '/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg }),
        signal: controller.signal,
      });
      clearTimeout(timer);

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Server error');

      setLoading(false);
      setTestModalOpen(false);
      setTestText('');

      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const newMsg = {
        id: 'u' + Date.now(),
        sender: 'Unknown',
        body: msg,
        time: timeStr,
        status: data.is_fraud ? 'blocked' : 'safe',
        prediction: data.prediction || '',
        confidence: data.confidence || 0,
        models_agree: data.models_agree,
      };

      setMessages((prev) => [newMsg, ...prev]);

      if (data.is_fraud) {
        showToast('Suspicious message blocked by AI', 'error');
      } else {
        showToast('Message delivered to inbox', 'info');
      }
    } catch (err) {
      setLoading(false);
      showToast('Could not connect to server', 'error');
    }
  }

  // ── UNDO → quarantine ──────────────────
  function handleUndo(id) {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status: 'quarantine' } : m))
    );
    showToast('Message moved to quarantine', 'warn');
  }

  // ── DELETE → remove ────────────────────
  function handleDelete(id) {
    setMessages((prev) => prev.filter((m) => m.id !== id));
    showToast('Message permanently deleted', 'info');
  }

  // ── RE-BLOCK → back to blocked ─────────
  function handleReblock(id) {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status: 'blocked' } : m))
    );
    showToast('Message blocked again', 'error');
  }

  // ── Quarantine → confirm dialog ────────
  function handleQuarantineTap(msg) {
    setConfirmTarget(msg);
    setConfirmInput('');
    setConfirmError('');
    setConfirmModalOpen(true);
  }

  function handleConfirmOpen() {
    if (confirmInput === 'CONFIRM') {
      setConfirmModalOpen(false);
      setViewMessage(confirmTarget);
      setViewModalOpen(true);
    } else {
      setConfirmError('Incorrect, type CONFIRM');
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
    }
  }

  // ── Message card renderer ──────────────
  function renderMessage({ item }) {
    // ── BLOCKED ─────────────────────────
    if (item.status === 'blocked') {
      const label = (item.prediction || 'fraud')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (ch) => ch.toUpperCase());

      return (
        <View style={styles.blockedCard}>
          <View style={styles.blockedHeader}>
            <Text style={styles.emoji22}>🚨</Text>
            <View style={styles.flex1ml10}>
              <Text style={styles.blockedTitle}>Suspicious Message Blocked</Text>
              <Text style={styles.blockedLabel}>{label}</Text>
            </View>
            <View style={styles.confidenceBadge}>
              <Text style={styles.confidenceText}>{item.confidence}%</Text>
            </View>
          </View>
          <View style={styles.blockedActions}>
            <TouchableOpacity
              style={styles.undoBtn}
              onPress={() => handleUndo(item.id)}
              activeOpacity={0.7}
            >
              <Text style={styles.undoBtnText}>UNDO</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => handleDelete(item.id)}
              activeOpacity={0.7}
            >
              <Text style={styles.deleteBtnText}>DELETE</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    // ── QUARANTINE ──────────────────────
    if (item.status === 'quarantine') {
      return (
        <View style={styles.quarantineCard}>
          <View style={styles.quarantineHeader}>
            <Text style={styles.emoji18}>⚠️</Text>
            <View style={styles.flex1ml10}>
              <Text style={styles.quarantineTitle}>Quarantined Message</Text>
              <Text style={styles.quarantineSub}>This message was flagged as suspicious</Text>
            </View>
          </View>
          <View style={styles.quarantineActions}>
            <TouchableOpacity
              style={styles.tapToOpenBtn}
              onPress={() => handleQuarantineTap(item)}
              activeOpacity={0.7}
            >
              <Text style={styles.tapToOpenText}>OPEN</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.reblockBtn}
              onPress={() => handleReblock(item.id)}
              activeOpacity={0.7}
            >
              <Text style={styles.reblockBtnText}>BLOCK</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => handleDelete(item.id)}
              activeOpacity={0.7}
            >
              <Text style={styles.deleteBtnText}>DELETE</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    // ── SAFE / NORMAL ───────────────────
    return (
      <View style={styles.safeCard}>
        <View style={styles.safeHeader}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{(item.sender || 'U')[0]}</Text>
          </View>
          <View style={styles.flex1ml12}>
            <View style={styles.senderRow}>
              <Text style={styles.senderName}>{item.sender}</Text>
              <Text style={styles.timeText}>{item.time}</Text>
            </View>
            <Text style={styles.messagePreview} numberOfLines={2}>
              {item.body}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {!IS_WEB && <StatusBar style="light" />}

      {/* ── Top Bar ── */}
      <View style={styles.topBar}>
        <View style={[styles.topBarInner, IS_WEB && styles.webCenter]}>
          <View style={styles.topBarLeft}>
            <Text style={styles.emoji26}>🛡️</Text>
            <Text style={styles.topBarTitle}>SMSKavach</Text>
          </View>
          <TouchableOpacity
            style={styles.menuBtn}
            onPress={() => setMenuOpen(!menuOpen)}
            activeOpacity={0.6}
          >
            <Text style={styles.menuDots}>⋮</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Dropdown ── */}
      {menuOpen && (
        <>
          {/* invisible backdrop so clicking anywhere closes menu */}
          <Pressable
            style={styles.menuBackdrop}
            onPress={() => setMenuOpen(false)}
          />
          <View style={[styles.dropdownMenu, IS_WEB && styles.webDropdown]}>
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => {
                setMenuOpen(false);
                setTestModalOpen(true);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.emoji15mr8}>📝</Text>
              <Text style={styles.dropdownText}>Test Message</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* ── Message List ── */}
      <View style={[styles.listWrapper, IS_WEB && styles.webCenter]}>
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emoji48}>📭</Text>
              <Text style={styles.emptyText}>Inbox is empty</Text>
            </View>
          }
        />
      </View>

      {/* ── Toast ── */}
      <Toast visible={toast.visible} message={toast.message} type={toast.type} />

      {/* ═══ TEST MESSAGE MODAL ═══ */}
      <CustomModal
        visible={testModalOpen}
        onClose={() => { setTestModalOpen(false); setTestText(''); }}
        position="bottom"
      >
        <View style={styles.modalHandle} />
        <Text style={styles.modalTitle}>Test SMS Message</Text>
        <Text style={styles.modalSubtitle}>
          Paste any SMS text below to scan with AI
        </Text>

        <TextInput
          style={styles.modalInput}
          placeholder="Paste SMS text here…"
          placeholderTextColor={C.muted}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
          value={testText}
          onChangeText={setTestText}
        />

        <TouchableOpacity
          style={[styles.primaryBtn, loading && styles.btnDisabled]}
          onPress={handleSendToAI}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>Send to AI</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.ghostBtn}
          onPress={() => { setTestModalOpen(false); setTestText(''); }}
          activeOpacity={0.7}
        >
          <Text style={styles.ghostBtnText}>Cancel</Text>
        </TouchableOpacity>
      </CustomModal>

      {/* ═══ QUARANTINE CONFIRM MODAL ═══ */}
      <CustomModal
        visible={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        position="center"
      >
        <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
          <Text style={styles.emoji36center}>🔒</Text>
          <Text style={styles.confirmTitle}>Protected Message</Text>
          <Text style={styles.confirmSub}>
            This message was flagged as suspicious.{'\n'}
            Type <Text style={styles.confirmHighlight}>CONFIRM</Text> to view it.
          </Text>

          <TextInput
            style={styles.confirmInput}
            placeholder="Type CONFIRM"
            placeholderTextColor={C.muted}
            autoCapitalize="characters"
            value={confirmInput}
            onChangeText={(t) => { setConfirmInput(t); setConfirmError(''); }}
          />

          {confirmError ? (
            <Text style={styles.confirmErr}>{confirmError}</Text>
          ) : null}

          <TouchableOpacity
            style={styles.warnBtn}
            onPress={handleConfirmOpen}
            activeOpacity={0.8}
          >
            <Text style={styles.warnBtnText}>Confirm</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.ghostBtn}
            onPress={() => setConfirmModalOpen(false)}
            activeOpacity={0.7}
          >
            <Text style={styles.ghostBtnText}>Go Back</Text>
          </TouchableOpacity>
        </Animated.View>
      </CustomModal>

      {/* ═══ VIEW FULL MESSAGE MODAL ═══ */}
      <CustomModal
        visible={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        position="center"
      >
        <Text style={styles.viewFrom}>
          From: {viewMessage?.sender || 'Unknown'}
        </Text>
        <Text style={styles.viewBody}>{viewMessage?.body}</Text>
        <TouchableOpacity
          style={[styles.ghostBtn, { marginTop: 16 }]}
          onPress={() => setViewModalOpen(false)}
          activeOpacity={0.7}
        >
          <Text style={styles.ghostBtnText}>Close</Text>
        </TouchableOpacity>
      </CustomModal>
    </View>
  );
}

// ════════════════════════════════════════════════════════════
// RECYCLE BIN SCREEN
// ════════════════════════════════════════════════════════════

function RecycleBinScreen() {
  return (
    <View style={styles.screen}>
      {!IS_WEB && <StatusBar style="light" />}
      <View style={styles.lockedContainer}>
        <View style={styles.lockCircle}>
          <Text style={styles.emoji52}>🔒</Text>
        </View>
        <Text style={styles.lockedTitle}>Restricted Area</Text>
        <Text style={styles.lockedSub}>
          This area is restricted for your protection.{'\n'}
          Deleted messages cannot be recovered.
        </Text>
        <View style={styles.lockedDivider} />
        <Text style={styles.lockedFooter}>SMSKavach Security</Text>
      </View>
    </View>
  );
}

// ════════════════════════════════════════════════════════════
// TAB NAVIGATOR & APP
// ════════════════════════════════════════════════════════════

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#111111',
            borderTopColor: '#222222',
            borderTopWidth: 1,
            height: IS_WEB ? 56 : 62,
            paddingBottom: IS_WEB ? 6 : 8,
            paddingTop: 4,
          },
          tabBarActiveTintColor: C.accent,
          tabBarInactiveTintColor: C.muted,
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
          tabBarIcon: ({ focused }) => {
            if (route.name === 'Inbox') {
              return <Text style={styles.emoji20}>{focused ? '📨' : '📪'}</Text>;
            }
            return <Text style={styles.emoji20}>🗑️</Text>;
          },
        })}
      >
        <Tab.Screen
          name="Inbox"
          component={InboxScreen}
          options={{ tabBarLabel: 'Inbox' }}
        />
        <Tab.Screen
          name="RecycleBin"
          component={RecycleBinScreen}
          options={{ tabBarLabel: 'Recycle Bin' }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

// ════════════════════════════════════════════════════════════
// STYLES
// ════════════════════════════════════════════════════════════

const { width: SCREEN_W } = Dimensions.get('window');

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.bg,
  },

  // ── Emoji sizes (avoids inline objects) ──
  emoji15mr8: { fontSize: 15, marginRight: 8 },
  emoji18: { fontSize: 18 },
  emoji20: { fontSize: 20 },
  emoji22: { fontSize: 22 },
  emoji26: { fontSize: 26 },
  emoji36center: { fontSize: 36, textAlign: 'center', marginBottom: 12 },
  emoji48: { fontSize: 48 },
  emoji52: { fontSize: 52 },

  // ── Layout helpers ──
  flex1ml10: { flex: 1, marginLeft: 10 },
  flex1ml12: { flex: 1, marginLeft: 12 },

  // ── Top bar ──
  topBar: {
    paddingTop: TOP_PAD,
    paddingBottom: 14,
    backgroundColor: '#111111',
    borderBottomWidth: 1,
    borderBottomColor: '#1f1f1f',
  },
  topBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topBarTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: C.text,
    marginLeft: 10,
    letterSpacing: 0.4,
  },
  menuBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1c1c1e',
    alignItems: 'center',
    justifyContent: 'center',
    ...(IS_WEB ? { cursor: 'pointer' } : {}),
  },
  menuDots: {
    fontSize: 22,
    color: C.text,
    fontWeight: '700',
  },

  // ── Web centering ──
  webCenter: {
    width: '100%',
    maxWidth: MAX_WIDTH,
    alignSelf: 'center',
  },

  // ── Dropdown ──
  menuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99,
  },
  dropdownMenu: {
    position: 'absolute',
    top: TOP_PAD + 52,
    right: 16,
    backgroundColor: '#252528',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 4,
    zIndex: 100,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    minWidth: 170,
  },
  webDropdown: {
    right: '50%',
    marginRight: -(MAX_WIDTH / 2),
    // keep it near the right edge within the centered layout
    transform: [{ translateX: MAX_WIDTH / 2 - 16 }],
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    ...(IS_WEB ? { cursor: 'pointer' } : {}),
  },
  dropdownText: {
    fontSize: 15,
    color: C.text,
    fontWeight: '600',
  },

  // ── Message list ──
  listWrapper: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 30,
  },

  // ── Safe card ──
  safeCard: {
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.cardBorder,
    padding: 14,
    marginBottom: 10,
  },
  safeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
  },
  senderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  senderName: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
  },
  timeText: {
    fontSize: 11,
    color: C.muted,
  },
  messagePreview: {
    fontSize: 13,
    color: C.muted,
    lineHeight: 18,
  },

  // ── Blocked card ──
  blockedCard: {
    backgroundColor: C.fraudBg,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.fraud,
    padding: 14,
    marginBottom: 10,
  },
  blockedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  blockedTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: C.fraud,
  },
  blockedLabel: {
    fontSize: 12,
    color: C.muted,
    marginTop: 2,
  },
  confidenceBadge: {
    backgroundColor: C.fraud,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  confidenceText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fff',
  },
  blockedActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  undoBtn: {
    borderWidth: 1.5,
    borderColor: C.muted,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 9,
    marginRight: 10,
    ...(IS_WEB ? { cursor: 'pointer' } : {}),
  },
  undoBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.text,
  },
  deleteBtn: {
    backgroundColor: C.fraud,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 9,
    ...(IS_WEB ? { cursor: 'pointer' } : {}),
  },
  deleteBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },

  // ── Quarantine card ──
  quarantineCard: {
    backgroundColor: C.warnBg,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.warn,
    padding: 14,
    marginBottom: 10,
    ...(IS_WEB ? { cursor: 'pointer' } : {}),
  },
  quarantineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  quarantineTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: C.warn,
  },
  quarantineSub: {
    fontSize: 12,
    color: C.muted,
    marginTop: 2,
  },
  quarantineActions: {
    flexDirection: 'row',
    marginTop: 12,
  },
  tapToOpenBtn: {
    borderWidth: 1,
    borderColor: C.warn,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 10,
  },
  tapToOpenText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.warn,
  },
  reblockBtn: {
    borderWidth: 1,
    borderColor: C.fraud,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 10,
  },
  reblockBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.fraud,
  },

  // ── Empty state ──
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 120,
  },
  emptyText: {
    fontSize: 16,
    color: C.muted,
    marginTop: 10,
  },

  // ── Toast ──
  toast: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: 'center',
    zIndex: 200,
  },
  toastText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // ── Modal overlay ──
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.75)',
    zIndex: 150,
  },
  modalBottom: {
    backgroundColor: '#1a1a1c',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
  },
  modalCenter: {
    backgroundColor: '#1a1a1c',
    borderRadius: 20,
    padding: 28,
    marginHorizontal: 24,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#444',
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: C.text,
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 13,
    color: C.muted,
    marginBottom: 18,
  },
  modalInput: {
    backgroundColor: C.inputBg,
    borderWidth: 1,
    borderColor: C.inputBorder,
    borderRadius: 12,
    color: C.text,
    fontSize: 14,
    padding: 14,
    minHeight: 130,
    marginBottom: 16,
    ...(IS_WEB ? { outlineStyle: 'none' } : {}),
  },

  // ── Shared buttons ──
  primaryBtn: {
    backgroundColor: C.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
    ...(IS_WEB ? { cursor: 'pointer' } : {}),
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  btnDisabled: { opacity: 0.5 },
  warnBtn: {
    backgroundColor: C.warn,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
    ...(IS_WEB ? { cursor: 'pointer' } : {}),
  },
  warnBtnText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 15,
  },
  ghostBtn: {
    alignItems: 'center',
    paddingVertical: 10,
    ...(IS_WEB ? { cursor: 'pointer' } : {}),
  },
  ghostBtnText: {
    color: C.muted,
    fontSize: 14,
    fontWeight: '600',
  },

  // ── Confirm modal ──
  confirmTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: C.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  confirmSub: {
    fontSize: 13,
    color: C.muted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 18,
  },
  confirmHighlight: {
    fontWeight: '800',
    color: C.warn,
  },
  confirmInput: {
    backgroundColor: C.inputBg,
    borderWidth: 1,
    borderColor: C.inputBorder,
    borderRadius: 10,
    color: C.text,
    fontSize: 16,
    padding: 12,
    textAlign: 'center',
    letterSpacing: 2,
    marginBottom: 8,
    ...(IS_WEB ? { outlineStyle: 'none' } : {}),
  },
  confirmErr: {
    color: C.fraud,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '600',
  },

  // ── View message modal ──
  viewFrom: {
    fontSize: 14,
    color: C.muted,
    marginBottom: 4,
  },
  viewBody: {
    fontSize: 15,
    color: C.text,
    lineHeight: 22,
    marginTop: 8,
  },

  // ── Recycle bin locked ──
  lockedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  lockCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1c1c1e',
    borderWidth: 2,
    borderColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  lockedTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: C.text,
    marginBottom: 10,
  },
  lockedSub: {
    fontSize: 14,
    color: C.muted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  lockedDivider: {
    width: 60,
    height: 2,
    backgroundColor: '#2a2a2a',
    marginBottom: 16,
  },
  lockedFooter: {
    fontSize: 12,
    color: '#444',
    fontWeight: '600',
    letterSpacing: 1,
  },
});
