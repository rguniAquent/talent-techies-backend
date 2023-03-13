var express = require('express');
const similarity = require('cosine-similarity');
const { Configuration, OpenAIApi } = require('openai');
require('dotenv').config();
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY
})
const openai = new OpenAIApi(configuration);

var router = express.Router();


router.post('/api/benefits-answers', async (req, res) => {
  const question = req.body.question;

  const genericResponse = 'That is a great question, unfortunately we don\'t have any data to answer that..'

  const options = {
    model: process.env.MODEL,
    prompt: question,
    max_tokens: 256,
    temperature: 0.1,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0
  }

  const response = await openai.createCompletion(options);
  var answer = response.data.choices[0].text;

  if(answer.indexOf('\n')) {
    answer = answer.slice(0, answer.indexOf('\n'));
  }

  if((checkSimilarity(question, answer)) > 0.4){
    res.send(answer);
  } 
  else {
    res.send(genericResponse);
  }

});

function checkSimilarity(question, answer) {
  const inputTokens = question.split(' ');
  const generatedTokens = answer.split(' ');

  //create a vector of the input question and generated response using the word frequencies
  const inputVector = inputTokens.reduce((vector, word) => {
    vector[word] = (vector[word] || 0) + 1;
    return vector;
  }, {});

  const generatedVector = generatedTokens.reduce((vector, word) => {
    vector[word] = (vector[word] || 0) + 1;
    return vector;
  }, {});

  // calculate the cosine similarity between the input question and generated response
  const cosineSimilarity = similarity(Object.values(inputVector), Object.values(generatedVector));

  return cosineSimilarity;
}

module.exports = router;
