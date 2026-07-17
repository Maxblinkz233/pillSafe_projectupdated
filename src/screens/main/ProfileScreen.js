import React, {useCallback, useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {ChevronLeft, Trash2, Wifi, User} from 'lucide-react-native';
import {useFocusEffect} from '@react-navigation/native';
import {
  clearSessionUser,
  getApiConfig,
  signOutLocal,
} from '../../services/config';
import {api, initials} from '../../services/api';

const ProfileScreen = ({navigation}) => {
  const [cfg, setCfg] = useState(null);
  const [hubUser, setHubUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const config = await getApiConfig();
      setCfg(config);
      if (config.userId) {
        try {
          const user = await api.getUser(config.userId);
          setHubUser(user);
        } catch {
          setHubUser(null);
        }
      } else {
        setHubUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onDeleteAccount = () => {
    if (!cfg?.userId) {
      Alert.alert(
        'No hub account',
        'This device is not linked to a hub user yet. Sign out instead.',
      );
      return;
    }
    Alert.alert(
      'Delete account?',
      'This removes the patient from the PillSafe hub (schedules and enrolment data). This cannot be undone.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await api.deleteUser(cfg.userId);
              await clearSessionUser();
              Alert.alert('Account deleted', 'Returning to sign-in.');
              navigation.reset({index: 0, routes: [{name: 'Login'}]});
            } catch (err) {
              Alert.alert(
                'Could not delete',
                err?.message ||
                  'Check hub connection, then try again.',
              );
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  const onSignOut = async () => {
    await signOutLocal();
    navigation.reset({index: 0, routes: [{name: 'Login'}]});
  };

  const name = hubUser?.full_name || cfg?.userName || 'Patient';
  const phone =
    hubUser?.caregiver_phone || cfg?.caregiverPhone || 'Not set';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <StatusBar barStyle="dark-content" backgroundColor="#F3F4F6" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <ChevronLeft size={22} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{width: 36}} />
      </View>

      {loading ? (
        <ActivityIndicator color="#3B5BDB" style={{marginTop: 40}} />
      ) : (
        <>
          <View style={styles.hero}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials(name)}</Text>
            </View>
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.role}>Patient profile</Text>
          </View>

          <View style={styles.card}>
            <InfoRow
              icon={<User size={18} color="#3B5BDB" />}
              label="Full name"
              value={name}
            />
            <View style={styles.divider} />
            <InfoRow
              icon={<User size={18} color="#3B5BDB" />}
              label="Caregiver phone"
              value={phone}
            />
            <View style={styles.divider} />
            <InfoRow
              icon={<Wifi size={18} color="#3B5BDB" />}
              label="Hub user ID"
              value={cfg?.userId != null ? `#${cfg.userId}` : 'Not linked'}
            />
            <View style={styles.divider} />
            <InfoRow
              icon={<Wifi size={18} color="#3B5BDB" />}
              label="Compartment"
              value={
                hubUser?.compartment_index != null
                  ? String(hubUser.compartment_index)
                  : '—'
              }
            />
            <View style={styles.divider} />
            <InfoRow
              icon={<Wifi size={18} color="#3B5BDB" />}
              label="API"
              value={cfg?.baseUrl || '—'}
            />
          </View>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => navigation.navigate('DeviceConnection')}>
            <Wifi size={18} color="#3B5BDB" />
            <Text style={styles.linkButtonText}>Device Connection</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.signOutButton}
            onPress={onSignOut}
            disabled={busy}>
            <Text style={styles.signOutText}>Sign out</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={onDeleteAccount}
            disabled={busy}>
            {busy ? (
              <ActivityIndicator color="#991B1B" />
            ) : (
              <>
                <Trash2 size={18} color="#991B1B" />
                <Text style={styles.deleteText}>Delete account</Text>
              </>
            )}
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
};

const InfoRow = ({icon, label, value}) => (
  <View style={styles.infoRow}>
    <View style={styles.infoIcon}>{icon}</View>
    <View style={styles.infoText}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F3F4F6'},
  content: {paddingHorizontal: 16, paddingBottom: 40},
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
  headerTitle: {fontSize: 18, fontWeight: 'bold', color: '#111827'},
  hero: {alignItems: 'center', marginBottom: 20},
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#3B5BDB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {color: '#FFFFFF', fontSize: 28, fontWeight: 'bold'},
  name: {fontSize: 22, fontWeight: 'bold', color: '#111827'},
  role: {fontSize: 13, color: '#6B7280', marginTop: 4},
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 4,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  infoIcon: {width: 24, alignItems: 'center'},
  infoText: {flex: 1},
  infoLabel: {fontSize: 12, color: '#6B7280', marginBottom: 2},
  infoValue: {fontSize: 15, color: '#111827', fontWeight: '500'},
  divider: {height: 1, backgroundColor: '#F3F4F6', marginLeft: 52},
  linkButton: {
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  linkButtonText: {color: '#3B5BDB', fontWeight: '700', fontSize: 14},
  signOutButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  signOutText: {color: '#374151', fontWeight: '600', fontSize: 15},
  deleteButton: {
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  deleteText: {color: '#991B1B', fontWeight: '700', fontSize: 15},
});

export default ProfileScreen;
