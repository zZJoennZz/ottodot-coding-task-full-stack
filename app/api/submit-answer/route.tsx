import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

export async function POST(request: NextRequest) {
  try {
    const { sessionId, userAnswer } = await request.json();

    if (!sessionId || userAnswer === undefined || userAnswer === null) {
      return NextResponse.json({ error: 'Session ID and user answer are required' }, { status: 400 });
    }

    // Get the problem session
    const { data: session, error: sessionError } = await supabase.from('math_problem_sessions').select('*').eq('id', sessionId).single();

    if (sessionError) {
      throw sessionError;
    }

    // Check if answer is correct
    const userAnswerNum = Number(userAnswer);
    const correctAnswerNum = Number(session.correct_answer);
    const isCorrect = Math.abs(userAnswerNum - correctAnswerNum) < 0.01;

    // Generate personalized feedback
    const feedback = await generateFeedback(session.problem_text, correctAnswerNum, userAnswerNum, isCorrect);

    // Save submission to database
    const { data: submission, error: submissionError } = await supabase
      .from('math_problem_submissions')
      .insert({
        session_id: sessionId,
        user_answer: userAnswerNum,
        is_correct: isCorrect,
        feedback_text: feedback,
      })
      .select()
      .single();

    if (submissionError) {
      throw submissionError;
    }

    return NextResponse.json({
      is_correct: isCorrect,
      feedback: feedback,
      correct_answer: session.correct_answer,
    });
  } catch (error: any) {
    console.error('Error submitting answer:', error);
    return NextResponse.json({ error: error.message || 'Failed to submit answer' }, { status: 500 });
  }
}

async function generateFeedback(problemText: string, correctAnswer: number, userAnswer: number, isCorrect: boolean): Promise<string> {
  const prompt = `You are a Singapore Primary 5 math tutor. Provide personalized feedback for this problem.

  Problem: "${problemText}"
  Student's answer: ${userAnswer}
  Correct answer: ${correctAnswer}
  The student's answer is ${isCorrect ? 'correct' : 'incorrect'}.

  Provide brief, encouraging feedback in Singapore teaching style:
  - If correct: Praise specifically what they did well
  - If incorrect: Give a gentle hint about the Singapore math concept involved
  - Focus on building confidence and mathematical thinking
  - Keep it to 2-3 sentences maximum
  - Use encouraging language suitable for 11-year-olds`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: prompt,
      config: {
        temperature: 0.7,
        maxOutputTokens: 300,
      },
    });

    return response.text?.trim() || getSingaporeFallbackFeedback(isCorrect, correctAnswer);
  } catch (error) {
    console.error('Gemini AI feedback error:', error);
    return getSingaporeFallbackFeedback(isCorrect, correctAnswer);
  }
}

function getSingaporeFallbackFeedback(isCorrect: boolean, correctAnswer: number): string {
  if (isCorrect) {
    const positiveFeedback = [
      "Well done! You've applied the Singapore math concepts correctly.",
      'Excellent work! Your understanding of the problem shows good mathematical thinking.',
      "Very good! You've solved this Primary 5 problem perfectly.",
      'Great job! Your answer shows you understand the mathematical concept well.',
    ];
    return positiveFeedback[Math.floor(Math.random() * positiveFeedback.length)];
  } else {
    const constructiveFeedback = [
      `Good try! The correct answer is ${correctAnswer}. Remember to read the problem carefully and identify the key information.`,
      `Not quite right. The answer is ${correctAnswer}. Think about the Singapore math concepts we've learned for this type of problem.`,
      `Good effort! The correct answer is ${correctAnswer}. Try using the bar model method to visualize the problem.`,
      `You're on the right track! The answer is ${correctAnswer}. Check if you've applied the correct mathematical operation.`,
    ];
    return constructiveFeedback[Math.floor(Math.random() * constructiveFeedback.length)];
  }
}
