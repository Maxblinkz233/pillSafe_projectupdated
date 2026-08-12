# PillSafe Expo copy

This is an Expo Go-compatible copy of the existing React Native app. The original
app at the repository root remains unchanged.

The copy intentionally targets **Expo SDK 54**, because the SDK 57 version of
Expo Go is still awaiting Apple App Store approval.

## Run on an iPhone from Windows

1. Install **Expo Go** from the iPhone App Store.
2. Connect the iPhone and Windows PC to the same Wi-Fi network.
3. From this folder, run:

   ```sh
   npm install
   npm start
   ```

4. Scan the displayed QR code with the iPhone camera and open it in Expo Go.
5. In PillSafe, open **Settings → Device Connection** and configure the Pi URL
   and API token.

## SMS (hub Africa’s Talking → GSM → phone fallback)

Hub sends caregiver SMS via **Africa’s Talking** first (live keys in Pi
`config.yaml`). If that fails, GSM; if both fail, the hub queues
`PENDING_PHONE_SMS` and this app’s poller sends via Africa’s Talking using
[`src/config/africasTalking.js`](src/config/africasTalking.js) (developers only —
not in the UI). The phone needs internet for that last-resort API call while
still reaching the hub for polling.

During face enrolment and face verification, the app displays the live
Raspberry Pi camera preview. The preview requires the updated Pi backend in this
repository to be running.

For live hub access, the iPhone, PC running Metro, and Raspberry Pi must be
reachable on the same network. If LAN discovery fails, run `npm start -- --tunnel`;
the iPhone and PC then need internet access, while the iPhone must still be able
to reach the Pi API.

## Auto-start Metro on the Raspberry Pi

You can run Expo on the Pi itself so it starts on every boot (no PC needed):

1. Install **Node.js 18+** on the Pi.
2. Copy this `pillsafe-expo/` folder to
   `/home/boison08/Documents/pillSafe_projectupdated/pillsafe-expo`.
3. On the Pi:

   ```sh
   cd /home/boison08/Documents/pillSafe_projectupdated/hardware
   bash scripts/install_pillsafe_expo_service.sh
   ```

4. Reboot and check:

   ```sh
   systemctl is-active pillsafe-expo
   tail -n 30 /home/boison08/Documents/pillSafe_projectupdated/hardware/data/pillsafe_expo_stdout.log
   ```

5. On the phone (Expo Go): connect to PillSafe-AP or the same Wi‑Fi, then open
   `exp://10.42.0.1:8081` (hotspot) or `exp://<pi-ip>:8081`.

The hub (`pillsafe.service`) and Metro (`pillsafe-expo.service`) are separate
units — enable both for a fully self-contained Pi demo.

## Compatibility note

`react-native-vision-camera` was not copied because the app does not import or
use it. Face and voice verification are initiated by the app but performed by
the Raspberry Pi hub, so removing that unused native dependency does not remove
verification functionality.
