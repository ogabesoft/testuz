from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import NotificationSettingView, QuestionViewSet, TestAttemptView

router = DefaultRouter()
router.register('questions', QuestionViewSet, basename='question')


urlpatterns = [
    path('', include(router.urls)),
    path('attempts/', TestAttemptView.as_view(), name='attempts'),
    path('notification/', NotificationSettingView.as_view(), name='notification'),
]
