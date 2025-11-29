import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import './App.css';
import type { NotificationSetting, Question, Role, TestAttempt } from './types';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api';

type Banner = {
  type: 'success' | 'error';
  message: string;
} | null;

type QuestionFormState = {
  text: string;
  options: Array<{
    text: string;
    is_correct: boolean;
  }>;
};

const defaultQuestionForm = (): QuestionFormState => ({
  text: '',
  options: [
    { text: '', is_correct: false },
    { text: '', is_correct: false },
  ],
});

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('uz-UZ', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

function App() {
  const [role, setRole] = useState<Role>(null);
  const [banner, setBanner] = useState<Banner>(null);
  const [adminToken, setAdminToken] = useState<string>(() => localStorage.getItem('testuz_token') ?? '');
  const [adminQuestions, setAdminQuestions] = useState<Question[]>([]);
  const [notification, setNotification] = useState<NotificationSetting>({
    bot_token: '',
    admin_chat_id: '',
    is_active: false,
  });
  const [attempts, setAttempts] = useState<TestAttempt[]>([]);
  const [questionForm, setQuestionForm] = useState<QuestionFormState>(defaultQuestionForm());
  const [adminLoading, setAdminLoading] = useState(false);
  const [loginState, setLoginState] = useState({ username: '', password: '' });
  const [studentInfo, setStudentInfo] = useState({ first_name: '', last_name: '' });
  const [studentQuestions, setStudentQuestions] = useState<Question[]>([]);
  const [studentAnswers, setStudentAnswers] = useState<Record<number, number>>({});
  const [studentResult, setStudentResult] = useState<TestAttempt | null>(null);
  const [studentLoading, setStudentLoading] = useState(false);
  const [isTestStarted, setIsTestStarted] = useState(false);

  const adminSummary = useMemo(() => {
    const totalAttempts = attempts.length;
    const totalQuestionsAnswered = attempts.reduce((total, attempt) => total + attempt.total_questions, 0);
    const totalCorrectAnswers = attempts.reduce((total, attempt) => total + attempt.correct_answers, 0);
    const accuracy = totalQuestionsAnswered ? Math.round((totalCorrectAnswers / totalQuestionsAnswered) * 100) : 0;
    return {
      questionCount: adminQuestions.length,
      totalAttempts,
      accuracy,
      latestAttempt: attempts[0] ?? null,
    };
  }, [adminQuestions, attempts]);

  useEffect(() => {
    if (adminToken) {
      localStorage.setItem('testuz_token', adminToken);
      loadAdminData();
    } else {
      localStorage.removeItem('testuz_token');
      setAdminQuestions([]);
      setAttempts([]);
    }
  }, [adminToken]);

  const apiRequest = async <T,>(path: string, options: RequestInit = {}, tokenValue?: string): Promise<T> => {
    const headers = new Headers(options.headers ?? {});
    if (!(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }
    if (tokenValue) {
      headers.set('Authorization', `Token ${tokenValue}`);
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let message = `Server xatosi (${response.status})`;
      try {
        const errorPayload = (await response.json()) as { detail?: string; error?: string };
        message = errorPayload.detail ?? errorPayload.error ?? message;
      } catch {
        // ignore parse errors
      }
      throw new Error(message);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return (await response.json()) as T;
  };

  const loadAdminData = async () => {
    if (!adminToken) return;
    setAdminLoading(true);
    try {
      const [questionData, notificationData, attemptData] = await Promise.all([
        apiRequest<Question[]>('/questions/', {}, adminToken),
        apiRequest<NotificationSetting>('/notification/', {}, adminToken),
        apiRequest<TestAttempt[]>('/attempts/', {}, adminToken),
      ]);
      setAdminQuestions(questionData);
      setNotification(notificationData);
      setAttempts(attemptData);
    } catch (error) {
      setBanner({ type: 'error', message: (error as Error).message });
    } finally {
      setAdminLoading(false);
    }
  };

  const fetchStudentQuestions = async () => {
    setStudentResult(null);
    setStudentLoading(true);
    try {
      const data = await apiRequest<Question[]>('/questions/');
      setStudentQuestions(data);
      setStudentAnswers({});
      setIsTestStarted(true);
    } catch (error) {
      setBanner({ type: 'error', message: (error as Error).message });
    } finally {
      setStudentLoading(false);
    }
  };

  const handleAdminLogin = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const data = await apiRequest<{ token: string }>('/auth/login/', {
        method: 'POST',
        body: JSON.stringify(loginState),
      });
      setAdminToken(data.token);
      setBanner({ type: 'success', message: 'Admin sifatida tizimga kirdingiz.' });
    } catch (error) {
      setBanner({ type: 'error', message: (error as Error).message });
    }
  };

  const handleAddOption = () => {
    if (questionForm.options.length >= 5) return;
    setQuestionForm((prev) => ({
      ...prev,
      options: [...prev.options, { text: '', is_correct: false }],
    }));
  };

  const handleOptionChange = (index: number, field: 'text' | 'is_correct', value: string | boolean) => {
    setQuestionForm((prev) => {
      const updated = [...prev.options];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      return { ...prev, options: updated };
    });
  };

  const removeOption = (index: number) => {
    if (questionForm.options.length <= 2) return;
    setQuestionForm((prev) => {
      const updated = prev.options.filter((_, i) => i !== index);
      return { ...prev, options: updated };
    });
  };

  const handleQuestionSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!adminToken) return;
    try {
      await apiRequest<Question>(
        '/questions/',
        {
          method: 'POST',
          body: JSON.stringify(questionForm),
        },
        adminToken,
      );
      setQuestionForm(defaultQuestionForm());
      setBanner({ type: 'success', message: "Savol muvaffaqiyatli qo'shildi." });
      loadAdminData();
    } catch (error) {
      setBanner({ type: 'error', message: (error as Error).message });
    }
  };

  const handleNotificationSave = async (event: FormEvent) => {
    event.preventDefault();
    if (!adminToken) return;
    try {
      const payload = {
        bot_token: notification.bot_token,
        admin_chat_id: notification.admin_chat_id,
        is_active: notification.is_active,
      };
      const data = await apiRequest<NotificationSetting>(
        '/notification/',
        {
          method: 'PUT',
          body: JSON.stringify(payload),
        },
        adminToken,
      );
      setNotification(data);
      setBanner({ type: 'success', message: 'Telegram sozlamalari yangilandi.' });
    } catch (error) {
      setBanner({ type: 'error', message: (error as Error).message });
    }
  };

  const handleStudentStart = (event: FormEvent) => {
    event.preventDefault();
    if (!studentInfo.first_name.trim() || !studentInfo.last_name.trim()) {
      setBanner({ type: 'error', message: 'Ism va familiyani kiriting.' });
      return;
    }
    fetchStudentQuestions();
  };

  const handleAnswerSelect = (questionId: number, optionId: number) => {
    setStudentAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }));
  };

  const handleSubmitTest = async (event: FormEvent) => {
    event.preventDefault();
    if (!studentQuestions.length) return;
    const unanswered = studentQuestions.some((question) => !studentAnswers[question.id]);
    if (unanswered) {
      setBanner({ type: 'error', message: 'Har bir savolga javob bering.' });
      return;
    }
    setStudentLoading(true);
    try {
      const payload = {
        first_name: studentInfo.first_name.trim(),
        last_name: studentInfo.last_name.trim(),
        responses: studentQuestions.map((question) => ({
          question: question.id,
          option: studentAnswers[question.id],
        })),
      };
      const data = await apiRequest<TestAttempt>('/attempts/', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setStudentResult(data);
      setBanner({ type: 'success', message: 'Natijalar saqlandi va adminlarga yuborildi.' });
    } catch (error) {
      setBanner({ type: 'error', message: (error as Error).message });
    } finally {
      setStudentLoading(false);
    }
  };

  const handleLogout = () => {
    setAdminToken('');
    setRole(null);
  };

  const resetStudentFlow = () => {
    setStudentQuestions([]);
    setStudentAnswers({});
    setStudentResult(null);
    setIsTestStarted(false);
  };

  const studentScore = useMemo(() => {
    if (!studentResult) return null;
    return `${studentResult.correct_answers}/${studentResult.total_questions}`;
  }, [studentResult]);

  const renderRoleSelection = () => (
    <section className="selector">
      <h1>TestUZ platformasiga xush kelibsiz</h1>
      <p className="subtitle">
        Dasturchilar uchun professional test tizimi. Iltimos, o'z rolingizni tanlang.
      </p>
      <div className="role-grid">
        <button className="role-card" onClick={() => setRole('student')}>
          <span>Student</span>
          <p>Testni bajarish va natijani darhol ko'rish.</p>
        </button>
        <button className="role-card" onClick={() => setRole('admin')}>
          <span>Admin</span>
          <p>Savollarni boshqarish va Telegram natijalarini kuzatish.</p>
        </button>
      </div>
    </section>
  );

  const renderAdminLogin = () => (
    <form className="panel" onSubmit={handleAdminLogin}>
      <h2>Admin login</h2>
      <div className="field">
        <label>Login</label>
        <input
          type="text"
          value={loginState.username}
          onChange={(event) => setLoginState((prev) => ({ ...prev, username: event.target.value }))}
          placeholder="username"
          required
        />
      </div>
      <div className="field">
        <label>Parol</label>
        <input
          type="password"
          value={loginState.password}
          onChange={(event) => setLoginState((prev) => ({ ...prev, password: event.target.value }))}
          placeholder="********"
          required
        />
      </div>
      <button type="submit" className="primary">Kirish</button>
    </form>
  );

  const renderAdminDashboard = () => (
    <section className="admin-shell">
      <aside className="admin-sidebar">
        <div className="panel sidebar-card">
          <p className="eyebrow">Admin rejimi</p>
          <h2>Test boshqaruvi</h2>
          <p className="muted">
            Savollarni real vaqtda yangilang, Telegram xabarlari va oxirgi natijalarni tekshirib boring.
          </p>
          <div className="sidebar-actions">
            <button className="ghost" onClick={loadAdminData} disabled={adminLoading}>
              Yangilash
            </button>
            <button className="danger" onClick={handleLogout}>
              Chiqish
            </button>
          </div>
        </div>

        <div className="panel stats-panel">
          <div className="stat-card">
            <span className="eyebrow">Savollar</span>
            <strong>{adminSummary.questionCount}</strong>
            <p>Faol test banki</p>
          </div>
          <div className="stat-card">
            <span className="eyebrow">Urinishlar</span>
            <strong>{adminSummary.totalAttempts}</strong>
            <p>Oxirgi 25 ta</p>
          </div>
          <div className="stat-card">
            <span className="eyebrow">Aniqlik</span>
            <strong>{adminSummary.accuracy}%</strong>
            <p>O'rtacha muvaffaqiyat</p>
          </div>
          <div className="stat-card">
            <span className="eyebrow">Telegram</span>
            <span className={`status-pill ${notification.is_active ? 'success' : 'muted'}`}>
              {notification.is_active ? 'Faol' : 'Faol emas'}
            </span>
            <p>{notification.admin_chat_id ? `Chat ID: ${notification.admin_chat_id}` : 'Chat ID kiritilmagan'}</p>
          </div>
        </div>

        <div className="panel latest-panel">
          <div className="panel-header">
            <h4>So'nggi urinish</h4>
            {adminSummary.latestAttempt && (
              <span className="badge">
                {adminSummary.latestAttempt.correct_answers}/{adminSummary.latestAttempt.total_questions}
              </span>
            )}
          </div>
          {adminSummary.latestAttempt ? (
            <div className="latest-grid">
              <div>
                <p className="eyebrow">Ishtirokchi</p>
                <strong>
                  {adminSummary.latestAttempt.first_name} {adminSummary.latestAttempt.last_name}
                </strong>
              </div>
              <div>
                <p className="eyebrow">Sana</p>
                <p>{formatDate(adminSummary.latestAttempt.created_at)}</p>
              </div>
            </div>
          ) : (
            <p className="muted">Hozircha urinish mavjud emas.</p>
          )}
        </div>
      </aside>

      <div className="admin-main">
        <div className="panel hero-panel">
          <div>
            <p className="eyebrow">Kontent boshqaruvi</p>
            <h1>Yangi savolni soniyalar ichida yarating</h1>
            <p className="muted">
              Har bir savolga kamida ikki variant kiriting, to'g'ri javoblar belgilanadi va natijalar avtomatik
              hisoblanadi.
            </p>
          </div>
          <div className="hero-highlights">
            <span className="badge soft">Avto Telegram xabari</span>
            <span className="badge soft">Tokenli himoya</span>
          </div>
        </div>

        <div className="panel-grid">
          <form className="panel form-card" onSubmit={handleQuestionSubmit}>
            <div className="panel-header">
              <div>
                <p className="eyebrow">Savol formasi</p>
                <h3>Yangi savol</h3>
              </div>
              <span className="badge">{questionForm.options.length} variant</span>
            </div>
            <div className="field">
              <label>Savol matni</label>
              <textarea
                value={questionForm.text}
                onChange={(event) => setQuestionForm((prev) => ({ ...prev, text: event.target.value }))}
                placeholder="Savolni kiriting"
                required
              />
            </div>
            <div className="options">
              {questionForm.options.map((option, index) => (
                <div key={index} className="option-row">
                  <input
                    type="text"
                    value={option.text}
                    onChange={(event) => handleOptionChange(index, 'text', event.target.value)}
                    placeholder={`Variant ${index + 1}`}
                    required
                  />
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={option.is_correct}
                      onChange={(event) => handleOptionChange(index, 'is_correct', event.target.checked)}
                    />
                    To'g'ri
                  </label>
                  {questionForm.options.length > 2 && (
                    <button type="button" className="ghost" onClick={() => removeOption(index)}>
                      O'chirish
                    </button>
                  )}
                </div>
              ))}
              {questionForm.options.length < 5 && (
                <button type="button" className="ghost" onClick={handleAddOption}>
                  Variant qo'shish
                </button>
              )}
            </div>
            <button type="submit" className="primary" disabled={adminLoading}>
              Saqlash
            </button>
          </form>

          <form className="panel form-card secondary" onSubmit={handleNotificationSave}>
            <div className="panel-header">
              <div>
                <p className="eyebrow">Telegram</p>
                <h3>Notif so'zlamalari</h3>
              </div>
              <span className={`status-pill ${notification.is_active ? 'success' : 'muted'}`}>
                {notification.is_active ? 'Faol' : 'Faol emas'}
              </span>
            </div>
            <div className="field">
              <label>Bot token</label>
              <input
                type="text"
                value={notification.bot_token}
                onChange={(event) => setNotification((prev) => ({ ...prev, bot_token: event.target.value }))}
                placeholder="123456:ABCDEF"
              />
            </div>
            <div className="field">
              <label>Admin chat ID</label>
              <input
                type="text"
                value={notification.admin_chat_id}
                onChange={(event) => setNotification((prev) => ({ ...prev, admin_chat_id: event.target.value }))}
                placeholder="123456789"
              />
            </div>
            <label className="checkbox inline">
              <input
                type="checkbox"
                checked={notification.is_active}
                onChange={(event) => setNotification((prev) => ({ ...prev, is_active: event.target.checked }))}
              />
              Faollashtirish
            </label>
            <button type="submit" className="primary" disabled={adminLoading}>
              Yangilash
            </button>
          </form>
        </div>

        <div className="panel question-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Savol banki</p>
              <h3>Savollar</h3>
            </div>
            <span className="badge">{adminSummary.questionCount} ta</span>
          </div>
          <div className="question-board">
            {adminQuestions.map((question, index) => (
              <article key={question.id} className="question-row">
                <div className="question-index">Q{index + 1}</div>
                <div className="question-body">
                  <h4>{question.text}</h4>
                  <ul className="option-pills">
                    {question.options.map((option) => (
                      <li key={option.id} className={option.is_correct ? 'correct' : ''}>
                        {option.text}
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
            {!adminQuestions.length && <p className="muted">Hozircha savollar yo'q.</p>}
          </div>
        </div>

        <div className="panel attempt-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Yaqinda topshirganlar</p>
              <h3>Oxirgi natijalar</h3>
            </div>
            <span className="badge">{adminSummary.totalAttempts} urinish</span>
          </div>
          <div className="attempt-table">
            <div className="attempt-head">
              <span>Ismi</span>
              <span>Natija</span>
              <span>Sana</span>
            </div>
            {attempts.map((attempt) => (
              <div key={attempt.id} className="attempt-row">
                <div>
                  <strong>
                    {attempt.first_name} {attempt.last_name}
                  </strong>
                </div>
                <div className="attempt-score">
                  <span>
                    {attempt.correct_answers}/{attempt.total_questions}
                  </span>
                  <small>{Math.round((attempt.correct_answers / attempt.total_questions) * 100)}%</small>
                </div>
                <div className="attempt-date">{formatDate(attempt.created_at)}</div>
              </div>
            ))}
            {!attempts.length && <p className="muted">Hozircha natijalar mavjud emas.</p>}
          </div>
        </div>
      </div>
    </section>
  );

  const renderStudentPanel = () => (
    <section className="student-layout">
      <header>
        <h1>Student rejimi</h1>
        <p>Ism familiyangizni kiriting va testni boshlang.</p>
        <button className="ghost" onClick={() => { resetStudentFlow(); setRole(null); }}>
          Orqaga
        </button>
      </header>
      <form className="panel" onSubmit={handleStudentStart}>
        <div className="grid">
          <div className="field">
            <label>Ism</label>
            <input
              type="text"
              value={studentInfo.first_name}
              onChange={(event) => setStudentInfo((prev) => ({ ...prev, first_name: event.target.value }))}
              placeholder="Elyor"
              required
            />
          </div>
          <div className="field">
            <label>Familiya</label>
            <input
              type="text"
              value={studentInfo.last_name}
              onChange={(event) => setStudentInfo((prev) => ({ ...prev, last_name: event.target.value }))}
              placeholder="Karimov"
              required
            />
          </div>
        </div>
        <button type="submit" className="primary" disabled={studentLoading}>
          Testni boshlash
        </button>
      </form>

      {isTestStarted && (
        <form className="panel" onSubmit={handleSubmitTest}>
          <div className="panel-header">
            <h3>Savollar</h3>
            <span className="badge">{studentQuestions.length} ta savol</span>
          </div>
          {studentQuestions.map((question) => (
            <article key={question.id} className="question-card">
              <h4>{question.text}</h4>
              <div className="option-grid">
                {question.options.map((option) => (
                  <label key={option.id} className="radio-card">
                    <input
                      type="radio"
                      name={`question-${question.id}`}
                      value={option.id}
                      checked={studentAnswers[question.id] === option.id}
                      onChange={() => handleAnswerSelect(question.id, option.id)}
                    />
                    <span>{option.text}</span>
                  </label>
                ))}
              </div>
            </article>
          ))}
          {!!studentQuestions.length && (
            <button type="submit" className="primary" disabled={studentLoading}>
              Javobni yuborish
            </button>
          )}
        </form>
      )}

      {studentResult && (
        <div className="panel success-panel">
          <h3>Natija: {studentScore}</h3>
          <p>Sizning javoblaringiz admin paneliga yuborildi.</p>
          <button className="ghost" onClick={resetStudentFlow}>
            Yangi urinish
          </button>
        </div>
      )}
    </section>
  );

  return (
    <div className="app-shell">
      {banner && (
        <div className={`banner ${banner.type}`}>
          <span>{banner.message}</span>
          <button onClick={() => setBanner(null)}>x</button>
        </div>
      )}
      {!role && renderRoleSelection()}
      {role === 'admin' && (
        <section className="content">
          {!adminToken ? renderAdminLogin() : renderAdminDashboard()}
        </section>
      )}
      {role === 'student' && renderStudentPanel()}
    </div>
  );
}

export default App;
