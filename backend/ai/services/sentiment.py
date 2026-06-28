"""
Optimiza-CRM – Sentiment Analysis service
Copyright (c) 2024-2025 Nelson Alvarez / OptimizaPro
"""

_POSITIVE: frozenset[str] = frozenset({
    "excelente", "feliz", "satisfecho", "encanta", "genial", "increíble", "maravilloso",
    "fantástico", "perfecto", "gracias", "agradezco", "bueno", "mejor", "emocionado",
    "complacido", "recomiendo", "impresionado", "útil", "sobresaliente",
    "great", "excellent", "happy", "satisfied", "love", "amazing", "wonderful",
    "fantastic", "perfect", "thank", "thanks", "appreciate", "good", "best",
    "excited", "pleased", "recommend", "impressed", "helpful", "outstanding",
})
_NEGATIVE: frozenset[str] = frozenset({
    "malo", "terrible", "horrible", "decepcionado", "frustrado", "enojado", "molesto",
    "infeliz", "pésimo", "odio", "queja", "problema", "roto", "falló", "cancelar",
    "reembolso", "lento", "deficiente",
    "bad", "terrible", "awful", "horrible", "disappointed", "frustrated",
    "angry", "upset", "unhappy", "poor", "worst", "hate", "complaint",
    "issue", "problem", "broken", "failed", "cancel", "refund", "slow",
})


def analyze_sentiment(text: str) -> dict:
    words          = set(text.lower().split())
    positive_count = len(words & _POSITIVE)
    negative_count = len(words & _NEGATIVE)
    total          = positive_count + negative_count

    if total == 0:
        sentiment, score, confidence = "neutral",  0.0, 0.5
    elif positive_count > negative_count:
        score      = min(1.0, positive_count / max(total, 1))
        sentiment  = "positive"
        confidence = min(0.95, 0.6 + score * 0.3)
    elif negative_count > positive_count:
        score      = -min(1.0, negative_count / max(total, 1))
        sentiment  = "negative"
        confidence = min(0.95, 0.6 + abs(score) * 0.3)
    else:
        sentiment, score, confidence = "neutral", 0.0, 0.7

    return {
        "sentiment":        sentiment,
        "score":            round(score, 3),
        "confidence":       round(confidence, 3),
        "positive_signals": positive_count,
        "negative_signals": negative_count,
        "model":            "rule_based_sentiment_v1",
    }
