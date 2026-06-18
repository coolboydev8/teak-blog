from ninja import Router

from blog.models import Category, Tag

from ..schemas import CategoryOut, TagOut

router = Router(tags=["taxonomy"])


@router.get("/categories", response=list[CategoryOut], auth=None)
def list_categories(request):
    return list(Category.objects.all())


@router.get("/tags", response=list[TagOut], auth=None)
def list_tags(request):
    return list(Tag.objects.all())
