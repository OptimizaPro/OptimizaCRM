"""
Optimiza-CRM – AI Integration URL conf
Copyright (c) 2024-2025 Nelson Alvarez / OptimizaPro
"""

from django.urls import path
from .views import (
    WritingAssistantView,
    LeadScoreView,
    ChurnPredictView,
    RevenueForecastView,
    FollowUpRecommendationView,
    SentimentAnalysisView,
    CallBriefingView,
    AIUsageView,
)

urlpatterns = [
    path("ai/writing/",      WritingAssistantView.as_view(),        name="ai-writing"),
    path("ai/lead-score/",   LeadScoreView.as_view(),               name="ai-lead-score"),
    path("ai/churn/",        ChurnPredictView.as_view(),            name="ai-churn"),
    path("ai/forecast/",     RevenueForecastView.as_view(),         name="ai-forecast"),
    path("ai/follow-up/",    FollowUpRecommendationView.as_view(),  name="ai-follow-up"),
    path("ai/sentiment/",    SentimentAnalysisView.as_view(),       name="ai-sentiment"),
    path("ai/briefing/",     CallBriefingView.as_view(),            name="ai-briefing"),
    path("ai/usage/",        AIUsageView.as_view(),                 name="ai-usage"),
]
