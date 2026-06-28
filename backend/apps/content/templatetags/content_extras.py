from django import template

register = template.Library()

@register.filter
def get_item(dictionary, key):
    """{{ content|get_item:field.key }}"""
    return dictionary.get(key, "")
