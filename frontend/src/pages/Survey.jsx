import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Card from '../components/Card';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';

const REVIEW_ALERT_URL = `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/review-alert`;

async function sendReviewAlert(token, score, feedback) {
  try {
    await fetch(REVIEW_ALERT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, score, feedback }),
    });
  } catch (err) {
    // No bloquear la encuesta si falla la alerta
    console.error('Review alert failed:', err);
  }
}

function Star({ filled, onClick, onMouseEnter, onMouseLeave }) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="text-3xl focus:outline-none focus:ring-2 focus:ring-blue-500 rounded p-1"
      aria-label={filled ? 'Estrella rellena' : 'Estrella vacía'}
    >
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill={filled ? '#fbbf24' : 'none'}
        stroke="#fbbf24"
        strokeWidth="2"
      >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    </button>
  );
}

export default function Survey() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [request, setRequest] = useState(null);
  const [score, setScore] = useState(0);
  const [hoverScore, setHoverScore] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError('Enlace no válido');
      return;
    }

    async function load() {
      const { data, error: reqError } = await supabase
        .from('review_requests')
        .select('*, hostales(name, google_review_url, booking_review_url)')
        .eq('token', token)
        .single();

      if (reqError || !data) {
        setError('Enlace no válido o expirado');
      } else {
        setRequest(data);
        if (data.responded_at) {
          setSubmitted(true);
        }
      }
      setLoading(false);
    }

    load();
  }, [token]);

  const handleSubmitScore = async (selectedScore) => {
    if (!request || submitting) return;
    setScore(selectedScore);

    if (selectedScore >= 4) {
      setSubmitting(true);
      const { error: updateError } = await supabase
        .from('review_requests')
        .update({
          score: selectedScore,
          responded_at: new Date().toISOString(),
          redirected: true,
        })
        .eq('id', request.id);
      setSubmitting(false);
      if (updateError) {
        setError('No se pudo guardar la valoración');
        return;
      }
      setSubmitted(true);
    }
  };

  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    if (!request || !feedback.trim() || submitting) return;

    setSubmitting(true);
    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('review_requests')
      .update({
        score,
        feedback: feedback.trim(),
        responded_at: now,
        redirected: false,
      })
      .eq('id', request.id);

    if (!updateError) {
      await sendReviewAlert(token, score, feedback.trim());
    }

    setSubmitting(false);
    if (updateError) {
      setError('No se pudo guardar el comentario');
      return;
    }
    setSubmitted(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md text-center">
          <p className="text-red-600">{error || 'Enlace no válido'}</p>
        </Card>
      </div>
    );
  }

  if (submitted || request.responded_at) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md text-center" data-testid="survey-thanks-screen">
          <p className="text-lg font-semibold text-slate-900">Ya registramos tu valoración. ¡Gracias!</p>
        </Card>
      </div>
    );
  }

  if (score >= 4) {
    const hostel = request.hostales;
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md text-center" data-testid="survey-redirect-screen">
          <p className="text-lg font-semibold text-slate-900 mb-2">¡Gracias!</p>
          <p className="text-sm text-slate-600 mb-6">Tu opinión nos ayuda mucho.</p>
          <div className="flex flex-col gap-3">
            {hostel?.google_review_url && (
              <a href={hostel.google_review_url} target="_blank" rel="noopener noreferrer">
                <Button fullWidth data-testid="survey-google-link">Dejar reseña en Google →</Button>
              </a>
            )}
            {hostel?.booking_review_url && (
              <a href={hostel.booking_review_url} target="_blank" rel="noopener noreferrer">
                <Button fullWidth variant="secondary" data-testid="survey-booking-link">Dejar reseña en Booking →</Button>
              </a>
            )}
          </div>
        </Card>
      </div>
    );
  }

  if (score >= 1 && score <= 3) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full" data-testid="survey-feedback-screen">
          <p className="text-lg font-semibold text-slate-900 mb-2">Lamentamos que tu experiencia no fuera perfecta.</p>
          <p className="text-sm text-slate-600 mb-4">¿Qué podemos mejorar?</p>
          <form onSubmit={handleSubmitFeedback} className="flex flex-col gap-4">
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
              required
              className="w-full border border-gray-200 rounded-md px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              data-testid="survey-feedback-textarea"
            />
            <Button type="submit" fullWidth loading={submitting} data-testid="survey-feedback-submit">
              Enviar comentario
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md text-center w-full" data-testid="survey-rating-screen">
        <p className="text-lg font-semibold text-slate-900 mb-2">
          ¿Cómo fue tu estancia en {request.hostales?.name || 'nuestro albergue'}?
        </p>
        <p className="text-sm text-slate-600 mb-6">Selecciona de 1 a 5 estrellas</p>
        <div className="flex justify-center gap-1 mb-6">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star
              key={s}
              filled={s <= (hoverScore || score)}
              onClick={() => handleSubmitScore(s)}
              onMouseEnter={() => setHoverScore(s)}
              onMouseLeave={() => setHoverScore(0)}
              data-testid={`survey-star-${s}`}
            />
          ))}
        </div>
      </Card>
    </div>
  );
}
