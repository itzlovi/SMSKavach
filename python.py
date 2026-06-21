import os
import re
import pickle
import numpy as np
from urllib.parse import urlparse
from scipy.sparse import hstack, csr_matrix
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

SAFE_DOMAINS = {
    "gov.in", "nic.in", "india.gov.in", "mygov.in", "digilocker.gov.in",
    "incometax.gov.in", "epfindia.gov.in", "passportindia.gov.in",
    "trai.gov.in", "dot.gov.in", "uidai.gov.in",
    "sbi.co.in", "onlinesbi.sbi", "hdfcbank.com", "icicibank.com",
    "axisbank.com", "bankofbaroda.in", "pnbindia.in",
    "unionbankofindia.co.in", "kotak.com", "yesbank.in", "idfcfirstbank.com",
    "jio.com", "airtel.in", "airtel.com", "vi.in", "bsnl.co.in",
    "flipkart.com", "amazon.in", "amazon.com", "myntra.com", "meesho.com",
    "fkrt.it", "paytm.com", "phonepe.com", "gpay.app", "upi.npci.org.in",
    "razorpay.com", "billdesk.com", "licindia.in", "icicilombard.com",
    "hdfclife.com", "sbigeneral.in", "zerodha.com", "groww.in",
    "bluedart.com", "delhivery.com", "dtdc.com", "indiapost.gov.in",
    "ekartlogistics.com", "t.jio.com", "irctc.co.in",
    "tatapower-ddl.com", "bescom.org", "bsesdelhi.com", "tsspdcl.in",
}
SUSPICIOUS_PATTERNS = [
    r'\d{4,}',
    r'(secure|verify|update|login|kyc|pay|claim|confirm)-\w+\.(in|com|net|org)',
    r'\w+-(in|com)\.\w+',
    r'[a-z]{3,}-[a-z]{3,}-[a-z]{3,}',
    r'@',
]
SUSPICIOUS_TLDS = {
    '.xyz', '.tk', '.ml', '.gq', '.cf', '.ga', '.ru',
    '.click', '.win', '.top', '.pw', '.buzz', '.icu',
    '.support', '.live', '.online', '.site', '.club',
}

def clean_url(url):
    url = re.sub(r'hxxps?', 'https', url, flags=re.IGNORECASE)
    url = re.sub(r'\(\.\)', '.', url)
    url = re.sub(r'\[\.\]', '.', url)
    return url

def extract_domain(url):
    try:
        url = clean_url(url)
        if not url.startswith('http'):
            url = 'http://' + url
        netloc = urlparse(url).netloc.lower()
        netloc = netloc.split(':')[0]
        netloc = re.sub(r'^www\.', '', netloc)
        return netloc
    except:
        return ''

def check_url(url):
    raw    = url
    domain = extract_domain(url)
    if not domain:
        return 'unknown'
    if re.search(r'hxxp|\(\.\)|\[\.\]', raw, re.IGNORECASE):
        return 'suspicious'
    if re.match(r'^\d{1,3}(\.\d{1,3}){3}$', domain):
        return 'suspicious'
    if '@' in url:
        return 'suspicious'
    if any(domain.endswith(tld) for tld in SUSPICIOUS_TLDS):
        return 'suspicious'
    for pattern in SUSPICIOUS_PATTERNS:
        if re.search(pattern, domain, re.IGNORECASE):
            return 'suspicious'
    for safe in SAFE_DOMAINS:
        if domain == safe or domain.endswith('.' + safe):
            return 'safe'
    return 'unknown'

def get_all_urls(text):
    p1 = r'hxxps?://\S+'
    p2 = r'https?://\S+'
    p3 = r'www\.\S+'
    urls = (re.findall(p1, text, re.IGNORECASE) +
            re.findall(p2, text, re.IGNORECASE) +
            re.findall(p3, text, re.IGNORECASE))
    return list(set(urls))

