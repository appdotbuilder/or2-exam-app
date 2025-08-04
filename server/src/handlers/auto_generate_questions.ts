
import { db } from '../db';
import { questionsTable } from '../db/schema';
import { type AutoGenerateQuestionsInput, type Question } from '../schema';

const questionTemplates = {
  monte_carlo: [
    "A manufacturing company wants to estimate the probability of defective products using Monte Carlo simulation. Given a defect rate of {rate}%, simulate {samples} samples and calculate the expected number of defective items out of {total} products.",
    "Use Monte Carlo simulation to estimate the value of π by generating {samples} random points in a unit square. Explain the methodology and calculate the approximation.",
    "A project has uncertain completion times following a normal distribution with mean {mean} days and standard deviation {std} days. Use Monte Carlo simulation with {samples} iterations to estimate the probability of completing within {target} days.",
    "Simulate a stock price movement using Monte Carlo method with initial price ${price}, annual return {return}%, volatility {volatility}%, over {time_periods} periods. Calculate the expected final price range."
  ],
  markov_chain: [
    "A weather system has three states: Sunny, Rainy, Cloudy. The transition matrix is given. If today is sunny, what is the probability of rain in {days} days?",
    "A customer loyalty program has states: New, Regular, Premium, Churned. Given the transition probabilities, calculate the steady-state distribution and interpret the results.",
    "Model a machine's operational states (Working, Maintenance, Broken) as a Markov chain. Given transition probabilities, find the long-run proportion of time in each state.",
    "A brand switching study shows transition probabilities between brands A, B, and C. Calculate the market share equilibrium and time to reach steady state."
  ],
  dynamic_programming: [
    "A company has {stages} production stages with costs and capacities. Use dynamic programming to find the optimal production allocation that minimizes total cost while meeting demand of {demand} units.",
    "Solve the knapsack problem with {items} items having weights and values. The knapsack capacity is {capacity}. Find the optimal selection using dynamic programming.",
    "A shortest path problem in a network with {nodes} nodes and given edge weights. Use dynamic programming to find the minimum cost path from source to destination.",
    "An inventory management problem with {time_periods} periods, holding costs, ordering costs, and demand. Use dynamic programming to determine optimal ordering policy."
  ],
  project_network_analysis: [
    "A project network has {activities} activities with given durations and dependencies. Calculate the critical path, total project duration, and slack times for each activity.",
    "Perform PERT analysis on a project with optimistic, most likely, and pessimistic time estimates. Calculate expected project duration and probability of completion within {target} days.",
    "A project network requires resource leveling. Given resource constraints and activity durations, determine the optimal schedule to minimize project duration.",
    "Crash analysis for a project network: Given normal and crash durations with associated costs, determine the minimum cost schedule to complete the project in {target} days."
  ],
  game_theory: [
    "Two companies compete in pricing strategies. Company A has strategies {strategies_a} and Company B has strategies {strategies_b}. Given the payoff matrix, find the Nash equilibrium.",
    "A zero-sum game between two players with given payoff matrix. Determine the optimal mixed strategies for both players and the value of the game.",
    "Analyze a prisoner's dilemma scenario with specific payoffs. Determine the Nash equilibrium and discuss the efficiency of the outcome.",
    "A sealed-bid auction with {bidders} bidders having private valuations. Analyze the optimal bidding strategies under first-price and second-price auction formats."
  ]
};

const generateRandomValues = () => ({
  rate: Math.floor(Math.random() * 20) + 1, // 1-20%
  samples: Math.floor(Math.random() * 9000) + 1000, // 1000-10000
  total: Math.floor(Math.random() * 900) + 100, // 100-1000
  mean: Math.floor(Math.random() * 30) + 10, // 10-40 days
  std: Math.floor(Math.random() * 5) + 2, // 2-7 days
  target: Math.floor(Math.random() * 20) + 20, // 20-40 days
  price: Math.floor(Math.random() * 50) + 50, // $50-100
  return: Math.floor(Math.random() * 15) + 5, // 5-20%
  volatility: Math.floor(Math.random() * 20) + 10, // 10-30%
  time_periods: Math.floor(Math.random() * 12) + 1, // 1-12 months
  days: Math.floor(Math.random() * 7) + 1, // 1-7 days
  stages: Math.floor(Math.random() * 5) + 3, // 3-7 stages
  demand: Math.floor(Math.random() * 500) + 100, // 100-600 units
  items: Math.floor(Math.random() * 15) + 5, // 5-20 items
  capacity: Math.floor(Math.random() * 100) + 50, // 50-150 capacity
  nodes: Math.floor(Math.random() * 8) + 4, // 4-12 nodes
  activities: Math.floor(Math.random() * 12) + 8, // 8-20 activities
  strategies_a: `[A1, A2, A3]`,
  strategies_b: `[B1, B2, B3]`,
  bidders: Math.floor(Math.random() * 5) + 3 // 3-8 bidders
});

const fillTemplate = (template: string): string => {
  const values = generateRandomValues();
  let result = template;
  
  Object.entries(values).forEach(([key, value]) => {
    const regex = new RegExp(`{${key}}`, 'g');
    result = result.replace(regex, value.toString());
  });
  
  return result;
};

export const autoGenerateQuestions = async (input: AutoGenerateQuestionsInput, lecturerId: number): Promise<Question[]> => {
  try {
    const templates = questionTemplates[input.topic];
    const generatedQuestions: Question[] = [];
    
    for (let i = 0; i < input.count; i++) {
      // Select a random template and fill with random values
      const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
      const questionText = fillTemplate(randomTemplate);
      
      // Insert question into database
      const result = await db.insert(questionsTable)
        .values({
          topic: input.topic,
          question_text: questionText,
          answer_key: null, // Auto-generated questions don't have answer keys initially
          max_score: input.max_score.toString(), // Convert number to string for numeric column
          status: 'draft', // Always start as draft for lecturer review
          is_auto_generated: true,
          created_by: lecturerId
        })
        .returning()
        .execute();
      
      // Convert numeric fields back to numbers before adding to results
      const question = result[0];
      generatedQuestions.push({
        ...question,
        max_score: parseFloat(question.max_score) // Convert string back to number
      });
    }
    
    return generatedQuestions;
  } catch (error) {
    console.error('Auto-generate questions failed:', error);
    throw error;
  }
};
