# TEHNOCELL Platform — Android

Самостоятельная Android-оболочка для существующей TEHNOCELL Platform.

- Application ID: `com.tehnocell.platform`
- Min Android: 8.0 (API 26)
- Target SDK: 35
- Основной адрес: `https://technosotrudnik.github.io/tehnocell-indostri/`

Проект не импортирует и не использует исходники TENO или ENNIE. Сайт, его страницы и backend остаются источником данных и функциональности; приложение загружает их в WebView, сохраняя общую веб-сессию, историю переходов и выбор файлов.

Сборка локально из каталога `android-app`:
```bash
gradle assembleDebug
```

APK: `android-app/app/build/outputs/apk/debug/app-debug.apk`
