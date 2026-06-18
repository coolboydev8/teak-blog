from django.shortcuts import get_object_or_404
from ninja import Router
from ninja.errors import HttpError

from blog.activity import record_activity
from blog.models import ActivityEvent, Comment, Post
from blog.tasks import emit_event

from ..auth import get_optional_user
from ..pagination import paginate
from ..schemas import CommentCreateIn, CommentModerateIn, CommentOut, PagedComments
from ..serialization import paged_response

router = Router(tags=["comments"])


@router.get("/posts/{slug}/comments", response=PagedComments, auth=None)
def list_comments(request, slug: str, page: int = 1, page_size: int = 20):
    """Public sees approved comments; the post's author sees every status."""
    post = get_object_or_404(Post, slug=slug)
    qs = post.comments.select_related("author").all()

    user = get_optional_user(request)
    if not (user and user.id == post.author_id):
        qs = qs.filter(moderation_status=Comment.Moderation.APPROVED)

    return paged_response(CommentOut, paginate(request, qs, page, page_size))


@router.post("/posts/{slug}/comments", response={201: CommentOut})
def create_comment(request, slug: str, data: CommentCreateIn):
    post = get_object_or_404(Post, slug=slug)
    if post.status != Post.Status.PUBLISHED:
        raise HttpError(403, "Comments are only allowed on published posts.")

    # The author's own comments skip the moderation queue.
    auto_approve = post.author_id == request.auth.id
    comment = Comment.objects.create(
        post=post,
        author=request.auth,
        body=data.body,
        moderation_status=(
            Comment.Moderation.APPROVED if auto_approve else Comment.Moderation.PENDING
        ),
    )
    # Notify the post author of the new comment (webhook + activity feed).
    if not auto_approve:
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
    return 201, comment


@router.put("/comments/{int:comment_id}/moderate", response=CommentOut)
def moderate_comment(request, comment_id: int, data: CommentModerateIn):
    comment = get_object_or_404(
        Comment.objects.select_related("post", "author"), id=comment_id
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
