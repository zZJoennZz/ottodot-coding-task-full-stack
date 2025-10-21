'use client';

import { useState } from 'react';

interface MathProblem {
  problem_text: string;
  correct_answer: number;
}

export default function Home() {
  const [problem, setProblem] = useState<MathProblem | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateProblem = async () => {
    setIsLoading(true);
    setFeedback('');
    setProblem(null);
    setUserAnswer('');
    setIsCorrect(null);
    setError(null);

    try {
      const res = await fetch('/api/math-problem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to generate problem.');
      }

      const data = await res.json();
      setProblem({
        problem_text: data.problem_text,
        correct_answer: data.correct_answer,
      });
      setSessionId(data.session_id);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Something went wrong while generating the problem.');
    } finally {
      setIsLoading(false);
    }
  };

  const submitAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId || !userAnswer) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/submit-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          userAnswer: parseFloat(userAnswer),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to submit answer.');
      }

      const data = await res.json();
      setIsCorrect(data.is_correct);
      setFeedback(data.feedback);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Something went wrong while submitting your answer.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-4xl font-bold text-center mb-8 text-gray-800">Math Problem Generator</h1>

        <div className="text-center mb-8">
          <p className="text-lg text-gray-600">Generate Primary math word problems and get instant feedback on your answers!</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <button
            onClick={generateProblem}
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg transition duration-200 ease-in-out transform hover:scale-105 disabled:transform-none"
          >
            {isLoading ? 'Generating...' : 'Generate New Problem'}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 text-red-700 p-4 mb-6 rounded">
            <p className="font-semibold">Error</p>
            <p>{error}</p>
          </div>
        )}

        {problem && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">Problem:</h2>
            <p className="text-lg text-gray-800 leading-relaxed mb-6">{problem.problem_text}</p>

            <form onSubmit={submitAnswer} className="space-y-4">
              <div>
                <label htmlFor="answer" className="block text-sm font-medium text-gray-700 mb-2">
                  Your Answer:
                </label>
                <input
                  type="number"
                  id="answer"
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                  placeholder="Enter your answer"
                  required
                  step="any"
                />
              </div>

              <button
                type="submit"
                disabled={!userAnswer || isLoading}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg transition duration-200 ease-in-out transform hover:scale-105 disabled:transform-none"
              >
                {isLoading ? 'Checking...' : 'Submit Answer'}
              </button>
            </form>
          </div>
        )}

        {feedback && (
          <div
            className={`rounded-lg shadow-lg p-6 ${isCorrect ? 'bg-green-50 border-2 border-green-200' : 'bg-yellow-50 border-2 border-yellow-200'}`}
          >
            <h2 className="text-xl font-semibold mb-4 text-gray-700">{isCorrect ? '✅ Correct!' : '❌ Not quite right'}</h2>
            <p className="text-gray-800 leading-relaxed whitespace-pre-line">{feedback}</p>
          </div>
        )}

        {/* Stats section */}
        {(problem || feedback) && (
          <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-600">
            <p>Each problem and submission is saved to the database for learning analytics.</p>
          </div>
        )}
      </main>
    </div>
  );
}
