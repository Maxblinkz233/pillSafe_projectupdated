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

During face enrolment and face verification, the app displays the live
Raspberry Pi camera preview. The preview requires the updated Pi backend in this
repository to be running.

For live hub access, the iPhone, PC running Metro, and Raspberry Pi must be
reachable on the same network. If LAN discovery fails, run `npm start -- --tunnel`;
the iPhone and PC then need internet access, while the iPhone must still be able
to reach the Pi API.

## Compatibility note

`react-native-vision-camera` was not copied because the app does not import or
use it. Face and voice verification are initiated by the app but performed by
the Raspberry Pi hub, so removing that unused native dependency does not remove
verification functionality.
