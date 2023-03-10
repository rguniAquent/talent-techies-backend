var express = require('express');
const { Configuration, OpenAIApi } = require('openai');
require('dotenv').config();
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY
})
const openai = new OpenAIApi(configuration);

var router = express.Router();


router.get('/key', (req, res) => {
  res.send(openai);
})

router.post('/api/benefits-answers', async (req, res) => {
  const question = req.body.question;

  const options = {
    model: process.env.MODEL,
    prompt: question,
    max_tokens: 256,
    temperature: 0.5,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0
  }

  const response = await openai.createCompletion(options);
  var answer = response.data.choices[0].text;

  if(answer.indexOf('\n')) {
    answer = answer.slice(0, answer.indexOf('\n\n'))
  }
  res.send(answer);

});

module.exports = router;