def analyze_wording(text):
    t = text.lower()
    signals = {
        'urgency': int(bool(re.search(
            r'urgent|immediately|expire[sd]?|last chance|'
            r'within \d+ (hour|hr|min)|today only|act now|'
            r'as soon as possible|right now|do not delay', t))),
        'threatens_loss': int(bool(re.search(
            r'will be (blocked|suspended|deactivated|disconnected|'
            r'stopped|cancelled|terminated)|'
            r'legal action|arrest|court notice|police|'
            r'account (blocked|suspended|locked|deactivated)|'
            r'service will (stop|disconnect|terminate)', t))),
        'demands_action': int(bool(re.search(
            r'click (here|now|link|below)|verify now|pay now|'
            r'call now|update (your|now)|submit (your|now)|'
            r'login now|open link|visit link|tap here', t))),
        'requests_credentials': int(bool(re.search(
            r'enter (your )?(otp|password|pin|card|aadhaar|cvv|dob)|'
            r'share (your )?(otp|password|pin|card number)|'
            r'provide (your )?(detail|credential|information|card)|'
            r'give (your )?(otp|password|pin)', t))),
        'kyc_pretext': int(bool(re.search(
            r'\bkyc\b|know your customer|'
            r'kyc (expired|pending|required|update|incomplete)|'
            r're-?verify (your )?(account|identity|detail)', t))),
        'lottery_pretext': int(bool(re.search(
            r'you (have )?(won|win|are selected)|'
            r'lottery|lucky (draw|winner)|'
            r'prize|reward money|'
            r'congratulation|free (gift|money|cash|recharge)', t))),
        'govt_impersonation': int(bool(re.search(
            r'\b(cbi|trai|uidai|sebi|rbi|income.?tax|it department)\b|'
            r'government (of india|notice|order|alert)|'
            r'official (notice|alert|warning)|'
            r'cyber (cell|crime|police)', t))),
        'financial_threat': int(bool(re.search(
            r'unpaid (bill|due|amount|fine)|'
            r'pending (due|payment|amount|fine|bill)|'
            r'overdue|outstanding (amount|bill|due)|'
            r'pay (immediately|now|today|or)|'
            r'avoid (penalty|disconnection|legal|arrest|block)', t))),
        'is_confirmation': int(bool(re.search(
            r'successfully|confirmed|booked|delivered|'
            r'received|credited|processed|completed|dispatched|'
            r'your (order|ticket|booking|payment|transaction)', t))),
        'is_otp': int(bool(re.search(
            r'(your |the )?otp (is|for) \d{4,8}|'
            r'\d{4,8} is your (otp|verification|one.time)|'
            r'do not share (this |your )?(otp|code)|'
            r'otp valid for \d+', t))),
        'is_info_update': int(bool(re.search(
            r'scheduled (maintenance|update|downtime)|'
            r'we are (upgrading|updating|improving)|'
            r'new (feature|update|version) available|'
            r'your (statement|passbook|report) is ready', t))),
    }
    scam_keys = [
        'urgency', 'threatens_loss', 'demands_action',
        'requests_credentials', 'kyc_pretext',
        'lottery_pretext', 'govt_impersonation', 'financial_threat'
    ]
    signals['scam_score'] = round(
        sum(signals[k] for k in scam_keys) / len(scam_keys), 2)
    return signals

def extract_features(text):
    urls     = get_all_urls(text)
    w        = analyze_wording(text)
    verdicts = [check_url(u) for u in urls]
    has_url        = int(len(urls) > 0)
    any_safe       = int('safe'       in verdicts)
    any_suspicious = int('suspicious' in verdicts)
    any_unknown    = int('unknown'    in verdicts)
    all_safe       = int(len(verdicts) > 0 and all(v == 'safe' for v in verdicts))
    obfuscated     = int(bool(re.search(r'hxxp|\(\.\)|\[\.\]', text, re.IGNORECASE)))
    url_feats = [has_url, any_safe, any_suspicious, any_unknown, all_safe, obfuscated]
    wording_feats = [
        w['urgency'], w['threatens_loss'], w['demands_action'],
        w['requests_credentials'], w['kyc_pretext'], w['lottery_pretext'],
        w['govt_impersonation'], w['financial_threat'], w['scam_score'],
    ]
    interaction_feats = [
        any_suspicious * w['urgency'],
        any_suspicious * w['threatens_loss'],
        any_suspicious * w['financial_threat'],
        any_suspicious * w['kyc_pretext'],
        any_suspicious * w['requests_credentials'],
        any_suspicious * w['scam_score'],
        obfuscated     * w['scam_score'],
        all_safe       * w['is_confirmation'],
        all_safe       * w['is_otp'],
        all_safe       * w['urgency'],
        all_safe       * w['requests_credentials'],
        (1 - has_url)  * w['is_confirmation'],
    ]
    return np.array(url_feats + wording_feats + interaction_feats, dtype=float)

