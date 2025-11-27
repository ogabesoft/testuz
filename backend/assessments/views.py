from typing import List

from django.db import transaction
from rest_framework import status, viewsets
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import AnswerOption, AttemptAnswer, NotificationSetting, Question, TestAttempt
from .serializers import (
    AttemptSubmissionSerializer,
    NotificationSettingSerializer,
    QuestionReadSerializer,
    QuestionWriteSerializer,
    TestAttemptSerializer,
)
from .services import send_attempt_to_telegram


class QuestionViewSet(viewsets.ModelViewSet):
    queryset = Question.objects.prefetch_related('options').order_by('-created_at')
    permission_classes = [AllowAny]

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAdminUser()]
        return super().get_permissions()

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return QuestionWriteSerializer
        return QuestionReadSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['include_correct'] = bool(
            self.request.user
            and self.request.user.is_authenticated
            and self.request.user.is_staff
        )
        return context


class NotificationSettingView(APIView):
    permission_classes = [IsAdminUser]

    def get_object(self):
        return NotificationSetting.objects.first() or NotificationSetting.objects.create()

    def get(self, request):
        serializer = NotificationSettingSerializer(self.get_object())
        return Response(serializer.data)

    def put(self, request):
        settings = self.get_object()
        serializer = NotificationSettingSerializer(settings, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def post(self, request):
        return self.put(request)


class TestAttemptView(APIView):
    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAdminUser()]
        return [AllowAny()]

    def get(self, request):
        attempts = TestAttempt.objects.prefetch_related(
            'answers__question',
            'answers__selected_option',
        ).order_by('-created_at')[:25]
        serializer = TestAttemptSerializer(attempts, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = AttemptSubmissionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data
        responses: List[dict] = validated['responses']
        if not responses:
            return Response({'detail': "Savollar bo'sh bo'lmasligi kerak."}, status=status.HTTP_400_BAD_REQUEST)

        question_ids = {item['question'] for item in responses}
        option_ids = {item['option'] for item in responses}
        questions = {
            question.id: question
            for question in Question.objects.filter(id__in=question_ids)
        }
        options = {
            option.id: option
            for option in AnswerOption.objects.filter(id__in=option_ids)
        }

        if len(questions) != len(question_ids):
            return Response({'detail': 'Savol topilmadi.'}, status=status.HTTP_400_BAD_REQUEST)
        if len(options) != len(option_ids):
            return Response({'detail': 'Javob varianti topilmadi.'}, status=status.HTTP_400_BAD_REQUEST)

        correct_answers = 0
        selected_pairs = []

        for response in responses:
            question = questions.get(response['question'])
            option = options.get(response['option'])
            if not question or not option:
                return Response({'detail': 'Savol yoki javob topilmadi.'}, status=status.HTTP_400_BAD_REQUEST)
            if option.question_id != question.id:
                return Response({'detail': 'Variant savolga tegishli emas.'}, status=status.HTTP_400_BAD_REQUEST)
            selected_pairs.append((question, option))

        answers_to_create: List[AttemptAnswer] = []

        with transaction.atomic():
            attempt = TestAttempt.objects.create(
                first_name=validated['first_name'],
                last_name=validated['last_name'],
                total_questions=len(responses),
                correct_answers=0,
                incorrect_answers=0,
            )

            for question, option in selected_pairs:
                is_correct = option.is_correct
                if is_correct:
                    correct_answers += 1
                answers_to_create.append(
                    AttemptAnswer(
                        attempt=attempt,
                        question=question,
                        selected_option=option,
                        is_correct=is_correct,
                    )
                )

            AttemptAnswer.objects.bulk_create(answers_to_create)
            attempt.correct_answers = correct_answers
            attempt.incorrect_answers = len(responses) - correct_answers
            attempt.save(update_fields=['correct_answers', 'incorrect_answers'])

        send_attempt_to_telegram(attempt)
        response_serializer = TestAttemptSerializer(attempt)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
