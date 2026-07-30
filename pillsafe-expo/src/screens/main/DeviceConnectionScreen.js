import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { ChevronLeft, Wifi, CheckCircle, XCircle } from 'lucide-react-native';
import {
  DEFAULT_BASE_URL,
  DEFAULT_TOKEN,
  getApiConfig,
  saveApiConfig,
} from '../../services/config';
import { api } from '../../services/api';

const DeviceConnectionScreen = ({ navigation, route }) => {
  const authIntent = route?.params?.authIntent || null;
  const accountData = route?.params?.accountData || null;
  const [baseUrl, setBaseUrl] = useState(DEFAULT_BASE_URL);
  const [token, setToken] = useState(DEFAULT_TOKEN);
  const [userId, setUserId] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [health, setHealth] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const cfg = await getApiConfig();
      setBaseUrl(cfg.baseUrl);
      setToken(cfg.token);
      setUserId(cfg.userId != null ? String(cfg.userId) : '');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onSave = async () => {
    try {
      await saveApiConfig({
        baseUrl: baseUrl.trim(),
        token: token.trim(),
      });
      if (authIntent && !health) {
        await api.health();
        await api.getUsers(); // also validates the bearer token
      }

      if (authIntent === 'signup') {
        navigation.navigate('SlotSelection', accountData);
        return;
      }

      if (authIntent === 'login' || authIntent === 'claim') {
        const user =
          authIntent === 'claim'
            ? await api.claimAccount(accountData)
            : await api.login(accountData);
        await saveApiConfig({
          userId: user.user_id,
          userName: user.full_name,
          caregiverName: user.caregiver_name || '',
          caregiverPhone: user.caregiver_phone,
          signedIn: true,
        });
        navigation.reset({ index: 0, routes: [{ name: 'MainApp' }] });
        return;
      }

      const selected = users.find(u => String(u.user_id) === String(userId));
      await saveApiConfig({
        userId: userId ? Number(userId) : null,
        userName: selected ? selected.full_name : null,
        caregiverName: selected?.caregiver_name || '',
        caregiverPhone: selected?.caregiver_phone || '',
      });
      Alert.alert('Saved', 'Device connection settings updated.');
    } catch (err) {
      Alert.alert('Error', String(err.message || err));
    }
  };

  const onTest = async () => {
    setTesting(true);
    setError(null);
    setHealth(null);
    try {
      await saveApiConfig({
        baseUrl: baseUrl.trim(),
        token: token.trim(),
      });
      const status = await api.health();
      setHealth(status);
      const list = await api.getUsers();
      setUsers(list || []);
      if (
        !authIntent &&
        (!userId || userId === '') &&
        list &&
        list.length > 0
      ) {
        setUserId(String(list[0].user_id));
      }
    } catch (err) {
      setError(err.message || String(err));
      setUsers([]);
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#3B5BDB" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <StatusBar barStyle="dark-content" backgroundColor="#F3F4F6" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <ChevronLeft size={22} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Device Connection</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Wifi size={22} color="#3B5BDB" />
          <Text style={styles.cardTitle}>PillSafe Hub API</Text>
        </View>
        <Text style={styles.hint}>
          {authIntent
            ? 'Connect to the hub (PC or Raspberry Pi). Your account details will be securely processed after the connection succeeds.'
            : 'Connect to the Raspberry Pi hotspot (PillSafe-AP) or the same LAN, then set the API URL and Bearer token from config.yaml.'}
        </Text>

        <Text style={styles.label}>API BASE URL</Text>
        <TextInput
          style={styles.input}
          value={baseUrl}
          onChangeText={setBaseUrl}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="http://192.168.4.1:5000"
          placeholderTextColor="#9CA3AF"
        />

        <Text style={styles.label}>API TOKEN</Text>
        <TextInput
          style={styles.input}
          value={token}
          onChangeText={setToken}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          placeholder="Bearer token"
          placeholderTextColor="#9CA3AF"
        />

        {!authIntent && (
          <>
            <Text style={styles.label}>ACTIVE USER ID</Text>
            <TextInput
              style={styles.input}
              value={userId}
              onChangeText={setUserId}
              keyboardType="number-pad"
              placeholder="e.g. 1"
              placeholderTextColor="#9CA3AF"
            />
          </>
        )}

        {!authIntent && users.length > 0 && (
          <View style={styles.userList}>
            <Text style={styles.label}>USERS ON DEVICE</Text>
            {users.map(u => (
              <TouchableOpacity
                key={u.user_id}
                style={[
                  styles.userRow,
                  String(u.user_id) === String(userId) && styles.userRowActive,
                ]}
                onPress={() => setUserId(String(u.user_id))}
              >
                <Text
                  style={[
                    styles.userText,
                    String(u.user_id) === String(userId) &&
                      styles.userTextActive,
                  ]}
                >
                  #{u.user_id} — {u.full_name} (compartment{' '}
                  {u.compartment_index})
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {health && (
          <View style={styles.statusOk}>
            <CheckCircle size={18} color="#065F46" />
            <Text style={styles.statusOkText}>
              Connected — RTC {health.rtc_available ? 'OK' : 'N/A'}, GSM{' '}
              {health.gsm_available ? 'OK' : 'N/A'}
            </Text>
          </View>
        )}
        {error && (
          <View style={styles.statusErr}>
            <XCircle size={18} color="#991B1B" />
            <Text style={styles.statusErrText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.testButton}
          onPress={onTest}
          disabled={testing}
        >
          {testing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.testButtonText}>Test Connection</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.saveButton} onPress={onSave}>
          <Text style={styles.saveButtonText}>
            {authIntent === 'signup'
              ? 'Continue to Compartment'
              : authIntent === 'claim'
              ? 'Set Password & Login'
              : authIntent === 'login'
              ? 'Login'
              : 'Save Settings'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    marginBottom: 20,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#111827',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#3B5BDB',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  hint: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
  },
  userList: {
    marginTop: 8,
  },
  userRow: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    marginBottom: 6,
  },
  userRowActive: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#3B5BDB',
  },
  userText: {
    fontSize: 13,
    color: '#374151',
  },
  userTextActive: {
    color: '#3B5BDB',
    fontWeight: '600',
  },
  statusOk: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#D1FAE5',
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
  },
  statusOkText: {
    flex: 1,
    fontSize: 13,
    color: '#065F46',
  },
  statusErr: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
  },
  statusErrText: {
    flex: 1,
    fontSize: 13,
    color: '#991B1B',
  },
  testButton: {
    backgroundColor: '#3B5BDB',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  testButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  saveButton: {
    borderWidth: 1.5,
    borderColor: '#3B5BDB',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: '#3B5BDB',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default DeviceConnectionScreen;
