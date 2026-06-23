"""Seed the curated default category set so the taxonomy is never empty.

Categories are a controlled taxonomy (one per post), so they're seeded here
rather than created ad-hoc by authors. Idempotent: re-running only adds the
ones that are missing. The historical Category model has no custom save(), so
the slug is set explicitly.
"""
from django.db import migrations
from django.utils.text import slugify

DEFAULT_CATEGORIES = ["Engineering", "Product", "Security", "Infrastructure"]


def seed_categories(apps, schema_editor):
    Category = apps.get_model("blog", "Category")
    for name in DEFAULT_CATEGORIES:
        Category.objects.get_or_create(name=name, defaults={"slug": slugify(name)})


class Migration(migrations.Migration):

    dependencies = [
        ("blog", "0003_add_public_uuids"),
    ]

    operations = [
        migrations.RunPython(seed_categories, migrations.RunPython.noop),
    ]
