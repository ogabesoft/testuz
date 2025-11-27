import logging
from typing import Tuple

import requests

from .models import NotificationSetting, TestAttempt

logger = logging.getLogger(__name__)


def format_attempt_message(attempt: TestAttempt) -> str:
    header = (
        f"Test natijasi\n"
        f"Talaba: {attempt.first_name} {attempt.last_name}\n"
        f"Natija: {attempt.correct_answers}/{attempt.total_questions}\n"
        f"Xato: {attempt.incorrect_answers}\n\n"
        "Savollar:"
    )
    lines = [header]
    for index, answer in enumerate(attempt.answers.select_related('question', 'selected_option'), start=1):
        status = "OK (tog'ri)" if answer.is_correct else "Xato"
        lines.append(
            f"{index}) {answer.question.text}\n"
            f"Tanlangan: {answer.selected_option.text}\n"
            f"Holat: {status}\n"
        )
    return '\n'.join(lines)


def send_attempt_to_telegram(attempt: TestAttempt) -> Tuple[bool, str]:
    settings = NotificationSetting.objects.filter(is_active=True).first()
    if not settings or not settings.bot_token or not settings.admin_chat_id:
        return False, "Telegram sozlamalari to'liq emas."

    message = format_attempt_message(attempt)
    url = f'https://api.telegram.org/bot{settings.bot_token}/sendMessage'
    payload = {
        'chat_id': settings.admin_chat_id,
        'text': message,
    }
    try:
        response = requests.post(url, data=payload, timeout=10)
        response.raise_for_status()
    except requests.RequestException as exc:
        logger.warning('Telegram xabari yuborilmadi: %s', exc)
        return False, str(exc)
    return True, ''
