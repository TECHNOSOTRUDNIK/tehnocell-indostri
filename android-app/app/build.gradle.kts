plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

val ciVersionCode = providers.gradleProperty("ciVersionCode").orNull?.toIntOrNull() ?: 1

android {
    namespace = "com.tehnocell.platform"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.tehnocell.platform"
        minSdk = 26
        targetSdk = 35
        versionCode = ciVersionCode
        versionName = "1.0.$ciVersionCode"
    }

    signingConfigs {
        create("persistent") {
            val keystorePath = System.getenv("ANDROID_KEYSTORE_PATH")
                ?: error("ANDROID_KEYSTORE_PATH is not configured")
            storeFile = file(keystorePath)
            storePassword = System.getenv("ANDROID_KEYSTORE_PASSWORD")
                ?: error("ANDROID_KEYSTORE_PASSWORD secret is missing")
            keyAlias = System.getenv("ANDROID_KEY_ALIAS")
                ?: error("ANDROID_KEY_ALIAS secret is missing")
            keyPassword = System.getenv("ANDROID_KEY_PASSWORD")
                ?: error("ANDROID_KEY_PASSWORD secret is missing")
        }
    }

    buildTypes {
        getByName("debug") {
            // Keep the same signing identity for every installable CI build.
            signingConfig = signingConfigs.getByName("persistent")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}

dependencies {
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.activity:activity-ktx:1.10.0")
}
