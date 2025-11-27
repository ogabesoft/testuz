from django.db import models


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Question(TimeStampedModel):
    text = models.TextField()

    def __str__(self) -> str:
        return self.text[:50]


class AnswerOption(models.Model):
    question = models.ForeignKey(
        Question,
        related_name='options',
        on_delete=models.CASCADE,
    )
    text = models.CharField(max_length=255)
    is_correct = models.BooleanField(default=False)

    def __str__(self) -> str:
        return f'{self.question_id}: {self.text[:40]}'


class NotificationSetting(TimeStampedModel):
    bot_token = models.CharField(max_length=255, blank=True)
    admin_chat_id = models.CharField(max_length=100, blank=True)
    is_active = models.BooleanField(default=False)

    class Meta:
        verbose_name = 'Telegram sozlamasi'
        verbose_name_plural = 'Telegram sozlamalari'

    def __str__(self) -> str:
        return 'Telegram sozlamalari'


class TestAttempt(TimeStampedModel):
    first_name = models.CharField(max_length=120)
    last_name = models.CharField(max_length=120)
    total_questions = models.PositiveIntegerField()
    correct_answers = models.PositiveIntegerField()
    incorrect_answers = models.PositiveIntegerField()

    class Meta:
        ordering = ['-created_at']

    def __str__(self) -> str:
        return f'{self.first_name} {self.last_name} - {self.correct_answers}/{self.total_questions}'


class AttemptAnswer(models.Model):
    attempt = models.ForeignKey(
        TestAttempt,
        related_name='answers',
        on_delete=models.CASCADE,
    )
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    selected_option = models.ForeignKey(AnswerOption, on_delete=models.CASCADE)
    is_correct = models.BooleanField(default=False)

    def __str__(self) -> str:
        return f'{self.attempt_id} - {self.question_id}'
