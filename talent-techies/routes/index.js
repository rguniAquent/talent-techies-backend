var express = require("express");
const similarity = require("cosine-similarity");
const generalQuestions = require("../generalQuestions.json");
const { Configuration, OpenAIApi } = require("openai");
require("dotenv").config();
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

var router = express.Router();

router.post("/api/benefits-answers", async (req, res) => {
  const question = req.body.question;
  const context =
    "You are a helpful assistant for Aquent that answers questions strictly about employee benefits offered by Aquent and nothing else. Aquent is a workforce solutions company.";
  const discriminatorPrompt = `${context}\nQuestion: ${question}\nRelated:`;
  const questionAndAnswerPrompt = `${context}\nQuestion: ${question}\nAnswer:`;

  if (filterGeneralQuestions(question).length != 0) {
    res.send(filterGeneralQuestions(question));
    return;
  }

  const genericResponse =
    "That is a great question, unfortunately we don't have any data to answer that..";

  const discriminatorBotOptions = {
    model: process.env.DISCRIMINATOR_MODEL,
    prompt: discriminatorPrompt,
    max_tokens: 1,
    temperature: 0,
    top_p: 1,
    n: 1,
    logprobs: 2,
  };

  const discriminatorResponse = await openai.createCompletion(
    discriminatorBotOptions
  );

  const discriminatorProbs =
    discriminatorResponse.data.choices[0].logprobs.top_logprobs[0];

  const yesProb = discriminatorProbs.hasOwnProperty(" yes")
    ? discriminatorProbs[" yes"]
    : -100;
  const noProb = discriminatorProbs.hasOwnProperty(" no")
    ? discriminatorProbs[" no"]
    : -100;

  if (yesProb > noProb) {
    const questionAndAnswerBotOptions = {
      model: process.env.QUESTION_AND_ANSWER_MODEL,
      prompt: questionAndAnswerPrompt,
      max_tokens: 256,
      temperature: 0.2,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
      logprobs: 10,
    };

    const questionAndAnswerResponse = await openai.createCompletion(
      questionAndAnswerBotOptions
    );

    var answer = questionAndAnswerResponse.data.choices[0].text;

    if (answer.indexOf("\n")) {
      answer = answer.slice(0, answer.indexOf("\n"));
    }
    const summarizedAnswer = await summarizeAnswer(question, answer);
    if(checkSimilarity(question, answer) > 0.2) {
      res.status(200).send(summarizedAnswer);
    }
    else {
      res.status(200).send(genericResponse);
    }
  } else {
    res.status(200).send(genericResponse);
  }
});

function checkSimilarity(question, answer) {
  const inputTokens = question.split(" ");
  const generatedTokens = answer.split(" ");

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
  const cosineSimilarity = similarity(
    Object.values(inputVector),
    Object.values(generatedVector)
  );

  return cosineSimilarity;
}

function filterGeneralQuestions(question) {
  // loop through each key in the JSON object
  for (let key in generalQuestions) {
    // loop through each question and answer in the array for the current key
    for (let i = 0; i < generalQuestions[key].length; i++) {
      // check if the input matches the current question
      if (
        question.toLowerCase() ===
        generalQuestions[key][i].question.toLowerCase()
      ) {
        // return the corresponding answer
        return generalQuestions[key][i].answer;
      }
    }
  }
  // if no match is found, return a empty string
  return "";
}

async function summarizeAnswer(question, answer) {
  const options = {
    model: "text-davinci-003",
    prompt: `I have this question:${question}.\nSummarize the following text according to the context of the question: "${answer}"`,
    max_tokens: 256,
    temperature: 0.5,
    top_p: 1,
  };

  const summary = await openai.createCompletion(options);
  return summary.data.choices[0].text.replace(/^\s+|\s+$/g, "");
}

module.exports = router;
