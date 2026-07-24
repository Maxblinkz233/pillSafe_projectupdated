import {getApiBaseUrlCandidates} from '../src/services/config';

describe('getApiBaseUrlCandidates', () => {
  it('prioritises the configured host while keeping common local fallbacks', () => {
    expect(getApiBaseUrlCandidates('http://192.168.4.1:5000')).toEqual([
      'http://192.168.4.1:5000',
      'http://10.0.2.2:5000',
      'http://localhost:5000',
    ]);
  });

  it('uses the emulator-friendly default when no host is provided', () => {
    expect(getApiBaseUrlCandidates()).toEqual([
      'http://10.0.2.2:5000',
      'http://192.168.4.1:5000',
      'http://localhost:5000',
    ]);
  });
});
