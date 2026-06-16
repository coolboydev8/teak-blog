"""
Populate the database with demo data so the API (and frontend) is usable
immediately. Idempotent: safe to run repeatedly.

    python manage.py seed_demo
"""
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from blog import services
from blog.models import Category, Comment, Subscription, Tag

User = get_user_model()

DEMO_PASSWORD = "Str0ngPass!"


class Command(BaseCommand):
    help = "Seed demo users, categories, tags, posts and comments."

    def handle(self, *args, **options):
        author, _ = User.objects.get_or_create(
            username="teak_writer",
            defaults={"email": "writer@teak.local", "bio": "I write about systems."},
        )
        author.set_password(DEMO_PASSWORD)
        author.save()

        reader, _ = User.objects.get_or_create(
            username="teak_reader", defaults={"email": "reader@teak.local"}
        )
        reader.set_password(DEMO_PASSWORD)
        reader.save()

        eng, _ = Category.objects.get_or_create(name="Engineering")
        product, _ = Category.objects.get_or_create(name="Product")
        perf, _ = Tag.objects.get_or_create(name="performance")
        db, _ = Tag.objects.get_or_create(name="databases")

        seeds = [
            {
                "title": "Scaling PostgreSQL for Config-Driven SaaS",
                "content": (
                    "Caching, indexing and connection pooling are the three "
                    "levers we reach for first when a read path gets hot. "
                    "Here is how we think about each of them."
                ),
                "category_id": eng.id,
                "tags": [perf.id, db.id],
                "metadata": {"seo_title": "Scaling PostgreSQL", "variant": "B"},
                "publish": True,
            },
            {
                "title": "Designing an Idempotent Write Path",
                "content": (
                    "Clients retry. Networks partition. If your create endpoint "
                    "is not idempotent you will eventually get duplicates. An "
                    "idempotency key turns 'at least once' into 'exactly once'."
                ),
                "category_id": eng.id,
                "tags": [perf.id],
                "metadata": {},
                "publish": True,
            },
            {
                "title": "A Draft We Are Still Working On",
                "content": "This one is not ready for the world yet.",
                "category_id": product.id,
                "tags": [],
                "metadata": {},
                "publish": False,
            },
        ]

        created_slugs = []
        for seed in seeds:
            publish = seed.pop("publish")
            # Skip if a post with this title already exists for the author.
            if author.posts.filter(title=seed["title"]).exists():
                continue
            post = services.create_post(author=author, data=seed)
            if publish:
                services.publish_post(post=post)
            created_slugs.append(post.slug)

        # A comment awaiting moderation + an approved one.
        published = author.posts.filter(status="published").first()
        if published and not published.comments.exists():
            Comment.objects.create(
                post=published, author=reader, body="This was really helpful, thanks!"
            )
            Comment.objects.create(
                post=published,
                author=reader,
                body="Approved example.",
                moderation_status=Comment.Moderation.APPROVED,
            )

        Subscription.objects.get_or_create(subscriber=reader, author=author)

        self.stdout.write(
            self.style.SUCCESS(
                f"Seed complete. Author='teak_writer' / Reader='teak_reader' "
                f"(password '{DEMO_PASSWORD}'). New posts: {created_slugs or 'none (already seeded)'}."
            )
        )
