# SMS Kavach

An AI-powered SMS phishing detection app for Android. It automatically scans incoming messages and filters out phishing, scam, and spam content — keeping your inbox clean and safe.

## How It Works

SMS Kavach runs a trained machine learning model that analyzes every incoming SMS in real-time. Suspicious messages are automatically moved to a spam folder, while safe messages appear normally in your inbox.

Everything runs locally on your device. No data is sent to any external server or cloud service.

## Features

- Real-time SMS scanning and classification
- Automatic phishing and spam filtering
- Background message interception (works even when app is closed)
- Spam folder with swipe-to-restore and delete
- Message detail view with classification info
- Fully offline — no internet required

## Download

Download the latest APK from the [Releases](../../releases) page, install it on your Android device, and grant SMS permissions when prompted.

## ML Model

The classification model was built using a combination of **Linear Regression**, **Logistic Regression**, and ensemble methods trained on a dataset of real-world Indian SMS messages — including phishing attempts targeting banking (KYC scams, OTP theft), fake government notices, lottery fraud, and credential harvesting.

The model uses TF-IDF text vectorization along with hand-crafted features like URL analysis, urgency detection, and credential request patterns to achieve high accuracy across multiple phishing categories.

## Privacy

- All processing happens on-device
- No cloud services or external APIs
- No data collection
- Messages never leave your phone

## Permissions

The app requires SMS read and receive permissions to scan and classify incoming messages.

> **Note:** Google Play restricts SMS permissions to default SMS apps. This app is intended for research and hackathon use.

---
