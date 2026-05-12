from django.urls import path

from . import views

urlpatterns = [
    path('register/', views.RegisterView.as_view(), name='register'),
    path('login/', views.LoginView.as_view(), name='login'),
    path('pin-login/', views.PinLoginView.as_view(), name='pin-login'),
    path('profile/', views.ProfileView.as_view(), name='profile'),
    path(
        'parental-control/',
        views.ParentalControlListCreateView.as_view(),
        name='parental-control-list',
    ),
    path(
        'parental-control/<int:pk>/',
        views.ParentalControlDetailView.as_view(),
        name='parental-control-detail',
    ),
    path(
        'url-rules/',
        views.CustomURLRuleListCreateView.as_view(),
        name='url-rules-list',
    ),
    path(
        'url-rules/<int:pk>/',
        views.CustomURLRuleDetailView.as_view(),
        name='url-rules-detail',
    ),
]
