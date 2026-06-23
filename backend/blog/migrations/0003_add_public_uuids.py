"""Add a public, non-enumerable ``uuid`` to the API-exposed blog models.

Three steps so it is safe whether or not the table already has rows:
  1. add the column nullable (no unique constraint yet),
  2. backfill a distinct uuid per existing row,
  3. enforce ``unique`` + a default for future inserts.

PostView and IdempotencyKey are intentionally excluded — they are internal
infra never addressed by id externally, and a unique uuid index on the per-view
PostView log would tax the hottest write path.
"""
import uuid

from django.db import migrations, models

BLOG_MODELS = [
    "Category",
    "Tag",
    "Post",
    "Comment",
    "Subscription",
    "PostRevision",
    "ActivityEvent",
    "Webhook",
]


def backfill_uuids(apps, schema_editor):
    for name in BLOG_MODELS:
        Model = apps.get_model("blog", name)
        for obj in Model.objects.filter(uuid__isnull=True).iterator():
            obj.uuid = uuid.uuid4()
            obj.save(update_fields=["uuid"])


class Migration(migrations.Migration):

    dependencies = [
        ("blog", "0002_subscription_frequency_subscription_is_active_and_more"),
    ]

    operations = [
        # 1. nullable column
        migrations.AddField("category", "uuid", models.UUIDField(editable=False, null=True)),
        migrations.AddField("tag", "uuid", models.UUIDField(editable=False, null=True)),
        migrations.AddField("post", "uuid", models.UUIDField(editable=False, null=True)),
        migrations.AddField("comment", "uuid", models.UUIDField(editable=False, null=True)),
        migrations.AddField("subscription", "uuid", models.UUIDField(editable=False, null=True)),
        migrations.AddField("postrevision", "uuid", models.UUIDField(editable=False, null=True)),
        migrations.AddField("activityevent", "uuid", models.UUIDField(editable=False, null=True)),
        migrations.AddField("webhook", "uuid", models.UUIDField(editable=False, null=True)),
        # 2. backfill distinct values
        migrations.RunPython(backfill_uuids, migrations.RunPython.noop),
        # 3. unique + default for new rows
        migrations.AlterField("category", "uuid", models.UUIDField(default=uuid.uuid4, editable=False, unique=True)),
        migrations.AlterField("tag", "uuid", models.UUIDField(default=uuid.uuid4, editable=False, unique=True)),
        migrations.AlterField("post", "uuid", models.UUIDField(default=uuid.uuid4, editable=False, unique=True)),
        migrations.AlterField("comment", "uuid", models.UUIDField(default=uuid.uuid4, editable=False, unique=True)),
        migrations.AlterField("subscription", "uuid", models.UUIDField(default=uuid.uuid4, editable=False, unique=True)),
        migrations.AlterField("postrevision", "uuid", models.UUIDField(default=uuid.uuid4, editable=False, unique=True)),
        migrations.AlterField("activityevent", "uuid", models.UUIDField(default=uuid.uuid4, editable=False, unique=True)),
        migrations.AlterField("webhook", "uuid", models.UUIDField(default=uuid.uuid4, editable=False, unique=True)),
    ]
