const informationScoringController = require('./information/controllers/informationScoringController')();

const fastify = require('fastify')({
    logger: true
});

fastify.register(require('@fastify/cors'), {});

informationScoringController.registerTrainingData(fastify);
informationScoringController.registerAiPredictions(fastify);

fastify.listen(3003, (err, address) => {
    if (err) throw err
    fastify.log.info(`server listening on ${address}`)
});
