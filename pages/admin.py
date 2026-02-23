from django.contrib import admin

from .models import CustomerInquiry, HomeContent, WebsiteTemplate


@admin.register(WebsiteTemplate)
class WebsiteTemplateAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'is_featured', 'created_at')
    list_filter = ('is_featured', 'created_at')
    search_fields = ('name', 'slug', 'short_description')
    prepopulated_fields = {'slug': ('name',)}


@admin.register(HomeContent)
class HomeContentAdmin(admin.ModelAdmin):
    list_display = ('hero_title', 'updated_at')


@admin.register(CustomerInquiry)
class CustomerInquiryAdmin(admin.ModelAdmin):
    list_display = ('name', 'email', 'template', 'plan', 'created_at')
    list_filter = ('created_at', 'template', 'plan')
    search_fields = ('name', 'email', 'subject', 'message')
    readonly_fields = ('ip_address', 'user_agent', 'created_at')

