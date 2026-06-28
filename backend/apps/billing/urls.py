from django.urls import path
from .views import AddOnListView, PlanListView, SubscriptionView, CreateCheckoutView, CreateAddonCheckoutView, WebhookView

urlpatterns = [
    path("billing/plans/",          PlanListView.as_view(),             name="billing-plans"),
    path("billing/addons/",         AddOnListView.as_view(),            name="billing-addons"),
    path("billing/subscription/",   SubscriptionView.as_view(),         name="billing-subscription"),
    path("billing/checkout/",       CreateCheckoutView.as_view(),       name="billing-checkout"),
    path("billing/addon-checkout/", CreateAddonCheckoutView.as_view(),  name="billing-addon-checkout"),
    path("billing/webhook/",        WebhookView.as_view(),              name="billing-webhook"),
]
