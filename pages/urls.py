from django.urls import path
from . import views

urlpatterns = [
    path('', views.home, name='home'),
    path('about/', views.about, name='about'),
    path('templates/', views.templates, name='templates'),
    path('pricing/', views.pricing, name='pricing'),
    path('contact/', views.contact, name='contact'),
]
