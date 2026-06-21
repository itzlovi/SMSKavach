"""
Test sms_kavach_model on a CSV file.

Usage:
    python test_csv.py your_file.csv

CSV must have columns: 'message' (or 'text' or 'sms') and optionally 'label' (or 'category')
Results saved to: test_results.csv
"""

import sys, os, pickle, re, csv
import numpy as np
from urllib.parse import urlparse
from scipy.sparse import hstack, csr_matrix

# ── Load helper functions (same as python.py) ──────────────────
# Copy the exact feature engineering from the helper file
exec(open(os.path.join("models", "sms_kavach (1).py"), encoding="utf-8").read().split("# ── Load model")[0])

# ── Load model ──────────────────────────────────────────────────
with open("models/sms_kavach_model.pkl", "rb") as f:
    bundle = pickle.load(f)

BEST_MODEL = bundle["best_model"]
tfidf_word = bundle["tfidf_word"]
tfidf_char = bundle["tfidf_char"]
le         = bundle["label_encoder"]
print(f"Model loaded. Classes: {list(le.classes_)}")

# ── Read CSV ────────────────────────────────────────────────────
csv_path = sys.argv[1] if len(sys.argv) > 1 else "test(1).csv"
if not os.path.exists(csv_path):
    print(f"ERROR: File '{csv_path}' not found!")
    sys.exit(1)

import pandas as pd
df = pd.read_csv(csv_path)

# Auto-detect message column
msg_col = None
for col in ["message", "text", "sms", "Message", "Text", "SMS", "msg", "message_text"]:
    if col in df.columns:
        msg_col = col
        break
if not msg_col:
    print(f"ERROR: No message column found. Columns: {list(df.columns)}")
    sys.exit(1)

# Auto-detect label column (optional)
label_col = None
for col in ["label", "category", "Label", "Category", "class", "Class", "type", "class_label"]:
    if col in df.columns:
        label_col = col
        break

print(f"Using message column: '{msg_col}'")
if label_col:
    print(f"Using label column: '{label_col}' (will compare)")
print(f"Total rows: {len(df)}\n")

# ── Predict ─────────────────────────────────────────────────────
predictions = []
correct = 0
total = 0

for i, row in df.iterrows():
    msg = str(row[msg_col]).strip()
    if not msg or msg == "nan":
        predictions.append({"prediction": "skip", "confidence": 0, "is_fraud": False})
        continue

    w = tfidf_word.transform([clean_url(msg)])
    c = tfidf_char.transform([clean_url(msg)])
    h = csr_matrix(extract_features(msg).reshape(1, -1))
    vec = hstack([w, c, h])

    idx   = BEST_MODEL.predict(vec)[0]
    prob  = BEST_MODEL.predict_proba(vec)[0]
    label = le.inverse_transform([idx])[0]
    conf  = round(float(prob[idx]) * 100, 2)

    predictions.append({
        "prediction": label,
        "confidence": conf,
        "is_fraud": label != "benign",
    })

    if label_col:
        true_label = str(row[label_col]).strip().lower()
        pred_lower = label.lower()
        # Match: both benign, or both non-benign
        if true_label == pred_lower or (true_label in ["ham","safe","normal","legitimate"] and pred_lower == "benign"):
            correct += 1
        elif true_label not in ["ham","safe","normal","legitimate","benign"] and pred_lower != "benign":
            correct += 1
        total += 1

    if (i + 1) % 100 == 0:
        print(f"  Processed {i+1}/{len(df)}...")

# ── Save results ────────────────────────────────────────────────
df["predicted_label"] = [p["prediction"] for p in predictions]
df["confidence"] = [p["confidence"] for p in predictions]
df["is_fraud"] = [p["is_fraud"] for p in predictions]

out_path = "test_results.csv"
df.to_csv(out_path, index=False)

# ── Print summary ───────────────────────────────────────────────
fraud_count = sum(1 for p in predictions if p["is_fraud"])
safe_count  = sum(1 for p in predictions if not p["is_fraud"] and p["prediction"] != "skip")

print(f"\n{'='*50}")
print(f"RESULTS SUMMARY")
print(f"{'='*50}")
print(f"Total messages:  {len(df)}")
print(f"Safe (benign):   {safe_count}")
print(f"Fraud detected:  {fraud_count}")

# Label distribution
from collections import Counter
dist = Counter(p["prediction"] for p in predictions if p["prediction"] != "skip")
print(f"\nLabel distribution:")
for lbl, cnt in dist.most_common():
    print(f"  {lbl:25s} → {cnt}")

# ── Metrics (only if labels exist) ──────────────────────────────
if label_col and total > 0:
    from sklearn.metrics import (
        accuracy_score, precision_score, recall_score, f1_score,
        confusion_matrix, classification_report
    )

    SAFE_LABELS = {"ham", "safe", "normal", "legitimate", "benign"}

    y_true_raw = []
    y_pred_raw = []
    y_true_bin = []  # 0=safe, 1=fraud
    y_pred_bin = []

    for i, row in df.iterrows():
        pred = predictions[i]["prediction"]
        if pred == "skip":
            continue
        true = str(row[label_col]).strip().lower()
        y_true_raw.append(true)
        y_pred_raw.append(pred.lower())
        y_true_bin.append(0 if true in SAFE_LABELS else 1)
        y_pred_bin.append(0 if pred.lower() in SAFE_LABELS else 1)

    # ── Binary metrics (fraud vs safe) ──────────────────────────
    acc  = accuracy_score(y_true_bin, y_pred_bin)
    prec = precision_score(y_true_bin, y_pred_bin, zero_division=0)
    rec  = recall_score(y_true_bin, y_pred_bin, zero_division=0)
    f1   = f1_score(y_true_bin, y_pred_bin, zero_division=0)

    cm = confusion_matrix(y_true_bin, y_pred_bin, labels=[0, 1])
    tn, fp, fn, tp = cm.ravel()
    fpr = round(fp / (fp + tn) * 100, 2) if (fp + tn) > 0 else 0

    print(f"\n{'='*50}")
    print(f"BINARY METRICS (Fraud vs Safe)")
    print(f"{'='*50}")
    print(f"Accuracy:         {round(acc * 100, 2)}%")
    print(f"Precision:        {round(prec * 100, 2)}%")
    print(f"Recall:           {round(rec * 100, 2)}%")
    print(f"F1 Score:         {round(f1 * 100, 2)}%")
    print(f"False Positive Rate: {fpr}%")
    print(f"\nConfusion Matrix:")
    print(f"                  Predicted Safe   Predicted Fraud")
    print(f"  Actual Safe       {tn:5d}            {fp:5d}")
    print(f"  Actual Fraud      {fn:5d}            {tp:5d}")

    # ── Per-class metrics ───────────────────────────────────────
    all_labels = sorted(set(y_true_raw + y_pred_raw))
    print(f"\n{'='*50}")
    print(f"PER-CLASS REPORT")
    print(f"{'='*50}")
    print(classification_report(y_true_raw, y_pred_raw, labels=all_labels, zero_division=0))

print(f"\nResults saved to: {out_path}")

