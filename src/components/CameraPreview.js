import React, {useEffect, useRef, useState} from 'react';
import {ActivityIndicator, Image, StyleSheet, Text, View} from 'react-native';
import {getApiConfig} from '../services/config';

const POLL_MS = 350;

/**
 * Live hub-camera preview.
 * iOS WKWebView cannot render MJPEG, so we poll /camera/snapshot JPEGs
 * with React Native Image + Authorization headers.
 */
const CameraPreview = ({active = true}) => {
  const [frameSource, setFrameSource] = useState(null);
  const [hasFrame, setHasFrame] = useState(false);
  const [message, setMessage] = useState('Connecting to the PillSafe camera…');
  const mountedRef = useRef(true);
  const configRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    mountedRef.current = true;

    const clearTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    if (!active) {
      clearTimer();
      setFrameSource(null);
      setHasFrame(false);
      setMessage('Connecting to the PillSafe camera…');
      return () => {
        mountedRef.current = false;
        clearTimer();
      };
    }

    const tick = async () => {
      if (!mountedRef.current || !active) return;
      try {
        if (!configRef.current) {
          configRef.current = await getApiConfig();
        }
        const {baseUrl, token} = configRef.current;
        if (mountedRef.current) {
          setFrameSource({
            uri: `${baseUrl}/camera/snapshot?t=${Date.now()}`,
            headers: {Authorization: `Bearer ${token}`},
            cache: 'reload',
          });
        }
      } catch (error) {
        if (mountedRef.current) {
          setHasFrame(false);
          setMessage(error?.message || 'Camera preview unavailable');
        }
      } finally {
        if (mountedRef.current && active) {
          timerRef.current = setTimeout(tick, POLL_MS);
        }
      }
    };

    tick();

    return () => {
      mountedRef.current = false;
      clearTimer();
    };
  }, [active]);

  if (!active) return null;

  return (
    <View style={styles.frame}>
      {frameSource ? (
        <Image
          source={frameSource}
          style={styles.image}
          resizeMode="cover"
          onLoad={() => {
            setHasFrame(true);
            setMessage('Live hub camera');
          }}
          onError={() => {
            setHasFrame(false);
            setMessage(
              'Camera preview unavailable — check the hub connection.',
            );
          }}
        />
      ) : null}
      {!hasFrame && (
        <View style={styles.loading}>
          <ActivityIndicator color="#FFFFFF" />
          <Text style={styles.message}>{message}</Text>
        </View>
      )}
      {hasFrame && (
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
  image: {width: '100%', height: '100%', backgroundColor: '#020617'},
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
