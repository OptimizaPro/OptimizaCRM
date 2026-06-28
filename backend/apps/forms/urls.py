from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EmbedFormViewSet, form_public_config, form_public_submit

router = DefaultRouter()
router.register(r"forms", EmbedFormViewSet, basename="embedform")

urlpatterns = [
    path("", include(router.urls)),
    path("f/config/", form_public_config,  name="form-public-config"),
    path("f/submit/",  form_public_submit, name="form-public-submit"),
]
