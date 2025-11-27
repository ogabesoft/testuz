from django.contrib import admin

from .models import (
    AnswerOption,
    AttemptAnswer,
    NotificationSetting,
    Question,
    TestAttempt,
)


class AnswerOptionInline(admin.TabularInline):
    model = AnswerOption
    extra = 1


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ('text', 'created_at')
    search_fields = ('text',)
    inlines = [AnswerOptionInline]


@admin.register(NotificationSetting)
class NotificationSettingAdmin(admin.ModelAdmin):
    list_display = ('admin_chat_id', 'is_active', 'updated_at')
    readonly_fields = ('created_at', 'updated_at')


class AttemptAnswerInline(admin.TabularInline):
    model = AttemptAnswer
    extra = 0
    readonly_fields = ('question', 'selected_option', 'is_correct')


@admin.register(TestAttempt)
class TestAttemptAdmin(admin.ModelAdmin):
    list_display = ('first_name', 'last_name', 'correct_answers', 'total_questions', 'created_at')
    search_fields = ('first_name', 'last_name')
    inlines = [AttemptAnswerInline]
    readonly_fields = (
        'first_name',
        'last_name',
        'total_questions',
        'correct_answers',
        'incorrect_answers',
        'created_at',
        'updated_at',
    )
