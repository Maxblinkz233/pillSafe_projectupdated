import React, {useEffect, useRef, useState} from 'react';
import {ActivityIndicator, Image, StyleSheet, Text, View} from 'react-native';
import {getApiConfig} from '../services/config';

const POLL_MS = 250;

/**
 * Live hub-camera preview for phones.
 * iOS WKWebView cannot render MJPEG multipart streams, so we poll JPEG
 * snapshots and display them with React Native Image.
 */
const CameraPreview = ({active = true}) => {
  const [frameUri, setFrameUri] = useState(null);
  const [message, setMessage] = useState('Connecting to the PillSafe camera…');
  const mountedRef = useRef(true);
  const configRef = useRef(null);
  const busyRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    let timer = null;

    const stop = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    };

    if (!active) {
      setFrameUri(null);
      setMessage('Connecting to the PillSafe camera…');
      return () => {
        mountedRef.current = false;
        stop();
      };
    }

    const schedule = delay => {
      stop();
      timer = setTimeout(poll, delay);
    };

    const poll = async () => {
      if (!mountedRef.current || !active || busyRef.current) {
        schedule(POLL_MS);
        return;
      }

      busyRef.current = true;
      try {
        if (!configRef.current) {
          configRef.current = await getApiConfig();
        }
        const {baseUrl, token} = configRef.current;
        const response = await fetch(
          `${baseUrl}/camera/snapshot?t=${Date.now()}`,
          {
            method: 'GET',
            headers: {
              Accept: 'image/jpeg',
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const buffer = await response.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = '';
        const chunk = 0x8000;
        for (let i = 0; i < bytes.length; i += chunk) {
          binary += String.fromCharCode.apply(
            null,
            bytes.subarray(i, i + chunk),
          );
        }
        const uri = `data:image/jpeg;base64,${global.btoa(binary)}`;
        if (mountedRef.current) {
          setFrameUri(uri);
          setMessage('Live hub camera');
        }
      } catch (error) {
        if (mountedRef.current) {
          setMessage(
            error?.message?.includes('Network')
              ? 'Cannot reach the PillSafe camera on this network.'
              : 'Camera preview unavailable — check the hub connection.',
          );
        }
      } finally {
        busyRef.current = false;
        if (mountedRef.current && active) {
          schedule(POLL_MS);
        }
      }
    };

    poll();

    return () => {
      mountedRef.current = false;
      stop();
    };
  }, [active]);

  if (!active) return null;

  return (
    <View style={styles.frame}>
      {frameUri ? (
        <Image source={{uri: frameUri}} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={styles.loading}>
          <ActivityIndicator color="#FFFFFF" />
          <Text style={styles.message}>{message}</Text>
        </View>
      )}
      {!!frameUri && (
        <View pointerEvents="none" style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE — HUB CAMERA</Text>
        </View>
      )}
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
  image: {width: '100%', height: '100%'},
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#020617',
  },
  message: {
    color: '#CBD5E1',
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
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
