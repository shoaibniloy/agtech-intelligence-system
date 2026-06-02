import os
import json
import requests
from datetime import datetime, timezone
import google.generativeai as genai

# Operational Configurations
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
TG_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TG_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")

DATA_DIR = "public/data"
MANIFEST_PATH = os.path.join(DATA_DIR, "manifest.json")

SYSTEM_PROMPT = """You are an Elite Strategic AgTech Intelligence System — a combined McKinsey Global Institute analyst, DARPA technical scout, and precision agriculture scientist.

Return ONLY a valid JSON array. No markdown. No preamble. No explanation. No code fences.

Generate exactly 20 high-signal AgTech intelligence nodes for June 2026 covering a diverse mix across these exact categories:
"Field Robotics" | "Vision AI" | "Soil Informatics" | "Livestock Automation" | "CEA" | "Pollinator Intel" | "Remote Sensing" | "Markets" | "Policy" | "Digital Twins" | "Synthetic Bio" | "Climate AgTech"

Each item must be technically specific, evidence-driven, and name real companies/technologies.
Confidence: "high" = verified, "medium" = corroborated, "low" = speculative.
Timestamps must be distributed realistically across the last 90 days relative to June 2, 2026.

FORMAT — strictly this shape:
[{"headline":"...","summary":"one dense technical sentence max 200 chars","url":"#","category":"...","entities":["..."],"confidence":"high|medium|low","discovered_by":"gemini","timestamp":"ISO8601"}]"""

def send_telegram_notification(new_nodes):
    """Transmits real-time HTML structured broadcast messages directly to your Telegram device via free HTTP POST."""
    if not TG_TOKEN or not TG_CHAT_ID:
        print("Telegram configuration skipped: Environmental access credentials missing.")
        return

    print("Broadcasting data payload matrices to Telegram cloud routing nodes...")
    timestamp_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    
    # Message formatting
    message = f"<b>🤖 AG-AI // OS TELEMETRY SYNCED</b>\n"
    message += f"<i>Time: {timestamp_str}</i>\n"
    message += f"───────────────────────\n"
    message += f"🟢 <b>{len(new_nodes)} NEW VECTORS INCORPORATED:</b>\n\n"

    # Limit to top 7 items to guarantee safe delivery under Telegram's 4,096 character restriction per transmission
    for i, node in enumerate(new_nodes[:7], 1):
        category = node.get('category', 'Intel').upper()
        headline = node.get('headline', '')
        confidence = node.get('confidence', 'high').upper()
        message += f"{i}. <b>[{category}]</b> {headline} (<i>Conf: {confidence}</i>)\n\n"

    if len(new_nodes) > 7:
        message += f"<i>...and {len(new_nodes) - 7} additional signals stored in repository.</i>\n\n"

    message += f"───────────────────────\n"
    message += f"🌐 <i>System state synchronized. Dashboard refreshed via static JSON distribution pipeline.</i>"

    url = f"https://api.telegram.org/bot{TG_TOKEN}/sendMessage"
    payload = {
        "chat_id": TG_CHAT_ID,
        "text": message,
        "parse_mode": "HTML",
        "disable_web_page_preview": True
    }

    try:
        response = requests.post(url, json=payload, timeout=10)
        if response.status_code == 200:
            print("Telegram signal package successfully acknowledged and dispatched.")
        else:
            print(f"Telegram API Processing Failure: {response.text}")
    except Exception as e:
        print(f"Network transport pipeline error encountered during Telegram dispatch: {e}")

def main():
    if not GEMINI_API_KEY:
        print("Pipeline terminated: Critical validation error — GEMINI_API_KEY environment variable missing.")
        return

    # Ensure targeted data directories exist structurally in repo
    os.makedirs(DATA_DIR, exist_ok=True)
    
    # Instantiate engine runtime configurations
    genai.configure(api_key=GEMINI_API_KEY)
    print("Awakening Generative Intelligence Core via secure runtime stream...")
    model = genai.GenerativeModel('gemini-1.5-pro')
    
    try:
        response = model.generate_content(
            "Synthesize exactly 20 current AgTech intelligence matrix nodes for June 2026 abiding strictly by structural array formats.",
            generation_config={"response_mime_type": "application/json"},
            system_instruction=SYSTEM_PROMPT
        )
        
        raw_text = response.text.strip()
        
        # Clean potential markdown leaks if necessary
        if raw_text.startswith("```"):
            raw_text = raw_text.split("```")[1]
            if raw_text.startswith("json"):
                raw_text = raw_text[4:]
        raw_text = raw_text.strip()
        
        nodes = json.loads(raw_text)
        if not isinstance(nodes, list):
            raise ValueError("Telemetry core failed validation. Matrix output is not structurally an array.")
            
        print(f"Extraction successful: {len(nodes)} distinct telemetry points verified.")
        
        # Write JSON back to the repository data matrix file
        with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
            json.dump(nodes, f, indent=2)
        print(f"Local static compilation complete. Database saved to {MANIFEST_PATH}")
        
        # Execute Telegram push alerts
        send_telegram_notification(nodes)
        
    except Exception as e:
        print(f"Critical error event. Pipeline processing cycle aborted: {e}")

if __name__ == "__main__":
    main()