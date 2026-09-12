# Harbor Lane Android app

This is the native Kotlin/Jetpack Compose shopping client for the V1 storefront API.

## Run

Open `mobile-android` in Android Studio, or run:

```bash
./gradlew :app:assembleDebug
```

The emulator default points to `http://10.0.2.2:8080/api/`, which reaches the local API server from an Android emulator. Local HTTP is enabled for development in the manifest. For a hosted environment, add an HTTPS value to `mobile-android/gradle.properties`:

```properties
apiBaseUrl=https://your-domain.example/api/
```

## V1 boundary

`data/StorefrontApi.kt` is intentionally the only HTTP contract used by the UI. A future V2 client can implement the same repository surface while the shopping experience remains stable.