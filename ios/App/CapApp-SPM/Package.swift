// swift-tools-version: 5.9
import PackageDescription

// DO NOT MODIFY THIS FILE - managed by Capacitor CLI commands
let package = Package(
    name: "CapApp-SPM",
    platforms: [.iOS(.v15)],
    products: [
        .library(
            name: "CapApp-SPM",
            targets: ["CapApp-SPM"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", exact: "8.4.2"),
        .package(name: "CapacitorFirebaseAnalytics", path: "../../../node_modules/.pnpm/@capacitor-firebase+analytics@8.4.0_@capacitor+core@8.4.2_firebase@12.17.1/node_modules/@capacitor-firebase/analytics"),
        .package(name: "CapacitorApp", path: "../../../node_modules/.pnpm/@capacitor+app@8.1.1_@capacitor+core@8.4.2/node_modules/@capacitor/app"),
        .package(name: "CapacitorBrowser", path: "../../../node_modules/.pnpm/@capacitor+browser@8.0.4_@capacitor+core@8.4.2/node_modules/@capacitor/browser"),
        .package(name: "CapacitorFilesystem", path: "../../../node_modules/.pnpm/@capacitor+filesystem@8.1.2_@capacitor+core@8.4.2/node_modules/@capacitor/filesystem"),
        .package(name: "CapacitorKeyboard", path: "../../../node_modules/.pnpm/@capacitor+keyboard@8.0.5_@capacitor+core@8.4.2/node_modules/@capacitor/keyboard"),
        .package(name: "CapacitorPreferences", path: "../../../node_modules/.pnpm/@capacitor+preferences@8.0.1_@capacitor+core@8.4.2/node_modules/@capacitor/preferences"),
        .package(name: "CapacitorShare", path: "../../../node_modules/.pnpm/@capacitor+share@8.0.1_@capacitor+core@8.4.2/node_modules/@capacitor/share")
    ],
    targets: [
        .target(
            name: "CapApp-SPM",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm"),
                .product(name: "CapacitorFirebaseAnalytics", package: "CapacitorFirebaseAnalytics"),
                .product(name: "CapacitorApp", package: "CapacitorApp"),
                .product(name: "CapacitorBrowser", package: "CapacitorBrowser"),
                .product(name: "CapacitorFilesystem", package: "CapacitorFilesystem"),
                .product(name: "CapacitorKeyboard", package: "CapacitorKeyboard"),
                .product(name: "CapacitorPreferences", package: "CapacitorPreferences"),
                .product(name: "CapacitorShare", package: "CapacitorShare")
            ]
        )
    ]
)
