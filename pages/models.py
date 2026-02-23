from django.db import models


class WebsiteTemplate(models.Model):
    name = models.CharField(max_length=120)
    slug = models.SlugField(unique=True)
    short_description = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    icon = models.CharField(
        max_length=4,
        blank=True,
        help_text="Optional emoji or short label shown in the thumbnail.",
    )
    is_featured = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-is_featured', 'name']

    def __str__(self) -> str:
        return self.name


class HomeContent(models.Model):
    hero_tagline = models.CharField(
        max_length=120, default="Web Design & Development"
    )
    hero_title = models.CharField(
        max_length=160, default="Launch Your Website in Days"
    )
    hero_paragraph = models.TextField(
        default=(
            "I provide professionally designed pre-built websites that help "
            "businesses go online quickly. No long development time. "
            "No high cost. Just ready-to-use solutions."
        )
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Home content"
        verbose_name_plural = "Home content"

    def __str__(self) -> str:
        return "Home page content"


class CustomerInquiry(models.Model):
    name = models.CharField(max_length=120)
    email = models.EmailField()
    subject = models.CharField(max_length=160, blank=True)
    message = models.TextField()

    template = models.ForeignKey(
        WebsiteTemplate,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        help_text="Template the customer is interested in (if any).",
    )
    plan = models.CharField(
        max_length=80,
        blank=True,
        help_text="Optional plan / offer code (from URL query).",
    )
    page = models.CharField(
        max_length=120,
        blank=True,
        help_text="Page where the inquiry was submitted.",
    )

    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=255, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self) -> str:
        return f"{self.name} – {self.email} – {self.created_at:%Y-%m-%d}"
