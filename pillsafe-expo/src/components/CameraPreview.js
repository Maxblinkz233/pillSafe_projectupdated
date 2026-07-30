import React, {useEffect, useState} from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import {WebView} from 'react-native-webview';
import {getApiConfig} from '../services/config';

const CameraPreview = ({active = true}) => {
  const [source, setSource] = useState(null);
  const [message, setMessage] = useState('Connecting to the PillSafe camera…');

  useEffect(() => {
    let mounted = true;
    if (!active) {
      setSource(null);
      return () => {
        mounted = false;
      };
    }

    getApiConfig()
      .then(({baseUrl, token}) => {
        if (!mounted) return;
        setSource({
          uri: `${baseUrl}/camera/stream`,
          headers: {Authorization: `Bearer ${token}`},
        });
      })
      .catch(error => {
        if (mounted) {
          setMessage(error?.message || 'Camera preview unavailable');
        }
      });

    return () => {
      mounted = false;
    };
  }, [active]);

  if (!active) return null;

  return (
    <View style={styles.frame}>
      {source ? (
        <WebView
          source={source}
          style={styles.webView}
          originWhitelist={['http://*', 'https://*']}
          mixedContentMode="always"
          javaScriptEnabled={false}
          scrollEnabled={false}
          bounces={false}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.loading}>
              <ActivityIndicator color="#FFFFFF" />
              <Text style={styles.message}>{message}</Text>
            </View>
          )}
          onHttpError={() =>
            setMessage('Camera preview unavailable — check the hub connection.')
          }
          onError={() =>
            setMessage('Cannot reach the PillSafe camera on this network.')
          }
        />
      ) : (
        <View style={styles.loading}>
          <ActivityIndicator color="#FFFFFF" />
          <Text style={styles.message}>{message}</Text>
        </View>
      )}
      <View style={styles.liveBadge}>
        <View style={styles.liveDot} />
        <Text style={styles.liveText}>LIVE — HUB CAMERA</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    aspectRatio: 4 / 3,
    overflow: 'hidden',
    borderRadius: 16,
    backgroundColor: '#020617',
    borderWidth: 2,
    borderColor: '#334155',
  },
  webView: {flex: 1, backgroundColor: '#020617'},
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#020617',
  },
  message: {color: '#CBD5E1', fontSize: 12, textAlign: 'center'},
  liveBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  liveText: {color: '#FFFFFF', fontSize: 10, fontWeight: '700'},
});

export default CameraPreview;
