import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { predictSMS, checkURL } from '../src/api';
import { COLORS } from '../src/constants';

// ─── helper ──────────────────────────────────────────────────

function labelDisplay(label = '') {
  return label.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── sub-components ──────────────────────────────────────────

function SectionTitle({ children }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function SmsResultCard({ result }) {
  if (!result) return null;

  const { prediction, is_fraud, confidence, svm_prediction, models_agree } = result;

  let cardStyle = styles.safeCard;
  let headerColor = COLORS.safe;
  let icon = '✅';
  let headline = 'Safe Message';

  if (is_fraud && models_agree) {
    cardStyle = styles.fraudCard;
    headerColor = COLORS.fraud;
    icon = '🚨';
    headline = labelDisplay(prediction);
  } else if (is_fraud && !models_agree) {
    cardStyle = styles.warnCard;
    headerColor = COLORS.warn;
    icon = '⚠️';
    headline = `Possible ${labelDisplay(prediction)}`;
  }

  return (
    <View style={[styles.resultCard, cardStyle]}>
      <View style={styles.resultHeader}>
        <Text style={styles.resultIcon}>{icon}</Text>
        <Text style={[styles.resultHeadline, { color: headerColor }]}>{headline}</Text>
      </View>
      <View style={styles.resultRow}>
        <Text style={styles.resultLabel}>Confidence</Text>
        <Text style={[styles.resultValue, { color: headerColor }]}>{confidence}%</Text>
      </View>
      <View style={styles.resultRow}>
        <Text style={styles.resultLabel}>LR Model</Text>
        <Text style={styles.resultValue}>{labelDisplay(prediction)}</Text>
      </View>
      <View style={styles.resultRow}>
        <Text style={styles.resultLabel}>SVM Model</Text>
        <Text style={styles.resultValue}>{labelDisplay(svm_prediction)}</Text>
      </View>
      <View style={styles.resultRow}>
        <Text style={styles.resultLabel}>Models Agree</Text>
        <Text style={[styles.resultValue, { color: models_agree ? COLORS.safe : COLORS.warn }]}>
          {models_agree ? 'Yes' : 'No — review manually'}
        </Text>
      </View>
    </View>
  );
}

function UrlResultCard({ result }) {
  if (!result) return null;

  const { is_phishing, risk_score, reasons } = result;
  const color = is_phishing ? COLORS.fraud : COLORS.safe;
  const icon = is_phishing ? '🔴' : '🟢';

  return (
    <View style={[styles.resultCard, is_phishing ? styles.fraudCard : styles.safeCard]}>
      <View style={styles.resultHeader}>
        <Text style={styles.resultIcon}>{icon}</Text>
        <Text style={[styles.resultHeadline, { color }]}>
          {is_phishing ? 'Phishing URL' : 'URL Looks Safe'}
        </Text>
      </View>
      <View style={styles.resultRow}>
        <Text style={styles.resultLabel}>Risk Score</Text>
        <Text style={[styles.resultValue, { color }]}>{risk_score} / 100</Text>
      </View>
      {reasons && reasons.length > 0 && (
        <View style={styles.reasonsBox}>
          <Text style={styles.resultLabel}>Risk Factors</Text>
          {reasons.map((r, i) => (
            <Text key={i} style={styles.reasonItem}>• {r}</Text>
          ))}
        </View>
      )}
      {reasons && reasons.length === 0 && (
        <Text style={styles.reasonItem}>No suspicious patterns detected.</Text>
      )}
    </View>
  );
}

// ─── main screen ─────────────────────────────────────────────

export default function HomeScreen({ addToHistory }) {
  const [smsText, setSmsText] = useState('');
  const [urlText, setUrlText] = useState('');
  const [smsLoading, setSmsLoading] = useState(false);
  const [urlLoading, setUrlLoading] = useState(false);
  const [smsResult, setSmsResult] = useState(null);
  const [urlResult, setUrlResult] = useState(null);
  const [smsError, setSmsError] = useState('');
  const [urlError, setUrlError] = useState('');

  // ── SMS Scan ──────────────────────────────
  async function handleScanSMS() {
    const msg = smsText.trim();
    if (!msg) {
      Alert.alert('Empty field', 'Please paste an SMS message first.');
      return;
    }
    setSmsLoading(true);
    setSmsError('');
    setSmsResult(null);

    const { success, data, error } = await predictSMS(msg);
    setSmsLoading(false);

    if (!success) {
      setSmsError(error);
      return;
    }
    setSmsResult(data);
    addToHistory({ message: msg, prediction: data.prediction, timestamp: new Date() });
  }

  // ── URL Check ────────────────────────────
  async function handleCheckURL() {
    const url = urlText.trim();
    if (!url) {
      Alert.alert('Empty field', 'Please enter a URL first.');
      return;
    }
    setUrlLoading(true);
    setUrlError('');
    setUrlResult(null);

    const { success, data, error } = await checkURL(url);
    setUrlLoading(false);

    if (!success) {
      setUrlError(error);
      return;
    }
    setUrlResult(data);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero header ── */}
        <View style={styles.hero}>
          <Text style={styles.shieldIcon}>🛡️</Text>
          <View>
            <Text style={styles.appName}>SMSKavach</Text>
            <Text style={styles.appTagline}>AI-powered SMS fraud detection</Text>
          </View>
        </View>

        {/* ═══ SMS Section ═══ */}
        <View style={styles.card}>
          <SectionTitle>📩 Scan SMS Message</SectionTitle>
          <TextInput
            style={styles.textArea}
            placeholder="Paste the SMS text here…"
            placeholderTextColor={COLORS.subtext}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            value={smsText}
            onChangeText={setSmsText}
          />
          <TouchableOpacity
            style={[styles.btn, smsLoading && styles.btnDisabled]}
            onPress={handleScanSMS}
            disabled={smsLoading}
            activeOpacity={0.8}
          >
            {smsLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Scan SMS</Text>
            )}
          </TouchableOpacity>

          {smsError ? <Text style={styles.errorText}>⚠ {smsError}</Text> : null}
          <SmsResultCard result={smsResult} />
        </View>

        {/* ═══ URL Section ═══ */}
        <View style={styles.card}>
          <SectionTitle>🔗 Check URL</SectionTitle>
          <TextInput
            style={styles.input}
            placeholder="https://example.com/link"
            placeholderTextColor={COLORS.subtext}
            autoCapitalize="none"
            keyboardType="url"
            value={urlText}
            onChangeText={setUrlText}
          />
          <TouchableOpacity
            style={[styles.btn, styles.btnUrl, urlLoading && styles.btnDisabled]}
            onPress={handleCheckURL}
            disabled={urlLoading}
            activeOpacity={0.8}
          >
            {urlLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Check URL</Text>
            )}
          </TouchableOpacity>

          {urlError ? <Text style={styles.errorText}>⚠ {urlError}</Text> : null}
          <UrlResultCard result={urlResult} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── styles ──────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    paddingTop: 56,
  },

  // Hero
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
  },
  shieldIcon: { fontSize: 44, marginRight: 14 },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: 0.5,
  },
  appTagline: {
    fontSize: 12,
    color: COLORS.subtext,
    marginTop: 2,
  },

  // Section title
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },

  // Card
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 16,
    marginBottom: 18,
  },

  // Inputs
  textArea: {
    backgroundColor: COLORS.input,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    borderRadius: 10,
    color: COLORS.text,
    fontSize: 14,
    padding: 12,
    minHeight: 110,
    marginBottom: 12,
  },
  input: {
    backgroundColor: COLORS.input,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    borderRadius: 10,
    color: COLORS.text,
    fontSize: 14,
    padding: 12,
    marginBottom: 12,
  },

  // Buttons
  btn: {
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 14,
  },
  btnUrl: {
    backgroundColor: '#0f766e', // teal variant
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // Error
  errorText: {
    color: COLORS.warn,
    fontSize: 13,
    marginBottom: 8,
  },

  // Result cards
  resultCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginTop: 4,
  },
  fraudCard: {
    backgroundColor: '#1f0000',
    borderColor: COLORS.fraud,
  },
  safeCard: {
    backgroundColor: '#001a0a',
    borderColor: COLORS.safe,
  },
  warnCard: {
    backgroundColor: '#1a1200',
    borderColor: COLORS.warn,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultIcon: { fontSize: 26, marginRight: 10 },
  resultHeadline: {
    fontSize: 17,
    fontWeight: '800',
    flexShrink: 1,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  resultLabel: { color: COLORS.subtext, fontSize: 13 },
  resultValue: { color: COLORS.text, fontSize: 13, fontWeight: '600', flexShrink: 1, textAlign: 'right' },

  // URL reasons
  reasonsBox: { marginTop: 6 },
  reasonItem: { color: COLORS.subtext, fontSize: 13, marginTop: 4 },
});
