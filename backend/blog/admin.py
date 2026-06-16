from django.contrib import admin

from .models import (
    Category,
    Comment,
    IdempotencyKey,
    Post,
    PostRevision,
    Subscription,
    Tag,
)


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ("name", "slug")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ("title", "author", "status", "published_at", "view_count")
    list_filter = ("status", "category")
    search_fields = ("title", "content")
    raw_id_fields = ("author", "category")
    date_hierarchy = "created_at"


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ("post", "author", "moderation_status", "created_at")
    list_filter = ("moderation_status",)
    raw_id_fields = ("post", "author")


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ("subscriber", "author", "notification_method", "created_at")
    raw_id_fields = ("subscriber", "author")


admin.site.register(PostRevision)
admin.site.register(IdempotencyKey)
