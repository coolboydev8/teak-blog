"""Add a public, non-enumerable ``uuid`` to User (see blog 0003 for rationale)."""
import uuid

from django.db import migrations, models


def backfill_uuids(apps, schema_editor):
    User = apps.get_model("users", "User")
    for obj in User.objects.filter(uuid__isnull=True).iterator():
        obj.uuid = uuid.uuid4()
        obj.save(update_fields=["uuid"])


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0003_alter_user_avatar"),
    ]

    operations = [
        migrations.AddField("user", "uuid", models.UUIDField(editable=False, null=True)),
        migrations.RunPython(backfill_uuids, migrations.RunPython.noop),
        migrations.AlterField(
            "user", "uuid", models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
        ),
    ]
