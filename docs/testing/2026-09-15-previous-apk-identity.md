# Previous Android APK identity — 2026-09-15

Status: **historical files verified; installed-phone identity unconfirmed**.

## Files examined

Historical source filenames are recorded below. They are not evidence of which
file the user's phone currently has installed.

| Historical source | APK bytes | SHA-256 | Embedded JS bundle bytes |
| --- | ---: | --- | ---: |
| `downloads/Atlas-Mobile-Preview-Android.apk`; identical to `apk-zh-registration/app-release.apk` | 97,027,012 | `4a62f2ae05c9bb602fede9fcc37f2f7f207e4f6046647cba2919a84945910c86` | 2,779,548 |
| `apk-release/app-release.apk` | 97,019,120 | `3491693e403936187fff2403de1ea3eff7a92f85ad65583339e0f2496b966c8a` | 2,771,656 |

Both archives contain `assets/index.android.bundle` and native libraries for
`arm64-v8a`, `armeabi-v7a`, `x86` and `x86_64`. Their SHA-256 hashes were unchanged
after this read-only inspection. Invalid ZIP files with similar filenames were
excluded.

## Official tool verification

The checks used Android SDK Build Tools **35.0.0**, downloaded from Google's
[official archive](https://dl.google.com/android/repository/build-tools_r35_linux.zip).
The download matched the official SDK repository metadata: 61,958,799 bytes and
SHA-1 `2cfaa0bbb2336e9ec18ed3ecea84fa2e2af607bc`. Its SHA-256 was
`bd3a4966912eb8b30ed0d00b0cda6b6543b949d5ffe00bea54c04c81e1561d88`.

For each distinct APK, `apksigner verify --verbose --print-certs` and
`aapt dump badging` exited **0**. No signing or package modification was performed.

| Property | Result for both APKs |
| --- | --- |
| Signature integrity | `Verifies` |
| Signature scheme | v2: **true**; v1, v3, v3.1 and v4: false |
| Signer count | 1 |
| Certificate identity | `CN=Android Debug, OU=Android, O=Unknown, L=Unknown, ST=Unknown, C=US` |
| Certificate SHA-256 | `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c` |
| Signing public key | RSA, 2048 bits |
| Package | `com.libinghong.atlasmobile.preview` |
| versionCode / versionName | `1` / `0.1.0` |
| minSdk / targetSdk | `24` / `36` |
| Debuggable application | No `application-debuggable` flag in badging |

The APKs share the same Android Debug signing certificate. A release build can
use a debug certificate; the absence of the debuggable flag does not establish a
dedicated release-signing identity. A missing JAR signature is not a failed check:
the official verifier accepted these APKs through their v2 signatures.

## Limits and next phone-delivery gate

- These findings establish the identity of the two retained files. They do not
  establish the bytes, version or certificate installed on the user's phone.
  No installation, upgrade, launch or ARM-device test was performed here.
- Before promising an in-place upgrade that preserves data, identify the
  installed baseline and compare its package and signing certificate with the
  final candidate. Do not replace this check with an instruction to uninstall.
- Set an explicit, increasing Android versionCode after confirming that
  baseline. Use a value greater than `1` for a newer candidate based on either
  retained APK; another installed version may require more.
- Verify the **final APK bytes** before handoff: accepted source revision, API
  origin, package/version, valid signature and matching certificate, embedded
  bundle, supported ARM libraries and SHA-256. Any change after verification
  requires verification again. Complete standalone cold launch and the relevant
  ARM-device/business acceptance; x86 emulator success does not satisfy them.
- No signing key was generated or extracted. No APK, SDK binary or signing
  material is included in this repository report or uploaded for this audit.

References: [Android signature verification](https://developer.android.com/tools/apksigner),
[app signing and updates](https://developer.android.com/studio/publish/app-signing),
[Android versioning](https://developer.android.com/studio/publish/versioning).
