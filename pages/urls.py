from django.urls import path
from . import views

urlpatterns = [
    path('', views.home, name='home'),
    path('about/', views.about, name='about'),
    path('templates/', views.templates, name='templates'),
    path('contact/', views.contact, name='contact'),
]
