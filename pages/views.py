from django.shortcuts import redirect, render
from django.urls import reverse

from .models import CustomerInquiry, HomeContent, WebsiteTemplate


def home(request):
    content = HomeContent.objects.first()
    return render(
        request,
        'pages/home.html',
        {
            'home_content': content,
        },
    )


def about(request):
    return render(request, 'pages/about.html')


def templates(request):
    templates_qs = WebsiteTemplate.objects.all()
    return render(
        request,
        'pages/templates.html',
        {
            'templates': templates_qs,
        },
    )


def contact(request):
    if request.method == 'POST':
        name = request.POST.get('name', '').strip()
        email = request.POST.get('email', '').strip()
        subject = request.POST.get('subject', '').strip()
        message = request.POST.get('message', '').strip()

        # Optional tracking info from query string
        template_slug = request.GET.get('template') or ''
        plan = request.GET.get('plan') or ''

        template_obj = None
        if template_slug:
            template_obj = WebsiteTemplate.objects.filter(
                slug=template_slug
            ).first()

        inquiry = CustomerInquiry(
            name=name,
            email=email,
            subject=subject,
            message=message,
            template=template_obj,
            plan=plan,
            page=request.path,
            ip_address=request.META.get('REMOTE_ADDR') or None,
            user_agent=request.META.get('HTTP_USER_AGENT', '')[:255],
        )
        inquiry.save()

        # Redirect to avoid resubmission on refresh
        return redirect(f"{reverse('contact')}?sent=1")

    sent = request.GET.get('sent') == '1'
    return render(request, 'pages/contact.html', {'sent': sent})
