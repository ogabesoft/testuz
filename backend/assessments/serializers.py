from typing import List

from rest_framework import serializers

from .models import (
    AnswerOption,
    AttemptAnswer,
    NotificationSetting,
    Question,
    TestAttempt,
)


class AnswerOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnswerOption
        fields = ('id', 'text', 'is_correct')

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if not self.context.get('include_correct', False):
            data.pop('is_correct', None)
        return data


class QuestionReadSerializer(serializers.ModelSerializer):
    options = serializers.SerializerMethodField()

    class Meta:
        model = Question
        fields = ('id', 'text', 'options')

    def get_options(self, obj):
        context = self.context.copy()
        context['include_correct'] = self.context.get('include_correct', False)
        serializer = AnswerOptionSerializer(obj.options.all(), many=True, context=context)
        return serializer.data


class QuestionWriteSerializer(serializers.ModelSerializer):
    options = AnswerOptionSerializer(many=True)

    class Meta:
        model = Question
        fields = ('id', 'text', 'options')

    def validate_options(self, options: List[dict]):
        if not options or len(options) < 2:
            raise serializers.ValidationError('Kamida ikkita javob varianti kerak.')
        if not any(option.get('is_correct') for option in options):
            raise serializers.ValidationError("Kamida bitta to'g'ri javob bo'lishi kerak.")
        return options

    def create(self, validated_data):
        options = validated_data.pop('options', [])
        question = Question.objects.create(**validated_data)
        AnswerOption.objects.bulk_create([
            AnswerOption(question=question, **option) for option in options
        ])
        return question

    def update(self, instance, validated_data):
        options = validated_data.pop('options', None)
        instance.text = validated_data.get('text', instance.text)
        instance.save()
        if options is not None:
            instance.options.all().delete()
            AnswerOption.objects.bulk_create([
                AnswerOption(question=instance, **option) for option in options
            ])
        return instance


class NotificationSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationSetting
        fields = ('bot_token', 'admin_chat_id', 'is_active')


class AttemptResponseSerializer(serializers.Serializer):
    question = serializers.IntegerField()
    option = serializers.IntegerField()


class AttemptSubmissionSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=120)
    last_name = serializers.CharField(max_length=120)
    responses = AttemptResponseSerializer(many=True)


class AttemptAnswerDetailSerializer(serializers.ModelSerializer):
    question_text = serializers.CharField(source='question.text', read_only=True)
    option_text = serializers.CharField(source='selected_option.text', read_only=True)

    class Meta:
        model = AttemptAnswer
        fields = ('id', 'question', 'question_text', 'selected_option', 'option_text', 'is_correct')


class TestAttemptSerializer(serializers.ModelSerializer):
    answers = AttemptAnswerDetailSerializer(many=True, read_only=True)

    class Meta:
        model = TestAttempt
        fields = (
            'id',
            'first_name',
            'last_name',
            'total_questions',
            'correct_answers',
            'incorrect_answers',
            'created_at',
            'answers',
        )