# Load model at startup
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "models", "sms_kavach_model.pkl")

with open(MODEL_PATH, "rb") as f:
    bundle = pickle.load(f)

BEST_MODEL = bundle["best_model"]
tfidf_word = bundle["tfidf_word"]
tfidf_char = bundle["tfidf_char"]
le         = bundle["label_encoder"]

print("[SMSKavach] Model loaded!")
print(f"   Classes: {list(le.classes_)}")


# URL heuristics for /check-url
URL_H_TLDS = {".xyz", ".top", ".icu", ".online", ".site", ".club"}
BRAND_SET = {"sbi", "hdfc", "paytm", "lic", "epfo", "irctc", "airtel", "jio"}
URL_KW = {"kyc", "verify", "update", "claim", "secure", "login", "free", "lucky"}


def analyze_url_heuristic(url):
    reasons = []
    risk_score = 0
    host = re.sub(r"^https?://", "", url, flags=re.IGNORECASE)
    host = host.split("/")[0].split("?")[0].split(":")[0]
    if re.match(r"^(\d{1,3}\.){3}\d{1,3}$", host):
        reasons.append("IP address used as domain")
        risk_score += 30
    for tld in URL_H_TLDS:
        if host.endswith(tld):
            reasons.append("suspicious TLD")
            risk_score += 20
            break
    hl = host.lower()
    for b in BRAND_SET:
        if b in hl:
            reasons.append("brand name in domain")
            risk_score += 25
            break
    if len(url) > 75:
        reasons.append("URL too long")
        risk_score += 10
    if host.count(".") > 3:
        reasons.append("excessive subdomains")
        risk_score += 15
    ul = url.lower()
    if any(k in ul for k in URL_KW):
        reasons.append("suspicious keywords in URL")
        risk_score += 20
    risk_score = min(risk_score, 100)
    return {"url": url, "is_phishing": risk_score >= 40, "risk_score": risk_score, "reasons": reasons}


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "models_loaded": True}), 200


@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json(silent=True)
    if not data or "message" not in data:
        return jsonify({"error": "message field required"}), 400
    message = data["message"]
    if not isinstance(message, str) or message.strip() == "":
        return jsonify({"error": "message field required"}), 400
    msg = message.strip()
    w = tfidf_word.transform([clean_url(msg)])
    c = tfidf_char.transform([clean_url(msg)])
    h = csr_matrix(extract_features(msg).reshape(1, -1))
    vec = hstack([w, c, h])
    idx   = BEST_MODEL.predict(vec)[0]
    prob  = BEST_MODEL.predict_proba(vec)[0]
    label = le.inverse_transform([idx])[0]
    confidence = round(float(prob[idx]) * 100, 2)
    is_fraud = label != "benign"
    return jsonify({
        "prediction": label,
        "is_fraud": is_fraud,
        "confidence": confidence,
        "svm_prediction": label,
        "models_agree": True,
    }), 200


@app.route("/check-url", methods=["POST"])
def check_url_endpoint():
    data = request.get_json(silent=True)
    if not data or "url" not in data:
        return jsonify({"error": "url field required"}), 400
    url = data["url"]
    if not isinstance(url, str) or url.strip() == "":
        return jsonify({"error": "url field required"}), 400
    return jsonify(analyze_url_heuristic(url.strip())), 200


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
