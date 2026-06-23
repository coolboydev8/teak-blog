import logging
import uuid

from django.db.models import Q
from django.shortcuts import get_object_or_404
from ninja import Router
from ninja.errors import HttpError

from blog.activity import record_activity
from blog.models import ActivityEvent, Comment, Post
from blog.tasks import emit_event

logger = logging.getLogger(__name__)

from ..auth import get_optional_user
from ..pagination import paginate
from ..schemas import CommentCreateIn, CommentModerateIn, CommentOut, PagedComments
from ..serialization import paged_response

router = Router(tags=["comments"])


@router.get("/posts/{slug}/comments", response=PagedComments, auth=None)
def list_comments(request, slug: str, page: int = 1, page_size: int = 20):
    """Comment visibility:

    - approved comments are public,
    - the post's author sees every status (moderation queue),
    - a signed-in commenter always sees their OWN comments (even while pending)
      so a freshly-posted comment never appears to vanish before approval.
    """
    post = get_object_or_404(Post, slug=slug)
    qs = post.comments.select_related("author").all()

    user = get_optional_user(request)
    if not (user and user.id == post.author_id):
        visible = Q(moderation_status=Comment.Moderation.APPROVED)
        if user:
            visible |= Q(author_id=user.id)
        qs = qs.filter(visible)

    return paged_response(CommentOut, paginate(request, qs, page, page_size))


@router.post("/posts/{slug}/comments", response={201: CommentOut})
def create_comment(request, slug: str, data: CommentCreateIn):
    post = get_object_or_404(Post, slug=slug)
    if post.status != Post.Status.PUBLISHED:
        raise HttpError(403, "Comments are only allowed on published posts.")

    is_own = post.author_id == request.auth.id
    comment = Comment.objects.create(
        post=post,
        author=request.auth,
        body=data.body,
        # The model keeps the full pending/approved/rejected lifecycle for a
        # future moderation workflow, but at this stage every comment is
        # auto-approved on creation so it is immediately visible. To re-enable
        # moderation, set this to PENDING for non-author comments.
        moderation_status=Comment.Moderation.APPROVED,
    )
    # Notify the post author of new comments from other users (not their own).
    # Best-effort: a webhook/broker hiccup must never prevent the comment itself
    # from being saved and returned to the commenter.
    if not is_own:
        try:
            emit_event(
                post.author_id,
                "comment.created",
                {
                    "event": "comment.created",
                    "post": {"slug": post.slug, "title": post.title},
                    "comment": {"id": comment.id, "author": request.auth.username},
                },
            )
            record_activity(
                post.author_id,
                ActivityEvent.Type.COMMENT,
                f"New comment from {request.auth.username}",
                data.body[:200],
                {"post_slug": post.slug, "comment_id": comment.id},
            )
        except Exception:
            logger.exception(
                "comment.created notifications failed for post %s", post.slug
            )
    return 201, comment


@router.put("/comments/{uuid:comment_id}", response=CommentOut)
def update_comment(request, comment_id: uuid.UUID, data: CommentCreateIn):
    """Edit a comment. Only the comment's own author may edit it (any time)."""
    comment = get_object_or_404(
        Comment.objects.select_related("author", "post"), uuid=comment_id
    )
    if comment.author_id != request.auth.id:
        raise HttpError(403, "You can only edit your own comments.")

    body = data.body.strip()
    if not body:
        raise HttpError(422, "Comment cannot be empty.")

    comment.body = body
    comment.save(update_fields=["body", "updated_at"])
    return comment


@router.put("/comments/{uuid:comment_id}/moderate", response=CommentOut)
def moderate_comment(request, comment_id: uuid.UUID, data: CommentModerateIn):
    comment = get_object_or_404(
        Comment.objects.select_related("post", "author"), uuid=comment_id
    )
    if comment.post.author_id != request.auth.id:
        raise HttpError(403, "Only the post author can moderate comments.")
    if data.status not in (Comment.Moderation.APPROVED, Comment.Moderation.REJECTED):
        raise HttpError(422, "status must be 'approved' or 'rejected'.")

    comment.moderation_status = data.status
    comment.moderation_reason = data.reason
    comment.save(update_fields=["moderation_status", "moderation_reason", "updated_at"])

    if data.status == Comment.Moderation.APPROVED:
        record_activity(
            comment.post.author_id,
            ActivityEvent.Type.COMMENT_APPROVED,
            f"Comment approved from {comment.author.username}",
            comment.body[:200],
            {"post_slug": comment.post.slug, "comment_id": comment.id},
        )
    return comment
