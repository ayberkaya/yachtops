// Quick script to check if OPENAI_API_KEY is loaded
console.log('Checking environment variables...');
console.log('OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
console.log('OPENAI_API_KEY length:', process.env.OPENAI_API_KEY?.length || 0);
console.log('OPENAI_API_KEY starts with:', process.env.OPENAI_API_KEY?.substring(0, 7) || 'N/A');

