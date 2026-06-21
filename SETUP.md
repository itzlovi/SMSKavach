# SMS Kavach - Setup & Run Guide

## Project Overview
This is a full-stack SMS spam detection system:
- **Backend**: Flask API (Python) - Port 5000
- **Frontend**: React Native with Expo

## Prerequisites
- Node.js installed
- Python 3 installed
- All dependencies already installed

## Running the Project

### Option 1: Run Both Services Together
```bash
npm run dev
```
This will start both the Flask backend and Expo frontend simultaneously.

### Option 2: Run Services Separately

**Backend (Flask API):**
```bash
npm run backend
# or directly: python python.py
```
Backend will be available at: http://localhost:5000

**Frontend (Expo):**
```bash
npm run frontend
# or: cd SMSKavach && npm start
```
Expo will prompt you to choose: web, android, or ios

### Frontend Platforms
```bash
npm run web      # Run in web browser
npm run android  # Run on Android emulator
npm run ios      # Run on iOS simulator
```

## API Endpoints Available

The Flask backend provides SMS analysis endpoints. Connect your frontend to `http://localhost:5000` for API calls.

## Troubleshooting

If you see port conflicts:
- Backend fights over port 5000: Check for other Flask instances
- Frontend fights over port 8081/19000: Expo will use alternative ports

## Project Structure
```
.
├── python.py              # Flask backend
├── requirements.txt       # Python dependencies
├── models/               # ML model files
└── SMSKavach/           # React Native frontend
```
