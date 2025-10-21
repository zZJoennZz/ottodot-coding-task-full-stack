import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';

// Initialize Supabase client
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

// Initialize Google GenAI
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

export async function POST(request: NextRequest) {
  try {
    // Generate math problem using Gemini AI
    const mathProblem = await generateMathProblemWithAI();

    // Save to database
    const { data: session, error } = await supabase
      .from('math_problem_sessions')
      .insert({
        problem_text: mathProblem.problem_text,
        correct_answer: mathProblem.correct_answer,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      session_id: session.id,
      problem_text: mathProblem.problem_text,
      correct_answer: mathProblem.correct_answer,
    });
  } catch (error: any) {
    console.error('Error generating math problem:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate math problem' }, { status: 500 });
  }
}

async function generateMathProblemWithAI(): Promise<{ problem_text: string; correct_answer: number }> {
  const prompt = `You are a Singapore-primary-math word-problem generator.

    Rules
    - Level: Primary 5 (11-year-olds)
    - Syllabus: 2021 Singapore MOE
    - Topic band: Number & Algebra → Fractions, Decimals, Percentage, Ratio, Rate
    - Numbers: friendly integers / decimals ≤ 2 dp, denominators ≤ 12
    - Context: local (hawker centre, MRT, PSLE-style)
    - Language: concise, single sentence, no ambiguity
    - Cognitive demand: routine, 1- or 2-step solution
    - Include unit inside sentence; answer field = numeric only
    - Do NOT expose calculation steps inside problem string
    - Ensure answer is unique and positive

    Return ONLY a JSON object with the following keys:
    {
      "problem_text": "the math word problem here",
      "correct_answer": 123.45
    }
    `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: prompt,
      config: {
        temperature: 0.3,
        maxOutputTokens: 500,
      },
    });

    const responseText = response.text?.trim() || '';
    console.log('Raw AI response:', responseText);

    // Try to parse the JSON response
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : responseText;

      const problemData = JSON.parse(jsonString);

      // Validate the response structure
      if (!problemData.problem_text || typeof problemData.correct_answer !== 'number') {
        throw new Error('Invalid response structure from AI');
      }

      return {
        problem_text: problemData.problem_text,
        correct_answer: Number(problemData.correct_answer),
      };
    } catch (parseError) {
      console.error('Failed to parse AI response, using fallback:', parseError);
      console.log('Raw AI response:', responseText);
      // return getSingaporeFallbackProblem();
    }
  } catch (error) {
    console.error('Gemini AI error, using fallback:', error);
    // return getSingaporeFallbackProblem();
  }
}

function getSingaporeFallbackProblem() {
  // Singapore-style fallback problems
  const problems = [
    {
      problem_text:
        'At a hawker centre, a plate of chicken rice costs $3.50 and a cup of tea costs $1.20. If Sarah buys 2 plates of chicken rice and 3 cups of tea, how much does she pay in total?',
      correct_answer: 10.6,
    },
    {
      problem_text:
        'The MRT train from Jurong East to Raffles Place takes 25 minutes. If the train leaves at 7:15 AM, at what time will it arrive at Raffles Place? Express your answer in hours and minutes as a decimal (e.g., 7.75 for 7:45 AM).',
      correct_answer: 7.67,
    },
    {
      problem_text: 'A recipe requires 3/4 cup of sugar. If Mei Ling wants to make 5 batches of the recipe, how many cups of sugar does she need?',
      correct_answer: 3.75,
    },
    {
      problem_text: 'In a class of 40 students, 60% are girls. How many boys are there in the class?',
      correct_answer: 16,
    },
    {
      problem_text: 'The ratio of red marbles to blue marbles in a bag is 3:5. If there are 24 blue marbles, how many red marbles are there?',
      correct_answer: 15,
    },
  ];
  return problems[Math.floor(Math.random() * problems.length)];
}
