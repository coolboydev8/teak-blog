"""Add indexes backing hot/ordered queries that previously had none.

All are pure index additions (no data or schema-shape change), so they are
safe to apply online and never alter query results.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("blog", "0004_seed_default_categories"),
    ]

    operations = [
        migrations.AddIndex(
            "post",
            models.Index(fields=["author", "-updated_at"], name="post_author_updated_idx"),
        ),
        migrations.AddIndex(
            "comment",
            models.Index(fields=["post", "created_at"], name="comment_post_created_idx"),
        ),
        migrations.AddIndex(
            "subscription",
            models.Index(fields=["author", "is_active"], name="sub_author_active_idx"),
        ),
        migrations.AddIndex(
            "idempotencykey",
            models.Index(fields=["created_at"], name="idemkey_created_idx"),
        ),
        migrations.AddIndex(
            "activityevent",
            models.Index(fields=["user", "is_read"], name="activity_user_read_idx"),
        ),
    ]
